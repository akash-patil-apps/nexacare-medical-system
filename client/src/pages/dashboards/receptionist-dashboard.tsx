import { useState, useEffect, useMemo, useRef } from "react";
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
  DatePicker,
  Segmented,
  TimePicker,
  Divider,
  Tabs,
  Drawer,
  List,
  Steps,
  Alert,
  Avatar,
} from 'antd';
import { 
  CalendarOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  MenuUnfoldOutlined,
  PhoneOutlined,
  MessageOutlined,
  UserAddOutlined,
  UserOutlined,
  DollarOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { ReceptionistSidebar } from '../../components/layout/ReceptionistSidebar';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { formatTimeSlot12h, parseTimeTo24h } from '../../lib/time';
import { getISTStartOfDay, isSameDayIST } from '../../lib/timezone';
import { normalizeStatus, APPOINTMENT_STATUS } from '../../lib/appointment-status';
import { playNotificationSound } from '../../lib/notification-sounds';

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
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedAppointmentForRejection, setSelectedAppointmentForRejection] = useState<number | null>(null);
  const [rejectionForm] = Form.useForm();
  const [walkInStep, setWalkInStep] = useState(0); // 0: Mobile lookup, 1: User found/New user, 2: OTP (if new), 3: Registration (if new), 4: Appointment booking
  const [foundUser, setFoundUser] = useState<any>(null); // Existing user data
  const [foundPatient, setFoundPatient] = useState<any>(null); // Existing patient data
  const [isCheckingMobile, setIsCheckingMobile] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [dateMode, setDateMode] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<string>('today');
  const [patientInfoDrawerOpen, setPatientInfoDrawerOpen] = useState(false);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [patientInfoLoading, setPatientInfoLoading] = useState(false);
  const appointmentStartTimeValue = Form.useWatch('appointmentStartTime', walkInForm);
  const durationMinutesValue = Form.useWatch('durationMinutes', walkInForm);
  
  // Walk-in appointment booking state (matching patient dashboard flow)
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotBookings, setSlotBookings] = useState<Record<string, number>>({});
  const [appointmentBookingStep, setAppointmentBookingStep] = useState(0); // 0: Doctor selection, 1: Date/Time selection

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
          patientDateOfBirth: apt.patientDateOfBirth || null,
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

  // Track previous appointment count and statuses for sound notifications
  const [previousAppointmentData, setPreviousAppointmentData] = useState<{
    count: number;
    pendingIds: Set<number>;
  }>({ count: 0, pendingIds: new Set() });

  // Listen for appointment updates and play sounds
  useEffect(() => {
    const handleStorageChange = () => {
      refetchAppointments();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refetchAppointments]);

  // Detect new appointments and play sounds
  useEffect(() => {
    if (!appointments || appointments.length === 0) return;

    const currentPendingIds = new Set<number>(
      appointments
        .filter((apt: any) => apt.status === 'pending')
        .map((apt: any) => apt.id as number)
        .filter((id: any): id is number => typeof id === 'number')
    );

    // Check for new pending appointments
    if (previousAppointmentData.pendingIds.size > 0) {
      currentPendingIds.forEach((id) => {
        if (!previousAppointmentData.pendingIds.has(id)) {
          // New pending appointment detected
          playNotificationSound('new');
        }
      });
    } else if (currentPendingIds.size > 0 && previousAppointmentData.count === 0) {
      // First load with pending appointments
      playNotificationSound('pending');
    }

    // Update previous data
    setPreviousAppointmentData({
      count: appointments.length,
      pendingIds: currentPendingIds,
    });
  }, [appointments]);

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

  // Get receptionist profile to access hospital name
  const { data: receptionistProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/reception/profile'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      console.log('🔍 Fetching receptionist profile from /api/reception/profile');
      const response = await fetch('/api/reception/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch receptionist profile:', response.status, errorText);
        throw new Error('Failed to fetch receptionist profile');
      }
      const data = await response.json();
      console.log('✅ Receptionist profile fetched:', { 
        hospitalId: data.hospitalId, 
        hospitalName: data.hospitalName,
        fullData: data 
      });
      return data;
    },
    enabled: !!user && user.role?.toUpperCase() === 'RECEPTIONIST',
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Get hospital name from receptionist profile
  const hospitalName = useMemo(() => {
    console.log('🔍 Computing hospitalName from receptionistProfile:', {
      hasProfile: !!receptionistProfile,
      hospitalName: receptionistProfile?.hospitalName,
      hospitalId: receptionistProfile?.hospitalId,
      profileLoading,
    });
    if (receptionistProfile?.hospitalName) {
      console.log('✅ Hospital name from receptionist profile:', receptionistProfile.hospitalName);
      return receptionistProfile.hospitalName;
    }
    if (receptionistProfile && !receptionistProfile.hospitalName) {
      console.log('⚠️ Receptionist profile exists but no hospitalName. Profile:', receptionistProfile);
    } else if (!receptionistProfile) {
      console.log('⚠️ No receptionist profile yet. Loading:', profileLoading);
    }
    return null;
  }, [receptionistProfile?.hospitalName, receptionistProfile, profileLoading]);

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
          
          // For cancelled appointments, only show if they're today or in the future
          if (apt.status === 'cancelled' && appointmentDay < todayStart) {
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
          
          // For pending appointments: show if they're today or in the future (even if time has passed today)
          // This allows receptionists to confirm pending appointments even if the scheduled time has passed
          if (apt.status === 'pending') {
            // Show if appointment is today or in the future (by date only, not time)
            return appointmentDay >= todayStart;
          }
          
          // For confirmed and cancelled appointments: show if they're today or in the future (by date and time)
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


  // Completed appointments for today (for receptionist visibility) - Using IST
  const completedTodayAppointments = useMemo(() => {
    const todayIST = getISTStartOfDay();
    return appointments.filter((apt: any) => {
      const normalizedStatus = normalizeStatus(apt.status);
      if (normalizedStatus !== APPOINTMENT_STATUS.COMPLETED) return false;
      if (!apt.date && !apt.dateObj) return false;
      const d = apt.dateObj || new Date(apt.date);
      if (isNaN(d.getTime())) return false;
      return isSameDayIST(d, todayIST);
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
    // Use IST for date comparison to ensure accuracy
    const todayIST = getISTStartOfDay();
    
    // For stats, we need to check all appointments (not just confirmed) to show pending
    const allTodayAppointments = appointments.filter((apt: any) => {
      if (!apt.date && !apt.dateObj) return false;
      const aptDate = apt.dateObj || new Date(apt.date);
      return isSameDayIST(aptDate, todayIST);
    });
    
    const today = allTodayAppointments;
    
    // Use normalized status for accurate filtering
    const confirmed = today.filter((apt: any) => {
      const normalized = normalizeStatus(apt.status);
      return normalized === APPOINTMENT_STATUS.CONFIRMED;
    }).length;
    
    const pending = today.filter((apt: any) => {
      const normalized = normalizeStatus(apt.status);
      return normalized === APPOINTMENT_STATUS.PENDING;
    }).length;
    
    const completed = today.filter((apt: any) => {
      const normalized = normalizeStatus(apt.status);
      return normalized === APPOINTMENT_STATUS.COMPLETED;
    }).length;
    
    const cancelled = today.filter((apt: any) => {
      const normalized = normalizeStatus(apt.status);
      return normalized === APPOINTMENT_STATUS.CANCELLED;
    }).length;
    
    // Check-ins: appointments that have been checked in (status is 'checked-in', 'attended', or 'in_consultation')
    const checkedIn = today.filter((apt: any) => {
      const normalized = normalizeStatus(apt.status);
      return normalized === APPOINTMENT_STATUS.CHECKED_IN || 
             normalized === APPOINTMENT_STATUS.ATTENDED || 
             normalized === APPOINTMENT_STATUS.IN_CONSULTATION;
    }).length;
    
    // Waiting: appointments that are confirmed but not yet checked in
    const waiting = today.filter((apt: any) => {
      const normalized = normalizeStatus(apt.status);
      return normalized === APPOINTMENT_STATUS.CONFIRMED;
    }).length;

    const unreadNotifications = notifications.filter((notif: any) => !notif.read).length;

    console.log('📊 Receptionist Dashboard Stats:', {
      totalAppointments: appointments.length,
      todayAppointments: today.length,
      pending,
      confirmed,
      completed,
      cancelled,
      checkedIn,
      waiting,
      todayIST: todayIST.toISOString(),
      sampleStatuses: today.slice(0, 5).map((apt: any) => ({ 
        id: apt.id, 
        status: apt.status, 
        normalized: normalizeStatus(apt.status),
        date: apt.date,
        dateObj: apt.dateObj?.toISOString(),
        isToday: isSameDayIST(apt.dateObj || new Date(apt.date), todayIST)
      })),
      allAppointmentStatuses: [...new Set(appointments.map((apt: any) => apt.status))],
      todayAppointmentStatuses: [...new Set(today.map((apt: any) => apt.status))],
    });

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
        playNotificationSound('confirmation');
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

  // Handle message patient
  const handleMessage = (phone: string) => {
    if (phone && phone !== 'N/A') {
      // Open SMS app with patient's phone number
      window.location.href = `sms:${phone}`;
    } else {
      message.warning('Phone number not available');
    }
  };

  // Handle reject appointment
  const handleRejectAppointment = (appointmentId: number) => {
    setSelectedAppointmentForRejection(appointmentId);
    setIsRejectModalOpen(true);
    rejectionForm.resetFields();
  };

  // Handle rejection submission
  const handleRejectSubmit = async (values: { cancellationReason: string }) => {
    if (!selectedAppointmentForRejection) return;
    
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/appointments/${selectedAppointmentForRejection}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cancellationReason: values.cancellationReason
        })
      });

      const responseData = await response.json();

      if (response.ok) {
        message.success('Appointment rejected successfully. Patient will be notified of the cancellation reason.');
        setIsRejectModalOpen(false);
        setSelectedAppointmentForRejection(null);
        rejectionForm.resetFields();
        
        // Trigger storage event to notify other tabs/windows
        window.localStorage.setItem('appointment-updated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('appointment-updated'));
        
        // Invalidate and refetch appointments
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
        
        await refetchAppointments();
      } else {
        console.error('❌ Reject appointment failed:', responseData);
        message.error(responseData.message || 'Failed to reject appointment');
      }
    } catch (error) {
      console.error('❌ Error rejecting appointment:', error);
      message.error('Failed to reject appointment. Please try again.');
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
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          message.error('Patient not found');
          return;
        }
        if (response.status === 500 || response.status === 503) {
          message.error('Database connection issue. Please try again in a moment.');
          return;
        }
        throw new Error(errorData.message || 'Failed to fetch patient information');
      }
      
      const data = await response.json();
      if (!data || !data.patient) {
        message.warning('Patient information not available');
        return;
      }
      
      setPatientInfo(data);
      setPatientInfoDrawerOpen(true);
    } catch (error: any) {
      console.error('❌ Error loading patient info:', error);
      if (error.message?.includes('timeout') || error.message?.includes('CONNECT_TIMEOUT')) {
        message.error('Database connection timeout. Please check your connection and try again.');
      } else {
        message.error(error.message || 'Failed to load patient information. Please try again.');
      }
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
              style={{ 
                padding: 0, 
                height: 'auto', 
                fontSize: 14, 
                fontWeight: 600,
                color: '#1890ff',
              }}
              className="patient-name-link"
              onClick={() => record.patientId && handleViewPatientInfo(record.patientId)}
            >
              {record.patient || 'Unknown Patient'}
            </Button>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.4 }}>
              {record.doctor || 'Unknown Doctor'}
            </Text>
          </div>

          <Space size={6} wrap style={{ justifyContent: 'flex-end' }}>
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
              <>
              <Button
                size="small"
                  type="default"
                  icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                onClick={() => handleConfirmAppointment(record.id)}
                  title="Confirm appointment"
                  style={{ background: 'transparent', border: '1px solid #d9d9d9' }}
                />
                <Button
                  size="small"
                  type="default"
                  danger
                  icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                  onClick={() => handleRejectAppointment(record.id)}
                  title="Reject appointment"
                  style={{ background: 'transparent', border: '1px solid #ffccc7' }}
                />
              </>
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
              title="Call patient"
            />
            <Button
              size="small"
              type="link"
              icon={<MessageOutlined />}
              onClick={() => handleMessage(record.phone)}
              title="Message patient"
            />
          </Space>
        </div>
      </Card>
    );
  };

  const appointmentColumns = [
    {
      title: '#',
      key: 'serial',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Text type="secondary" style={{ fontWeight: 500 }}>{index + 1}</Text>
      ),
    },
    {
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
      width: 140,
      ellipsis: true,
      render: (text: string, record: any) => (
          <Button
            type="link"
            style={{ 
              padding: 0, 
              height: 'auto',
              color: '#1890ff',
            }}
            className="patient-name-link"
            onClick={() => record.patientId && handleViewPatientInfo(record.patientId)}
          >
          <Text strong>{text}</Text>
          </Button>
      ),
    },
    {
      title: 'Age',
      key: 'age',
      width: 70,
      align: 'center' as const,
      render: (_: any, record: any) => {
        // Calculate age from dateOfBirth if available, otherwise show N/A
        if (record.patientDateOfBirth) {
          try {
            const dob = new Date(record.patientDateOfBirth);
            if (!isNaN(dob.getTime())) {
              const today = new Date();
              let age = today.getFullYear() - dob.getFullYear();
              const monthDiff = today.getMonth() - dob.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                age--;
              }
              return <Text>{age}</Text>;
            }
          } catch (error) {
            console.error('Error calculating age:', error);
          }
        }
        return <Text type="secondary">N/A</Text>;
      },
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
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      width: 120,
      render: (time: string) => (time ? formatTimeSlot12h(time) : 'N/A'),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Source',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (_: any, record: any) => {
        const config = getSourceConfig(record.type);
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 90,
      render: (_: any, record: any) => {
        const config = getPaymentConfig(record.paymentStatus);
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
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
              <>
            <Button
              size="small"
                  type="default"
                  icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              onClick={() => handleConfirmAppointment(record.id)}
                  title="Confirm appointment"
                  style={{ background: 'transparent', border: '1px solid #d9d9d9' }}
                />
                <Button
                  size="small"
                  type="default"
                  danger
                  icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                  onClick={() => handleRejectAppointment(record.id)}
                  title="Reject appointment"
                  style={{ background: 'transparent', border: '1px solid #ffccc7' }}
                />
              </>
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
              title="Call patient"
            />
            
            {/* Message button - available for all statuses */}
            <Button 
              size="small"
              type="link"
              icon={<MessageOutlined />}
              onClick={() => handleMessage(record.phone)}
              title="Message patient"
            />
            </Space>
          );
      },
    },
  ];

  const siderWidth = isMobile ? 0 : 260;

  // Handle walk-in appointment booking
  const handleWalkInAppointmentBooking = async (values: any) => {
    try {
      setIsWalkInSubmitting(true);
      const token = localStorage.getItem('auth-token');

      // Get patient ID - use foundPatient if available, or foundUser to create patient profile
      let patientId: number;
      if (foundPatient?.id) {
        patientId = foundPatient.id;
      } else if (foundUser?.id) {
        // If user exists but no patient profile, create one
        const patientResponse = await fetch('/api/patients', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: foundUser.id,
          }),
        });
        if (!patientResponse.ok) {
          const errorData = await patientResponse.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create patient profile');
        }
        const patientData = await patientResponse.json();
        patientId = patientData.patient?.id || patientData.id;
        setFoundPatient(patientData.patient || patientData);
      } else {
        throw new Error('Patient information not available');
      }

      // Get hospital ID from receptionist context
      const contextResponse = await fetch('/api/reception/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!contextResponse.ok) {
        throw new Error('Failed to get hospital information');
      }
      const context = await contextResponse.json();

      const trimmedReason = values.reason?.trim() || 'Walk-in consultation';
      const trimmedNotes = values.notes?.trim();

      // Format date - use selectedDate state or values.appointmentDate (which may be a string or dayjs object)
      let appointmentDate: string;
      if (selectedDate) {
        appointmentDate = selectedDate.format('YYYY-MM-DD');
      } else if (values.appointmentDate) {
        // Check if it's already a string or a dayjs object
        if (typeof values.appointmentDate === 'string') {
          appointmentDate = values.appointmentDate;
        } else if (values.appointmentDate && typeof values.appointmentDate.format === 'function') {
          appointmentDate = values.appointmentDate.format('YYYY-MM-DD');
        } else {
          appointmentDate = dayjs().format('YYYY-MM-DD');
        }
      } else {
        appointmentDate = dayjs().format('YYYY-MM-DD');
      }

      // Format time - use selectedSlot or default
      let appointmentTime: string;
      let timeSlot: string;
      if (selectedSlot && values.timeSlot) {
        // Extract start time from slot (format: "HH:mm-HH:mm" or "HH:mm")
        const [startTime] = selectedSlot.split('-');
        appointmentTime = startTime.trim();
        timeSlot = values.timeSlot || selectedSlot;
      } else if (values.appointmentTime) {
        appointmentTime = values.appointmentTime;
        timeSlot = values.timeSlot || `${appointmentTime}-${dayjs().hour(parseInt(appointmentTime.split(':')[0])).minute(parseInt(appointmentTime.split(':')[1])).add(30, 'minute').format('HH:mm')}`;
      } else {
        appointmentTime = '09:00';
        timeSlot = '09:00-09:30';
      }

      // Ensure we have all required fields
      if (!selectedDoctor?.id && !values.doctorId) {
        message.error('Please select a doctor');
        return;
      }
      if (!selectedDate && !appointmentDate) {
        message.error('Please select a date');
        return;
      }
      if (!selectedSlot && !timeSlot) {
        message.error('Please select a time slot');
        return;
      }
      if (!trimmedReason) {
        message.error('Please enter a reason for the appointment');
        return;
      }

      const payload = {
        patientId,
        doctorId: selectedDoctor?.id || values.doctorId,
        hospitalId: context.hospitalId,
        appointmentDate,
        appointmentTime,
        timeSlot,
        reason: trimmedReason,
        type: 'walk-in', // Mark as walk-in appointment
        priority: values.priority || 'normal',
        notes: trimmedNotes || undefined,
      };

      console.log('📤 Sending appointment payload:', payload);

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json();

      if (!response.ok) {
        console.error('❌ Walk-in appointment booking failed:', responseBody);
        message.error(responseBody?.message || 'Failed to book appointment');
        return;
      }

      message.success('Walk-in appointment booked successfully!');
      closeWalkInModal();

      await Promise.all([refetchWalkIns(), refetchAppointments()]);

      window.localStorage.setItem('appointment-updated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('appointment-updated'));
    } catch (error: any) {
      console.error('❌ Error booking walk-in appointment:', error);
      message.error(error.message || 'Failed to book appointment. Please try again.');
    } finally {
      setIsWalkInSubmitting(false);
    }
  };

  const closeWalkInModal = () => {
    setIsWalkInModalOpen(false);
    setWalkInStep(0);
    setFoundUser(null);
    setFoundPatient(null);
    setOtpVerified(false);
    walkInForm.resetFields();
    walkInForm.setFieldsValue({
      priority: 'normal',
      appointmentDate: dayjs(),
      appointmentStartTime: dayjs().hour(9).minute(0),
      durationMinutes: 30,
    });
    setDateMode('today');
  };
  // Check if user exists by mobile number
  const checkMobileNumber = async (mobileNumber: string) => {
    console.log('🔍 checkMobileNumber called with:', mobileNumber);
    
    if (!mobileNumber || mobileNumber.length < 10) {
      message.warning('Please enter a valid mobile number');
      return;
    }

    // Validate Indian mobile number format (10 digits)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      message.error('Please enter a valid Indian mobile number (10 digits starting with 6-9)');
      return;
    }

    setIsCheckingMobile(true);
    const startTime = Date.now();
    
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      console.log(`📞 Looking up mobile number: ${mobileNumber}`);
      const url = `/api/reception/patients/lookup?mobile=${encodeURIComponent(mobileNumber)}`;
      console.log(`🌐 Fetch URL: ${url}`);

      // Add timeout to the fetch request - increased to 30 seconds for database queries
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('⏱️ Request timeout after 30 seconds');
        controller.abort();
      }, 30000); // 30 second timeout for database operations

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      console.log(`⏱️ Lookup took ${duration}ms, status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Lookup failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        if (response.status === 500) {
          message.error(errorData.message || 'Server error. Please try again.');
          return;
        }
        throw new Error(errorData.message || 'Failed to lookup user');
      }

      const data = await response.json();
      console.log('✅ Lookup response:', data);
      
      if (data.user) {
        // User exists
        setFoundUser(data.user);
        setFoundPatient(data.patient || null);
        setWalkInStep(1); // Move to next step (show user info or book appointment)
        message.success(`User found: ${data.user.fullName}`);
      } else {
        // New user - proceed to registration
        setFoundUser(null);
        setFoundPatient(null);
        setWalkInStep(1); // Move to registration step
        message.info('New patient. Please complete registration.');
      }
    } catch (error: any) {
      console.error('❌ Error checking mobile number:', error);
      if (error.name === 'AbortError') {
        message.error('Request timed out. Please check your connection and try again.');
      } else {
        message.error(error.message || 'Failed to check mobile number. Please try again.');
      }
    } finally {
      setIsCheckingMobile(false);
    }
  };

  // Send OTP for new user registration
  const sendOtpForRegistration = async (mobileNumber: string) => {
    setSendingOtp(true);
    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobileNumber,
          role: 'PATIENT',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      message.success('OTP sent to mobile number');
      setWalkInStep(2); // Move to OTP verification step
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      message.error(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP
  const verifyOtpForRegistration = async (mobileNumber: string, otp: string) => {
    if (!otp || otp.length !== 6) {
      message.error('Please enter a valid 6-digit OTP');
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobileNumber,
          otp,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Invalid OTP');
      }

      setOtpVerified(true);
      message.success('OTP verified successfully');
      setWalkInStep(3); // Move to registration form step
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      message.error(error.message || 'Invalid OTP. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Register new user and create patient profile
  const registerNewWalkInPatient = async (values: any) => {
    setIsWalkInSubmitting(true);
    try {
      const token = localStorage.getItem('auth-token');
      
      // First, register the user (OTP already verified)
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobileNumber: values.mobileNumber,
          fullName: values.fullName,
          email: `${values.mobileNumber}@nexacare.com`, // Generate email
          password: `WalkIn@${values.mobileNumber.slice(-4)}`, // Temporary password
          role: 'PATIENT',
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.message || 'Failed to register user');
      }

      const userData = await registerResponse.json();
      
      // Then create patient profile
      const patientResponse = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.user.id,
          gender: values.gender,
          city: values.city,
          address: values.address,
        }),
      });

      if (!patientResponse.ok) {
        const errorData = await patientResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create patient profile');
      }

      const patientData = await patientResponse.json();
      
      setFoundUser({
        id: userData.user.id,
        fullName: userData.user.fullName,
        mobileNumber: userData.user.mobileNumber,
        email: userData.user.email,
        role: userData.user.role,
      });
      setFoundPatient(patientData.patient || patientData);
      message.success('Patient registered successfully!');
      // Initialize selectedDate to today
      const today = dayjs();
      setSelectedDate(today);
      walkInForm.setFieldsValue({ appointmentDate: today });
      setWalkInStep(4); // Move to appointment booking step
    } catch (error: any) {
      console.error('Error registering new patient:', error);
      message.error(error.message || 'Failed to register patient. Please try again.');
    } finally {
      setIsWalkInSubmitting(false);
    }
  };

  const openWalkInModal = () => {
    setIsWalkInModalOpen(true);
    setWalkInStep(0);
    setAppointmentBookingStep(0);
    setFoundUser(null);
    setFoundPatient(null);
    setOtpVerified(false);
    setDateMode('today');
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot('');
    setAvailableSlots([]);
    setSlotBookings({});
    walkInForm.resetFields();
    walkInForm.setFieldsValue({
      priority: 'normal',
      appointmentDate: dayjs(),
      appointmentStartTime: dayjs().hour(9).minute(0),
      durationMinutes: 30,
    });
  };

  // Helper functions for walk-in booking flow (matching patient dashboard)
  const getDoctorSlots = (doctor: any): string[] => {
    if (!doctor || !doctor.availableSlots) return [];
    try {
      const slots = typeof doctor.availableSlots === 'string' 
        ? JSON.parse(doctor.availableSlots) 
        : doctor.availableSlots;
      return Array.isArray(slots) ? slots : [];
    } catch (error) {
      console.error('Error parsing doctor slots:', error);
      return [];
    }
  };

  const fetchBookedAppointments = async (doctorId: number, date: string): Promise<Record<string, number>> => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/appointments/doctor/${doctorId}/date/${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        return {};
      }
      const appointments = await response.json();
      const bookings: Record<string, number> = {};
      appointments.forEach((apt: any) => {
        if (apt.timeSlot) {
          bookings[apt.timeSlot] = (bookings[apt.timeSlot] || 0) + 1;
        }
      });
      return bookings;
    } catch (error) {
      console.error('Error fetching booked appointments:', error);
      return {};
    }
  };

  const isSlotInPast = (slot: string, selectedDate: dayjs.Dayjs | null): boolean => {
    if (!selectedDate) return false;
    const now = dayjs();
    const today = now.format('YYYY-MM-DD');
    const selectedDateStr = selectedDate.format('YYYY-MM-DD');
    if (selectedDateStr !== today) return false;
    
    try {
      const endPart = slot.includes('-') ? slot.split('-')[1].trim() : slot.trim();
      const parsedEnd = parseTimeTo24h(endPart);
      const endTime = parsedEnd || (() => {
        const parsedStart = parseTimeTo24h(slot.trim());
        if (!parsedStart) return null;
        const dt = dayjs().hour(parsedStart.hours24).minute(parsedStart.minutes).add(30, 'minute');
        return { hours24: dt.hour(), minutes: dt.minute() };
      })();
      if (!endTime) return false;
      const slotEndDateTime = dayjs().hour(endTime.hours24).minute(endTime.minutes).second(0).millisecond(0);
      return now.isAfter(slotEndDateTime);
    } catch (error) {
      return false;
    }
  };

  const getSlotAvailabilityColor = (slot: string, maxSlots: number = 5): {
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    isAvailable: boolean;
    availableCount: number;
  } => {
    const bookings = slotBookings[slot] || 0;
    const availableCount = maxSlots - bookings;
    if (availableCount >= 3) {
      return { color: 'green', bgColor: '#D1FAE5', borderColor: '#10B981', textColor: '#047857', isAvailable: true, availableCount };
    } else if (availableCount >= 1) {
      return { color: 'yellow', bgColor: '#FEF3C7', borderColor: '#F59E0B', textColor: '#92400E', isAvailable: true, availableCount };
    } else {
      return { color: 'red', bgColor: '#FEE2E2', borderColor: '#EF4444', textColor: '#991B1B', isAvailable: false, availableCount: 0 };
    }
  };

  const handleDoctorSelect = async (doctorId: number) => {
    const doctor = doctors.find((d: any) => d.id === doctorId);
    setSelectedDoctor(doctor || null);
    setSelectedSlot('');
    setSlotBookings({});
    walkInForm.setFieldsValue({ timeSlot: undefined, doctorId });
    
    if (doctor) {
      // Auto-advance to date/time selection step and initialize date
      setTimeout(() => {
        console.log('🚀 Auto-advancing to date & time selection step');
        setAppointmentBookingStep(1);
        // Always initialize date to today when auto-advancing from doctor selection
        const today = dayjs();
        setSelectedDate(today);
        walkInForm.setFieldsValue({ appointmentDate: today });
        // Fetch slots for today - use the doctor from closure
        const allSlots = getDoctorSlots(doctor);
        const filteredSlots = allSlots.filter(slot => !isSlotInPast(slot, today));
        setAvailableSlots(filteredSlots);
        console.log(`📅 Filtered slots for date ${today.format('YYYY-MM-DD')}: ${filteredSlots.length} available`);
        
        // Fetch booked appointments for this doctor and date
        const dateStr = today.format('YYYY-MM-DD');
        fetchBookedAppointments(doctor.id, dateStr)
          .then(bookings => {
            setSlotBookings(bookings);
            console.log('📅 Booked appointments for', dateStr, ':', bookings);
          })
          .catch(error => {
            console.error('Error fetching booked appointments:', error);
            setSlotBookings({});
          });
      }, 500);
    }
  };

  const handleDateChange = async (date: dayjs.Dayjs | null) => {
    setSelectedDate(date);
    setSelectedSlot('');
    setSlotBookings({});
    walkInForm.setFieldsValue({ timeSlot: undefined, appointmentDate: date });
    
    if (date && selectedDoctor) {
      const allSlots = getDoctorSlots(selectedDoctor);
      const filteredSlots = allSlots.filter(slot => !isSlotInPast(slot, date));
      setAvailableSlots(filteredSlots);
      console.log(`📅 Filtered slots for date ${date.format('YYYY-MM-DD')}: ${filteredSlots.length} available`);
      
      // Fetch booked appointments for this doctor and date
      const dateStr = date.format('YYYY-MM-DD');
      try {
      const bookings = await fetchBookedAppointments(selectedDoctor.id, dateStr);
      setSlotBookings(bookings);
        console.log('📅 Booked appointments for', dateStr, ':', bookings);
      } catch (error) {
        console.error('Error fetching booked appointments:', error);
        setSlotBookings({});
      }
    } else if (date && !selectedDoctor) {
      // If date is selected but no doctor, clear slots
      setAvailableSlots([]);
    }
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    walkInForm.setFieldsValue({ timeSlot: slot });
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
        
        /* Patient name link hover effects */
        .receptionist-dashboard-wrapper .patient-name-link {
          transition: all 0.2s ease !important;
        }
        .receptionist-dashboard-wrapper .patient-name-link:hover {
          color: #40a9ff !important;
          text-decoration: underline !important;
          transform: translateX(2px);
        }
        .receptionist-dashboard-wrapper .patient-name-link:active {
          color: #096dd9 !important;
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
          <ReceptionistSidebar selectedMenuKey={selectedMenuKey} hospitalName={hospitalName} onMenuClick={() => setMobileDrawerOpen(false)} />
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
                  { label: "Completed Today", value: stats.completedAppointments || 0, icon: <TeamOutlined />, trendLabel: "Today", trendColor: "#16a34a", trendBg: "#D1FAE5", onView: () => message.info('View completed appointments') },
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
                    label="Completed Today"
                    value={stats.completedAppointments || 0}
                    icon={<TeamOutlined />}
                    trendLabel="Today"
                    trendType="positive"
                    trendColor="#16a34a"
                    trendBg="#D1FAE5"
                    onView={() => message.info('View completed appointments')}
                  />
                </div>
              </div>
            )}

            {/* Create Appointment Button - For Walk-in Patients */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                size="large"
                  icon={<CalendarOutlined />}
                  onClick={openWalkInModal}
                style={{ borderRadius: 8 }}
              >
                Create Appointment (Walk-in)
              </Button>
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
                padding: isMobile ? 12 : 16,
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
                          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: isMobile ? '60vh' : 'calc(100vh - 600px)' }}>
                            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
                          <Table
                            columns={appointmentColumns}
                            dataSource={appointmentsToShow}
                            pagination={false}
                            rowKey="id"
                            loading={appointmentsLoading}
                            size={isMobile ? "small" : "middle"}
                                scroll={{ 
                                  x: 'max-content',
                                  y: 'calc(100vh - 650px)',
                                }}
                                rowClassName={(record: any) =>
                                  record.status === 'pending' ? 'appointment-row-pending' : ''
                                }
                              />
                            </div>
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
            title={
              <div>
                <Text strong>Walk-in Patient Registration</Text>
                <Steps
                  current={walkInStep}
                  size="small"
                  style={{ marginTop: 16 }}
                  items={
                    foundUser
                      ? [
                          { title: 'Mobile Lookup' },
                          { title: 'Patient Info' },
                          { title: 'Book Appointment' },
                        ]
                      : [
                          { title: 'Mobile Lookup' },
                          { title: 'Registration' },
                          { title: 'OTP Verify' },
                          { title: 'Confirm' },
                          { title: 'Book Appointment' },
                        ]
                  }
                />
              </div>
            }
            open={isWalkInModalOpen}
            onCancel={closeWalkInModal}
            footer={null}
            width={1000}
            styles={{ body: { padding: '24px 32px', maxHeight: '85vh', overflowY: 'auto' } }}
          >
            {/* Step 0: Mobile Number Lookup */}
            {walkInStep === 0 && (
              <div>
                {isCheckingMobile && (
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}>
                      <Text type="secondary">Searching for patient...</Text>
                    </div>
                  </div>
                )}
            <Form
              layout="vertical"
              form={walkInForm}
                  onFinish={(values) => {
                    if (values.mobileNumber) {
                      checkMobileNumber(values.mobileNumber);
                    }
                  }}
                >
                  <Form.Item
                    label="Enter Mobile Number"
                    name="mobileNumber"
                    rules={[
                      { required: true, message: 'Please enter mobile number' },
                      { pattern: /^[6-9]\d{9}$/, message: 'Please enter a valid Indian mobile number (10 digits starting with 6-9)' },
                    ]}
                  >
                    <Input
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      style={{ fontSize: 16, padding: '12px' }}
                      onPressEnter={() => walkInForm.submit()}
                      disabled={isCheckingMobile}
                    />
                  </Form.Item>
                  <Button
                    type="primary"
                    block
                    size="large"
                    loading={isCheckingMobile}
                    onClick={() => walkInForm.submit()}
                    disabled={isCheckingMobile}
                    style={{ marginTop: 16 }}
                  >
                    {isCheckingMobile ? 'Searching...' : 'Lookup Patient'}
                  </Button>
                </Form>
              </div>
            )}

            {/* Step 1: Existing User Found */}
            {walkInStep === 1 && foundUser && (
              <div>
                <Alert
                  message="Patient Found"
                  description={`${foundUser.fullName} is already registered. You can proceed to book an appointment.`}
                  type="success"
                  showIcon
                  style={{ marginBottom: 24 }}
                />
                <Card size="small" style={{ marginBottom: 24 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary">Name: </Text>
                      <Text strong>{foundUser.fullName}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Mobile: </Text>
                      <Text strong>{foundUser.mobileNumber}</Text>
                    </div>
                    {foundUser.email && (
                      <div>
                        <Text type="secondary">Email: </Text>
                        <Text strong>{foundUser.email}</Text>
                      </div>
                    )}
                  </Space>
                </Card>
                <Button
                  type="primary"
                  block
                  size="large"
                  onClick={() => {
                    // For existing user, step 2 is appointment booking
                    // Initialize selectedDate to today
                    const today = dayjs();
                    setSelectedDate(today);
                    walkInForm.setFieldsValue({ appointmentDate: today });
                    setWalkInStep(2);
                  }}
                >
                  Book Appointment
                </Button>
              </div>
            )}

            {/* Step 1: New User Registration Form */}
            {walkInStep === 1 && !foundUser && (
            <Form
              layout="vertical"
              form={walkInForm}
                onFinish={(values) => {
                  // Store registration data and send OTP
                  walkInForm.setFieldsValue(values);
                  sendOtpForRegistration(values.mobileNumber);
                }}
              initialValues={{
                priority: 'normal',
                }}
              >
                <Form.Item
                  label="Mobile Number"
                  name="mobileNumber"
                  rules={[
                    { required: true, message: 'Please enter mobile number' },
                    { pattern: /^[6-9]\d{9}$/, message: 'Please enter a valid Indian mobile number (10 digits starting with 6-9)' },
                  ]}
                >
                  <Input placeholder="10-digit mobile number" maxLength={10} />
                </Form.Item>
                <Form.Item
                  label="Full Name"
                  name="fullName"
                  rules={[{ required: true, message: 'Please enter full name' }]}
                >
                  <Input placeholder="Enter patient's full name" />
                </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                      label="Gender"
                      name="gender"
                      rules={[{ required: true, message: 'Please select gender' }]}
                    >
                      <Select placeholder="Select gender">
                        <Select.Option value="male">Male</Select.Option>
                        <Select.Option value="female">Female</Select.Option>
                        <Select.Option value="other">Other</Select.Option>
                      </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                      label="City"
                      name="city"
                      rules={[{ required: true, message: 'Please enter city' }]}
                    >
                      <Input placeholder="Enter city" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  label="Address"
                  name="address"
                  rules={[{ required: true, message: 'Please enter address' }]}
                >
                  <Input.TextArea rows={2} placeholder="Enter full address" />
                </Form.Item>
                <Button
                  type="primary"
                  block
                  size="large"
                  htmlType="submit"
                  loading={sendingOtp}
                  style={{ marginTop: 16 }}
                >
                  Send OTP
                </Button>
              </Form>
            )}

            {/* Step 2: OTP Verification (New User Only) */}
            {walkInStep === 2 && !foundUser && (
              <div>
                <Alert
                  message="OTP Sent"
                  description={`OTP has been sent to ${walkInForm.getFieldValue('mobileNumber')}. Please enter the 6-digit OTP to verify.`}
                  type="info"
                  showIcon
                  style={{ marginBottom: 24 }}
                />
                <Form.Item
                  label="Enter OTP"
                    rules={[
                    { required: true, message: 'Please enter OTP' },
                    { pattern: /^\d{6}$/, message: 'OTP must be 6 digits' },
                  ]}
                >
                  <Input
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    style={{ fontSize: 18, textAlign: 'center', letterSpacing: 8 }}
                    onPressEnter={(e) => {
                      const otp = (e.target as HTMLInputElement).value;
                      if (otp && /^\d{6}$/.test(otp)) {
                        verifyOtpForRegistration(walkInForm.getFieldValue('mobileNumber'), otp);
                      }
                    }}
                  />
                </Form.Item>
                <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 16 }}>
                  <Button onClick={() => {
                    setWalkInStep(1);
                  }}>
                    Back
                  </Button>
                  <Button
                    type="primary"
                    loading={verifyingOtp}
                    onClick={() => {
                      const otp = (document.querySelector('input[placeholder*="OTP"]') as HTMLInputElement)?.value;
                      if (otp && /^\d{6}$/.test(otp)) {
                        verifyOtpForRegistration(walkInForm.getFieldValue('mobileNumber'), otp);
                      } else {
                        message.warning('Please enter a valid 6-digit OTP');
                      }
                    }}
                  >
                    Verify OTP
                  </Button>
                </Space>
              </div>
            )}

            {/* Step 3: Complete Registration (New User Only) */}
            {walkInStep === 3 && !foundUser && otpVerified && (
              <div>
                <Alert
                  message="OTP Verified"
                  description="OTP verified successfully. Please complete the registration."
                  type="success"
                  showIcon
                  style={{ marginBottom: 24 }}
                />
                <Form
                  layout="vertical"
                  form={walkInForm}
                  onFinish={registerNewWalkInPatient}
                  initialValues={walkInForm.getFieldsValue()}
                >
                  <Form.Item name="mobileNumber" hidden>
                      <Input />
                  </Form.Item>
                  <Form.Item name="fullName" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name="gender" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name="city" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name="address" hidden>
                    <Input />
                  </Form.Item>
                  <Card size="small" style={{ marginBottom: 24 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><Text type="secondary">Name: </Text><Text strong>{walkInForm.getFieldValue('fullName')}</Text></div>
                      <div><Text type="secondary">Mobile: </Text><Text strong>{walkInForm.getFieldValue('mobileNumber')}</Text></div>
                      <div><Text type="secondary">Gender: </Text><Text strong>{walkInForm.getFieldValue('gender')}</Text></div>
                      <div><Text type="secondary">City: </Text><Text strong>{walkInForm.getFieldValue('city')}</Text></div>
                      <div><Text type="secondary">Address: </Text><Text strong>{walkInForm.getFieldValue('address')}</Text></div>
                    </Space>
                  </Card>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Button onClick={() => setWalkInStep(2)}>Back</Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={isWalkInSubmitting}
                    >
                      Complete Registration
                    </Button>
                  </Space>
                </Form>
              </div>
            )}

            {/* Step 2 (existing) or Step 4 (new): Appointment Booking - Redesigned to match patient dashboard */}
            {((walkInStep === 2 && foundUser) || (walkInStep === 4 && foundPatient)) ? (
              <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: 8 }}>
                <Form
                  layout="vertical"
                  form={walkInForm}
                  onFinish={async (values) => {
                    // Convert selected slot to appointment time and timeSlot format
                    if (selectedSlot && selectedDate) {
                      const [startTime] = selectedSlot.split('-');
                      values.appointmentTime = startTime.trim();
                      values.timeSlot = selectedSlot;
                      values.appointmentDate = selectedDate.format('YYYY-MM-DD');
                    }
                    await handleWalkInAppointmentBooking(values);
                  }}
                  initialValues={{
                    priority: 'normal',
                    appointmentDate: dayjs(),
                  }}
                >
                  <Alert
                    message="Book Appointment"
                    description={
                      foundUser 
                        ? `Booking appointment for ${foundUser.fullName}` 
                        : foundPatient 
                          ? `Booking appointment for newly registered patient`
                          : 'Complete the appointment details below'
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                    action={
                      <Space>
                        <Button 
                          size="small" 
                          onClick={() => {
                            // Go back to patient selection
                            if (foundUser) {
                              setWalkInStep(1);
                            } else if (foundPatient) {
                              setWalkInStep(3);
                            }
                            setSelectedDoctor(null);
                            setSelectedDate(null);
                            setSelectedSlot('');
                            setAvailableSlots([]);
                            setSlotBookings({});
                            setAppointmentBookingStep(0);
                          }}
                        >
                          Change Patient
                        </Button>
                      </Space>
                    }
                  />

                  {/* Step 0: Doctor Selection */}
                  {appointmentBookingStep === 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Title level={5} style={{ margin: 0 }}>Select Doctor</Title>
                      {selectedDoctor && (
                        <Button 
                          size="small" 
                          type="link"
                          onClick={() => {
                            setSelectedDoctor(null);
                            setSelectedDate(null);
                            setSelectedSlot('');
                            setAvailableSlots([]);
                            setSlotBookings({});
                            setAppointmentBookingStep(0);
                            walkInForm.setFieldsValue({ doctorId: undefined, appointmentDate: undefined, timeSlot: undefined });
                          }}
                        >
                          Change Doctor
                        </Button>
                      )}
                    </div>
                    {doctorsLoading ? (
                      <Spin />
                    ) : doctors.length === 0 ? (
                      <Alert message="No doctors available" type="warning" />
                    ) : (
                      (() => {
                        const doctorsBySpecialty = doctors.reduce((acc: any, doc: any) => {
                          const specialty = doc.specialty || 'General';
                          if (!acc[specialty]) acc[specialty] = [];
                          acc[specialty].push(doc);
                          return acc;
                        }, {} as Record<string, any[]>);
                        const sortedSpecialties = Object.keys(doctorsBySpecialty).sort();
                        return (
                          <div>
                            {sortedSpecialties.map((specialty) => {
                              const specialtyDoctors = doctorsBySpecialty[specialty];
                              return (
                                <div key={specialty} style={{ marginBottom: 24 }}>
                                  <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 12 }}>
                                    {specialty} ({specialtyDoctors.length} {specialtyDoctors.length === 1 ? 'doctor' : 'doctors'})
                                  </Text>
                                  <Row gutter={[16, 16]}>
                                    {specialtyDoctors.map((doctor: any) => {
                                      const getDoctorInitials = (name: string) => {
                                        if (!name) return 'DR';
                                        const names = name.split(' ');
                                        if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
                                        return name.substring(0, 2).toUpperCase();
                                      };
                                      return (
                                        <Col xs={24} sm={12} lg={8} key={doctor.id}>
                                          <Card
                                            hoverable
                                            onClick={() => handleDoctorSelect(doctor.id)}
                                            style={{
                                              border: selectedDoctor?.id === doctor.id ? '2px solid #1A8FE3' : '1px solid #E5E7EB',
                                              borderRadius: '16px',
                                              boxShadow: selectedDoctor?.id === doctor.id 
                                                ? '0 4px 12px rgba(26, 143, 227, 0.15)' 
                                                : '0 2px 8px rgba(0, 0, 0, 0.08)',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s ease',
                                              height: '100%',
                                            }}
                                            styles={{ body: { padding: '24px' } }}
                                          >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <Avatar
                                                  size={64}
                                                  src={doctor.photo || undefined}
                                                  style={{
                                                    backgroundColor: '#1A8FE3',
                                                    fontSize: '20px',
                                                    fontWeight: 600,
                                                    flexShrink: 0,
                                                  }}
                                                >
                                                  {!doctor.photo && getDoctorInitials(doctor.fullName || 'Dr. Unknown')}
                                                </Avatar>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                  <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                                                    {doctor.fullName || 'Dr. Unknown'}
                                                  </Title>
                                                  <Text style={{ fontSize: '14px', color: '#6B7280' }}>
                                                    {doctor.specialty}
                                                  </Text>
                                                </div>
                                              </div>
                                              
                                              <div style={{ display: 'flex', gap: 24 }}>
                                                <div>
                                                  <Text style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Experience</Text>
                                                  <Text strong style={{ fontSize: '16px', color: '#111827' }}>{doctor.experience || 0} years</Text>
                                                </div>
                                                <div>
                                                  <Text style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Fee</Text>
                                                  <Text strong style={{ fontSize: '16px', color: '#111827' }}>
                                                    ₹{typeof doctor.consultationFee === 'string' 
                                                      ? parseFloat(doctor.consultationFee).toFixed(2) 
                                                      : (Number(doctor.consultationFee) || 0).toFixed(2)}
                                                  </Text>
                                                </div>
                                              </div>
                                              
                                              {doctor.qualification && (
                                                <div>
                                                  <Text style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Qualification</Text>
                                                  <Text style={{ fontSize: '14px', color: '#111827' }}>{doctor.qualification}</Text>
                                                </div>
                                              )}
                                            </div>
                                          </Card>
                                        </Col>
                                      );
                                    })}
                                  </Row>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    )}
                    <Form.Item name="doctorId" rules={[{ required: true, message: 'Please select a doctor' }]} style={{ display: 'none' }}>
                      <Input value={selectedDoctor?.id} />
                    </Form.Item>

                    {/* Next Button for Doctor Selection Step */}
                  {selectedDoctor && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                        <Button
                          type="primary"
                          size="large"
                          onClick={() => {
                            setAppointmentBookingStep(1);
                            // Initialize date to today if not set
                            if (!selectedDate) {
                              const today = dayjs();
                              setSelectedDate(today);
                              walkInForm.setFieldsValue({ appointmentDate: today });
                              handleDateChange(today);
                            }
                          }}
                        >
                          Next: Select Date & Time
                        </Button>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Step 1: Date and Time Selection */}
                  {appointmentBookingStep === 1 && selectedDoctor && (
                    <div style={{ marginBottom: 32 }}>
                      {/* Date Selection */}
                      <div style={{ marginBottom: 32 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Title level={5} style={{ margin: 0 }}>Select Date</Title>
                        {selectedDate && (
                          <Button 
                            size="small" 
                            type="link"
                            onClick={() => {
                              setSelectedDate(null);
                              setSelectedSlot('');
                              setAvailableSlots([]);
                              setSlotBookings({});
                              walkInForm.setFieldsValue({ appointmentDate: undefined, timeSlot: undefined });
                            }}
                          >
                            Change Date
                          </Button>
                        )}
                      </div>
                      <Card variant="borderless" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                          {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                            const date = dayjs().add(offset, 'day');
                            const isSelected = selectedDate?.isSame(date, 'day');
                            return (
                              <div
                                key={offset}
                                onClick={() => handleDateChange(date)}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flex: 1,
                                  minWidth: '80px',
                                  padding: '10px 8px',
                                  borderRadius: 12,
                                  border: `1px solid ${isSelected ? '#1A8FE3' : '#d1d5db'}`,
                                  background: isSelected ? '#1A8FE3' : '#ffffff',
                                  color: isSelected ? '#ffffff' : '#111827',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  boxShadow: isSelected ? '0 4px 12px rgba(26, 143, 227, 0.2)' : undefined,
                                }}
                              >
                                <Text style={{ fontSize: 12, letterSpacing: '0.08em', fontWeight: 500 }}>
                                  {date.format('ddd').toUpperCase()}
                                </Text>
                                <Text style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                                  {date.format('DD/MM/YYYY')}
                                </Text>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                      <Form.Item name="appointmentDate" rules={[{ required: true, message: 'Please select a date' }]} style={{ display: 'none' }}>
                        <Input value={selectedDate?.format('YYYY-MM-DD')} />
                      </Form.Item>
                    </div>

                      {/* Time Slot Selection */}
                      {selectedDate && (
                    <div style={{ marginBottom: 32 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Title level={5} style={{ margin: 0 }}>Select Time Slot</Title>
                        {selectedSlot && (
                          <Button 
                            size="small" 
                            type="link"
                            onClick={() => {
                              setSelectedSlot('');
                              walkInForm.setFieldsValue({ timeSlot: undefined });
                            }}
                          >
                            Change Time
                          </Button>
                        )}
                      </div>
                      <Card variant="borderless" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, padding: '20px' }}>
                          {availableSlots.length > 0 ? (
                            availableSlots.map(slot => {
                              const isSelected = selectedSlot === slot;
                              const slotAvailability = getSlotAvailabilityColor(slot);
                              const { bgColor, borderColor, textColor, isAvailable, availableCount } = slotAvailability;
                              const isDisabled = !isAvailable;
                              const finalBgColor = isSelected 
                                ? '#16a34a' 
                                : isDisabled 
                                  ? '#F3F4F6' 
                                  : slotAvailability.color === 'green'
                                    ? '#ECFDF5'
                                    : slotAvailability.color === 'yellow'
                                      ? '#FFFBEB'
                                      : bgColor;
                              const finalBorderColor = isSelected 
                                ? '#16a34a' 
                                : isDisabled 
                                  ? '#D1D5DB' 
                                  : slotAvailability.color === 'green'
                                    ? '#10B981'
                                    : slotAvailability.color === 'yellow'
                                      ? '#F59E0B'
                                      : borderColor;
                              return (
                                <button
                                  key={slot}
                                  onClick={() => !isDisabled && handleSlotSelect(slot)}
                                  disabled={isDisabled}
                                  style={{
                                    height: 56,
                                    borderRadius: 8,
                                    border: `1px solid ${finalBorderColor}`,
                                    background: finalBgColor,
                                    color: isSelected 
                                      ? '#ffffff' 
                                      : isDisabled 
                                        ? '#9CA3AF' 
                                        : slotAvailability.color === 'green'
                                          ? '#047857'
                                          : slotAvailability.color === 'yellow'
                                            ? '#92400E'
                                            : textColor,
                                    fontWeight: 600,
                                    fontSize: 14,
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    opacity: isDisabled ? 0.6 : 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                  }}
                                  title={isDisabled 
                                    ? 'Fully booked (5/5 patients)' 
                                    : `${availableCount} slot${availableCount !== 1 ? 's' : ''} available (${availableCount}/5)`}
                                >
                                  <span>{formatTimeSlot12h(slot)}</span>
                                </button>
                              );
                            })
                          ) : (
                            <Alert message="No slots available for the selected date" type="warning" showIcon style={{ gridColumn: '1 / -1' }} />
                          )}
                        </div>
                        {/* Legend */}
                        <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 4, background: '#ECFDF5', border: '1px solid #10B981' }} />
                            <Text style={{ fontSize: '14px', color: '#374151' }}>Available</Text>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 4, background: '#FFFBEB', border: '1px solid #F59E0B' }} />
                            <Text style={{ fontSize: '14px', color: '#374151' }}>Limited (1-2 slots)</Text>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 4, background: '#FEE2E2', border: '1px solid #EF4444' }} />
                            <Text style={{ fontSize: '14px', color: '#374151' }}>Slot Full (5/5)</Text>
                          </div>
                        </div>
                      </Card>
                      <Form.Item name="timeSlot" rules={[{ required: true, message: 'Please select a time slot' }]} style={{ display: 'none' }}>
                        <Input value={selectedSlot} />
                      </Form.Item>
                    </div>
                  )}

                      {/* Appointment Details - Show when slot is selected */}
                      {selectedSlot && (
                    <div style={{ marginBottom: 32 }}>
                      <Title level={5} style={{ marginBottom: 16 }}>Appointment Details</Title>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            label="Visit Reason"
                            name="reason"
                            rules={[{ required: true, message: 'Please enter visit reason' }]}
                          >
                            <Input placeholder="Reason for visit" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
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
                      </Row>
                      <Form.Item label="Notes" name="notes">
                        <Input.TextArea rows={3} placeholder="Additional notes (optional)" />
                      </Form.Item>
                    </div>
                  )}

                      {/* Navigation Buttons */}
                  <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 24 }}>
                        <Button 
                          onClick={() => {
                            setAppointmentBookingStep(0);
                            setSelectedDate(null);
                            setSelectedSlot('');
                            setAvailableSlots([]);
                            setSlotBookings({});
                            walkInForm.setFieldsValue({ appointmentDate: undefined, timeSlot: undefined });
                          }}
                        >
                      Back
                    </Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={isWalkInSubmitting}
                      size="large"
                      disabled={!selectedDoctor || !selectedDate || !selectedSlot}
                    >
                      Book Appointment
                    </Button>
                  </Space>
                    </div>
                  )}
                </Form>
              </div>
            ) : null}
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <Text type="secondary">Mobile:</Text>
                        <Text strong style={{ marginLeft: 8 }}>
                          {patientInfo.patient?.user?.mobileNumber || 'N/A'}
                        </Text>
                      </div>
                      {patientInfo.patient?.user?.mobileNumber && patientInfo.patient?.user?.mobileNumber !== 'N/A' && (
                        <Space>
                          <Button
                            type="default"
                            icon={<MessageOutlined />}
                            size="small"
                            onClick={() => handleMessage(patientInfo.patient.user.mobileNumber)}
                          >
                            Message
                          </Button>
                          <Button
                            type="primary"
                            icon={<PhoneOutlined />}
                            size="small"
                            onClick={() => handleCall(patientInfo.patient.user.mobileNumber)}
                          >
                            Call
                          </Button>
                        </Space>
                      )}
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
                  <Card 
                    title={
                      <div>
                        <span>Prescriptions</span>
                        {patientInfo.prescriptionsTotal && patientInfo.prescriptionsTotal > patientInfo.prescriptions.length && (
                          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8, fontWeight: 'normal' }}>
                            (Showing {patientInfo.prescriptions.length} of {patientInfo.prescriptionsTotal})
                          </Text>
                        )}
                        {(!patientInfo.prescriptionsTotal || patientInfo.prescriptionsTotal === patientInfo.prescriptions.length) && (
                          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8, fontWeight: 'normal' }}>
                            ({patientInfo.prescriptions.length})
                          </Text>
                        )}
                      </div>
                    }
                    size="small"
                  >
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
                  <Card 
                    title={
                      <div>
                        <span>Appointment History</span>
                        {patientInfo.appointmentsTotal && patientInfo.appointmentsTotal > patientInfo.appointments.length && (
                          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8, fontWeight: 'normal' }}>
                            (Showing {patientInfo.appointments.length} of {patientInfo.appointmentsTotal})
                          </Text>
                        )}
                        {(!patientInfo.appointmentsTotal || patientInfo.appointmentsTotal === patientInfo.appointments.length) && (
                          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8, fontWeight: 'normal' }}>
                            ({patientInfo.appointments.length})
                          </Text>
                        )}
                      </div>
                    }
                    size="small"
                  >
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

          {/* Rejection Modal */}
          <Modal
            title="Reject Appointment"
            open={isRejectModalOpen}
            onCancel={() => {
              setIsRejectModalOpen(false);
              setSelectedAppointmentForRejection(null);
              rejectionForm.resetFields();
            }}
            footer={null}
            width={500}
          >
            <Form
              form={rejectionForm}
              layout="vertical"
              onFinish={handleRejectSubmit}
            >
              <Alert
                message="Reject Appointment"
                description="Please select a reason for rejecting this appointment. The patient will be notified of this cancellation reason."
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />
              
              <Form.Item
                name="cancellationReason"
                label="Cancellation Reason"
                rules={[{ required: true, message: 'Please select a cancellation reason' }]}
              >
                <Select
                  placeholder="Select a reason for rejection"
                  size="large"
                >
                  <Select.Option value="Doctor is not available">Doctor is not available</Select.Option>
                  <Select.Option value="Time slot is already booked">Time slot is already booked</Select.Option>
                  <Select.Option value="Hospital is closed on this date">Hospital is closed on this date</Select.Option>
                  <Select.Option value="Emergency situation">Emergency situation</Select.Option>
                  <Select.Option value="Patient requested cancellation">Patient requested cancellation</Select.Option>
                  <Select.Option value="Duplicate appointment">Duplicate appointment</Select.Option>
                  <Select.Option value="Other">Other</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button onClick={() => {
                    setIsRejectModalOpen(false);
                    setSelectedAppointmentForRejection(null);
                    rejectionForm.resetFields();
                  }}>
                    Cancel
                  </Button>
                  <Button type="primary" danger htmlType="submit">
                    Reject Appointment
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
          </div>
        </Content>
      </Layout>
    </Layout>
    </>
  );
}