import React, { useState, useEffect } from 'react';
import { Card, List, Select, Space, Button, Typography, Empty, Spin, message } from 'antd';
import { ReloadOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QueueItem } from './QueueItem';
import type { OpdQueueEntry } from '../../types/queue';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface QueuePanelProps {
  doctorId?: number;
  date?: string; // YYYY-MM-DD
  onCheckIn?: (appointmentId: number) => void;
  showCheckInButton?: boolean;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  doctorId,
  date,
  onCheckIn,
  showCheckInButton = false,
}) => {
  const queryClient = useQueryClient();
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(doctorId);
  const [selectedDate, setSelectedDate] = useState<string>(date || dayjs().format('YYYY-MM-DD'));

  useEffect(() => {
    if (doctorId != null) setSelectedDoctorId(doctorId);
  }, [doctorId]);
  useEffect(() => {
    if (date) setSelectedDate(date);
  }, [date]);

  // Fetch doctors list
  const { data: doctors = [] } = useQuery({
    queryKey: ['/api/doctors'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/doctors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch doctors');
      return response.json();
    },
  });

  // Fetch queue + not-yet-checked-in for selected doctor and date
  const {
    data: queueResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['/api/opd-queue/doctor', selectedDoctorId, selectedDate],
    queryFn: async () => {
      if (!selectedDoctorId) return { queue: [], notYetCheckedIn: [] };
      const token = localStorage.getItem('auth-token');
      const response = await fetch(
        `/api/opd-queue/doctor/${selectedDoctorId}/date/${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error('Failed to fetch queue');
      const data = await response.json();
      // New API: { queue, notYetCheckedIn }; legacy: array of queue items
      if (Array.isArray(data)) {
        return { queue: data, notYetCheckedIn: [] };
      }
      const queue = (data.queue || []).map((item: any) => ({
        ...item.queue,
        appointment: item.appointment,
        patient: item.patient,
        doctor: item.doctor,
      }));
      return { queue, notYetCheckedIn: data.notYetCheckedIn || [] };
    },
    enabled: !!selectedDoctorId,
    refetchInterval: 5000,
  });

  const queueData = queueResponse?.queue ?? [];
  const notYetCheckedIn = queueResponse?.notYetCheckedIn ?? [];

  const handleCall = async (queueEntryId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/opd-queue/${queueEntryId}/call`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to call token');
      message.success('Token called');
      refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to call token');
    }
  };

  const handleStart = async (queueEntryId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/opd-queue/${queueEntryId}/start`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to start consultation');
      message.success('Consultation started');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
    } catch (error: any) {
      message.error(error.message || 'Failed to start consultation');
    }
  };

  const handleComplete = async (queueEntryId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/opd-queue/${queueEntryId}/complete`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to complete consultation');
      message.success('Consultation completed');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
    } catch (error: any) {
      message.error(error.message || 'Failed to complete consultation');
    }
  };

  const handleNoShow = async (queueEntryId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/opd-queue/${queueEntryId}/no-show`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to mark no-show');
      message.success('Marked as no-show');
      refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to mark no-show');
    }
  };

  const handleSkip = async (queueEntryId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/opd-queue/${queueEntryId}/skip`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to skip token');
      message.success('Token skipped');
      refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to skip token');
    }
  };

  const handleCheckInAppointment = async (appointmentId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/appointments/${appointmentId}/check-in`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Check-in failed');
      }
      message.success('Patient checked in – added to queue');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
    } catch (error: any) {
      message.error(error.message || 'Failed to check in');
    }
  };

  const handleReorder = async (queueEntryId: number, direction: 'up' | 'down') => {
    try {
      const entry = queueData.find((e: OpdQueueEntry) => e.id === queueEntryId);
      if (!entry) return;

      const newPosition = direction === 'up' ? entry.position - 1 : entry.position + 1;
      if (newPosition < 1 || newPosition > queueData.length) return;

      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/opd-queue/${queueEntryId}/reorder`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position: newPosition }),
      });
      if (!response.ok) throw new Error('Failed to reorder');
      message.success('Queue reordered');
      refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to reorder');
    }
  };

  // Filter queue by status; keep API order (slot + arrival priority from backend)
  const waitingQueue = queueData.filter((e: OpdQueueEntry) => e.status === 'waiting');
  const calledQueue = queueData.filter((e: OpdQueueEntry) => e.status === 'called');
  const inConsultation = queueData.filter((e: OpdQueueEntry) => e.status === 'in_consultation');
  const activeQueue = [...waitingQueue, ...calledQueue, ...inConsultation];

  // When doctor is chosen by parent (e.g. receptionist dashboard tabs), hide the doctor dropdown
  const doctorChosenByParent = doctorId != null && doctorId > 0;

  return (
    <Card
      title={
        <Space>
          <UserOutlined />
          <span>OPD Queue Management</span>
        </Space>
      }
      extra={
        <Space>
          {!doctorChosenByParent && (
            <Select
              placeholder="Select Doctor"
              value={selectedDoctorId}
              onChange={setSelectedDoctorId}
              style={{ width: 200 }}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={doctors.map((d: any) => ({
                value: d.id,
                label: `${d.user?.fullName || d.fullName || 'Unknown'} - ${(d.specialty || '').slice(0, 20)}${(d.specialty || '').length > 20 ? '…' : ''}`,
              }))}
            />
          )}
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
        </Space>
      }
    >
      {!selectedDoctorId ? (
        <Empty description="Please select a doctor to view queue" />
      ) : isLoading ? (
        <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: 40 }} />
      ) : (
        <>
          {/* Confirmed / Pending – not yet in queue (receptionist can check them in here) */}
          {notYetCheckedIn.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Confirmed – not yet in queue
              </Text>
              <List
                size="small"
                dataSource={notYetCheckedIn}
                renderItem={(item: any) => {
                  const apt = item.appointment || {};
                  const tokenDisplay = apt.tokenIdentifier ?? apt.token_identifier ?? apt.tokenNumber ?? '–';
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="checkin"
                          type="primary"
                          size="small"
                          onClick={() => handleCheckInAppointment(apt.id)}
                        >
                          Check in
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={item.patientName ?? 'Patient'}
                        description={
                          <Space split="|">
                            <Text type="secondary">Token {tokenDisplay}</Text>
                            <Text type="secondary">{apt.timeSlot || apt.appointmentTime || ''}</Text>
                            <Text type="secondary" style={{ textTransform: 'capitalize' }}>{apt.status || ''}</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </div>
          )}

          {/* Active queue (checked-in patients) */}
          {activeQueue.length === 0 && notYetCheckedIn.length === 0 ? (
            <Empty description="No patients in queue" />
          ) : activeQueue.length > 0 ? (
            <List
              dataSource={activeQueue}
              renderItem={(item: OpdQueueEntry) => (
                <List.Item>
                  <QueueItem
                    queueEntry={item}
                    onCall={handleCall}
                    onStart={handleStart}
                    onComplete={handleComplete}
                    onNoShow={handleNoShow}
                    onSkip={handleSkip}
                    onMoveUp={(id) => handleReorder(id, 'up')}
                    onMoveDown={(id) => handleReorder(id, 'down')}
                    isReceptionist={true}
                    showActions={true}
                  />
                </List.Item>
              )}
            />
          ) : null}
        </>
      )}

      {queueData.filter((e: OpdQueueEntry) => e.status === 'completed').length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">
            Completed today: {queueData.filter((e: OpdQueueEntry) => e.status === 'completed').length}
          </Text>
        </div>
      )}
    </Card>
  );
};










