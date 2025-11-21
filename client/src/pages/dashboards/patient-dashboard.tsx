import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Button, 
  Tag, 
  Space, 
  Typography,
  Menu,
  message,
  Skeleton,
  Empty,
  Tabs,
  Drawer,
} from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  BellOutlined,
  PlusOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';
import { useOnboardingCheck } from '../../hooks/use-onboarding-check';
import { useResponsive } from '../../hooks/use-responsive';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { PrescriptionCard } from '../../components/dashboard/PrescriptionCard';
import { TimelineItem } from '../../components/dashboard/TimelineItem';
import { NotificationItem } from '../../components/dashboard/NotificationItem';
import { SidebarProfile } from '../../components/dashboard/SidebarProfile';
import LabReportViewerModal from '../../components/modals/lab-report-viewer-modal';
import { formatDate, formatDateTime } from '../../lib/utils';
import dayjs from 'dayjs';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const TIMELINE_FILTERS = ['all', 'appointments', 'prescriptions', 'labs'] as const;

type TimelineFilter = (typeof TIMELINE_FILTERS)[number];

type NotificationSeverity = 'urgent' | 'info';

type DashboardNotification = {
  id: number;
  title: string;
  message: string;
  timestamp: string;
  severity: NotificationSeverity;
  read: boolean;
};

type DashboardPrescription = {
  id: number;
  name: string;
  dosage: string;
  nextDose: string;
  refillsRemaining: string;
  adherence: number;
  createdAt: string | null;
};

