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
  Progress,
  Timeline,
  message,
  Spin,
  Input,
  List,
  Empty,
  Badge,
  Divider,
  Tabs,
  Drawer
} from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  MedicineBoxOutlined, 
  FileTextOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  ExperimentOutlined,
  BellOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import PrescriptionForm from '../../components/prescription-form';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { SidebarProfile } from '../../components/dashboard/SidebarProfile';
import dayjs from 'dayjs';

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
  const { isMobile, isTablet } = useResponsive();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | undefined>(undefined);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<string>('today');

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      setCollapsed(true);
    }
  }, [isMobile, isTablet]);

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

  // Filter confirmed appointments that are today or in the future (by date and time)
  const confirmedFutureAppointments = useMemo(() => {
    const now = new Date();
    
    return allAppointments
      .filter((apt: any) => {
        // Only show confirmed appointments
        if (apt.status !== 'confirmed') {
          return false;
        }
        
        // Check if appointment has valid date
        if (!apt.date && !apt.dateObj) {
          return false;
        }
        
        try {
          const appointmentDateTime = apt.dateObj || new Date(apt.date);
          if (isNaN(appointmentDateTime.getTime())) {
            return false;
          }
          
          // Parse time from appointmentTime or timeSlot
          let appointmentTime = new Date(appointmentDateTime);
          
          if (apt.appointmentTime) {
            // Parse time string (e.g., "09:00", "09:00 AM", "14:30")
            const timeStr = apt.appointmentTime.trim();
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
            
            if (timeMatch) {
              let hours = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2]);
              const period = timeMatch[3]?.toUpperCase();
              
              // Handle 12-hour format
              if (period === 'PM' && hours !== 12) {
                hours += 12;
              } else if (period === 'AM' && hours === 12) {
                hours = 0;
              }
              
              appointmentTime.setHours(hours, minutes, 0, 0);
            } else {
              // Try 24-hour format
              const parts = timeStr.split(':');
              if (parts.length >= 2) {
                const hours = parseInt(parts[0]) || 9;
                const minutes = parseInt(parts[1]) || 0;
                appointmentTime.setHours(hours, minutes, 0, 0);
              } else {
                // Default to 9 AM if can't parse
                appointmentTime.setHours(9, 0, 0, 0);
              }
            }
          } else if (apt.timeSlot) {
            // Extract start time from timeSlot (e.g., "09:00 AM - 10:00 AM", "14:30 - 15:30")
            const timeMatch = apt.timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
            if (timeMatch) {
              let hours = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2]);
              const period = timeMatch[3]?.toUpperCase();
              
              // Handle 12-hour format
              if (period === 'PM' && hours !== 12) {
                hours += 12;
              } else if (period === 'AM' && hours === 12) {
                hours = 0;
              }
              
              appointmentTime.setHours(hours, minutes, 0, 0);
            } else {
              // Default to 9 AM if can't parse
              appointmentTime.setHours(9, 0, 0, 0);
            }
          } else {
            // No time info, default to start of day (midnight)
            appointmentTime.setHours(0, 0, 0, 0);
          }
          
          // Only include appointments that are today or in the future (by date and time)
          return appointmentTime >= now;
        } catch (error) {
          console.error(`❌ Error checking date/time for appointment ${apt.id}:`, error);
          return false;
        }
      })
      .sort((a: any, b: any) => {
        // Sort by date and time (earliest first)
        const dateTimeA = a.dateObj || new Date(a.date);
        const dateTimeB = b.dateObj || new Date(b.date);
        return dateTimeA.getTime() - dateTimeB.getTime();
      });
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

  const completionPercent = stats.todayAppointments
    ? Math.round((stats.completedAppointments / (stats.todayAppointments || 1)) * 100)
    : 0;

  // Calculate analytics
  const analytics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const completedToday = allAppointments.filter((apt: any) => {
      if (apt.status !== 'completed') return false;
      const aptDate = apt.dateObj || new Date(apt.date);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate.getTime() === today.getTime();
    }).length;

    const completedThisWeek = allAppointments.filter((apt: any) => {
      if (apt.status !== 'completed') return false;
      const aptDate = apt.dateObj || new Date(apt.date);
      return aptDate >= weekAgo;
    }).length;

    const completedThisMonth = allAppointments.filter((apt: any) => {
      if (apt.status !== 'completed') return false;
      const aptDate = apt.dateObj || new Date(apt.date);
      return aptDate >= monthAgo;
    }).length;

    return {
      today: completedToday,
      week: completedThisWeek,
      month: completedThisMonth,
    };
  }, [allAppointments]);

  // Generate real activity timeline
  const activityTimeline = useMemo(() => {
    const activities: Array<{ color: string; children: string; time: Date }> = [];
    
    // Add recent completed appointments
    allAppointments
      .filter((apt: any) => apt.status === 'completed')
      .slice(0, 3)
      .forEach((apt: any) => {
        activities.push({
          color: doctorTheme.primary,
          children: `Completed consultation with ${apt.patient}`,
          time: apt.dateObj || new Date(apt.date),
        });
      });

    // Add recent prescriptions
    prescriptions.slice(0, 2).forEach((presc: any) => {
      activities.push({
        color: doctorTheme.accent,
        children: `Prescribed medication for patient`,
        time: new Date(presc.createdAt || Date.now()),
      });
    });

    // Sort by time (most recent first)
    activities.sort((a, b) => b.time.getTime() - a.time.getTime());

    return activities.slice(0, 5);
  }, [allAppointments, prescriptions]);

  // Filter patients for search
  const filteredPatients = useMemo(() => {
    if (!patientSearchTerm.trim()) return [];
    const searchLower = patientSearchTerm.toLowerCase();
    const patientSet = new Set<string>();
    allAppointments.forEach((apt: any) => {
      if (apt.patient && apt.patient.toLowerCase().includes(searchLower)) {
        patientSet.add(apt.patient);
      }
    });
    return Array.from(patientSet).slice(0, 5);
  }, [patientSearchTerm, allAppointments]);

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

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === 'prescriptions') {
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

  const siderWidth = isMobile ? 0 : (collapsed ? 80 : 260);

  // Sidebar content component (reusable for drawer and sider)
  const SidebarContent = ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <>
      <div
        style={{
          padding: '16px',
          textAlign: 'center',
          borderBottom: '1px solid #eef2ff',
        }}
      >
        <MedicineBoxOutlined style={{ fontSize: 24, color: doctorTheme.primary }} />
        {(!collapsed || isMobile) && (
          <Title level={4} style={{ margin: '8px 0 0', color: doctorTheme.primary }}>
            NexaCare
          </Title>
        )}
      </div>
      <Menu
        mode="inline"
        defaultSelectedKeys={['dashboard']}
        items={sidebarMenu}
        style={{ border: 'none', flex: 1 }}
        onClick={(e) => {
          handleMenuClick(e);
          onMenuClick?.();
        }}
      />
      <SidebarProfile
        collapsed={collapsed && !isMobile}
        name={user?.fullName}
        roleLabel="DOCTOR"
        roleColor={doctorTheme.primary}
        avatarIcon={<UserOutlined />}
        onSettingsClick={() => message.info('Profile settings coming soon.')}
        onLogoutClick={logout}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: doctorTheme.highlight }}>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
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
            background: '#ffffff',
            boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s ease',
            zIndex: 10,
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
          bodyStyle={{ padding: 0 }}
          width={260}
        >
          <SidebarContent onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: doctorTheme.highlight,
          transition: 'margin-left 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            background: doctorTheme.highlight,
            height: '100vh',
            overflowY: 'auto',
            padding: isMobile ? '12px 16px' : isTablet ? '16px 20px' : '16px 24px 24px',
          }}
        >
          <div style={{ paddingBottom: 24, maxWidth: '1320px', margin: '0 auto' }}>
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
            
            {/* Desktop/Tablet Menu Toggle */}
            {!isMobile && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button
                  type="text"
                  icon={collapsed ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                />
              </div>
            )}

            {/* KPI Cards - Responsive Grid */}
            {isMobile ? (
              <div style={{ 
                display: 'flex', 
                overflowX: 'auto', 
                gap: 12, 
                marginBottom: 24,
                paddingBottom: 8,
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
              }}>
                {[
                  { label: "Today's Appointments", value: stats.todayAppointments || 0, icon: <CalendarOutlined style={{ color: doctorTheme.primary }} />, trendLabel: `${appointmentsToShow.length} confirmed`, trendType: "positive" as const, onView: () => setLocation('/dashboard/doctor/appointments') },
                  { label: "Lab Results Pending", value: stats.pendingLabReports || 0, icon: <ExperimentOutlined style={{ color: doctorTheme.accent }} />, trendLabel: "Awaiting review", trendType: (stats.pendingLabReports > 0 ? "negative" : "neutral") as const, onView: () => message.info('Lab results widget below') },
                  { label: "Completed Today", value: stats.completedAppointments || 0, icon: <CheckCircleOutlined style={{ color: '#16a34a' }} />, trendLabel: "Live", trendType: "positive" as const, onView: () => setLocation('/dashboard/doctor/appointments') },
                  { label: "Notifications", value: stats.unreadNotifications || 0, icon: <BellOutlined style={{ color: '#f97316' }} />, trendLabel: "Unread", trendType: (stats.unreadNotifications > 0 ? "negative" : "neutral") as const, onView: () => message.info('Notifications widget below') },
                ].map((kpi, idx) => (
                  <div key={idx} style={{ minWidth: 200, scrollSnapAlign: 'start' }}>
                    <KpiCard {...kpi} />
                  </div>
                ))}
              </div>
            ) : (
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
                    label="Lab Results Pending"
                    value={stats.pendingLabReports || 0}
                    icon={<ExperimentOutlined style={{ color: doctorTheme.accent }} />}
                    trendLabel="Awaiting review"
                    trendType={stats.pendingLabReports > 0 ? "negative" : "neutral"}
                    onView={() => message.info('Lab results widget below')}
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
                    label={
                      <Space>
                        <span>Notifications</span>
                        {stats.unreadNotifications > 0 && (
                          <Badge count={stats.unreadNotifications} size="small" />
                        )}
                      </Space>
                    }
                    value={stats.unreadNotifications || 0}
                    icon={<BellOutlined style={{ color: '#f97316' }} />}
                    trendLabel="Unread"
                    trendType={stats.unreadNotifications > 0 ? "negative" : "neutral"}
                    onView={() => message.info('Notifications widget below')}
                  />
                </Col>
              </Row>
            )}

            <Card variant="borderless" style={{ marginBottom: 24, borderRadius: 16 }} bodyStyle={{ padding: isMobile ? 16 : 20 }}>
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <QuickActionTile
                    label="Start Consultation"
                    icon={<CalendarOutlined />}
                    onClick={() => handleQuickAction('consult')}
                  />
                  <QuickActionTile
                    label="Write Prescription"
                    icon={<MedicineBoxOutlined />}
                    onClick={() => handleQuickAction('prescription')}
                  />
                  <QuickActionTile
                    label="Update Availability"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleQuickAction('availability')}
                  />
                  <QuickActionTile
                    label="Review Lab Queue"
                    icon={<FileTextOutlined />}
                    onClick={() => handleQuickAction('labs')}
                  />
                </div>
              ) : (
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
              )}
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Card
                  variant="borderless"
                  style={{ borderRadius: 16 }}
                  title="Upcoming Appointments"
                  extra={<Button type="link" onClick={() => setLocation('/dashboard/doctor/appointments')}>View All</Button>}
                >
                  {appointmentTabs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Text type="secondary">
                        {allAppointments.length === 0
                          ? 'No appointments found. Waiting for receptionist to confirm appointments.'
                          : `No confirmed appointments scheduled. ${allAppointments.filter((a: any) => a.status === 'pending').length} pending confirmation.`}
                      </Text>
                    </div>
                  ) : (
                    <>
                      <Tabs
                        activeKey={activeAppointmentTab}
                        onChange={setActiveAppointmentTab}
                        items={appointmentTabs.map(tab => ({
                          key: tab.key,
                          label: tab.label,
                          children: (
                            <div style={{ overflowX: 'auto' }}>
                              <Table
                                columns={appointmentColumns}
                                dataSource={appointmentsToShow}
                                pagination={false}
                                rowKey="id"
                                loading={appointmentsLoading}
                                size={isMobile ? "small" : "middle"}
                                scroll={isMobile ? { x: 'max-content' } : undefined}
                              />
                            </div>
                          ),
                        }))}
                        style={{ marginTop: 8 }}
                      />
                    </>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Card variant="borderless" style={{ borderRadius: 16 }}>
                    <Title level={5} style={{ marginBottom: 12 }}>Shift Overview</Title>
                    <Progress
                      percent={completionPercent}
                      status="active"
                      strokeColor={doctorTheme.primary}
                      style={{ marginBottom: 12 }}
                    />
                    <Space direction="vertical" size={4}>
                      <Text type="secondary">{stats.completedAppointments || 0} of {stats.todayAppointments || 0} completed</Text>
                      {doctorProfile?.hospitalName && (
                        <Text type="secondary">📍 {doctorProfile.hospitalName}</Text>
                      )}
                    </Space>
                  </Card>

                  <Card variant="borderless" style={{ borderRadius: 16 }}>
                    <Title level={5} style={{ marginBottom: 12 }}>
                      <BarChartOutlined style={{ marginRight: 8 }} />
                      Analytics
                    </Title>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">Today</Text>
                        <Text strong>{analytics.today}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">This Week</Text>
                        <Text strong>{analytics.week}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">This Month</Text>
                        <Text strong>{analytics.month}</Text>
                      </div>
                    </Space>
                  </Card>

                  <Card variant="borderless" style={{ borderRadius: 16 }}>
                    <Title level={5} style={{ marginBottom: 12 }}>
                      <SearchOutlined style={{ marginRight: 8 }} />
                      Patient Search
                    </Title>
                    <Input
                      placeholder="Search patients..."
                      prefix={<SearchOutlined />}
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      style={{ marginBottom: 12 }}
                    />
                    {filteredPatients.length > 0 ? (
                      <List
                        size="small"
                        dataSource={filteredPatients}
                        renderItem={(patient) => (
                          <List.Item style={{ padding: '8px 0', cursor: 'pointer' }}>
                            <Text>{patient}</Text>
                          </List.Item>
                        )}
                      />
                    ) : patientSearchTerm.trim() ? (
                      <Text type="secondary">No patients found</Text>
                    ) : (
                      <Text type="secondary">Start typing to search...</Text>
                    )}
                  </Card>

                  <Card variant="borderless" style={{ borderRadius: 16 }}>
                    <Title level={5} style={{ marginBottom: 12 }}>
                      <ExperimentOutlined style={{ marginRight: 8 }} />
                      Lab Results Queue
                    </Title>
                    {labReportsLoading ? (
                      <Spin size="small" />
                    ) : pendingLabReports.length > 0 ? (
                      <List
                        size="small"
                        dataSource={pendingLabReports.slice(0, 5)}
                        renderItem={(report: any) => (
                          <List.Item style={{ padding: '8px 0' }}>
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                              <Text strong>{report.testName || 'Lab Test'}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {report.testType || 'Test'} • {report.reportDate ? dayjs(report.reportDate).format('DD MMM YYYY') : 'Pending'}
                              </Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No pending lab results"
                        style={{ padding: '20px 0' }}
                      />
                    )}
                  </Card>

                  <Card variant="borderless" style={{ borderRadius: 16 }}>
                    <Title level={5} style={{ marginBottom: 12 }}>
                      <BellOutlined style={{ marginRight: 8 }} />
                      Notifications
                      {stats.unreadNotifications > 0 && (
                        <Badge count={stats.unreadNotifications} style={{ marginLeft: 8 }} />
                      )}
                    </Title>
                    {notificationsLoading ? (
                      <Spin size="small" />
                    ) : notifications.length > 0 ? (
                      <List
                        size="small"
                        dataSource={notifications.slice(0, 5)}
                        renderItem={(notif: any) => (
                          <List.Item style={{ padding: '8px 0' }}>
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <Space size={8}>
                                <Tag color={notif.type === 'urgent' ? 'red' : 'blue'} style={{ margin: 0 }}>
                                  {notif.type === 'urgent' ? 'Urgent' : 'Info'}
                                </Tag>
                                <Text strong style={{ fontSize: 13 }}>{notif.title || 'Notification'}</Text>
                                {!notif.read && (
                                  <Button
                                    type="link"
                                    size="small"
                                    onClick={() => markNotificationMutation.mutate(notif.id)}
                                    style={{ padding: 0, height: 'auto', fontSize: 11 }}
                                  >
                                    Mark read
                                  </Button>
                                )}
                              </Space>
                              <Text type="secondary" style={{ fontSize: 12 }}>{notif.message || ''}</Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {dayjs(notif.createdAt || new Date()).format('DD MMM, hh:mm A')}
                              </Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No notifications"
                        style={{ padding: '20px 0' }}
                      />
                    )}
                  </Card>

                  <Card variant="borderless" style={{ borderRadius: 16 }}>
                    <Title level={5} style={{ marginBottom: 12 }}>Recent Activity</Title>
                    {activityTimeline.length > 0 ? (
                      <Timeline
                        items={activityTimeline.map((activity) => ({
                          color: activity.color,
                          children: (
                            <Text style={{ fontSize: 13 }}>
                              {activity.children}
                              <br />
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {dayjs(activity.time).format('DD MMM, hh:mm A')}
                              </Text>
                            </Text>
                          ),
                        }))}
                      />
                    ) : (
                      <Text type="secondary">No recent activity</Text>
                    )}
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