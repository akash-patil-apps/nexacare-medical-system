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
} from 'antd';
import { 
  CalendarOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
  MenuUnfoldOutlined,
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
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<string>('upcoming');
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
      // Extract hospital name from first appointment if available
      if (data.length > 0) {
        const firstAppointment = data[0];
        console.log('🔍 First appointment data:', {
          id: firstAppointment.id,
          hospitalName: firstAppointment.hospitalName,
          hospitalId: firstAppointment.hospitalId,
        });
        if (firstAppointment.hospitalName) {
          console.log('✅ Found hospital name from appointments:', firstAppointment.hospitalName);
        } else {
          console.log('⚠️ No hospitalName in first appointment');
        }
      }
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
          type: apt.type || 'online',
          paymentStatus: apt.paymentStatus || null,
          date: apt.appointmentDate,
          dateObj: appointmentDate,
          hospitalName: apt.hospitalName || null, // Include hospital name from API
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

  // Get receptionist profile to access hospitalId
  const { data: receptionistProfile } = useQuery({
    queryKey: ['/api/reception/profile'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/reception/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Receptionist profile API error:', response.status, errorText);
        return null;
      }
      const data = await response.json();
      console.log('📋 Receptionist profile:', data);
      return data;
    },
    enabled: !!user && user.role?.toUpperCase() === 'RECEPTIONIST',
  });

  // Get hospital name for receptionist - try from appointments first, then API
  const hospitalNameFromAppointments = useMemo(() => {
    if (appointments.length > 0) {
      // Check if any appointment has hospitalName
      for (const apt of appointments) {
        if (apt.hospitalName) {
          return apt.hospitalName;
        }
      }
    }
    return null;
  }, [appointments]);

  const { data: hospitalNameFromAPI } = useQuery({
    queryKey: ['/api/hospitals', receptionistProfile?.hospitalId],
    queryFn: async () => {
      if (!receptionistProfile?.hospitalId) {
        console.log('⚠️ No hospitalId in receptionist profile');
        return null;
      }
      console.log('🏥 Fetching hospital name for hospitalId:', receptionistProfile.hospitalId);
      const token = localStorage.getItem('auth-token');
      try {
        const response = await fetch(`/api/hospitals/${receptionistProfile.hospitalId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to fetch hospital:', response.status, errorText);
          return null;
        }
        const data = await response.json();
        console.log('🏥 Hospital data:', data);
        return data.name || null;
      } catch (error) {
        console.error('❌ Error fetching hospital:', error);
        return null;
      }
    },
    enabled: !!receptionistProfile?.hospitalId,
  });

  // Use hospital name from API if available, otherwise from appointments
  const hospitalName = hospitalNameFromAPI || hospitalNameFromAppointments;
  
  // Debug logging
  useEffect(() => {
    if (hospitalName) {
      console.log('✅ Hospital name resolved:', hospitalName);
    } else {
      console.log('⚠️ Hospital name not available yet. API:', hospitalNameFromAPI, 'Appointments:', hospitalNameFromAppointments);
    }
  }, [hospitalName, hospitalNameFromAPI, hospitalNameFromAppointments]);

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

  // Filter appointments that are in the future (by start time), keeping actionable statuses
  // Pending/confirmed/checked-in/attended/checked/completed/cancelled (future) stay visible
  const futureAppointments = useMemo(() => {
    const now = new Date();
    const activeStatuses = ['pending', 'confirmed', 'cancelled', 'checked-in', 'attended', 'checked', 'completed'];

    const parseStartDateTime = (apt: any) => {
      const base = apt.dateObj || (apt.date ? new Date(apt.date) : null);
      if (!base || isNaN(base.getTime())) return null;
      const start = new Date(base);

      const timeStr = (apt.time || apt.timeSlot || '').toString().trim();
      if (timeStr) {
        const startPart = timeStr.includes('-') ? timeStr.split('-')[0].trim() : timeStr;
        const match = startPart.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?/);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const period = match[3]?.toUpperCase();
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          start.setHours(hours, minutes, 0, 0);
        }
      }
      return start;
    };
    
    return appointments
      .filter((apt: any) => {
        const status = (apt.status || '').toLowerCase();
        // Show pending, confirmed, in-room, checked, completed, cancelled
        if (!activeStatuses.includes(status)) {
          return false;
        }
        
        const start = parseStartDateTime(apt);
        if (!start) return false;
        const isUpcoming = start.getTime() >= now.getTime();
        return isUpcoming;
      })
      .sort((a: any, b: any) => {
        // Sort by start time (earliest first)
        const parseStart = (apt: any) => {
          const base = apt.dateObj || (apt.date ? new Date(apt.date) : null);
          const start = base ? new Date(base) : new Date();
          const timeStr = (apt.time || apt.timeSlot || '').toString().trim();
          if (timeStr) {
            const startPart = timeStr.includes('-') ? timeStr.split('-')[0].trim() : timeStr;
            const match = startPart.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?/);
            if (match) {
              let hours = parseInt(match[1], 10);
              const minutes = parseInt(match[2], 10);
              const period = match[3]?.toUpperCase();
              if (period === 'PM' && hours !== 12) hours += 12;
              if (period === 'AM' && hours === 12) hours = 0;
              start.setHours(hours, minutes, 0, 0);
            }
          }
          return start;
        };
        const aStart = parseStart(a);
        const bStart = parseStart(b);
        return aStart.getTime() - bStart.getTime();
      });
  }, [appointments]);


  // Checked/completed appointments for today (for quick visibility)
  const checkedTodayAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return appointments.filter((apt: any) => {
      const status = (apt.status || '').toLowerCase();
      if (!['checked-in', 'checked', 'completed', 'attended'].includes(status)) return false;
      if (!apt.date && !apt.dateObj) return false;

      const appointmentDate = apt.dateObj || new Date(apt.date);
      if (isNaN(appointmentDate.getTime())) return false;

      const appointmentDay = new Date(appointmentDate);
      appointmentDay.setHours(0, 0, 0, 0);

      return appointmentDay.getTime() === today.getTime();
    });
  }, [appointments]);

  // Get appointments for active tab (upcoming vs checked)
  const appointmentsToShow = useMemo(() => {
    if (activeAppointmentTab === 'checked') {
      return checkedTodayAppointments;
    }
    return futureAppointments;
  }, [activeAppointmentTab, futureAppointments, checkedTodayAppointments]);

  // Generate tab items for appointments (upcoming vs checked)
  const appointmentTabs = useMemo(() => {
    return [
      { key: 'upcoming', label: `Upcoming (${futureAppointments.length})`, count: futureAppointments.length },
      { key: 'checked', label: `Checked (${checkedTodayAppointments.length})`, count: checkedTodayAppointments.length },
    ];
  }, [futureAppointments.length, checkedTodayAppointments.length]);

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

    const unreadNotifications = notifications.filter((notif: any) => !notif.read).length;

    return {
      totalAppointments: appointments.length,
      todayAppointments: today.length,
      pendingAppointments: pending,
      confirmedAppointments: confirmed,
      completedAppointments: completed,
      cancelledAppointments: cancelled,
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
        
        console.log('✅ Appointment confirmed! Starting cache invalidation...');
        
        // Directly invalidate specific query keys for all dashboards
        // This ensures patient, doctor, and receptionist dashboards all update
        queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
        queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
        
        // Also use predicate for any other appointment-related queries
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && key.includes('/api/appointments');
          }
        });
        
        // Trigger storage event to notify other tabs/windows (for cross-tab updates)
        window.localStorage.setItem('appointment-updated', Date.now().toString());
        // Also dispatch a custom event for same-window updates
        window.dispatchEvent(new CustomEvent('appointment-updated', { detail: { appointmentId, status: 'confirmed' } }));
        
        // Force immediate refetch of receptionist appointments
        await refetchAppointments();
        console.log('✅ Receptionist appointments refetched');
        
        // Trigger immediate refetch of patient appointments (same window)
        queryClient.refetchQueries({ queryKey: ['patient-appointments'] });
        console.log('✅ Patient appointments query invalidated and refetched');
        
        // Trigger refetches after short delay to ensure all dashboards update
        setTimeout(() => {
          console.log('🔄 Refetching all appointment queries (300ms delay)...');
          // Directly refetch specific queries
          queryClient.refetchQueries({ queryKey: ['patient-appointments'] });
          queryClient.refetchQueries({ queryKey: ['/api/appointments/my'] });
          // Trigger another storage event to notify other tabs
          window.localStorage.setItem('appointment-updated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('appointment-updated', { detail: { appointmentId, status: 'confirmed' } }));
          console.log('✅ Storage event dispatched');
        }, 300);
      } else {
        console.error('❌ Confirm appointment failed:', responseData);
        message.error(responseData.message || 'Failed to confirm appointment');
      }
    } catch (error) {
      console.error('❌ Error confirming appointment:', error);
      message.error('Failed to confirm appointment. Please try again.');
    }
  };

  // Get appointment status with better labels
  const getStatusConfig = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      pending: { color: 'orange', label: 'WAITING' },
      confirmed: { color: 'blue', label: 'CONFIRMED' },
      'checked-in': { color: 'geekblue', label: 'CHECKED' },
      attended: { color: 'cyan', label: 'IN CONSULTATION' },
      checked: { color: 'geekblue', label: 'CHECKED' },
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

  // Check if appointment is overdue (appointment time has passed but not completed/cancelled/checked-in/attended)
  const isAppointmentOverdue = (appointment: any) => {
    // Don't mark appointments as overdue if they are:
    // - completed (patient has finished consultation)
    // - cancelled (appointment was cancelled)
    // - checked-in (patient has arrived and checked in)
    // - attended (patient is currently in consultation)
    const status = appointment.status?.toLowerCase();
    if (status === 'completed' || 
        status === 'cancelled' || 
        status === 'checked-in' || 
        status === 'attended') {
      return false;
    }
    
    // Need both date and time to check if overdue
    if (!appointment.date && !appointment.dateObj) {
      return false;
    }
    
    try {
      const now = new Date();
      const appointmentDateTime = appointment.dateObj || new Date(appointment.date);
      
      if (isNaN(appointmentDateTime.getTime())) {
        return false;
      }
      
      // Parse time from timeSlot or time field
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
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          } else if (!period) {
            // No AM/PM indicator - need to determine if it's 12-hour or 24-hour format
            // For appointment times without AM/PM, we need to intelligently determine AM vs PM
            // Strategy: Check both AM and PM, use whichever makes sense based on current time
            const now = new Date();
            const appointmentDate = new Date(appointmentDateTime);
            
            // Try AM interpretation
            appointmentDate.setHours(hours, minutes, 0, 0);
            const asAM = new Date(appointmentDate);
            
            // Try PM interpretation (for hours 1-11)
            let asPM: Date | null = null;
            if (hours >= 1 && hours <= 11) {
              asPM = new Date(appointmentDate);
              asPM.setHours(hours + 12, minutes, 0, 0);
            }
            
            // Determine which interpretation makes more sense
            if (hours >= 1 && hours <= 11 && asPM) {
              // For hours 1-11, we have both AM and PM options
              const isAMOverdue = asAM < now;
              const isPMOverdue = asPM < now;
              const isPMFuture = asPM > now;
              
              // If AM is overdue and PM is still future, use AM (appointment was this morning)
              if (isAMOverdue && isPMFuture) {
                // Keep hours as AM (no change)
              } 
              // If both are overdue, prefer AM (more common for appointments)
              else if (isAMOverdue && isPMOverdue) {
                // Keep hours as AM
              }
              // If AM is future but PM is overdue, use PM (appointment was this afternoon)
              else if (!isAMOverdue && isPMOverdue) {
                hours += 12; // Use PM
              }
              // If both are future, prefer AM for morning hours (1-11)
              else {
                // Default to AM for morning hours
                // Keep hours as AM (no change)
              }
            }
            // If hours is 0, keep as 0 (midnight in 24-hour) or could be 12 AM
            // If hours is 12, could be noon (12 PM) or 12:00 in 24-hour
            // For appointments, 12:xx without AM/PM is likely noon (12 PM), so keep as 12
          }
          
          appointmentTime.setHours(hours, minutes, 0, 0);
        } else {
          // Try 24-hour format (e.g., "14:30")
          const parts = startPart.split(':');
          if (parts.length >= 2) {
            let hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            
            // If hours are 13-23, it's definitely 24-hour format
            // If hours are 0-12, it could be 24-hour (0-12 = midnight to noon)
            //   or 12-hour without AM/PM (1-12 = 1 AM to noon)
            // For appointments, we need to intelligently determine AM vs PM
            if (hours >= 1 && hours <= 11) {
              // Check both AM and PM interpretations
              const now = new Date();
              const appointmentDate = new Date(appointmentDateTime);
              
              // Try AM
              appointmentDate.setHours(hours, minutes, 0, 0);
              const asAM = new Date(appointmentDate);
              
              // Try PM
              const asPM = new Date(appointmentDate);
              asPM.setHours(hours + 12, minutes, 0, 0);
              
              const isAMOverdue = asAM < now;
              const isPMOverdue = asPM < now;
              const isPMFuture = asPM > now;
              
              // If AM is overdue and PM is still future, use AM
              if (isAMOverdue && isPMFuture) {
                // Keep hours as AM (no change)
              }
              // If both are overdue, prefer AM
              else if (isAMOverdue && isPMOverdue) {
                // Keep hours as AM
              }
              // If AM is future but PM is overdue, use PM
              else if (!isAMOverdue && isPMOverdue) {
                hours += 12; // Use PM
              }
              // If both are future, prefer AM for morning hours
              else {
                // Default to AM for morning hours
                // Keep hours as AM (no change)
              }
            }
            
            appointmentTime.setHours(hours, minutes, 0, 0);
          }
        }
      } else {
        // No time info, can't determine if overdue
        return false;
      }
      
      // Check if appointment time has passed and status is still pending or confirmed
      // Only mark as overdue if the appointment time slot has actually passed
      // AND the patient hasn't been checked in or attended yet
      const status = appointment.status?.toLowerCase();
      if (appointmentTime < now && (status === 'pending' || status === 'confirmed')) {
        return true;
      }
    } catch (error) {
      console.error('Error checking if appointment is overdue:', error);
      return false;
    }
    
    return false;
  };

  const appointmentColumns = [
    {
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
      width: 180,
      fixed: (isMobile ? false : 'left') as 'left' | false,
      render: (text: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 14 }}>
            {text}
          </Text>
          {record.phone && record.phone !== 'N/A' && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.phone}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Date',
      key: 'date',
      width: 100,
      render: (_: any, record: any) => {
        if (!record.dateObj && !record.date) return 'N/A';
        const date = record.dateObj || new Date(record.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const appointmentDate = new Date(date);
        appointmentDate.setHours(0, 0, 0, 0);
        
        if (appointmentDate.getTime() === today.getTime()) {
          return <Text strong style={{ color: '#1890ff' }}>Today</Text>;
        }
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (appointmentDate.getTime() === tomorrow.getTime()) {
          return <Text style={{ color: '#52c41a' }}>Tomorrow</Text>;
        }
        return <Text style={{ fontSize: 13 }}>{dayjs(date).format('DD MMM YYYY')}</Text>;
      },
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      width: 120,
      render: (time: string) => (
        <Text style={{ fontSize: 13, fontFamily: 'monospace' }}>{time || 'N/A'}</Text>
      ),
    },
    {
      title: 'Doctor',
      dataIndex: 'doctor',
      key: 'doctor',
      width: 180,
      ellipsis: true,
      render: (doctor: string) => (
        <Text style={{ fontSize: 13 }}>{doctor || 'N/A'}</Text>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 140,
      ellipsis: true,
      render: (dept: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>{dept || 'General'}</Text>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const config = getSourceConfig(record.type);
        return <Tag color={config.color} style={{ margin: 0, fontSize: 12, whiteSpace: 'nowrap' }}>{config.label}</Tag>;
      },
    },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 130,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const config = getPaymentConfig(record.paymentStatus);
        return <Tag color={config.color} style={{ margin: 0, fontSize: 12, whiteSpace: 'nowrap' }}>{config.label}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      align: 'center' as const,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color} style={{ margin: 0, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{config.label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      align: 'center' as const,
      fixed: (isMobile ? false : 'right') as 'right' | false,
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
        
        // Show Confirm button for pending appointments
        if (record.status === 'pending') {
          return (
            <Space size={4} wrap>
            <Button
              size="small"
              type="primary"
              onClick={() => handleConfirmAppointment(record.id)}
                style={{ fontSize: 12, height: 28, minWidth: 70 }}
            >
              Confirm
            </Button>
              <Button
                size="small"
                onClick={() => {
                  const phone = record.phone || 'N/A';
                  if (phone === 'N/A') {
                    message.info('Patient phone not available to message.');
                  } else {
                    message.info(`Message sent to patient at ${phone}`);
                  }
                }}
                style={{ fontSize: 12, height: 28, minWidth: 70 }}
              >
                Message
              </Button>
            </Space>
          );
        }
        
        // For confirmed appointments, allow messaging only (no check-in)
        if (record.status === 'confirmed') {
          return (
            <Space size={4} wrap>
              <Button 
                size="small"
                onClick={() => {
                  const phone = record.phone || 'N/A';
                  if (phone === 'N/A') {
                    message.info('Patient phone not available to message.');
                  } else {
                    message.info(`Message sent to patient at ${phone}`);
                  }
                }}
                style={{ fontSize: 12, height: 28, minWidth: 70 }}
              >
                Message
              </Button>
            </Space>
          );
        }
        
        // For checked-in, attended, completed, or other statuses, show a dash
        return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
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
        
        /* Overdue appointments row highlight */
        .receptionist-dashboard-wrapper .appointment-row-overdue td {
          background: #FFF1F0 !important; /* lighter red for overdue */
        }
        
        /* Table row hover effects */
        .receptionist-dashboard-wrapper .appointment-table-row:hover td {
          background: #F5F5F5 !important;
          transition: background-color 0.2s ease;
        }
        
        .receptionist-dashboard-wrapper .appointment-row-pending:hover td {
          background: #FEE2E2 !important; /* slightly darker red on hover */
        }
        
        .receptionist-dashboard-wrapper .appointment-row-overdue:hover td {
          background: #FFE7E6 !important; /* slightly darker red on hover */
        }
        
        /* Table header styling */
        .receptionist-dashboard-wrapper .ant-table-thead > tr > th {
          background: #FAFAFA !important;
          font-weight: 600;
          font-size: 13px;
          color: #262626;
          border-bottom: 2px solid #E5E7EB;
          padding: 14px 16px;
          white-space: nowrap;
        }
        
        /* Table cell styling */
        .receptionist-dashboard-wrapper .ant-table-tbody > tr > td {
          padding: 14px 16px;
          border-bottom: 1px solid #F0F0F0;
          vertical-align: middle;
        }
        
        .receptionist-dashboard-wrapper .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }
        
        /* Ensure tags don't wrap */
        .receptionist-dashboard-wrapper .ant-table-tbody .ant-tag {
          white-space: nowrap;
          display: inline-block;
        }
        
        /* Better spacing for action buttons */
        .receptionist-dashboard-wrapper .ant-table-tbody .ant-btn {
          white-space: nowrap;
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
          <ReceptionistSidebar selectedMenuKey={selectedMenuKey} hospitalName={hospitalName} />
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
          <ReceptionistSidebar selectedMenuKey={selectedMenuKey} onMenuClick={() => setMobileDrawerOpen(false)} hospitalName={hospitalName} />
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
                  <Text type="secondary" style={{ fontSize: 14, minWidth: 80 }}>Waiting:</Text>
                  <Text strong style={{ fontSize: 16, color: '#F97316' }}>{stats.pendingAppointments || 0}</Text>
                </div>
                <Divider type="vertical" style={{ height: 24, margin: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 14, minWidth: 120 }}>In Consultation:</Text>
                  <Text strong style={{ fontSize: 16, color: '#6366F1' }}>{stats.confirmedAppointments || 0}</Text>
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

            {/* Upcoming Appointments - Full width */}
          <Row gutter={[16, 16]}>
              <Col xs={24} lg={24}>
              <Card 
                variant="borderless"
                style={{ 
                  borderRadius: 16,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #E5E7EB',
                  background: '#fff',
                }}
                title="Upcoming Appointments" 
                extra={<Button type="link" onClick={() => message.info('View all appointments feature coming soon')}>View All</Button>}
                bodyStyle={{ 
                  display: 'flex', 
                  flexDirection: 'column',
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
                      label: (
                        <span style={{ fontSize: 14, fontWeight: 500 }}>
                          {tab.label}
                        </span>
                      ),
                      children: (
                        <div style={{ 
                          width: '100%',
                        }}>
                          <Table
                            columns={appointmentColumns}
                            dataSource={appointmentsToShow}
                            pagination={false}
                            rowKey="id"
                            loading={appointmentsLoading}
                            size={isMobile ? "small" : "middle"}
                            scroll={isMobile ? { x: 'max-content' } : undefined}
                            rowClassName={(record: any) => {
                              let className = 'appointment-table-row';
                              if (record.status === 'pending') {
                                className += ' appointment-row-pending';
                              }
                              if (isAppointmentOverdue(record)) {
                                className += ' appointment-row-overdue';
                              }
                              return className;
                            }}
                            style={{
                              fontSize: 13,
                            }}
                          />
                        </div>
                      ),
                    }))}
                    style={{ 
                      marginTop: 8,
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
          </div>
        </Content>
      </Layout>
    </Layout>
    </>
  );
}