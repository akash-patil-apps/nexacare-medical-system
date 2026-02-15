import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Avatar,
  Menu,
  Dropdown,
  Badge,
  Progress,
  Timeline,
  List,
  Input,
  Select,
  Modal,
  Divider,
  message,
  Drawer,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { 
  UserOutlined, 
  CalendarOutlined, 
  MedicineBoxOutlined, 
  FileTextOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  BankOutlined,
  UserAddOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { formatDate } from '../../lib/utils';
import { TopHeader } from '../../components/layout/TopHeader';
import { useResponsive } from '../../hooks/use-responsive';
import { useLocation } from 'wouter';
import { MenuUnfoldOutlined } from '@ant-design/icons';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function DoctorAppointments() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, completed
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Dayjs>(() => dayjs());
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const todayMonthRef = React.useRef<HTMLDivElement>(null);
  const [patientUpdateSaving, setPatientUpdateSaving] = useState(false);
  const [patientUpdateForm, setPatientUpdateForm] = useState<{ gender?: string; bloodGroup?: string; weight?: string; height?: string; dateOfBirth?: string; ageAtReference?: number }>({});

  useEffect(() => {
    if (selectedAppointment) setPatientUpdateForm({});
  }, [selectedAppointment?.id]);

  // Get notifications for TopHeader
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
  });
  
  const siderWidth = isMobile ? 0 : 80; // Narrow sidebar width matching PatientSidebar
  
  // Sidebar: same as doctor dashboard so it does not "change" when on appointments page (Appointments highlighted)
  const SidebarContent = ({ onMenuClick }: { onMenuClick?: () => void }) => {
    const nav = (key: string) => {
      if (onMenuClick) onMenuClick();
      if (key === 'dashboard') setLocation('/dashboard/doctor');
      if (key === 'appointments') setLocation('/dashboard/doctor/appointments');
      if (key === 'prescriptions' || key === 'ipd' || key === 'availability') setLocation('/dashboard/doctor');
    };
    const btn = (key: string, icon: React.ReactNode, title: string, active: boolean) => (
      <Button
        type="text"
        icon={icon}
        title={title}
        style={{
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: active ? '#E3F2FF' : 'transparent',
          borderRadius: '8px',
        }}
        onClick={() => nav(key)}
      />
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', width: '80px', alignItems: 'center', padding: '16px 0', gap: '12px', borderRight: '1px solid #E5E7EB' }}>
        <Button
          type="text"
          icon={<UserOutlined style={{ fontSize: '20px', color: '#1A8FE3' }} />}
          style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E3F2FF', borderRadius: '8px' }}
          onClick={() => setLocation('/dashboard/profile')}
          title="Profile"
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, alignItems: 'center' }}>
          {btn('dashboard', <UserOutlined style={{ fontSize: '20px', color: '#6B7280' }} />, 'Dashboard', false)}
          {btn('appointments', <CalendarOutlined style={{ fontSize: '20px', color: '#1A8FE3' }} />, 'Appointments', true)}
          {btn('prescriptions', <MedicineBoxOutlined style={{ fontSize: '20px', color: '#6B7280' }} />, 'Prescriptions', false)}
          {btn('ipd', <TeamOutlined style={{ fontSize: '20px', color: '#6B7280' }} />, 'IPD', false)}
          {btn('availability', <SettingOutlined style={{ fontSize: '20px', color: '#6B7280' }} />, 'Availability', false)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<LogoutOutlined style={{ fontSize: '20px', color: '#EF4444' }} />}
            style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => logout()}
            title="Logout"
          />
        </div>
      </div>
    );
  };

  // Get appointments from API with auto-refresh
  const { data: appointmentsData = [], isLoading: loading, refetch: refetchAppointments } = useQuery({
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
      // Transform API data to match expected format
      return data.map((apt: any) => {
        // Prefer API-computed age (from DOB or from age_at_reference + reference date)
        const patientAge = apt.patientAge != null ? apt.patientAge : (() => {
          const dob = apt.patientDateOfBirth ? dayjs(apt.patientDateOfBirth) : null;
          return dob && dob.isValid() ? Math.floor(dayjs().diff(dob, 'year', true)) : null;
        })();
        return {
        id: apt.id,
        patientId: apt.patientId,
        patientName: apt.patientName || 'Unknown Patient',
        patientAge,
        patientGender: apt.patientGender ?? null,
        patientBloodGroup: apt.patientBloodGroup ?? null,
        patientWeight: apt.patientWeight ?? null,
        patientHeight: apt.patientHeight ?? null,
        patientDateOfBirth: apt.patientDateOfBirth ?? null,
        appointmentDate: apt.appointmentDate || new Date().toISOString(),
        appointmentTime: apt.appointmentTime || apt.timeSlot?.split('-')[0] || 'N/A',
        timeSlot: apt.timeSlot || `${apt.appointmentTime}-${apt.appointmentTime}`,
        reason: apt.reason || 'Consultation',
        status: apt.status || 'pending',
        type: apt.type || 'online',
        priority: apt.priority || 'normal',
        symptoms: apt.symptoms || '',
        notes: apt.notes || '',
        medicalHistory: '', // Not available in API response
        allergies: '', // Not available in API response
        createdAt: apt.createdAt || new Date().toISOString(),
        completedAt: apt.completedAt
      };
      });
    },
    refetchInterval: 3000, // Refetch every 3 seconds for faster updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Listen for appointment updates from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appointment-updated') {
        refetchAppointments();
      }
    };
    
    // Also listen for custom events (same-window updates)
    const handleCustomEvent = () => {
      refetchAppointments();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('appointment-updated', handleCustomEvent);
    
    // Also check periodically for updates
    const interval = setInterval(() => {
      const lastUpdate = window.localStorage.getItem('appointment-updated');
      if (lastUpdate) {
        const updateTime = parseInt(lastUpdate);
        const now = Date.now();
        // If update happened within last 5 seconds, refetch
        if (now - updateTime < 5000) {
          refetchAppointments();
        }
      }
    }, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('appointment-updated', handleCustomEvent);
      clearInterval(interval);
    };
  }, [refetchAppointments]);

  const appointments = appointmentsData;

  // Group appointment counts by date (YYYY-MM-DD) for calendar
  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    (appointments || []).forEach((apt: any) => {
      const d = apt.appointmentDate;
      if (!d) return;
      const dateStr = dayjs(d).format('YYYY-MM-DD');
      map[dateStr] = (map[dateStr] || 0) + 1;
    });
    return map;
  }, [appointments]);

  // Appointments for the selected calendar date
  const appointmentsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.format('YYYY-MM-DD');
    return (appointments || []).filter((apt: any) => {
      const aptStr = apt.appointmentDate ? dayjs(apt.appointmentDate).format('YYYY-MM-DD') : '';
      return aptStr === dateStr;
    });
  }, [appointments, selectedDate]);

  // Appointments grouped by date (YYYY-MM-DD) for calendar cells
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (appointments || []).forEach((apt: any) => {
      const d = apt.appointmentDate;
      if (!d) return;
      const dateStr = dayjs(d).format('YYYY-MM-DD');
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(apt);
    });
    return map;
  }, [appointments]);

  // Build calendar grid for any month: Sunday-first, 6 weeks
  const buildGridForMonth = (month: Dayjs) => {
    const first = month.startOf('month');
    const start = first.subtract(first.day(), 'day');
    const cells: { date: Dayjs; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const date = start.add(i, 'day');
      cells.push({ date, isCurrentMonth: date.month() === month.month() });
    }
    return cells;
  };

  // Months to show in scroll: 12 months back, current, 3 months ahead
  const scrollMonths = useMemo(() => {
    const start = dayjs().subtract(12, 'month').startOf('month');
    const list: Dayjs[] = [];
    for (let i = 0; i < 16; i++) list.push(start.add(i, 'month'));
    return list;
  }, []);

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logout,
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
      icon: <FileTextOutlined />,
      label: 'Prescriptions',
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#1890ff' }} />;
      case 'cancelled':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ExclamationCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getStatusTag = (status: string) => {
    const colorMap = {
      confirmed: 'success',
      pending: 'warning',
      completed: 'processing',
      cancelled: 'error'
    };
    
    return (
      <Tag color={colorMap[status as keyof typeof colorMap] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Tag>
    );
  };

  const getPriorityTag = (priority: string) => {
    const colorMap = {
      high: 'red',
      normal: 'green',
      low: 'default'
    };
    
    return (
      <Tag color={colorMap[priority as keyof typeof colorMap] || 'default'}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
      </Tag>
    );
  };

  const filteredAppointments = appointments.filter((appointment: any) => {
    const matchesFilter = filter === 'all' || appointment.status === filter;
    const matchesSearch = appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleConfirmAppointment = async (appointmentId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/appointments/${appointmentId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        message.success('Appointment confirmed successfully');
        // Trigger storage event to notify other tabs
        window.localStorage.setItem('appointment-updated', Date.now().toString());
        // Refetch appointments
        refetchAppointments();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to confirm appointment');
      }
    } catch (error) {
      console.error('Error confirming appointment:', error);
      message.error('Failed to confirm appointment');
    }
  };

  const handleCompleteAppointment = async (appointmentId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/appointments/${appointmentId}/complete`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        message.success('Appointment completed successfully');
        // Trigger storage event to notify other tabs
        window.localStorage.setItem('appointment-updated', Date.now().toString());
        // Refetch appointments
        refetchAppointments();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to complete appointment');
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
      message.error('Failed to complete appointment');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#F5F7FF' }}>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
      <Sider 
          width={80}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            background: '#fff',
            boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            borderRight: '1px solid #E5E7EB',
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

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: '#F5F7FF',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        {/* TopHeader - Matching Patient Dashboard Design */}
        <TopHeader
          userName={user?.fullName || 'Doctor'}
          userRole="Doctor"
          userId={(() => {
            if (user?.id) {
              const year = new Date().getFullYear();
              const idNum = String(user.id).padStart(3, '0');
              return `DOC-${year}-${idNum}`;
            }
            return 'DOC-2024-001';
          })()}
          userInitials={(() => {
            if (user?.fullName) {
              const names = user.fullName.split(' ');
              if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
              }
              return user.fullName.substring(0, 2).toUpperCase();
            }
            return 'DR';
          })()}
          notificationCount={notifications.filter((n: any) => !n.isRead).length}
        />

        <Content
          style={{
            background: '#F5F7FF',
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
            // Responsive padding - reduced to save side space
            padding: isMobile 
              ? '12px 12px 16px'
              : isTablet 
                ? '12px 16px 20px'
                : '12px 16px 20px',
            margin: 0,
            width: '100%',
          }}
        >
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

          <div style={{ paddingBottom: 24 }}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, border: '1px solid #E5E7EB' }}>
            <Title level={2} style={{ margin: '0 0 16px 0', color: '#1890ff' }}>
              <CalendarOutlined style={{ marginRight: '8px' }} />
              My Appointments
            </Title>
            <Text type="secondary">Manage your patient appointments — click a date to see that day&apos;s bookings</Text>
          </div>

          {/* Calendar: full width, vertical scroll through months, fixed cell height, no dropdowns */}
          <Card style={{ marginBottom: 24 }}>
            <div style={{ width: '100%', margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <Button
                  type="primary"
                  icon={<CalendarOutlined />}
                  onClick={() => {
                    setSelectedDate(dayjs());
                    todayMonthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  Go to today
                </Button>
              </div>
              <div
                ref={scrollContainerRef}
                style={{
                  overflowY: 'auto',
                  maxHeight: 'calc(100vh - 280px)',
                  minHeight: 320,
                  width: '100%',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                }}
              >
                {scrollMonths.map((month) => {
                  const grid = buildGridForMonth(month);
                  const isCurrentMonth = month.isSame(dayjs(), 'month');
                  return (
                    <div
                      key={month.format('YYYY-MM')}
                      ref={isCurrentMonth ? todayMonthRef : undefined}
                      style={{ padding: '20px 16px', borderBottom: '1px solid #f0f0f0' }}
                    >
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: isCurrentMonth ? '#1890ff' : '#333',
                          marginBottom: 12,
                          paddingBottom: 8,
                          borderBottom: isCurrentMonth ? '2px solid #1890ff' : '1px solid #e8e8e8',
                        }}
                      >
                        {month.format('MMMM YYYY')}
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => (
                              <th
                                key={d}
                                style={{
                                  padding: '12px 8px',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                  color: '#555',
                                  borderBottom: '2px solid #e8e8e8',
                                  borderRight: i < 6 ? '1px solid #e8e8e8' : undefined,
                                  fontSize: 14,
                                }}
                              >
                                {d}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[0, 1, 2, 3, 4, 5].map((row) => (
                            <tr key={row}>
                              {[0, 1, 2, 3, 4, 5, 6].map((col) => {
                                const { date, isCurrentMonth: inMonth } = grid[row * 7 + col];
                                const dateStr = date.format('YYYY-MM-DD');
                                const list = appointmentsByDate[dateStr] || [];
                                const hasAppointments = list.length > 0;
                                const isSelected = selectedDate && selectedDate.format('YYYY-MM-DD') === dateStr;
                                const isToday = dateStr === dayjs().format('YYYY-MM-DD');
                                const isPast = dayjs(dateStr).isBefore(dayjs(), 'day');
                                const dateNum = String(date.date()).padStart(2, '0');
                                return (
                                  <td
                                    key={dateStr}
                                    style={{
                                      padding: '8px 4px',
                                      textAlign: 'center',
                                      borderBottom: '1px solid #e8e8e8',
                                      borderRight: col < 6 ? '1px solid #e8e8e8' : undefined,
                                      cursor: 'pointer',
                                      background: isSelected ? '#e6f7ff' : hasAppointments && !isSelected ? '#f6ffed' : undefined,
                                      color: inMonth ? undefined : '#bfbfbf',
                                      height: 56,
                                      verticalAlign: 'middle',
                                      ...(isSelected ? { borderLeft: '3px solid #1890ff', borderTop: '2px solid #1890ff', borderBottom: '2px solid #1890ff' } : {}),
                                    }}
                                    onClick={() => setSelectedDate(date)}
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 40, gap: 4 }}>
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: 36,
                                          height: 36,
                                          borderRadius: 18,
                                          fontWeight: isToday ? 700 : 600,
                                          fontSize: 14,
                                          flexShrink: 0,
                                          ...(isSelected
                                            ? { background: '#1890ff', color: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }
                                            : hasAppointments && !isSelected
                                              ? { background: '#f6ffed', color: '#52c41a', border: '2px solid #52c41a' }
                                              : isToday
                                                ? { border: '2px solid #1890ff', color: '#1890ff' }
                                                : { color: inMonth ? '#333' : '#bfbfbf' }
                                          ),
                                        }}
                                      >
                                        {dateNum}
                                      </span>
                                      <span style={{ height: 14, fontSize: 10, lineHeight: 1.2, color: hasAppointments ? '#52c41a' : 'transparent' }}>
                                        {hasAppointments ? `${list.length}` : '\u00a0'}
                                      </span>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Appointment detail drawer */}
          <Drawer
            title="Appointment details"
            placement="right"
            width={400}
            open={!!selectedAppointment}
            onClose={() => setSelectedAppointment(null)}
            footer={
              selectedAppointment && (
                <Space>
                  {selectedAppointment.status === 'pending' && (
                    <Button type="primary" onClick={() => { handleConfirmAppointment(selectedAppointment.id); setSelectedAppointment(null); }}>Confirm</Button>
                  )}
                  {selectedAppointment.status === 'confirmed' && (
                    <Button type="primary" onClick={() => { handleCompleteAppointment(selectedAppointment.id); setSelectedAppointment(null); }}>Complete</Button>
                  )}
                  <Button onClick={() => setSelectedAppointment(null)}>Close</Button>
                </Space>
              )
            }
          >
            {selectedAppointment && (
              <>
                <p><strong>Patient:</strong> {selectedAppointment.patientName}</p>
                <p><strong>Reason:</strong> {selectedAppointment.reason}</p>
                <p><strong>Date:</strong> {dayjs(selectedAppointment.appointmentDate).format('ddd, D MMM YYYY')}</p>
                <p><strong>Time:</strong> {selectedAppointment.appointmentTime || selectedAppointment.timeSlot || '—'}</p>
                <p><strong>Type:</strong> {selectedAppointment.type || 'consultation'}</p>
                <p><strong>Status:</strong> {getStatusTag(selectedAppointment.status)}</p>
                {selectedAppointment.patientBloodGroup != null && <p><strong>Blood group:</strong> {selectedAppointment.patientBloodGroup}</p>}
                <Divider />
                <Title level={5}>Add or update patient info</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Save to database so it appears everywhere (prescriptions, reports, etc.).</Text>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Gender</Text>
                    <Select
                      placeholder="Gender"
                      allowClear
                      style={{ width: '100%', marginTop: 4 }}
                      value={patientUpdateForm.gender ?? selectedAppointment.patientGender ?? undefined}
                      onChange={(v) => setPatientUpdateForm((f) => ({ ...f, gender: v ?? undefined }))}
                      options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]}
                    />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Blood group</Text>
                    <Select
                      placeholder="Blood group"
                      allowClear
                      style={{ width: '100%', marginTop: 4 }}
                      value={patientUpdateForm.bloodGroup ?? selectedAppointment.patientBloodGroup ?? undefined}
                      onChange={(v) => setPatientUpdateForm((f) => ({ ...f, bloodGroup: v ?? undefined }))}
                      options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => ({ value: g, label: g }))}
                    />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Weight (kg)</Text>
                    <Input
                      type="number"
                      placeholder="Weight"
                      value={patientUpdateForm.weight ?? selectedAppointment.patientWeight ?? ''}
                      onChange={(e) => setPatientUpdateForm((f) => ({ ...f, weight: e.target.value || undefined }))}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Height (cm)</Text>
                    <Input
                      type="number"
                      placeholder="Height"
                      value={patientUpdateForm.height ?? selectedAppointment.patientHeight ?? ''}
                      onChange={(e) => setPatientUpdateForm((f) => ({ ...f, height: e.target.value || undefined }))}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                  {!selectedAppointment.patientDateOfBirth && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Age (if DOB unknown)</Text>
                      <Input
                        type="number"
                        min={0}
                        max={150}
                        placeholder="e.g. 83 — age as of today; we’ll recalc each year"
                        value={patientUpdateForm.ageAtReference ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                          setPatientUpdateForm((f) => ({ ...f, ageAtReference: isNaN(v as number) ? undefined : v }));
                        }}
                        style={{ marginTop: 4 }}
                      />
                    </div>
                  )}
                  <Button
                    type="default"
                    loading={patientUpdateSaving}
                    onClick={async () => {
                      if (!selectedAppointment?.patientId) return;
                      const payload: Record<string, unknown> = {
                        gender: patientUpdateForm.gender || selectedAppointment.patientGender || null,
                        bloodGroup: patientUpdateForm.bloodGroup || selectedAppointment.patientBloodGroup || null,
                        weight: patientUpdateForm.weight || selectedAppointment.patientWeight || null,
                        height: patientUpdateForm.height || selectedAppointment.patientHeight || null,
                        dateOfBirth: patientUpdateForm.dateOfBirth || (selectedAppointment.patientDateOfBirth ? dayjs(selectedAppointment.patientDateOfBirth).format('YYYY-MM-DD') : null),
                      };
                      if (patientUpdateForm.ageAtReference != null && !selectedAppointment.patientDateOfBirth) {
                        payload.ageAtReference = patientUpdateForm.ageAtReference;
                      }
                      setPatientUpdateSaving(true);
                      try {
                        const token = localStorage.getItem('auth-token');
                        const res = await fetch(`/api/patients/staff-update/${selectedAppointment.patientId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify(payload),
                        });
                        if (!res.ok) throw new Error((await res.json()).message || 'Update failed');
                        message.success('Patient info saved');
                        refetchAppointments();
                        setPatientUpdateForm({});
                      } catch (e: any) {
                        message.error(e?.message || 'Failed to save');
                      } finally {
                        setPatientUpdateSaving(false);
                      }
                    }}
                  >
                    Save to patient profile
                  </Button>
                </Space>
              </>
            )}
          </Drawer>

          {/* Selected date: show that day's appointments */}
          {selectedDate && (
            <Card title={`Appointments on ${selectedDate.format('ddd, D MMM YYYY')}`} style={{ marginBottom: 24 }} extra={<Button type="link" onClick={() => setSelectedDate(null)}>Clear date</Button>}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
              ) : appointmentsForSelectedDate.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Text type="secondary">No appointments on this date.</Text>
                </div>
              ) : (
                <List
                  dataSource={appointmentsForSelectedDate}
                  renderItem={(appointment: any) => (
                    <List.Item
                      key={appointment.id}
                      style={{ alignItems: 'flex-start', cursor: 'pointer' }}
                      onClick={() => setSelectedAppointment(appointment)}
                      actions={[
                        getStatusTag(appointment.status),
                        appointment.status === 'pending' && (
                          <Button type="primary" size="small" onClick={(e) => { e.stopPropagation(); handleConfirmAppointment(appointment.id); }}>Confirm</Button>
                        ),
                        appointment.status === 'confirmed' && (
                          <Button type="primary" size="small" onClick={(e) => { e.stopPropagation(); handleCompleteAppointment(appointment.id); }}>Complete</Button>
                        ),
                      ].filter(Boolean)}
                    >
                      <List.Item.Meta
                        avatar={<Avatar style={{ backgroundColor: '#1890ff' }}>{appointment.patientName?.charAt(0) || 'P'}</Avatar>}
                        title={<Space>{appointment.patientName} {getStatusIcon(appointment.status)}</Space>}
                        description={
                          <>
                            <Text type="secondary" style={{ display: 'block' }}>{appointment.reason}</Text>
                            <Space>
                              <ClockCircleOutlined />
                              <Text type="secondary">{appointment.appointmentTime || appointment.timeSlot || '—'}</Text>
                              <Tag>{appointment.type || 'consultation'}</Tag>
                            </Space>
                          </>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          )}

          {/* Filters and Search */}
          <Card style={{ marginBottom: '24px' }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={16}>
                <Search
                  placeholder="Search patients or appointments..."
                  allowClear
                  style={{ width: '100%' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space wrap>
                  <Button 
                    type={filter === 'all' ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setFilter('all')}
                  >
                    All
                  </Button>
                  <Button 
                    type={filter === 'pending' ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setFilter('pending')}
                  >
                    Pending
                  </Button>
                  <Button 
                    type={filter === 'confirmed' ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setFilter('confirmed')}
                  >
                    Confirmed
                  </Button>
                  <Button 
                    type={filter === 'completed' ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setFilter('completed')}
                  >
                    Completed
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Appointments List */}
          {loading ? (
            <div>
              {[1, 2, 3].map((i) => (
                <Card key={i} loading style={{ marginBottom: '16px' }}>
                  <Card.Meta
                    avatar={<Avatar />}
                    title="Loading..."
                    description="Loading appointment details..."
                  />
                </Card>
              ))}
            </div>
          ) : filteredAppointments.length > 0 ? (
            <div>
              {filteredAppointments.map((appointment: any) => (
                <Card 
                  key={appointment.id} 
                  style={{ marginBottom: '16px', cursor: 'pointer' }}
                  hoverable
                  onClick={() => setSelectedAppointment(appointment)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                      <Avatar 
                        size={48} 
                        style={{ backgroundColor: '#52c41a', color: '#fff' }}
                      >
                        {appointment.patientName?.charAt(0) || "P"}
                      </Avatar>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Title level={4} style={{ margin: 0 }}>
                            {appointment.patientName}
                          </Title>
                          {getStatusIcon(appointment.status)}
                          {getPriorityTag(appointment.priority)}
                        </div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>
                          {appointment.patientAge != null ? `${appointment.patientAge} years old` : 'Age not specified'} • {appointment.patientGender || 'Gender not specified'}
                        </Text>
                        <Text style={{ display: 'block', marginBottom: '8px' }}>
                          {appointment.reason}
                        </Text>
                        <Space size="large">
                          <Space>
                            <CalendarOutlined />
                            <Text type="secondary">
                              {formatDate(appointment.appointmentDate)}
                            </Text>
                          </Space>
                          <Space>
                            <ClockCircleOutlined />
                            <Text type="secondary">
                              {appointment.appointmentTime}
                            </Text>
                          </Space>
                          <Space>
                            <VideoCameraOutlined />
                            <Text type="secondary">
                              {appointment.type}
                            </Text>
                          </Space>
                        </Space>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      {getStatusTag(appointment.status)}
                      <Space>
                        {appointment.status === 'pending' && (
                          <Button 
                            type="primary"
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleConfirmAppointment(appointment.id); }}
                          >
                            Confirm
                          </Button>
                        )}
                        {appointment.status === 'confirmed' && (
                          <>
                            <Button 
                              size="small" 
                              icon={<PhoneOutlined />}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Start Call
                            </Button>
                            <Button 
                              type="primary"
                              size="small"
                              onClick={(e) => { e.stopPropagation(); handleCompleteAppointment(appointment.id); }}
                            >
                              Complete
                            </Button>
                          </>
                        )}
                        <Button size="small" onClick={(e) => { e.stopPropagation(); setSelectedAppointment(appointment); }}>
                          View Details
                        </Button>
                      </Space>
                    </div>
                  </div>
                  
                  {appointment.symptoms && (
                    <div style={{ 
                      marginTop: '16px', 
                      padding: '12px', 
                      background: '#fffbe6', 
                      borderRadius: '6px',
                      border: '1px solid #ffe58f'
                    }}>
                      <Text strong>Symptoms: </Text>
                      <Text>{appointment.symptoms}</Text>
                    </div>
                  )}
                  
                  {appointment.medicalHistory && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '12px', 
                      background: '#e6f7ff', 
                      borderRadius: '6px',
                      border: '1px solid #91d5ff'
                    }}>
                      <Text strong>Medical History: </Text>
                      <Text>{appointment.medicalHistory}</Text>
                    </div>
                  )}
                  
                  {appointment.allergies && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '12px', 
                      background: '#fff2f0', 
                      borderRadius: '6px',
                      border: '1px solid #ffccc7'
                    }}>
                      <Text strong>Allergies: </Text>
                      <Text>{appointment.allergies}</Text>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <CalendarOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
                <Title level={3} style={{ color: '#8c8c8c', marginBottom: '8px' }}>
                  No appointments found
                </Title>
                <Text type="secondary">
                  {searchTerm || filter !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'You don\'t have any appointments scheduled'
                  }
                </Text>
              </div>
            </Card>
          )}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
