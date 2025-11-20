import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Spin,
  Form,
  Input,
  Select,
  AutoComplete,
  DatePicker,
  Segmented,
  TimePicker,
  Divider,
  Tabs,
  Drawer,
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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { SidebarProfile } from '../../components/dashboard/SidebarProfile';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const receptionistTheme = {
  primary: '#F97316', // Orange
  secondary: '#6366F1', // Indigo
  accent: '#22C55E', // Green
  background: '#FFF7ED', // Light orange
  highlight: '#FFEAD5', // Lighter orange
};

export default function ReceptionistDashboard() {
  const { user, logout, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isWalkInSubmitting, setIsWalkInSubmitting] = useState(false);
  const [walkInForm] = Form.useForm();
  const [patientOptions, setPatientOptions] = useState<Array<{ userId: number; patientId: number | null; fullName: string; mobileNumber: string }>>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [dateMode, setDateMode] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<string>('today');
  const patientSearchTimeoutRef = useRef<number | undefined>();
  const appointmentStartTimeValue = Form.useWatch('appointmentStartTime', walkInForm);
  const durationMinutesValue = Form.useWatch('durationMinutes', walkInForm);

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      setCollapsed(true);
    }
  }, [isMobile, isTablet]);

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
      // Transform API data to match table format with date object
      const transformed = data.map((apt: any) => {
        // Handle different date formats
        let appointmentDate = apt.appointmentDate;
        if (typeof appointmentDate === 'string') {
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
          doctor: apt.doctorName || 'Unknown Doctor',
          time: apt.timeSlot || apt.appointmentTime || 'N/A',
          status: apt.status || 'pending',
          department: apt.doctorSpecialty || 'General',
          phone: apt.patientPhone || 'N/A',
          date: apt.appointmentDate,
          dateObj: appointmentDate,
        };
      });
      console.log('✅ Transformed appointments - statuses:', transformed.map((t: any) => `${t.patient}: ${t.status}`));
      return transformed;
    },
    enabled: !!user && user.role?.toUpperCase() === 'RECEPTIONIST',
    refetchInterval: 3000, // Refetch every 3 seconds for faster updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch when component mounts
  });

  // Listen for appointment updates
  useEffect(() => {
    const handleStorageChange = () => {
      refetchAppointments();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refetchAppointments]);

  const { data: walkInPatients = [], isLoading: walkInLoading, refetch: refetchWalkIns } = useQuery({
    queryKey: ['/api/reception/walkins'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/reception/walkins', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch walk-ins:', response.status, errorText);
        throw new Error('Failed to fetch walk-in patients');
      }
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ['/api/reception/doctors'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/reception/doctors', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch doctors for reception:', response.status, errorText);
        throw new Error('Failed to fetch doctors');
      }
      return response.json();
    },
    enabled: !!user,
  });

  // Filter appointments that are today or in the future (by date and time)
  // Receptionists need to see pending (to confirm), confirmed (to check-in), and cancelled appointments
  const futureAppointments = useMemo(() => {
    const now = new Date();
    
    return appointments
      .filter((apt: any) => {
        // Show pending, confirmed, and cancelled appointments
        if (apt.status !== 'confirmed' && apt.status !== 'pending' && apt.status !== 'cancelled') {
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
          
          if (apt.time) {
            // Parse time string (e.g., "09:00", "09:00 AM", "14:30")
            const timeStr = apt.time.trim();
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
  }, [appointments]);

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
    
    futureAppointments.forEach((apt: any) => {
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
        
        if (!groups[dateStr]) {
          groups[dateStr] = [];
        }
        groups[dateStr].push(apt);
      }
      });
    
    return groups;
  }, [futureAppointments]);

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

  // Calculate comprehensive stats - use today's appointments for stats
  const todayAppointmentsList = useMemo(() => {
    return appointmentsByDate.today || [];
  }, [appointmentsByDate]);

  const stats = useMemo(() => {
    // For stats, we need to check all appointments (not just confirmed) to show pending
    const allTodayAppointments = appointments.filter((apt: any) => {
      if (!apt.date && !apt.dateObj) return false;
      const aptDate = apt.dateObj || new Date(apt.date);
      const today = new Date();
      aptDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return aptDate.getTime() === today.getTime();
    });
    
    const today = allTodayAppointments;
    const confirmed = today.filter((apt: any) => apt.status === 'confirmed').length;
    const pending = today.filter((apt: any) => apt.status === 'pending').length;
    const completed = today.filter((apt: any) => apt.status === 'completed').length;
    const cancelled = today.filter((apt: any) => apt.status === 'cancelled').length;
    
    // Check-ins: appointments that are confirmed and have been checked in (status might be 'checked-in' or similar)
    const checkedIn = today.filter((apt: any) => 
      apt.status === 'confirmed' || apt.status === 'checked-in' || apt.status === 'attended'
    ).length;

    return {
      totalAppointments: appointments.length,
      todayAppointments: today.length,
      pendingAppointments: pending,
      confirmedAppointments: confirmed,
      completedAppointments: completed,
      cancelledAppointments: cancelled,
      checkedInAppointments: checkedIn,
      walkInPatients: walkInPatients.length,
      totalPatients: new Set(appointments.map((apt: any) => apt.patient)).size,
      noShowAppointments: 0, // TODO: Calculate based on missed appointments
      pendingPayments: 0, // TODO: Add payment tracking
    };
  }, [appointments, walkInPatients]);

  const handlePatientSearch = useCallback(
    (searchTerm: string) => {
      if (patientSearchTimeoutRef.current) {
        window.clearTimeout(patientSearchTimeoutRef.current);
      }

      const trimmed = searchTerm.trim();
      if (trimmed.length < 2) {
        setPatientOptions([]);
        setPatientSearchLoading(false);
        return;
      }

      setPatientSearchLoading(true);
      patientSearchTimeoutRef.current = window.setTimeout(async () => {
        try {
          const token = localStorage.getItem('auth-token');
          const response = await fetch(`/api/reception/patients/search?q=${encodeURIComponent(trimmed)}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            throw new Error('Failed to search patients');
          }
          const data = await response.json();
          setPatientOptions(data || []);
        } catch (error) {
          console.error('❌ Patient search error:', error);
        } finally {
          setPatientSearchLoading(false);
        }
      }, 300);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (patientSearchTimeoutRef.current) {
        window.clearTimeout(patientSearchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (dateMode === 'today') {
      walkInForm.setFieldsValue({
        appointmentDate: dayjs(),
        appointmentStartTime: dayjs().hour(9).minute(0),
      });
    } else if (dateMode === 'tomorrow') {
      walkInForm.setFieldsValue({
        appointmentDate: dayjs().add(1, 'day'),
        appointmentStartTime: dayjs().hour(9).minute(0),
      });
    }
  }, [dateMode, walkInForm]);

  const computedEndTime = useMemo(() => {
    if (!appointmentStartTimeValue) return null;
    const duration = durationMinutesValue || 30;
    return (appointmentStartTimeValue as Dayjs).add(duration, 'minute');
  }, [appointmentStartTimeValue, durationMinutesValue]);

  const timeRangeLabel = useMemo(() => {
    const start = appointmentStartTimeValue as Dayjs | undefined;
    if (!start || !computedEndTime) return '';
    return `${start.format('hh:mm A')} - ${computedEndTime.format('hh:mm A')}`;
  }, [appointmentStartTimeValue, computedEndTime]);

  const patientNameOptions = useMemo(
    () =>
      patientOptions.map((option) => ({
        value: option.fullName,
        label: (
          <div>
            <div style={{ fontWeight: 600 }}>{option.fullName}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{option.mobileNumber}</div>
          </div>
        ),
        data: option,
      })),
    [patientOptions]
  );

  const patientMobileOptions = useMemo(
    () =>
      patientOptions.map((option) => ({
        value: option.mobileNumber,
        label: (
          <div>
            <div style={{ fontWeight: 600 }}>{option.mobileNumber}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{option.fullName}</div>
          </div>
        ),
        data: option,
      })),
    [patientOptions]
  );

  const doctorOptions = useMemo(() => {
    const grouped: Record<string, Array<{ label: string; value: number }>> = {};
    (doctors || []).forEach((doc: any) => {
      const specialty = doc.specialty || 'General';
      if (!grouped[specialty]) {
        grouped[specialty] = [];
      }
      grouped[specialty].push({
        label: doc.fullName,
        value: doc.id,
      });
    });
    return Object.entries(grouped).map(([specialty, options]) => ({
      label: specialty,
      options,
    }));
  }, [doctors]);

  const renderAppointmentMeta = (patient: any) => {
    const dateLabel = patient.appointmentDate ? dayjs(patient.appointmentDate).format('DD MMM YYYY') : 'Today';
    return (
      <Space direction="vertical" size={4}>
        <Space size="small" wrap>
          <Tag color="blue">{patient.doctorName}</Tag>
          <Tag color="orange">{patient.status?.toUpperCase()}</Tag>
          {patient.timeSlot && <Tag color="geekblue">{patient.timeSlot}</Tag>}
          <Tag color="purple">{dateLabel}</Tag>
        </Space>
        <Text type="secondary">
          {(patient.timeSlot || patient.appointmentTime) ? `${patient.timeSlot || patient.appointmentTime} • ` : ''}
          {patient.reason || 'Walk-in consultation'}
        </Text>
        <Text type="secondary">{patient.patientPhone}</Text>
      </Space>
    );
  };

  // NOW CHECK AUTHENTICATION AND ROLE (after all hooks)
  if (isLoading) {
    console.log('⏳ Receptionist Dashboard - Auth loading...');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
        <Text type="secondary" style={{ marginTop: 16 }}>Loading...</Text>
      </div>
    );
  }

  if (!user) {
    console.log('❌ Receptionist Dashboard - No user found, redirecting to login');
    return <Redirect to="/login" />;
  }
  
  console.log('✅ Receptionist Dashboard - User found:', user);

  const userRole = user.role?.toUpperCase();
  console.log('🔍 Receptionist Dashboard - User role:', userRole, 'Full user:', user);
  
  if (userRole !== 'RECEPTIONIST') {
    console.warn('⚠️ User does not have RECEPTIONIST role. Current role:', userRole);
    message.warning('You do not have access to this dashboard');
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

  // Get appointment status with better labels
  const getStatusConfig = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      pending: { color: 'orange', label: 'WAITING' },
      confirmed: { color: 'blue', label: 'CONFIRMED' },
      'checked-in': { color: 'cyan', label: 'IN CONSULTATION' },
      attended: { color: 'cyan', label: 'IN CONSULTATION' },
      completed: { color: 'green', label: 'COMPLETED' },
      cancelled: { color: 'red', label: 'CANCELLED' },
    };
    return statusConfig[status.toLowerCase()] || { color: 'default', label: status.toUpperCase() };
  };

  // Check if appointment is overdue
  const isAppointmentOverdue = (appointment: any) => {
    if (!appointment.date || appointment.status === 'completed' || appointment.status === 'cancelled') {
      return false;
    }
    try {
      const aptDate = new Date(appointment.date);
      const now = new Date();
      // If appointment time has passed and status is still pending or confirmed
      if (aptDate < now && (appointment.status === 'pending' || appointment.status === 'confirmed')) {
        return true;
      }
    } catch (error) {
      return false;
    }
    return false;
  };

  const appointmentColumns = [
    {
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
      render: (text: string, record: any) => (
        <Space>
          <Text strong={isAppointmentOverdue(record)}>{text}</Text>
          {isAppointmentOverdue(record) && (
            <Tag color="red" style={{ margin: 0 }}>OVERDUE</Tag>
          )}
        </Space>
      ),
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
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.label}</Tag>;
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
              type="default"
              onClick={() => handleCheckIn(record.id)}
            >
              Check-in
            </Button>
          )}
          
          {/* Call button - available for all statuses */}
          <Button 
            size="small"
            type="link"
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
      key: 'contacts',
      icon: <PhoneOutlined />,
      label: 'Contact Directory',
    },
  ];

  const siderWidth = isMobile ? 0 : (collapsed ? 80 : 260);

  // Sidebar content component (reusable for drawer and sider)
  const SidebarContent = ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <>
      <div style={{ 
        padding: '16px', 
        textAlign: 'center',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <TeamOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
        {(!collapsed || isMobile) && (
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
        onClick={onMenuClick}
      />
      <SidebarProfile
        collapsed={collapsed && !isMobile}
        name={user?.fullName || 'Receptionist'}
        roleLabel="RECEPTIONIST"
        roleColor="#F97316"
        avatarIcon={<TeamOutlined />}
        onSettingsClick={() => message.info('Profile settings coming soon.')}
        onLogoutClick={logout}
      />
    </>
  );

  const handleWalkInSubmit = async (values: any) => {
    try {
      setIsWalkInSubmitting(true);
      const token = localStorage.getItem('auth-token');
      const appointmentDateValue = values.appointmentDate as Dayjs | undefined;
      const appointmentStartTime = values.appointmentStartTime as Dayjs | undefined;

      const trimmedReason = values.reason?.trim();
      const trimmedNotes = values.notes?.trim();

      const payload = {
        fullName: values.fullName,
        mobileNumber: values.mobileNumber,
        doctorId: values.doctorId,
        reason: trimmedReason || undefined,
        priority: values.priority,
        notes: trimmedNotes ? trimmedNotes : undefined,
        appointmentDate: appointmentDateValue ? appointmentDateValue.format('YYYY-MM-DD') : undefined,
        startTime: appointmentStartTime ? appointmentStartTime.format('HH:mm') : undefined,
        durationMinutes: Number(values.durationMinutes) || 30,
      };

      const response = await fetch('/api/reception/walkins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json();

      if (!response.ok) {
        console.error('❌ Walk-in registration failed:', responseBody);
        message.error(responseBody?.message || 'Failed to register walk-in patient');
        return;
      }

      message.success('Walk-in patient registered successfully');
      walkInForm.resetFields();
      walkInForm.setFieldsValue({
        priority: 'normal',
        appointmentDate: dayjs(),
        appointmentStartTime: dayjs().hour(9).minute(0),
        durationMinutes: 30,
      });
      setDateMode('today');
      setPatientOptions([]);
      setIsWalkInModalOpen(false);

      await Promise.all([refetchWalkIns(), refetchAppointments()]);

      window.localStorage.setItem('appointment-updated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('appointment-updated'));
    } catch (error) {
      console.error('❌ Error registering walk-in patient:', error);
      message.error('Failed to register walk-in patient. Please try again.');
    } finally {
      setIsWalkInSubmitting(false);
    }
  };

  const closeWalkInModal = () => {
    setIsWalkInModalOpen(false);
    walkInForm.resetFields();
    walkInForm.setFieldsValue({
      priority: 'normal',
      appointmentDate: dayjs(),
      appointmentStartTime: dayjs().hour(9).minute(0),
      durationMinutes: 30,
    });
    setDateMode('today');
    setPatientOptions([]);
    if (patientSearchTimeoutRef.current) {
      window.clearTimeout(patientSearchTimeoutRef.current);
    }
  };
  const openWalkInModal = () => {
    setIsWalkInModalOpen(true);
    setDateMode('today');
    walkInForm.setFieldsValue({
      priority: 'normal',
      appointmentDate: dayjs(),
      appointmentStartTime: dayjs().hour(9).minute(0),
      durationMinutes: 30,
    });
  };

  const handlePatientOptionSelect = (_value: string, option: any) => {
    const data = option?.data as { fullName: string; mobileNumber: string } | undefined;
    if (!data) return;
    walkInForm.setFieldsValue({
      fullName: data.fullName,
      mobileNumber: data.mobileNumber,
    });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
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
            background: '#fff',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
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
          background: receptionistTheme.background,
          transition: 'margin-left 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            background: receptionistTheme.background,
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
                  { label: "Pending Confirmation", value: stats.pendingAppointments || 0, icon: <ClockCircleOutlined style={{ color: receptionistTheme.primary }} />, trendLabel: "Awaiting action", trendType: (stats.pendingAppointments > 0 ? "negative" : "neutral") as const, onView: () => message.info('View pending appointments') },
                  { label: "Confirmed Today", value: stats.confirmedAppointments || 0, icon: <CheckCircleOutlined style={{ color: receptionistTheme.accent }} />, trendLabel: "Ready", trendType: "positive" as const, onView: () => message.info('View confirmed appointments') },
                  { label: "Walk-ins Waiting", value: stats.walkInPatients || 0, icon: <UserAddOutlined style={{ color: receptionistTheme.secondary }} />, trendLabel: "In queue", trendType: (stats.walkInPatients > 0 ? "negative" : "neutral") as const, onView: () => message.info('View walk-in patients') },
                  { label: "Check-ins Completed", value: stats.checkedInAppointments || 0, icon: <TeamOutlined style={{ color: '#16a34a' }} />, trendLabel: "Today", trendType: "positive" as const, onView: () => message.info('View checked-in patients') },
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
                    label="Pending Confirmation"
                    value={stats.pendingAppointments || 0}
                    icon={<ClockCircleOutlined style={{ color: receptionistTheme.primary }} />}
                    trendLabel="Awaiting action"
                    trendType={stats.pendingAppointments > 0 ? "negative" : "neutral"}
                    onView={() => message.info('View pending appointments')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <KpiCard
                    label="Confirmed Today"
                    value={stats.confirmedAppointments || 0}
                    icon={<CheckCircleOutlined style={{ color: receptionistTheme.accent }} />}
                    trendLabel="Ready"
                    trendType="positive"
                    onView={() => message.info('View confirmed appointments')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <KpiCard
                    label="Walk-ins Waiting"
                    value={stats.walkInPatients || 0}
                    icon={<UserAddOutlined style={{ color: receptionistTheme.secondary }} />}
                    trendLabel="In queue"
                    trendType={stats.walkInPatients > 0 ? "negative" : "neutral"}
                    onView={() => message.info('View walk-in patients')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <KpiCard
                    label="Check-ins Completed"
                    value={stats.checkedInAppointments || 0}
                    icon={<TeamOutlined style={{ color: '#16a34a' }} />}
                    trendLabel="Today"
                    trendType="positive"
                    onView={() => message.info('View checked-in patients')}
                  />
                </Col>
              </Row>
            )}

          {/* Quick Actions */}
          <Card variant="borderless" style={{ marginBottom: 24, borderRadius: 16 }} bodyStyle={{ padding: isMobile ? 16 : 20 }}>
            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <QuickActionTile
                  label="Create Appointment"
                  icon={<CalendarOutlined />}
                  onClick={() => setIsBookingModalOpen(true)}
                />
                <QuickActionTile
                  label="Walk-in Registration"
                  icon={<UserAddOutlined />}
                  onClick={openWalkInModal}
                />
                <QuickActionTile
                  label="Check-in Patient"
                  icon={<CheckCircleOutlined />}
                  onClick={() => message.info('Select an appointment to check-in')}
                />
                <QuickActionTile
                  label="Record Payment"
                  icon={<FileTextOutlined />}
                  onClick={() => message.info('Payment recording coming soon')}
                />
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Create Appointment"
                    icon={<CalendarOutlined />}
                    onClick={() => setIsBookingModalOpen(true)}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Walk-in Registration"
                    icon={<UserAddOutlined />}
                    onClick={openWalkInModal}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Check-in Patient"
                    icon={<CheckCircleOutlined />}
                    onClick={() => message.info('Select an appointment to check-in')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Record Payment"
                    icon={<FileTextOutlined />}
                    onClick={() => message.info('Payment recording coming soon')}
                  />
                </Col>
              </Row>
            )}
          </Card>

          <Row gutter={[16, 16]}>
            {/* Upcoming Appointments */}
            <Col xs={24} lg={16}>
              <Card 
                variant="borderless"
                style={{ borderRadius: 16 }}
                title="Upcoming Appointments" 
                extra={<Button type="link" onClick={() => message.info('View all appointments feature coming soon')}>View All</Button>}
              >
                {appointmentTabs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">
                      {appointments.length === 0
                        ? 'No appointments found. Waiting for patients to book appointments.'
                        : `No confirmed appointments scheduled. ${appointments.filter((a: any) => a.status === 'pending').length} pending confirmation.`}
                    </Text>
                  </div>
                ) : (
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
                )}
              </Card>
            </Col>

            {/* Walk-in Patients & Queue Status */}
            <Col xs={24} lg={8}>
              <Card title="Walk-in Patients">
                <List
                  dataSource={walkInPatients}
                  loading={walkInLoading}
                  locale={{ emptyText: 'No walk-in registrations yet' }}
                  renderItem={(patient: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space size="small">
                            <Text strong>{patient.patientName}</Text>
                            <Tag color={patient.priority === 'high' || patient.priority === 'urgent' ? 'red' : 'purple'}>
                              {patient.priority?.toUpperCase() || 'NORMAL'}
                            </Tag>
                          </Space>
                        }
                        description={renderAppointmentMeta(patient)}
                      />
                    </List.Item>
                  )}
                />
              </Card>

              <Card variant="borderless" style={{ borderRadius: 16, marginTop: '16px' }}>
                <Title level={5} style={{ marginBottom: 12 }}>Queue Status</Title>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text type="secondary">Waiting</Text>
                      <Text strong>{stats.pendingAppointments || 0}</Text>
                    </div>
                    <Progress 
                      percent={stats.todayAppointments > 0 ? Math.round((stats.pendingAppointments / stats.todayAppointments) * 100) : 0}
                      strokeColor={receptionistTheme.primary}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text type="secondary">In Consultation</Text>
                      <Text strong>{stats.confirmedAppointments || 0}</Text>
                    </div>
                    <Progress 
                      percent={stats.todayAppointments > 0 ? Math.round((stats.confirmedAppointments / stats.todayAppointments) * 100) : 0}
                      strokeColor={receptionistTheme.secondary}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text type="secondary">Completed</Text>
                      <Text strong>{stats.completedAppointments || 0}</Text>
                    </div>
                    <Progress 
                      percent={stats.todayAppointments > 0 ? Math.round((stats.completedAppointments / stats.todayAppointments) * 100) : 0}
                      strokeColor={receptionistTheme.accent}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {stats.completedAppointments || 0} of {stats.todayAppointments || 0} completed today
                  </Text>
                </Space>
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

          <Modal
            title="Register Walk-in Patient"
            open={isWalkInModalOpen}
            onCancel={closeWalkInModal}
            onOk={() => walkInForm.submit()}
            confirmLoading={isWalkInSubmitting}
            okText="Register Walk-in"
            width={760}
            styles={{ body: { padding: '24px 32px' } }}
          >
            <Form
              layout="vertical"
              form={walkInForm}
              onFinish={handleWalkInSubmit}
              initialValues={{
                priority: 'normal',
                appointmentDate: dayjs(),
                appointmentStartTime: dayjs().hour(9).minute(0),
                durationMinutes: 30,
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Patient Name"
                    name="fullName"
                    rules={[{ required: true, message: 'Please enter the patient name' }]}
                  >
                    <AutoComplete
                      options={patientNameOptions}
                      onSearch={handlePatientSearch}
                      onSelect={handlePatientOptionSelect}
                      notFoundContent={patientSearchLoading ? 'Searching...' : null}
                      placeholder="Search or enter patient name"
                      filterOption={false}
                    >
                      <Input />
                    </AutoComplete>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Mobile Number"
                    name="mobileNumber"
                    rules={[
                      { required: true, message: 'Please enter mobile number' },
                      { min: 10, message: 'Enter a valid mobile number' },
                    ]}
                  >
                    <AutoComplete
                      options={patientMobileOptions}
                      onSearch={handlePatientSearch}
                      onSelect={handlePatientOptionSelect}
                      notFoundContent={patientSearchLoading ? 'Searching...' : null}
                      placeholder="Search or enter mobile number"
                      filterOption={false}
                    >
                      <Input />
                    </AutoComplete>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Assign Doctor"
                    name="doctorId"
                    rules={[{ required: true, message: 'Select a doctor' }]}
                  >
                    <Select
                      placeholder="Select doctor"
                      loading={doctorsLoading}
                      options={doctorOptions}
                      optionFilterProp="label"
                      showSearch
                      allowClear
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Visit Reason (optional)"
                    name="reason"
                  >
                    <Input placeholder="Reason for visit (optional)" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={8}>
                  <Form.Item label="Date" required>
                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                      <Segmented
                        options={[
                          { label: 'Today', value: 'today' },
                          { label: 'Tomorrow', value: 'tomorrow' },
                          { label: 'Pick a date', value: 'custom' },
                        ]}
                        value={dateMode}
                        onChange={(value) => setDateMode(value as 'today' | 'tomorrow' | 'custom')}
                        block
                      />
                      <Form.Item
                        name="appointmentDate"
                        rules={[{ required: true, message: 'Select appointment date' }]}
                        noStyle
                      >
                        <DatePicker
                          disabled={dateMode !== 'custom'}
                          style={{ width: '100%' }}
                          format="DD MMM YYYY"
                          disabledDate={(current) => !!current && current < dayjs().startOf('day')}
                        />
                      </Form.Item>
                    </Space>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="From"
                    name="appointmentStartTime"
                    rules={[{ required: true, message: 'Select start time' }]}
                  >
                    <TimePicker
                      format="hh:mm A"
                      use12Hours
                      minuteStep={15}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="To">
                    <Input
                      value={computedEndTime ? computedEndTime.format('hh:mm A') : ''}
                      disabled
                      placeholder="Auto-calculated"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Duration" style={{ marginBottom: 20 }}>
                <Segmented
                  options={[
                    { label: '15 min', value: 15 },
                    { label: '30 min', value: 30 },
                    { label: '60 min', value: 60 },
                  ]}
                  value={durationMinutesValue || 30}
                  onChange={(value) => walkInForm.setFieldsValue({ durationMinutes: Number(value) })}
                  block
                />
                <Form.Item name="durationMinutes" noStyle />
                {timeRangeLabel && (
                  <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
                    Slot: {timeRangeLabel}
                  </Text>
                )}
              </Form.Item>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Priority" name="priority">
                    <Select
                      options={[
                        { value: 'normal', label: 'Normal' },
                        { value: 'high', label: 'High' },
                        { value: 'urgent', label: 'Urgent' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item label="Notes" name="notes">
                    <Input.TextArea rows={2} placeholder="Additional notes (optional)" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Modal>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}