import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Typography,
  Menu,
  Progress,
  List,
  message,
  Avatar,
  Drawer,
  Badge,
  Empty,
  Spin
} from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  FileTextOutlined,
  TeamOutlined,
  BankOutlined,
  UserAddOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { SidebarProfile } from '../../components/dashboard/SidebarProfile';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { NotificationItem } from '../../components/dashboard/NotificationItem';
import { formatDateTime } from '../../lib/utils';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const hospitalTheme = {
  primary: '#7C3AED', // Purple
  secondary: '#0EA5E9', // Sky blue
  accent: '#FBBF24', // Amber
  background: '#F6F2FF', // Light purple
  highlight: '#EDE9FE', // Lighter purple
};

export default function HospitalDashboard() {
  const { user, logout } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      setCollapsed(true);
    }
  }, [isMobile, isTablet]);

  // Get dashboard stats from real data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/hospitals/stats'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/hospitals/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.log('⚠️ Hospital stats API not ready yet');
        // Return default values if API fails
        return {
          totalDoctors: 0,
          totalPatients: 0,
          totalAppointments: 0,
          todayAppointments: 0,
          completedAppointments: 0,
          pendingAppointments: 0,
          totalRevenue: 0
        };
      }
      return response.json();
    },
    enabled: !!user && user.role?.toUpperCase() === 'HOSPITAL',
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get notifications for hospital admin
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/notifications/me'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/notifications/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.log('⚠️ Notifications API not ready yet');
        return [];
      }
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Mark notification as read
  const markNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/notifications/read/${notificationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to mark notification as read');
      return response.json();
    },
    onSuccess: () => {
      message.success('Notification marked as read.');
    },
    onError: () => {
      message.error('Failed to mark notification as read.');
    },
  });

  // Get hospital appointments with auto-refresh
  const { data: allAppointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments/my'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/appointments/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch appointments');
      const data = await response.json();
      // Transform API data to match table format with date object
      return data.map((apt: any) => {
        // Handle different date formats
        let appointmentDate = apt.appointmentDate;
        if (typeof appointmentDate === 'string') {
          appointmentDate = new Date(appointmentDate);
          if (isNaN(appointmentDate.getTime())) {
            console.warn(`⚠️ Invalid date for appointment ${apt.id}:`, apt.appointmentDate);
            appointmentDate = null;
          }
        } else if (appointmentDate) {
          appointmentDate = new Date(appointmentDate);
        }
        
        return {
        id: apt.id,
        patient: apt.patientName || 'Unknown Patient',
        doctor: apt.doctorName || 'Unknown Doctor',
        time: apt.appointmentTime || apt.timeSlot || 'N/A',
        status: apt.status || 'pending',
        department: apt.doctorSpecialty || 'General',
          date: apt.appointmentDate,
          dateObj: appointmentDate,
        };
      });
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch when component mounts
  });

  // Filter appointments that are today or in the future (by date and time)
  // Hospital admin needs to see pending, confirmed, completed, and cancelled appointments
  const futureAppointments = useMemo(() => {
    const now = new Date();
    
    return allAppointments
      .filter((apt: any) => {
        // Show all statuses (pending, confirmed, completed, cancelled)
        // Hospital admin can see all appointment statuses
        
        // Check if appointment has valid date
        if (!apt.date && !apt.dateObj) {
          return false;
        }
        
        try {
          const appointmentDateTime = apt.dateObj || new Date(apt.date);
          if (isNaN(appointmentDateTime.getTime())) {
            return false;
          }
          
          // Parse time from appointmentTime or timeSlot
          let appointmentTime = new Date(appointmentDateTime);
          
          if (apt.time) {
            // Parse time string (e.g., "09:00", "09:00 AM", "14:30")
            const timeStr = apt.time.trim();
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
            
            if (timeMatch) {
              let hours = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2]);
              const period = timeMatch[3]?.toUpperCase();
              
              // Handle 12-hour format
              if (period === 'PM' && hours !== 12) {
                hours += 12;
              } else if (period === 'AM' && hours === 12) {
                hours = 0;
              }
              
              appointmentTime.setHours(hours, minutes, 0, 0);
            } else {
              // Try 24-hour format
              const parts = timeStr.split(':');
              if (parts.length >= 2) {
                const hours = parseInt(parts[0]) || 9;
                const minutes = parseInt(parts[1]) || 0;
                appointmentTime.setHours(hours, minutes, 0, 0);
              } else {
                // Default to 9 AM if can't parse
                appointmentTime.setHours(9, 0, 0, 0);
              }
            }
          } else {
            // No time info, default to start of day (midnight)
            appointmentTime.setHours(0, 0, 0, 0);
          }
          
          // Only include appointments that are today or in the future (by date and time)
          return appointmentTime >= now;
        } catch (error) {
          console.error(`❌ Error checking date/time for appointment ${apt.id}:`, error);
          return false;
        }
      })
      .sort((a: any, b: any) => {
        // Sort by date and time (earliest first)
        const dateTimeA = a.dateObj || new Date(a.date);
        const dateTimeB = b.dateObj || new Date(b.date);
        return dateTimeA.getTime() - dateTimeB.getTime();
      });
  }, [allAppointments]);

  // Use filtered appointments
  const appointments = futureAppointments;

  // Get recent doctors from hospital appointments
  const doctors = appointments ? Array.from(
    new Map(
      appointments
        .filter((apt: any) => apt.doctor && apt.doctor !== 'Unknown Doctor')
        .map((apt: any) => [apt.doctor, {
          id: apt.doctor,
          name: apt.doctor,
          specialty: apt.department || 'General',
          patients: appointments.filter((a: any) => a.doctor === apt.doctor).length,
          status: 'active'
        }])
    ).values()
  ).slice(0, 5) : [];

  const appointmentColumns = [
    {
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
    },
    {
      title: 'Doctor',
      dataIndex: 'doctor',
      key: 'doctor',
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'confirmed' ? 'green' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
  ];

  const sidebarMenu = [
    {
      key: 'dashboard',
      icon: <BankOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'doctors',
      icon: <TeamOutlined />,
      label: 'Doctors',
    },
    {
      key: 'patients',
      icon: <UserOutlined />,
      label: 'Patients',
    },
    {
      key: 'appointments',
      icon: <CalendarOutlined />,
      label: 'Appointments',
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: 'Lab Reports',
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
    },
  ];

  const siderWidth = isMobile ? 0 : (collapsed ? 80 : 260);

  // Sidebar content component (reusable for drawer and sider)
  const SidebarContent = ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <>
      <div style={{ 
        padding: '16px', 
        textAlign: 'center',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <BankOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />
        {(!collapsed || isMobile) && (
          <Title level={4} style={{ margin: '8px 0 0 0', color: hospitalTheme.primary }}>
            NexaCare Hospital
          </Title>
        )}
      </div>
      <Menu
        mode="inline"
        defaultSelectedKeys={['dashboard']}
        items={sidebarMenu}
        style={{ border: 'none', flex: 1 }}
        onClick={onMenuClick}
      />
      <SidebarProfile
        collapsed={collapsed && !isMobile}
        name={user?.fullName || 'Hospital Admin'}
        roleLabel="HOSPITAL ADMIN"
        roleColor="#7C3AED"
        avatarIcon={<BankOutlined />}
        onSettingsClick={() => message.info('Profile settings coming soon.')}
        onLogoutClick={logout}
        hospitalName={user?.hospitalName || null}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
      <Sider 
          trigger={null}
        collapsible 
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        collapsedWidth={80}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: siderWidth,
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          zIndex: 10,
        }}
      >
          <SidebarContent />
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title="Navigation"
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          bodyStyle={{ padding: 0 }}
          width={260}
        >
          <SidebarContent onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: hospitalTheme.background,
          transition: 'margin-left 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            background: hospitalTheme.background,
            height: '100vh',
            overflowY: 'auto',
            padding: isMobile ? '0 16px 16px' : isTablet ? '0 20px 20px' : '0 24px 24px',
            paddingTop: 0,
          }}
        >
          <div style={{ paddingBottom: 24, maxWidth: '1320px', margin: '0 auto' }}>
            {/* Mobile Menu Button */}
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Button
                  type="text"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setMobileDrawerOpen(true)}
                  style={{ fontSize: '18px' }}
                />
                <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
                <div style={{ width: 32 }} /> {/* Spacer for centering */}
              </div>
            )}
            
            {/* Desktop/Tablet Menu Toggle */}
            {!isMobile && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button
                  type="text"
                  icon={collapsed ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                />
              </div>
            )}

            {/* KPI Cards - Responsive Grid */}
            {isMobile ? (
              <div style={{ 
                display: 'flex', 
                overflowX: 'auto', 
                gap: 12, 
                marginBottom: 24,
                paddingBottom: 8,
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
              }}>
                {[
                  { label: "Total Doctors", value: statsLoading ? '...' : (stats?.totalDoctors || 0), icon: <TeamOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />, trendLabel: "Active", trendType: "positive" as const, onView: () => message.info('View doctors') },
                  { label: "Total Patients", value: statsLoading ? '...' : (stats?.totalPatients || 0), icon: <UserOutlined style={{ fontSize: '24px', color: hospitalTheme.secondary }} />, trendLabel: "Registered", trendType: "positive" as const, onView: () => message.info('View patients') },
                  { label: "Upcoming Appointments", value: statsLoading ? '...' : (stats?.upcomingAppointments || stats?.todayAppointments || 0), icon: <CalendarOutlined style={{ fontSize: '24px', color: hospitalTheme.accent }} />, trendLabel: "Scheduled", trendType: "neutral" as const, onView: () => message.info('View appointments') },
                  { label: "Monthly Revenue", value: statsLoading ? '...' : `₹${(stats?.totalRevenue || 0).toLocaleString()}`, icon: <BarChartOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />, trendLabel: "This Month", trendType: "positive" as const, onView: () => message.info('View revenue') },
                ].map((kpi, idx) => (
                  <div key={idx} style={{ minWidth: 200, scrollSnapAlign: 'start' }}>
                    <KpiCard {...kpi} />
                  </div>
                ))}
              </div>
            ) : (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
              <KpiCard
                label="Total Doctors"
                    value={statsLoading ? '...' : (stats?.totalDoctors || 0)}
                icon={<TeamOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />}
                trendLabel="Active"
                trendType="positive"
              />
            </Col>
                <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
              <KpiCard
                label="Total Patients"
                    value={statsLoading ? '...' : (stats?.totalPatients || 0)}
                icon={<UserOutlined style={{ fontSize: '24px', color: hospitalTheme.secondary }} />}
                trendLabel="Registered"
                trendType="positive"
              />
            </Col>
                <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
              <KpiCard
                    label="Upcoming Appointments"
                    value={statsLoading ? '...' : (stats?.upcomingAppointments || stats?.todayAppointments || 0)}
                icon={<CalendarOutlined style={{ fontSize: '24px', color: hospitalTheme.accent }} />}
                trendLabel="Scheduled"
                trendType="neutral"
              />
            </Col>
                <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
              <KpiCard
                label="Monthly Revenue"
                    value={statsLoading ? '...' : `₹${(stats?.totalRevenue || 0).toLocaleString()}`}
                icon={<BarChartOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />}
                trendLabel="This Month"
                trendType="positive"
              />
            </Col>
          </Row>
            )}

        {/* Quick Actions */}
          <Card 
            title="Quick Actions" 
            style={{ 
              marginBottom: '24px',
              borderRadius: 16,
              background: hospitalTheme.background
            }}
            bodyStyle={{ padding: isMobile ? 16 : 20 }}
          >
            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <QuickActionTile
                  label="Invite Staff"
                  icon={<UserAddOutlined />}
                  onClick={() => message.info('Invite staff feature coming soon')}
                />
                <QuickActionTile
                  label="Assign Shift"
                  icon={<CalendarOutlined />}
                  onClick={() => message.info('Assign shift feature coming soon')}
                />
                <QuickActionTile
                  label="Approve Requests"
                  icon={<CheckCircleOutlined />}
                  onClick={() => message.info('Approve requests feature coming soon')}
                />
                <QuickActionTile
                  label="View Reports"
                  icon={<BarChartOutlined />}
                  onClick={() => message.info('View reports feature coming soon')}
                />
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                <QuickActionTile
                  label="Invite Staff"
                  icon={<UserAddOutlined />}
                  onClick={() => message.info('Invite staff feature coming soon')}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <QuickActionTile
                  label="Assign Shift"
                  icon={<CalendarOutlined />}
                  onClick={() => message.info('Assign shift feature coming soon')}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <QuickActionTile
                  label="Approve Requests"
                  icon={<CheckCircleOutlined />}
                  onClick={() => message.info('Approve requests feature coming soon')}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <QuickActionTile
                  label="View Reports"
                  icon={<BarChartOutlined />}
                  onClick={() => message.info('View reports feature coming soon')}
                />
              </Col>
            </Row>
            )}
          </Card>

          <Row gutter={[16, 16]}>
            {/* Upcoming Appointments */}
            <Col xs={24} lg={16}>
              <Card 
                title="Upcoming Appointments" 
                extra={<Button type="link" onClick={() => message.info('View all appointments feature coming soon')}>View All</Button>}
                style={{ borderRadius: 16 }}
              >
                <div style={{ overflowX: 'auto' }}>
                <Table
                  columns={appointmentColumns}
                  dataSource={appointments}
                  pagination={false}
                  rowKey="id"
                  variant="borderless"
                    loading={appointmentsLoading}
                    size={isMobile ? "small" : "middle"}
                    scroll={isMobile ? { x: 'max-content' } : undefined}
                  style={{
                    backgroundColor: hospitalTheme.background
                  }}
                />
                </div>
              </Card>
            </Col>

            {/* Hospital Stats & Recent Doctors */}
            <Col xs={24} lg={8}>
              <Card 
                title="Hospital Performance"
                style={{ borderRadius: 16 }}
              >
                <Progress 
                  percent={stats?.todayAppointments ? Math.round((stats.completedAppointments / stats.todayAppointments) * 100) : 0} 
                  status="active" 
                  strokeColor={hospitalTheme.primary}
                  style={{ marginBottom: '16px' }}
                />
                <Text type="secondary">
                  {stats?.completedAppointments || 0} of {stats?.todayAppointments || 0} appointments completed today
                </Text>
              </Card>

              <Card 
                title="Recent Doctors" 
                style={{ 
                  marginTop: '16px',
                  borderRadius: 16
                }}
              >
                <List
                  dataSource={doctors}
                  renderItem={(doctor: any) => (
                    <List.Item style={{ 
                      padding: '12px 0',
                      borderBottom: '1px solid #f0f0f0'
                    }}>
                      <List.Item.Meta
                        avatar={<Avatar 
                          icon={<UserOutlined />} 
                          style={{ backgroundColor: hospitalTheme.highlight }}
                        />}
                        title={<Text strong>{doctor.name}</Text>}
                        description={
                          <Space direction="vertical" size={0}>
                            <Text type="secondary">{doctor.specialty}</Text>
                            <Text type="secondary">{doctor.patients} patients</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>

              <Card 
                title={
                  <Space>
                    <BellOutlined />
                    <span>Notifications</span>
                    {notifications.filter((notif: any) => !notif.read).length > 0 && (
                      <Badge count={notifications.filter((notif: any) => !notif.read).length} />
                    )}
                  </Space>
                }
                style={{ 
                  marginTop: '16px',
                  borderRadius: 16
                }}
              >
                {notificationsLoading ? (
                  <Spin size="small" />
                ) : notifications.length > 0 ? (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {notifications.slice(0, 5).map((notif: any) => (
                      <NotificationItem
                        key={notif.id}
                        title={notif.title || 'Notification'}
                        message={notif.message || ''}
                        timestamp={formatDateTime(notif.createdAt)}
                        severity={notif.type === 'urgent' ? 'urgent' : 'info'}
                        read={Boolean(notif.read)}
                        onMarkRead={() => !notif.read && markNotificationMutation.mutate(notif.id)}
                      />
                    ))}
                  </Space>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="All caught up"
                    style={{ padding: '20px 0' }}
                  />
                )}
              </Card>
            </Col>
          </Row>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}