// client/src/pages/radiology/report-release.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Tag, Button, Space, Typography, Modal, message, Badge, Popconfirm } from 'antd';
import { FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Title, Text } = Typography;

export default function RadiologyReportRelease() {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Fetch completed reports (ready for release)
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['/api/radiology-workflow/reports'],
    queryFn: async () => {
      // This would need a new endpoint to fetch reports
      // For now, we'll fetch completed orders and show them
      const res = await apiRequest('GET', '/api/radiology-workflow/orders?status=completed');
      return res.json();
    },
  });

  // Release report mutation
  const releaseReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const res = await apiRequest('POST', `/api/radiology-workflow/reports/${reportId}/release`);
      return res.json();
    },
    onSuccess: () => {
      message.success('Report released successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/radiology-workflow/reports'] });
      setReportModalVisible(false);
      setSelectedReport(null);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to release report');
    },
  });

  const handleReleaseReport = (report: any) => {
    setSelectedReport(report);
    setReportModalVisible(true);
  };

  const onReleaseReport = async () => {
    // For now, we'll use order ID as report ID
    // In production, you'd fetch actual reports
    await releaseReportMutation.mutateAsync(selectedReport.id);
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
            <Tag key={item.id} color="green">{item.testName}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color="green">{status?.toUpperCase()}</Tag>
      ),
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
          <Button type="primary" icon={<CheckCircleOutlined />}>
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
              <CheckCircleOutlined /> Report Release
            </Title>
            <Badge count={reports.length} showZero>
              <Button type="primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/radiology-workflow/reports'] })}>
                Refresh
              </Button>
            </Badge>
          </div>

          <Table
            columns={columns}
            dataSource={reports}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Space>
      </Card>

      <Modal
        title="Release Radiology Report"
        open={reportModalVisible}
        onCancel={() => {
          setReportModalVisible(false);
          setSelectedReport(null);
        }}
        onOk={onReleaseReport}
        confirmLoading={releaseReportMutation.isPending}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>Order Number: </Text>
            <Text>{selectedReport?.orderNumber}</Text>
          </div>
          <div>
            <Text strong>Patient: </Text>
            <Text>{selectedReport?.patient?.fullName}</Text>
          </div>
          <div>
            <Text strong>Tests: </Text>
            <Space>
              {selectedReport?.items?.map((item: any) => (
                <Tag key={item.id}>{item.testName}</Tag>
              ))}
            </Space>
          </div>
          <Text type="secondary">This will release the radiology report to the doctor and patient.</Text>
        </Space>
      </Modal>
    </div>
  );
}
