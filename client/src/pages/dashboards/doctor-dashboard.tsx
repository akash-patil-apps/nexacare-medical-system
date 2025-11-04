import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
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
  message,
  Spin
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
  const { user, logout, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Get doctor profile to access hospitalId
  const { data: doctorProfile } = useQuery({
    queryKey: ['/api/doctors/profile'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/doctors/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch doctor profile');
      return response.json();
    },
    enabled: !!user && user.role?.toUpperCase() === 'DOCTOR',
  });

  // Get doctor appointments with auto-refresh
  const { data: allAppointments = [], isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery({
    queryKey: ['/api/appointments/my'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/appointments/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch appointments:', response.status, errorText);
        throw new Error('Failed to fetch appointments');
      }
      const data = await response.json();
      console.log('📅 Doctor appointments loaded from API:', data.length, 'appointments');
      console.log('📅 Raw appointment data:', JSON.stringify(data, null, 2));
      
      // Transform API data to match table format
      const transformed = data.map((apt: any) => {
        // Handle different date formats
        let appointmentDate = apt.appointmentDate;
        if (typeof appointmentDate === 'string') {
          // Try to parse the date string
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
          time: apt.appointmentTime || apt.timeSlot || 'N/A',
          status: apt.status || 'pending',
          type: apt.type || 'Consultation',
          priority: apt.priority || 'Normal',
          date: apt.appointmentDate, // Keep original for filtering
          dateObj: appointmentDate // Parsed date object
        };
      });
      
      console.log('✅ Transformed appointments:', transformed);
      return transformed;
    },
    enabled: !!user && user.role?.toUpperCase() === 'DOCTOR',
    refetchInterval: 3000, // Refetch every 3 seconds for faster updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch when component mounts
  });

  // Filter appointments for today's date
  const todayAppointments = allAppointments.filter((apt: any) => {
    if (!apt.date && !apt.dateObj) {
      console.warn(`⚠️ Appointment ${apt.id} has no date`);
      return false;
    }
    
    try {
      const appointmentDate = apt.dateObj || new Date(apt.date);
      if (isNaN(appointmentDate.getTime())) {
        console.warn(`⚠️ Invalid date for appointment ${apt.id}:`, apt.date);
        return false;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      appointmentDate.setHours(0, 0, 0, 0);
      
      const isToday = appointmentDate.getTime() === today.getTime();
      
      console.log(`📅 Checking appointment ${apt.id}:`, {
        originalDate: apt.date,
        appointmentDate: appointmentDate.toDateString(),
        today: today.toDateString(),
        isToday,
        status: apt.status
      });
      
      return isToday;
    } catch (error) {
      console.error(`❌ Error checking date for appointment ${apt.id}:`, error);
      return false;
    }
  });
  
  // Show ALL confirmed/completed appointments (not just today's)
  // This ensures doctors see all their confirmed appointments regardless of date
  const appointmentsToShow = allAppointments
    .filter((apt: any) => 
      apt.status === 'confirmed' || apt.status === 'completed' || apt.status === 'cancelled'
    )
    .sort((a: any, b: any) => {
      // Sort by date (most recent first)
      const dateA = a.dateObj || new Date(a.date);
      const dateB = b.dateObj || new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 20); // Show up to 20 most recent confirmed/completed appointments
  
  console.log('📅 All appointments from API:', allAppointments.length);
  console.log('📅 Today appointments:', todayAppointments.length);
  console.log('📅 Confirmed/completed appointments to show:', appointmentsToShow.length);
  console.log('📅 Appointments breakdown by status:', {
    confirmed: allAppointments.filter((a: any) => a.status === 'confirmed').length,
    completed: allAppointments.filter((a: any) => a.status === 'completed').length,
    pending: allAppointments.filter((a: any) => a.status === 'pending').length,
    cancelled: allAppointments.filter((a: any) => a.status === 'cancelled').length
  });

  // Calculate real stats from appointments data (AFTER appointments are loaded)
  const stats = allAppointments.length > 0 ? {
    totalPatients: new Set(allAppointments.map((apt: any) => apt.patient)).size,
    todayAppointments: todayAppointments.length || appointmentsToShow.length,
    completedAppointments: allAppointments.filter((apt: any) => apt.status === 'completed').length,
    pendingPrescriptions: 0, // TODO: Add prescriptions API
    totalPrescriptions: 0 // TODO: Add prescriptions API
  } : {
    totalPatients: 0,
    todayAppointments: 0,
    completedAppointments: 0,
    pendingPrescriptions: 0,
    totalPrescriptions: 0
  };

  // Listen for appointment updates from other tabs/windows
  useEffect(() => {
    console.log('👂 Doctor dashboard: Setting up appointment update listeners...');
    
    let lastProcessedUpdate = 0;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appointment-updated') {
        const updateTime = parseInt(e.newValue || '0');
        // Prevent duplicate processing
        if (updateTime > lastProcessedUpdate) {
          lastProcessedUpdate = updateTime;
          console.log('🔄 Doctor dashboard: Storage event detected, refetching appointments...', {
            updateTime,
            timeSinceUpdate: Date.now() - updateTime
          });
          refetchAppointments();
        }
      }
    };
    
    // Also listen for custom events (same-window updates)
    const handleCustomEvent = () => {
      const updateTime = Date.now();
      if (updateTime > lastProcessedUpdate) {
        lastProcessedUpdate = updateTime;
        console.log('🔄 Doctor dashboard: Custom event detected, refetching appointments...');
        refetchAppointments();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('appointment-updated', handleCustomEvent);
    
    // Also check periodically for updates (more aggressive polling)
    const interval = setInterval(() => {
      const lastUpdate = window.localStorage.getItem('appointment-updated');
      if (lastUpdate) {
        const updateTime = parseInt(lastUpdate);
        const now = Date.now();
        // If update happened within last 10 seconds, refetch
        if (updateTime > lastProcessedUpdate && now - updateTime < 10000) {
          lastProcessedUpdate = updateTime;
          console.log('🔄 Doctor dashboard: Polling detected update, invalidating and refetching...', {
            updateTime,
            timeSinceUpdate: now - updateTime
          });
          // Invalidate cache and refetch
          queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
          refetchAppointments();
        }
      }
    }, 1000); // Check every 1 second instead of 2
    
    console.log('✅ Doctor dashboard: Update listeners set up');
    
    return () => {
      console.log('🧹 Doctor dashboard: Cleaning up update listeners');
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('appointment-updated', handleCustomEvent);
      clearInterval(interval);
    };
  }, [refetchAppointments]);

  // NOW CHECK AUTHENTICATION AND ROLE (after all hooks)
  // Show loading while checking authentication
  if (isLoading) {
    console.log('⏳ Doctor Dashboard - Auth loading...');
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('❌ Doctor Dashboard - No user found, redirecting to login');
    return <Redirect to="/login" />;
  }
  
  console.log('✅ Doctor Dashboard - User found:', user);

  // Redirect if user doesn't have DOCTOR role
  // Check role case-insensitively
  const userRole = user.role?.toUpperCase();
  console.log('🔍 Doctor Dashboard - User role:', userRole, 'Full user:', user);
  
  if (userRole !== 'DOCTOR') {
    console.warn('⚠️ User does not have DOCTOR role. Current role:', userRole);
    message.warning('You do not have access to this dashboard');
    // Redirect based on user role
    switch (userRole) {
      case 'PATIENT':
        return <Redirect to="/dashboard/patient" />;
      case 'RECEPTIONIST':
        return <Redirect to="/dashboard/receptionist" />;
      case 'HOSPITAL':
        return <Redirect to="/dashboard/hospital" />;
      case 'LAB':
        return <Redirect to="/dashboard/lab" />;
      default:
        return <Redirect to="/dashboard" />;
    }
  }
  
  console.log('✅ User has DOCTOR role, rendering dashboard');

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
              <Button 
                icon={<CalendarOutlined />} 
                size="large"
                onClick={() => window.location.href = '/dashboard/doctor/appointments'}
              >
                View Schedule
              </Button>
              <Button 
                icon={<TeamOutlined />} 
                size="large"
                onClick={() => message.info('Patient list feature coming soon')}
              >
                Patient List
        </Button>
            </Space>
          </Card>

          <Row gutter={[16, 16]}>
            {/* Today's Appointments */}
            <Col xs={24} lg={16}>
              <Card 
                title={`Appointments (${appointmentsToShow.length} confirmed/completed)`}
                extra={<Button type="link" onClick={() => window.location.href = '/dashboard/doctor/appointments'}>View All</Button>}
              >
                {appointmentsToShow.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Text type="secondary">
                      {allAppointments.length === 0 
                        ? 'No appointments found. Waiting for receptionist to confirm appointments.'
                        : `No confirmed appointments yet. ${allAppointments.filter((a: any) => a.status === 'pending').length} pending confirmation.`}
                    </Text>
                  </div>
                ) : (
                <Table
                  columns={appointmentColumns}
                    dataSource={appointmentsToShow}
                  pagination={false}
                  rowKey="id"
                  loading={appointmentsLoading}
                />
                )}
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