type TimelineEntry = {
  id: string;
  type: TimelineFilter;
  timestamp: string;
  description: string;
  actionLabel: string;
  sortKey: number;
  title: string;
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

const toSeverity = (type?: string): NotificationSeverity => {
  if (!type) return 'info';
  const normalized = type.toLowerCase();
  if (['urgent', 'warning', 'critical'].includes(normalized)) return 'urgent';
  return 'info';
};

const formatTimeDisplay = (time?: string) => {
  if (!time) return '';
  const trimmed = time.trim();
  const meridiemMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (meridiemMatch) {
    let hours = Number(meridiemMatch[1]);
    const minutes = meridiemMatch[2];
    const period = meridiemMatch[3].toUpperCase();
    if (period === 'PM' && hours < 12) {
      hours += 12;
    }
    if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  const twentyFourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    const hours = twentyFourMatch[1].padStart(2, '0');
    const minutes = twentyFourMatch[2];
    return `${hours}:${minutes}`;
  }
  return trimmed;
};

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<string>('today');
  const [selectedLabReport, setSelectedLabReport] = useState<any>(null);
  const [isLabReportModalOpen, setIsLabReportModalOpen] = useState(false);
  
  useOnboardingCheck();

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      setCollapsed(true);
    }
  }, [isMobile, isTablet]);

  const {
    data: allAppointments = [],
    isLoading: appointmentsLoading,
  } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async () => {
      const data = await fetchWithAuth<Array<any>>('/api/appointments/my');
      // Transform API data with date object for proper date handling
      return data.map((apt) => {
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
          doctor: apt.doctorName || 'Doctor',
          specialty: apt.doctorSpecialty || 'General',
          date: apt.appointmentDate ? formatDate(apt.appointmentDate) : 'Date unavailable',
          time: apt.appointmentTime || apt.timeSlot || '',
          status: apt.status || 'pending',
          hospital: apt.hospitalName || 'Hospital',
          rawDate: apt.appointmentDate || null,
          dateTime: apt.appointmentDate ? apt.appointmentDate : null,
          dateObj: appointmentDate,
          notes: apt.notes || '',
        };
      });
    },
    refetchInterval: 10_000,
    refetchOnWindowFocus: false,
  });

  // Filter appointments that are today or in the future (by date and time)
  // Patients should see all their appointment statuses (pending, confirmed, completed, cancelled)
  const futureAppointments = useMemo(() => {
    const now = new Date();
    
    return allAppointments
      .filter((apt: any) => {
        // Check if appointment has valid date
        if (!apt.rawDate && !apt.dateObj) {
          return false;
        }
        
        try {
          const appointmentDateTime = apt.dateObj || new Date(apt.rawDate);
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
        const dateTimeA = a.dateObj || new Date(a.rawDate);
        const dateTimeB = b.dateObj || new Date(b.rawDate);
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
    
    futureAppointments.forEach((apt: any) => {
      if (!apt.dateObj && !apt.rawDate) return;
      
      const appointmentDate = apt.dateObj || new Date(apt.rawDate);
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

  // Use filtered appointments for display
  const appointmentsData = futureAppointments;

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

  const {
    data: notificationsData = [],
    isLoading: notificationsLoading,
  } = useQuery({
    queryKey: ['patient-notifications'],
    queryFn: () => fetchWithAuth<Array<any>>('/api/notifications/me'),
    refetchInterval: 15_000,
  });

  const markNotificationMutation = useMutation({
    mutationFn: (notificationId: number) =>
      fetchWithAuth(`/api/notifications/read/${notificationId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-notifications'] });
      message.success('Notification marked as read.');
    },
    onError: () => {
      message.error('Failed to mark notification as read.');
    },
  });

  const prescriptionCards: DashboardPrescription[] = useMemo(() => {
    return prescriptionsData.map((rx: any) => {
      let medications: any[] = [];
      try {
        medications = rx.medications ? JSON.parse(rx.medications) : [];
      } catch (error) {
        console.warn('Failed to parse medications JSON', error);
      }
      const primary = medications[0] || {};
      const dosage = primary?.dosage
        ? `${primary.dosage}${primary.unit ? ` ${primary.unit}` : ''}`
        : rx.diagnosis || 'See instructions';

      return {
        id: rx.id,
        name: primary?.name || rx.diagnosis || 'Prescription',
        dosage,
        nextDose: primary?.schedule || formatDateTime(rx.followUpDate),
        refillsRemaining: primary?.refills ? `${primary.refills} refills left` : 'N/A',
        adherence: 1,
        createdAt: rx.createdAt || null,
      };
    });
  }, [prescriptionsData]);

  // Get next appointment from filtered future appointments
  const nextAppointment = futureAppointments.length > 0 ? futureAppointments[0] : null;
  const nextAppointmentDisplay = nextAppointment?.rawDate
    ? `${formatDate(nextAppointment.rawDate)}${nextAppointment.time ? ` · ${formatTimeDisplay(nextAppointment.time)}` : ''}`
    : 'TBD';

  const notifications: DashboardNotification[] = useMemo(() => {
    return notificationsData.map((notification: any) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      timestamp: formatDateTime(notification.createdAt),
      severity: toSeverity(notification.type),
      read: Boolean(notification.isRead),
    }));
  }, [notificationsData]);

  const timelineEntries: TimelineEntry[] = useMemo(() => {
    const appointmentEvents = appointmentsData.map((apt: any) => ({
      id: `appointment-${apt.id}`,
      type: 'appointments' as TimelineFilter,
      title: `Appointment with ${apt.doctor}`,
      timestamp: `${apt.date} · ${apt.time}`,
      description: apt.notes || `Status: ${apt.status}`,
      actionLabel: apt.status === 'pending' ? 'Reschedule' : 'View Details',
      sortKey: apt.dateTime ? new Date(apt.dateTime).getTime() : 0,
    }));

    const prescriptionEvents = prescriptionsData.map((rx: any) => ({
      id: `prescription-${rx.id}`,
      type: 'prescriptions' as TimelineFilter,
      title: 'Prescription issued',
      timestamp: formatDateTime(rx.createdAt),
      description: rx.diagnosis || 'See prescription details',
      actionLabel: 'View Details',
      sortKey: rx.createdAt ? new Date(rx.createdAt).getTime() : 0,
    }));

    const labEvents = labReportsData.map((report: any) => ({
      id: `lab-${report.id}`,
      type: 'labs' as TimelineFilter,
      title: `Lab Report: ${report.testName}`,
      timestamp: formatDateTime(report.reportDate),
      description: report.notes || `Status: ${report.status || 'completed'}`,
      actionLabel: 'View Report',
      sortKey: report.reportDate ? new Date(report.reportDate).getTime() : 0,
    }));

    return [...appointmentEvents, ...prescriptionEvents, ...labEvents]
      .sort((a, b) => b.sortKey - a.sortKey);
  }, [appointmentsData, prescriptionsData, labReportsData]);

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'all') return timelineEntries;
    return timelineEntries.filter((entry) => entry.type === timelineFilter);
  }, [timelineEntries, timelineFilter]);

  const stats = {
    totalAppointments: futureAppointments.length,
    upcomingAppointments: futureAppointments.filter((apt: any) => 
      apt.status === 'confirmed' || apt.status === 'pending'
    ).length,
    completedAppointments: futureAppointments.filter((apt: any) => apt.status === 'completed').length,
    prescriptions: prescriptionCards.length,
    labReports: labReportsData.length,
  };

  const messageCounts = {
    total: notifications.length,
    unread: notifications.filter((notification) => !notification.read).length,
  };

  const isTimelineLoading = appointmentsLoading || prescriptionsLoading || labReportsLoading;

  const sidebarMenu = [
    { key: 'dashboard', icon: <UserOutlined />, label: 'Dashboard' },
    { key: 'appointments', icon: <CalendarOutlined />, label: 'Appointments' },
    { key: 'prescriptions', icon: <MedicineBoxOutlined />, label: 'Prescriptions' },
    { key: 'reports', icon: <FileTextOutlined />, label: 'Lab Reports' },
  ];

  const handleQuickAction = (key: 'book' | 'refill' | 'upload' | 'message' | 'history') => {
    switch (key) {
      case 'book':
        setLocation('/book-appointment');
        break;
      case 'refill':
        message.info('Refill request flow coming soon.');
        break;
      case 'upload':
        message.info('Document upload coming soon.');
        break;
      case 'message':
        message.info('Messaging coming soon.');
        break;
      case 'history':
        message.info('Patient history dashboard coming soon.');
        break;
      default:
        break;
    }
  };

  const siderWidth = isMobile ? 0 : (collapsed ? 80 : 260);

  // Sidebar content component (reusable for drawer and sider)
  const SidebarContent = ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <>
      <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
        <MedicineBoxOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
        {(!collapsed || isMobile) && (
          <Title level={4} style={{ margin: '8px 0 0', color: '#1890ff' }}>
            NexaCare
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
        name={user?.fullName || 'Patient'}
        roleLabel="PATIENT"
        roleColor="blue"
        avatarIcon={<UserOutlined />}
        onSettingsClick={() => message.info('Profile settings coming soon.')}
      />
    </>
  );

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
          background: '#f5f5f5',
          transition: 'margin-left 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            background: '#f5f5f5',
            height: '100vh',
            overflowY: 'auto',
            padding: isMobile ? '12px 16px' : isTablet ? '16px 20px' : '16px 24px 24px',
          }}
        >
          <div style={{ paddingBottom: 24 }}>
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
                  { label: "Upcoming Appointments", value: stats.upcomingAppointments, icon: <CalendarOutlined style={{ color: '#1890ff' }} />, trendLabel: "Updated", trendType: "positive" as const, onView: () => setLocation('/dashboard/patient/appointments') },
                  { label: "Active Prescriptions", value: stats.prescriptions, icon: <MedicineBoxOutlined style={{ color: '#52c41a' }} />, trendLabel: "Current", trendType: "neutral" as const, onView: () => setLocation('/dashboard/patient/prescriptions') },
                  { label: "Lab Reports", value: stats.labReports, icon: <FileTextOutlined style={{ color: '#faad14' }} />, trendLabel: "Latest", trendType: "neutral" as const, onView: () => {
                    if (labReportsData.length > 0) {
                      setSelectedLabReport(labReportsData[0]);
                      setIsLabReportModalOpen(true);
                    } else {
                      message.info('No lab reports available yet.');
                    }
                  } },
                  { label: "Messages", value: messageCounts.total, icon: <BellOutlined style={{ color: '#722ed1' }} />, trendLabel: `+${messageCounts.unread} new`, trendType: (messageCounts.unread > 0 ? 'positive' : 'neutral') as 'positive' | 'neutral', onView: () => message.info('Messages coming soon.') },
                ].map((kpi, idx) => (
                  <div key={idx} style={{ minWidth: 200, scrollSnapAlign: 'start' }}>
                    <KpiCard {...kpi} />
                  </div>
                ))}
              </div>
            ) : (
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
                  <KpiCard
                    label="Upcoming Appointments"
                    value={stats.upcomingAppointments}
                    icon={<CalendarOutlined style={{ color: '#1890ff' }} />}
                    trendLabel="Updated"
                    trendType="positive"
                    onView={() => setLocation('/dashboard/patient/appointments')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
                  <KpiCard
                    label="Active Prescriptions"
                    value={stats.prescriptions}
                    icon={<MedicineBoxOutlined style={{ color: '#52c41a' }} />}
                    trendLabel="Current"
                    trendType="neutral"
                    onView={() => setLocation('/dashboard/patient/prescriptions')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
                  <KpiCard
                    label="Lab Reports"
                    value={stats.labReports}
                    icon={<FileTextOutlined style={{ color: '#faad14' }} />}
                    trendLabel="Latest"
                    trendType="neutral"
                    onView={() => {
                      if (labReportsData.length > 0) {
                        setSelectedLabReport(labReportsData[0]);
                        setIsLabReportModalOpen(true);
                      } else {
                        message.info('No lab reports available yet.');
                      }
                    }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
                  <KpiCard
                    label="Messages"
                    value={messageCounts.total}
                    icon={<BellOutlined style={{ color: '#722ed1' }} />}
                    trendLabel={`+${messageCounts.unread} new`}
                    trendType={messageCounts.unread > 0 ? 'positive' : 'neutral'}
                    onView={() => message.info('Messages coming soon.')}
                  />
                </Col>
              </Row>
            )}

            {/* Quick Actions - Responsive */}
            <Card style={{ marginBottom: 24 }}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="New Appointment"
                    icon={<PlusOutlined />}
                    onClick={() => handleQuickAction('book')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Request Refill"
                    icon={<MedicineBoxOutlined />}
                    onClick={() => handleQuickAction('refill')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Upload Document"
                    icon={<FileTextOutlined />}
                    onClick={() => handleQuickAction('upload')}
                  />
                </Col>
                <Col xs={24} sm={12} md={3}>
                  <QuickActionTile
                    label="Send Message"
                    onClick={() => handleQuickAction('message')}
                    variant="secondary"
                  />
                </Col>
                <Col xs={24} sm={12} md={3}>
                  <QuickActionTile
                    label="View History"
                    onClick={() => handleQuickAction('history')}
                    variant="secondary"
                  />
                </Col>
              </Row>
            </Card>

            <Row gutter={[24, 24]}>
              <Col xs={24} lg={16}>
                <Card
                  variant="borderless"
                  style={{ borderRadius: 16, marginBottom: 24 }}
                  title="Upcoming Appointments"
                  extra={<Button type="link" onClick={() => setLocation('/dashboard/patient/appointments')}>View All</Button>}
                >
                  {appointmentTabs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Text type="secondary">
                        {allAppointments.length === 0
                          ? 'No appointments found. Book your first appointment to get started.'
                          : 'No upcoming appointments scheduled.'}
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
                          <Space direction="vertical" style={{ width: '100%' }} size={12}>
                            {appointmentsToShow.map((apt: any) => (
                              <Card
                                key={apt.id}
                                size="small"
                                style={{ background: apt.status === 'confirmed' ? '#E6F4FF' : apt.status === 'pending' ? '#FFF7E6' : apt.status === 'cancelled' ? '#FFF1F0' : '#F6FFED' }}
                              >
                                <Row justify="space-between" align="middle">
                                  <Col flex="auto">
                                    <Space direction="vertical" size={4}>
                                      <Text strong>{apt.doctor}</Text>
                                      <Text type="secondary">{apt.specialty} · {apt.hospital}</Text>
                                      <Text type="secondary">
                                        {apt.date} {apt.time ? `· ${apt.time}` : ''}
                                      </Text>
                                    </Space>
                                  </Col>
                                  <Col>
                                    <Space direction="vertical" align="end" size={4}>
                                      <Tag color={
                                        apt.status === 'confirmed' ? 'blue' :
                                        apt.status === 'pending' ? 'orange' :
                                        apt.status === 'completed' ? 'green' :
                                        apt.status === 'cancelled' ? 'red' : 'default'
                                      }>
                                        {apt.status.toUpperCase()}
                                      </Tag>
                                      <Button
                                        size="small"
                                        type="link"
                                        onClick={() => setLocation('/dashboard/patient/appointments')}
                                      >
                                        View Details
                                      </Button>
                                    </Space>
                                  </Col>
                                </Row>
                              </Card>
                            ))}
                          </Space>
                        ),
                      }))}
                      style={{ marginTop: 8 }}
                    />
                  )}
                </Card>

                <Card
                  title="Prescriptions"
                  extra={
                    <Space>
                      <Button type="primary">Current</Button>
                      <Button>Past</Button>
                    </Space>
                  }
                  style={{ marginBottom: 24 }}
                >
                  {prescriptionsLoading ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : prescriptionCards.length ? (
                    <Space direction="vertical" style={{ width: '100%' }} size={16}>
                      {prescriptionCards.map((rx) => (
                        <PrescriptionCard
                          key={rx.id}
                          name={rx.name}
                          dosage={rx.dosage}
                          nextDose={rx.nextDose}
                          refillsRemaining={rx.refillsRemaining}
                          adherence={rx.adherence}
                          onViewDetails={() => message.info('Prescription detail view coming soon.')}
                          onRequestRefill={() => handleQuickAction('refill')}
                        />
                      ))}
                    </Space>
                  ) : (
                    <Empty description="No prescriptions yet" />
                  )}
                </Card>

                <Card title="Care Timeline">
                  <Space style={{ marginBottom: 16 }} wrap>
                    {TIMELINE_FILTERS.map((filter) => (
                      <Tag
                        key={filter}
                        color={timelineFilter === filter ? 'blue' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setTimelineFilter(filter)}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </Tag>
                    ))}
                  </Space>
                  {isTimelineLoading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                  ) : filteredTimeline.length ? (
                    <Space direction="vertical" style={{ width: '100%' }} size={16}>
                      {filteredTimeline.map((item) => (
                        <TimelineItem
                          key={item.id}
                          title={item.title}
                          timestamp={item.timestamp}
                          description={item.description}
                          actionLabel={item.actionLabel}
                          onAction={() => {
                            // If it's a lab report item, open the viewer
                            if (item.id?.startsWith('lab-')) {
                              const reportId = parseInt(item.id.replace('lab-', ''));
                              const report = labReportsData.find((r: any) => r.id === reportId);
                              if (report) {
                                setSelectedLabReport(report);
                                setIsLabReportModalOpen(true);
                              }
                            } else {
                              message.info('Coming soon');
                            }
                          }}
                        />
                      ))}
                    </Space>
                  ) : (
                    <Empty description="No timeline events yet" />
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Space direction="vertical" style={{ width: '100%' }} size={24}>
                  <Card title="Next Appointment">
                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                      <Text type="secondary">with {nextAppointment?.doctor || 'your care team'}</Text>
                      <Card style={{ background: '#E6F4FF', textAlign: 'center' }}>
                        <Text type="secondary">In</Text>
                        <Title level={3} style={{ margin: '8px 0 0' }}>
                          {nextAppointmentDisplay}
                        </Title>
                      </Card>
                      <Button block onClick={() => setLocation('/dashboard/patient/appointments')}>
                        View Details
                      </Button>
                    </Space>
                  </Card>

                  <Card title="Latest Lab Result">
                    {labReportsLoading ? (
                      <Skeleton active paragraph={{ rows: 3 }} />
                    ) : labReportsData.length ? (
                      <Space direction="vertical" size={12}>
                        <Text type="secondary">
                          {labReportsData[0].testName} · {formatDateTime(labReportsData[0].reportDate)}
                        </Text>
                        <Row justify="space-between" align="middle">
                          <Col>
                            <Text strong>{labReportsData[0].testType}</Text>
                          </Col>
                          <Col>
                            <Title level={4} style={{ margin: 0 }}>
                              {labReportsData[0].status || 'Completed'}
                            </Title>
                          </Col>
                        </Row>
                        <Tag color="orange">Review</Tag>
                        <Button 
                          block 
                          onClick={() => {
                            setSelectedLabReport(labReportsData[0]);
                            setIsLabReportModalOpen(true);
                          }}
                        >
                          View Full Report
                        </Button>
                      </Space>
                    ) : (
                      <Empty description="No lab reports yet" />
                    )}
                  </Card>

                  <Card title="Notifications">
                    {notificationsLoading ? (
                      <Skeleton active paragraph={{ rows: 3 }} />
                    ) : notifications.length ? (
                      <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        {notifications.map((notification) => (
                          <NotificationItem
                            key={notification.id}
                            title={notification.title}
                            message={notification.message}
                            timestamp={notification.timestamp}
                            severity={notification.severity}
                            read={notification.read}
                            onMarkRead={() =>
                              !notification.read && markNotificationMutation.mutate(notification.id)
                            }
                          />
                        ))}
                      </Space>
                    ) : (
                      <Empty description="All caught up" />
                    )}
                  </Card>
                </Space>
              </Col>
            </Row>
          </div>
        </Content>
      </Layout>

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
    </Layout>
  );
}