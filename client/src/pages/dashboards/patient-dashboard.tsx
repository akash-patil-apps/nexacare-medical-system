import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Redirect, useLocation } from 'wouter';
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Button, 
  Tag, 
  Space, 
  Typography,
  message,
  Skeleton,
  Tabs,
  Drawer,
  Modal,
  App,
  Input,
  Select,
} from 'antd';
import dayjs from 'dayjs';
import { PrescriptionPreview } from '../../components/prescription/PrescriptionPreview';
import {
  CalendarOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  PlusOutlined,
  MenuUnfoldOutlined,
  SendOutlined,
  ExperimentOutlined,
  MessageOutlined,
  ReloadOutlined,
  UploadOutlined,
  HistoryOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useOnboardingCheck } from '../../hooks/use-onboarding-check';
import { useResponsive } from '../../hooks/use-responsive';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { PrescriptionCard } from '../../components/dashboard/PrescriptionCard';
import LabReportViewerModal from '../../components/modals/lab-report-viewer-modal';
import { formatDate, formatDateTime } from '../../lib/utils';
import { formatTimeSlot12h } from '../../lib/time';
import { subscribeToAppointmentEvents } from '../../lib/appointments-events';
import { getShownNotificationIds, markNotificationAsShown } from '../../lib/notification-shown-storage';
import { PatientSidebar } from '../../components/layout/PatientSidebar';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { TopHeader } from '../../components/layout/TopHeader';
import BookAppointmentModal from '../../components/modals/BookAppointmentModal';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

type DashboardPrescription = {
  id: number;
  name: string;
  dosage: string;
  nextDose: string;
  refillsRemaining: string;
  adherence: number;
  createdAt: string | null;
};

type MedicineReminderItem = {
  time: string;
  timeLabel: string;
  medicationName: string;
  dosage: string;
  frequency?: string;
  prescriptionId: number;
  scheduledDate?: string;
  scheduledTime?: string;
  adherence?: 'taken' | 'skipped' | null;
};

type ReminderSettings = {
  morningTime?: string;
  noonTime?: string;
  afternoonTime?: string;
  nightTime?: string;
};

const fetchWithAuth = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const token = localStorage.getItem('auth-token');
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};



