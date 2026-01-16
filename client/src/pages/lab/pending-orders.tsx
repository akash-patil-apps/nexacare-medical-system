// client/src/pages/lab/pending-orders.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, Select, message, Badge } from 'antd';
import { ExperimentOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function PendingLabOrders() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [collectSampleModalVisible, setCollectSampleModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Fetch pending orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/lab-workflow/orders/pending'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/lab-workflow/orders/pending');
      return res.json();
    },
  });

  // Collect sample mutation
  const collectSampleMutation = useMutation({
    mutationFn: async (data: { labOrderItemId: number; labOrderId: number; sampleType: string; notes?: string }) => {
      const res = await apiRequest('POST', '/api/lab-workflow/samples/collect', data);
      return res.json();
    },
    onSuccess: () => {
      message.success('Sample collected successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/lab-workflow/orders/pending'] });
      setCollectSampleModalVisible(false);
      form.resetFields();
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to collect sample');
    },
  });

  const handleCollectSample = (order: any, item: any) => {
    setSelectedOrder({ order, item });
    form.setFieldsValue({
      sampleType: item.test?.sampleType || 'Blood',
    });
    setCollectSampleModalVisible(true);
  };

  const onCollectSample = async (values: any) => {
    await collectSampleMutation.mutateAsync({
      labOrderItemId: selectedOrder.item.id,
      labOrderId: selectedOrder.order.id,
      sampleType: values.sampleType,
      notes: values.notes,
    });
  };

  const columns = [
    {
      title: 'Order Number',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: any, record: any) => (
        <Text>{record.patient?.fullName || 'N/A'}</Text>
      ),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (_: any, record: any) => (
        <Text>{record.doctor?.fullName || 'N/A'}</Text>
      ),
    },
    {
      title: 'Tests',
      key: 'items',
      render: (_: any, record: any) => (
        <Space direction="vertical" size="small">
          {record.items?.map((item: any) => (
            <div key={item.id}>
              <Tag color="blue">{item.testName}</Tag>
              {item.status === 'ordered' && (
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleCollectSample(record, item)}
                >
                  Collect Sample
                </Button>
              )}
            </div>
          ))}
        </Space>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => {
        const colors: any = {
          routine: 'default',
          urgent: 'orange',
          stat: 'red',
        };
        return <Tag color={colors[priority] || 'default'}>{priority?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: any = {
          ordered: 'blue',
          sample_collected: 'green',
          processing: 'orange',
          completed: 'green',
        };
        return <Tag color={colors[status] || 'default'}>{status?.replace('_', ' ').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              <ExperimentOutlined /> Pending Lab Orders
            </Title>
            <Badge count={orders.length} showZero>
              <Button type="primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/lab-workflow/orders/pending'] })}>
                Refresh
              </Button>
            </Badge>
          </div>

          <Table
            columns={columns}
            dataSource={orders}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Space>
      </Card>

      <Modal
        title="Collect Sample"
        open={collectSampleModalVisible}
        onCancel={() => {
          setCollectSampleModalVisible(false);
          form.resetFields();
          setSelectedOrder(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={collectSampleMutation.isPending}
      >
        <Form form={form} onFinish={onCollectSample} layout="vertical">
          <Form.Item label="Test">
            <Input value={selectedOrder?.item.testName} disabled />
          </Form.Item>
          <Form.Item
            name="sampleType"
            label="Sample Type"
            rules={[{ required: true, message: 'Please select sample type' }]}
          >
            <Select>
              <Option value="Blood">Blood</Option>
              <Option value="Urine">Urine</Option>
              <Option value="Stool">Stool</Option>
              <Option value="Sputum">Sputum</Option>
              <Option value="Swab">Swab</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Any additional notes about sample collection" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
