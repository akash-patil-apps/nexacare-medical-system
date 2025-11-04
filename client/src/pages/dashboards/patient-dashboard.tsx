import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Typography,
  Avatar,
  Menu,
  Dropdown,
  Badge,
  message
} from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  MedicineBoxOutlined, 
  FileTextOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';
import { useOnboardingCheck } from '../../hooks/use-onboarding-check';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  
  // Check onboarding status
  useOnboardingCheck();

  // Get patient appointments from API
  const { data: appointmentsData = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/appointments/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch appointments');
      const data = await response.json();
      console.log('📅 Patient appointments loaded:', data.length, 'appointments');
      return data.map((apt: any) => ({
        id: apt.id,
        doctor: apt.doctorName || 'Unknown Doctor',
        specialty: apt.doctorSpecialty || 'General',
        date: apt.appointmentDate ? new Date(apt.appointmentDate).toISOString().split('T')[0] : 'N/A',
        time: apt.appointmentTime || apt.timeSlot || 'N/A',
        status: apt.status || 'pending',
        hospital: apt.hospitalName || 'Unknown Hospital'
      }));
    },
    refetchInterval: 10000, // Refetch every 10 seconds (less aggressive)
    refetchOnWindowFocus: false, // Don't refetch on window focus (prevents unwanted refreshes)
    refetchOnMount: true,
  });

  // Calculate stats from real appointments data
  const stats = {
    totalAppointments: appointmentsData.length,
    upcomingAppointments: appointmentsData.filter((apt: any) => 
      apt.status === 'confirmed' || apt.status === 'pending'
    ).length,
    completedAppointments: appointmentsData.filter((apt: any) => 
      apt.status === 'completed'
    ).length,
    prescriptions: 0, // TODO: Fetch from prescriptions API when ready
    labReports: 0 // TODO: Fetch from lab reports API when ready
  };

  // Get recent appointments (last 5)
  const appointments = appointmentsData.slice(0, 5);

  const appointmentColumns = [
    {
      title: 'Doctor',
      dataIndex: 'doctor',
      key: 'doctor',
    },
    {
      title: 'Specialty',
      dataIndex: 'specialty',
      key: 'specialty',
    },
    {
      title: 'Date & Time',
      key: 'datetime',
      render: (record: any) => (
        <Space direction="vertical" size={0}>
          <Text>{record.date}</Text>
          <Text type="secondary">{record.time}</Text>
        </Space>
      ),
    },
    {
      title: 'Hospital',
      dataIndex: 'hospital',
      key: 'hospital',
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

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logout,
    },
  ];

  const sidebarMenu = [
    {
      key: 'dashboard',
      icon: <UserOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'appointments',
      icon: <CalendarOutlined />,
      label: 'Appointments',
    },
    {
      key: 'prescriptions',
      icon: <MedicineBoxOutlined />,
      label: 'Prescriptions',
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: 'Lab Reports',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ 
          padding: '16px', 
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <MedicineBoxOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          {!collapsed && (
            <Title level={4} style={{ margin: '8px 0 0 0', color: '#1890ff' }}>
              NexaCare
            </Title>
          )}
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={sidebarMenu}
          style={{ border: 'none' }}
        />
      </Sider>

      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
            <Button 
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px' }}
          >
            {collapsed ? '☰' : '✕'}
            </Button>

          <Space>
            <Tag color="blue" style={{ marginRight: '8px' }}>
              👤 PATIENT DASHBOARD
            </Tag>
            <Badge count={3} size="small">
              <BellOutlined style={{ fontSize: '18px' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <Text strong>{user?.fullName}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: '24px', background: '#f5f5f5' }}>
          <div style={{ marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0 }}>
              Welcome back, {user?.fullName}!
            </Title>
            <Text type="secondary">
              Here's your medical dashboard overview
            </Text>
          </div>

          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Appointments"
                  value={stats?.totalAppointments || 0}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Upcoming"
                  value={stats?.upcomingAppointments || 0}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
      </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Prescriptions"
                  value={stats?.prescriptions || 0}
                  prefix={<MedicineBoxOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Lab Reports"
                  value={stats?.labReports || 0}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Quick Actions */}
          <Card title="Quick Actions" style={{ marginBottom: '24px' }}>
            <Space wrap>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                size="large"
                onClick={() => setLocation('/book-appointment')}
              >
                Book Appointment
              </Button>
              <Button 
                icon={<MedicineBoxOutlined />} 
                size="large"
                onClick={() => setLocation('/dashboard/patient/prescriptions')}
              >
                View Prescriptions
              </Button>
              <Button 
                icon={<FileTextOutlined />} 
                size="large"
                onClick={() => message.info('Lab reports feature coming soon')}
              >
                Lab Reports
              </Button>
            </Space>
        </Card>

          {/* Recent Appointments */}
          <Card 
            title="Recent Appointments" 
            extra={<Button type="link" onClick={() => setLocation('/dashboard/patient/appointments')}>View All</Button>}
          >
            <Table
              columns={appointmentColumns}
              dataSource={appointments}
              pagination={false}
              rowKey="id"
            />
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}