export default function PatientDashboard() {
  const { user, isLoading } = useAuth();
  const { notification: notificationApi } = App.useApp();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<string>('upcoming');
  const [selectedLabReport, setSelectedLabReport] = useState<any>(null);
  const [isLabReportModalOpen, setIsLabReportModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [isPrescriptionDetailOpen, setIsPrescriptionDetailOpen] = useState(false);
  const [refillPrescription, setRefillPrescription] = useState<any>(null);
  const [reminderSettingsModalOpen, setReminderSettingsModalOpen] = useState(false);
  const [reminderSettingsForm, setReminderSettingsForm] = useState<ReminderSettings>({});
  const [bookAppointmentModalOpen, setBookAppointmentModalOpen] = useState(false);
  const [refillNotes, setRefillNotes] = useState('');
  const [refillSubmitting, setRefillSubmitting] = useState(false);
  const [selectedMenuKey] = useState<string>('dashboard');

  // Redirect if not authenticated
  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }

  // Redirect if user doesn't have PATIENT role
  if (!isLoading && user) {
    const userRole = user.role?.toUpperCase();
    if (userRole !== 'PATIENT') {
      message.warning('You do not have access to this dashboard');
      switch (userRole) {
        case 'DOCTOR':
          return <Redirect to="/dashboard/doctor" />;
        case 'RECEPTIONIST':
          return <Redirect to="/dashboard/receptionist" />;
        case 'HOSPITAL':
          return <Redirect to="/dashboard/hospital" />;
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
  
  useOnboardingCheck();

  // Get notifications for patient
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
        if (type.includes('cancel') || type.includes('reject')) notificationType = 'error';
        else if (type.includes('confirm') || type.includes('complete')) notificationType = 'success';
        else if (type.includes('pending') || type.includes('resched')) notificationType = 'warning';
        
        // Show as floating notification in top right
        notificationApi[notificationType]({
          message: notif.title || 'Notification',
          description: notif.message,
          placement: 'topRight',
          duration: 10, // Auto-dismiss after 10 seconds
          key: `notif-${notifId}`,
          onClick: () => {
            // Mark as read when clicked
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
            // Mark as read when closed
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

  const {
    data: allAppointments = [],
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async () => {
      const data = await fetchWithAuth<Array<any>>('/api/appointments/my');
      // Transform API data with date object for proper date handling
      return data.map((apt) => {
        // Prefer timeSlot (HH:MM or HH:MM-HH:MM) over appointmentTime, because appointmentTime may be stored as 00:00:00
        const timeValue = apt.timeSlot || apt.appointmentTime || apt.time || '';
        const timeDisplay = timeValue ? formatTimeSlot12h(timeValue) : '';
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
          doctor: apt.doctorName || 'Doctor',
          specialty: apt.doctorSpecialty || 'General',
          date: apt.appointmentDate ? formatDate(apt.appointmentDate) : 'Date unavailable',
          time: timeDisplay,
          timeSlot: timeDisplay,
          status: apt.status || 'pending',
          hospital: apt.hospitalName || 'Hospital',
          rawDate: apt.appointmentDate || null,
          dateTime: apt.appointmentDate ? apt.appointmentDate : null,
          dateObj: appointmentDate,
          notes: apt.notes || '',
        };
      });
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Real-time: server pushes appointment updates (no polling).
  useEffect(() => {
    const unsubscribe = subscribeToAppointmentEvents({
      onEvent: () => {
        queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
        refetchAppointments();
      },
    });
    return unsubscribe;
  }, [queryClient, refetchAppointments]);

  // Listen for appointment updates from other tabs/windows (e.g., when receptionist confirms)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appointment-updated') {
        // Invalidate the query first, then refetch for more reliable updates
        queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
        refetchAppointments();
      }
    };
    
    // Also listen for custom events (same-window updates)
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      // Invalidate the query first, then refetch for more reliable updates
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      refetchAppointments();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('appointment-updated', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('appointment-updated', handleCustomEvent);
    };
  }, [refetchAppointments, queryClient]);

  // Filter appointments that are in the future (date + start time)
  // Patients should see upcoming items only if start time >= now
  const futureAppointments = useMemo(() => {
    const now = new Date();

    const parseStartDateTime = (apt: any) => {
      const base = apt.dateObj || (apt.rawDate ? new Date(apt.rawDate) : null);
      if (!base || isNaN(base.getTime())) return null;
      const start = new Date(base);

      const timeStr = (apt.timeSlot || apt.time || '').toString().trim();
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
    
    return allAppointments
      .filter((apt: any) => {
        const start = parseStartDateTime(apt);
        if (!start) return false;
        const isUpcoming = start.getTime() >= now.getTime();
        if (!isUpcoming) {
        }
        return isUpcoming;
      })
      .sort((a: any, b: any) => {
        // Sort by start time (earliest first)
        const aStart = parseStartDateTime(a) || new Date();
        const bStart = parseStartDateTime(b) || new Date();
        return aStart.getTime() - bStart.getTime();
      });
  }, [allAppointments]);

  // Checked/completed appointments
  const checkedAppointments = useMemo(() => {
    return allAppointments.filter((apt: any) => {
      const status = (apt.status || '').toLowerCase();
      return ['checked-in', 'checked', 'completed', 'attended'].includes(status);
    });
  }, [allAppointments]);

  const appointmentsByDate = useMemo(() => {
    const groups: Record<string, any[]> = {};
    futureAppointments.forEach((apt: any) => {
      const dateObj = apt.dateObj || (apt.rawDate ? new Date(apt.rawDate) : null);
      if (!dateObj || isNaN(dateObj.getTime())) return;
      const key = dateObj.toISOString().split('T')[0];
      if (!groups[key]) groups[key] = [];
      groups[key].push(apt);
    });
    // sort each group
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const aTime = a.dateObj || new Date(a.rawDate);
        const bTime = b.dateObj || new Date(b.rawDate);
        return aTime.getTime() - bTime.getTime();
      });
    });
    return groups;
  }, [futureAppointments]);

  const appointmentsToShow = useMemo(() => {
    if (activeAppointmentTab === 'checked') {
      return checkedAppointments;
    }
    if (activeAppointmentTab === 'upcoming') {
      return futureAppointments;
    }
    return appointmentsByDate[activeAppointmentTab] || [];
  }, [activeAppointmentTab, futureAppointments, checkedAppointments, appointmentsByDate]);

  const appointmentTabs = useMemo(() => {
    const tabs: Array<{ key: string; label: string; count: number }> = [];
    tabs.push({ key: 'upcoming', label: `Upcoming (${futureAppointments.length})`, count: futureAppointments.length });
    Object.keys(appointmentsByDate)
      .sort()
      .forEach(key => {
        const labelDate = formatDate(key);
        const count = appointmentsByDate[key]?.length || 0;
        tabs.push({ key, label: `${labelDate} (${count})`, count });
      });
    tabs.push({ key: 'checked', label: `Checked (${checkedAppointments.length})`, count: checkedAppointments.length });
    return tabs;
  }, [futureAppointments.length, checkedAppointments.length, appointmentsByDate]);

  // Update active tab if current tab has no appointments
  useEffect(() => {
    if (appointmentTabs.length > 0 && !appointmentTabs.find(tab => tab.key === activeAppointmentTab)) {
      setActiveAppointmentTab(appointmentTabs[0].key);
    } else if (appointmentTabs.length === 0) {
      setActiveAppointmentTab('today');
    }
  }, [appointmentTabs, activeAppointmentTab]);


  const {
    data: prescriptionsData = [],
    isLoading: prescriptionsLoading,
  } = useQuery({
    queryKey: ['patient-prescriptions'],
    queryFn: () => fetchWithAuth<Array<any>>('/api/prescriptions/patient'),
  });

  const {
    data: labReportsData = [],
    isLoading: labReportsLoading,
  } = useQuery({
    queryKey: ['patient-lab-reports'],
    queryFn: () => fetchWithAuth<Array<any>>('/api/labs/patient/reports'),
  });

  const { data: medicineReminders = [] } = useQuery({
    queryKey: ['patient-medicine-reminders'],
    queryFn: () => fetchWithAuth<MedicineReminderItem[]>('/api/prescriptions/patient/reminders'),
    enabled: !!user,
  });

  const { data: reminderSettings } = useQuery({
    queryKey: ['patient-reminder-settings'],
    queryFn: () => fetchWithAuth<ReminderSettings & { id?: number }>('/api/prescriptions/patient/reminder-settings'),
    enabled: !!user && reminderSettingsModalOpen,
  });

  const recordAdherenceMutation = useMutation({
    mutationFn: (body: { prescriptionId: number; medicationName: string; scheduledDate: string; scheduledTime: string; status: 'taken' | 'skipped' }) =>
      fetchWithAuth('/api/prescriptions/patient/adherence', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-medicine-reminders'] });
      message.success('Updated');
    },
    onError: () => message.error('Failed to update'),
  });

  const saveReminderSettingsMutation = useMutation({
    mutationFn: (body: ReminderSettings) =>
      fetchWithAuth('/api/prescriptions/patient/reminder-settings', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-medicine-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['patient-reminder-settings'] });
      setReminderSettingsModalOpen(false);
      message.success('Alarm times saved');
    },
    onError: () => message.error('Failed to save alarm times'),
  });

  useEffect(() => {
    if (reminderSettingsModalOpen && reminderSettings) {
      setReminderSettingsForm({
        morningTime: reminderSettings.morningTime ?? '09:00',
        noonTime: reminderSettings.noonTime ?? '12:00',
        afternoonTime: reminderSettings.afternoonTime ?? '14:00',
        nightTime: reminderSettings.nightTime ?? '20:00',
      });
    }
  }, [reminderSettingsModalOpen, reminderSettings]);


  const prescriptionCards: DashboardPrescription[] = useMemo(() => {
    const activeOnly = prescriptionsData.filter((rx: any) => rx.isActive !== false);
    return activeOnly.map((rx: any) => {
      let medications: any[] = [];
      try {
        medications = rx.medications ? JSON.parse(rx.medications) : [];
      } catch (error) {
      }
      const primary = medications[0] || {};
      const dosage = primary?.dosage
        ? `${primary.dosage}${primary.unit ? ` ${primary.unit}` : ''}`
        : rx.diagnosis || 'See instructions';

      return {
        id: rx.id,
        name: primary?.name || rx.diagnosis || 'Prescription',
        dosage,
        nextDose: primary?.schedule || (rx.followUpDate ? formatDateTime(rx.followUpDate) : 'Not scheduled'),
        refillsRemaining: primary?.refills ? `${primary.refills} refills left` : 'N/A',
        adherence: 1,
        createdAt: rx.createdAt || null,
      };
    });
  }, [prescriptionsData]);


  const stats = {
    totalAppointments: futureAppointments.length,
    upcomingAppointments: futureAppointments.filter((apt: any) =>
      apt.status === 'confirmed' || apt.status === 'pending'
    ).length,
    completedAppointments: futureAppointments.filter((apt: any) => apt.status === 'completed').length,
    prescriptions: prescriptionCards.length, // already filtered to active only
    labReports: labReportsData.length,
  };

  const messageCounts = {
    total: 0,
    unread: 0,
  };

  const handleQuickAction = (key: 'book' | 'refill' | 'upload' | 'message' | 'history') => {
    switch (key) {
      case 'book':
        setBookAppointmentModalOpen(true);
        break;
      case 'refill':
        // Refill modal opened per-card via onRequestRefill
        break;
      case 'upload':
        setLocation('/dashboard/patient/documents');
        break;
      case 'message':
        setLocation('/patient/messages');
        break;
      case 'history':
        setLocation('/dashboard/patient/history');
        break;
      default:
        break;
    }
  };

  const siderWidth = isMobile ? 0 : 80; // Narrow sidebar width from Figma


  // Patient theme colors
  const patientTheme = {
    primary: '#1A8FE3',
    secondary: '#10B981',
    accent: '#F59E0B',
    background: '#F7FBFF',
    highlight: '#E3F2FF',
  };

  return (
    <>
      <style>{`
        /* Override medical-container padding only when patient dashboard is rendered */
        body:has(.patient-dashboard-wrapper) .medical-container {
          padding: 0 !important;
          display: block !important;
          align-items: unset !important;
          justify-content: unset !important;
          background: transparent !important;
          min-height: 100vh !important;
        }
        
        .patient-dashboard-menu .ant-menu-item {
          border-radius: 12px !important;
          margin: 4px 8px !important;
          height: 48px !important;
          line-height: 48px !important;
          transition: all 0.3s ease !important;
          padding-left: 16px !important;
          background: transparent !important;
          border: none !important;
        }
        .patient-dashboard-menu .ant-menu-item:hover {
          background: transparent !important;
        }
        .patient-dashboard-menu .ant-menu-item:hover,
        .patient-dashboard-menu .ant-menu-item:hover .ant-menu-title-content {
          color: #595959 !important;
        }
        .patient-dashboard-menu .ant-menu-item-selected {
          background: #1A8FE3 !important;
          font-weight: 500 !important;
          border: none !important;
          padding-left: 16px !important;
        }
        .patient-dashboard-menu .ant-menu-item-selected,
        .patient-dashboard-menu .ant-menu-item-selected .ant-menu-title-content {
          color: #fff !important;
        }
        .patient-dashboard-menu .ant-menu-item-selected .ant-menu-item-icon,
        .patient-dashboard-menu .ant-menu-item-selected .anticon,
        .patient-dashboard-menu .ant-menu-item-selected img {
          color: #fff !important;
          filter: brightness(0) invert(1) !important;
        }
        .patient-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) {
          color: #8C8C8C !important;
          background: transparent !important;
        }
        .patient-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-title-content {
          color: #8C8C8C !important;
        }
        .patient-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-item-icon,
        .patient-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .anticon,
        .patient-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) img {
          color: #8C8C8C !important;
        }
        .patient-dashboard-menu .ant-menu-item-selected::after {
          display: none !important;
        }
        .patient-dashboard-menu .ant-menu-item-icon,
        .patient-dashboard-menu .anticon {
          font-size: 18px !important;
          width: 18px !important;
          height: 18px !important;
        }
      `}</style>
      <Layout className="patient-dashboard-wrapper" style={{ minHeight: '100vh', background: patientTheme.background }}>
      {/* Desktop/Tablet Sidebar - Narrow White Vertical Bar (80px) */}
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
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            borderRight: '1px solid #E5E7EB',
          }}
        >
          <PatientSidebar selectedMenuKey={selectedMenuKey} />
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
          <PatientSidebar selectedMenuKey={selectedMenuKey} onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: patientTheme.background,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh', // Fixed height to enable scrolling
        }}
      >
        {/* TopHeader - Matching Figma Design */}
        <TopHeader
          userName={user?.fullName || 'User'}
          userRole="Patient"
          userId={useMemo(() => {
            if (user?.id) {
              const year = new Date().getFullYear();
              const idNum = String(user.id).padStart(3, '0');
              return `PAT-${year}-${idNum}`;
            }
            return 'PAT-2024-001';
          }, [user?.id])}
          userInitials={useMemo(() => {
            if (user?.fullName) {
              const names = user.fullName.split(' ');
              if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
              }
              return user.fullName.substring(0, 2).toUpperCase();
            }
            return 'UP';
          }, [user?.fullName])}
          notificationCount={notifications.filter((n: any) => !n.isRead).length}
        />

        <Content
          style={{
            background: patientTheme.background,
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
            padding: isMobile ? 12 : 24,
            margin: 0,
            width: '100%',
          }}
        >
          <div style={{ paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
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

            {/* KPI Cards - Figma: grid gap-4 (16px), card p-6 rounded-2xl, icon 48x48 rounded-xl, tag top-right, label text-sm #6B7280, value text-3xl */}
            {isMobile ? (
              <div style={{ display: 'flex', overflowX: 'auto', gap: 16, paddingBottom: 8, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                {[
                  { label: "Upcoming Appointments", value: stats.upcomingAppointments, icon: <CalendarOutlined style={{ color: '#1A8FE3', fontSize: 24 }} />, trendLabel: "View", trendColor: "#1A8FE3", trendBg: "transparent", onView: () => setLocation('/dashboard/patient/appointments') },
                  { label: "Active Prescriptions", value: stats.prescriptions, icon: <MedicineBoxOutlined style={{ color: '#6B7280', fontSize: 24 }} />, trendLabel: "Current", trendColor: "#6B7280", trendBg: "transparent", onView: () => setLocation('/dashboard/patient/prescriptions') },
                  { label: "Lab Reports", value: stats.labReports, icon: <ExperimentOutlined style={{ color: '#6B7280', fontSize: 24 }} />, trendLabel: "Latest", trendColor: "#6B7280", trendBg: "transparent", onView: () => { if (labReportsData.length > 0) { setSelectedLabReport(labReportsData[0]); setIsLabReportModalOpen(true); } else { message.info('No lab reports available yet.'); } } },
                  { label: "Messages", value: messageCounts.total, icon: <MessageOutlined style={{ color: '#6B7280', fontSize: 24 }} />, trendLabel: messageCounts.unread > 0 ? `${messageCounts.unread} new` : "0 new", trendColor: "#22C55E", trendBg: "transparent", onView: () => message.info('Messages coming soon.') },
                ].map((kpi, idx) => (
                  <div key={idx} style={{ minWidth: 220, scrollSnapAlign: 'start' }}>
                    <KpiCard {...kpi} variant="patient" />
                  </div>
                ))}
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <KpiCard variant="patient" label="Upcoming Appointments" value={stats.upcomingAppointments} icon={<CalendarOutlined style={{ color: '#1A8FE3', fontSize: 24 }} />} trendLabel="View" trendColor="#1A8FE3" trendBg="transparent" onView={() => setLocation('/dashboard/patient/appointments')} />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <KpiCard variant="patient" label="Active Prescriptions" value={stats.prescriptions} icon={<MedicineBoxOutlined style={{ color: '#6B7280', fontSize: 24 }} />} trendLabel="Current" trendColor="#6B7280" trendBg="transparent" onView={() => setLocation('/dashboard/patient/prescriptions')} />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <KpiCard variant="patient" label="Lab Reports" value={stats.labReports} icon={<ExperimentOutlined style={{ color: '#6B7280', fontSize: 24 }} />} trendLabel="Latest" trendColor="#6B7280" trendBg="transparent" onView={() => { if (labReportsData.length > 0) { setSelectedLabReport(labReportsData[0]); setIsLabReportModalOpen(true); } else { message.info('No lab reports available yet.'); } }} />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <KpiCard variant="patient" label="Messages" value={messageCounts.total} icon={<MessageOutlined style={{ color: '#6B7280', fontSize: 24 }} />} trendLabel={messageCounts.unread > 0 ? `${messageCounts.unread} new` : "0 new"} trendColor="#22C55E" trendBg="transparent" onView={() => message.info('Messages coming soon.')} />
                </Col>
              </Row>
            )}

            {/* Quick Actions - Figma: card white rounded-2xl p-6, title "Quick Actions" mb-4, flex wrap gap-3, primary #1A8FE3 hover #1578C5, default border #E5E7EB */}
            <Card
              style={{
                borderRadius: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #E5E7EB',
                background: '#fff',
              }}
              styles={{ body: { padding: 24 } }}
            >
              <h3 style={{ margin: 0, marginBottom: 16, fontSize: 16, fontWeight: 600, color: '#262626' }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined style={{ fontSize: 16 }} />}
                  onClick={() => handleQuickAction('book')}
                  style={{
                    padding: '8px 16px',
                    height: 'auto',
                    fontSize: 14,
                    fontWeight: 500,
                    borderRadius: 8,
                    background: '#1A8FE3',
                    borderColor: '#1A8FE3',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1578C5'; e.currentTarget.style.borderColor = '#1578C5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#1A8FE3'; e.currentTarget.style.borderColor = '#1A8FE3'; }}
                >
                  New Appointment
                </Button>
                <Button
                  icon={<ReloadOutlined style={{ fontSize: 16 }} />}
                  onClick={() => handleQuickAction('refill')}
                  style={{
                    padding: '8px 16px',
                    height: 'auto',
                    fontSize: 14,
                    fontWeight: 500,
                    borderRadius: 8,
                    color: '#262626',
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                  Request Refill
                </Button>
                <Button
                  icon={<UploadOutlined style={{ fontSize: 16 }} />}
                  onClick={() => handleQuickAction('upload')}
                  style={{
                    padding: '8px 16px',
                    height: 'auto',
                    fontSize: 14,
                    fontWeight: 500,
                    borderRadius: 8,
                    color: '#262626',
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                  Upload Document
                </Button>
                <Button
                  icon={<SendOutlined style={{ fontSize: 16 }} />}
                  onClick={() => handleQuickAction('message')}
                  style={{
                    padding: '8px 16px',
                    height: 'auto',
                    fontSize: 14,
                    fontWeight: 500,
                    borderRadius: 8,
                    color: '#262626',
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                  Send Message
                </Button>
                <Button
                  icon={<HistoryOutlined style={{ fontSize: 16 }} />}
                  onClick={() => handleQuickAction('history')}
                  style={{
                    padding: '8px 16px',
                    height: 'auto',
                    fontSize: 14,
                    fontWeight: 500,
                    borderRadius: 8,
                    color: '#262626',
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                  View History
                </Button>
              </div>
            </Card>

            {/* Medicine Reminders - with adherence (taken/skipped) and alarm time settings */}
            {medicineReminders.length > 0 && (
              <Card
                variant="borderless"
                style={{
                  borderRadius: 16,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #E5E7EB',
                  background: '#fff',
                }}
                styles={{ body: { padding: 24 } }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, background: '#E3F2FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ClockCircleOutlined style={{ color: '#1A8FE3', fontSize: 20 }} />
                      </div>
                      <span style={{ color: '#262626', fontWeight: 600, fontSize: 16 }}>Medicine Reminders</span>
                    </div>
                    <Space size={8}>
                      <Button
                        type="default"
                        size="small"
                        icon={<SettingOutlined />}
                        style={{ color: '#1A8FE3', borderColor: '#1A8FE3' }}
                        onClick={() => { setReminderSettingsModalOpen(true); }}
                      >
                        Set alarm times
                      </Button>
                      <Button
                        type="link"
                        style={{ color: '#1A8FE3', fontWeight: 500, padding: 0, fontSize: 14, height: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => setLocation('/dashboard/patient/prescriptions')}
                      >
                        Prescriptions
                        <span style={{ fontSize: 16 }}>→</span>
                      </Button>
                    </Space>
                  </div>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {medicineReminders.slice(0, 8).map((r, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        background: '#FAFAFA',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ width: 32, height: 32, background: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MedicineBoxOutlined style={{ color: '#6B7280', fontSize: 16 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#262626' }}>{r.medicationName}</p>
                        <p style={{ margin: 0, marginTop: 2, fontSize: 12, color: '#6B7280' }}>{r.dosage}</p>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#262626', flexShrink: 0 }}>{r.timeLabel}</span>
                      <Space size={4} style={{ flexShrink: 0 }}>
                        {r.adherence === 'taken' ? (
                          <Tag color="success" icon={<CheckCircleOutlined />}>Taken</Tag>
                        ) : r.adherence === 'skipped' ? (
                          <Tag color="default" icon={<CloseCircleOutlined />}>Skipped</Tag>
                        ) : (
                          <>
                            <Button
                              type="primary"
                              size="small"
                              style={{ fontSize: 12 }}
                              loading={recordAdherenceMutation.isPending}
                              onClick={() => r.prescriptionId && r.medicationName && r.scheduledDate && r.scheduledTime && recordAdherenceMutation.mutate({
                                prescriptionId: r.prescriptionId,
                                medicationName: r.medicationName,
                                scheduledDate: r.scheduledDate,
                                scheduledTime: r.scheduledTime,
                                status: 'taken',
                              })}
                            >
                              Taken
                            </Button>
                            <Button
                              size="small"
                              style={{ fontSize: 12 }}
                              loading={recordAdherenceMutation.isPending}
                              onClick={() => r.prescriptionId && r.medicationName && r.scheduledDate && r.scheduledTime && recordAdherenceMutation.mutate({
                                prescriptionId: r.prescriptionId,
                                medicationName: r.medicationName,
                                scheduledDate: r.scheduledDate,
                                scheduledTime: r.scheduledTime,
                                status: 'skipped',
                              })}
                            >
                              Skipped
                            </Button>
                          </>
                        )}
                      </Space>
                    </div>
                  ))}
                  {medicineReminders.length > 8 && (
                    <Text type="secondary" style={{ fontSize: 13 }}>+{medicineReminders.length - 8} more</Text>
                  )}
                </div>
              </Card>
            )}

            {/* Set alarm times modal: morning 8/9am, noon 12/1pm, afternoon 2pm, night 8/9pm */}
            <Modal
              title="Set reminder alarm times"
              open={reminderSettingsModalOpen}
              onCancel={() => setReminderSettingsModalOpen(false)}
              onOk={() => saveReminderSettingsMutation.mutate(reminderSettingsForm)}
              confirmLoading={saveReminderSettingsMutation.isPending}
              okText="Save"
              destroyOnClose
            >
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <div>
                  <Text strong>Morning</Text>
                  <Select
                    value={reminderSettingsForm.morningTime ?? '09:00'}
                    onChange={(v) => setReminderSettingsForm((f) => ({ ...f, morningTime: v }))}
                    style={{ width: '100%', marginTop: 4 }}
                    options={[
                      { label: '8:00 AM', value: '08:00' },
                      { label: '9:00 AM', value: '09:00' },
                    ]}
                  />
                </div>
                <div>
                  <Text strong>Noon</Text>
                  <Select
                    value={reminderSettingsForm.noonTime ?? '12:00'}
                    onChange={(v) => setReminderSettingsForm((f) => ({ ...f, noonTime: v }))}
                    style={{ width: '100%', marginTop: 4 }}
                    options={[
                      { label: '12:00 PM', value: '12:00' },
                      { label: '1:00 PM', value: '13:00' },
                    ]}
                  />
                </div>
                <div>
                  <Text strong>Afternoon</Text>
                  <Select
                    value={reminderSettingsForm.afternoonTime ?? '14:00'}
                    onChange={(v) => setReminderSettingsForm((f) => ({ ...f, afternoonTime: v }))}
                    style={{ width: '100%', marginTop: 4 }}
                    options={[
                      { label: '2:00 PM', value: '14:00' },
                    ]}
                  />
                </div>
                <div>
                  <Text strong>Night</Text>
                  <Select
                    value={reminderSettingsForm.nightTime ?? '20:00'}
                    onChange={(v) => setReminderSettingsForm((f) => ({ ...f, nightTime: v }))}
                    style={{ width: '100%', marginTop: 4 }}
                    options={[
                      { label: '8:00 PM', value: '20:00' },
                      { label: '9:00 PM', value: '21:00' },
                    ]}
                  />
                </div>
              </Space>
            </Modal>

            {/* Upcoming Appointments - Figma: card rounded-2xl p-6, "View all" + chevron #1A8FE3, items p-4 border rounded-lg, status rounded-full */}
            <div style={{ width: '100%' }}>
              <Card
                variant="borderless"
                style={{
                  borderRadius: 16,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #E5E7EB',
                  background: '#fff',
                }}
                styles={{ body: { padding: 24 } }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#262626', fontWeight: 600, fontSize: 16 }}>Upcoming Appointments</span>
                    <Button
                      type="link"
                      style={{ color: '#1A8FE3', fontWeight: 500, padding: 0, fontSize: 14, height: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => setLocation('/dashboard/patient/appointments')}
                    >
                      View all
                      <span style={{ fontSize: 16 }}>→</span>
                    </Button>
                  </div>
                }
              >
                  {appointmentTabs.length === 0 || appointmentsToShow.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <CalendarOutlined style={{ fontSize: '48px', color: '#9CA3AF', marginBottom: '16px', display: 'block' }} />
                      <Text type="secondary" style={{ fontSize: '14px', display: 'block', color: '#9CA3AF' }}>
                        No appointments found. Book your first appointment to get started.
                      </Text>
                    </div>
                  ) : (
                    <>
                      {futureAppointments.some((apt: any) => (apt.status || '').toLowerCase() === 'pending') && (
                        <div style={{ marginBottom: 12 }}>
                          <Tag color="orange" style={{ padding: '4px 8px', borderRadius: 8 }}>
                            Waiting for receptionist confirmation on pending bookings.
                          </Tag>
                        </div>
                      )}
                    <Tabs
                      activeKey={activeAppointmentTab}
                      onChange={setActiveAppointmentTab}
                      items={appointmentTabs.map(tab => ({
                        key: tab.key,
                        label: tab.label,
                        children: (
                            <div style={{ maxHeight: isMobile ? '60vh' : '50vh', overflowY: 'auto', paddingRight: 4, marginTop: 16 }}> {/* mt-4 = 16px */}
                          <Space direction="vertical" style={{ width: '100%' }} size={16}> {/* space-y-4 = 16px for appointment cards */}
                            {appointmentsToShow.map((apt: any) => (
                              <Card
                                key={apt.id}
                                style={{ 
                                  background: '#fff',
                                  borderRadius: 16, // Style guide: 16px
                                  border: '1px solid #E5E7EB',
                                  transition: 'all 0.3s ease',
                                  cursor: 'pointer',
                                  marginBottom: 16, // space-y-4 = 16px
                                  position: 'relative', // For absolute positioned badge
                                }}
                                hoverable
                                onClick={() => setLocation('/dashboard/patient/appointments')}
                                styles={{
                                  body: {
                                    padding: 16, // p-4 = 16px
                                  }
                                }}
                              >
                                {/* Status Badge - Top Right (Absolute Position) - Matching Figma */}
                                <Tag 
                                  color={
                                    apt.status === 'confirmed' ? 'success' :
                                    apt.status === 'pending' ? 'warning' :
                                    apt.status === 'completed' ? 'success' :
                                    apt.status === 'cancelled' ? 'error' : 'default'
                                  }
                                  style={{
                                    position: 'absolute',
                                    top: 16,
                                    right: 16,
                                    borderRadius: 6,
                                    fontWeight: 600,
                                    fontSize: 12,
                                    textTransform: 'uppercase',
                                    padding: '2px 8px',
                                    margin: 0,
                                  }}
                                >
                                  {apt.status === 'pending' ? 'PENDING' : 
                                   apt.status === 'confirmed' ? 'CONFIRMED' :
                                   apt.status === 'completed' ? 'COMPLETED' :
                                   apt.status === 'cancelled' ? 'CANCELLED' : apt.status.toUpperCase()}
                                </Tag>

                                {/* Content with padding for badge */}
                                <div style={{ paddingRight: 100 }}> {/* Space for badge */}
                                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    {/* Doctor Name with Icon - Matching Figma */}
                                    <Space size={8} align="start">
                                      <div style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        background: '#E3F2FF', // Light blue circle from Figma
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                      }}>
                                        <UserOutlined style={{ fontSize: 20, color: '#1A8FE3' }} />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <Text strong style={{ fontSize: 16, fontWeight: 600, color: '#111827', display: 'block' }}>
                                          {apt.doctor}
                                      </Text>
                                        {/* Specialty - directly below doctor name (matching Figma) */}
                                        <Text style={{ fontSize: 14, color: '#6B7280', display: 'block', marginTop: 4 }}>
                                          {apt.specialty}
                                        </Text>
                                      </div>
                                    </Space>
                                    
                                    {/* Hospital with map pin icon */}
                                    <Space size={6}>
                                      <EnvironmentOutlined style={{ fontSize: 14, color: '#6B7280' }} />
                                      <Text style={{ fontSize: 14, color: '#6B7280' }}>
                                        {apt.hospital}
                                      </Text>
                                    </Space>
                                    
                                    {/* Date with calendar icon */}
                                    <Space size={6}>
                                      <CalendarOutlined style={{ fontSize: 14, color: '#6B7280' }} />
                                      <Text style={{ fontSize: 14, color: '#6B7280' }}>
                                        {apt.date}
                                      </Text>
                                    </Space>
                                    
                                    {/* Time with clock icon */}
                                    {apt.time && (
                                      <Space size={6}>
                                        <ClockCircleOutlined style={{ fontSize: 14, color: '#6B7280' }} />
                                        <Text style={{ fontSize: 14, color: '#6B7280' }}>
                                          {apt.time}
                                        </Text>
                                      </Space>
                                    )}
                                  </Space>
                                  
                                  {/* View Details Button - Bottom */}
                                  <div style={{ marginTop: 12 }}>
                                      <Button
                                        size="small"
                                        type="link"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLocation('/dashboard/patient/appointments');
                                      }}
                                      style={{ padding: 0, fontSize: 14, color: '#6B7280' }}
                                      >
                                        View Details
                                      </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </Space>
                            </div>
                        ),
                      }))}
                      style={{ marginTop: 8 }}
                    />
                    </>
                  )}
                </Card>
              </div>

              {/* Prescriptions & Lab Results - Figma: two cards rounded-2xl p-6, "View all" #1A8FE3, list items p-3 #FAFAFA rounded-lg */}
              <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card
                  variant="borderless"
                  style={{
                    borderRadius: 16,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                    height: '100%',
                  }}
                  styles={{ body: { padding: 24 } }}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#262626', fontWeight: 600, fontSize: 16 }}>Active Prescriptions</span>
                      <Button type="link" style={{ color: '#1A8FE3', fontWeight: 500, padding: 0, fontSize: 14, height: 'auto', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setLocation('/dashboard/patient/prescriptions')}>
                        View all <span style={{ fontSize: 16 }}>→</span>
                      </Button>
                    </div>
                  }
                >
                  {prescriptionsLoading ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : prescriptionCards.length ? (
                    <Space direction="vertical" style={{ width: '100%' }} size={12}> {/* space-y-3 = 12px from Figma */}
                      {prescriptionCards.map((rx) => (
                        <PrescriptionCard
                          key={rx.id}
                          name={rx.name}
                          dosage={rx.dosage}
                          nextDose={rx.nextDose}
                          refillsRemaining={rx.refillsRemaining}
                          adherence={rx.adherence}
                          onViewDetails={() => {
                            const fullRx = prescriptionsData.find((p: any) => p.id === rx.id);
                            if (fullRx) {
                              setSelectedPrescription(fullRx);
                              setIsPrescriptionDetailOpen(true);
                            }
                          }}
                          onRequestRefill={() => {
                            const fullRx = prescriptionsData.find((p: any) => p.id === rx.id);
                            if (fullRx) setRefillPrescription(fullRx);
                          }}
                        />
                      ))}
                    </Space>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <FileTextOutlined style={{ fontSize: '48px', color: '#9CA3AF', marginBottom: '16px', display: 'block' }} />
                      <Text type="secondary" style={{ fontSize: '14px', display: 'block', color: '#9CA3AF' }}>
                        No prescriptions yet
                      </Text>
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card
                  variant="borderless"
                  style={{
                    borderRadius: 16,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                    height: '100%',
                  }}
                  styles={{ body: { padding: 24 } }}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#262626', fontWeight: 600, fontSize: 16 }}>Lab Results</span>
                      <Button type="link" style={{ color: '#1A8FE3', fontWeight: 500, padding: 0, fontSize: 14, height: 'auto', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => {
                        if (labReportsData.length > 0) {
                          setSelectedLabReport(labReportsData[0]);
                          setIsLabReportModalOpen(true);
                        } else {
                          message.info('No lab reports available yet.');
                        }
                      }}
                    >
                      View all <span style={{ fontSize: 16 }}>→</span>
                    </Button>
                    </div>
                  }
                >
                  {labReportsLoading ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : labReportsData.length > 0 ? (
                    <Space direction="vertical" style={{ width: '100%' }} size={12}> {/* space-y-3 = 12px from Figma */}
                      {labReportsData.slice(0, 3).map((report: any) => (
                        <Card
                          key={report.id}
                          size="small"
                          style={{ 
                            borderRadius: 16, // Style guide: 16px
                            border: '1px solid #E5E7EB',
                            cursor: 'pointer',
                            background: '#fff',
                          }}
                          styles={{
                            body: {
                              padding: 12, // p-3 = 12px
                            }
                          }}
                          hoverable
                          onClick={() => {
                            setSelectedLabReport(report);
                            setIsLabReportModalOpen(true);
                          }}
                        >
                          <Row justify="space-between" align="middle">
                            <Col flex="auto">
                              <Space direction="vertical" size={4}>
                                <Text strong>{report.testName}</Text>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {formatDateTime(report.reportDate)}
                                </Text>
                              </Space>
                            </Col>
                            <Col>
                              <Tag color="blue" style={{ borderRadius: 6, fontWeight: 500 }}>
                                {report.status || 'Completed'}
                              </Tag>
                            </Col>
                          </Row>
                        </Card>
                      ))}
                    </Space>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <ExperimentOutlined style={{ fontSize: '48px', color: '#9CA3AF', marginBottom: '16px', display: 'block' }} />
                      <Text type="secondary" style={{ fontSize: '14px', display: 'block', color: '#9CA3AF' }}>
                        No lab results yet
                      </Text>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </div>
        </Content>
      </Layout>

      {/* Refill Request Modal */}
      <Modal
        title="Request refill"
        open={!!refillPrescription}
        onCancel={() => {
          setRefillPrescription(null);
          setRefillNotes('');
        }}
        onOk={async () => {
          if (!refillPrescription?.id) return;
          setRefillSubmitting(true);
          try {
            const token = localStorage.getItem('auth-token');
            const res = await fetch('/api/prescriptions/refill-request', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                prescriptionId: refillPrescription.id,
                notes: refillNotes.trim() || undefined,
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              message.error(data.error || 'Failed to submit refill request');
              return;
            }
            message.success('Refill request submitted. The pharmacy will process your request.');
            setRefillPrescription(null);
            setRefillNotes('');
            queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] });
          } finally {
            setRefillSubmitting(false);
          }
        }}
        okText="Submit request"
        cancelText="Cancel"
        confirmLoading={refillSubmitting}
      >
        {refillPrescription && (() => {
          let medications: any[] = [];
          try {
            medications = refillPrescription.medications
              ? JSON.parse(refillPrescription.medications) : [];
            if (!Array.isArray(medications)) medications = [];
          } catch { medications = []; }
          const primary = medications[0] || {};
          const name = primary?.name || refillPrescription.diagnosis || 'Prescription';
          return (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Typography.Text>
                Request a refill for <strong>{name}</strong>?
              </Typography.Text>
              <div>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                  Notes (optional)
                </Typography.Text>
                <Input.TextArea
                  rows={3}
                  placeholder="e.g. Need by next week, prefer same brand"
                  value={refillNotes}
                  onChange={(e) => setRefillNotes(e.target.value)}
                  maxLength={500}
                  showCount
                />
              </div>
            </Space>
          );
        })()}
      </Modal>

      {/* Prescription Detail Modal */}
      <Modal
        title="Prescription Details"
        open={isPrescriptionDetailOpen}
        onCancel={() => {
          setIsPrescriptionDetailOpen(false);
          setSelectedPrescription(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsPrescriptionDetailOpen(false);
              setSelectedPrescription(null);
            }}
          >
            Close
          </Button>,
        ]}
        width={900}
      >
        {selectedPrescription && (() => {
          let medications: any[] = [];
          try {
            medications = selectedPrescription.medications
              ? JSON.parse(selectedPrescription.medications)
              : [];
            if (!Array.isArray(medications)) medications = [];
          } catch {
            medications = [];
          }
          let chiefComplaints: string[] = [];
          let clinicalFindings: string[] = [];
          let advice: string[] = [];
          try {
            if (selectedPrescription.instructions) {
              const parsed = JSON.parse(selectedPrescription.instructions);
              if (parsed.chiefComplaints) chiefComplaints = parsed.chiefComplaints;
              if (parsed.clinicalFindings) clinicalFindings = parsed.clinicalFindings;
              if (parsed.advice) advice = parsed.advice;
            }
          } catch {
            if (selectedPrescription.instructions) advice = [selectedPrescription.instructions];
          }
          return (
            <PrescriptionPreview
              hospitalName={selectedPrescription.hospital?.name}
              hospitalAddress={selectedPrescription.hospital?.address}
              doctorName={selectedPrescription.doctor?.fullName ? `Dr. ${selectedPrescription.doctor.fullName}` : 'Dr. Unknown'}
              doctorQualification="M.S."
              doctorRegNo="MMC 2018"
              patientId={selectedPrescription.patientId}
              patientName={user?.fullName || 'Unknown'}
              patientGender={(user as any)?.gender || 'M'}
              patientAge={
                (user as any)?.dateOfBirth
                  ? dayjs().diff(dayjs((user as any).dateOfBirth), 'year')
                  : undefined
              }
              patientMobile={(user as any)?.mobileNumber}
              patientAddress={(user as any)?.address}
              weight={selectedPrescription.patient?.weight}
              height={selectedPrescription.patient?.height}
              date={selectedPrescription.createdAt}
              chiefComplaints={chiefComplaints}
              clinicalFindings={clinicalFindings}
              diagnosis={selectedPrescription.diagnosis}
              medications={medications}
              advice={advice}
              followUpDate={selectedPrescription.followUpDate}
            />
          );
        })()}
      </Modal>

      {/* Lab Report Viewer Modal */}
      <LabReportViewerModal
        open={isLabReportModalOpen}
        onCancel={() => {
          setIsLabReportModalOpen(false);
          setSelectedLabReport(null);
        }}
        report={selectedLabReport}
        loading={labReportsLoading}
      />

      {/* Book Appointment Modal (Figma flow: open modal, complete steps, no page navigation) */}
      <BookAppointmentModal
        open={bookAppointmentModalOpen}
        onCancel={() => setBookAppointmentModalOpen(false)}
        onSuccess={() => {
          setBookAppointmentModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
          queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
        }}
      />
    </Layout>
    </>
  );
}