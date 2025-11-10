import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Button, 
  Tag, 
  Space, 
  Typography,
  Menu,
  message,
  Skeleton,
  Empty,
} from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  MedicineBoxOutlined, 
  FileTextOutlined,
  BellOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';
import { useOnboardingCheck } from '../../hooks/use-onboarding-check';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { PrescriptionCard } from '../../components/dashboard/PrescriptionCard';
import { TimelineItem } from '../../components/dashboard/TimelineItem';
import { NotificationItem } from '../../components/dashboard/NotificationItem';
import { SidebarProfile } from '../../components/dashboard/SidebarProfile';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const TIMELINE_FILTERS = ['all', 'appointments', 'prescriptions', 'labs'] as const;

type TimelineFilter = (typeof TIMELINE_FILTERS)[number];

type NotificationSeverity = 'urgent' | 'info';

type DashboardNotification = {
  id: number;
  title: string;
  message: string;
  timestamp: string;
  severity: NotificationSeverity;
  read: boolean;
};

type DashboardPrescription = {
  id: number;
  name: string;
  dosage: string;
  nextDose: string;
  refillsRemaining: string;
  adherence: number;
  createdAt: string | null;
};

type TimelineEntry = {
  id: string;
  type: TimelineFilter;
  timestamp: string;
  description: string;
  actionLabel: string;
  sortKey: number;
  title: string;
};

