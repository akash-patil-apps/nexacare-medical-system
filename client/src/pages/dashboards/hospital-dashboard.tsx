import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { formatTimeSlot12h } from "../../lib/time";
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
  Drawer,
  Spin,
  Empty,
  App,
  Divider,
  Tabs,
  List,
  DatePicker,
  Input,
} from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  FileTextOutlined,
  TeamOutlined,
  BankOutlined,
  BarChartOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  DollarOutlined,
  BellOutlined,
  LogoutOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { TopHeader } from '../../components/layout/TopHeader';
import { HospitalSidebar } from '../../components/layout/HospitalSidebar';
import { BedOccupancyMap, TransferModal, TransferDoctorModal, DischargeModal, BedStructureManager } from '../../components/ipd';
import { IpdEncountersList } from '../../components/ipd/IpdEncountersList';
import IPDPatientDetail from '../../pages/ipd/patient-detail';
import { ClinicalNotesEditor } from '../../components/clinical/ClinicalNotesEditor';
import { VitalsEntryForm } from '../../components/clinical/VitalsEntryForm';
import { subscribeToAppointmentEvents } from '../../lib/appointments-events';
import { getShownNotificationIds, markNotificationAsShown } from '../../lib/notification-shown-storage';
import { getISTStartOfDay, isSameDayIST, getISTNow } from '../../lib/timezone';
import dayjs, { type Dayjs } from 'dayjs';
import { normalizeStatus, APPOINTMENT_STATUS } from '../../lib/appointment-status';
import type { IpdEncounter } from '../../types/ipd';
import ReportsPage from '../reports/ReportsPage';
import AuditLogsPage from '../audit/audit-logs';
import { useAllPresence } from '../../hooks/use-all-presence';
import { PresencePanel } from '../../components/presence/PresencePanel';
import { updateMyPresence } from '../../lib/presence';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const hospitalTheme = {
  primary: '#7C3AED', // Purple
  secondary: '#0EA5E9', // Sky blue
  accent: '#FBBF24', // Amber
  background: '#F6F2FF', // Light purple
  highlight: '#EDE9FE', // Lighter purple
};

