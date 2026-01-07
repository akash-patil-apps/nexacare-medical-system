import React, { useState } from 'react';
import { Card, List, Typography, Button, Space, Empty, Spin, message, Drawer } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QueueItem } from './QueueItem';
import type { OpdQueueEntry } from '../../types/queue';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface NowServingWidgetProps {
  doctorId: number;
  date?: string; // YYYY-MM-DD, defaults to today
}

export const NowServingWidget: React.FC<NowServingWidgetProps> = ({
  doctorId,
  date,
}) => {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queueDate = date || dayjs().format('YYYY-MM-DD');

  // Fetch queue for doctor
  const {
    data: queueData = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['/api/opd-queue/doctor', doctorId, queueDate],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/opd-queue/doctor/${doctorId}/date/${queueDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch queue');
      const data = await response.json();
      return data.map((item: any) => ({
        ...item.queue,
        appointment: item.appointment,
        patient: item.patient,
        doctor: item.doctor,
      }));
    },
    refetchInterval: 3000, // Auto-refresh every 3 seconds
  });

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

  // Get current patient (in consultation)
  const currentPatient = queueData.find(
    (e: OpdQueueEntry) => e.status === 'in_consultation',
  );

  // Get next patients (called or waiting)
  const nextPatients = queueData
    .filter((e: OpdQueueEntry) => e.status === 'called' || e.status === 'waiting')
    .sort((a, b) => a.position - b.position)
    .slice(0, 3);

  if (isLoading) {
    return (
      <Card>
        <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: 40 }} />
      </Card>
    );
  }

  return (
    <>
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            <span>Today's Queue</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
            <Button
              icon={<UnorderedListOutlined />}
              size="small"
              onClick={() => setDrawerOpen(true)}
            >
              View All
            </Button>
          </Space>
        }
      >
        {currentPatient ? (
          <div style={{ marginBottom: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Now Serving
              </Text>
            </div>
            <Card
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <Title level={2} style={{ color: 'white', margin: 0 }}>
                  Token #{currentPatient.tokenNumber}
                </Title>
                <Text style={{ color: 'white', fontSize: 16, display: 'block', marginTop: 8 }}>
                  {currentPatient.patient?.user?.fullName || 'Unknown Patient'}
                </Text>
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleComplete(currentPatient.id)}
                  style={{ marginTop: 16 }}
                >
                  Complete Consultation
                </Button>
              </div>
            </Card>
          </div>
        ) : nextPatients.length > 0 ? (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Text type="secondary">No active consultation</Text>
            <br />
            <Text strong>Next: Token #{nextPatients[0].tokenNumber}</Text>
          </div>
        ) : (
          <Empty description="No patients in queue" />
        )}

        {nextPatients.length > 0 && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Next Up:
            </Text>
            <List
              size="small"
              dataSource={nextPatients}
              renderItem={(item: OpdQueueEntry) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                      <Text strong>#{item.tokenNumber}</Text>
                      <Text>{item.patient?.user?.fullName || 'Unknown'}</Text>
                    </Space>
                    {item.status === 'called' && (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleStart(item.id)}
                      >
                        Start
                      </Button>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Total in queue: {queueData.length} | Completed: {queueData.filter((e: OpdQueueEntry) => e.status === 'completed').length}
          </Text>
        </div>
      </Card>

      <Drawer
        title="Complete Queue List"
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={400}
      >
        <List
          dataSource={queueData.sort((a: OpdQueueEntry, b: OpdQueueEntry) => a.position - b.position)}
          renderItem={(item: OpdQueueEntry) => (
            <List.Item>
              <QueueItem
                queueEntry={item}
                onStart={handleStart}
                onComplete={handleComplete}
                isDoctor={true}
                showActions={true}
              />
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
};





