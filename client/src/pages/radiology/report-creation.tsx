// client/src/pages/radiology/report-creation.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, message, Badge } from 'antd';
import { CameraOutlined, FileTextOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function RadiologyReportCreation() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Fetch orders in progress (ready for report creation)
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/radiology-workflow/orders'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/radiology-workflow/orders?status=in_progress');
      return res.json();
    },
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: async (data: { radiologyOrderId: number; findings: string; impression?: string; notes?: string }) => {
      const res = await apiRequest('POST', '/api/radiology-workflow/reports', data);
      return res.json();
    },
    onSuccess: () => {
      message.success('Radiology report created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/radiology-workflow/orders'] });
      setReportModalVisible(false);
      form.resetFields();
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create report');
    },
  });

  const handleCreateReport = (order: any) => {
    setSelectedOrder(order);
    form.resetFields();
    setReportModalVisible(true);
  };

  const onCreateReport = async (values: any) => {
    await createReportMutation.mutateAsync({
      radiologyOrderId: selectedOrder.id,
      findings: values.findings,
      impression: values.impression,
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
            <Tag key={item.id} color="orange">{item.testName}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Clinical Indication',
      dataIndex: 'clinicalIndication',
      key: 'clinicalIndication',
      render: (text: string) => <Text type="secondary">{text || 'N/A'}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color="orange">{status?.replace('_', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="primary"
          icon={<FileTextOutlined />}
          onClick={() => handleCreateReport(record)}
        >
          Create Report
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              <FileTextOutlined /> Report Creation
            </Title>
            <Badge count={orders.length} showZero>
              <Button type="primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/radiology-workflow/orders'] })}>
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
        title="Create Radiology Report"
        open={reportModalVisible}
        onCancel={() => {
          setReportModalVisible(false);
          form.resetFields();
          setSelectedOrder(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={createReportMutation.isPending}
        width={700}
      >
        <Form form={form} onFinish={onCreateReport} layout="vertical">
          <Form.Item label="Order Number">
            <Input value={selectedOrder?.orderNumber} disabled />
          </Form.Item>
          <Form.Item label="Patient">
            <Input value={selectedOrder?.patient?.fullName} disabled />
          </Form.Item>
          <Form.Item label="Tests">
            <Space>
              {selectedOrder?.items?.map((item: any) => (
                <Tag key={item.id}>{item.testName}</Tag>
              ))}
            </Space>
          </Form.Item>
          <Form.Item
            name="findings"
            label="Findings"
            rules={[{ required: true, message: 'Please enter findings' }]}
          >
            <TextArea rows={6} placeholder="Enter detailed radiological findings..." />
          </Form.Item>
          <Form.Item
            name="impression"
            label="Impression"
          >
            <TextArea rows={3} placeholder="Enter impression/conclusion..." />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Any additional notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
