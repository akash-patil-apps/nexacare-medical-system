import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
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
  List,
} from 'antd';
import { 
  CalendarOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
  MenuUnfoldOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { ReceptionistSidebar } from '../../components/layout/ReceptionistSidebar';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { formatTimeSlot12h } from '../../lib/time';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const receptionistTheme = {
  primary: '#F97316', // Orange
  secondary: '#6366F1', // Indigo
  accent: '#22C55E', // Green
  background: '#F3F4F6', // Light grey (matching patient dashboard)
  highlight: '#FFEAD5', // Lighter orange
};

export default function ReceptionistDashboard() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedMenuKey] = useState<string>('dashboard');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isWalkInSubmitting, setIsWalkInSubmitting] = useState(false);
  const [walkInForm] = Form.useForm();
  const [patientOptions, setPatientOptions] = useState<Array<{ userId: number; patientId: number | null; fullName: string; mobileNumber: string }>>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [dateMode, setDateMode] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<string>('today');
  const [patientInfoDrawerOpen, setPatientInfoDrawerOpen] = useState(false);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [patientInfoLoading, setPatientInfoLoading] = useState(false);
  const patientSearchTimeoutRef = useRef<number | undefined>(undefined);
  const appointmentStartTimeValue = Form.useWatch('appointmentStartTime', walkInForm);
  const durationMinutesValue = Form.useWatch('durationMinutes', walkInForm);


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
          patientId: apt.patientId || apt.patient_id,
          patient: apt.patientName || 'Unknown Patient',
          doctor: apt.doctorName || 'Unknown Doctor',
          time: apt.timeSlot || apt.appointmentTime || 'N/A',
          status: apt.status || 'pending',
          department: apt.doctorSpecialty || 'General',
          phone: apt.patientPhone || 'N/A',
          type: apt.type || 'online',
          paymentStatus: apt.paymentStatus || null,
          date: apt.appointmentDate,
          dateObj: appointmentDate,
        };
      });
      console.log('✅ Transformed appointments - statuses:', transformed.map((t: any) => `${t.patient}: ${t.status}`));
      return transformed;
    },
    enabled: !!user && user.role?.toUpperCase() === 'RECEPTIONIST',
    refetchInterval: 3000, // Refetch every 3 seconds for faster updates
    // If the receptionist tab is in background, keep polling so it updates without manual refresh.
    refetchIntervalInBackground: true,
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

  const { data: walkInPatients = [], refetch: refetchWalkIns } = useQuery({
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

  // Get notifications for receptionist
  const { data: notifications = [] } = useQuery({
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
    enabled: !!user,
    refetchInterval: 15000,
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
  // Pending appointments should ALWAYS be visible (even if the slot time has already passed) so they can be confirmed.
  const futureAppointments = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
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
          
          // Compute day-only for past-day logic
          const appointmentDay = new Date(appointmentDateTime);
          appointmentDay.setHours(0, 0, 0, 0);
          
          // If appointment day is before today and still pending, hide from Upcoming table
          if (apt.status === 'pending' && appointmentDay < todayStart) {
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


  // Completed appointments for today (for receptionist visibility)
  const completedTodayAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointments.filter((apt: any) => {
      const status = (apt.status || '').toLowerCase();
      if (status !== 'completed') return false;
      if (!apt.date && !apt.dateObj) return false;
      const d = apt.dateObj || new Date(apt.date);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
  }, [appointments]);

  // Get appointments for active tab (only future appointments)
  const appointmentsToShow = useMemo(() => {
    if (activeAppointmentTab === 'completed') {
      return completedTodayAppointments;
    }
    if (activeAppointmentTab === 'today') {
      return appointmentsByDate.today || [];
    } else if (activeAppointmentTab === 'tomorrow') {
      return appointmentsByDate.tomorrow || [];
    } else {
      return appointmentsByDate[activeAppointmentTab] || [];
    }
  }, [activeAppointmentTab, appointmentsByDate, completedTodayAppointments]);

  // Generate tab items for appointments (only future appointments) + completed today
  const appointmentTabs = useMemo(() => {
    const tabs: Array<{ key: string; label: string; count: number }> = [];
    
    // Today tab (first)
    if (appointmentsByDate.today && appointmentsByDate.today.length > 0) {
      tabs.push({
        key: 'today',
        label: `Today (${appointmentsByDate.today.length})`,
        count: appointmentsByDate.today.length,
      });
    }

    // Completed Today tab (after Today)
    if (completedTodayAppointments.length > 0) {
      tabs.push({
        key: 'completed',
        label: `Completed Today (${completedTodayAppointments.length})`,
        count: completedTodayAppointments.length,
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
  }, [appointmentsByDate, completedTodayAppointments.length]);

  // Update active tab if current tab has no appointments
  useEffect(() => {
    if (appointmentTabs.length > 0 && !appointmentTabs.find(tab => tab.key === activeAppointmentTab)) {
      setActiveAppointmentTab(appointmentTabs[0].key);
    } else if (appointmentTabs.length === 0) {
      setActiveAppointmentTab('today');
    }
  }, [appointmentTabs, activeAppointmentTab]);

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
    
    // Check-ins: appointments that have been checked in (status is 'checked-in' or 'attended')
    // Note: 'confirmed' means appointment is confirmed but patient hasn't arrived yet
    const checkedIn = today.filter((apt: any) => 
      apt.status === 'checked-in' || apt.status === 'attended' || apt.status === 'in_consultation'
    ).length;
    
    // Waiting: appointments that are confirmed but not yet checked in
    const waiting = today.filter((apt: any) => 
      apt.status === 'confirmed' && apt.status !== 'checked-in' && apt.status !== 'attended' && apt.status !== 'in_consultation'
    ).length;

    const unreadNotifications = notifications.filter((notif: any) => !notif.read).length;

    return {
      totalAppointments: appointments.length,
      todayAppointments: today.length,
      pendingAppointments: pending,
      confirmedAppointments: confirmed,
      completedAppointments: completed,
      cancelledAppointments: cancelled,
      checkedInAppointments: checkedIn,
      waitingAppointments: waiting,
      walkInPatients: walkInPatients.length,
      totalPatients: new Set(appointments.map((apt: any) => apt.patient)).size,
      noShowAppointments: 0, // TODO: Calculate based on missed appointments
      pendingPayments: 0, // TODO: Add payment tracking
      unreadNotifications,
    };
  }, [appointments, walkInPatients, notifications]);

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

  // Handle view patient info
  const handleViewPatientInfo = async (patientId: number) => {
    if (!patientId) {
      message.warning('Patient ID not available');
      return;
    }
    setPatientInfoLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/reception/patients/${patientId}/info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch patient information');
      }
      const data = await response.json();
      setPatientInfo(data);
      setPatientInfoDrawerOpen(true);
    } catch (error) {
      console.error('❌ Error loading patient info:', error);
      message.error('Failed to load patient information');
    } finally {
      setPatientInfoLoading(false);
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

  // Get booking source label
  const getSourceConfig = (type?: string | null) => {
    const normalized = (type || 'online').toLowerCase();
    if (normalized === 'walk-in' || normalized === 'walkin') {
      return { color: 'purple', label: 'Walk-in' };
    }
    return { color: 'blue', label: 'Online' };
  };

  // Get payment status label
  const getPaymentConfig = (paymentStatus?: string | null) => {
    const normalized = (paymentStatus || '').toLowerCase();
    if (normalized === 'paid') {
      return { color: 'green', label: 'Paid' };
    }
    if (normalized === 'partial') {
      return { color: 'gold', label: 'Partial' };
    }
    if (normalized === 'unpaid' || normalized === 'pending') {
      return { color: 'red', label: 'Not Paid' };
    }
    // Default when we don't yet track payments
    return { color: 'default', label: 'Not Recorded' };
  };

  // Check if appointment is overdue
  const isAppointmentOverdue = (appointment: any) => {
    if (!appointment.date || appointment.status === 'completed' || appointment.status === 'cancelled') {
      return false;
    }
    try {
      const now = new Date();
      const appointmentDateTime = appointment.dateObj || new Date(appointment.date);
      if (isNaN(appointmentDateTime.getTime())) {
        return false;
      }
      
      // Parse start time from timeSlot/time field if present
      const timeStr = (appointment.time || appointment.timeSlot || '').trim();
      let appointmentTime = new Date(appointmentDateTime);
      
      if (timeStr) {
        // Parse time string (e.g., "02:30", "02:30-03:00", "02:30 PM", "14:30")
        const startPart = timeStr.includes('-') ? timeStr.split('-')[0].trim() : timeStr;
        const timeMatch = startPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const period = timeMatch[3]?.toUpperCase();
          
          // Handle 12-hour format with AM/PM
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;

          // Legacy convention: "02:00-05:00" slots represent AFTERNOON when AM/PM is missing
          if (!period && hours >= 2 && hours <= 5) {
            hours += 12;
          }
          
          appointmentTime.setHours(hours, minutes, 0, 0);
        } else if (startPart.includes(':')) {
          const parts = startPart.split(':');
          if (parts.length >= 2) {
            let hours = parseInt(parts[0]) || 9;
            const minutes = parseInt(parts[1]) || 0;
            if (hours >= 2 && hours <= 5) {
              hours += 12;
            }
            appointmentTime.setHours(hours, minutes, 0, 0);
          }
        }
      } else {
        // No time info; treat date-only as not overdue
        return false;
      }
      
      // If appointment time has passed and status is still pending or confirmed
      if (appointmentTime < now && (appointment.status === 'pending' || appointment.status === 'confirmed')) {
        return true;
      }
    } catch (error) {
      return false;
    }
    return false;
  };

  const renderMobileAppointmentCard = (record: any) => {
    const config = getStatusConfig(record.status || '');
    const overdue = isAppointmentOverdue(record);

    const dateLabel = (() => {
      if (!record.dateObj && !record.date) return 'N/A';
      const date = record.dateObj || new Date(record.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const appointmentDate = new Date(date);
      appointmentDate.setHours(0, 0, 0, 0);

      if (appointmentDate.getTime() === today.getTime()) return 'Today';
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (appointmentDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
      return dayjs(date).format('DD MMM YYYY');
    })();

    return (
      <Card
        key={record.id}
        size="small"
        variant="borderless"
        style={{
          borderRadius: 16,
          border: overdue ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
        bodyStyle={{ padding: 14 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Button
              type="link"
              style={{ padding: 0, height: 'auto', fontSize: 14, fontWeight: 600 }}
              onClick={() => record.patientId && handleViewPatientInfo(record.patientId)}
            >
              {record.patient || 'Unknown Patient'}
            </Button>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.4 }}>
              {record.doctor || 'Unknown Doctor'}
            </Text>
          </div>

          <Space size={6} wrap style={{ justifyContent: 'flex-end' }}>
            {overdue && (
              <Tag color="red" style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>
                OVERDUE
              </Tag>
            )}
            <Tag color={config.color} style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>
              {config.label}
            </Tag>
          </Space>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dateLabel} • <span style={{ fontFamily: 'monospace' }}>{record.time ? formatTimeSlot12h(record.time) : 'N/A'}</span>
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.department || 'General'}
          </Text>
        </div>

        <div style={{ marginTop: 12 }}>
          <Space size={6} wrap>
            {record.status === 'pending' && (
              <Button
                size="small"
                type="primary"
                onClick={() => handleConfirmAppointment(record.id)}
              >
                Confirm
              </Button>
            )}
            {record.status === 'confirmed' && (
              <Button
                size="small"
                type="default"
                onClick={() => handleCheckIn(record.id)}
              >
                Check-in
              </Button>
            )}
            <Button
              size="small"
              type="link"
              icon={<PhoneOutlined />}
              onClick={() => handleCall(record.phone)}
            >
              Call
            </Button>
          </Space>
        </div>
      </Card>
    );
  };

  const appointmentColumns = [
    {
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
      render: (text: string, record: any) => (
        <Space>
          <Button
            type="link"
            style={{ padding: 0, height: 'auto' }}
            onClick={() => record.patientId && handleViewPatientInfo(record.patientId)}
          >
            <Text strong={isAppointmentOverdue(record)}>{text}</Text>
          </Button>
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
      render: (time: string) => (time ? formatTimeSlot12h(time) : 'N/A'),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Source',
      dataIndex: 'type',
      key: 'type',
      render: (_: any, record: any) => {
        const config = getSourceConfig(record.type);
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (_: any, record: any) => {
        const config = getPaymentConfig(record.paymentStatus);
        return <Tag color={config.color}>{config.label}</Tag>;
      },
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
      render: (record: any) => {
        // Check if appointment is in the past
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        
        let isPast = false;
        if (record.dateObj || record.date) {
          try {
            const appointmentDateTime = record.dateObj || new Date(record.date);
            if (!isNaN(appointmentDateTime.getTime())) {
              const appointmentDay = new Date(appointmentDateTime);
              appointmentDay.setHours(0, 0, 0, 0);
              isPast = appointmentDay < todayStart;
            }
          } catch (error) {
            console.error('Error checking if appointment is past:', error);
          }
        }
        
        // Don't show actions for past appointments
        if (isPast) {
          return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
        }
        
          return (
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
          );
      },
    },
  ];

  const siderWidth = isMobile ? 0 : 260;

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
    <>
      <style>{`
        /* Override medical-container padding only when receptionist dashboard is rendered */
        body:has(.receptionist-dashboard-wrapper) .medical-container {
          padding: 0 !important;
          display: block !important;
          align-items: unset !important;
          justify-content: unset !important;
          background: transparent !important;
          min-height: 100vh !important;
        }
        
        .receptionist-dashboard-menu .ant-menu-item {
          border-radius: 12px !important;
          margin: 4px 8px !important;
          height: 48px !important;
          line-height: 48px !important;
          transition: all 0.3s ease !important;
          padding-left: 16px !important;
          background: transparent !important;
          border: none !important;
        }
        .receptionist-dashboard-menu .ant-menu-item:hover {
          background: transparent !important;
        }
        .receptionist-dashboard-menu .ant-menu-item:hover,
        .receptionist-dashboard-menu .ant-menu-item:hover .ant-menu-title-content {
          color: #595959 !important;
        }
        .receptionist-dashboard-menu .ant-menu-item-selected {
          background: #1A8FE3 !important;
          font-weight: 500 !important;
          border: none !important;
          padding-left: 16px !important;
        }
        .receptionist-dashboard-menu .ant-menu-item-selected,
        .receptionist-dashboard-menu .ant-menu-item-selected .ant-menu-title-content {
          color: #fff !important;
        }
        .receptionist-dashboard-menu .ant-menu-item-selected .ant-menu-item-icon,
        .receptionist-dashboard-menu .ant-menu-item-selected .anticon,
        .receptionist-dashboard-menu .ant-menu-item-selected img {
          color: #fff !important;
        }
        .receptionist-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) {
          color: #8C8C8C !important;
          background: transparent !important;
        }
        .receptionist-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-title-content {
          color: #8C8C8C !important;
        }
        .receptionist-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-item-icon,
        .receptionist-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .anticon,
        .receptionist-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) img {
          color: #8C8C8C !important;
        }
        .receptionist-dashboard-menu .ant-menu-item-selected::after {
          display: none !important;
        }
        .receptionist-dashboard-menu .ant-menu-item-icon,
        .receptionist-dashboard-menu .anticon {
          font-size: 18px !important;
          width: 18px !important;
          height: 18px !important;
        }
        /* Pending appointments row highlight */
        .receptionist-dashboard-wrapper .appointment-row-pending td {
          background: #FEF2F2 !important; /* light red */
        }
      `}</style>
      <Layout className="receptionist-dashboard-wrapper" style={{ minHeight: '100vh', background: receptionistTheme.background }}>
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
          <ReceptionistSidebar selectedMenuKey={selectedMenuKey} />
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
          <ReceptionistSidebar selectedMenuKey={selectedMenuKey} onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: receptionistTheme.background,
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            background: receptionistTheme.background,
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
            
          {/* KPI Cards - Matching Patient Dashboard Design */}
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
                  { label: "Pending Confirmation", value: stats.pendingAppointments || 0, icon: <ClockCircleOutlined />, trendLabel: "Awaiting action", trendColor: "#F97316", trendBg: "#FFEAD5", onView: () => message.info('View pending appointments') },
                  { label: "Confirmed Today", value: stats.confirmedAppointments || 0, icon: <CheckCircleOutlined />, trendLabel: "Ready", trendColor: "#22C55E", trendBg: "#D1FAE5", onView: () => message.info('View confirmed appointments') },
                  { label: "Walk-ins Waiting", value: stats.walkInPatients || 0, icon: <UserAddOutlined />, trendLabel: "In queue", trendColor: "#6366F1", trendBg: "#E0E7FF", onView: () => message.info('View walk-in patients') },
                  { label: "Check-ins Completed", value: stats.checkedInAppointments || 0, icon: <TeamOutlined />, trendLabel: "Today", trendColor: "#16a34a", trendBg: "#D1FAE5", onView: () => message.info('View checked-in patients') },
                ].map((kpi, idx) => (
                  <div key={idx} style={{ minWidth: 220, scrollSnapAlign: 'start' }}>
                    <KpiCard {...kpi} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 16, marginBottom: 24, width: '100%' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <KpiCard
                    label="Pending Confirmation"
                    value={stats.pendingAppointments || 0}
                    icon={<ClockCircleOutlined />}
                    trendLabel="Awaiting action"
                    trendType={stats.pendingAppointments > 0 ? "negative" : "neutral"}
                    trendColor="#F97316"
                    trendBg="#FFEAD5"
                    onView={() => message.info('View pending appointments')}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <KpiCard
                    label="Confirmed Today"
                    value={stats.confirmedAppointments || 0}
                    icon={<CheckCircleOutlined />}
                    trendLabel="Ready"
                    trendType="positive"
                    trendColor="#22C55E"
                    trendBg="#D1FAE5"
                    onView={() => message.info('View confirmed appointments')}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <KpiCard
                    label="Walk-ins Waiting"
                    value={stats.walkInPatients || 0}
                    icon={<UserAddOutlined />}
                    trendLabel="In queue"
                    trendType={stats.walkInPatients > 0 ? "negative" : "neutral"}
                    trendColor="#6366F1"
                    trendBg="#E0E7FF"
                    onView={() => message.info('View walk-in patients')}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <KpiCard
                    label="Check-ins Completed"
                    value={stats.checkedInAppointments || 0}
                    icon={<TeamOutlined />}
                    trendLabel="Today"
                    trendType="positive"
                    trendColor="#16a34a"
                    trendBg="#D1FAE5"
                    onView={() => message.info('View checked-in patients')}
                  />
                </div>
              </div>
            )}

            {/* Quick Actions - Single line with hover effects */}
            <div style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                <QuickActionTile
                  label="Create Appointment"
                  icon={<CalendarOutlined />}
                  onClick={() => setIsBookingModalOpen(true)}
                variant="primary"
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

            {/* Queue Status - Single line above Upcoming Appointments */}
            <Card 
              variant="borderless"
              style={{ 
                borderRadius: 16,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #E5E7EB',
                background: '#fff',
                marginBottom: 24,
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                gap: isMobile ? 16 : 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 14, minWidth: 80 }}>Pending:</Text>
                  <Text strong style={{ fontSize: 16, color: '#F97316' }}>{stats.pendingAppointments || 0}</Text>
                </div>
                <Divider type="vertical" style={{ height: 24, margin: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 14, minWidth: 100 }}>Waiting:</Text>
                  <Text strong style={{ fontSize: 16, color: '#6366F1' }}>{stats.waitingAppointments || 0}</Text>
                </div>
                <Divider type="vertical" style={{ height: 24, margin: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 14, minWidth: 120 }}>Checked In:</Text>
                  <Text strong style={{ fontSize: 16, color: '#16a34a' }}>{stats.checkedInAppointments || 0}</Text>
                </div>
                <Divider type="vertical" style={{ height: 24, margin: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 14, minWidth: 100 }}>Completed:</Text>
                  <Text strong style={{ fontSize: 16, color: '#22C55E' }}>{stats.completedAppointments || 0}</Text>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {stats.completedAppointments || 0} of {stats.todayAppointments || 0} completed today
                  </Text>
                </div>
              </div>
          </Card>

            {/* Upcoming Appointments - Full width, fills remaining height */}
          <Row gutter={[16, 16]} style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <Col xs={24} lg={24} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Card 
                variant="borderless"
                style={{ 
                  borderRadius: 16,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #E5E7EB',
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                }}
                title="Upcoming Appointments" 
                extra={<Button type="link" onClick={() => message.info('View all appointments feature coming soon')}>View All</Button>}
                bodyStyle={{ 
                flex: 1, 
                minHeight: 0, 
                  display: 'flex', 
                  flexDirection: 'column',
                overflow: 'hidden',
                padding: isMobile ? 16 : 20,
                }}
              >
                {appointmentTabs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">
                      {futureAppointments.length === 0
                        ? 'No appointments found. Waiting for patients to book appointments.'
                        : (() => {
                            const pendingCount = futureAppointments.filter((a: any) => a.status === 'pending').length;
                            return pendingCount > 0
                              ? `No confirmed appointments scheduled. ${pendingCount} pending confirmation.`
                              : 'No confirmed appointments scheduled.';
                          })()}
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
                        <div style={{ 
                          flex: 1,
                          minHeight: 0,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}>
                          {isMobile ? (
                            <Space direction="vertical" size={12} style={{ width: '100%', flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                              {appointmentsLoading ? (
                                <>
                                  <Card size="small" style={{ borderRadius: 16 }}><Spin /></Card>
                                  <Card size="small" style={{ borderRadius: 16 }}><Spin /></Card>
                                </>
                              ) : (
                                appointmentsToShow.map(renderMobileAppointmentCard)
                              )}
                            </Space>
                          ) : (
                          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                          <Table
                            columns={appointmentColumns}
                            dataSource={appointmentsToShow}
                            pagination={false}
                            rowKey="id"
                            loading={appointmentsLoading}
                            size={isMobile ? "small" : "middle"}
                              scroll={{ 
                                x: isMobile ? 'max-content' : 'max-content',
                                y: '100%',
                              }}
                              rowClassName={(record: any) =>
                                record.status === 'pending' ? 'appointment-row-pending' : ''
                              }
                            />
                          </div>
                          )}
                        </div>
                      ),
                    }))}
                    style={{ 
                      marginTop: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      minHeight: 0,
                    }}
                  />
                )}
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

          {/* Patient Info Drawer */}
          <Drawer
            title={patientInfo?.patient?.user?.fullName || 'Patient Information'}
            placement="right"
            width={isMobile ? '100%' : 600}
            onClose={() => {
              setPatientInfoDrawerOpen(false);
              setPatientInfo(null);
            }}
            open={patientInfoDrawerOpen}
          >
            {patientInfoLoading ? (
              <Spin />
            ) : patientInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Personal Information */}
                <Card title="Personal Information" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary">Full Name:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {patientInfo.patient?.user?.fullName || 'N/A'}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">Mobile:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {patientInfo.patient?.user?.mobileNumber || 'N/A'}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">Email:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {patientInfo.patient?.user?.email || 'N/A'}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">Date of Birth:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {patientInfo.patient?.dateOfBirth 
                          ? dayjs(patientInfo.patient.dateOfBirth).format('DD MMM YYYY')
                          : 'N/A'}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">Gender:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {patientInfo.patient?.gender || 'N/A'}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">Blood Group:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {patientInfo.patient?.bloodGroup || 'N/A'}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">Height:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {patientInfo.patient?.height ? `${patientInfo.patient.height} cm` : 'N/A'}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">Weight:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {patientInfo.patient?.weight ? `${patientInfo.patient.weight} kg` : 'N/A'}
                      </Text>
                    </div>
                  </Space>
                </Card>

                {/* Medical History */}
                {(patientInfo.patient?.medicalHistory || patientInfo.patient?.allergies || patientInfo.patient?.chronicConditions) && (
                  <Card title="Medical History" size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {patientInfo.patient.medicalHistory && (
                        <div>
                          <Text type="secondary">Medical History:</Text>
                          <Text style={{ marginLeft: 8, display: 'block', marginTop: 4 }}>
                            {patientInfo.patient.medicalHistory}
                          </Text>
                        </div>
                      )}
                      {patientInfo.patient.allergies && (
                        <div>
                          <Text type="secondary">Allergies:</Text>
                          <Text style={{ marginLeft: 8, display: 'block', marginTop: 4 }}>
                            {patientInfo.patient.allergies}
                          </Text>
                        </div>
                      )}
                      {patientInfo.patient.chronicConditions && (
                        <div>
                          <Text type="secondary">Chronic Conditions:</Text>
                          <Text style={{ marginLeft: 8, display: 'block', marginTop: 4 }}>
                            {patientInfo.patient.chronicConditions}
                          </Text>
                        </div>
                      )}
                    </Space>
                  </Card>
                )}

                {/* Lab Reports */}
                {patientInfo.labReports && patientInfo.labReports.length > 0 && (
                  <Card title={`Lab Reports (${patientInfo.labReports.length})`} size="small">
                    <List
                      dataSource={patientInfo.labReports}
                      renderItem={(report: any) => (
                        <List.Item>
                          <div style={{ width: '100%' }}>
                            <Text strong>{report.testName}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(report.reportDate).format('DD MMM YYYY')} • {report.testType}
                            </Text>
                            {report.status && (
                              <Tag color={report.status === 'completed' ? 'green' : 'orange'} style={{ marginLeft: 8 }}>
                                {report.status}
                              </Tag>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  </Card>
                )}

                {/* Prescriptions */}
                {patientInfo.prescriptions && patientInfo.prescriptions.length > 0 && (
                  <Card title={`Prescriptions (${patientInfo.prescriptions.length})`} size="small">
                    <List
                      dataSource={patientInfo.prescriptions}
                      renderItem={(prescription: any) => (
                        <List.Item>
                          <div style={{ width: '100%' }}>
                            <Text strong>Prescription #{prescription.id}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(prescription.createdAt).format('DD MMM YYYY')}
                            </Text>
                            {prescription.diagnosis && (
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary">Diagnosis: </Text>
                                <Text>{prescription.diagnosis}</Text>
                              </div>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  </Card>
                )}

                {/* Appointment History */}
                {patientInfo.appointments && patientInfo.appointments.length > 0 && (
                  <Card title={`Appointment History (${patientInfo.appointments.length})`} size="small">
                    <List
                      dataSource={patientInfo.appointments}
                      renderItem={(apt: any) => (
                        <List.Item>
                          <div style={{ width: '100%' }}>
                            <Text strong>
                              {dayjs(apt.appointmentDate).format('DD MMM YYYY')} • {apt.timeSlot || apt.appointmentTime}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {apt.doctorName || 'Unknown Doctor'} • {apt.reason || 'Consultation'}
                            </Text>
                            {apt.status && (
                              <Tag color={apt.status === 'completed' ? 'green' : apt.status === 'confirmed' ? 'blue' : 'orange'} style={{ marginLeft: 8 }}>
                                {apt.status}
                              </Tag>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  </Card>
                )}
              </div>
            ) : (
              <Text type="secondary">No patient information available</Text>
            )}
          </Drawer>
          </div>
        </Content>
      </Layout>
    </Layout>
    </>
  );
}