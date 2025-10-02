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
  List,
  Modal
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
  UserAddOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  LoginOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function ReceptionistDashboard() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Get dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => ({
      totalAppointments: 45,
      todayAppointments: 18,
      completedAppointments: 12,
      pendingAppointments: 6,
      walkInPatients: 8,
      totalPatients: 1250
    })
  });

  // Get appointments
  const { data: appointments } = useQuery({
    queryKey: ['/api/appointments/my'],
    queryFn: async () => [
      {
        id: 1,
        patient: 'John Doe',
        doctor: 'Dr. Sarah Johnson',
        time: '09:00 AM',
        status: 'confirmed',
        department: 'Cardiology',
        phone: '+91 98765 43210'
      },
      {
        id: 2,
        patient: 'Jane Smith',
        doctor: 'Dr. Michael Chen',
        time: '10:30 AM',
        status: 'pending',
        department: 'Dermatology',
        phone: '+91 98765 43211'
      },
      {
        id: 3,
        patient: 'Mike Johnson',
        doctor: 'Dr. Emily Davis',
        time: '02:00 PM',
        status: 'waiting',
        department: 'Neurology',
        phone: '+91 98765 43212'
      }
    ]
  });

  // Get walk-in patients
  const { data: walkInPatients } = useQuery({
    queryKey: ['/api/walk-in-patients'],
    queryFn: async () => [
      {
        id: 1,
        name: 'Alice Brown',
        time: '09:15 AM',
        reason: 'Emergency',
        status: 'waiting'
      },
      {
        id: 2,
        name: 'Bob Wilson',
        time: '10:45 AM',
        reason: 'Follow-up',
        status: 'processing'
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
      render: (status: string) => {
        const color = status === 'confirmed' ? 'green' : status === 'waiting' ? 'orange' : 'blue';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Button size="small" type="primary">Check-in</Button>
          <Button size="small">Call</Button>
        </Space>
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
      icon: <TeamOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'appointments',
      icon: <CalendarOutlined />,
      label: 'Appointments',
    },
    {
      key: 'walkin',
      icon: <UserAddOutlined />,
      label: 'Walk-in Registration',
    },
    {
      key: 'checkin',
      icon: <LoginOutlined />,
      label: 'Patient Check-in',
    },
    {
      key: 'contacts',
      icon: <PhoneOutlined />,
      label: 'Contact Directory',
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
          <TeamOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          {!collapsed && (
            <Title level={4} style={{ margin: '8px 0 0 0', color: '#1890ff' }}>
              NexaCare Reception
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
            <Tag color="orange" style={{ marginRight: '8px' }}>
              📞 RECEPTIONIST DASHBOARD
            </Tag>
            <Badge count={12} size="small">
              <BellOutlined style={{ fontSize: '18px' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<TeamOutlined />} />
                <Text strong>{user?.fullName}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: '24px', background: '#f5f5f5' }}>
          <div style={{ marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0 }}>
              Reception Dashboard
            </Title>
            <Text type="secondary">
              Welcome back, {user?.fullName} - Receptionist
            </Text>
              </div>

          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Today's Appointments"
                  value={stats?.todayAppointments || 0}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Completed"
                  value={stats?.completedAppointments || 0}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Waiting"
                  value={stats?.pendingAppointments || 0}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Walk-in Patients"
                  value={stats?.walkInPatients || 0}
                  prefix={<UserAddOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
        </Card>
            </Col>
          </Row>

          {/* Quick Actions */}
          <Card title="Quick Actions" style={{ marginBottom: '24px' }}>
            <Space wrap>
              <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setIsBookingModalOpen(true)}>
                Book Appointment
              </Button>
              <Button icon={<UserAddOutlined />} size="large">
                Walk-in Registration
              </Button>
              <Button icon={<LoginOutlined />} size="large">
                Patient Check-in
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

            {/* Walk-in Patients & Queue Status */}
            <Col xs={24} lg={8}>
              <Card title="Walk-in Patients">
                <List
                  dataSource={walkInPatients}
                  renderItem={(patient: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={patient.name}
                        description={
                          <Space direction="vertical" size={0}>
                            <Text type="secondary">{patient.time} - {patient.reason}</Text>
                            <Tag color={patient.status === 'waiting' ? 'orange' : 'blue'}>
                              {patient.status}
                            </Tag>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>

              <Card title="Queue Status" style={{ marginTop: '16px' }}>
                <Progress 
                  percent={67} 
                  status="active" 
                  strokeColor="#52c41a"
                  style={{ marginBottom: '16px' }}
                />
                <Text type="secondary">
                  {stats?.completedAppointments || 0} of {stats?.todayAppointments || 0} appointments completed
                </Text>
              </Card>
            </Col>
          </Row>

          {/* Booking Modal */}
          <Modal
            title="Book New Appointment"
            open={isBookingModalOpen}
            onCancel={() => setIsBookingModalOpen(false)}
            footer={null}
            width={600}
          >
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <CalendarOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
              <Title level={3}>Appointment Booking</Title>
              <Text type="secondary">
                This feature will be implemented in the next phase
              </Text>
              <div style={{ marginTop: '24px' }}>
                <Button type="primary" onClick={() => setIsBookingModalOpen(false)}>
                  Close
        </Button>
      </div>
            </div>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}