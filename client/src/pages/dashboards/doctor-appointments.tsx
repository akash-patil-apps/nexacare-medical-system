import { useState, useEffect } from "react";
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
  Input,
  Select,
  Modal,
  Divider,
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
  TeamOutlined,
  BankOutlined,
  UserAddOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  PhoneOutlined,
  VideoCameraOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { formatDate } from '../../lib/utils';
import { TopHeader } from '../../components/layout/TopHeader';
import { useResponsive } from '../../hooks/use-responsive';
import { useLocation } from 'wouter';
import { Drawer } from 'antd';
import { MenuUnfoldOutlined } from '@ant-design/icons';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function DoctorAppointments() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, completed
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get notifications for TopHeader
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications/me'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/notifications/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 15000,
  });
  
  const siderWidth = isMobile ? 0 : 80; // Narrow sidebar width matching PatientSidebar
  
  // Sidebar content component - matching doctor dashboard
  const SidebarContent = ({ onMenuClick }: { onMenuClick?: () => void }) => {
    const handleMenuClick = (key: string) => {
      if (onMenuClick) onMenuClick();
      switch (key) {
        case 'dashboard':
          setLocation('/dashboard/doctor');
          break;
        case 'appointments':
          setLocation('/dashboard/doctor/appointments');
          break;
        case 'patients':
          message.info('Patients page coming soon.');
          break;
        case 'prescriptions':
          setLocation('/dashboard/doctor/prescriptions');
          break;
        case 'reports':
          message.info('Lab Reports page coming soon.');
          break;
        case 'ipd':
          message.info('IPD Patients page coming soon.');
          break;
        case 'availability':
          message.info('Availability page coming soon.');
          break;
        default:
          break;
      }
    };

    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        background: '#fff',
        width: '80px',
        alignItems: 'center',
        padding: '16px 0',
        gap: '12px',
        borderRight: '1px solid #E5E7EB',
      }}>
        <Button
          type="text"
          icon={<UserOutlined style={{ fontSize: '20px', color: '#1A8FE3' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#E3F2FF',
            borderRadius: '8px',
          }}
          onClick={() => message.info('Profile coming soon.')}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, alignItems: 'center' }}>
          <Button
            type="text"
            icon={<UserOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('dashboard')}
          />
          <Button
            type="text"
            icon={<CalendarOutlined style={{ fontSize: '20px', color: '#1A8FE3' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#E3F2FF',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('appointments')}
          />
          <Button
            type="text"
            icon={<TeamOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('patients')}
          />
          <Button
            type="text"
            icon={<MedicineBoxOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('prescriptions')}
          />
          <Button
            type="text"
            icon={<FileTextOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('reports')}
          />
          <Button
            type="text"
            icon={<TeamOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('ipd')}
          />
          <Button
            type="text"
            icon={<SettingOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('availability')}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => message.info('Notifications coming soon.')}
          />
          <Button
            type="text"
            icon={<SettingOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => message.info('Settings coming soon.')}
          />
        </div>
      </div>
    );
  };

  // Get appointments from API with auto-refresh
  const { data: appointmentsData = [], isLoading: loading, refetch: refetchAppointments } = useQuery({
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
      // Transform API data to match expected format
      return data.map((apt: any) => ({
        id: apt.id,
        patientName: apt.patientName || 'Unknown Patient',
        patientAge: 0, // Not available in API response
        patientGender: 'Unknown', // Not available in API response
        appointmentDate: apt.appointmentDate || new Date().toISOString(),
        appointmentTime: apt.appointmentTime || apt.timeSlot?.split('-')[0] || 'N/A',
        timeSlot: apt.timeSlot || `${apt.appointmentTime}-${apt.appointmentTime}`,
        reason: apt.reason || 'Consultation',
        status: apt.status || 'pending',
        type: apt.type || 'online',
        priority: apt.priority || 'normal',
        symptoms: apt.symptoms || '',
        notes: apt.notes || '',
        medicalHistory: '', // Not available in API response
        allergies: '', // Not available in API response
        createdAt: apt.createdAt || new Date().toISOString(),
        completedAt: apt.completedAt
      }));
    },
    refetchInterval: 3000, // Refetch every 3 seconds for faster updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Listen for appointment updates from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appointment-updated') {
        refetchAppointments();
      }
    };
    
    // Also listen for custom events (same-window updates)
    const handleCustomEvent = () => {
      refetchAppointments();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('appointment-updated', handleCustomEvent);
    
    // Also check periodically for updates
    const interval = setInterval(() => {
      const lastUpdate = window.localStorage.getItem('appointment-updated');
      if (lastUpdate) {
        const updateTime = parseInt(lastUpdate);
        const now = Date.now();
        // If update happened within last 5 seconds, refetch
        if (now - updateTime < 5000) {
          refetchAppointments();
        }
      }
    }, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('appointment-updated', handleCustomEvent);
      clearInterval(interval);
    };
  }, [refetchAppointments]);

  const appointments = appointmentsData;

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
      icon: <FileTextOutlined />,
      label: 'Prescriptions',
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#1890ff' }} />;
      case 'cancelled':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ExclamationCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getStatusTag = (status: string) => {
    const colorMap = {
      confirmed: 'success',
      pending: 'warning',
      completed: 'processing',
      cancelled: 'error'
    };
    
    return (
      <Tag color={colorMap[status as keyof typeof colorMap] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Tag>
    );
  };

  const getPriorityTag = (priority: string) => {
    const colorMap = {
      high: 'red',
      normal: 'green',
      low: 'default'
    };
    
    return (
      <Tag color={colorMap[priority as keyof typeof colorMap] || 'default'}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
      </Tag>
    );
  };

  const filteredAppointments = appointments.filter((appointment: any) => {
    const matchesFilter = filter === 'all' || appointment.status === filter;
    const matchesSearch = appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleConfirmAppointment = async (appointmentId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/appointments/${appointmentId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        message.success('Appointment confirmed successfully');
        // Trigger storage event to notify other tabs
        window.localStorage.setItem('appointment-updated', Date.now().toString());
        // Refetch appointments
        refetchAppointments();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to confirm appointment');
      }
    } catch (error) {
      console.error('Error confirming appointment:', error);
      message.error('Failed to confirm appointment');
    }
  };

  const handleCompleteAppointment = async (appointmentId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/appointments/${appointmentId}/complete`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        message.success('Appointment completed successfully');
        // Trigger storage event to notify other tabs
        window.localStorage.setItem('appointment-updated', Date.now().toString());
        // Refetch appointments
        refetchAppointments();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to complete appointment');
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
      message.error('Failed to complete appointment');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#F5F7FF' }}>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
      <Sider 
          width={80}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            background: '#fff',
            boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            borderRight: '1px solid #E5E7EB',
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
          styles={{ body: { padding: 0 } }}
          width={260}
        >
          <SidebarContent onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: '#F5F7FF',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        {/* TopHeader - Matching Patient Dashboard Design */}
        <TopHeader
          userName={user?.fullName || 'Doctor'}
          userRole="Doctor"
          userId={(() => {
            if (user?.id) {
              const year = new Date().getFullYear();
              const idNum = String(user.id).padStart(3, '0');
              return `DOC-${year}-${idNum}`;
            }
            return 'DOC-2024-001';
          })()}
          userInitials={(() => {
            if (user?.fullName) {
              const names = user.fullName.split(' ');
              if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
              }
              return user.fullName.substring(0, 2).toUpperCase();
            }
            return 'DR';
          })()}
          notificationCount={notifications.filter((n: any) => !n.isRead).length}
        />

        <Content
          style={{
            background: '#F5F7FF',
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
            // Responsive padding - reduced to save side space
            padding: isMobile 
              ? '12px 12px 16px'
              : isTablet 
                ? '12px 16px 20px'
                : '12px 16px 20px',
            margin: 0,
            width: '100%',
          }}
        >
          {/* Mobile Menu Button */}
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 16 }}>
          <Button
            type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{ fontSize: '18px' }}
              />
            </div>
          )}

          <div style={{ paddingBottom: 24 }}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, border: '1px solid #E5E7EB' }}>
            <Title level={2} style={{ margin: '0 0 16px 0', color: '#1890ff' }}>
              <CalendarOutlined style={{ marginRight: '8px' }} />
              My Appointments
            </Title>
            <Text type="secondary">Manage your patient appointments</Text>
          </div>

          {/* Filters and Search */}
          <Card style={{ marginBottom: '24px' }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={16}>
                <Search
                  placeholder="Search patients or appointments..."
                  allowClear
                  style={{ width: '100%' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space wrap>
                  <Button 
                    type={filter === 'all' ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setFilter('all')}
                  >
                    All
                  </Button>
                  <Button 
                    type={filter === 'pending' ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setFilter('pending')}
                  >
                    Pending
                  </Button>
                  <Button 
                    type={filter === 'confirmed' ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setFilter('confirmed')}
                  >
                    Confirmed
                  </Button>
                  <Button 
                    type={filter === 'completed' ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setFilter('completed')}
                  >
                    Completed
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Appointments List */}
          {loading ? (
            <div>
              {[1, 2, 3].map((i) => (
                <Card key={i} loading style={{ marginBottom: '16px' }}>
                  <Card.Meta
                    avatar={<Avatar />}
                    title="Loading..."
                    description="Loading appointment details..."
                  />
                </Card>
              ))}
            </div>
          ) : filteredAppointments.length > 0 ? (
            <div>
              {filteredAppointments.map((appointment: any) => (
                <Card 
                  key={appointment.id} 
                  style={{ marginBottom: '16px' }}
                  hoverable
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                      <Avatar 
                        size={48} 
                        style={{ backgroundColor: '#52c41a', color: '#fff' }}
                      >
                        {appointment.patientName?.charAt(0) || "P"}
                      </Avatar>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Title level={4} style={{ margin: 0 }}>
                            {appointment.patientName}
                          </Title>
                          {getStatusIcon(appointment.status)}
                          {getPriorityTag(appointment.priority)}
                        </div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>
                          {appointment.patientAge} years old • {appointment.patientGender}
                        </Text>
                        <Text style={{ display: 'block', marginBottom: '8px' }}>
                          {appointment.reason}
                        </Text>
                        <Space size="large">
                          <Space>
                            <CalendarOutlined />
                            <Text type="secondary">
                              {formatDate(appointment.appointmentDate)}
                            </Text>
                          </Space>
                          <Space>
                            <ClockCircleOutlined />
                            <Text type="secondary">
                              {appointment.appointmentTime}
                            </Text>
                          </Space>
                          <Space>
                            <VideoCameraOutlined />
                            <Text type="secondary">
                              {appointment.type}
                            </Text>
                          </Space>
                        </Space>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      {getStatusTag(appointment.status)}
                      <Space>
                        {appointment.status === 'pending' && (
                          <Button 
                            type="primary"
                            size="small"
                            onClick={() => handleConfirmAppointment(appointment.id)}
                          >
                            Confirm
                          </Button>
                        )}
                        {appointment.status === 'confirmed' && (
                          <>
                            <Button 
                              size="small" 
                              icon={<PhoneOutlined />}
                            >
                              Start Call
                            </Button>
                            <Button 
                              type="primary"
                              size="small"
                              onClick={() => handleCompleteAppointment(appointment.id)}
                            >
                              Complete
                            </Button>
                          </>
                        )}
                        <Button size="small">
                          View Details
                        </Button>
                      </Space>
                    </div>
                  </div>
                  
                  {appointment.symptoms && (
                    <div style={{ 
                      marginTop: '16px', 
                      padding: '12px', 
                      background: '#fffbe6', 
                      borderRadius: '6px',
                      border: '1px solid #ffe58f'
                    }}>
                      <Text strong>Symptoms: </Text>
                      <Text>{appointment.symptoms}</Text>
                    </div>
                  )}
                  
                  {appointment.medicalHistory && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '12px', 
                      background: '#e6f7ff', 
                      borderRadius: '6px',
                      border: '1px solid #91d5ff'
                    }}>
                      <Text strong>Medical History: </Text>
                      <Text>{appointment.medicalHistory}</Text>
                    </div>
                  )}
                  
                  {appointment.allergies && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '12px', 
                      background: '#fff2f0', 
                      borderRadius: '6px',
                      border: '1px solid #ffccc7'
                    }}>
                      <Text strong>Allergies: </Text>
                      <Text>{appointment.allergies}</Text>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <CalendarOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
                <Title level={3} style={{ color: '#8c8c8c', marginBottom: '8px' }}>
                  No appointments found
                </Title>
                <Text type="secondary">
                  {searchTerm || filter !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'You don\'t have any appointments scheduled'
                  }
                </Text>
              </div>
            </Card>
          )}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
