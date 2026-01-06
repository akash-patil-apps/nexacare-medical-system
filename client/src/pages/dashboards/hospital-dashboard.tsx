import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Alert,
  Divider,
  Tabs,
  List,
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
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { BedOccupancyMap, TransferModal, TransferDoctorModal, DischargeModal, BedStructureManager } from '../../components/ipd';
import { IpdEncountersList } from '../../components/ipd/IpdEncountersList';
import { ClinicalNotesEditor } from '../../components/clinical/ClinicalNotesEditor';
import { VitalsEntryForm } from '../../components/clinical/VitalsEntryForm';
import { subscribeToAppointmentEvents } from '../../lib/appointments-events';
import { getISTStartOfDay, isSameDayIST } from '../../lib/timezone';
import dayjs from 'dayjs';
import { normalizeStatus, APPOINTMENT_STATUS } from '../../lib/appointment-status';
import type { IpdEncounter } from '../../types/ipd';

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
  const { user } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<string>('today_all');
  const [activeMainTab, setActiveMainTab] = useState<string>('appointments');
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

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      setCollapsed(true);
    }
  }, [isMobile, isTablet]);

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
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/reception/patients/${patientId}/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        message.error('Failed to fetch patient information');
        return;
      }
      
      const data = await response.json();
      setPatientInfo({
        ...data,
        encounter: encounter,
      });
      setPatientInfoDrawerOpen(true);
      
      // Fetch clinical notes and vitals
      await fetchClinicalData(patientId);
    } catch (error: any) {
      console.error('Error loading patient info:', error);
      message.error('Failed to load patient information');
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
        console.log('⚠️ Hospital stats API not ready yet');
        // Return default values if API fails
        return {
          totalDoctors: 0,
          totalPatients: 0,
          totalAppointments: 0,
          todayAppointments: 0,
          completedAppointments: 0,
          pendingAppointments: 0,
          totalRevenue: 0
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
        console.log('⚠️ Hospital profile API not ready yet');
        return null;
      }
      const data = await response.json();
      console.log('✅ Hospital profile fetched:', { id: data.id, name: data.name });
      return data;
    },
    enabled: !!user && user.role?.toUpperCase() === 'HOSPITAL',
  });

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
        console.log('⚠️ Notifications API not ready yet');
        return [];
      }
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

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

  const [selectedMenuKey] = useState<string>('dashboard');

  const sidebarMenu = useMemo(() => [
    {
      key: 'dashboard',
      icon: <BankOutlined style={{ fontSize: 18, color: selectedMenuKey === 'dashboard' ? hospitalTheme.primary : '#8C8C8C' }} />, 
      label: 'Dashboard' 
    },
    {
      key: 'doctors',
      icon: <TeamOutlined style={{ fontSize: 18, color: selectedMenuKey === 'doctors' ? hospitalTheme.primary : '#8C8C8C' }} />, 
      label: 'Doctors' 
    },
    {
      key: 'patients',
      icon: <UserOutlined style={{ fontSize: 18, color: selectedMenuKey === 'patients' ? hospitalTheme.primary : '#8C8C8C' }} />, 
      label: 'Patients' 
    },
    {
      key: 'appointments',
      icon: <CalendarOutlined style={{ fontSize: 18, color: selectedMenuKey === 'appointments' ? hospitalTheme.primary : '#8C8C8C' }} />, 
      label: 'Appointments' 
    },
    {
      key: 'reports',
      icon: <FileTextOutlined style={{ fontSize: 18, color: selectedMenuKey === 'reports' ? hospitalTheme.primary : '#8C8C8C' }} />, 
      label: 'Lab Reports' 
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined style={{ fontSize: 18, color: selectedMenuKey === 'analytics' ? hospitalTheme.primary : '#8C8C8C' }} />, 
      label: 'Analytics' 
    },
  ], [selectedMenuKey]);

  const siderWidth = isMobile ? 0 : (collapsed ? 80 : 260);

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

  // Sidebar content component (reusable for drawer and sider)
  const SidebarContent = ({ onMenuClick }: { onMenuClick?: () => void }) => (
      <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: '#fff',
    }}>
      {/* NexaCare Hospital Logo/Name Section */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: hospitalTheme.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '24px',
        }}>
          <BankOutlined />
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
            NexaCare Hospital
          </Text>
      </div>
      </div>

      {/* Navigation Menu */}
      <Menu
        className="hospital-dashboard-menu"
        mode="inline"
        selectedKeys={[selectedMenuKey]}
        items={sidebarMenu}
        style={{ 
          border: 'none', 
          flex: 1,
          background: 'transparent',
          padding: '8px',
          overflowY: 'auto',
        }}
        onClick={(e) => {
          if (onMenuClick) onMenuClick();
          message.info(`${e.key} page coming soon.`);
        }}
        theme="light"
      />

      {/* User Profile Footer - Light Grey Rounded Card */}
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
              background: hospitalTheme.primary,
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
                {user?.fullName || 'Hospital Admin'}
              </Text>
              <Text style={{ display: 'block', fontSize: '12px', color: '#8C8C8C' }}>
                ID: {hospitalAdminId}
              </Text>
            </div>
          </div>
          
          {/* Layer 2: Hospital Name */}
          {hospitalName && (
            <div style={{
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid #E5E7EB',
            }}>
              <Text style={{ display: 'block', fontSize: '12px', color: '#8C8C8C', lineHeight: 1.4 }}>
                {hospitalName}
              </Text>
            </div>
          )}
          
          {/* Layer 3: Active Hospital Admin Text + Settings Icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Active Hospital Admin on left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10B981',
              }} />
              <Text style={{ fontSize: '12px', color: '#10B981', fontWeight: 500 }}>
                Active Hospital Admin
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
          background: hospitalTheme.background,
          transition: 'margin-left 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            background: hospitalTheme.background,
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
                <div style={{ paddingRight: 8, overflow: 'visible' }}>
                  <NotificationBell />
                </div>
              </div>
            )}
            
            {/* Alert/Banner Notifications - Show important unread notifications */}
            {notifications.filter((n: any) => !n.isRead).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {notifications
                  .filter((n: any) => !n.isRead)
                  .slice(0, 3) // Show max 3 alerts
                  .map((notif: any) => {
                    const type = (notif.type || '').toLowerCase();
                    let alertType: 'info' | 'success' | 'warning' | 'error' = 'info';
                    if (type.includes('cancel') || type.includes('reject') || type.includes('critical')) alertType = 'error';
                    else if (type.includes('confirm') || type.includes('complete') || type.includes('ready')) alertType = 'success';
                    else if (type.includes('pending') || type.includes('resched') || type.includes('processing')) alertType = 'warning';
                    
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
                          // Mark as read when closed
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
                  { label: "Total Doctors", value: statsLoading ? '...' : (stats?.totalDoctors || 0), icon: <TeamOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />, trendLabel: "Active", trendColor: hospitalTheme.primary, trendBg: hospitalTheme.highlight, onView: () => message.info('View doctors') },
                  { label: "Total Patients", value: statsLoading ? '...' : (stats?.totalPatients || 0), icon: <UserOutlined style={{ fontSize: '24px', color: hospitalTheme.secondary }} />, trendLabel: "Registered", trendColor: hospitalTheme.secondary, trendBg: "#E0F2FE", onView: () => message.info('View patients') },
                  { label: "Upcoming Appointments", value: statsLoading ? '...' : (stats?.upcomingAppointments || stats?.todayAppointments || 0), icon: <CalendarOutlined style={{ fontSize: '24px', color: hospitalTheme.accent }} />, trendLabel: "Scheduled", trendColor: hospitalTheme.accent, trendBg: "#FEF3C7", onView: () => message.info('View appointments') },
                  { label: "Monthly Revenue", value: statsLoading ? '...' : `₹${(stats?.totalRevenue || 0).toLocaleString()}`, icon: <BarChartOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />, trendLabel: "This Month", trendColor: hospitalTheme.primary, trendBg: hospitalTheme.highlight, onView: () => message.info('View revenue') },
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
                label="Total Doctors"
                    value={statsLoading ? '...' : (stats?.totalDoctors || 0)}
                icon={<TeamOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />}
                trendLabel="Active"
                trendType="positive"
                    trendColor={hospitalTheme.primary}
                    trendBg={hospitalTheme.highlight}
                    onView={() => message.info('View doctors')}
              />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
              <KpiCard
                label="Total Patients"
                    value={statsLoading ? '...' : (stats?.totalPatients || 0)}
                icon={<UserOutlined style={{ fontSize: '24px', color: hospitalTheme.secondary }} />}
                trendLabel="Registered"
                trendType="positive"
                    trendColor={hospitalTheme.secondary}
                    trendBg="#E0F2FE"
                    onView={() => message.info('View patients')}
              />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
              <KpiCard
                    label="Upcoming Appointments"
                    value={statsLoading ? '...' : (stats?.upcomingAppointments || stats?.todayAppointments || 0)}
                icon={<CalendarOutlined style={{ fontSize: '24px', color: hospitalTheme.accent }} />}
                trendLabel="Scheduled"
                trendType="neutral"
                    trendColor={hospitalTheme.accent}
                    trendBg="#FEF3C7"
                    onView={() => message.info('View appointments')}
              />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
              <KpiCard
                label="Monthly Revenue"
                    value={statsLoading ? '...' : `₹${(stats?.totalRevenue || 0).toLocaleString()}`}
                icon={<BarChartOutlined style={{ fontSize: '24px', color: hospitalTheme.primary }} />}
                trendLabel="This Month"
                trendType="positive"
                    trendColor={hospitalTheme.primary}
                    trendBg={hospitalTheme.highlight}
                    onView={() => message.info('View revenue')}
              />
                </div>
              </div>
            )}

          {/* Appointment Status Summary - Similar to Receptionist Queue Status */}
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
                extra={<Button type="link" onClick={() => message.info('View all appointments feature coming soon')}>View All</Button>}
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
                                          console.log('Bed clicked:', bed);
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
                              ]}
                            />
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  ),
                },
              ]}
            />
            </div>
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
                {patientInfo.encounter && (
                  <>
                    <div>
                      <Text type="secondary">Attending Doctor:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {patientInfo.encounter.attendingDoctor?.fullName || patientInfo.encounter.admittingDoctor?.fullName || 'N/A'}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">Current Bed:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {patientInfo.encounter.currentBed?.bedName || `Bed ${patientInfo.encounter.currentBed?.bedNumber}` || 'N/A'}
                      </Text>
                    </div>
                  </>
                )}
              </Space>
            </Card>

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