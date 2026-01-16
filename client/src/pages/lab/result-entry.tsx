// client/src/pages/lab/result-entry.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, InputNumber, message, Badge, Divider } from 'antd';
import { ExperimentOutlined, CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function LabResultEntry() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Fetch orders for result entry (sample collected)
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/lab-workflow/orders/for-result-entry'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/lab-workflow/orders/for-result-entry');
      return res.json();
    },
  });

  // Enter result mutation
  const enterResultMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/lab-workflow/results', data);
      return res.json();
    },
    onSuccess: () => {
      message.success('Result entered successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/lab-workflow/orders/for-result-entry'] });
      setResultModalVisible(false);
      form.resetFields();
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to enter result');
    },
  });

  const handleEnterResult = (order: any, item: any) => {
    setSelectedOrder({ order, item });
    form.resetFields();
    setResultModalVisible(true);
  };

  const onEnterResult = async (values: any) => {
    await enterResultMutation.mutateAsync({
      labOrderItemId: selectedOrder.item.id,
      testName: selectedOrder.item.testName,
      parameterName: values.parameterName,
      resultValue: values.resultValue,
      unit: values.unit,
      normalRange: values.normalRange,
      isAbnormal: values.isAbnormal || false,
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
          {record.items?.map((item: any) => (
            <div key={item.id}>
              <Tag color="green">{item.testName}</Tag>
              {item.status === 'sample_collected' && (
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleEnterResult(record, item)}
                >
                  Enter Result
                </Button>
              )}
            </div>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: any = {
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
              <ExperimentOutlined /> Result Entry
            </Title>
            <Badge count={orders.length} showZero>
              <Button type="primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/lab-workflow/orders/for-result-entry'] })}>
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
        title="Enter Test Result"
        open={resultModalVisible}
        onCancel={() => {
          setResultModalVisible(false);
          form.resetFields();
          setSelectedOrder(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={enterResultMutation.isPending}
        width={600}
      >
        <Form form={form} onFinish={onEnterResult} layout="vertical">
          <Form.Item label="Test Name">
            <Input value={selectedOrder?.item.testName} disabled />
          </Form.Item>
          <Form.Item
            name="parameterName"
            label="Parameter Name"
            rules={[{ required: true, message: 'Please enter parameter name' }]}
          >
            <Input placeholder="e.g., WBC, RBC, Hemoglobin, etc." />
          </Form.Item>
          <Form.Item
            name="resultValue"
            label="Result Value"
            rules={[{ required: true, message: 'Please enter result value' }]}
          >
            <Input placeholder="Enter the test result" />
          </Form.Item>
          <Form.Item name="unit" label="Unit">
            <Input placeholder="e.g., g/dL, mg/dL, cells/μL, etc." />
          </Form.Item>
          <Form.Item name="normalRange" label="Normal Range">
            <Input placeholder="e.g., 4.5-11.0, 12-16, etc." />
          </Form.Item>
          <Form.Item name="isAbnormal" valuePropName="checked" label="Abnormal Result">
            <Input type="checkbox" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Any additional notes about the result" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