export default function HospitalDashboard() {
  const [location, setLocation] = useLocation();
  const { user, isLoading, logout } = useAuth();
  const { notification: notificationApi } = App.useApp();
  const { isMobile, isTablet } = useResponsive();
  const queryClient = useQueryClient();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<string>('today_all');
  const [selectedViewDate, setSelectedViewDate] = useState<Dayjs | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<string>('appointments');
  const [ipdSubTab, setIpdSubTab] = useState<string>('structure');
  const [selectedEncounter, setSelectedEncounter] = useState<IpdEncounter | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferDoctorModalOpen, setIsTransferDoctorModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [patientInfoDrawerOpen, setPatientInfoDrawerOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
  const [vitalsHistory, setVitalsHistory] = useState<any[]>([]);
  const [isClinicalNoteModalOpen, setIsClinicalNoteModalOpen] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedEncounterForDetail, setSelectedEncounterForDetail] = useState<number | null>(null);
  const [patientsSearch, setPatientsSearch] = useState('');
  const [loadingPatientId, setLoadingPatientId] = useState<number | null>(null);

  const onlinePresence = useAllPresence(!!user);

  // Redirect if not authenticated
  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }

  // Redirect if user doesn't have HOSPITAL or ADMIN role
  if (!isLoading && user) {
    const userRole = user.role?.toUpperCase();
    if (userRole !== 'HOSPITAL' && userRole !== 'ADMIN') {
      message.warning('You do not have access to this dashboard');
      switch (userRole) {
        case 'PATIENT':
          return <Redirect to="/dashboard/patient" />;
        case 'DOCTOR':
          return <Redirect to="/dashboard/doctor" />;
        case 'RECEPTIONIST':
          return <Redirect to="/dashboard/receptionist" />;
        case 'LAB':
          return <Redirect to="/dashboard/lab" />;
        case 'NURSE':
          return <Redirect to="/dashboard/nurse" />;
        case 'PHARMACIST':
          return <Redirect to="/dashboard/pharmacist" />;
        case 'RADIOLOGY_TECHNICIAN':
          return <Redirect to="/dashboard/radiology-technician" />;
        default:
          return <Redirect to="/login" />;
      }
    }
  }


  // Fetch clinical notes and vitals
  const fetchClinicalData = async (patientId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      
      // Fetch clinical notes
      const notesResponse = await fetch(`/api/clinical/notes?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (notesResponse.ok) {
        const notes = await notesResponse.json();
        setClinicalNotes(notes);
      }
      
      // Fetch vitals
      const vitalsResponse = await fetch(`/api/clinical/vitals?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (vitalsResponse.ok) {
        const vitals = await vitalsResponse.json();
        setVitalsHistory(vitals);
      }
    } catch (error) {
      console.error('Error fetching clinical data:', error);
    }
  };

  // Handle view patient info
  const handleViewPatientInfo = async (patientId: number, encounter?: IpdEncounter) => {
    if (!patientId) {
      message.warning('Patient ID not available');
      return;
    }
    
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/reception/patients/${patientId}/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          message.error('Patient not found');
          return;
        }
        if (response.status === 403) {
          message.error('You do not have permission to view this patient');
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
      
      setPatientInfo({
        ...data,
        encounter: encounter,
      });
      setPatientInfoDrawerOpen(true);
      
      // Fetch clinical notes and vitals
      await fetchClinicalData(patientId);
    } catch (error: any) {
      console.error('❌ Error loading patient info:', error);
      if (error.message?.includes('timeout') || error.message?.includes('CONNECT_TIMEOUT')) {
        message.error('Database connection timeout. Please check your connection and try again.');
      } else {
        message.error(error.message || 'Failed to load patient information. Please try again.');
      }
    }
  };

  // Get dashboard stats from real data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/hospitals/stats'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/hospitals/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        // Return default values if API fails
        return {
          totalDoctors: 0,
          totalPatients: 0,
          totalAppointments: 0,
          todayAppointments: 0,
          completedAppointments: 0,
          pendingAppointments: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          dailyRevenue: 0,
          weeklyRevenue: 0,
        };
      }
      return response.json();
    },
    enabled: !!user && user.role?.toUpperCase() === 'HOSPITAL',
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get hospital profile to access hospital name
  const { data: hospitalProfile } = useQuery({
    queryKey: ['/api/hospitals/my'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/hospitals/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data;
    },
    enabled: !!user && user.role?.toUpperCase() === 'HOSPITAL',
  });

  // Get hospital staff (doctors, nurses, etc.) for sidebar pages
  const { data: hospitalStaff, isLoading: staffLoading } = useQuery({
    queryKey: ['/api/hospitals/my/staff'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/hospitals/my/staff', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    },
    enabled: !!user && (user.role?.toUpperCase() === 'HOSPITAL' || user.role?.toUpperCase() === 'ADMIN'),
  });

  // Encountered patients (only those with at least one appointment at this hospital) for Patients page
  const { data: encounteredPatientsData, isLoading: encounteredPatientsLoading } = useQuery({
    queryKey: ['/api/hospitals/my/encountered-patients', patientsSearch],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const url = patientsSearch.trim()
        ? `/api/hospitals/my/encountered-patients?search=${encodeURIComponent(patientsSearch.trim())}`
        : '/api/hospitals/my/encountered-patients';
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    },
    enabled: !!user && user.role?.toUpperCase() === 'HOSPITAL',
  });
  const encounteredAppointments = encounteredPatientsData?.appointments ?? [];

  // Open patient detail from admin Patients list (hospital API - only if patient has encounter)
  const openPatientDetailFromList = async (patientId: number) => {
    setLoadingPatientId(patientId);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/hospitals/my/patients/${patientId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 403) {
          message.error('Patient has no encounter at this hospital');
          return;
        }
        if (response.status === 404) message.error('Patient not found');
        else message.error(err?.message || 'Failed to load patient');
        return;
      }
      const data = await response.json();
      setPatientInfo(data);
      setPatientInfoDrawerOpen(true);
      await fetchClinicalData(patientId);
    } catch (e: any) {
      message.error(e?.message || 'Failed to load patient details');
    } finally {
      setLoadingPatientId(null);
    }
  };

  // Get hospital name from profile
  const hospitalName = useMemo(() => {
    if (hospitalProfile?.name) {
      return hospitalProfile.name;
    }
    return null;
  }, [hospitalProfile?.name]);

  // Get notifications for hospital admin
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
        return [];
      }
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  // Show floating notifications for unread notifications (only once per notification, persisted across refresh)
  useEffect(() => {
    if (!notifications || notifications.length === 0 || !user?.id) return;

    const shownIds = getShownNotificationIds(user.id);
    const unread = notifications.filter((n: any) => !n.isRead);

    unread.forEach((notif: any) => {
      const notifId = Number(notif.id);
      if (shownIds.has(notifId)) return;
      markNotificationAsShown(user.id, notifId);

      const type = (notif.type || '').toLowerCase();
      let notificationType: 'info' | 'success' | 'warning' | 'error' = 'info';
      if (type.includes('cancel') || type.includes('reject') || type.includes('critical')) notificationType = 'error';
      else if (type.includes('confirm') || type.includes('complete') || type.includes('ready')) notificationType = 'success';
      else if (type.includes('pending') || type.includes('resched') || type.includes('processing')) notificationType = 'warning';

      notificationApi[notificationType]({
        message: notif.title || 'Notification',
        description: notif.message,
        placement: 'topRight',
        duration: 10,
        key: `notif-${notifId}`,
        onClick: () => {
          const token = localStorage.getItem('auth-token');
          if (token) {
            fetch(`/api/notifications/read/${notifId}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }).then(() => {
              queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] });
            });
          }
        },
        onClose: () => {
          const token = localStorage.getItem('auth-token');
          if (token) {
            fetch(`/api/notifications/read/${notifId}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }).then(() => {
              queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] });
            });
          }
        },
      });
    });
  }, [notifications, notificationApi, queryClient, user?.id]);

  // Real-time: subscribe to appointment events for notifications
  useEffect(() => {
    const unsubscribe = subscribeToAppointmentEvents({
      onEvent: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/me'] });
    },
  });
    return unsubscribe;
  }, [queryClient]);


  // Get hospital appointments with auto-refresh
  const { data: allAppointments = [], isLoading: appointmentsLoading } = useQuery({
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
      // Transform API data to match table format with date object
      return data.map((apt: any) => {
        // Handle different date formats
        let appointmentDate = apt.appointmentDate;
        if (typeof appointmentDate === 'string') {
          appointmentDate = new Date(appointmentDate);
          if (isNaN(appointmentDate.getTime())) {
            appointmentDate = null;
          }
        } else if (appointmentDate) {
          appointmentDate = new Date(appointmentDate);
        }
        
        return {
        id: apt.id,
        patient: apt.patientName || 'Unknown Patient',
        doctor: apt.doctorName || 'Unknown Doctor',
        time: apt.appointmentTime || apt.timeSlot || 'N/A',
        status: apt.status || 'pending',
        department: apt.doctorSpecialty || 'General',
          date: apt.appointmentDate,
          dateObj: appointmentDate,
          tokenNumber: apt.tokenNumber || null,
        };
      });
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch when component mounts
  });

  // Filter appointments that are today or in the future (by date and time) using IST
  // Hospital admin needs to see pending, confirmed, completed, and cancelled appointments
  const futureAppointments = useMemo(() => {
    const todayStart = getISTStartOfDay();
    
    return allAppointments
      .filter((apt: any) => {
        // Show all statuses (pending, confirmed, completed, cancelled)
        // Hospital admin can see all appointment statuses
        
        // Check if appointment has valid date
        if (!apt.date && !apt.dateObj) {
          return false;
        }
        
        try {
          const appointmentDate = apt.dateObj || new Date(apt.date);
          if (isNaN(appointmentDate.getTime())) {
            return false;
          }
          
          // Get appointment date in IST
          const aptDateIST = getISTStartOfDay(appointmentDate);
          
          // Include appointments from today onwards
          return aptDateIST >= todayStart;
        } catch (error) {
          console.error(`❌ Error checking date for appointment ${apt.id}:`, error);
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
    const today = getISTStartOfDay();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const groups: Record<string, any[]> = {
      today: [],
      tomorrow: [],
    };
    
    futureAppointments.forEach((apt: any) => {
      if (!apt.dateObj && !apt.date) return;

      const rawDate = apt.dateObj || new Date(apt.date);
      const appointmentDate = getISTStartOfDay(rawDate);
      
      const dateKey = appointmentDate.getTime();
      const todayKey = today.getTime();
      const tomorrowKey = tomorrow.getTime();
      
      if (dateKey === todayKey) {
        groups.today.push(apt);
      } else if (dateKey === tomorrowKey) {
        groups.tomorrow.push(apt);
      } else {
        const dateStr = dayjs(appointmentDate).format('YYYY-MM-DD');
        if (!groups[dateStr]) {
          groups[dateStr] = [];
        }
        groups[dateStr].push(apt);
      }
    });
    
    return groups;
  }, [futureAppointments]);

  // All appointments for today
  const todayAllAppointments = useMemo(() => {
    const todayIST = getISTStartOfDay();
    return futureAppointments.filter((apt: any) => {
      if (!apt.date && !apt.dateObj) return false;
      const d = apt.dateObj || new Date(apt.date);
      if (isNaN(d.getTime())) return false;
      return isSameDayIST(d, todayIST);
    });
  }, [futureAppointments]);

  // Pending appointments (Today + Future)
  const pendingAppointments = useMemo(() => {
    return futureAppointments.filter((apt: any) => normalizeStatus(apt.status) === APPOINTMENT_STATUS.PENDING);
  }, [futureAppointments]);

  // Confirmed appointments (Today + Future)
  const confirmedAppointments = useMemo(() => {
    return futureAppointments.filter((apt: any) => normalizeStatus(apt.status) === APPOINTMENT_STATUS.CONFIRMED);
  }, [futureAppointments]);

  // Checked-in appointments for today
  const checkedInTodayAppointments = useMemo(() => {
    const todayIST = getISTStartOfDay();
    return futureAppointments.filter((apt: any) => {
      const normalizedStatus = normalizeStatus(apt.status);
      if (
        normalizedStatus !== APPOINTMENT_STATUS.CHECKED_IN &&
        normalizedStatus !== APPOINTMENT_STATUS.ATTENDED
      ) {
        return false;
      }
      if (!apt.date && !apt.dateObj) return false;
      const d = apt.dateObj || new Date(apt.date);
      if (isNaN(d.getTime())) return false;
      return isSameDayIST(d, todayIST);
    });
  }, [futureAppointments]);

  // In consultation appointments for today
  const inConsultationTodayAppointments = useMemo(() => {
    return todayAllAppointments.filter((apt: any) => normalizeStatus(apt.status) === APPOINTMENT_STATUS.IN_CONSULTATION);
  }, [todayAllAppointments]);

  // Completed appointments for today
  const completedTodayAppointments = useMemo(() => {
    const todayIST = getISTStartOfDay();
    return futureAppointments.filter((apt: any) => {
      const normalizedStatus = normalizeStatus(apt.status);
      if (normalizedStatus !== APPOINTMENT_STATUS.COMPLETED) return false;
      if (!apt.date && !apt.dateObj) return false;
      const d = apt.dateObj || new Date(apt.date);
      if (isNaN(d.getTime())) return false;
      return isSameDayIST(d, todayIST);
    });
  }, [futureAppointments]);

  // Appointments for selected date (Past / By date tab) - any date, past or future
  const selectedDateAppointments = useMemo(() => {
    if (!selectedViewDate) return [];
    const selectedStart = getISTStartOfDay(selectedViewDate.toDate());
    return allAppointments
      .filter((apt: any) => {
        if (!apt.date && !apt.dateObj) return false;
        const d = apt.dateObj || new Date(apt.date);
        if (isNaN(d.getTime())) return false;
        return isSameDayIST(d, selectedStart);
      })
      .sort((a: any, b: any) => {
        const dateTimeA = a.dateObj || new Date(a.date);
        const dateTimeB = b.dateObj || new Date(b.date);
        return dateTimeA.getTime() - dateTimeB.getTime();
      });
  }, [allAppointments, selectedViewDate]);

  // Get appointments for active tab
  const appointmentsToShow = useMemo(() => {
    switch (activeAppointmentTab) {
      case 'today_all':
        return todayAllAppointments;
      case 'pending':
        return pendingAppointments;
      case 'confirmed':
        return confirmedAppointments;
      case 'checkedin':
        return checkedInTodayAppointments;
      case 'inconsultation':
        return inConsultationTodayAppointments;
      case 'completed':
        return completedTodayAppointments;
      case 'tomorrow':
        return appointmentsByDate.tomorrow || [];
      default:
        return appointmentsByDate[activeAppointmentTab] || [];
    }
  }, [
    activeAppointmentTab,
    appointmentsByDate,
    todayAllAppointments,
    pendingAppointments,
    confirmedAppointments,
    checkedInTodayAppointments,
    inConsultationTodayAppointments,
    completedTodayAppointments,
  ]);

  // Generate tab items for appointments
  const appointmentTabs = useMemo(() => {
    const tabs: Array<{ key: string; label: string; count: number }> = [];
    
    tabs.push({ key: 'today_all', label: `Today (${todayAllAppointments.length})`, count: todayAllAppointments.length });
    tabs.push({ key: 'pending', label: `Pending (${pendingAppointments.length})`, count: pendingAppointments.length });
    tabs.push({ key: 'confirmed', label: `Confirmed (${confirmedAppointments.length})`, count: confirmedAppointments.length });
    tabs.push({ key: 'checkedin', label: `Checked In (${checkedInTodayAppointments.length})`, count: checkedInTodayAppointments.length });
    tabs.push({ key: 'inconsultation', label: `In Consultation (${inConsultationTodayAppointments.length})`, count: inConsultationTodayAppointments.length });
    tabs.push({ key: 'completed', label: `Completed (${completedTodayAppointments.length})`, count: completedTodayAppointments.length });
    
    if (appointmentsByDate.tomorrow && appointmentsByDate.tomorrow.length > 0) {
      tabs.push({ key: 'tomorrow', label: `Tomorrow (${appointmentsByDate.tomorrow.length})`, count: appointmentsByDate.tomorrow.length });
    }
    
    Object.keys(appointmentsByDate)
      .filter(key => key !== 'today' && key !== 'tomorrow')
      .sort()
      .forEach(dateKey => {
        const count = appointmentsByDate[dateKey]?.length || 0;
        if (count > 0) {
          const date = dayjs(dateKey);
          tabs.push({ 
            key: dateKey, 
            label: `${date.format('DD MMM')} (${count})`, 
            count 
          });
        }
      });

    return tabs;
  }, [
    todayAllAppointments,
    pendingAppointments,
    confirmedAppointments,
    checkedInTodayAppointments,
    inConsultationTodayAppointments,
    completedTodayAppointments,
    appointmentsByDate,
  ]);

  // Use filtered appointments
  const appointments = appointmentsToShow;


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
      width: 150,
      render: (patient: string) => (
        <Text strong>{patient}</Text>
      ),
    },
    {
      title: 'Date & Time',
      key: 'datetime',
      width: 180,
      render: (_: any, record: any) => {
        const dateStr = record.dateObj 
          ? record.dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : record.date 
          ? new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'N/A';
        const timeStr = record.time ? formatTimeSlot12h(record.time) : 'N/A';
        return (
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{dateStr}</div>
            <div style={{ fontSize: 12, color: '#8C8C8C' }}>{timeStr}</div>
          </div>
        );
      },
    },
    {
      title: 'Token',
      key: 'token',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const token = record.tokenNumber;
        return token ? (
          <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>#{token}</Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
        );
      },
    },
    {
      title: 'Doctor',
      dataIndex: 'doctor',
      key: 'doctor',
      width: 150,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusColors: Record<string, string> = {
          'pending': 'orange',
          'confirmed': 'blue',
          'checked-in': 'cyan',
          'in_consultation': 'purple',
          'completed': 'green',
          'cancelled': 'red',
        };
        return (
          <Tag color={statusColors[status] || 'default'}>
            {status?.toUpperCase().replace('_', ' ') || 'PENDING'}
        </Tag>
        );
      },
    },
  ];

  const renderMobileAppointmentCard = (record: any) => {
    const status = (record.status || '').toLowerCase();
    const dateStr = record.dateObj 
      ? record.dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : record.date 
      ? new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : 'N/A';
    const statusColors: Record<string, string> = {
      'pending': 'orange',
      'confirmed': 'blue',
      'checked-in': 'cyan',
      'in_consultation': 'purple',
      'completed': 'green',
      'cancelled': 'red',
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
            <Text strong style={{ fontSize: 14, display: 'block', lineHeight: 1.4 }}>
              {record.patient || 'Unknown Patient'}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.4, marginTop: 4 }}>
              {record.doctor || 'Unknown Doctor'} • {record.department || 'General'}
            </Text>
          </div>
          <Space direction="vertical" align="end" size={4}>
            {record.tokenNumber && (
              <Tag color="blue" style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>#{record.tokenNumber}</Tag>
            )}
            <Tag color={statusColors[status] || 'default'} style={{ margin: 0, fontSize: 12 }}>
              {(record.status || 'N/A').toUpperCase().replace('_', ' ')}
          </Tag>
          </Space>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dateStr}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <span style={{ fontFamily: 'monospace' }}>{record.time ? formatTimeSlot12h(record.time) : 'N/A'}</span>
          </Text>
        </div>
      </Card>
    );
  };

  // Sync selectedMenuKey from URL; read from window.location.search so it updates when sidebar sets ?view=
  const selectedMenuKey = (() => {
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const view = new URLSearchParams(search).get('view');
      return (view && ['dashboard', 'patients', 'appointments', 'messages', 'reports', 'revenue'].includes(view)) ? view : 'dashboard';
    } catch {
      return 'dashboard';
    }
  })();

  // When opening dashboard with ?view=appointments, show appointments tab
  useEffect(() => {
    if (selectedMenuKey === 'appointments') setActiveMainTab('appointments');
  }, [selectedMenuKey]);

  const siderWidth = isMobile ? 0 : 80; // Narrow sidebar width matching PatientSidebar

  // Generate hospital admin ID (HOS-YYYY-XXX format)
  const hospitalAdminId = useMemo(() => {
    if (user?.id) {
      const year = new Date().getFullYear();
      const idNum = String(user.id).padStart(3, '0');
      return `HOS-${year}-${idNum}`;
    }
    return 'HOS-2024-001';
  }, [user?.id]);

  // Get initials for avatar
  const userInitials = useMemo(() => {
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.fullName.substring(0, 2).toUpperCase();
    }
    return 'HA';
  }, [user?.fullName]);

  return (
    <>
      <style>{`
        /* Override medical-container padding only when hospital dashboard is rendered */
        body:has(.hospital-dashboard-wrapper) .medical-container {
          padding: 0 !important;
          display: block !important;
          align-items: unset !important;
          justify-content: unset !important;
          background: transparent !important;
          min-height: 100vh !important;
        }
        
        /* Fix tabs overlapping with table content */
        .hospital-dashboard-wrapper .ant-tabs {
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 auto !important;
          min-height: 0 !important;
          position: relative !important;
        }
        .hospital-dashboard-wrapper .ant-tabs-nav {
          margin: 0 !important;
          padding: 0 16px !important;
          flex-shrink: 0 !important;
          position: relative !important;
          z-index: 1 !important;
        }
        .hospital-dashboard-wrapper .ant-tabs-content-holder {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow: hidden !important;
          position: relative !important;
        }
        .hospital-dashboard-wrapper .ant-tabs-content {
          height: 100% !important;
          display: flex !important;
          flex: 1 1 auto !important;
          min-height: 0 !important;
        }
        .hospital-dashboard-wrapper .ant-tabs-tabpane {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 auto !important;
          min-height: 0 !important;
          padding-top: 0 !important;
        }

        .hospital-dashboard-menu .ant-menu-item {
          border-radius: 12px !important;
          margin: 4px 8px !important;
          height: 48px !important;
          line-height: 48px !important;
          transition: all 0.3s ease !important;
          padding-left: 16px !important;
          background: transparent !important;
          border: none !important;
        }
        .hospital-dashboard-menu .ant-menu-item:hover {
          background: transparent !important;
        }
        .hospital-dashboard-menu .ant-menu-item:hover,
        .hospital-dashboard-menu .ant-menu-item:hover .ant-menu-title-content {
          color: #595959 !important;
        }
        .hospital-dashboard-menu .ant-menu-item-selected {
          background: ${hospitalTheme.primary} !important;
          font-weight: 500 !important;
          border: none !important;
          padding-left: 16px !important;
        }
        .hospital-dashboard-menu .ant-menu-item-selected,
        .hospital-dashboard-menu .ant-menu-item-selected .ant-menu-title-content {
          color: #fff !important;
        }
        .hospital-dashboard-menu .ant-menu-item-selected .ant-menu-item-icon,
        .hospital-dashboard-menu .ant-menu-item-selected .anticon {
          color: #fff !important;
        }
        .hospital-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) {
          color: #8C8C8C !important;
          background: transparent !important;
        }
        .hospital-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-title-content {
          color: #8C8C8C !important;
        }
        .hospital-dashboard-menu .ant-menu-item-selected::after {
          display: none !important;
        }
        .hospital-dashboard-menu .ant-menu-item-icon,
        .hospital-dashboard-menu .anticon {
          font-size: 18px !important;
          width: 18px !important;
          height: 18px !important;
        }

        /* Ensure table body has padding for last row visibility */
        .hospital-dashboard-wrapper .ant-table-body {
          padding-bottom: 40px !important;
        }
        .hospital-dashboard-wrapper .ant-table-body-inner {
          padding-bottom: 40px !important;
        }
        .hospital-dashboard-wrapper td.ant-table-cell {
          padding: 8px !important;
        }
        .hospital-dashboard-wrapper .ant-table-fixed-right {
          background: #fff;
          box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
        }
        
        /* Fix tabs overlapping with table content */
        .hospital-dashboard-wrapper .ant-tabs {
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 auto !important;
          min-height: 0 !important;
          position: relative !important;
        }
        .hospital-dashboard-wrapper .ant-tabs-nav {
          margin: 0 !important;
          padding: 0 16px !important;
          flex-shrink: 0 !important;
          position: relative !important;
          z-index: 1 !important;
        }
        .hospital-dashboard-wrapper .ant-tabs-content-holder {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow: hidden !important;
          position: relative !important;
        }
        .hospital-dashboard-wrapper .ant-tabs-content {
          height: 100% !important;
          display: flex !important;
          flex: 1 1 auto !important;
          min-height: 0 !important;
        }
        .hospital-dashboard-wrapper .ant-tabs-tabpane {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 auto !important;
          min-height: 0 !important;
          padding-top: 0 !important;
        }
        /* Ensure only active tab pane is visible - prevents tabs from appearing side by side */
        .hospital-dashboard-wrapper .ant-tabs-tabpane:not(.ant-tabs-tabpane-active) {
          display: none !important;
        }
        .hospital-dashboard-wrapper .ant-tabs-tabpane-active {
          display: flex !important;
        }
      `}</style>
      <Layout className="hospital-dashboard-wrapper" style={{ minHeight: '100vh', background: hospitalTheme.background }}>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
      <Sider 
        width={80}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: 80,
          background: '#fff',
          boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          borderRight: '1px solid #E5E7EB',
        }}
      >
          <HospitalSidebar selectedMenuKey={selectedMenuKey} />
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
          <HospitalSidebar selectedMenuKey={selectedMenuKey} onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: hospitalTheme.background,
          transition: 'margin-left 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh', // Fixed height to enable scrolling
        }}
      >
        {/* TopHeader - Matching Patient Dashboard Design */}
        <TopHeader
          userName={user?.fullName || 'Hospital Admin'}
          userRole="Hospital"
          userId={useMemo(() => {
            if (user?.id) {
              const year = new Date().getFullYear();
              const idNum = String(user.id).padStart(3, '0');
              return `HOS-${year}-${idNum}`;
            }
            return 'HOS-2024-001';
          }, [user?.id])}
          userInitials={useMemo(() => {
            if (user?.fullName) {
              const names = user.fullName.split(' ');
              if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
              }
              return user.fullName.substring(0, 2).toUpperCase();
            }
            return 'HA';
          }, [user?.fullName])}
          notificationCount={notifications.filter((n: any) => !n.isRead).length}
        />

        <Content
          style={{
            background: hospitalTheme.background,
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0, // Important for flex scrolling
            // Responsive padding - reduced to save side space
            padding: isMobile 
              ? '12px 12px 16px'  // Mobile: smaller side padding
              : isTablet 
                ? '12px 16px 20px'  // Tablet: medium side padding
                : '12px 16px 20px', // Desktop: reduced padding
            display: 'flex',
            flexDirection: 'column',
            margin: 0,
            width: '100%',
          }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1,
            minHeight: 0,
          }}>
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
            
            {/* Floating Notifications - Auto-dismiss after 10 seconds (handled by useEffect) */}

            {/* Sidebar page: Patients (doctors managed via Staff management) */}
            {selectedMenuKey === 'patients' ? (
              <Card
                variant="borderless"
                style={{
                  borderRadius: 16,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #E5E7EB',
                  background: '#fff',
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
                title={
                  <span style={{ fontSize: 18, fontWeight: 600 }}>
                    <UserOutlined style={{ marginRight: 8, color: hospitalTheme.primary }} />
                    Patients (encountered at this hospital)
                  </span>
                }
                extra={
                  <Input.Search
                    placeholder="Search by name, mobile, email or Patient ID"
                    allowClear
                    value={patientsSearch}
                    onChange={(e) => setPatientsSearch(e.target.value)}
                    onSearch={(v) => setPatientsSearch(v || '')}
                    style={{ width: isMobile ? '100%' : 320 }}
                  />
                }
                bodyStyle={{ flex: 1, minHeight: 0, overflow: 'auto', padding: isMobile ? 12 : 16 }}
              >
                {encounteredPatientsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Spin size="large" />
                  </div>
                ) : encounteredAppointments.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={patientsSearch.trim() ? 'No matching patients with appointments at this hospital' : 'No patients have booked appointments at this hospital yet'}
                    style={{ padding: '48px 0' }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {(() => {
                      const now = getISTNow();
                      const todayStart = getISTStartOfDay(now);
                      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
                      const groups: { label: string; dateKey: string; appointments: typeof encounteredAppointments }[] = [];
                      const getDateKey = (d: Date | string | null) => {
                        if (!d) return '';
                        const dt = typeof d === 'string' ? new Date(d) : d;
                        return getISTStartOfDay(dt).toISOString().slice(0, 10);
                      };
                      const getLabel = (d: Date | string | null) => {
                        if (!d) return 'Other';
                        const dt = typeof d === 'string' ? new Date(d) : d;
                        const dayStart = getISTStartOfDay(dt);
                        if (isSameDayIST(dayStart, todayStart)) return 'Today';
                        if (isSameDayIST(dayStart, yesterdayStart)) return 'Yesterday';
                        return dayjs(dt).format('DD MMM YYYY');
                      };
                      for (const apt of encounteredAppointments) {
                        const key = getDateKey(apt.appointmentDate);
                        const label = getLabel(apt.appointmentDate);
                        const existing = groups.find((g) => g.dateKey === key);
                        if (existing) existing.appointments.push(apt);
                        else groups.push({ label, dateKey: key, appointments: [apt] });
                      }
                      return groups.map((g) => (
                        <div key={g.dateKey}>
                          <Text strong style={{ fontSize: 15, marginBottom: 8, display: 'block' }}>{g.label}</Text>
                          <List
                            dataSource={g.appointments}
                            renderItem={(apt: any) => (
                              <List.Item
                                style={{ cursor: 'pointer', padding: '12px 16px', borderRadius: 8, border: '1px solid #E5E7EB' }}
                                onClick={() => openPatientDetailFromList(apt.patientId)}
                                actions={loadingPatientId === apt.patientId ? [<Spin key="s" size="small" />] : undefined}
                              >
                                <List.Item.Meta
                                  title={
                                    <Space>
                                      <span>{apt.patientName || '—'}</span>
                                      <Tag color={apt.status === 'completed' ? 'green' : apt.status === 'cancelled' ? 'red' : 'blue'}>{apt.status}</Tag>
                                      {apt.tokenIdentifier && <Tag>{apt.tokenIdentifier}</Tag>}
                                    </Space>
                                  }
                                  description={
                                    <Space split={<Divider type="vertical" />}>
                                      <span>{apt.doctorName || '—'}</span>
                                      <span>{apt.appointmentTime || apt.timeSlot || '—'}</span>
                                      <span>{apt.reason || '—'}</span>
                                    </Space>
                                  }
                                />
                              </List.Item>
                            )}
                          />
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </Card>
            ) : (
            <>
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
                  { label: "Total Doctors", value: statsLoading ? '...' : (stats?.totalDoctors || 0), icon: <TeamOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />, trendLabel: "Active", trendColor: hospitalTheme.primary, trendBg: hospitalTheme.highlight, onView: () => setLocation('/dashboard/hospital/staff') },
                  { label: "Total Patients", value: statsLoading ? '...' : (stats?.totalPatients || 0), icon: <UserOutlined style={{ fontSize: '24px', color: hospitalTheme.secondary }} />, trendLabel: "Registered", trendColor: hospitalTheme.secondary, trendBg: "#E0F2FE", onView: () => setLocation('/dashboard/hospital?view=patients') },
                  { label: "Daily Revenue", value: statsLoading ? '...' : `₹${(stats?.dailyRevenue || 0).toLocaleString()}`, icon: <BarChartOutlined style={{ fontSize: '24px', color: '#22C55E' }} />, trendLabel: "Today", trendColor: '#22C55E', trendBg: "#D1FAE5", onView: () => message.info('View revenue') },
                  { label: "Weekly Revenue", value: statsLoading ? '...' : `₹${(stats?.weeklyRevenue || 0).toLocaleString()}`, icon: <BarChartOutlined style={{ fontSize: '24px', color: '#3B82F6' }} />, trendLabel: "This Week", trendColor: '#3B82F6', trendBg: "#DBEAFE", onView: () => message.info('View revenue') },
                  { label: "Monthly Revenue", value: statsLoading ? '...' : `₹${(stats?.monthlyRevenue || stats?.totalRevenue || 0).toLocaleString()}`, icon: <BarChartOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />, trendLabel: "This Month", trendColor: hospitalTheme.primary, trendBg: hospitalTheme.highlight, onView: () => message.info('View revenue') },
                ].map((kpi, idx) => (
                  <div key={idx} style={{ minWidth: 220, scrollSnapAlign: 'start' }}>
                    <KpiCard {...kpi} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 16, marginBottom: 24, width: '100%', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
              <KpiCard
                label="Total Doctors"
                    value={statsLoading ? '...' : (stats?.totalDoctors || 0)}
                icon={<TeamOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />}
                trendLabel="Active"
                trendType="positive"
                    trendColor={hospitalTheme.primary}
                    trendBg={hospitalTheme.highlight}
                    onView={() => setLocation('/dashboard/hospital/staff')}
              />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
              <KpiCard
                label="Total Patients"
                    value={statsLoading ? '...' : (stats?.totalPatients || 0)}
                icon={<UserOutlined style={{ fontSize: '24px', color: hospitalTheme.secondary }} />}
                trendLabel="Registered"
                trendType="positive"
                    trendColor={hospitalTheme.secondary}
                    trendBg="#E0F2FE"
                    onView={() => setLocation('/dashboard/hospital?view=patients')}
              />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
              <KpiCard
                label="Daily Revenue"
                    value={statsLoading ? '...' : `₹${((stats?.dailyRevenue) || 0).toLocaleString()}`}
                icon={<BarChartOutlined style={{ fontSize: '24px', color: '#22C55E' }} />}
                trendLabel="Today"
                trendType="positive"
                    trendColor="#22C55E"
                    trendBg="#D1FAE5"
                    onView={() => window.location.href = '/dashboard/hospital/revenue'}
              />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
              <KpiCard
                label="Weekly Revenue"
                    value={statsLoading ? '...' : `₹${((stats?.weeklyRevenue) || 0).toLocaleString()}`}
                icon={<BarChartOutlined style={{ fontSize: '24px', color: '#3B82F6' }} />}
                trendLabel="This Week"
                trendType="positive"
                    trendColor="#3B82F6"
                    trendBg="#DBEAFE"
                    onView={() => window.location.href = '/dashboard/hospital/revenue'}
              />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
              <KpiCard
                label="Monthly Revenue"
                    value={statsLoading ? '...' : `₹${((stats?.monthlyRevenue || stats?.totalRevenue) || 0).toLocaleString()}`}
                icon={<BarChartOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />}
                trendLabel="This Month"
                trendType="positive"
                    trendColor={hospitalTheme.primary}
                    trendBg={hospitalTheme.highlight}
                    onView={() => window.location.href = '/dashboard/hospital/revenue'}
              />
                </div>
              </div>
            )}

          {/* Appointment Status Summary + Who's online */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={isMobile ? 24 : 18}>
          <Card 
            variant="borderless"
            style={{ 
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              border: '1px solid #E5E7EB',
              background: '#fff',
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
                <Text strong style={{ fontSize: 16, color: '#F97316' }}>{stats?.pendingAppointments || 0}</Text>
              </div>
              <Divider type="vertical" style={{ height: 24, margin: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 14, minWidth: 100 }}>Confirmed:</Text>
                <Text strong style={{ fontSize: 16, color: '#6366F1' }}>{stats?.confirmedAppointments || 0}</Text>
              </div>
              <Divider type="vertical" style={{ height: 24, margin: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 14, minWidth: 120 }}>Completed:</Text>
                <Text strong style={{ fontSize: 16, color: '#22C55E' }}>{stats?.completedAppointments || 0}</Text>
              </div>
              <Divider type="vertical" style={{ height: 24, margin: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 14, minWidth: 100 }}>Total:</Text>
                <Text strong style={{ fontSize: 16, color: hospitalTheme.primary }}>{stats?.totalAppointments || 0}</Text>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {stats?.completedAppointments || 0} of {stats?.todayAppointments || 0} completed today
                </Text>
              </div>
            </div>
          </Card>
            </Col>
            {!isMobile && (
            <Col xs={24} lg={6}>
              <PresencePanel
                presence={onlinePresence}
                title="Who's online"
                currentUserId={user?.id}
                onUpdateMyStatus={async (payload) => {
                  const token = localStorage.getItem('auth-token');
                  await updateMyPresence(token, payload);
                  queryClient.invalidateQueries({ queryKey: ['presence', 'all'] });
                }}
              />
            </Col>
            )}
          </Row>

            {/* Main Tabs: Appointments and IPD Management */}
            <div style={{ 
              width: '100%', 
              flex: 1, 
              minHeight: 0, 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden',
              marginBottom: 24,
            }}>
              <Tabs
                activeKey={activeMainTab}
                onChange={setActiveMainTab}
                type="line"
                style={{ 
                  width: '100%',
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
                items={[
                {
                  key: 'appointments',
                  label: 'Appointments',
                  children: (
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
                bodyStyle={{ 
                  flex: 1, 
                  minHeight: 0, 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: 0,
                }}
              >
                <div style={{ 
                  flex: 1, 
                  minHeight: 0, 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: isMobile ? 12 : 16,
                }}>
                {appointmentTabs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">
                      No appointments found.
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
                          height: '100%',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          paddingTop: 16,
                        }}>
                          {isMobile ? (
                            <Space direction="vertical" size={12} style={{ width: '100%', flex: 1, overflowY: 'auto', paddingRight: 8, paddingBottom: 40 }}>
                    {appointmentsLoading ? (
                      <>
                        <Card size="small" style={{ borderRadius: 16 }}><Spin /></Card>
                        <Card size="small" style={{ borderRadius: 16 }}><Spin /></Card>
                      </>
                    ) : (
                      appointments.map(renderMobileAppointmentCard)
                    )}
                  </Space>
                ) : (
                            <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                              <div style={{ flex: 1, height: '100%', overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
                                <div style={{ paddingBottom: 40 }}>
                    <Table
                      columns={appointmentColumns}
                      dataSource={appointments}
                      pagination={false}
                      rowKey="id"
                      loading={appointmentsLoading}
                      size={isMobile ? "small" : "middle"}
                                    scroll={{ 
                                      x: 'max-content',
                                      ...(appointments.length > 3 ? { y: 'calc(100vh - 520px)' } : {}),
                                    }}
                                  />
                                </div>
                              </div>
                  </div>
                )}
                        </div>
                      ),
                    }))}
                  />
                )}
                </div>
              </Card>

              {/* Past Appointments - visible section with date picker */}
              <Card
                variant="borderless"
                style={{
                  borderRadius: 16,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #E5E7EB',
                  background: '#fff',
                  marginTop: 16,
                }}
                title={<Text strong>Past Appointments</Text>}
                bodyStyle={{ padding: isMobile ? 12 : 16 }}
              >
                <Space style={{ marginBottom: 16 }} wrap>
                  <Text strong>Select date:</Text>
                  <DatePicker
                    value={selectedViewDate}
                    onChange={(d) => setSelectedViewDate(d)}
                    allowClear
                    style={{ minWidth: 180 }}
                  />
                  {selectedViewDate && (
                    <Text type="secondary">
                      {selectedDateAppointments.length} appointment(s) on {selectedViewDate.format('DD MMM YYYY')}
                    </Text>
                  )}
                </Space>
                {!selectedViewDate ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <Text type="secondary">Select a date to view appointments for that day.</Text>
                  </div>
                ) : appointmentsLoading ? (
                  <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                ) : selectedDateAppointments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <Text type="secondary">No appointments on this date.</Text>
                  </div>
                ) : isMobile ? (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {selectedDateAppointments.map(renderMobileAppointmentCard)}
                  </Space>
                ) : (
                  <Table
                    columns={appointmentColumns}
                    dataSource={selectedDateAppointments}
                    pagination={false}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 'max-content' }}
                  />
                )}
              </Card>
            </Col>
          </Row>
                  ),
                },
                {
                  key: 'ipd',
                  label: 'IPD Management',
                  children: (
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
                          bodyStyle={{ 
                            flex: 1, 
                            minHeight: 0, 
                            display: 'flex', 
                            flexDirection: 'column',
                            overflow: 'hidden',
                            padding: 0,
                          }}
                        >
                          <div style={{ 
                            flex: 1, 
                            minHeight: 0, 
                            display: 'flex', 
                            flexDirection: 'column',
                            overflow: 'hidden',
                            padding: isMobile ? 12 : 16,
                          }}>
                            <Tabs
                              activeKey={ipdSubTab}
                              onChange={setIpdSubTab}
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                flex: 1, 
                                minHeight: 0,
                                height: '100%',
                              }}
                              items={[
                                {
                                  key: 'structure',
                                  label: 'Bed Structure',
                                  children: (
                                    <div style={{ 
                                      flex: 1,
                                      minHeight: 0,
                                      overflow: 'hidden',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      paddingTop: 16,
                                      height: '100%',
                                    }}>
                                      <BedStructureManager />
                                    </div>
                                  ),
                                },
                                {
                                  key: 'beds',
                                  label: 'Bed Occupancy',
                                  children: (
                                    <div style={{ 
                                      flex: 1,
                                      minHeight: 0,
                                      overflow: 'hidden',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      paddingTop: 16,
                                    }}>
                                      <BedOccupancyMap
                                        onBedClick={(bed) => {
                                        }}
                                      />
                                    </div>
                                  ),
                                },
                                {
                                  key: 'encounters',
                                  label: 'Active Encounters',
                                  children: (
                                    <div style={{ 
                                      flex: 1,
                                      minHeight: 0,
                                      overflow: 'hidden',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      paddingTop: 16,
                                    }}>
                                      <IpdEncountersList
                                        showDoctorInfo={true}
                                        showAllEncounters={false}
                                        onViewPatient={async (encounter: IpdEncounter) => {
                                          if (encounter.patientId) {
                                            await handleViewPatientInfo(encounter.patientId, encounter);
                                          }
                                        }}
                                        onTransfer={(encounter: IpdEncounter) => {
                                          setSelectedEncounter(encounter);
                                          setIsTransferModalOpen(true);
                                        }}
                                        onTransferDoctor={(encounter: IpdEncounter) => {
                                          setSelectedEncounter(encounter);
                                          setIsTransferDoctorModalOpen(true);
                                        }}
                                        onDischarge={(encounter: IpdEncounter) => {
                                          setSelectedEncounter(encounter);
                                          setIsDischargeModalOpen(true);
                                        }}
                                      />
                                    </div>
                                  ),
                                },
                                {
                                  key: 'past-encounters',
                                  label: 'Past IPD Patients',
                                  children: (
                                    <div style={{ 
                                      flex: 1,
                                      minHeight: 0,
                                      overflow: 'hidden',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      paddingTop: 16,
                                    }}>
                                      <IpdEncountersList
                                        showDoctorInfo={true}
                                        showAllEncounters={true}
                                        onViewPatient={async (encounter: IpdEncounter) => {
                                          if (encounter.patientId) {
                                            await handleViewPatientInfo(encounter.patientId, encounter);
                                          }
                                        }}
                                      />
                                    </div>
                                  ),
                                },
                              ]}
                            />
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  ),
                },
                {
                  key: 'reports',
                  label: 'Reports & Analytics',
                  children: <ReportsPage hospitalId={hospitalProfile?.id} />,
                },
                {
                  key: 'audit',
                  label: 'Audit Logs',
                  children: (
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                      <AuditLogsPage />
                    </div>
                  ),
                },
              ]}
            />
            </div>
            </>
            )}
          </div>
        </Content>
      </Layout>
      </Layout>

      {/* Transfer Modal */}
      <TransferModal
        open={isTransferModalOpen}
        onCancel={() => {
          setIsTransferModalOpen(false);
          setSelectedEncounter(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/beds/available'] });
        }}
        encounter={selectedEncounter}
      />

      {/* Transfer Doctor Modal */}
      <TransferDoctorModal
        open={isTransferDoctorModalOpen}
        onCancel={() => {
          setIsTransferDoctorModalOpen(false);
          setSelectedEncounter(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
        }}
        encounter={selectedEncounter}
        hospitalId={hospitalProfile?.id}
      />

      {/* Discharge Modal */}
      <DischargeModal
        open={isDischargeModalOpen}
        onCancel={() => {
          setIsDischargeModalOpen(false);
          setSelectedEncounter(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/beds/available'] });
        }}
        encounter={selectedEncounter}
      />

      {/* Patient Info Drawer with Clinical Documentation */}
      <Drawer
        title={patientInfo?.patient?.user?.fullName || 'Patient Information'}
        placement="right"
        width={isMobile ? '100%' : 600}
        onClose={() => {
          setPatientInfoDrawerOpen(false);
          setPatientInfo(null);
          setClinicalNotes([]);
          setVitalsHistory([]);
        }}
        open={patientInfoDrawerOpen}
      >
        {patientInfo ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Patient Basic Info */}
            <Card title="Patient Information" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">Patient ID:</Text>
                  <Text strong style={{ marginLeft: 8 }}>
                    {patientInfo.patient?.id != null
                      ? `PAT-${new Date().getFullYear()}-${String(patientInfo.patient.id).padStart(4, '0')}`
                      : 'N/A'}
                  </Text>
                </div>
                <div>
                  <Text type="secondary">Name:</Text>
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
                {(patientInfo.patient?.user?.email) && (
                  <div>
                    <Text type="secondary">Email:</Text>
                    <Text strong style={{ marginLeft: 8 }}>{patientInfo.patient.user.email}</Text>
                  </div>
                )}
                {patientInfo.encounter && (
                  <>
                    <div>
                      <Text type="secondary">Attending Doctor:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {patientInfo.encounter.attendingDoctor?.fullName || patientInfo.encounter.admittingDoctor?.fullName || 'N/A'}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">{patientInfo.encounter.status === 'discharged' || patientInfo.encounter.status === 'LAMA' || patientInfo.encounter.status === 'death' || patientInfo.encounter.status === 'absconded' ? 'Last Bed:' : 'Current Bed:'}</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {patientInfo.encounter.currentBed?.bedName || `Bed ${patientInfo.encounter.currentBed?.bedNumber}` || 'N/A'}
                      </Text>
                    </div>
                    {(patientInfo.encounter.status === 'discharged' || patientInfo.encounter.status === 'LAMA' || patientInfo.encounter.status === 'death' || patientInfo.encounter.status === 'absconded') && patientInfo.encounter.dischargedAt && (
                      <div>
                        <Text type="secondary">Discharged At:</Text>
                        <Text strong style={{ marginLeft: 8 }}>
                          {dayjs(patientInfo.encounter.dischargedAt).format('DD MMM YYYY, hh:mm A')}
                        </Text>
                      </div>
                    )}
                  </>
                )}
              </Space>
            </Card>

            {/* Appointments / Visits */}
            {patientInfo.appointments?.length > 0 && (
              <Card title={`Appointments / Visits (${patientInfo.appointmentsTotal ?? patientInfo.appointments.length})`} size="small">
                <List
                  size="small"
                  dataSource={patientInfo.appointments.slice(0, 20)}
                  renderItem={(apt: any) => (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <Space>
                          <Text strong>{apt.doctorName || 'Doctor'}</Text>
                          <Tag color={apt.status === 'completed' ? 'green' : apt.status === 'cancelled' ? 'red' : 'blue'}>{apt.status}</Tag>
                        </Space>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {apt.appointmentDate ? dayjs(apt.appointmentDate).format('DD MMM YYYY') : ''} {apt.appointmentTime || apt.timeSlot || ''} — {apt.reason || '—'}
                        </Text>
                      </div>
                    </List.Item>
                  )}
                />
                {(patientInfo.appointmentsTotal ?? patientInfo.appointments.length) > 20 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>Showing last 20 of {patientInfo.appointmentsTotal ?? patientInfo.appointments.length}</Text>
                )}
              </Card>
            )}

            {/* Lab Reports */}
            {patientInfo.labReports?.length > 0 && (
              <Card title={`Lab Reports (${patientInfo.labReports.length})`} size="small">
                <List
                  size="small"
                  dataSource={patientInfo.labReports.slice(0, 15)}
                  renderItem={(lab: any) => (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <Text strong>{lab.reportType || lab.testName || 'Lab Report'}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {lab.reportDate ? dayjs(lab.reportDate).format('DD MMM YYYY') : ''} — {lab.status || '—'}
                        </Text>
                      </div>
                    </List.Item>
                  )}
                />
                {patientInfo.labReports.length > 15 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>Showing last 15</Text>
                )}
              </Card>
            )}

            {/* Prescriptions */}
            {patientInfo.prescriptions?.length > 0 && (
              <Card title={`Prescriptions (${patientInfo.prescriptionsTotal ?? patientInfo.prescriptions.length})`} size="small">
                <List
                  size="small"
                  dataSource={patientInfo.prescriptions.slice(0, 10)}
                  renderItem={(rx: any) => (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <Text strong>{rx.diagnosis || 'Prescription'}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {rx.createdAt ? dayjs(rx.createdAt).format('DD MMM YYYY') : ''} — Medications: {(typeof rx.medications === 'string' ? rx.medications : JSON.stringify(rx.medications || {})).slice(0, 80)}…
                        </Text>
                      </div>
                    </List.Item>
                  )}
                />
                {(patientInfo.prescriptionsTotal ?? patientInfo.prescriptions.length) > 10 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>Showing last 10 of {patientInfo.prescriptionsTotal ?? patientInfo.prescriptions.length}</Text>
                )}
              </Card>
            )}

            {/* Clinical Documentation */}
            <Card 
              title="Clinical Documentation"
              size="small"
              extra={
                <Space>
                  <Button
                    size="small"
                    onClick={() => {
                      if (patientInfo?.patient?.id) {
                        setIsClinicalNoteModalOpen(true);
                      }
                    }}
                  >
                    Add Note
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      if (patientInfo?.patient?.id) {
                        setIsVitalsModalOpen(true);
                      }
                    }}
                  >
                    Record Vitals
                  </Button>
                </Space>
              }
            >
              <Tabs
                size="small"
                items={[
                  {
                    key: 'notes',
                    label: `Clinical Notes (${clinicalNotes.length})`,
                    children: (
                      <div>
                        {clinicalNotes.length === 0 ? (
                          <Text type="secondary">No clinical notes yet</Text>
                        ) : (
                          <List
                            size="small"
                            dataSource={clinicalNotes}
                            renderItem={(note: any) => (
                              <List.Item>
                                <div style={{ width: '100%' }}>
                                  <Space>
                                    <Text strong>{note.noteType}</Text>
                                    <Tag color={note.isDraft ? 'orange' : 'green'}>
                                      {note.isDraft ? 'Draft' : 'Signed'}
                                    </Tag>
                                  </Space>
                                  <br />
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {dayjs(note.createdAt).format('DD MMM YYYY, hh:mm A')}
                                  </Text>
                                  {note.assessment && (
                                    <div style={{ marginTop: 8 }}>
                                      <Text type="secondary" style={{ fontSize: 12 }}>Assessment: </Text>
                                      <Text style={{ fontSize: 12 }}>{note.assessment.substring(0, 100)}...</Text>
                                    </div>
                                  )}
                                </div>
                              </List.Item>
                            )}
                          />
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'vitals',
                    label: `Vitals (${vitalsHistory.length})`,
                    children: (
                      <div>
                        {vitalsHistory.length === 0 ? (
                          <Text type="secondary">No vitals recorded yet</Text>
                        ) : (
                          <List
                            size="small"
                            dataSource={vitalsHistory.slice(0, 10)}
                            renderItem={(vital: any) => (
                              <List.Item>
                                <div style={{ width: '100%' }}>
                                  <Space>
                                    {vital.temperature && (
                                      <Text>Temp: {vital.temperature}°{vital.temperatureUnit || 'C'}</Text>
                                    )}
                                    {vital.bpSystolic && vital.bpDiastolic && (
                                      <Text>BP: {vital.bpSystolic}/{vital.bpDiastolic}</Text>
                                    )}
                                    {vital.pulse && <Text>Pulse: {vital.pulse}</Text>}
                                    {vital.spo2 && <Text>SpO2: {vital.spo2}%</Text>}
                                  </Space>
                                  <br />
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {dayjs(vital.recordedAt).format('DD MMM YYYY, hh:mm A')}
                                  </Text>
                                </div>
                              </List.Item>
                            )}
                          />
                        )}
                      </div>
                    ),
                  },
                  ...(patientInfo.encounter && (patientInfo.encounter.status === 'discharged' || patientInfo.encounter.status === 'LAMA' || patientInfo.encounter.status === 'death' || patientInfo.encounter.status === 'absconded') ? [{
                    key: 'discharge-summary',
                    label: 'Discharge Summary',
                    children: (
                      <div>
                        {patientInfo.encounter.dischargeSummaryText ? (
                          <div>
                            <div style={{ marginBottom: 16 }}>
                              <Text strong>Discharge Date: </Text>
                              <Text>{patientInfo.encounter.dischargedAt ? dayjs(patientInfo.encounter.dischargedAt).format('DD MMM YYYY, hh:mm A') : 'N/A'}</Text>
                            </div>
                            <div style={{ marginBottom: 16 }}>
                              <Text strong>Discharge Status: </Text>
                              <Tag color={patientInfo.encounter.status === 'discharged' ? 'green' : patientInfo.encounter.status === 'death' ? 'red' : 'orange'}>
                                {patientInfo.encounter.status?.toUpperCase()}
                              </Tag>
                            </div>
                            <div>
                              <Text strong>Discharge Summary:</Text>
                              <div style={{ 
                                marginTop: 16, 
                                padding: 16, 
                                background: '#f5f5f5', 
                                borderRadius: 8,
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'monospace',
                                fontSize: '13px',
                                maxHeight: '400px',
                                overflowY: 'auto'
                              }}>
                                {patientInfo.encounter.dischargeSummaryText}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Text type="secondary">No discharge summary available.</Text>
                          </div>
                        )}
                      </div>
                    ),
                  }] : []),
                ]}
              />
            </Card>
          </div>
        ) : (
          <Text type="secondary">No patient information available</Text>
        )}
      </Drawer>

      {/* Clinical Notes Editor Modal */}
      {patientInfo?.patient?.id && (
        <ClinicalNotesEditor
          open={isClinicalNoteModalOpen}
          onCancel={() => setIsClinicalNoteModalOpen(false)}
          onSuccess={() => {
            if (patientInfo?.patient?.id) {
              fetchClinicalData(patientInfo.patient.id);
            }
          }}
          patientId={patientInfo.patient.id}
          encounterId={patientInfo?.encounter?.id}
          noteType={patientInfo?.encounter ? "progress" : "consultation"}
        />
      )}

      {/* Vitals Entry Form Modal */}
      {patientInfo?.patient?.id && (
        <VitalsEntryForm
          open={isVitalsModalOpen}
          onCancel={() => setIsVitalsModalOpen(false)}
          onSuccess={() => {
            if (patientInfo?.patient?.id) {
              fetchClinicalData(patientInfo.patient.id);
            }
          }}
          patientId={patientInfo.patient.id}
          encounterId={patientInfo?.encounter?.id}
        />
      )}
    </>
  );
}