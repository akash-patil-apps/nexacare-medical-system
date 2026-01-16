// client/src/pages/radiology/pending-orders.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, DatePicker, Input, message, Badge } from 'antd';
import { CameraOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function PendingRadiologyOrders() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Fetch pending orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/radiology-workflow/orders/pending'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/radiology-workflow/orders/pending');
      return res.json();
    },
  });

  // Schedule order mutation
  const scheduleOrderMutation = useMutation({
    mutationFn: async (data: { orderId: number; scheduledAt: Date }) => {
      const res = await apiRequest('POST', `/api/radiology-workflow/orders/${data.orderId}/schedule`, {
        scheduledAt: data.scheduledAt.toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      message.success('Order scheduled successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/radiology-workflow/orders/pending'] });
      setScheduleModalVisible(false);
      form.resetFields();
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to schedule order');
    },
  });

  // Mark in progress mutation
  const markInProgressMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest('POST', `/api/radiology-workflow/orders/${orderId}/in-progress`);
      return res.json();
    },
    onSuccess: () => {
      message.success('Order marked as in progress');
      queryClient.invalidateQueries({ queryKey: ['/api/radiology-workflow/orders/pending'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to update order');
    },
  });

  const handleSchedule = (order: any) => {
    setSelectedOrder(order);
    form.resetFields();
    setScheduleModalVisible(true);
  };

  const onSchedule = async (values: any) => {
    await scheduleOrderMutation.mutateAsync({
      orderId: selectedOrder.id,
      scheduledAt: values.scheduledAt.toDate(),
    });
  };

  const handleMarkInProgress = (order: any) => {
    markInProgressMutation.mutate(order.id);
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
            <Tag key={item.id} color="blue">{item.testName}</Tag>
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
          scheduled: 'green',
          in_progress: 'orange',
          completed: 'green',
        };
        return <Tag color={colors[status] || 'default'}>{status?.replace('_', ' ').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'ordered' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleSchedule(record)}
            >
              Schedule
            </Button>
          )}
          {record.status === 'scheduled' && (
            <Button
              type="primary"
              size="small"
              icon={<CameraOutlined />}
              onClick={() => handleMarkInProgress(record)}
            >
              Start Imaging
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              <CameraOutlined /> Pending Radiology Orders
            </Title>
            <Badge count={orders.length} showZero>
              <Button type="primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/radiology-workflow/orders/pending'] })}>
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
        title="Schedule Radiology Order"
        open={scheduleModalVisible}
        onCancel={() => {
          setScheduleModalVisible(false);
          form.resetFields();
          setSelectedOrder(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={scheduleOrderMutation.isPending}
      >
        <Form form={form} onFinish={onSchedule} layout="vertical">
          <Form.Item label="Order Number">
            <Input value={selectedOrder?.orderNumber} disabled />
          </Form.Item>
          <Form.Item label="Patient">
            <Input value={selectedOrder?.patient?.fullName} disabled />
          </Form.Item>
          <Form.Item
            name="scheduledAt"
            label="Scheduled Date & Time"
            rules={[{ required: true, message: 'Please select scheduled date and time' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
