import React, { useMemo, useState } from 'react';
import {
  Layout,
  Card,
  Typography,
  Timeline,
  Tag,
  Drawer,
  Button,
  Space,
  Empty,
  Skeleton,
} from 'antd';
import {
  CalendarOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocation } from 'wouter';
import { useAuth } from '../../hooks/use-auth';
import { PatientSidebar } from '../../components/layout/PatientSidebar';
import { TopHeader } from '../../components/layout/TopHeader';
import { useResponsive } from '../../hooks/use-responsive';
import { formatDate, formatDateTime } from '../../lib/utils';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const fetchWithAuth = async <T,>(url: string): Promise<T> => {
  const token = localStorage.getItem('auth-token');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
};

type HistoryItem = {
  id: string;
  type: 'appointment' | 'prescription' | 'lab_report';
  date: string;
  dateSort: number;
  title: string;
  subtitle?: string;
  status?: string;
  extra?: string;
};

export default function PatientHistoryPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { isMobile } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: () => fetchWithAuth<Array<any>>('/api/appointments/my'),
    enabled: !!user,
  });

  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['/api/prescriptions/patient'],
    queryFn: () => fetchWithAuth<Array<any>>('/api/prescriptions/patient'),
    enabled: !!user,
  });

  const { data: labReports = [], isLoading: labReportsLoading } = useQuery({
    queryKey: ['patient-lab-reports'],
    queryFn: () => fetchWithAuth<Array<any>>('/api/labs/patient/reports'),
    enabled: !!user,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications/me'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const res = await fetch('/api/notifications/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const historyItems: HistoryItem[] = useMemo(() => {
    const items: HistoryItem[] = [];
    (appointments || []).forEach((apt: any) => {
      const d = apt.appointmentDate || apt.date || apt.createdAt;
      const dateStr = typeof d === 'string' ? d : d?.toISOString?.() || '';
      items.push({
        id: `apt-${apt.id}`,
        type: 'appointment',
        date: dateStr,
        dateSort: new Date(dateStr).getTime(),
        title: apt.doctorName || apt.doctor?.fullName || 'Appointment',
        subtitle: apt.hospitalName || apt.hospital?.name,
        status: apt.status,
        extra: apt.timeSlot || apt.time,
      });
    });
    (prescriptions || []).forEach((rx: any) => {
      const d = rx.createdAt || rx.date;
      const dateStr = typeof d === 'string' ? d : d?.toISOString?.() || '';
      let diagnosis = rx.diagnosis || 'Prescription';
      try {
        const meds = rx.medications ? JSON.parse(rx.medications) : [];
        if (Array.isArray(meds) && meds[0]?.name) diagnosis = meds[0].name;
      } catch {}
      items.push({
        id: `rx-${rx.id}`,
        type: 'prescription',
        date: dateStr,
        dateSort: new Date(dateStr).getTime(),
        title: diagnosis,
        subtitle: rx.doctor?.fullName || 'Doctor',
        status: rx.isActive ? 'Active' : 'Inactive',
      });
    });
    (labReports || []).forEach((r: any) => {
      const d = r.reportDate || r.createdAt;
      const dateStr = typeof d === 'string' ? d : d?.toISOString?.() || '';
      items.push({
        id: `lab-${r.id}`,
        type: 'lab_report',
        date: dateStr,
        dateSort: new Date(dateStr).getTime(),
        title: r.testName || 'Lab Report',
        subtitle: r.testType,
        status: r.status || 'Completed',
      });
    });
    items.sort((a, b) => b.dateSort - a.dateSort);
    return items;
  }, [appointments, prescriptions, labReports]);

  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }
  if (!isLoading && user && user.role?.toUpperCase() !== 'PATIENT') {
    return <Redirect to="/dashboard/patient" />;
  }

  const siderWidth = isMobile ? 0 : 80;

  const loading = appointmentsLoading || prescriptionsLoading || labReportsLoading;

  return (
    <Layout style={{ minHeight: '100vh', background: '#F7FBFF' }}>
      {!isMobile && (
        <Sider
          width={80}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            background: '#fff',
            boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
            borderRight: '1px solid #E5E7EB',
          }}
        >
          <PatientSidebar selectedMenuKey="dashboard" />
        </Sider>
      )}

      {isMobile && (
        <Drawer
          title="Navigation"
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          styles={{ body: { padding: 0 } }}
          width={260}
        >
          <PatientSidebar selectedMenuKey="dashboard" onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout style={{ marginLeft: siderWidth, minHeight: '100vh', background: '#F7FBFF' }}>
        <TopHeader
          userName={user?.fullName || 'User'}
          userRole="Patient"
          userId={
            user?.id
              ? `PAT-${new Date().getFullYear()}-${String(user.id).padStart(3, '0')}`
              : 'PAT-2024-001'
          }
          userInitials={
            user?.fullName
              ? user.fullName.split(' ').length >= 2
                ? `${user.fullName.split(' ')[0][0]}${user.fullName.split(' ')[1][0]}`.toUpperCase()
                : user.fullName.substring(0, 2).toUpperCase()
              : 'UP'
          }
          notificationCount={notifications.filter((n: any) => !n.isRead).length}
        />

        <Content
          style={{
            background: '#F7FBFF',
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '12px 12px 16px' : '12px 16px 20px',
          }}
        >
          {isMobile && (
            <div style={{ marginBottom: 16 }}>
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{ fontSize: 18 }}
              />
            </div>
          )}

          <div style={{ background: '#fff', padding: 24, borderRadius: 8, marginBottom: 24 }}>
            <Title level={2} style={{ margin: '0 0 8px 0', color: '#1A8FE3' }}>
              <CalendarOutlined style={{ marginRight: 8 }} />
              Patient History
            </Title>
            <Text type="secondary">Your appointments, prescriptions, and lab reports in one timeline</Text>
          </div>

          <Card>
            {loading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : historyItems.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No history yet. Your appointments, prescriptions, and lab reports will appear here."
              />
            ) : (
              <Timeline
                mode="left"
                items={historyItems.map((item) => {
                  const icon =
                    item.type === 'appointment' ? (
                      <CalendarOutlined style={{ color: '#1A8FE3' }} />
                    ) : item.type === 'prescription' ? (
                      <MedicineBoxOutlined style={{ color: '#10B981' }} />
                    ) : (
                      <ExperimentOutlined style={{ color: '#8B5CF6' }} />
                    );
                  const color =
                    item.type === 'appointment'
                      ? 'blue'
                      : item.type === 'prescription'
                        ? 'green'
                        : 'purple';
                  return {
                    color,
                    dot: icon,
                    children: (
                      <div>
                        <Space wrap align="center" style={{ marginBottom: 4 }}>
                          <Text strong>{item.title}</Text>
                          <Tag color={color}>
                            {item.type === 'appointment'
                              ? 'Appointment'
                              : item.type === 'prescription'
                                ? 'Prescription'
                                : 'Lab Report'}
                          </Tag>
                          {item.status && (
                            <Tag>{item.status}</Tag>
                          )}
                        </Space>
                        {item.subtitle && (
                          <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
                            {item.subtitle}
                          </Text>
                        )}
                        {item.extra && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.extra}
                          </Text>
                        )}
                        <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                          {formatDateTime(item.date)}
                        </Text>
                        {item.type === 'appointment' && (
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0, marginTop: 4 }}
                            onClick={() => setLocation('/dashboard/patient/appointments')}
                          >
                            View appointments
                          </Button>
                        )}
                        {item.type === 'prescription' && (
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0, marginTop: 4 }}
                            onClick={() => setLocation('/dashboard/patient/prescriptions')}
                          >
                            View prescriptions
                          </Button>
                        )}
                        {item.type === 'lab_report' && (
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0, marginTop: 4 }}
                            onClick={() => setLocation('/dashboard/patient/reports')}
                          >
                            View lab reports
                          </Button>
                        )}
                      </div>
                    ),
                  };
                })}
              />
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
