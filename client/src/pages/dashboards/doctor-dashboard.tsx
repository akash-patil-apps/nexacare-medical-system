import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
  Menu,
  message,
  Spin,
  Tabs,
  Drawer
} from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  MedicineBoxOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  ExperimentOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import PrescriptionForm from '../../components/prescription-form';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import LabRequestModal from '../../components/modals/lab-request-modal';
import dayjs from 'dayjs';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const doctorTheme = {
  primary: '#1D4ED8',
  highlight: '#E0E7FF',
  accent: '#7C3AED',
  background: '#F3F4F6', // Match patient/receptionist background
};

export default function DoctorDashboard() {
  const { user, logout, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | undefined>(undefined);
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<string>('today');
  const [isLabRequestModalOpen, setIsLabRequestModalOpen] = useState(false);


  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Get doctor profile to access hospitalId and hospitalName (from database join)
  const { data: doctorProfile } = useQuery({
    queryKey: ['/api/doctors/profile'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/doctors/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch doctor profile:', response.status, errorText);
        throw new Error(`Failed to fetch doctor profile: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Doctor profile fetched:', { id: data.id, hospitalId: data.hospitalId, hospitalName: data.hospitalName });
      return data;
    },
    enabled: !!user && user.role?.toUpperCase() === 'DOCTOR',
  });

  // Get hospital name directly from doctor profile (includes hospitalName from database join)
  // This matches how receptionist dashboard fetches hospital name - directly from profile
  const hospitalName = useMemo(() => {
    if (doctorProfile?.hospitalName) {
      console.log('✅ Hospital name from doctor profile:', doctorProfile.hospitalName);
      return doctorProfile.hospitalName;
    }
    console.log('⚠️ No hospital name in doctor profile. Doctor profile:', doctorProfile);
    return null;
  }, [doctorProfile?.hospitalName]);

  // Get lab reports for doctor
  const { data: labReports = [], isLoading: labReportsLoading } = useQuery({
    queryKey: ['/api/labs/doctor/reports'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/labs/doctor/reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.log('⚠️ Lab reports API not ready yet');
        return [];
      }
      return response.json();
    },
    enabled: !!user && user.role?.toUpperCase() === 'DOCTOR',
    refetchInterval: 10000,
  });

  // Get prescriptions for doctor
  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['/api/prescriptions/doctor'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/prescriptions/doctor', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.log('⚠️ Prescriptions API not ready yet');
        return [];
      }
      return response.json();
    },
    enabled: !!user && user.role?.toUpperCase() === 'DOCTOR',
    refetchInterval: 10000,
  });

  // Get notifications for doctor
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/notifications/me'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/notifications/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.log('⚠️ Notifications API not ready yet');
        return [];
      }
      return response.json();
    },
    enabled: !!user && user.role?.toUpperCase() === 'DOCTOR',
    refetchInterval: 15000,
  });

  // Mark notification as read
  const markNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to mark notification as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] });
    },
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
      console.log('🏥 Checking for hospitalName in appointments:', data.map((apt: any) => ({ id: apt.id, hospitalName: apt.hospitalName })));
      
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
          hospitalName: apt.hospitalName || null, // Include hospital name from API
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


  // Filter confirmed appointments that are today or in the future (by date only - simpler logic)
  const confirmedFutureAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // Start of today
    
    console.log('🔍 Filtering appointments. Total:', allAppointments.length);
    console.log('🔍 Current date/time:', now.toISOString());
    
    const filtered = allAppointments
      .filter((apt: any) => {
        // Only show confirmed appointments
        if (apt.status !== 'confirmed') {
          console.log(`⏭️  Skipping appointment ${apt.id} - status: ${apt.status}`);
          return false;
        }
        
        // Check if appointment has valid date
        if (!apt.date && !apt.dateObj) {
          console.log(`⏭️  Skipping appointment ${apt.id} - no date`);
          return false;
        }
        
        try {
          // Get appointment date (ignore time for comparison)
          const appointmentDate = apt.dateObj || new Date(apt.date);
          if (isNaN(appointmentDate.getTime())) {
            console.log(`⏭️  Skipping appointment ${apt.id} - invalid date:`, apt.date);
            return false;
          }
          
          // Set to start of day for comparison
          const appointmentDay = new Date(appointmentDate);
          appointmentDay.setHours(0, 0, 0, 0);
          
          // Include appointments that are today or in the future (by date only)
          const isFutureOrToday = appointmentDay >= today;
          
          console.log(`📅 Appointment ${apt.id}: date=${appointmentDay.toISOString()}, today=${today.toISOString()}, include=${isFutureOrToday}`);
          
          return isFutureOrToday;
        } catch (error) {
          console.error(`❌ Error checking date for appointment ${apt.id}:`, error, apt);
          return false;
        }
      })
      .sort((a: any, b: any) => {
        // Sort by date and time (earliest first)
        const dateTimeA = a.dateObj || new Date(a.date);
        const dateTimeB = b.dateObj || new Date(b.date);
        return dateTimeA.getTime() - dateTimeB.getTime();
      });
    
    console.log(`✅ Filtered to ${filtered.length} confirmed future appointments`);
    return filtered;
  }, [allAppointments]);

  // Group appointments by date for tabs
  const appointmentsByDate = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const groups: Record<string, any[]> = {
      today: [],
      tomorrow: [],
    };
    
    confirmedFutureAppointments.forEach((apt: any) => {
      if (!apt.dateObj && !apt.date) return;
      
      const appointmentDate = apt.dateObj || new Date(apt.date);
      appointmentDate.setHours(0, 0, 0, 0);
      
      const dateKey = appointmentDate.getTime();
      const todayKey = today.getTime();
      const tomorrowKey = tomorrow.getTime();
      
      if (dateKey === todayKey) {
        groups.today.push(apt);
      } else if (dateKey === tomorrowKey) {
        groups.tomorrow.push(apt);
      } else {
        // Future dates - use date string as key
        const dateStr = dayjs(appointmentDate).format('YYYY-MM-DD');
        const displayDate = dayjs(appointmentDate).format('DD MMM YYYY');
        
        if (!groups[dateStr]) {
          groups[dateStr] = [];
        }
        groups[dateStr].push(apt);
      }
    });
    
    return groups;
  }, [confirmedFutureAppointments]);

  // Get appointments for active tab
  const appointmentsToShow = useMemo(() => {
    if (activeAppointmentTab === 'today') {
      return appointmentsByDate.today || [];
    } else if (activeAppointmentTab === 'tomorrow') {
      return appointmentsByDate.tomorrow || [];
    } else {
      return appointmentsByDate[activeAppointmentTab] || [];
    }
  }, [activeAppointmentTab, appointmentsByDate]);

  // Generate tab items for appointments
  const appointmentTabs = useMemo(() => {
    const tabs: Array<{ key: string; label: string; count: number }> = [];
    
    // Today tab
    if (appointmentsByDate.today && appointmentsByDate.today.length > 0) {
      tabs.push({
        key: 'today',
        label: `Today (${appointmentsByDate.today.length})`,
        count: appointmentsByDate.today.length,
      });
    }
    
    // Tomorrow tab
    if (appointmentsByDate.tomorrow && appointmentsByDate.tomorrow.length > 0) {
      tabs.push({
        key: 'tomorrow',
        label: `Tomorrow (${appointmentsByDate.tomorrow.length})`,
        count: appointmentsByDate.tomorrow.length,
      });
    }
    
    // Future date tabs
    Object.keys(appointmentsByDate)
      .filter(key => key !== 'today' && key !== 'tomorrow')
      .sort()
      .forEach(dateKey => {
        const appointments = appointmentsByDate[dateKey];
        if (appointments && appointments.length > 0) {
          const displayDate = dayjs(dateKey).format('DD MMM');
          tabs.push({
            key: dateKey,
            label: `${displayDate} (${appointments.length})`,
            count: appointments.length,
          });
        }
      });
    
    return tabs;
  }, [appointmentsByDate]);

  // Update active tab if current tab has no appointments
  useEffect(() => {
    if (appointmentTabs.length > 0 && !appointmentTabs.find(tab => tab.key === activeAppointmentTab)) {
      setActiveAppointmentTab(appointmentTabs[0].key);
    } else if (appointmentTabs.length === 0) {
      setActiveAppointmentTab('today');
    }
  }, [appointmentTabs, activeAppointmentTab]);

  // For stats - use today's confirmed appointments
  const todayAppointments = appointmentsByDate.today || [];
  
  console.log('📅 All appointments from API:', allAppointments.length);
  console.log('📅 Today appointments:', todayAppointments.length);
  console.log('📅 Confirmed future appointments:', confirmedFutureAppointments.length);
  console.log('📅 Appointments in active tab:', appointmentsToShow.length);
  console.log('📅 Appointments breakdown by status:', {
    confirmed: allAppointments.filter((a: any) => a.status === 'confirmed').length,
    completed: allAppointments.filter((a: any) => a.status === 'completed').length,
    pending: allAppointments.filter((a: any) => a.status === 'pending').length,
    cancelled: allAppointments.filter((a: any) => a.status === 'cancelled').length
  });

  // Calculate real stats from appointments data (AFTER appointments are loaded)
  // For today's pending appointments (for prescription modal), use confirmed appointments from today
  const todaysPendingAppointments = todayAppointments.filter((apt: any) => {
    const status = (apt.status || '').toLowerCase();
    return status === 'confirmed'; // Only confirmed appointments for today
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

  // Calculate stats with real data
  const pendingLabReports = useMemo(() => {
    return labReports.filter((report: any) => report.status === 'pending' || !report.status);
  }, [labReports]);

  const unreadNotifications = useMemo(() => {
    return notifications.filter((notif: any) => !notif.read);
  }, [notifications]);

  // Generate doctor ID (must be before conditional returns)
  const doctorId = useMemo(() => {
    if (user?.id) {
      const year = new Date().getFullYear();
      const idNum = String(user.id).padStart(3, '0');
      return `DOC-${year}-${idNum}`;
    }
    return 'DOC-2024-001';
  }, [user?.id]);

  // Generate user initials (must be before conditional returns)
  const userInitials = useMemo(() => {
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.fullName.substring(0, 2).toUpperCase();
    }
    return 'DR';
  }, [user?.fullName]);

  // Calculate stats using confirmed future appointments
  const stats = confirmedFutureAppointments.length > 0 ? {
    totalPatients: new Set(confirmedFutureAppointments.map((apt: any) => apt.patient)).size,
    todayAppointments: todayAppointments.length,
    completedAppointments: allAppointments.filter((apt: any) => apt.status === 'completed').length,
    pendingPrescriptions: prescriptions.filter((p: any) => p.status === 'pending' || !p.status).length,
    totalPrescriptions: prescriptions.length,
    pendingLabReports: pendingLabReports.length,
    unreadNotifications: unreadNotifications.length,
  } : {
    totalPatients: 0,
    todayAppointments: 0,
    completedAppointments: allAppointments.filter((apt: any) => apt.status === 'completed').length,
    pendingPrescriptions: prescriptions.filter((p: any) => p.status === 'pending' || !p.status).length,
    totalPrescriptions: prescriptions.length,
    pendingLabReports: pendingLabReports.length,
    unreadNotifications: unreadNotifications.length,
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

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === 'prescriptions') {
      handleOpenPrescriptionModal();
    }
    // Add other navigation handlers as needed
  };

  const handleQuickAction = (key: 'consult' | 'prescription' | 'availability' | 'labs' | 'requestLab') => {
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
      case 'requestLab':
        setIsLabRequestModalOpen(true);
        break;
      default:
        break;
    }
  };

  // Define appointment columns after handlers are defined
  const appointmentColumns = [
    {
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
    },
    {
      title: 'Date',
      key: 'date',
      render: (_: any, record: any) => {
        if (!record.dateObj && !record.date) return 'N/A';
        const date = record.dateObj || new Date(record.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const appointmentDate = new Date(date);
        appointmentDate.setHours(0, 0, 0, 0);
        
        if (appointmentDate.getTime() === today.getTime()) {
          return <Text strong>Today</Text>;
        }
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (appointmentDate.getTime() === tomorrow.getTime()) {
          return <Text>Tomorrow</Text>;
        }
        return dayjs(date).format('DD MMM YYYY');
      },
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
        <Tag color={priority === 'High' || priority === 'high' ? 'red' : priority === 'urgent' ? 'orange' : 'blue'}>
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

  const siderWidth = isMobile ? 0 : 260; // Fixed width, no collapse

  // Sidebar content component (reusable for drawer and sider)
  const SidebarContent = ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: '#fff',
    }}>
      <div
        style={{
          padding: '20px 16px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: doctorTheme.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '24px',
        }}>
          <MedicineBoxOutlined />
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
            NexaCare
          </Text>
          <Text style={{ display: 'block', fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>
            Healthcare System
          </Text>
        </div>
      </div>
      <Menu
        className="doctor-dashboard-menu"
        mode="inline"
        defaultSelectedKeys={['dashboard']}
        items={sidebarMenu}
        style={{ 
          border: 'none', 
          flex: 1, 
          background: 'transparent', 
          padding: '8px',
          overflowY: 'auto',
        }}
        onClick={(e) => {
          handleMenuClick(e);
          onMenuClick?.();
        }}
        theme="light"
      />

      {/* User Profile Footer - Light Grey Rounded Card (matching receptionist) */}
      <div style={{
        marginTop: 'auto',
        padding: '16px',
        background: '#fff',
        flexShrink: 0,
      }}>
        <div style={{
          background: '#F3F4F6',
          borderRadius: '12px',
          padding: '16px',
        }}>
          {/* Layer 1: Profile Photo + (Name + ID) */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '12px',
          }}>
            {/* Avatar */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: doctorTheme.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              flexShrink: 0,
            }}>
              {userInitials}
            </div>
            
            {/* Name (top) and ID (below) - stacked vertically */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#262626', lineHeight: 1.5, marginBottom: '4px' }}>
                {user?.fullName || 'Doctor'}
              </Text>
              <Text style={{ display: 'block', fontSize: '12px', color: '#8C8C8C' }}>
                ID: {doctorId}
              </Text>
            </div>
          </div>
          
          {/* Layer 2: Hospital Name */}
          {hospitalName ? (
            <div style={{
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid #E5E7EB',
            }}>
              <Text style={{ display: 'block', fontSize: '12px', color: '#8C8C8C', lineHeight: 1.4 }}>
                {hospitalName}
              </Text>
            </div>
          ) : null}
          
          {/* Layer 3: Active Doctor Text + Settings Icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Active Doctor on left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10B981',
              }} />
              <Text style={{ fontSize: '12px', color: '#10B981', fontWeight: 500 }}>
                Active Doctor
              </Text>
            </div>
            
            {/* Settings Icon on right */}
            <Button 
              type="text" 
              icon={<SettingOutlined style={{ color: '#8C8C8C', fontSize: '18px' }} />} 
              onClick={() => message.info('Settings coming soon.')}
              style={{ flexShrink: 0, padding: 0, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        /* Override medical-container padding only when doctor dashboard is rendered */
        body:has(.doctor-dashboard-wrapper) .medical-container {
          padding: 0 !important;
          display: block !important;
          align-items: unset !important;
          justify-content: unset !important;
          background: transparent !important;
          min-height: 100vh !important;
        }
        
        .doctor-dashboard-menu .ant-menu-item {
          border-radius: 12px !important;
          margin: 4px 8px !important;
          height: 48px !important;
          line-height: 48px !important;
          transition: all 0.3s ease !important;
          padding-left: 16px !important;
          background: transparent !important;
          border: none !important;
        }
        .doctor-dashboard-menu .ant-menu-item:hover {
          background: transparent !important;
        }
        .doctor-dashboard-menu .ant-menu-item:hover,
        .doctor-dashboard-menu .ant-menu-item:hover .ant-menu-title-content {
          color: #595959 !important;
        }
        .doctor-dashboard-menu .ant-menu-item-selected {
          background: #1D4ED8 !important;
          font-weight: 500 !important;
          border: none !important;
          padding-left: 16px !important;
        }
        .doctor-dashboard-menu .ant-menu-item-selected,
        .doctor-dashboard-menu .ant-menu-item-selected .ant-menu-title-content {
          color: #fff !important;
        }
        .doctor-dashboard-menu .ant-menu-item-selected .ant-menu-item-icon,
        .doctor-dashboard-menu .ant-menu-item-selected .anticon,
        .doctor-dashboard-menu .ant-menu-item-selected img {
          color: #fff !important;
        }
        .doctor-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) {
          color: #8C8C8C !important;
          background: transparent !important;
        }
        .doctor-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-title-content {
          color: #8C8C8C !important;
        }
        .doctor-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-item-icon,
        .doctor-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .anticon,
        .doctor-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) img {
          color: #8C8C8C !important;
        }
        .doctor-dashboard-menu .ant-menu-item-selected::after {
          display: none !important;
        }
        .doctor-dashboard-menu .ant-menu-item-icon,
        .doctor-dashboard-menu .anticon {
          font-size: 18px !important;
          width: 18px !important;
          height: 18px !important;
        }
      `}</style>
      <Layout className="doctor-dashboard-wrapper" style={{ minHeight: '100vh', background: doctorTheme.background }}>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <Sider
          width={260}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            width: 260,
            background: '#fff',
            boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            borderLeft: '1px solid #E3F2FF',
            borderBottom: '1px solid #E3F2FF',
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
          background: doctorTheme.background,
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            background: doctorTheme.background,
            height: '100vh',
            overflow: 'hidden',
            padding: isMobile ? '24px 16px 16px' : isTablet ? '24px 20px 20px' : '24px 32px 24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            overflow: 'hidden',
          }}>
            {/* Mobile Menu Button */}
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Button
                  type="text"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setMobileDrawerOpen(true)}
                  style={{ fontSize: '18px' }}
                />
                <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
                <div style={{ width: 32 }} /> {/* Spacer for centering */}
              </div>
            )}

            {/* KPI Cards - Matching Receptionist Dashboard Design */}
            {isMobile ? (
              <div style={{ 
                display: 'flex', 
                overflowX: 'auto', 
                gap: 16, 
                marginBottom: 24,
                paddingBottom: 8,
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
              }}>
                {[
                  { label: "Today's Appointments", value: stats.todayAppointments || 0, icon: <CalendarOutlined />, trendLabel: `${appointmentsToShow.length} confirmed`, trendColor: doctorTheme.primary, trendBg: doctorTheme.highlight, onView: () => setLocation('/dashboard/doctor/appointments') },
                  { label: "Lab Results Pending", value: stats.pendingLabReports || 0, icon: <ExperimentOutlined />, trendLabel: "Awaiting review", trendColor: stats.pendingLabReports > 0 ? "#EF4444" : "#6B7280", trendBg: stats.pendingLabReports > 0 ? "#FEE2E2" : "#F3F4F6", onView: () => message.info('Lab results widget below') },
                  { label: "Completed Today", value: stats.completedAppointments || 0, icon: <CheckCircleOutlined />, trendLabel: "Live", trendColor: "#22C55E", trendBg: "#D1FAE5", onView: () => setLocation('/dashboard/doctor/appointments') },
                  { label: "Notifications", value: stats.unreadNotifications || 0, icon: <BellOutlined />, trendLabel: "Unread", trendColor: stats.unreadNotifications > 0 ? "#F97316" : "#6B7280", trendBg: stats.unreadNotifications > 0 ? "#FFEAD5" : "#F3F4F6", onView: () => message.info('Notifications widget below') },
                ].map((kpi, idx) => (
                  <div key={idx} style={{ minWidth: 220, scrollSnapAlign: 'start' }}>
                    <KpiCard {...kpi} />
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  marginBottom: 24,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                  <KpiCard
                    label="Today's Appointments"
                    value={stats.todayAppointments || 0}
                    icon={<CalendarOutlined />}
                    trendLabel={`${appointmentsToShow.length} confirmed`}
                    trendColor={doctorTheme.primary}
                    trendBg={doctorTheme.highlight}
                    onView={() => setLocation('/dashboard/doctor/appointments')}
                  />
                </div>
                <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                  <KpiCard
                    label="Lab Results Pending"
                    value={stats.pendingLabReports || 0}
                    icon={<ExperimentOutlined />}
                    trendLabel="Awaiting review"
                    trendColor={stats.pendingLabReports > 0 ? "#EF4444" : "#6B7280"}
                    trendBg={stats.pendingLabReports > 0 ? "#FEE2E2" : "#F3F4F6"}
                    onView={() => message.info('Lab results widget below')}
                  />
                </div>
                <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                  <KpiCard
                    label="Completed Today"
                    value={stats.completedAppointments || 0}
                    icon={<CheckCircleOutlined />}
                    trendLabel="Live"
                    trendColor="#22C55E"
                    trendBg="#D1FAE5"
                    onView={() => setLocation('/dashboard/doctor/appointments')}
                  />
                </div>
                <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                  <KpiCard
                    label="Notifications"
                    value={stats.unreadNotifications || 0}
                    icon={<BellOutlined />}
                    trendLabel="Unread"
                    trendColor={stats.unreadNotifications > 0 ? "#F97316" : "#6B7280"}
                    trendBg={stats.unreadNotifications > 0 ? "#FFEAD5" : "#F3F4F6"}
                    onView={() => message.info('Notifications widget below')}
                  />
                </div>
              </div>
            )}

            {/* Quick Actions - Single row with flexbox (matching receptionist dashboard) */}
            <div style={{ 
              marginBottom: 24, 
              display: 'flex', 
              gap: 12, 
              flexWrap: isMobile ? 'wrap' : 'nowrap',
              overflowX: isMobile ? 'auto' : 'visible',
            }}>
              <QuickActionTile
                label="Start Consultation"
                icon={<CalendarOutlined />}
                onClick={() => handleQuickAction('consult')}
                variant="primary"
              />
              <QuickActionTile
                label="Write Prescription"
                icon={<MedicineBoxOutlined />}
                onClick={() => handleQuickAction('prescription')}
              />
              <QuickActionTile
                label="Request Lab Test"
                icon={<ExperimentOutlined />}
                onClick={() => handleQuickAction('requestLab')}
              />
              <QuickActionTile
                label="Update Availability"
                icon={<CheckCircleOutlined />}
                onClick={() => handleQuickAction('availability')}
              />
            </div>

            {/* Upcoming Appointments - Full width, matching receptionist dashboard */}
            <Card
              variant="borderless"
              style={{ 
                borderRadius: 16,
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
              }}
              bodyStyle={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                padding: isMobile ? 16 : 20,
                overflow: 'hidden',
              }}
              title={
                <Title level={4} style={{ margin: 0 }}>Upcoming Appointments</Title>
              }
              extra={
                <Button type="link" onClick={() => setLocation('/dashboard/doctor/appointments')}>
                  View All
                </Button>
              }
            >
                  {appointmentTabs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Text type="secondary">
                        {allAppointments.length === 0
                          ? 'No appointments found. Waiting for receptionist to confirm appointments.'
                          : `No confirmed appointments scheduled. ${allAppointments.filter((a: any) => a.status === 'pending').length} pending confirmation.`}
                      </Text>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <Tabs
                        activeKey={activeAppointmentTab}
                        onChange={setActiveAppointmentTab}
                        items={appointmentTabs.map(tab => ({
                          key: tab.key,
                          label: tab.label,
                          children: (
                            <div style={{ 
                              flex: 1, 
                              overflow: 'auto',
                              marginTop: 8,
                            }}>
                              <Table
                                columns={appointmentColumns}
                                dataSource={appointmentsToShow}
                                pagination={false}
                                rowKey="id"
                                loading={appointmentsLoading}
                                size={isMobile ? "small" : "middle"}
                                scroll={isMobile ? { x: 'max-content' } : { y: 'calc(100vh - 500px)' }}
                              />
                            </div>
                          ),
                        }))}
                        style={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                          overflow: 'hidden',
                        }}
                      />
                    </div>
                  )}
                </Card>
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

      {/* Lab Request Modal */}
      <LabRequestModal
        open={isLabRequestModalOpen}
        onCancel={() => setIsLabRequestModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/labs/doctor/reports'] });
        }}
        patientId={selectedPatientId}
        appointmentId={selectedAppointmentId}
        patientsOverride={todaysPendingPatients}
      />
    </Layout>
    </>
  );
}