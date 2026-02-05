import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocation } from 'wouter';
import {
  Layout,
  Card,
  Table,
  Typography,
  Space,
  Tag,
  Spin,
  DatePicker,
  Empty,
} from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/use-auth';
import { useResponsive } from '../hooks/use-responsive';
import { ReceptionistSidebar } from '../components/layout/ReceptionistSidebar';
import { TopHeader } from '../components/layout/TopHeader';
import { getISTStartOfDay, isSameDayIST } from '../lib/timezone';
import { formatTimeSlot12h } from '../lib/time';
import { normalizeStatus, STATUS_CONFIG } from '../lib/appointment-status';
import dayjs, { type Dayjs } from 'dayjs';

const { Content, Sider } = Layout;
const { Text } = Typography;

const SIDER_WIDTH = 80;
const PAGE_BACKGROUND = '#F3F4F6';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth-token');
  return { Authorization: `Bearer ${token}` };
}

export default function ReceptionistAppointmentsPage() {
  const [location] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { isMobile } = useResponsive();
  const [selectedViewDate, setSelectedViewDate] = useState<Dayjs | null>(null);

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments/my'],
    queryFn: async () => {
      const res = await fetch('/api/appointments/my', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch appointments');
      const data = await res.json();
      return data.map((apt: any) => {
        let appointmentDate = apt.appointmentDate;
        if (typeof appointmentDate === 'string') {
          appointmentDate = new Date(appointmentDate);
          if (isNaN(appointmentDate.getTime())) appointmentDate = null;
        } else if (appointmentDate) {
          appointmentDate = new Date(appointmentDate);
        }
        return {
          id: apt.id,
          patientId: apt.patientId,
          patient: apt.patientName || 'Unknown Patient',
          doctor: apt.doctorName || 'Unknown Doctor',
          time: apt.timeSlot || apt.appointmentTime || 'N/A',
          status: apt.status || 'pending',
          department: apt.doctorSpecialty || 'General',
          tokenNumber: apt.tokenNumber ?? null,
          date: apt.appointmentDate,
          dateObj: appointmentDate,
        };
      });
    },
    enabled: !!user && user.role?.toUpperCase() === 'RECEPTIONIST',
  });

  const todayIST = getISTStartOfDay();

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((apt: any) => {
        if (!apt.date && !apt.dateObj) return false;
        const d = apt.dateObj || new Date(apt.date);
        if (isNaN(d.getTime())) return false;
        return getISTStartOfDay(d).getTime() >= todayIST.getTime();
      })
      .sort((a: any, b: any) => {
        const ta = a.dateObj || new Date(a.date);
        const tb = b.dateObj || new Date(b.date);
        return ta.getTime() - tb.getTime();
      });
  }, [appointments, todayIST]);

  const selectedDateAppointments = useMemo(() => {
    if (!selectedViewDate) return [];
    const selectedStart = getISTStartOfDay(selectedViewDate.toDate());
    return appointments
      .filter((apt: any) => {
        if (!apt.date && !apt.dateObj) return false;
        const d = apt.dateObj || new Date(apt.date);
        if (isNaN(d.getTime())) return false;
        return isSameDayIST(d, selectedStart);
      })
      .sort((a: any, b: any) => {
        const ta = a.dateObj || new Date(a.date);
        const tb = b.dateObj || new Date(b.date);
        return ta.getTime() - tb.getTime();
      });
  }, [appointments, selectedViewDate]);

  const columns = [
    {
      title: '#',
      key: 'serial',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Text type="secondary" style={{ fontWeight: 500 }}>{index + 1}</Text>
      ),
    },
    {
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
      width: 140,
    },
    {
      title: 'Date & Time',
      key: 'dateTime',
      width: 130,
      render: (_: any, record: any) => {
        const d = record.dateObj || record.date;
        const dateLabel = !d ? 'N/A' : dayjs(d).format('DD MMM YYYY');
        const timeLabel = record.time ? formatTimeSlot12h(record.time) : 'N/A';
        return (
          <Space direction="vertical" size={0}>
            <Text>{dateLabel}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{timeLabel}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Token',
      dataIndex: 'tokenNumber',
      key: 'tokenNumber',
      width: 60,
      align: 'center' as const,
      render: (v: number | null) => (v ? <Text strong>{v}</Text> : <Text type="secondary">-</Text>),
    },
    {
      title: 'Doctor',
      dataIndex: 'doctor',
      key: 'doctor',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const normalized = normalizeStatus(status);
        const config = STATUS_CONFIG[normalized] || { color: 'default', label: (status || '').toUpperCase() };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
  ];

  const headerUserId = useMemo(() => {
    if (user?.id) {
      const year = new Date().getFullYear();
      const idNum = String(user.id).padStart(3, '0');
      return `REC-${year}-${idNum}`;
    }
    return 'REC-2024-001';
  }, [user?.id]);

  const userInitials = useMemo(() => {
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      return names.length >= 2 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : user.fullName.substring(0, 2).toUpperCase();
    }
    return 'RC';
  }, [user?.fullName]);

  if (!authLoading && !user) {
    return <Redirect to="/login" />;
  }
  if (!authLoading && user && user.role?.toUpperCase() !== 'RECEPTIONIST') {
    return <Redirect to="/dashboard/receptionist" />;
  }

  const siderWidth = isMobile ? 0 : SIDER_WIDTH;
  const isOnAppointmentsPage = location === '/receptionist/appointments';

  return (
    <Layout style={{ minHeight: '100vh', width: '100%', background: PAGE_BACKGROUND }}>
      {!isMobile && (
        <Sider
          width={SIDER_WIDTH}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            width: SIDER_WIDTH,
            background: '#fff',
            boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            borderRight: '1px solid #E5E7EB',
          }}
        >
          <ReceptionistSidebar
            selectedMenuKey={isOnAppointmentsPage ? 'appointments' : 'dashboard'}
            onAppointmentsClick={undefined}
          />
        </Sider>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: PAGE_BACKGROUND,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <TopHeader
          userName={user?.fullName || 'User'}
          userRole={user?.role?.replace('_', ' ') || 'Receptionist'}
          userId={headerUserId}
          userInitials={userInitials}
        />

        <Content style={{ padding: 24, overflow: 'auto', flex: 1 }}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Card
              title={
                <Space>
                  <CalendarOutlined style={{ color: '#1A8FE3' }} />
                  <Text strong>All Appointments</Text>
                </Space>
              }
              style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                Upcoming (today and future)
              </Text>
              {appointmentsLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
              ) : upcomingAppointments.length === 0 ? (
                <Empty description="No upcoming appointments" />
              ) : (
                <Table
                  columns={columns}
                  dataSource={upcomingAppointments}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  size="small"
                  scroll={{ x: 'max-content' }}
                />
              )}
            </Card>

            <Card
              title={<Text strong>Past Appointments</Text>}
              style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              <Space style={{ marginBottom: 16 }} wrap>
                <Text strong>Select date:</Text>
                <DatePicker
                  value={selectedViewDate}
                  onChange={(d) => setSelectedViewDate(d)}
                  allowClear
                  style={{ minWidth: 180 }}
                />
                {selectedViewDate && (
                  <Text type="secondary">
                    {selectedDateAppointments.length} appointment(s) on {selectedViewDate.format('DD MMM YYYY')}
                  </Text>
                )}
              </Space>
              {!selectedViewDate ? (
                <Empty description="Select a date to view past appointments for that day." />
              ) : appointmentsLoading ? (
                <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
              ) : selectedDateAppointments.length === 0 ? (
                <Empty description="No appointments on this date." />
              ) : (
                <Table
                  columns={columns}
                  dataSource={selectedDateAppointments}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 'max-content' }}
                />
              )}
            </Card>
          </Space>
        </Content>
      </Layout>
    </Layout>
  );
}
