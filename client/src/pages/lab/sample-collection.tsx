import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
} from 'antd';
import {
  ExperimentOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function SampleCollection() {
  const queryClient = useQueryClient();
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [form] = Form.useForm();

  // Fetch orders for sample collection
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/lab-workflow/orders/for-collection'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/lab-workflow/orders/for-collection');
      return res.json();
    },
  });

  // Collect sample mutation
  const collectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/lab-workflow/samples/collect', data);
      return res.json();
    },
    onSuccess: () => {
      message.success('Sample collected successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/lab-workflow/orders/for-collection'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lab-workflow/orders/pending'] });
      setCollectModalOpen(false);
      form.resetFields();
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to collect sample');
    },
  });

  const handleCollect = (order: any, item: any) => {
    setSelectedOrder({ order, item });
    form.setFieldsValue({
      sampleType: item.test?.sampleType || 'Blood',
    });
    setCollectModalOpen(true);
  };

  const onCollect = async (values: any) => {
    await collectMutation.mutateAsync({
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
      title: 'Tests',
      key: 'items',
      render: (_: any, record: any) => (
        <Space direction="vertical" size="small">
          {record.items?.filter((item: any) => item.status === 'ordered').map((item: any) => (
            <div key={item.id}>
              <Tag color="blue">{item.testName}</Tag>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleCollect(record, item)}
              >
                Collect
              </Button>
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
        const colors: Record<string, string> = {
          routine: 'default',
          urgent: 'orange',
          stat: 'red',
        };
        return <Tag color={colors[priority] || 'default'}>{priority?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Order Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>
              <ExperimentOutlined /> Sample Collection
            </Title>
          </div>

          <Table
            columns={columns}
            dataSource={orders}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 20 }}
          />
        </Space>
      </Card>

      {/* Collect Sample Modal */}
      <Modal
        title="Collect Sample"
        open={collectModalOpen}
        onCancel={() => {
          setCollectModalOpen(false);
          form.resetFields();
          setSelectedOrder(null);
        }}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={onCollect}>
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
            <TextArea rows={3} placeholder="Additional notes about sample collection" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={collectMutation.isPending}>
                Collect Sample
              </Button>
              <Button onClick={() => setCollectModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
