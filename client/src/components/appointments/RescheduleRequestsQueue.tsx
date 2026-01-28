// client/src/components/appointments/RescheduleRequestsQueue.tsx
import React, { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Typography,
  Modal,
  Form,
  Input,
  message,
  Empty,
  Popconfirm,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatTimeSlot12h } from '../../lib/time';

const { Text } = Typography;
const { TextArea } = Input;

interface RescheduleRequestsQueueProps {
  hospitalId?: number;
  onApprove: (requestId: number) => Promise<void>;
  onReject: (requestId: number, reason: string) => Promise<void>;
}

export const RescheduleRequestsQueue: React.FC<RescheduleRequestsQueueProps> = ({
  hospitalId,
  onApprove,
  onReject,
}) => {
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectForm] = Form.useForm();
  const [isProcessing, setIsProcessing] = useState(false);

  // This component will receive data via props or fetch it
  // For now, we'll assume data is passed or fetched by parent
  const [requests, setRequests] = useState<any[]>([]);

  // Fetch reschedule requests
  React.useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        const response = await fetch('/api/appointments/reschedule-requests?status=requested', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setRequests(data || []);
        }
      } catch (error) {
        console.error('Error fetching reschedule requests:', error);
      }
    };
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (request: any) => {
    try {
      setIsProcessing(true);
      await onApprove(request.id);
      setRequests(requests.filter((r: any) => r.id !== request.id));
    } catch (error) {
      console.error('Error approving request:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (values: { rejectionReason: string }) => {
    if (!selectedRequest) return;
    try {
      setIsProcessing(true);
      await onReject(selectedRequest.id, values.rejectionReason);
      setRequests(requests.filter((r: any) => r.id !== selectedRequest.id));
      setRejectModalOpen(false);
      setSelectedRequest(null);
      rejectForm.resetFields();
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (request: any) => {
    setSelectedRequest(request);
    setRejectModalOpen(true);
    rejectForm.resetFields();
  };

  const columns = [
    {
      title: 'Patient',
      key: 'patient',
      render: (_: any, record: any) => (
        <Text strong>{record.patient?.user?.fullName || record.appointment?.patient?.user?.fullName || 'Unknown'}</Text>
      ),
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (_: any, record: any) => (
        <Text>{record.doctor?.fullName || record.appointment?.doctor?.fullName || 'Unknown'}</Text>
      ),
    },
    {
      title: 'Current Appointment',
      key: 'current',
      render: (_: any, record: any) => {
        const oldDate = record.oldDate ? dayjs(record.oldDate).format('DD MMM YYYY') : 'N/A';
        const oldSlot = record.oldTimeSlot || 'N/A';
        return (
          <Space direction="vertical" size={0}>
            <Text>{oldDate}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>{formatTimeSlot12h(oldSlot)}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Requested New Time',
      key: 'new',
      render: (_: any, record: any) => {
        const newDate = record.newDate ? dayjs(record.newDate).format('DD MMM YYYY') : 'N/A';
        const newSlot = record.newTimeSlot || 'N/A';
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ color: '#10B981' }}>{newDate}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>{formatTimeSlot12h(newSlot)}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Reason',
      key: 'reason',
      render: (_: any, record: any) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {record.reasonNote || 'No reason provided'}
        </Text>
      ),
    },
    {
      title: 'Requested',
      key: 'requested',
      render: (_: any, record: any) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {record.createdAt ? dayjs(record.createdAt).fromNow() : 'N/A'}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Popconfirm
            title="Approve Reschedule Request"
            description="Are you sure you want to approve this reschedule request? The appointment will be moved to the new date and time."
            onConfirm={() => handleApprove(record)}
            okText="Yes, Approve"
            cancelText="No"
          >
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              loading={isProcessing}
            >
              Approve
            </Button>
          </Popconfirm>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => openRejectModal(record)}
            loading={isProcessing}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <Space>
            <ClockCircleOutlined style={{ color: '#F97316' }} />
            <Text strong>Pending Reschedule Requests</Text>
            <Tag color="orange">{requests.length}</Tag>
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              const token = localStorage.getItem('auth-token');
              fetch('/api/appointments/reschedule-requests?status=requested', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
                .then(res => res.json())
                .then(data => setRequests(data || []))
                .catch(err => console.error('Error refreshing:', err));
            }}
          >
            Refresh
          </Button>
        }
      >
        {requests.length === 0 ? (
          <Empty
            description="No pending reschedule requests"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={requests}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        )}
      </Card>

      {/* Reject Modal */}
      <Modal
        title="Reject Reschedule Request"
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          setSelectedRequest(null);
          rejectForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        {selectedRequest && (
          <Form
            form={rejectForm}
            layout="vertical"
            onFinish={handleReject}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
              <div>
                <Text strong>Patient:</Text> {selectedRequest.patient?.user?.fullName || 'Unknown'}
              </div>
              <div>
                <Text strong>Current:</Text> {selectedRequest.oldDate ? dayjs(selectedRequest.oldDate).format('DD MMM YYYY') : 'N/A'} ({formatTimeSlot12h(selectedRequest.oldTimeSlot || '')})
              </div>
              <div>
                <Text strong>Requested:</Text> {selectedRequest.newDate ? dayjs(selectedRequest.newDate).format('DD MMM YYYY') : 'N/A'} ({formatTimeSlot12h(selectedRequest.newTimeSlot || '')})
              </div>
            </Space>

            <Form.Item
              name="rejectionReason"
              label="Rejection Reason"
              rules={[{ required: true, message: 'Please provide a reason for rejection' }]}
            >
              <TextArea
                rows={4}
                placeholder="Please provide a reason for rejecting this reschedule request..."
                maxLength={500}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  danger
                  type="primary"
                  htmlType="submit"
                  loading={isProcessing}
                >
                  Reject Request
                </Button>
                <Button
                  onClick={() => {
                    setRejectModalOpen(false);
                    setSelectedRequest(null);
                    rejectForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
};
