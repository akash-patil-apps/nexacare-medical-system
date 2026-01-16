// client/src/pages/lab/report-release.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Tag, Button, Space, Typography, Modal, message, Badge, Popconfirm } from 'antd';
import { ExperimentOutlined, CheckCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Title, Text } = Typography;

export default function LabReportRelease() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Fetch completed orders (ready for report release)
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/lab-workflow/orders'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/lab-workflow/orders?status=processing');
      return res.json();
    },
  });

  // Release report mutation
  const releaseReportMutation = useMutation({
    mutationFn: async (labOrderId: number) => {
      const res = await apiRequest('POST', '/api/lab-workflow/reports/release', { labOrderId });
      return res.json();
    },
    onSuccess: () => {
      message.success('Report released successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/lab-workflow/orders'] });
      setReportModalVisible(false);
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to release report');
    },
  });

  const handleReleaseReport = (order: any) => {
    setSelectedOrder(order);
    setReportModalVisible(true);
  };

  const onReleaseReport = async () => {
    await releaseReportMutation.mutateAsync(selectedOrder.id);
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: any = {
          processing: 'orange',
          completed: 'green',
        };
        return <Tag color={colors[status] || 'default'}>{status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Popconfirm
          title="Release Report"
          description="Are you sure you want to release this report?"
          onConfirm={() => handleReleaseReport(record)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="primary" icon={<FileTextOutlined />}>
            Release Report
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              <FileTextOutlined /> Report Release
            </Title>
            <Badge count={orders.length} showZero>
              <Button type="primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/lab-workflow/orders'] })}>
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
        title="Release Lab Report"
        open={reportModalVisible}
        onCancel={() => {
          setReportModalVisible(false);
          setSelectedOrder(null);
        }}
        onOk={onReleaseReport}
        confirmLoading={releaseReportMutation.isPending}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>Order Number: </Text>
            <Text>{selectedOrder?.orderNumber}</Text>
          </div>
          <div>
            <Text strong>Patient: </Text>
            <Text>{selectedOrder?.patient?.fullName}</Text>
          </div>
          <div>
            <Text strong>Tests: </Text>
            <Space>
              {selectedOrder?.items?.map((item: any) => (
                <Tag key={item.id}>{item.testName}</Tag>
              ))}
            </Space>
          </div>
          <Text type="secondary">This will generate and release the final lab report to the doctor and patient.</Text>
        </Space>
      </Modal>
    </div>
  );
}
