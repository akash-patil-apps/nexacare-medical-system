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
  Avatar,
  Menu,
  Dropdown,
  Badge,
  Progress,
  Timeline,
  List
} from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  MedicineBoxOutlined, 
  FileTextOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  BankOutlined,
  UserAddOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';

const { Header, Content, Sider } = Layout;
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

  // Get hospital appointments
  const { data: appointments } = useQuery({
    queryKey: ['/api/appointments/my'],
    queryFn: async () => [
      {
        id: 1,
        patient: 'John Doe',
        doctor: 'Dr. Sarah Johnson',
        time: '09:00 AM',
        status: 'confirmed',
        department: 'Cardiology'
      },
      {
        id: 2,
        patient: 'Jane Smith',
        doctor: 'Dr. Michael Chen',
        time: '10:30 AM',
        status: 'pending',
        department: 'Dermatology'
      },
      {
        id: 3,
        patient: 'Mike Johnson',
        doctor: 'Dr. Emily Davis',
        time: '02:00 PM',
        status: 'confirmed',
        department: 'Neurology'
      }
    ]
  });

  // Get recent doctors
  const { data: doctors } = useQuery({
    queryKey: ['/api/doctors/list'],
    queryFn: async () => [
      {
        id: 1,
        name: 'Dr. Sarah Johnson',
        specialty: 'Cardiology',
        patients: 45,
        status: 'active'
      },
      {
        id: 2,
        name: 'Dr. Michael Chen',
        specialty: 'Dermatology',
        patients: 32,
        status: 'active'
      },
      {
        id: 3,
        name: 'Dr. Emily Davis',
        specialty: 'Neurology',
        patients: 28,
        status: 'active'
      }
    ]
  });

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
      type: 'divider',
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
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
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
            <Tag color="red" style={{ marginRight: '8px' }}>
              🏥 HOSPITAL DASHBOARD
            </Tag>
            <Badge count={8} size="small">
              <BellOutlined style={{ fontSize: '18px' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<BankOutlined />} />
                <Text strong>{user?.fullName}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: '24px', background: '#f5f5f5' }}>
          <div style={{ marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0 }}>
              Hospital Management Dashboard
            </Title>
            <Text type="secondary">
              Welcome back, {user?.fullName} - Hospital Administrator
            </Text>
            </div>

          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
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
              <Button type="primary" icon={<UserAddOutlined />} size="large">
                Add Doctor
              </Button>
              <Button icon={<CalendarOutlined />} size="large">
                Manage Appointments
              </Button>
              <Button icon={<BarChartOutlined />} size="large">
                View Analytics
              </Button>
            </Space>
          </Card>

          <Row gutter={[16, 16]}>
            {/* Today's Appointments */}
            <Col xs={24} lg={16}>
              <Card 
                title="Today's Appointments" 
                extra={<Button type="link">View All</Button>}
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
        </Content>
      </Layout>
    </Layout>
  );
}