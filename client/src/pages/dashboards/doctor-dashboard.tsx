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
  Timeline
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
  TeamOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import PrescriptionForm from '../../components/prescription-form';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);

  // Get dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => ({
      totalPatients: 156,
      todayAppointments: 8,
      completedAppointments: 6,
      pendingPrescriptions: 3,
      totalPrescriptions: 45
    })
  });

  // Get doctor profile to access hospitalId
  const { data: doctorProfile } = useQuery({
    queryKey: ['/api/doctors/profile'],
    queryFn: async () => {
      const response = await fetch('/api/doctors/profile');
      return response.json();
    },
    enabled: !!user && user.role === 'DOCTOR',
  });

  // Get doctor appointments
  const { data: todayAppointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments/my'],
    queryFn: async () => [
      {
        id: 1,
        patient: 'John Doe',
        time: '09:00 AM',
        status: 'confirmed',
        type: 'Follow-up',
        priority: 'Normal'
      },
      {
        id: 2,
        patient: 'Jane Smith',
        time: '10:30 AM',
        status: 'confirmed',
        type: 'Consultation',
        priority: 'High'
      },
      {
        id: 3,
        patient: 'Mike Johnson',
        time: '02:00 PM',
        status: 'pending',
        type: 'Check-up',
        priority: 'Normal'
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
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={priority === 'High' ? 'red' : 'blue'}>
          {priority}
        </Tag>
      ),
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

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'prescriptions') {
      setIsPrescriptionModalOpen(true);
    }
    // Add other navigation handlers as needed
  };

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
      key: 'patients',
      icon: <TeamOutlined />,
      label: 'Patients',
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
          onClick={handleMenuClick}
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
            <Tag color="green" style={{ marginRight: '8px' }}>
              👨‍⚕️ DOCTOR DASHBOARD
            </Tag>
            <Badge count={5} size="small">
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
              Doctor Dashboard
            </Title>
            <Text type="secondary">
              Welcome back, Dr. {user?.fullName?.split(' ')[1] || user?.fullName}
            </Text>
              </div>

          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Patients"
                  value={stats?.totalPatients || 0}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Today's Appointments"
                  value={stats?.todayAppointments || 0}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Completed Today"
                  value={stats?.completedAppointments || 0}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Pending Prescriptions"
                  value={stats?.pendingPrescriptions || 0}
                  prefix={<MedicineBoxOutlined />}
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
                onClick={() => setIsPrescriptionModalOpen(true)}
              >
                New Prescription
              </Button>
              <Button icon={<CalendarOutlined />} size="large">
                View Schedule
              </Button>
              <Button icon={<TeamOutlined />} size="large">
                Patient List
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
                  dataSource={todayAppointments}
                  pagination={false}
                  rowKey="id"
                  loading={appointmentsLoading}
                />
              </Card>
            </Col>

            {/* Quick Stats & Timeline */}
            <Col xs={24} lg={8}>
              <Card title="Today's Progress">
                <Progress 
                  percent={75} 
                  status="active" 
                  strokeColor="#52c41a"
                  style={{ marginBottom: '16px' }}
                />
                <Text type="secondary">
                  {stats?.completedAppointments || 0} of {stats?.todayAppointments || 0} appointments completed
                </Text>
              </Card>

              <Card title="Recent Activity" style={{ marginTop: '16px' }}>
                <Timeline
                  items={[
                    {
                      color: 'green',
                      children: <Text>Completed appointment with John Doe</Text>
                    },
                    {
                      color: 'blue',
                      children: <Text>Prescribed medication for Jane Smith</Text>
                    },
                    {
                      color: 'orange',
                      children: <Text>Upcoming appointment with Mike Johnson</Text>
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>

      {/* Prescription Form Modal */}
      <PrescriptionForm
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        doctorId={user?.id}
        hospitalId={doctorProfile?.hospitalId}
      />
    </Layout>
  );
}