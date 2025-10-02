import { useState, useEffect } from "react";
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
  Avatar,
  Menu,
  Dropdown,
  Badge,
  Input,
  Select,
  Modal,
  Statistic,
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
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

interface Appointment {
  id: number;
  doctorName: string;
  doctorSpecialty: string;
  hospitalName: string;
  appointmentDate: string;
  appointmentTime: string;
  timeSlot: string;
  reason: string;
  status: string;
  type: string;
  priority: string;
  symptoms: string;
  notes: string;
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export default function PatientAppointments() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load appointments from API
  const loadAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/appointments/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📅 Loaded appointments:', data);
        setAppointments(data);
      } else {
        console.error('Failed to load appointments');
        message.error('Failed to load appointments');
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      message.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Refresh appointments when returning from booking page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadAppointments();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const filteredAppointments = appointments.filter(appointment => {
    const matchesFilter = filter === 'all' || appointment.status === filter;
    const matchesSearch = searchTerm === '' || 
      appointment.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'green';
      case 'pending': return 'orange';
      case 'completed': return 'blue';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'red';
      case 'Medium': return 'orange';
      case 'Normal': return 'green';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Doctor',
      dataIndex: 'doctorName',
      key: 'doctorName',
      render: (text: string, record: Appointment) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.doctorSpecialty}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Hospital',
      dataIndex: 'hospitalName',
      key: 'hospitalName',
    },
    {
      title: 'Date & Time',
      key: 'datetime',
      render: (record: Appointment) => (
        <Space direction="vertical" size={0}>
          <Text>{record.appointmentDate}</Text>
          <Text type="secondary">{record.appointmentTime}</Text>
        </Space>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {priority}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Appointment) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>
            View
          </Button>
          {record.status === 'pending' && (
            <Button size="small" icon={<EditOutlined />}>
              Edit
            </Button>
          )}
          {record.status === 'pending' && (
            <Button size="small" danger icon={<DeleteOutlined />}>
              Cancel
            </Button>
          )}
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

  const stats = {
    total: appointments.length,
    upcoming: appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

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
          defaultSelectedKeys={['appointments']}
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
              My Appointments
            </Title>
            <Text type="secondary">
              Manage your medical appointments
            </Text>
          </div>

          {/* Statistics */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Total Appointments"
                  value={stats.total}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Upcoming"
                  value={stats.upcoming}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Completed"
                  value={stats.completed}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Cancelled"
                  value={stats.cancelled}
                  prefix={<DeleteOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Filters and Search */}
          <Card style={{ marginBottom: '24px' }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="Search appointments..."
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  value={filter}
                  onChange={setFilter}
                  style={{ width: '100%' }}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="all">All Appointments</Option>
                  <Option value="confirmed">Confirmed</Option>
                  <Option value="pending">Pending</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="cancelled">Cancelled</Option>
                </Select>
              </Col>
              <Col xs={24} sm={24} md={8}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setLocation('/book-appointment')}
                  style={{ width: '100%' }}
                >
                  Book New Appointment
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Appointments Table */}
          <Card title="Appointments">
            <Table
              columns={columns}
              dataSource={filteredAppointments}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} appointments`,
              }}
            />
          </Card>

        </Content>
      </Layout>
    </Layout>
  );
}