const fetchWithAuth = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const token = localStorage.getItem('auth-token');
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const toSeverity = (type?: string): NotificationSeverity => {
  if (!type) return 'info';
  const normalized = type.toLowerCase();
  if (['urgent', 'warning', 'critical'].includes(normalized)) return 'urgent';
  return 'info';
};

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  
  useOnboardingCheck();

  const {
    data: appointmentsData = [],
    isLoading: appointmentsLoading,
  } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async () => {
      const data = await fetchWithAuth<Array<any>>('/api/appointments/my');
      return data.map((apt) => ({
        id: apt.id,
        doctor: apt.doctorName || 'Doctor',
        specialty: apt.doctorSpecialty || 'General',
        date: apt.appointmentDate ? new Date(apt.appointmentDate).toISOString().split('T')[0] : 'N/A',
        time: apt.appointmentTime || apt.timeSlot || 'N/A',
        status: apt.status || 'pending',
        hospital: apt.hospitalName || 'Hospital',
        dateTime: apt.appointmentDate ? new Date(apt.appointmentDate).toISOString() : null,
        notes: apt.notes || '',
      }));
    },
    refetchInterval: 10_000,
    refetchOnWindowFocus: false,
  });

  const {
    data: prescriptionsData = [],
    isLoading: prescriptionsLoading,
  } = useQuery({
    queryKey: ['patient-prescriptions'],
    queryFn: () => fetchWithAuth<Array<any>>('/api/prescriptions/patient'),
  });

  const {
    data: labReportsData = [],
    isLoading: labReportsLoading,
  } = useQuery({
    queryKey: ['patient-lab-reports'],
    queryFn: () => fetchWithAuth<Array<any>>('/api/labs/patient/reports'),
  });

  const {
    data: notificationsData = [],
    isLoading: notificationsLoading,
  } = useQuery({
    queryKey: ['patient-notifications'],
    queryFn: () => fetchWithAuth<Array<any>>('/api/notifications/me'),
    refetchInterval: 15_000,
  });

  const markNotificationMutation = useMutation({
    mutationFn: (notificationId: number) =>
      fetchWithAuth(`/api/notifications/read/${notificationId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-notifications'] });
      message.success('Notification marked as read.');
    },
    onError: () => {
      message.error('Failed to mark notification as read.');
    },
  });

  const prescriptionCards: DashboardPrescription[] = useMemo(() => {
    return prescriptionsData.map((rx: any) => {
      let medications: any[] = [];
      try {
        medications = rx.medications ? JSON.parse(rx.medications) : [];
      } catch (error) {
        console.warn('Failed to parse medications JSON', error);
      }
      const primary = medications[0] || {};
      const dosage = primary?.dosage
        ? `${primary.dosage}${primary.unit ? ` ${primary.unit}` : ''}`
        : rx.diagnosis || 'See instructions';

      return {
        id: rx.id,
        name: primary?.name || rx.diagnosis || 'Prescription',
        dosage,
        nextDose: primary?.schedule || formatDateTime(rx.followUpDate),
        refillsRemaining: primary?.refills ? `${primary.refills} refills left` : 'N/A',
        adherence: 1,
        createdAt: rx.createdAt || null,
      };
    });
  }, [prescriptionsData]);

  const notifications: DashboardNotification[] = useMemo(() => {
    return notificationsData.map((notification: any) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      timestamp: formatDateTime(notification.createdAt),
      severity: toSeverity(notification.type),
      read: Boolean(notification.isRead),
    }));
  }, [notificationsData]);

  const timelineEntries: TimelineEntry[] = useMemo(() => {
    const appointmentEvents = appointmentsData.map((apt: any) => ({
      id: `appointment-${apt.id}`,
      type: 'appointments' as TimelineFilter,
      title: `Appointment with ${apt.doctor}`,
      timestamp: `${apt.date} · ${apt.time}`,
      description: apt.notes || `Status: ${apt.status}`,
      actionLabel: apt.status === 'pending' ? 'Reschedule' : 'View Details',
      sortKey: apt.dateTime ? new Date(apt.dateTime).getTime() : 0,
    }));

    const prescriptionEvents = prescriptionsData.map((rx: any) => ({
      id: `prescription-${rx.id}`,
      type: 'prescriptions' as TimelineFilter,
      title: 'Prescription issued',
      timestamp: formatDateTime(rx.createdAt),
      description: rx.diagnosis || 'See prescription details',
      actionLabel: 'View Details',
      sortKey: rx.createdAt ? new Date(rx.createdAt).getTime() : 0,
    }));

    const labEvents = labReportsData.map((report: any) => ({
      id: `lab-${report.id}`,
      type: 'labs' as TimelineFilter,
      title: `Lab Report: ${report.testName}`,
      timestamp: formatDateTime(report.reportDate),
      description: report.notes || `Status: ${report.status || 'completed'}`,
      actionLabel: 'View Report',
      sortKey: report.reportDate ? new Date(report.reportDate).getTime() : 0,
    }));

    return [...appointmentEvents, ...prescriptionEvents, ...labEvents]
      .sort((a, b) => b.sortKey - a.sortKey);
  }, [appointmentsData, prescriptionsData, labReportsData]);

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'all') return timelineEntries;
    return timelineEntries.filter((entry) => entry.type === timelineFilter);
  }, [timelineEntries, timelineFilter]);

  const stats = {
    totalAppointments: appointmentsData.length,
    upcomingAppointments: appointmentsData.filter((apt: any) => 
      apt.status === 'confirmed' || apt.status === 'pending'
    ).length,
    completedAppointments: appointmentsData.filter((apt: any) => apt.status === 'completed').length,
    prescriptions: prescriptionCards.length,
    labReports: labReportsData.length,
  };

  const messageCounts = {
    total: notifications.length,
    unread: notifications.filter((notification) => !notification.read).length,
  };

  const isTimelineLoading = appointmentsLoading || prescriptionsLoading || labReportsLoading;

  const sidebarMenu = [
    { key: 'dashboard', icon: <UserOutlined />, label: 'Dashboard' },
    { key: 'appointments', icon: <CalendarOutlined />, label: 'Appointments' },
    { key: 'prescriptions', icon: <MedicineBoxOutlined />, label: 'Prescriptions' },
    { key: 'reports', icon: <FileTextOutlined />, label: 'Lab Reports' },
  ];

  const handleQuickAction = (key: 'book' | 'refill' | 'upload' | 'message' | 'history') => {
    switch (key) {
      case 'book':
        setLocation('/book-appointment');
        break;
      case 'refill':
        message.info('Refill request flow coming soon.');
        break;
      case 'upload':
        message.info('Document upload coming soon.');
        break;
      case 'message':
        message.info('Messaging coming soon.');
        break;
      case 'history':
        message.info('Patient history dashboard coming soon.');
        break;
      default:
        break;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <MedicineBoxOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          {!collapsed && (
            <Title level={4} style={{ margin: '8px 0 0', color: '#1890ff' }}>
              NexaCare
            </Title>
          )}
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={sidebarMenu}
          style={{ border: 'none', flex: 1 }}
        />
        <SidebarProfile
          collapsed={collapsed}
          name={user?.fullName || 'Patient'}
          roleLabel="PATIENT"
          roleColor="blue"
          avatarIcon={<UserOutlined />}
          onSettingsClick={() => message.info('Profile settings coming soon.')}
        />
      </Sider>

      <Layout>
        <Content style={{ background: '#f5f5f5' }}>
          <div style={{ padding: '16px 24px 24px' }}>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <KpiCard
                label="Upcoming Appointments"
                value={stats.upcomingAppointments}
                icon={<CalendarOutlined style={{ color: '#1890ff' }} />}
                trendLabel="Updated"
                trendType="positive"
                onView={() => setLocation('/dashboard/patient/appointments')}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <KpiCard
                label="Active Prescriptions"
                value={stats.prescriptions}
                icon={<MedicineBoxOutlined style={{ color: '#52c41a' }} />}
                trendLabel="Current"
                trendType="neutral"
                onView={() => setLocation('/dashboard/patient/prescriptions')}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <KpiCard
                label="Lab Reports"
                value={stats.labReports}
                icon={<FileTextOutlined style={{ color: '#faad14' }} />}
                trendLabel="Latest"
                trendType="neutral"
                onView={() => message.info('Lab reports dashboard coming soon.')}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <KpiCard
                label="Messages"
                value={messageCounts.total}
                icon={<BellOutlined style={{ color: '#722ed1' }} />}
                trendLabel={`+${messageCounts.unread} new`}
                trendType={messageCounts.unread > 0 ? 'positive' : 'neutral'}
                onView={() => message.info('Messages coming soon.')}
              />
            </Col>
          </Row>

            <Card style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={6}>
                <QuickActionTile
                  label="New Appointment"
                icon={<PlusOutlined />} 
                  onClick={() => handleQuickAction('book')}
                />
              </Col>
              <Col xs={24} md={6}>
                <QuickActionTile
                  label="Request Refill"
                icon={<MedicineBoxOutlined />} 
                  onClick={() => handleQuickAction('refill')}
                />
              </Col>
              <Col xs={24} md={6}>
                <QuickActionTile
                  label="Upload Document"
                  icon={<FileTextOutlined />}
                  onClick={() => handleQuickAction('upload')}
                />
              </Col>
              <Col xs={24} md={3}>
                <QuickActionTile
                  label="Send Message"
                  onClick={() => handleQuickAction('message')}
                  variant="secondary"
                />
              </Col>
              <Col xs={24} md={3}>
                <QuickActionTile
                  label="View History"
                  onClick={() => handleQuickAction('history')}
                  variant="secondary"
                />
              </Col>
            </Row>
          </Card>

            <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card
                title="Prescriptions"
                extra={
                  <Space>
                    <Button type="primary">Current</Button>
                    <Button>Past</Button>
                  </Space>
                }
                style={{ marginBottom: 24 }}
              >
                {prescriptionsLoading ? (
                  <Skeleton active paragraph={{ rows: 3 }} />
                ) : prescriptionCards.length ? (
                  <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    {prescriptionCards.map((rx) => (
                      <PrescriptionCard
                        key={rx.id}
                        name={rx.name}
                        dosage={rx.dosage}
                        nextDose={rx.nextDose}
                        refillsRemaining={rx.refillsRemaining}
                        adherence={rx.adherence}
                        onViewDetails={() => message.info('Prescription detail view coming soon.')}
                        onRequestRefill={() => handleQuickAction('refill')}
                      />
                    ))}
                  </Space>
                ) : (
                  <Empty description="No prescriptions yet" />
                )}
              </Card>

              <Card title="Care Timeline">
                <Space style={{ marginBottom: 16 }} wrap>
                  {TIMELINE_FILTERS.map((filter) => (
                    <Tag
                      key={filter}
                      color={timelineFilter === filter ? 'blue' : undefined}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setTimelineFilter(filter)}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Tag>
                  ))}
                </Space>
                {isTimelineLoading ? (
                  <Skeleton active paragraph={{ rows: 4 }} />
                ) : filteredTimeline.length ? (
                  <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    {filteredTimeline.map((item) => (
                      <TimelineItem
                        key={item.id}
                        title={item.title}
                        timestamp={item.timestamp}
                        description={item.description}
                        actionLabel={item.actionLabel}
                        onAction={() => message.info('Coming soon')}
                      />
                    ))}
                  </Space>
                ) : (
                  <Empty description="No timeline events yet" />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Space direction="vertical" style={{ width: '100%' }} size={24}>
                <Card title="Next Appointment">
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <Text type="secondary">with {appointmentsData[0]?.doctor || 'your care team'}</Text>
                    <Card style={{ background: '#E6F4FF', textAlign: 'center' }}>
                      <Text type="secondary">In</Text>
                      <Title level={3} style={{ margin: '8px 0 0' }}>
                        {appointmentsData[0]?.date ? `${appointmentsData[0].date} · ${appointmentsData[0].time}` : 'TBD'}
                      </Title>
                    </Card>
                    <Button block onClick={() => message.info('Appointment detail view coming soon.')}>
                      View Details
              </Button>
            </Space>
        </Card>

                <Card title="Latest Lab Result">
                  {labReportsLoading ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : labReportsData.length ? (
                    <Space direction="vertical" size={12}>
                      <Text type="secondary">
                        {labReportsData[0].testName} · {formatDateTime(labReportsData[0].reportDate)}
                      </Text>
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Text strong>{labReportsData[0].testType}</Text>
                        </Col>
                        <Col>
                          <Title level={4} style={{ margin: 0 }}>
                            {labReportsData[0].status || 'Completed'}
                          </Title>
                        </Col>
                      </Row>
                      <Tag color="orange">Review</Tag>
                      <Button block onClick={() => message.info('Lab report viewer coming soon.')}>
                        View Full Report
                      </Button>
                    </Space>
                  ) : (
                    <Empty description="No lab reports yet" />
                  )}
                </Card>

                <Card title="Notifications">
                  {notificationsLoading ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : notifications.length ? (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      {notifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          title={notification.title}
                          message={notification.message}
                          timestamp={notification.timestamp}
                          severity={notification.severity}
                          read={notification.read}
                          onMarkRead={() =>
                            !notification.read && markNotificationMutation.mutate(notification.id)
                          }
                        />
                      ))}
                    </Space>
                  ) : (
                    <Empty description="All caught up" />
                  )}
          </Card>
              </Space>
            </Col>
          </Row>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}