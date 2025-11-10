import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  BarChartOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { SidebarProfile } from '../../components/dashboard/SidebarProfile';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

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
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          padding: '16px', 
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <BankOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          {!collapsed && (
            <Title level={4} style={{ margin: '8px 0 0 0', color: '#1890ff' }}>
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

      <Layout>
        <Content style={{ background: '#f5f5f5' }}>
          <div style={{ padding: '32px 24px', maxWidth: '1320px', margin: '0 auto' }}>
            <div
              style={{
                marginBottom: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div>
                <Text type="secondary">Home / Hospital Dashboard</Text>
                <Title level={2} style={{ margin: '4px 0 0' }}>
                  Hospital Management Dashboard
                </Title>
              </div>
              <Button
                type="text"
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: 16 }}
              >
                {collapsed ? '☰' : '✕'}
              </Button>
            </div>

          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Total Doctors"
                  value={stats?.totalDoctors || 0}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Total Patients"
                  value={stats?.totalPatients || 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Today's Appointments"
                  value={stats?.todayAppointments || 0}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Monthly Revenue"
                  value={stats?.totalRevenue || 0}
                  prefix="₹"
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
                icon={<UserAddOutlined />} 
                size="large"
                onClick={() => message.info('Add doctor feature coming soon')}
              >
                Add Doctor
              </Button>
              <Button 
                icon={<CalendarOutlined />} 
                size="large"
                onClick={() => message.info('Manage appointments feature coming soon')}
              >
                Manage Appointments
              </Button>
              <Button 
                icon={<BarChartOutlined />} 
                size="large"
                onClick={() => message.info('Analytics feature coming soon')}
              >
                View Analytics
              </Button>
            </Space>
          </Card>

          <Row gutter={[16, 16]}>
            {/* Today's Appointments */}
            <Col xs={24} lg={16}>
              <Card 
                title="Today's Appointments" 
                extra={<Button type="link" onClick={() => message.info('View all appointments feature coming soon')}>View All</Button>}
              >
                <Table
                  columns={appointmentColumns}
                  dataSource={appointments}
                  pagination={false}
                  rowKey="id"
                />
              </Card>
            </Col>

            {/* Hospital Stats & Recent Doctors */}
            <Col xs={24} lg={8}>
              <Card title="Hospital Performance">
                <Progress 
                  percent={75} 
                  status="active" 
                  strokeColor="#52c41a"
                  style={{ marginBottom: '16px' }}
                />
                <Text type="secondary">
                  {stats?.completedAppointments || 0} of {stats?.todayAppointments || 0} appointments completed today
                </Text>
              </Card>

              <Card title="Recent Doctors" style={{ marginTop: '16px' }}>
                <List
                  dataSource={doctors}
                  renderItem={(doctor: any) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} />}
                        title={doctor.name}
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