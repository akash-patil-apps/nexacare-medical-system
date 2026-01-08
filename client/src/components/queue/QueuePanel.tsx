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

  // Fetch queue for selected doctor and date
  const {
    data: queueData = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['/api/opd-queue/doctor', selectedDoctorId, selectedDate],
    queryFn: async () => {
      if (!selectedDoctorId) return [];
      const token = localStorage.getItem('auth-token');
      const response = await fetch(
        `/api/opd-queue/doctor/${selectedDoctorId}/date/${selectedDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error('Failed to fetch queue');
      const data = await response.json();
      // Transform the data structure
      return data.map((item: any) => ({
        ...item.queue,
        appointment: item.appointment,
        patient: item.patient,
        doctor: item.doctor,
      }));
    },
    enabled: !!selectedDoctorId,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

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

  // Filter queue by status
  const waitingQueue = queueData.filter((e: OpdQueueEntry) => e.status === 'waiting');
  const calledQueue = queueData.filter((e: OpdQueueEntry) => e.status === 'called');
  const inConsultation = queueData.filter((e: OpdQueueEntry) => e.status === 'in_consultation');
  const activeQueue = [...waitingQueue, ...calledQueue, ...inConsultation].sort(
    (a, b) => a.position - b.position,
  );

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
              label: `${d.user?.fullName || 'Unknown'} - ${d.specialty || ''}`,
            }))}
          />
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
      ) : activeQueue.length === 0 ? (
        <Empty description="No patients in queue" />
      ) : (
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







