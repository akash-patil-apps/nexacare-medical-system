import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
} from 'antd';
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
} from '@ant-design/icons';
import { useLocation } from 'wouter';
import { useOnboardingCheck } from '../../hooks/use-onboarding-check';
import { useResponsive } from '../../hooks/use-responsive';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { PrescriptionCard } from '../../components/dashboard/PrescriptionCard';
import LabReportViewerModal from '../../components/modals/lab-report-viewer-modal';
import { formatDate, formatDateTime } from '../../lib/utils';
import { PatientSidebar } from '../../components/layout/PatientSidebar';

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
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<string>('upcoming');
  const [selectedLabReport, setSelectedLabReport] = useState<any>(null);
  const [isLabReportModalOpen, setIsLabReportModalOpen] = useState(false);
  const [selectedMenuKey] = useState<string>('dashboard');
  
  useOnboardingCheck();

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
          time: timeValue,
          timeSlot: timeValue,
          status: apt.status || 'pending',
          hospital: apt.hospitalName || 'Hospital',
          rawDate: apt.appointmentDate || null,
          dateTime: apt.appointmentDate ? apt.appointmentDate : null,
          dateObj: appointmentDate,
          notes: apt.notes || '',
        };
      });
    },
    refetchOnWindowFocus: false,
  });

  // Listen for appointment updates from other tabs/windows (e.g., when receptionist confirms)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appointment-updated') {
        console.log('🔄 Appointment update detected from storage event, invalidating and refetching patient appointments...');
        // Invalidate the query first, then refetch for more reliable updates
        queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
        refetchAppointments();
      }
    };
    
    // Also listen for custom events (same-window updates)
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('🔄 Custom appointment update event detected, invalidating and refetching patient appointments...', customEvent.detail);
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
          console.log(`⏭️ Skipping appointment ${apt.id} - start is in the past:`, start.toISOString());
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
    prescriptions: prescriptionCards.length,
    labReports: labReportsData.length,
  };

  const messageCounts = {
    total: 0,
    unread: 0,
  };

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

  const siderWidth = isMobile ? 0 : 260;


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
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            background: patientTheme.background,
            height: '100vh',
            overflowY: 'auto',
            padding: isMobile ? '24px 16px 16px' : isTablet ? '24px 20px 20px' : '24px 32px 24px',
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

            {/* KPI Cards - Matching Figma Design */}
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
                  { label: "Upcoming Appointments", value: stats.upcomingAppointments, icon: <CalendarOutlined />, trendLabel: "Updated", trendColor: "#10B981", trendBg: "#D1FAE5", onView: () => setLocation('/dashboard/patient/appointments') },
                  { label: "Active Prescriptions", value: stats.prescriptions, icon: <MedicineBoxOutlined />, trendLabel: "Current", trendColor: "#2563eb", trendBg: "#DBEAFE", onView: () => setLocation('/dashboard/patient/prescriptions') },
                  { label: "Lab Reports", value: stats.labReports, icon: <ExperimentOutlined />, trendLabel: "Latest", trendColor: "#F59E0B", trendBg: "#FEF3C7", onView: () => {
                    if (labReportsData.length > 0) {
                      setSelectedLabReport(labReportsData[0]);
                      setIsLabReportModalOpen(true);
                    } else {
                      message.info('No lab reports available yet.');
                    }
                  } },
                  { label: "Messages", value: messageCounts.total, icon: <MessageOutlined />, trendLabel: messageCounts.unread > 0 ? `+${messageCounts.unread} new` : "0 new", trendColor: "#7C3AED", trendBg: "#E9D5FF", onView: () => message.info('Messages coming soon.') },
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
                    label="Upcoming Appointments"
                    value={stats.upcomingAppointments}
                    icon={<CalendarOutlined />}
                    trendLabel="Updated"
                    trendType="positive"
                    trendColor="#10B981"
                    trendBg="#D1FAE5"
                    onView={() => setLocation('/dashboard/patient/appointments')}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <KpiCard
                    label="Active Prescriptions"
                    value={stats.prescriptions}
                    icon={<MedicineBoxOutlined />}
                    trendLabel="Current"
                    trendType="neutral"
                    trendColor="#2563eb"
                    trendBg="#DBEAFE"
                    onView={() => setLocation('/dashboard/patient/prescriptions')}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <KpiCard
                    label="Lab Reports"
                    value={stats.labReports}
                    icon={<ExperimentOutlined />}
                    trendLabel="Latest"
                    trendType="neutral"
                    trendColor="#F59E0B"
                    trendBg="#FEF3C7"
                    onView={() => {
                      if (labReportsData.length > 0) {
                        setSelectedLabReport(labReportsData[0]);
                        setIsLabReportModalOpen(true);
                      } else {
                        message.info('No lab reports available yet.');
                      }
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <KpiCard
                    label="Messages"
                    value={messageCounts.total}
                    icon={<MessageOutlined />}
                    trendLabel={messageCounts.unread > 0 ? `+${messageCounts.unread} new` : "0 new"}
                    trendType="neutral"
                    trendColor="#7C3AED"
                    trendBg="#E9D5FF"
                    onView={() => message.info('Messages coming soon.')}
                  />
                </div>
              </div>
            )}

            {/* Quick Actions - Single line with hover effects */}
            <div style={{ marginBottom: 32, display: 'flex', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <QuickActionTile
                label="New Appointment"
                icon={<PlusOutlined />}
                onClick={() => handleQuickAction('book')}
                variant="primary"
              />
              <QuickActionTile
                label="Request Refill"
                icon={<ReloadOutlined />}
                onClick={() => handleQuickAction('refill')}
              />
              <QuickActionTile
                label="Upload Document"
                icon={<UploadOutlined />}
                onClick={() => handleQuickAction('upload')}
              />
              <QuickActionTile
                label="Send Message"
                icon={<SendOutlined />}
                onClick={() => handleQuickAction('message')}
              />
              <QuickActionTile
                label="View History"
                icon={<HistoryOutlined />}
                onClick={() => handleQuickAction('history')}
              />
            </div>

            {/* Main Content Sections - Upcoming Appointments on first line, Prescriptions and Lab Results on second line */}
            <Row gutter={[24, 24]}>
              {/* Upcoming Appointments - Full Width First Line */}
              <Col xs={24} lg={24}>
                <Card
                  variant="borderless"
                  style={{ 
                    borderRadius: 16,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                  }}
                  title={<Title level={4} style={{ margin: 0, color: '#262626', fontWeight: 600, fontSize: '18px' }}>Upcoming Appointments</Title>}
                  extra={
                    <Button 
                      type="link" 
                      style={{ color: patientTheme.primary, fontWeight: 500, padding: 0 }} 
                      onClick={() => setLocation('/dashboard/patient/appointments')}
                    >
                      View All
                    </Button>
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
                            <div style={{ maxHeight: isMobile ? '60vh' : '50vh', overflowY: 'auto', paddingRight: 4 }}>
                          <Space direction="vertical" style={{ width: '100%' }} size={12}>
                            {appointmentsToShow.map((apt: any) => (
                              <Card
                                key={apt.id}
                                size="small"
                                style={{ 
                                  background: apt.status === 'confirmed' ? patientTheme.highlight : apt.status === 'pending' ? '#FFF7E6' : apt.status === 'cancelled' ? '#FFF1F0' : '#F6FFED',
                                  borderRadius: 12,
                                  border: `1px solid ${apt.status === 'confirmed' ? patientTheme.primary : '#E8E8E8'}`,
                                  transition: 'all 0.3s ease',
                                  cursor: 'pointer',
                                }}
                                hoverable
                                onClick={() => setLocation('/dashboard/patient/appointments')}
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
                            </div>
                        ),
                      }))}
                      style={{ marginTop: 8 }}
                    />
                    </>
                  )}
                </Card>
              </Col>

              {/* Second Line - Prescriptions and Lab Results Side by Side */}
              <Col xs={24} lg={12}>
                {/* Prescriptions */}
                <Card
                  variant="borderless"
                  style={{ 
                    borderRadius: 16,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                  }}
                  title={<Title level={4} style={{ margin: 0, color: '#262626', fontWeight: 600, fontSize: '18px' }}>Prescriptions</Title>}
                  extra={
                    <Space size={8}>
                      <Button
                        type="primary"
                        size="small"
                        style={{
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 500,
                          height: '28px',
                          padding: '4px 12px',
                        }}
                      >
                        Current
                      </Button>
                      <Button
                        size="small"
                        style={{
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 500,
                          height: '28px',
                          padding: '4px 12px',
                          background: '#F3F4F6',
                          borderColor: '#F3F4F6',
                          color: '#6B7280',
                        }}
                      >
                        Past
                      </Button>
                    </Space>
                  }
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
                {/* Lab Results */}
                <Card 
                  variant="borderless"
                  style={{ 
                    borderRadius: 16,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #E5E7EB',
                    background: '#fff',
                  }}
                  title={<Title level={4} style={{ margin: 0, color: '#262626', fontWeight: 600, fontSize: '18px' }}>Lab Results</Title>}
                  extra={
                    <Button 
                      type="link" 
                      style={{ color: patientTheme.primary, fontWeight: 500, padding: 0 }} 
                      onClick={() => {
                        if (labReportsData.length > 0) {
                          setSelectedLabReport(labReportsData[0]);
                          setIsLabReportModalOpen(true);
                        } else {
                          message.info('No lab reports available yet.');
                        }
                      }}
                    >
                      View All
                    </Button>
                  }
                >
                  {labReportsLoading ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : labReportsData.length > 0 ? (
                    <Space direction="vertical" style={{ width: '100%' }} size={16}>
                      {labReportsData.slice(0, 3).map((report: any) => (
                        <Card
                          key={report.id}
                          size="small"
                          style={{ 
                            borderRadius: 12,
                            border: '1px solid #E8E8E8',
                            cursor: 'pointer',
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
                              <Tag color="blue" style={{ borderRadius: 12 }}>
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
    </>
  );
}