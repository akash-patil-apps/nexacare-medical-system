import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { 
  Layout, 
  Card, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Typography,
  Menu,
  message,
  Spin,
  Tabs,
  Drawer,
  List,
  Alert,
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
  SettingOutlined,
  MenuUnfoldOutlined,
  PhoneOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import PrescriptionForm from '../../components/prescription-form';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import LabRequestModal from '../../components/modals/lab-request-modal';
import LabReportViewerModal from '../../components/modals/lab-report-viewer-modal';
import prescriptionIcon from '../../assets/images/prescription.png';
import tubeIcon from '../../assets/images/tube.png';
import dayjs from 'dayjs';
import { formatTimeSlot12h } from '../../lib/time';
import { subscribeToAppointmentEvents } from '../../lib/appointments-events';
import { 
  APPOINTMENT_STATUS, 
  getStatusConfig, 
  normalizeStatus, 
  isFinalStatus, 
  canCreatePrescription 
} from '../../lib/appointment-status';
import { getISTNow, toIST, getISTStartOfDay, isSameDayIST } from '../../lib/timezone';
import { playNotificationSound } from '../../lib/notification-sounds';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { NowServingWidget } from '../../components/queue/NowServingWidget';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const doctorTheme = {
  primary: '#1D4ED8',
  highlight: '#E0E7FF',
  accent: '#7C3AED',
  background: '#F5F7FF', // Per DASHBOARD_STYLE_GUIDE.md (Doctor background)
};

export default function DoctorDashboard() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | undefined>(undefined);
  const [selectedPatientName, setSelectedPatientName] = useState<string | undefined>(undefined);
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<string>('upcoming');
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
  const { data: labReports = [] } = useQuery({
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
  const { data: prescriptions = [], refetch: refetchPrescriptions } = useQuery({
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
      const data = await response.json();
      console.log('📋 Prescriptions fetched:', data.length, 'prescriptions');
      console.log('📋 Sample prescription:', data[0] ? { id: data[0].id, appointmentId: data[0].appointmentId || data[0].appointment_id, patientId: data[0].patientId } : 'none');
      return data;
    },
    enabled: !!user && user.role?.toUpperCase() === 'DOCTOR',
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  const [selectedPrescription, setSelectedPrescription] = useState<any | undefined>(undefined);
  const [markingCheckedId, setMarkingCheckedId] = useState<number | null>(null);
  const [patientInfoDrawerOpen, setPatientInfoDrawerOpen] = useState(false);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [patientInfoLoading, setPatientInfoLoading] = useState(false);
  const [selectedLabReport, setSelectedLabReport] = useState<any>(null);
  const [isLabReportModalOpen, setIsLabReportModalOpen] = useState(false);

  // Map prescriptions by appointment ID for quick lookup
  // This tracks whether a doctor has given a prescription to a patient for a specific appointment
  const prescriptionsByAppointmentId = useMemo(() => {
    const map = new Map<string | number, any>();
    console.log('📋 Building prescriptions map. Total prescriptions:', prescriptions.length);
    prescriptions.forEach((p: any) => {
      // Try multiple field names for appointmentId (handles different API response formats)
      const appointmentKey =
        p.appointmentId ??
        p.appointment_id ??
        (p.appointment ? p.appointment.id : undefined);
      if (appointmentKey) {
        map.set(appointmentKey, p);
        console.log(`✅ Mapped prescription ${p.id} to appointment ${appointmentKey}`);
      }
    });
    console.log('📋 Prescriptions map built. Total entries:', map.size);
    return map;
  }, [prescriptions]);

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

  // Handle view comprehensive patient info
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

  // Get notifications for doctor
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
    enabled: !!user && user.role?.toUpperCase() === 'DOCTOR',
    refetchInterval: 15000,
  });

  // Mark notification as read
  // Notification mutation available if needed later (currently unused)
  // const markNotificationMutation = useMutation({
  //   mutationFn: async (notificationId: number) => {
  //     const token = localStorage.getItem('auth-token');
  //     const response = await fetch(`/api/notifications/${notificationId}/read`, {
  //       method: 'POST',
  //       headers: {
  //         'Authorization': `Bearer ${token}`
  //       }
  //     });
  //     if (!response.ok) throw new Error('Failed to mark notification as read');
  //     return response.json();
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] });
  //   },
  // });

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
        
        const tokenFromNotes = (() => {
          const notes = (apt.notes || '').toString();
          const m = notes.match(/Token:\s*(\d+)/i);
          return m ? Number(m[1]) : null;
        })();

        return {
          id: apt.id,
          patientId: apt.patientId,
          patient: apt.patientName || 'Unknown Patient',
          patientDateOfBirth: apt.patientDateOfBirth || null,
          patientBloodGroup: apt.patientBloodGroup || null,
          patientMobile: apt.patientPhone || apt.patientMobile || null,
          time: (apt.appointmentTime || apt.timeSlot) ? formatTimeSlot12h(apt.appointmentTime || apt.timeSlot) : 'N/A',
          status: apt.status || 'pending',
          type: apt.type || 'Consultation',
          priority: apt.priority || 'Normal',
          tokenNumber: (apt.tokenNumber ?? tokenFromNotes) ?? null,
          checkedInAt: apt.checkedInAt ?? null,
          date: apt.appointmentDate,
          dateObj: appointmentDate,
          hospitalName: apt.hospitalName || null, // Include hospital name from API
        };
      });
      
      console.log('✅ Transformed appointments:', transformed);
      return transformed;
    },
    enabled: !!user && user.role?.toUpperCase() === 'DOCTOR',
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch when component mounts
  });

  // Track previous appointment data for sound notifications
  const [previousAppointmentData, setPreviousAppointmentData] = useState<{
    count: number;
    confirmedIds: Set<number>;
  }>({ count: 0, confirmedIds: new Set() });

  // Real-time: server pushes appointment updates (no polling).
  useEffect(() => {
    const unsubscribe = subscribeToAppointmentEvents({
      onEvent: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
        refetchAppointments();
      },
    });
    return unsubscribe;
  }, [queryClient, refetchAppointments]);

  // Detect new confirmed appointments and play sounds
  useEffect(() => {
    if (!allAppointments || allAppointments.length === 0) return;

    const currentConfirmedIds = new Set<number>(
      allAppointments
        .filter((apt: any) => {
          const status = normalizeStatus(apt.status);
          return status === APPOINTMENT_STATUS.CONFIRMED || apt.status?.toLowerCase() === 'confirmed';
        })
        .map((apt: any) => apt.id as number)
        .filter((id: any): id is number => typeof id === 'number')
    );

    // Check for new confirmed appointments
    if (previousAppointmentData.confirmedIds.size > 0) {
      currentConfirmedIds.forEach((id) => {
        if (!previousAppointmentData.confirmedIds.has(id)) {
          // New confirmed appointment detected
          playNotificationSound('new');
        }
      });
    } else if (currentConfirmedIds.size > 0 && previousAppointmentData.count === 0) {
      // First load with confirmed appointments
      playNotificationSound('pending');
    }

    // Update previous data
    setPreviousAppointmentData({
      count: allAppointments.length,
      confirmedIds: currentConfirmedIds,
    });
  }, [allAppointments]);


  // Active appointment statuses (using universal status constants)
  // These are appointments that are confirmed and ready for doctor to see
  // Note: Currently hospital timings are 9 AM - 5 PM, but in the future:
  // - Hospital admins will be able to configure hospital timings and slots
  // - Doctors will be able to set their own availability timings
  const activeStatuses = useMemo(
    () => [
      APPOINTMENT_STATUS.CONFIRMED,
      APPOINTMENT_STATUS.CHECKED_IN,
      APPOINTMENT_STATUS.IN_CONSULTATION,
      APPOINTMENT_STATUS.ATTENDED,
      // Legacy support
      'checked', 'checked_in', 'in_consultation',
    ],
    [],
  );

  /**
   * Parse appointment start date/time in IST
   * All date/time operations use IST to avoid timezone confusion
   */
  const parseStartDateTime = (apt: any): Date | null => {
    const base = apt?.dateObj || (apt?.date ? new Date(apt.date) : null);
      if (!base || isNaN(base.getTime())) return null;
    
    // Convert to IST
    const start = toIST(base);
    if (!start) return null;
    
    const timeStr = (apt?.time || apt?.timeSlot || '').toString().trim();
      if (timeStr) {
        const startPart = timeStr.includes('-') ? timeStr.split('-')[0].trim() : timeStr;
        const match = startPart.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?/);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const period = match[3]?.toUpperCase();
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
        // Legacy convention: "02:00-05:00" slots represent AFTERNOON when AM/PM is missing
        // Note: Currently hospital timings are 9 AM - 5 PM, but this will be configurable in the future
        if (!period && hours >= 2 && hours <= 5) hours += 12;
          start.setHours(hours, minutes, 0, 0);
        }
      }
      return start;
    };
    
  // Use IST-based same day check
  const isSameDay = (a: Date | null, b: Date | null) => {
    if (!a || !b) return false;
    return isSameDayIST(a, b);
  };

  // Today appointments (includes past times for today) - All in IST
  const confirmedTodayAppointments = useMemo(() => {
    const now = getISTNow();
    const today = getISTStartOfDay(now);

    return allAppointments
      .filter((apt: any) => {
        const normalizedStatus = normalizeStatus(apt.status);
        // Check if status is active (using universal status constants)
        if (!activeStatuses.includes(normalizedStatus) && !activeStatuses.includes(apt.status?.toLowerCase())) {
          return false;
        }
        const start = parseStartDateTime(apt);
        if (!start) return false;
        return isSameDay(start, today);
      })
      .sort((a: any, b: any) => {
        const sa = parseStartDateTime(a) || new Date(0);
        const sb = parseStartDateTime(b) || new Date(0);
        return sa.getTime() - sb.getTime();
      });
  }, [allAppointments, activeStatuses]);

  // Upcoming appointments (end time >= now) - includes same-day future times and future days
  const confirmedFutureAppointments = useMemo(() => {
    const now = getISTNow();
    const today = getISTStartOfDay(now);
    
    console.log('🔍 Filtering appointments. Total:', allAppointments.length);
    console.log('🔍 Current date/time (IST):', now.toISOString());

    const parseEndDateTime = (apt: any) => {
      const base = apt?.dateObj || (apt?.date ? new Date(apt.date) : null);
      if (!base || isNaN(base.getTime())) return null;
      const end = toIST(base);
      if (!end) return null;

      const timeStr = (apt?.time || apt?.timeSlot || '').toString().trim();
      if (timeStr && timeStr.includes('-')) {
        const parts = timeStr.split('-');
        const endPart = parts[1]?.trim();
        const match = endPart?.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?/);
            if (match) {
              let hours = parseInt(match[1], 10);
              const minutes = parseInt(match[2], 10);
              const period = match[3]?.toUpperCase();
              if (period === 'PM' && hours !== 12) hours += 12;
              if (period === 'AM' && hours === 12) hours = 0;
          // Legacy convention: 2-5 without AM/PM is afternoon
          if (!period && hours >= 2 && hours <= 5) hours += 12;
          end.setHours(hours, minutes, 0, 0);
          return end;
        }
      }
      // Fallback: if no end time, use start time + 30 minutes
      const start = parseStartDateTime(apt);
      if (!start) return null;
      end.setTime(start.getTime() + 30 * 60 * 1000);
      return end;
    };
    
    const filtered = allAppointments
      .filter((apt: any) => {
        const normalizedStatus = normalizeStatus(apt.status);
        // Only show active statuses (using universal status constants)
        if (!activeStatuses.includes(normalizedStatus) && !activeStatuses.includes(apt.status?.toLowerCase())) {
          console.log(`⏭️  Skipping appointment ${apt.id} - status: ${apt.status}`);
          return false;
        }
        
        const end = parseEndDateTime(apt);
        if (!end) {
          console.log(`⏭️  Skipping appointment ${apt.id} - no valid end time`);
          return false;
        }
        // Upcoming includes:
        // - Same-day future (end >= now AND same day)
        // - Future days
        const isSameDayFuture = isSameDay(end, today) && end.getTime() >= now.getTime();
        const isFutureDay = end.getTime() >= now.getTime() && !isSameDay(end, today);
        const include = isSameDayFuture || isFutureDay;
        if (!include) {
          console.log(`⏭️  Skipping appointment ${apt.id} - end ${end.toISOString()} is not future or same-day future`);
        }
        return include;
      })
      .sort((a: any, b: any) => {
        // Sort by start time (earliest first)
        const dateTimeA = parseStartDateTime(a) || new Date(0);
        const dateTimeB = parseStartDateTime(b) || new Date(0);
        return dateTimeA.getTime() - dateTimeB.getTime();
      });
    
    console.log(`✅ Filtered to ${filtered.length} confirmed future appointments`);
    return filtered;
  }, [allAppointments, activeStatuses]);

  // For stats + prescription modal patient list: use today's confirmed appointments (includes past times today)
  const todayAppointments = confirmedTodayAppointments;

  // Checked/completed appointments for today (after doctor marks completed) - All in IST
  // Note: Currently hospital timings are 9 AM - 5 PM IST, but in the future:
  // - Hospital admins will be able to configure hospital timings and slots
  // - Doctors will be able to set their own availability timings
  const checkedTodayAppointments = useMemo(() => {
    const today = getISTStartOfDay();

    return allAppointments.filter((apt: any) => {
      const normalizedStatus = normalizeStatus(apt.status);
      // Keep checked-in in Upcoming; only move to Checked tab once doctor marks completed
      // Using universal status constants
      if (normalizedStatus !== APPOINTMENT_STATUS.COMPLETED) {
        // Legacy support for 'checked' and 'attended' statuses
      const status = (apt.status || '').toLowerCase();
        if (!['checked', 'attended'].includes(status)) return false;
      }
      
      if (!apt.date && !apt.dateObj) return false;

      const appointmentDate = toIST(apt.dateObj || apt.date);
      if (!appointmentDate) return false;

      return isSameDayIST(appointmentDate, today);
    });
  }, [allAppointments]);

  // All appointments for today (regardless of status) - includes confirmed, checked-in, and completed
  const allTodayAppointments = useMemo(() => {
    const today = getISTStartOfDay();

    return allAppointments
      .filter((apt: any) => {
        if (!apt.date && !apt.dateObj) return false;
        const appointmentDate = toIST(apt.dateObj || apt.date);
        if (!appointmentDate) return false;
        return isSameDayIST(appointmentDate, today);
      })
      .sort((a: any, b: any) => {
        const sa = parseStartDateTime(a) || new Date(0);
        const sb = parseStartDateTime(b) || new Date(0);
        return sa.getTime() - sb.getTime();
    });
  }, [allAppointments]);

  // Get appointments for active tab (today vs upcoming vs checked)
  const appointmentsToShow = useMemo(() => {
    if (activeAppointmentTab === 'checked') {
      return checkedTodayAppointments;
    }
    if (activeAppointmentTab === 'today') {
      return allTodayAppointments;
    }
    return confirmedFutureAppointments;
  }, [activeAppointmentTab, confirmedFutureAppointments, checkedTodayAppointments, allTodayAppointments]);

  // Generate tab items for appointments - Order: Upcoming, Checked, Today
  const appointmentTabs = useMemo(() => {
    return [
      { key: 'upcoming', label: `Upcoming (${confirmedFutureAppointments.length})`, count: confirmedFutureAppointments.length },
      { key: 'checked', label: `Checked (${checkedTodayAppointments.length})`, count: checkedTodayAppointments.length },
      { key: 'today', label: `Today (${allTodayAppointments.length})`, count: allTodayAppointments.length },
    ];
  }, [confirmedFutureAppointments.length, checkedTodayAppointments.length, allTodayAppointments.length]);

  // Update active tab if current tab has no appointments - Default to 'upcoming' (first tab)
  useEffect(() => {
    if (appointmentTabs.length > 0 && !appointmentTabs.find(tab => tab.key === activeAppointmentTab)) {
      setActiveAppointmentTab(appointmentTabs[0].key);
    } else if (appointmentTabs.length === 0) {
      setActiveAppointmentTab('upcoming');
    }
  }, [appointmentTabs, activeAppointmentTab]);

  // Check if appointment time has passed today (in IST)
  const isPastToday = (apt: any): boolean => {
    const start = parseStartDateTime(apt);
    if (!start) return false;
    const now = getISTNow();
    const today = getISTStartOfDay(now);
    return isSameDay(start, today) && start.getTime() < now.getTime();
  };
  
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
  
  // Calculate completed appointments using universal status constants
  const completedAppointmentsCount = useMemo(() => {
    return allAppointments.filter((apt: any) => 
      normalizeStatus(apt.status) === APPOINTMENT_STATUS.COMPLETED
    ).length;
  }, [allAppointments]);

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

  // Calculate stats - Always use actual counts regardless of future appointments
  // Note: Currently hospital timings are 9 AM - 5 PM IST, but in the future:
  // - Hospital admins will be able to configure hospital timings and slots
  // - Doctors will be able to set their own availability timings
  const stats = {
    totalPatients: confirmedFutureAppointments.length > 0 
      ? new Set(confirmedFutureAppointments.map((apt: any) => apt.patient)).size 
      : 0,
    todayAppointments: confirmedTodayAppointments.length, // Use confirmedTodayAppointments directly
    completedAppointments: completedAppointmentsCount,
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
        <Spin size="large" tip="Loading dashboard…" />
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

  const handleOpenPrescriptionModal = async (appointment?: any, prescription?: any) => {
    // If appointment status is "checked-in", automatically start consultation
    if (appointment?.id && normalizeStatus(appointment.status) === APPOINTMENT_STATUS.CHECKED_IN) {
      try {
        const token = localStorage.getItem('auth-token');
        if (token) {
          const res = await fetch(`/api/appointments/${appointment.id}/status`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: APPOINTMENT_STATUS.IN_CONSULTATION }),
          });
          if (res.ok) {
            message.success('Consultation started');
            queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
          }
        }
      } catch (error) {
        console.error('❌ Error starting consultation:', error);
        // Continue to open prescription modal even if start consultation fails
      }
    }

    if (appointment?.patientId) {
      setSelectedPatientId(appointment.patientId);
      setSelectedAppointmentId(appointment.id);
      setSelectedPatientName(appointment.patient || appointment.patientName);
    } else {
      setSelectedPatientId(undefined);
      setSelectedAppointmentId(undefined);
      setSelectedPatientName(undefined);
    }
    setSelectedPrescription(prescription);
    setIsPrescriptionModalOpen(true);
  };

  const handleClosePrescriptionModal = async () => {
    setIsPrescriptionModalOpen(false);
    setSelectedPatientId(undefined);
    setSelectedAppointmentId(undefined);
    setSelectedPrescription(undefined);
    // Force refetch prescriptions to update the UI after modal closes
    try {
      console.log('🔄 Refetching prescriptions after modal close...');
      await queryClient.invalidateQueries({ queryKey: ['/api/prescriptions/doctor'] });
      const result = await refetchPrescriptions();
      console.log('✅ Prescriptions refetched after modal close. Count:', result.data?.length || 0);
    } catch (error) {
      console.error('❌ Error refetching prescriptions after modal close:', error);
    }
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

  const renderMobileAppointmentCard = (record: any) => {
    const normalizedStatus = normalizeStatus(record.status);
    const statusConfig = getStatusConfig(normalizedStatus);
    const existingPrescription =
      prescriptionsByAppointmentId.get(record.id) ||
      prescriptionsByAppointmentId.get(record.appointmentId) ||
      (record.patientId ? prescriptionsByAppointmentId.get(`patient-${record.patientId}`) : undefined);
    const hasPrescription = !!existingPrescription;
    const isFinal = isFinalStatus(normalizedStatus);
    const isChecked = normalizedStatus === APPOINTMENT_STATUS.COMPLETED;

    const dateLabel = (() => {
      if (!record.dateObj && !record.date) return 'N/A';
      const appointmentDate = toIST(record.dateObj || record.date);
      if (!appointmentDate) return 'N/A';
      const today = getISTStartOfDay();
      if (isSameDayIST(appointmentDate, today)) return 'Today';
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (isSameDayIST(appointmentDate, tomorrow)) return 'Tomorrow';
      return dayjs(appointmentDate).format('DD MMM YYYY');
    })();
    const pastToday = activeAppointmentTab === 'today' && isPastToday(record);

    const handleChecked = async () => {
      if (!record.id || !hasPrescription) return;
      try {
        setMarkingCheckedId(record.id);
        const token = localStorage.getItem('auth-token');
        if (!token) {
          message.error('Authentication required');
          return;
        }
        const res = await fetch(`/api/appointments/${record.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: APPOINTMENT_STATUS.COMPLETED }),
        });
        const data = await res.json();
        if (!res.ok) {
          message.error(data.message || 'Failed to mark as complete');
          return;
        }
        message.success('Appointment marked as complete');
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
        queryClient.invalidateQueries({ queryKey: ['/api/prescriptions/doctor'] });
      } catch (error) {
        console.error('❌ Error marking as complete:', error);
        message.error('Failed to mark as complete');
      } finally {
        setMarkingCheckedId(null);
      }
    };

    return (
      <Card
        key={record.id}
        size="small"
        variant="borderless"
        style={{
          borderRadius: 16,
          border: '1px solid #E5E7EB',
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
              {record.patient || record.patientName || 'Unknown Patient'}
            </Button>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.4 }}>
              {dateLabel} • <span style={{ fontFamily: 'monospace' }}>{record.time || 'N/A'}</span>
            </Text>
          </div>

          <Space size={6} wrap style={{ justifyContent: 'flex-end' }}>
            {pastToday && (
              <Tag color="default" style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>
                PAST
              </Tag>
            )}
            {record.priority && (
              <Tag
                color={String(record.priority).toLowerCase() === 'high' ? 'red' : String(record.priority).toLowerCase() === 'urgent' ? 'orange' : 'blue'}
                style={{ margin: 0, fontSize: 12 }}
              >
                {record.priority}
              </Tag>
            )}
            <Tag color={statusConfig.color} style={{ margin: 0, fontSize: 12 }}>
              {statusConfig.label}
            </Tag>
          </Space>
        </div>

        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Type: {record.type || 'N/A'}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {hasPrescription ? 'Prescription added' : 'No prescription'}
          </Text>
        </div>

        <div style={{ marginTop: 12 }}>
          <Space size={6} wrap>
            <Button
              size="small"
              type="primary"
              icon={<img src={prescriptionIcon} alt="Prescription" style={{ width: 14, height: 14 }} />}
              onClick={() => handleOpenPrescriptionModal(record, existingPrescription)}
              disabled={!record.patientId || isFinal || !canCreatePrescription(normalizedStatus)}
              title={hasPrescription ? 'View / Edit Prescription' : 'Add Prescription'}
            />
            <Button
              size="small"
              type="link"
              icon={<img src={tubeIcon} alt="Request Lab Test" style={{ width: 14, height: 14 }} />}
              onClick={() => {
                setSelectedPatientId(record.patientId);
                setSelectedAppointmentId(record.id);
                setSelectedPatientName(record.patient || record.patientName);
                setIsLabRequestModalOpen(true);
              }}
              disabled={!record.patientId}
              title="Request Lab Test"
            />
            {isChecked ? (
              <Text style={{ color: '#52c41a', fontWeight: 500, fontSize: 14 }}>Checked</Text>
            ) : (
              <Button
                size="small"
                danger
                onClick={handleChecked}
                disabled={!hasPrescription || isFinal}
                loading={markingCheckedId === record.id}
                style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
              >
                Checked
              </Button>
            )}
          </Space>
        </div>
      </Card>
    );
  };

  // Define appointment columns after handlers are defined
  // Column widths optimized to prevent horizontal scrolling and keep Action column visible
  const appointmentColumns = [
    {
      title: '#',
      key: 'serial',
      width: 60,
      align: 'center' as const,
      fixed: 'left' as const,
      render: (_: any, __: any, index: number) => (
        <Text type="secondary" style={{ fontWeight: 500 }}>{index + 1}</Text>
      ),
    },
    {
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
      width: 200,
      render: (text: string, record: any) => {
        const age = (() => {
          if (!record.patientDateOfBirth) return null;
          const dob = new Date(record.patientDateOfBirth);
          if (isNaN(dob.getTime())) return null;
          const today = new Date();
          let a = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) a--;
          return a;
        })();

        const bg = record.patientBloodGroup ? String(record.patientBloodGroup) : null;

        return (
          <Space direction="vertical" size={0} style={{ lineHeight: 1.2 }}>
            <Button
              type="link"
              style={{ padding: 0, height: 'auto', fontWeight: 500, color: '#1890ff' }}
              className="patient-name-link"
              onClick={() => record.patientId && handleViewPatientInfo(record.patientId)}
            >
              {text}
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {age !== null ? `Age ${age}` : 'Age N/A'}
              {bg ? ` • BG ${bg}` : ''}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Date & Time',
      key: 'dateTime',
      width: 150,
      render: (_: any, record: any) => {
        const dateLabel = (() => {
          if (!record.dateObj && !record.date) return 'N/A';
          const appointmentDate = toIST(record.dateObj || record.date);
          if (!appointmentDate) return 'N/A';
          const today = getISTStartOfDay();
          if (isSameDayIST(appointmentDate, today)) return 'Today';
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (isSameDayIST(appointmentDate, tomorrow)) return 'Tomorrow';
          return dayjs(appointmentDate).format('DD MMM YYYY');
        })();

        const timeLabel = record.time || 'N/A';

        return (
          <Space direction="vertical" size={0} style={{ lineHeight: 1.2 }}>
            <Text>{dateLabel}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{timeLabel}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Token',
      dataIndex: 'tokenNumber',
      key: 'tokenNumber',
      width: 70,
      align: 'center' as const,
      render: (tokenNumber: number | null | undefined) =>
        tokenNumber ? <Text strong>{tokenNumber}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
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
      width: 110,
      render: (status: string) => {
        const normalizedStatus = normalizeStatus(status);
        const statusConfig = getStatusConfig(normalizedStatus);
        return (
          <Tag color={statusConfig.color}>
            {statusConfig.label}
        </Tag>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 240,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        const normalizedStatus = normalizeStatus(record.status);
        // Check for existing prescription by appointment ID (primary lookup)
        // Try multiple keys to handle different data formats
        const appointmentIdKey = record.id || record.appointmentId;
        const existingPrescription =
          (appointmentIdKey && prescriptionsByAppointmentId.get(appointmentIdKey)) ||
          (record.appointmentId && prescriptionsByAppointmentId.get(record.appointmentId));
        const hasPrescription = !!existingPrescription;
        
        // Debug logging to track prescription lookup
        if (record.id && process.env.NODE_ENV === 'development') {
          const mapKeys = Array.from(prescriptionsByAppointmentId.keys());
          console.log(`🔍 Appointment ${record.id} prescription check:`, {
            appointmentId: record.id,
            hasPrescription,
            prescriptionId: existingPrescription?.id,
            prescriptionAppointmentId: existingPrescription?.appointmentId || existingPrescription?.appointment_id,
            totalPrescriptions: prescriptions.length,
            mapSize: prescriptionsByAppointmentId.size,
            mapKeys: mapKeys.slice(0, 10), // Show first 10 keys
          });
        }
        
        const isFinal = isFinalStatus(normalizedStatus);
        const isChecked = normalizedStatus === APPOINTMENT_STATUS.COMPLETED;

        const handleChecked = async () => {
          if (!record.id || !hasPrescription) return;
          try {
            setMarkingCheckedId(record.id);
            const token = localStorage.getItem('auth-token');
            if (!token) {
              message.error('Authentication required');
              return;
            }
            const res = await fetch(`/api/appointments/${record.id}/status`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: APPOINTMENT_STATUS.COMPLETED }),
            });
            const data = await res.json();
            if (!res.ok) {
              message.error(data.message || 'Failed to mark checked');
              return;
            }
            message.success('Appointment moved to Checked');
            queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
            queryClient.invalidateQueries({ queryKey: ['/api/prescriptions/doctor'] });
          } catch (error) {
            console.error('❌ Error marking checked:', error);
            message.error('Failed to mark checked');
          } finally {
            setMarkingCheckedId(null);
          }
        };

        // Allow viewing prescription even after completion, but restrict adding new ones
        const canViewPrescription = hasPrescription || canCreatePrescription(normalizedStatus);

        return (
          <Space>
        <Button
          type="link"
              icon={<img src={prescriptionIcon} alt="Prescription" style={{ width: 16, height: 16 }} />}
              onClick={() => handleOpenPrescriptionModal(record, existingPrescription)}
              disabled={!record.patientId || !canViewPrescription}
              title={hasPrescription ? 'View / Edit Prescription' : 'Add Prescription'}
            />
            <Button
              type="link"
              icon={<img src={tubeIcon} alt="Request Lab Test" style={{ width: 16, height: 16 }} />}
              onClick={() => {
                setSelectedPatientId(record.patientId);
                setSelectedAppointmentId(record.id);
                setSelectedPatientName(record.patient || record.patientName);
                setIsLabRequestModalOpen(true);
              }}
              disabled={!record.patientId}
              title="Request Lab Test"
            />
            {isChecked ? (
              <Text style={{ color: '#52c41a', fontWeight: 500 }}>Checked</Text>
            ) : (
            <Button
              type="link"
                danger
              onClick={handleChecked}
                disabled={!hasPrescription || isFinal}
              loading={markingCheckedId === record.id}
                style={{ color: '#ff4d4f', padding: 0 }}
            >
              Checked
            </Button>
            )}
          </Space>
        );
      },
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

        /* Today tab: visually de-emphasize appointments whose start time is already past */
        .doctor-dashboard-wrapper .appointment-row-past td {
          background: #F3F4F6 !important;
          color: #6B7280 !important;
        }
        
        /* Patient name link hover effects */
        .doctor-dashboard-wrapper .patient-name-link {
          transition: all 0.2s ease !important;
        }
        .doctor-dashboard-wrapper .patient-name-link:hover {
          color: #40a9ff !important;
          text-decoration: underline !important;
          transform: translateX(2px);
        }
        .doctor-dashboard-wrapper .patient-name-link:active {
          color: #096dd9 !important;
        }
        /* Fix table scrolling - ensure last row is fully visible */
        .doctor-dashboard-wrapper .ant-table-body {
          padding-bottom: 40px !important;
        }
        .doctor-dashboard-wrapper .ant-table-body-inner {
          padding-bottom: 40px !important;
        }
        /* Reduce table cell padding */
        .doctor-dashboard-wrapper .ant-table-thead > tr > th,
        .doctor-dashboard-wrapper .ant-table-tbody > tr > td {
          padding: 8px 8px !important;
        }
        /* Ensure Actions column is always visible */
        .doctor-dashboard-wrapper .ant-table-cell-fix-right {
          background: var(--ant-table-bg) !important;
          box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1) !important;
        }
        
        /* Fix tabs overlapping with table content */
        .doctor-dashboard-wrapper .ant-tabs {
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 auto !important;
          min-height: 0 !important;
          position: relative !important;
        }
        .doctor-dashboard-wrapper .ant-tabs-nav {
          margin: 0 !important;
          padding: 0 16px !important;
          flex-shrink: 0 !important;
          position: relative !important;
          z-index: 1 !important;
        }
        .doctor-dashboard-wrapper .ant-tabs-content-holder {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow: hidden !important;
          position: relative !important;
        }
        .doctor-dashboard-wrapper .ant-tabs-content {
          height: 100% !important;
          display: flex !important;
          flex: 1 1 auto !important;
          min-height: 0 !important;
        }
        .doctor-dashboard-wrapper .ant-tabs-tabpane {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 auto !important;
          min-height: 0 !important;
          padding-top: 0 !important;
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

      {/* Lab Report Viewer Modal */}
      <LabReportViewerModal
        open={isLabReportModalOpen}
        onCancel={() => {
          setIsLabReportModalOpen(false);
          setSelectedLabReport(null);
        }}
        report={selectedLabReport}
        loading={false}
      />

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
            {/* Notifications Bell (top-right) */}
            {!isMobile && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, paddingRight: 8, overflow: 'visible' }}>
                <NotificationBell />
              </div>
            )}
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
                <NotificationBell />
              </div>
            )}

            {/* Alert/Banner Notifications - Show important unread notifications */}
            {notifications.filter((n: any) => !n.isRead).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {notifications
                  .filter((n: any) => !n.isRead)
                  .slice(0, 3)
                  .map((notif: any) => {
                    const type = (notif.type || '').toLowerCase();
                    let alertType: 'info' | 'success' | 'warning' | 'error' = 'info';
                    if (type.includes('cancel') || type.includes('reject')) alertType = 'error';
                    else if (type.includes('confirm') || type.includes('complete')) alertType = 'success';
                    else if (type.includes('pending') || type.includes('resched')) alertType = 'warning';
                    
                    return (
                      <Alert
                        key={notif.id}
                        message={notif.title || 'Notification'}
                        description={notif.message}
                        type={alertType}
                        showIcon
                        closable
                        style={{ marginBottom: 8 }}
                        onClose={() => {
                          const token = localStorage.getItem('auth-token');
                          fetch(`/api/notifications/read/${notif.id}`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                          }).then(() => {
                            queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] });
                          });
                        }}
                      />
                    );
                  })}
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
                  { label: "Today's Appointments", value: stats.todayAppointments || 0, icon: <CalendarOutlined />, trendLabel: `${todayAppointments.length} scheduled`, trendColor: doctorTheme.primary, trendBg: doctorTheme.highlight, onView: () => setLocation('/dashboard/doctor/appointments') },
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
                    trendLabel={`${todayAppointments.length} scheduled`}
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

            {/* Queue Management Widget - Now Serving */}
            {doctorId && (
              <div style={{ marginBottom: 24 }}>
                <NowServingWidget doctorId={doctorId} />
              </div>
            )}

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
                <Title level={4} style={{ margin: 0 }}>Appointments</Title>
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
                              minHeight: 0,
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              paddingTop: 16,
                            }}>
                              {isMobile ? (
                                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 20 }}>
                                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                    {appointmentsLoading ? (
                                      <>
                                        <Card size="small" style={{ borderRadius: 16 }}><Spin /></Card>
                                        <Card size="small" style={{ borderRadius: 16 }}><Spin /></Card>
                                      </>
                                    ) : (
                                      appointmentsToShow.map(renderMobileAppointmentCard)
                                    )}
                                  </Space>
                                </div>
                              ) : (
                              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <Table
                                  columns={appointmentColumns}
                                  dataSource={appointmentsToShow}
                                  pagination={false}
                                  rowKey="id"
                                  loading={appointmentsLoading}
                                  size={isMobile ? "small" : "middle"}
                                  scroll={{ x: 'max-content', y: 'calc(100vh - 550px)' }}
                                  rowClassName={(record: any) =>
                                    activeAppointmentTab === 'today' && isPastToday(record) ? 'appointment-row-past' : ''
                                  }
                                />
                              </div>
                              )}
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
        prescription={selectedPrescription}
        doctorId={user?.id}
        hospitalId={doctorProfile?.hospitalId}
        patientId={selectedPatientId}
        patientName={selectedPatientName}
        appointmentId={selectedAppointmentId}
        patientsOverride={todaysPendingPatients}
        hideHospitalSelect
        appointmentIdMap={todaysAppointmentIdMap}
      />


      {/* Lab Request Modal */}
      <LabRequestModal
        open={isLabRequestModalOpen}
        onCancel={() => {
          setIsLabRequestModalOpen(false);
          setSelectedPatientId(undefined);
          setSelectedAppointmentId(undefined);
          setSelectedPatientName(undefined);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/labs/doctor/reports'] });
          message.success('Lab test recommended successfully');
          setIsLabRequestModalOpen(false);
          setSelectedPatientId(undefined);
          setSelectedAppointmentId(undefined);
          setSelectedPatientName(undefined);
        }}
        patientId={selectedPatientId}
        appointmentId={selectedAppointmentId}
        patientsOverride={todaysPendingPatients}
      />

      {/* Comprehensive Patient Info Drawer */}
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
                <List.Item
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedLabReport(report);
                        setIsLabReportModalOpen(true);
                      }}
                    >
                      <div style={{ width: '100%' }}>
                        <Space>
                          <Text strong>{report.testName}</Text>
                          {report.status && (
                            <Tag color={report.status === 'completed' ? 'green' : report.status === 'ready' ? 'blue' : 'orange'}>
                              {report.status}
                            </Tag>
                          )}
                        </Space>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(report.reportDate).format('DD MMM YYYY')} • {report.testType || 'N/A'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4, fontStyle: 'italic' }}>
                          Click to view detailed report
                        </Text>
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
                  renderItem={(prescription: any) => {
                    let medicationsData;
                    try {
                      medicationsData = typeof prescription.medications === 'string' 
                        ? JSON.parse(prescription.medications) 
                        : prescription.medications;
                    } catch {
                      medicationsData = null;
                    }
                    
                    return (
                      <List.Item
                        style={{
                          border: '1px solid #f0f0f0',
                          borderRadius: 8,
                          marginBottom: 12,
                          padding: 12,
                        }}
                      >
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <Text strong>Prescription #{prescription.id}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(prescription.createdAt).format('DD MMM YYYY, hh:mm A')}
                              </Text>
                            </div>
                            {prescription.isActive !== false && (
                              <Tag color="green">Active</Tag>
                            )}
                          </div>
                          
                          {prescription.diagnosis && (
                            <div style={{ marginBottom: 8 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>Diagnosis: </Text>
                              <Text strong>{prescription.diagnosis}</Text>
                            </div>
                          )}
                          
                          {medicationsData && Array.isArray(medicationsData) && medicationsData.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Medications:</Text>
                              <div style={{ paddingLeft: 12 }}>
                                {medicationsData.map((med: any, idx: number) => (
                                  <div key={idx} style={{ marginBottom: 4 }}>
                                    <Text strong>{med.name || med.medication}</Text>
                                    {med.dosage && (
                                      <Text type="secondary" style={{ marginLeft: 8 }}>
                                        • {med.dosage} {med.frequency || ''} {med.duration || ''}
                                      </Text>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {prescription.instructions && (
                            <div style={{ marginBottom: 8 }}>
                              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Instructions:</Text>
                              <Text style={{ fontSize: 13 }}>{prescription.instructions}</Text>
                            </div>
                          )}
                          
                          {prescription.followUpDate && (
                            <div>
                              <Text type="secondary" style={{ fontSize: 12 }}>Follow-up: </Text>
                              <Text>{dayjs(prescription.followUpDate).format('DD MMM YYYY')}</Text>
                            </div>
                          )}
                        </div>
                      </List.Item>
                    );
                  }}
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
    </Layout>
    </>
  );
}