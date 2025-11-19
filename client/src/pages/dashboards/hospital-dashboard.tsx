import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Avatar
} from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  FileTextOutlined,
  TeamOutlined,
  BankOutlined,
  UserAddOutlined,
  BarChartOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { SidebarProfile } from '../../components/dashboard/SidebarProfile';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';

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
  const [collapsed, setCollapsed] = useState(false);

  // Get dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => ({
      totalDoctors: 24,
      totalPatients: 1250,
      totalAppointments: 156,
      todayAppointments: 18,
      completedAppointments: 12,
      pendingAppointments: 6,
      totalRevenue: 125000
    })
  });

  // Get hospital appointments with auto-refresh
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
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
      // Transform API data to match table format
      return data.map((apt: any) => ({
        id: apt.id,
        patient: apt.patientName || 'Unknown Patient',
        doctor: apt.doctorName || 'Unknown Doctor',
        time: apt.appointmentTime || apt.timeSlot || 'N/A',
        status: apt.status || 'pending',
        department: apt.doctorSpecialty || 'General',
        date: apt.appointmentDate
      }));
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch when component mounts
  });

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

  const siderWidth = collapsed ? 80 : 260;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Sider 
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
        <div style={{ 
          padding: '16px', 
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <BankOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />
          {!collapsed && (
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
        />
        <SidebarProfile
          collapsed={collapsed}
          name={user?.fullName || 'Hospital Admin'}
          roleLabel="HOSPITAL ADMIN"
          roleColor="#7C3AED"
          avatarIcon={<BankOutlined />}
          onSettingsClick={() => message.info('Profile settings coming soon.')}
          onLogoutClick={logout}
        />
      </Sider>

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
          }}
        >
          <div style={{ padding: '32px 24px', maxWidth: '1320px', margin: '0 auto', paddingBottom: 48 }}>
          {/* KPI Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <KpiCard
                label="Total Doctors"
                value={stats?.totalDoctors || 0}
                icon={<TeamOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />}
                trendLabel="Active"
                trendType="positive"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <KpiCard
                label="Total Patients"
                value={stats?.totalPatients || 0}
                icon={<UserOutlined style={{ fontSize: '24px', color: hospitalTheme.secondary }} />}
                trendLabel="Registered"
                trendType="positive"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <KpiCard
                label="Today's Appointments"
                value={stats?.todayAppointments || 0}
                icon={<CalendarOutlined style={{ fontSize: '24px', color: hospitalTheme.accent }} />}
                trendLabel="Scheduled"
                trendType="neutral"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <KpiCard
                label="Monthly Revenue"
                value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`}
                icon={<BarChartOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />}
                trendLabel="This Month"
                trendType="positive"
              />
            </Col>
          </Row>

        {/* Quick Actions */}
          <Card 
            title="Quick Actions" 
            style={{ 
              marginBottom: '24px',
              borderRadius: 16,
              background: hospitalTheme.background
            }}
          >
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
          </Card>

          <Row gutter={[16, 16]}>
            {/* Today's Appointments */}
            <Col xs={24} lg={16}>
              <Card 
                title="Today's Appointments" 
                extra={<Button type="link" onClick={() => message.info('View all appointments feature coming soon')}>View All</Button>}
                style={{ borderRadius: 16 }}
              >
                <Table
                  columns={appointmentColumns}
                  dataSource={appointments}
                  pagination={false}
                  rowKey="id"
                  variant="borderless"
                  style={{
                    backgroundColor: hospitalTheme.background
                  }}
                />
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
            </Col>
          </Row>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}