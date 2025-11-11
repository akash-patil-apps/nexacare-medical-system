import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Menu,
  Progress,
  List,
  Modal,
  Spin
} from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  FileTextOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  LoginOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { SidebarProfile } from '../../components/dashboard/SidebarProfile';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function ReceptionistDashboard() {
  const { user, logout, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Get appointments with auto-refresh
  const { data: appointments = [], isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery({
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
      console.log('📋 Received appointments data:', data.length, 'appointments');
      // Transform API data to match table format
      const transformed = data.map((apt: any) => ({
        id: apt.id,
        patient: apt.patientName || 'Unknown Patient',
        doctor: apt.doctorName || 'Unknown Doctor',
        time: apt.appointmentTime || apt.timeSlot || 'N/A',
        status: apt.status || 'pending',
        department: apt.doctorSpecialty || 'General',
        phone: apt.patientPhone || 'N/A',
        date: apt.appointmentDate
      }));
      console.log('✅ Transformed appointments - statuses:', transformed.map((t: any) => `${t.patient}: ${t.status}`));
      return transformed;
    },
    enabled: !!user && user.role?.toUpperCase() === 'RECEPTIONIST',
    refetchInterval: 3000, // Refetch every 3 seconds for faster updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch when component mounts
  });

  // Calculate real stats from appointments data
  const stats = appointments ? {
    totalAppointments: appointments.length,
    todayAppointments: appointments.filter((apt: any) => {
      if (!apt.date) return false;
      const aptDate = new Date(apt.date);
      const today = new Date();
      return aptDate.toDateString() === today.toDateString();
    }).length,
    completedAppointments: appointments.filter((apt: any) => apt.status === 'completed').length,
    pendingAppointments: appointments.filter((apt: any) => apt.status === 'pending').length,
    walkInPatients: 0, // TODO: Add walk-in tracking
    totalPatients: new Set(appointments.map((apt: any) => apt.patient)).size
  } : {
    totalAppointments: 0,
    todayAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    walkInPatients: 0,
    totalPatients: 0
  };

  // Listen for appointment updates
  useEffect(() => {
    const handleStorageChange = () => {
      refetchAppointments();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refetchAppointments]);

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

  // NOW CHECK AUTHENTICATION AND ROLE (after all hooks)
  // Show loading while checking authentication
  if (isLoading) {
    console.log('⏳ Receptionist Dashboard - Auth loading...');
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('❌ Receptionist Dashboard - No user found, redirecting to login');
    return <Redirect to="/login" />;
  }
  
  console.log('✅ Receptionist Dashboard - User found:', user);

  // Redirect if user doesn't have RECEPTIONIST role
  // Check role case-insensitively
  const userRole = user.role?.toUpperCase();
  console.log('🔍 Receptionist Dashboard - User role:', userRole, 'Full user:', user);
  
  if (userRole !== 'RECEPTIONIST') {
    console.warn('⚠️ User does not have RECEPTIONIST role. Current role:', userRole);
    message.warning('You do not have access to this dashboard');
    // Redirect based on user role
    switch (userRole) {
      case 'PATIENT':
        return <Redirect to="/dashboard/patient" />;
      case 'DOCTOR':
        return <Redirect to="/dashboard/doctor" />;
      case 'HOSPITAL':
        return <Redirect to="/dashboard/hospital" />;
      case 'LAB':
        return <Redirect to="/dashboard/lab" />;
      default:
        return <Redirect to="/dashboard" />;
    }
  }
  
  console.log('✅ User has RECEPTIONIST role, rendering dashboard');

  // Handle confirm appointment (approve pending appointment)
  const handleConfirmAppointment = async (appointmentId: number) => {
    try {
      console.log(`🔄 Confirming appointment ${appointmentId}`);
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        message.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/appointments/${appointmentId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();
      console.log('📥 Check-in response:', responseData);

      if (response.ok) {
        message.success('Appointment confirmed successfully! It will now appear in doctor and patient dashboards.');
        // Trigger storage event to notify other tabs/windows
        window.localStorage.setItem('appointment-updated', Date.now().toString());
        // Also dispatch a custom event for same-window updates
        window.dispatchEvent(new CustomEvent('appointment-updated'));
        
        console.log('✅ Appointment confirmed! Starting cache invalidation...');
        
        // Invalidate ALL appointment queries - use more aggressive invalidation
        // This invalidates ANY query that starts with '/api/appointments'
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && (
              key.includes('/api/appointments') || 
              key.includes('patient-appointments') ||
              key.includes('doctor-appointments')
            );
          }
        });
        
        // Force immediate refetch of receptionist appointments
        await refetchAppointments();
        console.log('✅ Receptionist appointments refetched');
        
        // Trigger refetches after short delays to ensure all dashboards update
        setTimeout(() => {
          console.log('🔄 Refetching all appointment queries (500ms delay)...');
          // Refetch ALL appointment queries aggressively
          queryClient.refetchQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0];
              return typeof key === 'string' && (
                key.includes('/api/appointments') || 
                key.includes('patient-appointments') ||
                key.includes('doctor-appointments')
              );
            }
          });
          // Trigger another storage event to notify other tabs
          window.localStorage.setItem('appointment-updated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('appointment-updated'));
          console.log('✅ Storage event dispatched');
        }, 500);
        
        setTimeout(() => {
          console.log('🔄 Second refetch (2000ms delay)...');
          // Second refetch to ensure updates are visible
          queryClient.refetchQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0];
              return typeof key === 'string' && (
                key.includes('/api/appointments') || 
                key.includes('patient-appointments') ||
                key.includes('doctor-appointments')
              );
            }
          });
          window.localStorage.setItem('appointment-updated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('appointment-updated'));
          console.log('✅ Second storage event dispatched');
        }, 2000);
      } else {
        console.error('❌ Confirm appointment failed:', responseData);
        message.error(responseData.message || 'Failed to confirm appointment');
      }
    } catch (error) {
      console.error('❌ Error confirming appointment:', error);
      message.error('Failed to confirm appointment. Please try again.');
    }
  };

  // Handle check-in appointment (when patient arrives at hospital)
  const handleCheckIn = async (appointmentId: number) => {
    try {
      console.log(`🔄 Checking in patient for appointment ${appointmentId}`);
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        message.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/appointments/${appointmentId}/check-in`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();
      console.log('📥 Check-in response:', responseData);

      if (response.ok) {
        message.success('Patient checked in successfully! They can now proceed to doctor\'s cabin.');
        // Trigger storage event to notify other tabs/windows
        window.localStorage.setItem('appointment-updated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('appointment-updated'));
        
        // Invalidate appointment queries
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
        
        // Force immediate refetch
        await refetchAppointments();
        
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['/api/appointments/my'] });
          window.localStorage.setItem('appointment-updated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('appointment-updated'));
        }, 500);
      } else {
        console.error('❌ Check-in failed:', responseData);
        message.error(responseData.message || 'Failed to check in patient');
      }
    } catch (error) {
      console.error('❌ Error checking in patient:', error);
      message.error('Failed to check in patient. Please try again.');
    }
  };

  // Handle call patient
  const handleCall = (phone: string) => {
    if (phone && phone !== 'N/A') {
      window.location.href = `tel:${phone}`;
    } else {
      message.warning('Phone number not available');
    }
  };

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
          {/* Confirm button - for pending appointments */}
          {record.status === 'pending' && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleConfirmAppointment(record.id)}
            >
              Confirm
            </Button>
          )}
          
          {/* Check-in button - for confirmed appointments (when patient arrives) */}
          {record.status === 'confirmed' && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleCheckIn(record.id)}
            >
              Check-in
            </Button>
          )}
          
          {/* Status tag for completed appointments */}
          {record.status === 'completed' && (
            <Tag color="blue">Completed</Tag>
          )}
          
          {/* Call button - available for all statuses */}
          <Button 
            size="small"
            icon={<PhoneOutlined />}
            onClick={() => handleCall(record.phone)}
          >
            Call
          </Button>
        </Space>
      ),
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

  const siderWidth = collapsed ? 80 : 260;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
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
          style={{ border: 'none', flex: 1 }}
        />
        <SidebarProfile
          collapsed={collapsed}
          name={user?.fullName || 'Receptionist'}
          roleLabel="RECEPTIONIST"
          roleColor="#F97316"
          avatarIcon={<TeamOutlined />}
          onSettingsClick={() => message.info('Profile settings coming soon.')}
          onLogoutClick={logout}
        />
      </Sider>

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: '#f5f5f5',
          transition: 'margin-left 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            background: '#f5f5f5',
            height: '100vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '32px 24px', maxWidth: '1320px', margin: '0 auto', paddingBottom: 48 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
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
              <Button 
                icon={<UserAddOutlined />} 
                size="large"
                onClick={() => message.info('Walk-in registration feature coming soon')}
              >
                Walk-in Registration
              </Button>
              <Button 
                icon={<LoginOutlined />} 
                size="large"
                onClick={() => message.info('Use Check-in button in appointments table to check in patients')}
              >
                Patient Check-in
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
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}