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
  MedicineBoxOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  ExperimentOutlined,
  BellOutlined,
  SettingOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  EditOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import dayjs from 'dayjs';
import { getISTNow } from '../../lib/timezone';
import { playNotificationSound } from '../../lib/notification-sounds';
import PendingRadiologyOrders from '../radiology/pending-orders';
import RadiologyReportCreation from '../radiology/report-creation';
import RadiologyReportRelease from '../radiology/report-release';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const radiologyTheme = {
  primary: '#7C3AED',    // Purple for radiology/imaging
  highlight: '#F3E8FF',
  accent: '#8B5CF6',
  background: '#FAF5FF', // Light purple background
};

export default function RadiologyTechnicianDashboard() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>('dashboard');

  // Redirect if not authenticated
  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }

  // Redirect if user doesn't have RADIOLOGY_TECHNICIAN role
  if (!isLoading && user) {
    const userRole = user.role?.toUpperCase();
    if (userRole !== 'RADIOLOGY_TECHNICIAN') {
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
        case 'NURSE':
          return <Redirect to="/dashboard/nurse" />;
        case 'PHARMACIST':
          return <Redirect to="/dashboard/pharmacist" />;
        default:
          return <Redirect to="/login" />;
      }
    }
  }

  // Get radiology technician profile
  const { data: technicianProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/radiology-technicians/profile'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/radiology-technicians/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Radiology technician profile not found. Please complete your registration.');
        }
        throw new Error('Failed to load radiology technician profile');
      }

      return response.json();
    },
    enabled: !!user && user.role?.toUpperCase() === 'RADIOLOGY_TECHNICIAN',
  });

  // Get radiology reports (similar to lab reports API)
  const { data: radiologyReports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ['/api/radiology-technicians/me/reports'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/radiology-technicians/me/reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        // If API not ready, return empty array (like lab dashboard)
        return [];
      }
      const data = await response.json();
      return data;
    },
    enabled: !!technicianProfile,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Use radiology reports as imaging orders for now (same structure as lab)
  const imagingOrders = radiologyReports;
  const isLoadingOrders = isLoadingReports;

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalOrders = imagingOrders.length;
    const pendingOrders = imagingOrders.filter((o: any) => o.status === 'pending').length;
    const completedToday = imagingOrders.filter((o: any) =>
      dayjs(o.scheduledDate).isSame(dayjs(), 'day') && o.status === 'completed'
    ).length;
    const urgentOrders = imagingOrders.filter((o: any) => o.priority === 'urgent').length;

    return [
      {
        title: 'Pending Orders',
        value: pendingOrders,
        icon: <ExperimentOutlined />,
        color: radiologyTheme.primary,
        trend: '+1',
        trendLabel: 'new today',
      },
      {
        title: 'Completed Today',
        value: completedToday,
        icon: <CheckCircleOutlined />,
        color: '#059669',
        trend: '+3',
        trendLabel: 'vs yesterday',
      },
      {
        title: 'Total Orders',
        value: totalOrders,
        icon: <CameraOutlined />,
        color: radiologyTheme.accent,
        trend: '+8',
        trendLabel: 'this week',
      },
      {
        title: 'Urgent Cases',
        value: urgentOrders,
        icon: <BellOutlined />,
        color: '#EF4444',
        trend: urgentOrders > 0 ? 'Needs attention' : 'All routine',
        trendLabel: '',
      },
    ];
  }, [imagingOrders]);

  // Quick actions for radiology technicians
  const quickActions = [
    {
      title: 'New Imaging',
      description: 'Perform imaging procedure',
      icon: <ExperimentOutlined />,
      action: () => message.info('Imaging procedure feature coming soon'),
      color: radiologyTheme.primary,
    },
    {
      title: 'Upload Images',
      description: 'Upload scan results',
      icon: <CameraOutlined />,
      action: () => message.info('Image upload feature coming soon'),
      color: radiologyTheme.accent,
    },
    {
      title: 'Equipment Status',
      description: 'Check machine availability',
      icon: <ExperimentOutlined />,
      action: () => message.info('Equipment status feature coming soon'),
      color: '#059669',
    },
    {
      title: 'Schedule Orders',
      description: 'Manage imaging schedule',
      icon: <FileTextOutlined />,
      action: () => message.info('Scheduling feature coming soon'),
      color: '#8B5CF6',
    },
  ];

  const menuItems = [
    {
      key: 'dashboard',
      icon: <UserOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'pending-orders',
      icon: <CameraOutlined />,
      label: 'Pending Orders',
    },
    {
      key: 'report-creation',
      icon: <FileTextOutlined />,
      label: 'Report Creation',
    },
    {
      key: 'report-release',
      icon: <CheckCircleOutlined />,
      label: 'Report Release',
    },
    {
      key: 'orders',
      icon: <ExperimentOutlined />,
      label: 'All Orders',
    },
    {
      key: 'schedule',
      icon: <FileTextOutlined />,
      label: 'Schedule',
    },
    {
      key: 'equipment',
      icon: <ExperimentOutlined />,
      label: 'Equipment',
    },
  ];

  const renderDashboard = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Welcome Section */}
      <Card
        style={{
          background: `linear-gradient(135deg, ${radiologyTheme.primary} 0%, ${radiologyTheme.accent} 100%)`,
          color: 'white',
        }}
      >
        <Space direction="vertical" size="small">
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            Welcome back, {technicianProfile?.user?.fullName?.split(' ')[0] || 'Technician'}
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
            {technicianProfile?.hospital?.name} • Radiology Department
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
            {imagingOrders.filter((o: any) => o.status === 'pending').length} imaging orders pending
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
      <Card title="Recent Imaging Activity" size="small">
        <List
          size="small"
          dataSource={[
            { time: '1 hour ago', action: 'Completed Chest X-Ray for Rajesh Kumar', type: 'completed' },
            { time: '3 hours ago', action: 'Scheduled CT Scan for Meera Jain', type: 'scheduled' },
            { time: '5 hours ago', action: 'Calibrated MRI machine', type: 'maintenance' },
          ]}
          renderItem={(item: any) => (
            <List.Item>
              <Space>
                <Tag color={
                  item.type === 'completed' ? 'green' :
                  item.type === 'scheduled' ? 'blue' :
                  item.type === 'maintenance' ? 'orange' : 'default'
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

  const renderOrders = () => (
    <Card title="Imaging Orders Queue" size="small">
      <Table
        dataSource={imagingOrders}
        columns={[
          {
            title: 'Patient',
            dataIndex: 'patientName',
            key: 'patientName',
            render: (name: string) => <Text strong>{name}</Text>,
          },
          {
            title: 'Doctor',
            dataIndex: 'doctorName',
            key: 'doctorName',
            render: (name: string) => <Text>{name}</Text>,
          },
          {
            title: 'Modality',
            dataIndex: 'modality',
            key: 'modality',
            render: (modality: string) => (
              <Tag color={
                modality === 'X-Ray' ? 'blue' :
                modality === 'CT Scan' ? 'purple' :
                modality === 'MRI' ? 'green' :
                modality === 'Ultrasound' ? 'cyan' : 'default'
              }>
                {modality}
              </Tag>
            ),
          },
          {
            title: 'Body Part',
            dataIndex: 'bodyPart',
            key: 'bodyPart',
            render: (part: string) => <Text>{part}</Text>,
          },
          {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            render: (priority: string) => (
              <Tag color={priority === 'urgent' ? 'red' : 'orange'}>
                {priority.toUpperCase()}
              </Tag>
            ),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
              <Tag color={
                status === 'completed' ? 'green' :
                status === 'scheduled' ? 'blue' :
                status === 'pending' ? 'orange' : 'default'
              }>
                {status.toUpperCase()}
              </Tag>
            ),
          },
          {
            title: 'Scheduled',
            dataIndex: 'scheduledDate',
            key: 'scheduledDate',
            render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record: any) => (
              <Space>
                {record.status === 'pending' && (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => message.info('Start imaging feature coming soon')}
                  >
                    Start
                  </Button>
                )}
                {record.status === 'scheduled' && (
                  <Button
                    type="default"
                    size="small"
                    onClick={() => message.info('Perform imaging feature coming soon')}
                  >
                    Perform
                  </Button>
                )}
                <Button size="small">View Details</Button>
              </Space>
            ),
          },
        ]}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </Card>
  );

  const renderSchedule = () => (
    <Card title="Imaging Schedule" size="small">
      <Alert
        message="Schedule Management"
        description="Daily imaging schedules, room bookings, and technician assignments will be available here."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
        <Card size="small" title="Today's Schedule">
          <Space direction="vertical">
            <Text>Morning: <strong>8:00 AM - 12:00 PM</strong></Text>
            <Text>Afternoon: <strong>1:00 PM - 5:00 PM</strong></Text>
            <Text>Room 1: X-Ray (occupied)</Text>
            <Text>Room 2: Ultrasound (available)</Text>
          </Space>
        </Card>

        <Card size="small" title="Equipment Status">
          <Space direction="vertical">
            <Text>X-Ray Machine: <Tag color="green">Available</Tag></Text>
            <Text>CT Scanner: <Tag color="orange">In Use</Tag></Text>
            <Text>MRI Machine: <Tag color="red">Maintenance</Tag></Text>
            <Text>Ultrasound: <Tag color="green">Available</Tag></Text>
          </Space>
        </Card>

        <Card size="small" title="Workload">
          <Space direction="vertical">
            <Text>Pending Orders: <strong>12</strong></Text>
            <Text>Scheduled Today: <strong>8</strong></Text>
            <Text>Completed Today: <strong>5</strong></Text>
            <Text>Avg. Procedure Time: <strong>45 min</strong></Text>
          </Space>
        </Card>
      </div>
    </Card>
  );

  const renderEquipment = () => (
    <Card title="Equipment Management" size="small">
      <Alert
        message="Equipment Tracking"
        description="Monitor equipment status, maintenance schedules, and calibration records."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Table
        dataSource={[
          { id: 1, name: 'Siemens X-Ray Machine', room: 'Room 1', status: 'available', lastMaintenance: '2025-01-15' },
          { id: 2, name: 'GE CT Scanner', room: 'Room 2', status: 'in_use', lastMaintenance: '2025-01-10' },
          { id: 3, name: 'Philips MRI', room: 'Room 3', status: 'maintenance', lastMaintenance: '2025-01-20' },
          { id: 4, name: 'Samsung Ultrasound', room: 'Room 4', status: 'available', lastMaintenance: '2025-01-18' },
        ]}
        columns={[
          {
            title: 'Equipment',
            dataIndex: 'name',
            key: 'name',
            render: (name: string) => <Text strong>{name}</Text>,
          },
          {
            title: 'Room',
            dataIndex: 'room',
            key: 'room',
            render: (room: string) => <Text>{room}</Text>,
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
              <Tag color={
                status === 'available' ? 'green' :
                status === 'in_use' ? 'blue' :
                status === 'maintenance' ? 'red' : 'default'
              }>
                {status.replace('_', ' ').toUpperCase()}
              </Tag>
            ),
          },
          {
            title: 'Last Maintenance',
            dataIndex: 'lastMaintenance',
            key: 'lastMaintenance',
            render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record: any) => (
              <Space>
                <Button size="small">View Details</Button>
                {record.status === 'maintenance' && (
                  <Button size="small" type="primary">Complete</Button>
                )}
              </Space>
            ),
          },
        ]}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </Card>
  );

  const renderContent = () => {
    switch (selectedMenuKey) {
      case 'pending-orders':
        return <PendingRadiologyOrders />;
      case 'report-creation':
        return <RadiologyReportCreation />;
      case 'report-release':
        return <RadiologyReportRelease />;
      case 'orders':
        return renderOrders();
      case 'schedule':
        return renderSchedule();
      case 'equipment':
        return renderEquipment();
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
    <Layout style={{ minHeight: '100vh', backgroundColor: radiologyTheme.background }}>
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
                backgroundColor: radiologyTheme.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
              }}>
                🩻
              </div>
              <div>
                <Text strong style={{ fontSize: '16px' }}>
                  {technicianProfile?.user?.fullName || 'Radiology Technician'}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {technicianProfile?.hospital?.name || 'Hospital'}
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
                backgroundColor: radiologyTheme.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
              }}>
                🩻
              </div>
              <div>
                <Text strong>{technicianProfile?.user?.fullName || 'Radiology Technician'}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {technicianProfile?.hospital?.name || 'Hospital'}
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
        backgroundColor: radiologyTheme.background,
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
            <Title level={4} style={{ margin: 0, color: radiologyTheme.primary }}>
              Radiology Dashboard
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
    </Layout>
  );
}
