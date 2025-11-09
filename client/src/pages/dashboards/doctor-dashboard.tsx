import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
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
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import PrescriptionForm from '../../components/prescription-form';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const doctorTheme = {
  primary: '#1D4ED8',
  highlight: '#E0E7FF',
  accent: '#7C3AED',
};

export default function DoctorDashboard() {
  const { user, logout, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | undefined>(undefined);

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
          patientId: apt.patientId,
          patient: apt.patientName || 'Unknown Patient',
          patientMobile: apt.patientMobile,
          time: apt.appointmentTime || apt.timeSlot || 'N/A',
          status: apt.status || 'pending',
          type: apt.type || 'Consultation',
          priority: apt.priority || 'Normal',
          date: apt.appointmentDate,
          dateObj: appointmentDate,
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
  const todaysPendingAppointments = allAppointments.filter((apt: any) => {
    if (!apt.date && !apt.dateObj) return false;
    const appointmentDate = apt.dateObj || new Date(apt.date);
    const today = new Date();
    appointmentDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const isToday = appointmentDate.getTime() === today.getTime();
    const status = (apt.status || '').toLowerCase();
    const isPendingStatus = !['completed', 'cancelled', 'attended'].includes(status);
    return isToday && isPendingStatus;
  });

  const todaysPendingPatientsMap = new Map<number, { id: number; fullName: string; mobileNumber?: string; appointmentId: number }>();
  todaysPendingAppointments.forEach((apt: any) => {
    if (apt.patientId && !todaysPendingPatientsMap.has(apt.patientId)) {
      todaysPendingPatientsMap.set(apt.patientId, {
        id: apt.patientId,
        fullName: apt.patient,
        mobileNumber: apt.patientMobile,
        appointmentId: apt.id,
      });
    }
  });
  const todaysPendingPatientsRaw = Array.from(todaysPendingPatientsMap.values());
  const todaysPendingPatients = todaysPendingPatientsRaw.map(({ id, fullName, mobileNumber }) => ({
    id,
    fullName,
    mobileNumber,
  }));
  const todaysAppointmentIdMap: Record<number, number | undefined> = {};
  todaysPendingPatientsRaw.forEach((patient) => {
    if (patient.appointmentId) {
      todaysAppointmentIdMap[patient.id] = patient.appointmentId;
    }
  });

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

  const completionPercent = stats.todayAppointments
    ? Math.round((stats.completedAppointments / (stats.todayAppointments || 1)) * 100)
    : 0;

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
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="link"
          onClick={() => handleOpenPrescriptionModal(record)}
          disabled={
            !record.patientId ||
            ['completed', 'cancelled', 'attended'].includes((record.status || '').toLowerCase())
          }
        >
          Add Prescription
        </Button>
      ),
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'prescriptions') {
      handleOpenPrescriptionModal();
    }
    // Add other navigation handlers as needed
  };

  const handleQuickAction = (key: 'consult' | 'prescription' | 'availability' | 'labs') => {
    switch (key) {
      case 'consult':
        message.info('Consultation room launching soon.');
        break;
      case 'prescription':
        handleOpenPrescriptionModal();
        break;
      case 'availability':
        message.info('Availability management coming soon.');
        break;
      case 'labs':
        message.info('Lab queue coming soon.');
        break;
      default:
        break;
    }
  };

  const handleOpenPrescriptionModal = (appointment?: any) => {
    if (appointment?.patientId) {
      setSelectedPatientId(appointment.patientId);
      setSelectedAppointmentId(appointment.id);
    } else {
      setSelectedPatientId(undefined);
      setSelectedAppointmentId(undefined);
    }
    setIsPrescriptionModalOpen(true);
  };

  const handleClosePrescriptionModal = () => {
    setIsPrescriptionModalOpen(false);
    setSelectedPatientId(undefined);
    setSelectedAppointmentId(undefined);
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
    <Layout style={{ minHeight: '100vh', background: doctorTheme.highlight }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: '#ffffff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            borderBottom: '1px solid #eef2ff',
          }}
        >
          <MedicineBoxOutlined style={{ fontSize: 24, color: doctorTheme.primary }} />
          {!collapsed && (
            <Title level={4} style={{ margin: '8px 0 0', color: doctorTheme.primary }}>
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
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid #eef2ff',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Avatar size={collapsed ? 48 : 40} icon={<UserOutlined />} />
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text strong style={{ lineHeight: 1.2 }}>{user?.fullName}</Text>
              <Tag color="blue" style={{ width: 'fit-content', marginTop: 4 }}>DOCTOR</Tag>
            </div>
          )}
          {!collapsed && (
            <Space>
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={() => message.info('Profile settings coming soon.')}
              />
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={logout}
              />
            </Space>
          )}
        </div>
      </Sider>

      <Layout>
        <Content style={{ background: doctorTheme.highlight, minHeight: '100vh', overflowY: 'auto' }}>
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
                <Text type="secondary">Home / Doctor Dashboard</Text>
                <Title level={2} style={{ margin: '4px 0 0' }}>Doctor Workspace</Title>
              </div>
              <Button type="text" onClick={() => setCollapsed(!collapsed)} style={{ fontSize: 16 }}>
                {collapsed ? '☰' : '✕'}
              </Button>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} md={6}>
                <KpiCard
                  label="Today's Appointments"
                  value={stats.todayAppointments || 0}
                  icon={<CalendarOutlined style={{ color: doctorTheme.primary }} />}
                  trendLabel={`${appointmentsToShow.length} confirmed`}
                  trendType="positive"
                  onView={() => setLocation('/dashboard/doctor/appointments')}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <KpiCard
                  label="Patients Under Care"
                  value={stats.totalPatients || 0}
                  icon={<TeamOutlined style={{ color: doctorTheme.accent }} />}
                  trendLabel="Updated"
                  trendType="neutral"
                  onView={() => message.info('Patient list coming soon')}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <KpiCard
                  label="Completed Today"
                  value={stats.completedAppointments || 0}
                  icon={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
                  trendLabel="Live"
                  trendType="positive"
                  onView={() => setLocation('/dashboard/doctor/appointments')}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <KpiCard
                  label="Pending Prescriptions"
                  value={stats.pendingPrescriptions || 0}
                  icon={<MedicineBoxOutlined style={{ color: '#f97316' }} />}
                  trendLabel="Action needed"
                  trendType="negative"
                  onView={() => setIsPrescriptionModalOpen(true)}
                />
              </Col>
            </Row>

            <Card bordered={false} style={{ marginBottom: 24, borderRadius: 16 }} bodyStyle={{ padding: 20 }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Start Consultation"
                    icon={<CalendarOutlined />}
                    onClick={() => handleQuickAction('consult')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Write Prescription"
                    icon={<MedicineBoxOutlined />}
                    onClick={() => handleQuickAction('prescription')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Update Availability"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleQuickAction('availability')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Review Lab Queue"
                    icon={<FileTextOutlined />}
                    onClick={() => handleQuickAction('labs')}
                  />
                </Col>
              </Row>
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Card
                  bordered={false}
                  style={{ borderRadius: 16 }}
                  title="Today's Schedule"
                  extra={<Button type="link" onClick={() => setLocation('/dashboard/doctor/appointments')}>View All</Button>}
                >
                  {appointmentsToShow.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
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
                      size="middle"
                    />
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Card bordered={false} style={{ borderRadius: 16 }}>
                    <Title level={5} style={{ marginBottom: 12 }}>Shift Overview</Title>
                    <Progress
                      percent={completionPercent}
                      status="active"
                      strokeColor={doctorTheme.primary}
                      style={{ marginBottom: 12 }}
                    />
                    <Space direction="vertical" size={4}>
                      <Text type="secondary">{stats.completedAppointments || 0} of {stats.todayAppointments || 0} completed</Text>
                      <Text type="secondary">Next break at 3:00 PM</Text>
                    </Space>
                  </Card>

                  <Card bordered={false} style={{ borderRadius: 16 }}>
                    <Title level={5} style={{ marginBottom: 12 }}>Recent Activity</Title>
                    <Timeline
                      items={[
                        {
                          color: doctorTheme.primary,
                          children: <Text>Completed consultation with John Doe</Text>,
                        },
                        {
                          color: doctorTheme.accent,
                          children: <Text>Prescribed medication for Jane Smith</Text>,
                        },
                        {
                          color: '#f97316',
                          children: <Text>Awaiting lab results for Mike Johnson</Text>,
                        },
                      ]}
                    />
                  </Card>
                </Space>
              </Col>
            </Row>
          </div>
        </Content>
      </Layout>

      {/* Prescription Form Modal */}
      <PrescriptionForm
        isOpen={isPrescriptionModalOpen}
        onClose={handleClosePrescriptionModal}
        doctorId={user?.id}
        hospitalId={doctorProfile?.hospitalId}
        patientId={selectedPatientId}
        appointmentId={selectedAppointmentId}
        patientsOverride={todaysPendingPatients}
        hideHospitalSelect
        appointmentIdMap={todaysAppointmentIdMap}
      />
    </Layout>
  );
}