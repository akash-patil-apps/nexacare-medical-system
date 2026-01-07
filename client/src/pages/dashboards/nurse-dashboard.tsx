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
  Divider,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
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
  StethoscopeOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { VitalsEntryForm } from '../../components/clinical/VitalsEntryForm';
import { IpdEncountersList } from '../../components/ipd/IpdEncountersList';
import dayjs from 'dayjs';
import { getISTNow } from '../../lib/timezone';
import { playNotificationSound } from '../../lib/notification-sounds';

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
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>('dashboard');
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedEncounterId, setSelectedEncounterId] = useState<number | undefined>(undefined);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  const [selectedPatientName, setSelectedPatientName] = useState<string | undefined>(undefined);

  // Redirect if not authenticated or not a nurse
  if (!isLoading && (!user || user.role?.toUpperCase() !== 'NURSE')) {
    return <Redirect to="/login" />;
  }

  // Get nurse profile
  const { data: nurseProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/nurses/profile'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
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
      const token = localStorage.getItem('auth-token');
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
      const token = localStorage.getItem('auth-token');
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
      const token = localStorage.getItem('auth-token');
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

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalPatients = ipdEncounters.length;
    const criticalPatients = ipdEncounters.filter((encounter: any) =>
      vitalsHistory.some((vital: any) =>
        vital.patientId === encounter.patientId &&
        (vital.temperature > 38.5 || vital.temperature < 35 ||
         vital.bpSystolic > 180 || vital.bpSystolic < 90 ||
         vital.pulse > 120 || vital.pulse < 50 ||
         vital.respirationRate > 30 || vital.respirationRate < 8)
      )
    ).length;
    const todayVitals = vitalsHistory.filter((vital: any) =>
      dayjs(vital.recordedAt).isSame(dayjs(), 'day')
    ).length;
    const pendingTasks = ipdEncounters.length * 3; // Rough estimate: vitals, meds, notes per patient

    return [
      {
        title: 'My Patients',
        value: totalPatients,
        icon: <TeamOutlined />,
        color: nurseTheme.primary,
        trend: '+2',
        trendLabel: 'this week',
      },
      {
        title: 'Critical Patients',
        value: criticalPatients,
        icon: <HeartOutlined />,
        color: '#EF4444',
        trend: criticalPatients > 0 ? 'Needs attention' : 'All stable',
        trendLabel: '',
      },
      {
        title: 'Vitals Recorded Today',
        value: todayVitals,
        icon: <StethoscopeOutlined />,
        color: nurseTheme.accent,
        trend: '+5',
        trendLabel: 'vs yesterday',
      },
      {
        title: 'Pending Tasks',
        value: pendingTasks,
        icon: <ClockCircleOutlined />,
        color: '#F59E0B',
        trend: 'Update soon',
        trendLabel: '',
      },
    ];
  }, [ipdEncounters, vitalsHistory]);

  // Quick actions for nurses
  const quickActions = [
    {
      title: 'Record Vitals',
      description: 'Take patient vital signs',
      icon: <StethoscopeOutlined />,
      action: () => setIsVitalsModalOpen(true),
      color: nurseTheme.primary,
    },
    {
      title: 'Add Nursing Note',
      description: 'Document patient assessment',
      icon: <FileTextOutlined />,
      action: () => message.info('Nursing notes feature coming soon'),
      color: nurseTheme.accent,
    },
    {
      title: 'Medication Admin',
      description: 'Record medication given',
      icon: <MedicineBoxOutlined />,
      action: () => message.info('Medication administration feature coming soon'),
      color: '#10B981',
    },
    {
      title: 'Shift Handover',
      description: 'Document shift notes',
      icon: <ClockCircleOutlined />,
      action: () => message.info('Shift handover feature coming soon'),
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
      icon: <StethoscopeOutlined />,
      label: 'Vitals History',
    },
    {
      key: 'notes',
      icon: <FileTextOutlined />,
      label: 'Nursing Notes',
    },
  ];

  const renderDashboard = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Welcome Section */}
      <Card
        style={{
          background: `linear-gradient(135deg, ${nurseTheme.primary} 0%, ${nurseTheme.accent} 100%)`,
          color: 'white',
        }}
      >
        <Space direction="vertical" size="small">
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            Welcome back, {nurseProfile?.user?.fullName?.split(' ')[0] || 'Nurse'}
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
            {nurseProfile?.hospital?.name} • {nurseProfile?.shiftType || 'Day'} Shift
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
            {ipdEncounters.length} patients under your care
          </Text>
        </Space>
      </Card>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '16px' }}>
        {kpis.map((kpi, index) => (
          <KpiCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            trend={kpi.trend}
            trendLabel={kpi.trendLabel}
          />
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

      {/* Recent Activity */}
      <Card title="Recent Activity" size="small">
        <List
          size="small"
          dataSource={[
            { time: '2 hours ago', action: 'Recorded vitals for John Doe', type: 'vitals' },
            { time: '4 hours ago', action: 'Administered medication to Jane Smith', type: 'medication' },
            { time: '6 hours ago', action: 'Added assessment note for Bob Johnson', type: 'notes' },
          ]}
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
      </Card>
    </Space>
  );

  const renderPatients = () => (
    <Card title="My Ward Patients" size="small">
      <IpdEncountersList
        encounters={ipdEncounters}
        loading={isLoadingEncounters}
        showDoctorInfo={true}
        onRecordVitals={(encounterId, patientId, patientName) => {
          setSelectedEncounterId(encounterId);
          setSelectedPatientId(patientId);
          setSelectedPatientName(patientName);
          setIsVitalsModalOpen(true);
        }}
        onViewDetails={(encounter) => {
          // Handle patient details view
          message.info('Patient details view coming soon');
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
            dataIndex: 'patientName',
            key: 'patientName',
            render: (name: string) => <Text strong>{name}</Text>,
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
    switch (selectedMenuKey) {
      case 'patients':
        return renderPatients();
      case 'vitals':
        return renderVitals();
      case 'notes':
        return renderNotes();
      default:
        return renderDashboard();
    }
  };

  if (isLoading || isLoadingProfile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: nurseTheme.background }}>
      {/* Sidebar */}
      {!isMobile ? (
        <Sider
          width={280}
          style={{
            background: 'white',
            borderRight: '1px solid #e5e7eb',
            position: 'fixed',
            height: '100vh',
            left: 0,
            top: 0,
            zIndex: 1000,
          }}
        >
          <div style={{ padding: '24px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: nurseTheme.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
              }}>
                👩‍⚕️
              </div>
              <div>
                <Text strong style={{ fontSize: '16px' }}>
                  {nurseProfile?.user?.fullName || 'Nurse'}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {nurseProfile?.hospital?.name || 'Hospital'}
                </Text>
              </div>
            </Space>
          </div>

          <Menu
            mode="inline"
            selectedKeys={[selectedMenuKey]}
            onClick={({ key }) => setSelectedMenuKey(key)}
            style={{ border: 'none', marginTop: 8 }}
            items={menuItems}
          />
        </Sider>
      ) : (
        <Drawer
          title={
            <Space>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: nurseTheme.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
              }}>
                👩‍⚕️
              </div>
              <div>
                <Text strong>{nurseProfile?.user?.fullName || 'Nurse'}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {nurseProfile?.hospital?.name || 'Hospital'}
                </Text>
              </div>
            </Space>
          }
          placement="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          style={{ zIndex: 1000 }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedMenuKey]}
            onClick={({ key }) => {
              setSelectedMenuKey(key);
              setMobileDrawerOpen(false);
            }}
            items={menuItems}
          />
        </Drawer>
      )}

      {/* Main Content */}
      <Layout style={{
        marginLeft: isMobile ? 0 : 280,
        backgroundColor: nurseTheme.background,
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? '16px' : '24px',
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 999,
        }}>
          <Space>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setMobileDrawerOpen(true)}
              />
            )}
            <Title level={4} style={{ margin: 0, color: nurseTheme.primary }}>
              Nurse Station
            </Title>
          </Space>

          <Space>
            <NotificationBell />
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => message.info('Settings coming soon')}
            />
          </Space>
        </div>

        {/* Content */}
        <Content style={{
          padding: isMobile ? '16px' : '24px',
          minHeight: 'calc(100vh - 80px)',
        }}>
          {renderContent()}
        </Content>
      </Layout>

      {/* Vitals Modal */}
      <Modal
        title={
          <Space>
            <StethoscopeOutlined />
            <span>Record Vitals - {selectedPatientName}</span>
          </Space>
        }
        open={isVitalsModalOpen}
        onCancel={() => {
          setIsVitalsModalOpen(false);
          setSelectedEncounterId(undefined);
          setSelectedPatientId(undefined);
          setSelectedPatientName(undefined);
        }}
        footer={null}
        width={700}
      >
        <VitalsEntryForm
          patientId={selectedPatientId}
          encounterId={selectedEncounterId}
          onSuccess={() => {
            setIsVitalsModalOpen(false);
            setSelectedEncounterId(undefined);
            setSelectedPatientId(undefined);
            setSelectedPatientName(undefined);
            queryClient.invalidateQueries({ queryKey: ['/api/clinical/vitals'] });
            message.success('Vitals recorded successfully');
          }}
          onCancel={() => {
            setIsVitalsModalOpen(false);
            setSelectedEncounterId(undefined);
            setSelectedPatientId(undefined);
            setSelectedPatientName(undefined);
          }}
        />
      </Modal>
    </Layout>
  );
}
