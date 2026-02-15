import { useState, useEffect, useMemo, useRef } from "react";
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
  Divider,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  App,
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
  HeartOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  EditOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { getAuthToken } from '../../lib/auth';
import { useResponsive } from '../../hooks/use-responsive';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { TopHeader } from '../../components/layout/TopHeader';
import { VitalsEntryForm } from '../../components/clinical/VitalsEntryForm';
import { NursingNotesForm } from '../../components/clinical/NursingNotesForm';
import { ShiftHandoverModal } from '../../components/clinical/ShiftHandoverModal';
import { IpdEncountersList } from '../../components/ipd/IpdEncountersList';
import { NurseSidebar } from '../../components/layout/NurseSidebar';
import EMAR from '../../pages/ipd/emar';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getISTNow } from '../../lib/timezone';
import { playNotificationSound } from '../../lib/notification-sounds';
import { getShownNotificationIds, markNotificationAsShown } from '../../lib/notification-shown-storage';

dayjs.extend(relativeTime);

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const nurseTheme = {
  primary: '#059669',    // Green for nursing/healthcare
  highlight: '#ECFDF5',
  accent: '#10B981',
  background: '#F0FDF4', // Light green background
};

export default function NurseDashboard() {
  const { user, isLoading } = useAuth();
  const { notification: notificationApi } = App.useApp();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  // Derive view from router location so sidebar navigation and direct URLs update content
  const urlView = useMemo(() => {
    const search = location.includes('?') ? location.split('?')[1] || '' : '';
    let view = new URLSearchParams(search).get('view');
    if (view && ['dashboard', 'patients', 'vitals', 'notes', 'emar'].includes(view)) return view;
    // Fallback for direct load when router may not include search in location
    if (typeof window !== 'undefined') {
      view = new URLSearchParams(window.location.search).get('view');
      if (view && ['dashboard', 'patients', 'vitals', 'notes', 'emar'].includes(view)) return view;
    }
    return 'dashboard';
  }, [location]);
  const [overrideView, setOverrideView] = useState<'ipd-patient-detail' | 'emar' | null>(null);
  // Track view from sidebar click so vitals/notes work even if router doesn't expose query in location
  const [sidebarView, setSidebarView] = useState<string | null>(null);
  const selectedMenuKey = overrideView ?? sidebarView ?? urlView;
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isMedicationsModalOpen, setIsMedicationsModalOpen] = useState(false);
  const [isAdministerModalOpen, setIsAdministerModalOpen] = useState(false);
  const [isShiftHandoverModalOpen, setIsShiftHandoverModalOpen] = useState(false);
  const [selectedEncounterId, setSelectedEncounterId] = useState<number | undefined>(undefined);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  const [selectedPatientName, setSelectedPatientName] = useState<string | undefined>(undefined);
  const [selectedEncounter, setSelectedEncounter] = useState<any>(null);
  const [selectedEncounterForDetail, setSelectedEncounterForDetail] = useState<number | null>(null);

  // Keep router and sidebar view in sync with URL on direct load (e.g. /dashboard/nurse?view=vitals)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname;
    const search = window.location.search || '';
    if (!pathname.startsWith('/dashboard/nurse')) return;
    const fullUrl = pathname + search;
    if (search && fullUrl !== location) setLocation(fullUrl);
    const view = new URLSearchParams(search).get('view');
    if (view && ['dashboard', 'patients', 'vitals', 'notes', 'emar'].includes(view)) setSidebarView(view);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to sync URL
  }, []);

  // Get nurse profile (all hooks must run unconditionally — no early returns before hooks)
  const { data: nurseProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/nurses/profile'],
    queryFn: async () => {
      const token = getAuthToken();
      const response = await fetch('/api/nurses/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Nurse profile not found. Please complete your registration.');
        }
        throw new Error('Failed to load nurse profile');
      }

      return response.json();
    },
    enabled: !!user && user.role?.toUpperCase() === 'NURSE',
  });

  // Get IPD encounters for nurse's ward
  const { data: ipdEncounters = [], isLoading: isLoadingEncounters } = useQuery({
    queryKey: ['/api/ipd/encounters', 'nurse'],
    queryFn: async () => {
      const token = getAuthToken();
      const response = await fetch('/api/ipd/encounters?nurse=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load IPD encounters');
      }

      return response.json();
    },
    enabled: !!nurseProfile,
  });

  // Get vitals history for nurse's patients
  const { data: vitalsHistory = [], isLoading: isLoadingVitals } = useQuery({
    queryKey: ['/api/clinical/vitals', 'nurse'],
    queryFn: async () => {
      const token = getAuthToken();
      const response = await fetch('/api/clinical/vitals?nurse=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load vitals history');
      }

      return response.json();
    },
    enabled: !!nurseProfile,
  });

  // Get nursing notes
  const { data: nursingNotes = [], isLoading: isLoadingNotes } = useQuery({
    queryKey: ['/api/clinical/nursing-notes', 'nurse'],
    queryFn: async () => {
      const token = getAuthToken();
      const response = await fetch('/api/clinical/nursing-notes?nurse=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load nursing notes');
      }

      return response.json();
    },
    enabled: !!nurseProfile,
  });

  // Get notifications for nurse
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

  // Get hospital name from nurse profile (similar to doctor dashboard)
  const hospitalName = useMemo(() => {
    if (nurseProfile?.hospitalName) {
      return nurseProfile.hospitalName;
    }
    if (nurseProfile?.hospital?.name) {
      return nurseProfile.hospital.name;
    }
    return null;
  }, [nurseProfile?.hospitalName, nurseProfile?.hospital?.name]);

  // Calculate KPIs from real data
  const kpis = useMemo(() => {
    const totalPatients = ipdEncounters.length;
    
    // Calculate critical patients based on latest vitals
    const criticalPatients = ipdEncounters.filter((encounter: any) => {
      const latestVitals = vitalsHistory
        .filter((v: any) => v.patientId === encounter.patientId)
        .sort((a: any, b: any) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
      
      if (!latestVitals) return false;
      
      return (
        latestVitals.temperature > 38.5 || latestVitals.temperature < 35 ||
        latestVitals.bpSystolic > 180 || latestVitals.bpSystolic < 90 ||
        latestVitals.pulse > 120 || latestVitals.pulse < 50 ||
        latestVitals.respirationRate > 30 || latestVitals.respirationRate < 8
      );
    }).length;
    
    // Calculate vitals recorded today
    const today = dayjs().startOf('day');
    const todayVitals = vitalsHistory.filter((vital: any) =>
      dayjs(vital.recordedAt).isSame(today, 'day')
    ).length;
    
    // Calculate yesterday vitals for comparison
    const yesterday = dayjs().subtract(1, 'day').startOf('day');
    const yesterdayVitals = vitalsHistory.filter((vital: any) =>
      dayjs(vital.recordedAt).isSame(yesterday, 'day')
    ).length;
    
    const vitalsDiff = todayVitals - yesterdayVitals;
    const vitalsBadgeText = vitalsDiff > 0 ? `+${vitalsDiff} vs yesterday` : vitalsDiff < 0 ? `${vitalsDiff} vs yesterday` : 'Same as yesterday';
    
    // Calculate pending tasks (vitals due, medications due, notes pending)
    const pendingTasks = ipdEncounters.length * 3; // Estimate: vitals, meds, notes per patient

    return [
      {
        label: 'My Patients',
        value: totalPatients,
        icon: <TeamOutlined style={{ fontSize: 24, color: '#059669' }} />,
        badgeText: totalPatients > 0 ? `${totalPatients} under care` : 'No patients',
        color: 'green' as const,
      },
      {
        label: 'Critical Patients',
        value: criticalPatients,
        icon: <AlertOutlined style={{ fontSize: 24, color: '#EF4444' }} />,
        badgeText: criticalPatients > 0 ? 'Needs attention' : 'All stable',
        color: 'orange' as const,
      },
      {
        label: 'Vitals Recorded Today',
        value: todayVitals,
        icon: <HeartOutlined style={{ fontSize: 24, color: '#10B981' }} />,
        badgeText: vitalsBadgeText,
        color: 'green' as const,
      },
      {
        label: 'Pending Tasks',
        value: pendingTasks,
        icon: <ClockCircleOutlined style={{ fontSize: 24, color: '#F59E0B' }} />,
        badgeText: pendingTasks > 0 ? 'Update soon' : 'All done',
        color: 'orange' as const,
      },
    ];
  }, [ipdEncounters, vitalsHistory]);

  // TopHeader display values — must be hooks at top level so hook order is stable
  const nurseUserId = useMemo(() => {
    if (user?.id) {
      const year = new Date().getFullYear();
      const idNum = String(user.id).padStart(3, '0');
      return `NUR-${year}-${idNum}`;
    }
    return 'NUR-2024-001';
  }, [user?.id]);
  const nurseUserInitials = useMemo(() => {
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.fullName.substring(0, 2).toUpperCase();
    }
    return 'NU';
  }, [user?.fullName]);

  // Quick actions for nurses
  const quickActions = [
    {
      title: 'Record Vitals',
      description: 'Take patient vital signs',
      icon: <HeartOutlined />,
      action: () => setIsVitalsModalOpen(true),
      color: nurseTheme.primary,
    },
    {
      title: 'Add Nursing Note',
      description: 'Document patient assessment',
      icon: <FileTextOutlined />,
      action: () => {
        if (selectedPatientId && selectedEncounterId) {
          setSelectedEncounter(ipdEncounters.find((e: any) => e.id === selectedEncounterId) || null);
          setIsNotesModalOpen(true);
        } else {
          message.info('Select a patient from My Ward Patients first, then click "Add Note"');
        }
      },
      color: nurseTheme.accent,
    },
    {
      title: 'Medication Admin',
      description: 'Record medication given',
      icon: <MedicineBoxOutlined />,
      action: () => {
        if (selectedEncounter?.id) {
          setIsAdministerModalOpen(true);
        } else {
          message.info('Select a patient from My Ward Patients first, then click "Administer Medication" on that row');
        }
      },
      color: '#10B981',
    },
    {
      title: 'Shift Handover',
      description: 'Document shift notes',
      icon: <ClockCircleOutlined />,
      action: () => setIsShiftHandoverModalOpen(true),
      color: '#8B5CF6',
    },
  ];

  const menuItems = [
    {
      key: 'dashboard',
      icon: <UserOutlined />,
      label: 'My Ward',
    },
    {
      key: 'patients',
      icon: <TeamOutlined />,
      label: 'Patient List',
    },
    {
      key: 'vitals',
      icon: <HeartOutlined />,
      label: 'Vitals History',
    },
    {
      key: 'notes',
      icon: <FileTextOutlined />,
      label: 'Nursing Notes',
    },
    {
      key: 'emar',
      icon: <MedicineBoxOutlined />,
      label: 'eMAR',
    },
  ];

  const renderDashboard = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        {kpis.map((kpi, index) => (
          <div key={index} style={{ flex: 1, minWidth: isMobile ? '100%' : 0 }}>
          <KpiCard
              label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
              badgeText={kpi.badgeText}
            color={kpi.color}
          />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions" size="small">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>
          {quickActions.map((action, index) => (
            <QuickActionTile
              key={index}
              title={action.title}
              description={action.description}
              icon={action.icon}
              onClick={action.action}
              style={{ backgroundColor: action.color + '15', borderColor: action.color + '30' }}
            />
          ))}
        </div>
      </Card>

      {/* My Ward Patients - Always show on Dashboard */}
      <Card title="My Ward Patients" size="small">
        <IpdEncountersList
          encounters={ipdEncounters}
          loading={isLoadingEncounters}
          showDoctorInfo={true}
          isNurseView={true}
          onViewPatient={(encounter) => {
            if (encounter.id) {
              setSelectedEncounterForDetail(encounter.id);
              setOverrideView('ipd-patient-detail');
            }
          }}
          onRecordVitals={(encounterId, patientId, patientName) => {
            setSelectedEncounterId(encounterId);
            setSelectedPatientId(patientId);
            setSelectedPatientName(patientName);
            setIsVitalsModalOpen(true);
          }}
          onAddNote={(encounter) => {
            setSelectedEncounter(encounter);
            setSelectedEncounterId(encounter.id);
            setSelectedPatientId(encounter.patientId);
            setIsNotesModalOpen(true);
          }}
          onViewMedications={(encounter) => {
            setSelectedEncounter(encounter);
            setIsMedicationsModalOpen(true);
          }}
          onAdministerMedication={(encounter) => {
            setSelectedEncounter(encounter);
            setIsAdministerModalOpen(true);
          }}
        />
      </Card>

      {/* Recent Activity - Real Data */}
      <Card title="Recent Activity" size="small">
        {vitalsHistory.length === 0 && nursingNotes.length === 0 ? (
          <Alert
            message="No recent activity"
            description="Your recent vitals recordings and nursing notes will appear here."
            type="info"
            showIcon
          />
        ) : (
        <List
          size="small"
          dataSource={[
              // Recent vitals - get patient name from IPD encounters
              ...vitalsHistory.slice(0, 5).map((vital: any) => {
                const encounter = ipdEncounters.find((e: any) => e.patientId === vital.patientId);
                const patientName = encounter?.patientName || encounter?.patient?.fullName || encounter?.patient?.user?.fullName || 'Patient';
                return {
                  time: dayjs(vital.recordedAt).fromNow(),
                  action: `Recorded vitals for ${patientName}`,
                  type: 'vitals',
                  date: vital.recordedAt,
                };
              }),
              // Recent nursing notes
              ...nursingNotes.slice(0, 3).map((note: any) => ({
                time: dayjs(note.createdAt).fromNow(),
                action: `Added ${note.noteType || 'assessment'} note`,
                type: 'notes',
                date: note.createdAt,
              })),
            ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)}
          renderItem={(item: any) => (
            <List.Item>
              <Space>
                <Tag color={
                  item.type === 'vitals' ? 'green' :
                  item.type === 'medication' ? 'blue' :
                  item.type === 'notes' ? 'purple' : 'default'
                }>
                  {item.type}
                </Tag>
                <Text>{item.action}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>{item.time}</Text>
              </Space>
            </List.Item>
          )}
        />
        )}
      </Card>
    </Space>
  );

  const renderPatients = () => (
    <Card 
      title="My Ward Patients" 
      size="small"
      style={{ marginBottom: 0 }}
      bodyStyle={{ padding: '16px' }}
    >
      <IpdEncountersList
        encounters={ipdEncounters}
        loading={isLoadingEncounters}
        showDoctorInfo={true}
        isNurseView={true}
        onViewPatient={(encounter) => {
          // Show IPD patient detail page
          if (encounter.id) {
            setSelectedEncounterForDetail(encounter.id);
            setOverrideView('emar');
          }
        }}
        onRecordVitals={(encounterId, patientId, patientName) => {
          setSelectedEncounterId(encounterId);
          setSelectedPatientId(patientId);
          setSelectedPatientName(patientName);
          setIsVitalsModalOpen(true);
        }}
        onAddNote={(encounter) => {
          setSelectedEncounter(encounter);
          setSelectedEncounterId(encounter.id);
          setSelectedPatientId(encounter.patientId);
          setIsNotesModalOpen(true);
        }}
        onViewMedications={(encounter) => {
          setSelectedEncounter(encounter);
          setSelectedEncounterForDetail(encounter.id);
          setOverrideView('emar');
        }}
        onAdministerMedication={(encounter) => {
          setSelectedEncounter(encounter);
          setSelectedEncounterForDetail(encounter.id);
          setOverrideView('emar');
        }}
      />
    </Card>
  );

  const renderVitals = () => (
    <Card title="Vitals History" size="small">
      <Table
        dataSource={vitalsHistory.slice(0, 20)} // Show last 20 entries
        columns={[
          {
            title: 'Patient',
            key: 'patientName',
            render: (_: any, record: any) => {
              const encounter = ipdEncounters.find((e: any) => e.patientId === record.patientId);
              const patientName = encounter?.patientName || encounter?.patient?.fullName || 'Unknown';
              return <Text strong>{patientName}</Text>;
            },
          },
          {
            title: 'Recorded At',
            dataIndex: 'recordedAt',
            key: 'recordedAt',
            render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
          },
          {
            title: 'BP',
            key: 'bp',
            render: (_, record: any) => `${record.bpSystolic}/${record.bpDiastolic}`,
          },
          {
            title: 'Pulse',
            dataIndex: 'pulse',
            key: 'pulse',
            render: (pulse: number) => `${pulse} bpm`,
          },
          {
            title: 'Temp',
            dataIndex: 'temperature',
            key: 'temperature',
            render: (temp: number) => `${temp}°C`,
          },
          {
            title: 'SpO2',
            dataIndex: 'spo2',
            key: 'spo2',
            render: (spo2: number) => `${spo2}%`,
          },
        ]}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </Card>
  );

  const renderNotes = () => (
    <Card title="Nursing Notes" size="small">
      <List
        dataSource={nursingNotes.slice(0, 10)}
        renderItem={(note: any) => (
          <List.Item>
            <Card size="small" style={{ width: '100%' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space>
                  <Tag color={
                    note.noteType === 'assessment' ? 'blue' :
                    note.noteType === 'care_plan' ? 'green' :
                    note.noteType === 'shift_handover' ? 'orange' : 'purple'
                  }>
                    {note.noteType}
                  </Tag>
                  <Text type="secondary">{dayjs(note.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                </Space>
                {note.nursingAssessment && (
                  <div>
                    <Text strong>Assessment: </Text>
                    <Text>{note.nursingAssessment}</Text>
                  </div>
                )}
                {note.notes && (
                  <div>
                    <Text strong>Notes: </Text>
                    <Text>{note.notes}</Text>
                  </div>
                )}
              </Space>
            </Card>
          </List.Item>
        )}
      />
    </Card>
  );

  const renderContent = () => {
    if (selectedEncounterForDetail) {
      return (
        <div>
          <Button
            style={{ marginBottom: 16 }}
            onClick={() => {
              setSelectedEncounterForDetail(null);
              setOverrideView(null);
            }}
          >
            ← Back to List
          </Button>
          <IPDPatientDetail encounterId={selectedEncounterForDetail} />
        </div>
      );
    }

    switch (selectedMenuKey) {
      case 'patients':
        return renderPatients();
      case 'vitals':
        return renderVitals();
      case 'notes':
        return renderNotes();
      case 'emar':
        return <EMAR />;
      default:
        return renderDashboard();
    }
  };

  // Redirect if not authenticated (after all hooks)
  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }

  // Redirect if user doesn't have NURSE role
  if (!isLoading && user) {
    const userRole = user.role?.toUpperCase();
    if (userRole !== 'NURSE') {
      message.warning('You do not have access to this dashboard');
      switch (userRole) {
        case 'PATIENT':
          return <Redirect to="/dashboard/patient" />;
        case 'DOCTOR':
          return <Redirect to="/dashboard/doctor" />;
        case 'RECEPTIONIST':
          return <Redirect to="/dashboard/receptionist" />;
        case 'HOSPITAL':
          return <Redirect to="/dashboard/hospital" />;
        case 'LAB':
          return <Redirect to="/dashboard/lab" />;
        case 'PHARMACIST':
          return <Redirect to="/dashboard/pharmacist" />;
        case 'RADIOLOGY_TECHNICIAN':
          return <Redirect to="/dashboard/radiology-technician" />;
        default:
          return <Redirect to="/login" />;
      }
    }
  }

  if (isLoading || isLoadingProfile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Override medical-container padding for nurse dashboard */
        body:has(.nurse-dashboard-wrapper) .medical-container {
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* Figma Design - Menu Styling for Nurse Dashboard */
        .nurse-dashboard-menu .ant-menu-item {
          border-radius: 8px !important;
          margin: 2px 0 !important;
          height: auto !important;
          line-height: 1.5 !important;
          transition: all 0.2s ease !important;
          padding: 10px 12px !important;
          background: transparent !important;
          border: none !important;
        }
        .nurse-dashboard-menu .ant-menu-item:hover {
          background: #F9FAFB !important;
        }
        .nurse-dashboard-menu .ant-menu-item:hover,
        .nurse-dashboard-menu .ant-menu-item:hover .ant-menu-title-content {
          color: #111827 !important;
        }
        .nurse-dashboard-menu .ant-menu-item:hover .ant-menu-item-icon,
        .nurse-dashboard-menu .ant-menu-item:hover .anticon {
          color: #111827 !important;
        }
        .nurse-dashboard-menu .ant-menu-item-selected {
          background: #ECFDF5 !important;
          font-weight: 500 !important;
          border: none !important;
          padding: 10px 12px !important;
        }
        .nurse-dashboard-menu .ant-menu-item-selected,
        .nurse-dashboard-menu .ant-menu-item-selected .ant-menu-title-content {
          color: #059669 !important;
        }
        .nurse-dashboard-menu .ant-menu-item-selected .ant-menu-item-icon,
        .nurse-dashboard-menu .ant-menu-item-selected .anticon {
          color: #059669 !important;
        }
        .nurse-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) {
          color: #374151 !important;
          background: transparent !important;
        }
        .nurse-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-title-content {
          color: #374151 !important;
        }
        .nurse-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-item-icon,
        .nurse-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .anticon {
          color: #374151 !important;
        }
        .nurse-dashboard-menu .ant-menu-item-selected::after {
          display: none !important;
        }
        .nurse-dashboard-menu .ant-menu-item-icon,
        .nurse-dashboard-menu .anticon {
          font-size: 20px !important;
          width: 20px !important;
          height: 20px !important;
        }
      `}</style>
      <Layout className="nurse-dashboard-wrapper" style={{ minHeight: '100vh', background: nurseTheme.background }}>
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
              boxShadow: '0 2px 16px rgba(5, 150, 105, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10,
              borderRight: '1px solid #E5E7EB',
            }}
          >
            <NurseSidebar 
              selectedMenuKey={selectedMenuKey}
              onMenuClick={(key) => { setOverrideView(null); if (key) setSidebarView(key); setLocation(key === 'dashboard' ? '/dashboard/nurse' : `/dashboard/nurse?view=${key}`); }}
              hospitalName={hospitalName}
          />
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
            width={80}
          >
            <NurseSidebar 
              selectedMenuKey={selectedMenuKey}
              onMenuClick={(key) => { setOverrideView(null); if (key) setSidebarView(key); setLocation(key === 'dashboard' ? '/dashboard/nurse' : `/dashboard/nurse?view=${key}`); setMobileDrawerOpen(false); }}
              hospitalName={hospitalName}
          />
        </Drawer>
      )}

        <Layout
          style={{
            marginLeft: isMobile ? 0 : 80, // Narrow sidebar width matching PatientSidebar
            minHeight: '100vh',
            background: nurseTheme.background,
            display: 'flex',
            flexDirection: 'column',
            height: '100vh', // Fixed height to enable scrolling
          }}
        >
          {/* TopHeader - Matching Patient Dashboard Design */}
          <TopHeader
            userName={user?.fullName || 'Nurse'}
            userRole="Nurse"
            userId={nurseUserId}
            userInitials={nurseUserInitials}
            notificationCount={0}
          />

          <Content
            style={{
              background: nurseTheme.background,
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
              margin: 0,
              width: '100%',
            }}
          >
            <div style={{ paddingBottom: 24 }}>
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

          {renderContent()}
            </div>
        </Content>
        </Layout>
      </Layout>

      {/* Vitals Modal - show form when patient selected, or prompt to select when opened from Quick Action */}
      {selectedPatientId ? (
        <VitalsEntryForm
          open={isVitalsModalOpen}
          patientId={selectedPatientId}
          encounterId={selectedEncounterId}
          hospitalId={nurseProfile?.hospitalId}
          onSuccess={() => {
            setIsVitalsModalOpen(false);
            setSelectedEncounterId(undefined);
            setSelectedPatientId(undefined);
            setSelectedPatientName(undefined);
            queryClient.invalidateQueries({ queryKey: ['/api/clinical/vitals'] });
            queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
            message.success('Vitals recorded successfully');
          }}
          onCancel={() => {
            setIsVitalsModalOpen(false);
            setSelectedEncounterId(undefined);
            setSelectedPatientId(undefined);
            setSelectedPatientName(undefined);
          }}
        />
      ) : (
        <Modal
          title="Record Vitals"
          open={isVitalsModalOpen}
          onCancel={() => setIsVitalsModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsVitalsModalOpen(false)}>Close</Button>,
            <Button key="go" type="primary" onClick={() => { setIsVitalsModalOpen(false); setOverrideView(null); setLocation('/dashboard/nurse?view=patients'); }}>
              Go to Patient List
            </Button>,
          ]}
        >
          <p>Select a patient from <strong>My Ward Patients</strong> below and click &quot;Record Vitals&quot; to enter vitals, or go to the Patient List view.</p>
        </Modal>
      )}

      {/* Nursing Notes Modal */}
      {selectedPatientId && selectedEncounterId && (
        <NursingNotesForm
          open={isNotesModalOpen}
          patientId={selectedPatientId}
          encounterId={selectedEncounterId}
          hospitalId={nurseProfile?.hospitalId}
          onSuccess={() => {
            setIsNotesModalOpen(false);
            setSelectedEncounter(null);
            setSelectedEncounterId(undefined);
            setSelectedPatientId(undefined);
            queryClient.invalidateQueries({ queryKey: ['/api/clinical/nursing-notes'] });
            queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
            message.success('Nursing note added successfully');
          }}
          onCancel={() => {
            setIsNotesModalOpen(false);
            setSelectedEncounter(null);
            setSelectedEncounterId(undefined);
            setSelectedPatientId(undefined);
          }}
        />
      )}

      {/* Medications View Modal */}
      <Modal
        title="Patient Medications"
        open={isMedicationsModalOpen}
        onCancel={() => {
          setIsMedicationsModalOpen(false);
          setSelectedEncounter(null);
        }}
        footer={null}
        width={900}
      >
        {selectedEncounter && (
          <div>
            <p>Medication orders for this patient will be displayed here.</p>
            <p>Patient: {selectedEncounter.patientName || 'Unknown'}</p>
            <p>Encounter ID: {selectedEncounter.id}</p>
            {/* TODO: Add medication list component */}
          </div>
        )}
      </Modal>

      {/* Shift Handover Modal */}
      <ShiftHandoverModal
        open={isShiftHandoverModalOpen}
        onCancel={() => setIsShiftHandoverModalOpen(false)}
        onSuccess={() => setIsShiftHandoverModalOpen(false)}
        encounters={ipdEncounters.map((e: any) => ({
          id: e.id,
          patientId: e.patientId,
          patientName: e.patientName || e.patient?.fullName || e.patient?.user?.fullName,
          patient: e.patient,
        }))}
        hospitalId={nurseProfile?.hospitalId}
      />

      {/* Administer Medication Modal - eMAR for selected patient */}
      <Modal
        title={`Administer Medication — ${selectedEncounter?.patientName || 'Patient'}`}
        open={isAdministerModalOpen}
        onCancel={() => {
          setIsAdministerModalOpen(false);
          setSelectedEncounter(null);
        }}
        footer={null}
        width={900}
        destroyOnClose
      >
        {selectedEncounter && (
          <EMAR encounterId={selectedEncounter.id} nurseId={nurseProfile?.id} />
        )}
      </Modal>
    </>
  );
}
