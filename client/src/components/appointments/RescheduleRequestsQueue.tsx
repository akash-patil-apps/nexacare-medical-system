// client/src/components/appointments/RescheduleRequestsQueue.tsx
import React, { useState } from 'react';
import {
  Card,
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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatTimeSlot12h } from '../../lib/time';
import { FIGMA_COLORS, FIGMA_RECEPTIONIST, ROLE_PRIMARY } from '../../design-tokens';

const RECEPTIONIST_PRIMARY = ROLE_PRIMARY.receptionist;

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

  const [requests, setRequests] = useState<any[]>([]);

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
    const interval = setInterval(fetchRequests, 10000);
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

  const pendingCount = requests.length;

  return (
    <>
      <Card
        variant="borderless"
        style={{
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: `1px solid ${FIGMA_COLORS.border}`,
          background: FIGMA_COLORS.backgroundCard,
          padding: FIGMA_RECEPTIONIST.rescheduleCardPadding,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: FIGMA_RECEPTIONIST.rescheduleCardGap }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <ClockCircleOutlined style={{ color: RECEPTIONIST_PRIMARY, fontSize: 20 }} />
              <Text strong style={{ fontSize: 18, fontWeight: 600 }}>
                Reschedule Requests ({pendingCount})
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Patients waiting for reschedule approval.
            </Text>
          </div>

          {requests.length === 0 ? (
            <Empty
              description="No pending reschedule requests"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '24px 0' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: FIGMA_RECEPTIONIST.rescheduleCardGap }}>
              {requests.map((record: any) => {
                const patientName = record.patient?.user?.fullName || record.appointment?.patient?.user?.fullName || 'Unknown';
                const fromDate = record.oldDate ? dayjs(record.oldDate).format('MMM D, YYYY') : 'N/A';
                const toDate = record.newDate ? dayjs(record.newDate).format('MMM D, YYYY') : 'N/A';
                const timeStr = record.newTimeSlot ? formatTimeSlot12h(record.newTimeSlot) : '';
                const fromToLabel = `From ${fromDate} → ${toDate}${timeStr ? ` at ${timeStr}` : ''}`;

                return (
                  <div
                    key={record.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: FIGMA_RECEPTIONIST.rescheduleRowHeight,
                      padding: '0 16px',
                      background: FIGMA_COLORS.backgroundPage,
                      borderRadius: FIGMA_RECEPTIONIST.rescheduleRowRadius,
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <Text strong style={{ display: 'block', marginBottom: 2 }}>{patientName}</Text>
                      <Text type="secondary" style={{ fontSize: 14 }}>{fromToLabel}</Text>
                    </div>
                    <Space size={8}>
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
                          style={{ background: FIGMA_COLORS.success, borderColor: FIGMA_COLORS.success }}
                        >
                          Approve
                        </Button>
                      </Popconfirm>
                      <Button
                        size="small"
                        icon={<CloseCircleOutlined />}
                        onClick={() => openRejectModal(record)}
                        loading={isProcessing}
                        style={{ borderColor: FIGMA_COLORS.border, color: FIGMA_COLORS.textPrimary }}
                      >
                        Reject
                      </Button>
                    </Space>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

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
            <div style={{ marginBottom: 16 }}>
              <Text strong>Patient:</Text> {selectedRequest.patient?.user?.fullName || 'Unknown'}
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Current:</Text> {selectedRequest.oldDate ? dayjs(selectedRequest.oldDate).format('DD MMM YYYY') : 'N/A'} ({formatTimeSlot12h(selectedRequest.oldTimeSlot || '')})
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Requested:</Text> {selectedRequest.newDate ? dayjs(selectedRequest.newDate).format('DD MMM YYYY') : 'N/A'} ({formatTimeSlot12h(selectedRequest.newTimeSlot || '')})
            </div>

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
