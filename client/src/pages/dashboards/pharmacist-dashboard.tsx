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
  Row,
  Col,
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
  ShoppingCartOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { TopHeader } from '../../components/layout/TopHeader';
import { PharmacistSidebar } from '../../components/layout/PharmacistSidebar';
import PharmacyInventory from '../pharmacy/inventory';
import PharmacyDispensing from '../pharmacy/dispensing';
import PurchaseOrders from '../pharmacy/purchase-orders';
import Suppliers from '../pharmacy/suppliers';
import StockMovements from '../pharmacy/stock-movements';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getISTNow } from '../../lib/timezone';
import { playNotificationSound } from '../../lib/notification-sounds';
import { getShownNotificationIds, markNotificationAsShown } from '../../lib/notification-shown-storage';

dayjs.extend(relativeTime);

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const pharmacistTheme = {
  primary: '#10B981',    // Green for pharmacy/healthcare
  highlight: '#ECFDF5',
  accent: '#059669',
  background: '#F0FDF4', // Light green background
};

export default function PharmacistDashboard() {
  const { user, isLoading } = useAuth();
  const { notification: notificationApi } = App.useApp();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const urlView = useMemo(() => {
    const search = location.includes('?') ? location.split('?')[1] || '' : '';
    let view = new URLSearchParams(search).get('view');
    if (view && ['dashboard', 'prescriptions', 'dispensing', 'inventory', 'reports'].includes(view)) return view;
    if (typeof window !== 'undefined') {
      view = new URLSearchParams(window.location.search).get('view');
      if (view && ['dashboard', 'prescriptions', 'dispensing', 'inventory', 'reports'].includes(view)) return view;
    }
    return 'dashboard';
  }, [location]);
  const [sidebarView, setSidebarView] = useState<string | null>(null);
  const selectedMenuKey = sidebarView ?? urlView;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname;
    const search = window.location.search || '';
    if (!pathname.startsWith('/dashboard/pharmacist')) return;
    const fullUrl = pathname + search;
    if (search && fullUrl !== location) setLocation(fullUrl);
    const view = new URLSearchParams(search).get('view');
    if (view && ['dashboard', 'prescriptions', 'dispensing', 'inventory', 'reports'].includes(view)) setSidebarView(view);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to sync URL
  }, []);
  const [nonConsultingDispenseModalOpen, setNonConsultingDispenseModalOpen] = useState(false);
  const [nonConsultingDispenseForm] = Form.useForm();
  const previousPrescriptionCountRef = useRef<number>(0);

  // Get pharmacist profile
  const { data: pharmacistProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/pharmacists/profile'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/pharmacists/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Pharmacist profile not found. Please complete your registration.');
        }
        throw new Error('Failed to load pharmacist profile');
      }

      return response.json();
    },
    enabled: !!user && user?.role?.toUpperCase() === 'PHARMACIST',
  });

  // Get notifications for pharmacist
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

  // Get prescriptions for dispensing (real data) - with real-time polling
  const { data: prescriptions = [], isLoading: isLoadingPrescriptions, refetch: refetchPrescriptions } = useQuery({
    queryKey: ['/api/prescriptions', 'pharmacist'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/prescriptions/pharmacist', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If API not ready, return empty array
        return [];
      }

      return response.json();
    },
    enabled: !!pharmacistProfile,
    refetchInterval: 10000, // Poll every 10 seconds for new prescriptions
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  // Get hospital name from pharmacist profile
  const hospitalName = useMemo(() => {
    if (pharmacistProfile?.hospitalName) {
      return pharmacistProfile.hospitalName;
    }
    if (pharmacistProfile?.hospital?.name) {
      return pharmacistProfile.hospital.name;
    }
    return null;
  }, [pharmacistProfile?.hospitalName, pharmacistProfile?.hospital?.name]);

  // Calculate KPIs from real data
  const kpis = useMemo(() => {
    const totalPrescriptions = prescriptions.length;
    const pendingPrescriptions = prescriptions.filter((p: any) => 
      p.status === 'pending' || p.status === 'ready_for_dispensing'
    ).length;
    
    const today = dayjs().startOf('day');
    const dispensedToday = prescriptions.filter((p: any) =>
      p.status === 'dispensed' && dayjs(p.dispensedAt || p.updatedAt).isSame(today, 'day')
    ).length;
    
    const yesterday = dayjs().subtract(1, 'day').startOf('day');
    const dispensedYesterday = prescriptions.filter((p: any) =>
      p.status === 'dispensed' && dayjs(p.dispensedAt || p.updatedAt).isSame(yesterday, 'day')
    ).length;
    
    const dispensedDiff = dispensedToday - dispensedYesterday;
    const dispensedBadgeText = dispensedDiff > 0 ? `+${dispensedDiff} vs yesterday` : dispensedDiff < 0 ? `${dispensedDiff} vs yesterday` : 'Same as yesterday';
    
    // Get low stock alerts from inventory (if available)
    const lowStockAlerts = 0; // TODO: Fetch from inventory API when available

    return [
      {
        label: 'Pending Prescriptions',
        value: pendingPrescriptions,
        icon: <MedicineBoxOutlined style={{ fontSize: 24, color: '#10B981' }} />,
        badgeText: pendingPrescriptions > 0 ? `${pendingPrescriptions} waiting` : 'All clear',
        color: 'green' as const,
      },
      {
        label: 'Dispensed Today',
        value: dispensedToday,
        icon: <CheckCircleOutlined style={{ fontSize: 24, color: '#059669' }} />,
        badgeText: dispensedBadgeText,
        color: 'green' as const,
      },
      {
        label: 'Total Prescriptions',
        value: totalPrescriptions,
        icon: <ShoppingCartOutlined style={{ fontSize: 24, color: '#10B981' }} />,
        badgeText: totalPrescriptions > 0 ? `${totalPrescriptions} total` : 'No prescriptions',
        color: 'green' as const,
      },
      {
        label: 'Low Stock Alerts',
        value: lowStockAlerts,
        icon: <ExperimentOutlined style={{ fontSize: 24, color: '#EF4444' }} />,
        badgeText: lowStockAlerts > 0 ? 'Needs attention' : 'Stock OK',
        color: 'orange' as const,
      },
    ];
  }, [prescriptions]);

  // Compute user ID and initials for TopHeader
  const userId = useMemo(() => {
    if (user?.id) {
      const year = new Date().getFullYear();
      const idNum = String(user.id).padStart(3, '0');
      return `PHA-${year}-${idNum}`;
    }
    return 'PHA-2024-001';
  }, [user?.id]);

  const userInitials = useMemo(() => {
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.fullName.substring(0, 2).toUpperCase();
    }
    return 'PH';
  }, [user?.fullName]);

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
      else if (type.includes('confirm') || type.includes('complete') || type.includes('ready') || type.includes('prescription')) notificationType = 'success';
      else if (type.includes('pending') || type.includes('resched') || type.includes('processing')) notificationType = 'warning';

      if (type.includes('prescription')) {
        playNotificationSound('prescription');
        refetchPrescriptions();
      }

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
          if (type.includes('prescription')) {
            (setSidebarView('dispensing'), setLocation('/dashboard/pharmacist?view=dispensing'));
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
  }, [notifications, notificationApi, queryClient, refetchPrescriptions, user?.id]);

  // Redirect if not authenticated
  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }

  // Redirect if user doesn't have PHARMACIST role
  if (!isLoading && user) {
    const userRole = user.role?.toUpperCase();
    if (userRole !== 'PHARMACIST') {
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
        case 'RADIOLOGY_TECHNICIAN':
          return <Redirect to="/dashboard/radiology-technician" />;
        default:
          return <Redirect to="/login" />;
      }
    }
  }

  // Listen for new prescriptions and show notifications
  useEffect(() => {
    if (prescriptions.length > previousPrescriptionCountRef.current) {
      const newCount = prescriptions.length - previousPrescriptionCountRef.current;
      if (newCount > 0) {
        // Play notification sound
        playNotificationSound('prescription');
        
        // Show notification
        notificationApi.success({
          message: 'New Prescription Available',
          description: `${newCount} new prescription${newCount > 1 ? 's' : ''} ${newCount > 1 ? 'are' : 'is'} ready for dispensing.`,
          placement: 'topRight',
          duration: 5,
        });
      }
    }
    previousPrescriptionCountRef.current = prescriptions.length;
  }, [prescriptions.length, notificationApi]);

  // Quick actions for pharmacists
  const quickActions = [
    {
      title: 'Dispense Medicine',
      description: 'Process prescription dispensing',
      icon: <MedicineBoxOutlined />,
      action: () => (setSidebarView('dispensing'), setLocation('/dashboard/pharmacist?view=dispensing')),
      color: pharmacistTheme.primary,
    },
    {
      title: 'Non-Consulting Patient',
      description: 'Dispense medicine without prescription',
      icon: <PlusOutlined />,
      action: () => setNonConsultingDispenseModalOpen(true),
      color: '#3B82F6',
    },
    {
      title: 'Check Inventory',
      description: 'View medicine stock levels',
      icon: <ShoppingCartOutlined />,
      action: () => { setSidebarView('inventory'); setLocation('/dashboard/pharmacist?view=inventory'); },
      color: pharmacistTheme.accent,
    },
    {
      title: 'Patient Counseling',
      description: 'Record medication counseling',
      icon: <FileTextOutlined />,
      action: () => {
        setSidebarView('prescriptions');
        setLocation('/dashboard/pharmacist?view=prescriptions');
        message.info('Complete counseling when dispensing from the Prescriptions queue');
      },
      color: '#059669',
    },
    {
      title: 'Stock Alerts',
      description: 'Manage low stock notifications',
      icon: <BellOutlined />,
      action: () => {
        setSidebarView('inventory');
        setLocation('/dashboard/pharmacist?view=inventory');
        message.info('Check Inventory for current stock levels and low-stock items');
      },
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
      key: 'prescriptions',
      icon: <MedicineBoxOutlined />,
      label: 'Prescriptions',
    },
    {
      key: 'inventory',
      icon: <ShoppingCartOutlined />,
      label: 'Inventory',
    },
    {
      key: 'dispensing',
      icon: <CheckCircleOutlined />,
      label: 'Dispensing',
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
  ];

  const renderDashboard = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
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

      {/* Recent Activity - Real Data */}
      <Card title="Recent Dispensing Activity" size="small">
        {prescriptions.filter((p: any) => p.status === 'dispensed').length === 0 ? (
          <Alert
            message="No recent activity"
            description="Your recent prescription dispensing activities will appear here."
            type="info"
            showIcon
          />
        ) : (
          <List
            size="small"
            dataSource={prescriptions
              .filter((p: any) => p.status === 'dispensed')
              .slice(0, 5)
              .map((prescription: any) => ({
                time: dayjs(prescription.dispensedAt || prescription.updatedAt).fromNow(),
                action: `Dispensed ${prescription.medicines?.join(', ') || 'medication'} to ${prescription.patientName || 'Patient'}`,
                type: 'dispensed',
                date: prescription.dispensedAt || prescription.updatedAt,
              }))
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            }
            renderItem={(item: any) => (
              <List.Item>
                <Space>
                  <Tag color={
                    item.type === 'dispensed' ? 'green' :
                    item.type === 'inventory' ? 'blue' :
                    item.type === 'counseling' ? 'purple' : 'default'
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

  const renderPrescriptions = () => (
    <Card title="Prescription Queue" size="small">
      <Table
        dataSource={prescriptions}
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
            title: 'Medicines',
            dataIndex: 'medicines',
            key: 'medicines',
            render: (medicines: string[]) => (
              <div>
                {medicines.map((med, index) => (
                  <Tag key={index} color="blue">{med}</Tag>
                ))}
              </div>
            ),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
              <Tag color={status === 'pending' ? 'orange' : 'green'}>
                {status.toUpperCase()}
              </Tag>
            ),
          },
          {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record: any) => (
              <Space>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    setSidebarView('dispensing');
                    setLocation('/dashboard/pharmacist?view=dispensing');
                  }}
                >
                  Dispense
                </Button>
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

  const renderInventory = () => (
    <Tabs
      defaultActiveKey="inventory"
      items={[
        {
          key: 'inventory',
          label: 'Inventory',
          children: <PharmacyInventory />,
        },
        {
          key: 'purchase-orders',
          label: 'Purchase Orders',
          children: <PurchaseOrders />,
        },
        {
          key: 'suppliers',
          label: 'Suppliers',
          children: <Suppliers />,
        },
        {
          key: 'stock-movements',
          label: 'Stock Movements',
          children: <StockMovements />,
        },
      ]}
    />
  );

  const renderReports = () => (
    <Card title="Pharmacy Reports" size="small">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="Reporting Features"
          description="Daily dispensing reports, inventory reports, and prescription analytics will be available here."
          type="info"
          showIcon
        />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px' }}>
          <Card size="small" title="Today's Summary">
            <Space direction="vertical">
              <Text>Total Prescriptions: <strong>24</strong></Text>
              <Text>Dispensed: <strong>22</strong></Text>
              <Text>Pending: <strong>2</strong></Text>
              <Text>Revenue: <strong>₹12,450</strong></Text>
            </Space>
          </Card>

          <Card size="small" title="Weekly Trends">
            <Space direction="vertical">
              <Text>This Week: <strong>156 prescriptions</strong></Text>
              <Text>Last Week: <strong>142 prescriptions</strong></Text>
              <Text>Growth: <strong>+10%</strong></Text>
              <Text>Revenue: <strong>₹78,250</strong></Text>
            </Space>
          </Card>
        </div>
      </Space>
    </Card>
  );

  const renderContent = () => {
    switch (selectedMenuKey) {
      case 'prescriptions':
        return renderPrescriptions();
      case 'inventory':
        return renderInventory();
      case 'dispensing':
        return <PharmacyDispensing />;
      case 'reports':
        return renderReports();
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
    <>
      <style>{`
        /* Figma Design - Menu Styling for Pharmacist Dashboard */
        .pharmacist-dashboard-menu .ant-menu-item {
          border-radius: 8px !important;
          margin: 2px 0 !important;
          height: auto !important;
          line-height: 1.5 !important;
          transition: all 0.2s ease !important;
          padding: 10px 12px !important;
          background: transparent !important;
          border: none !important;
        }
        .pharmacist-dashboard-menu .ant-menu-item:hover {
          background: #F9FAFB !important;
        }
        .pharmacist-dashboard-menu .ant-menu-item:hover,
        .pharmacist-dashboard-menu .ant-menu-item:hover .ant-menu-title-content {
          color: #111827 !important;
        }
        .pharmacist-dashboard-menu .ant-menu-item:hover .ant-menu-item-icon,
        .pharmacist-dashboard-menu .ant-menu-item:hover .anticon {
          color: #111827 !important;
        }
        .pharmacist-dashboard-menu .ant-menu-item-selected {
          background: #ECFDF5 !important;
          font-weight: 500 !important;
          border: none !important;
          padding: 10px 12px !important;
        }
        .pharmacist-dashboard-menu .ant-menu-item-selected,
        .pharmacist-dashboard-menu .ant-menu-item-selected .ant-menu-title-content {
          color: #10B981 !important;
        }
        .pharmacist-dashboard-menu .ant-menu-item-selected .ant-menu-item-icon,
        .pharmacist-dashboard-menu .ant-menu-item-selected .anticon {
          color: #10B981 !important;
        }
        .pharmacist-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) {
          color: #374151 !important;
          background: transparent !important;
        }
        .pharmacist-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-title-content {
          color: #374151 !important;
        }
        .pharmacist-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-item-icon,
        .pharmacist-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .anticon {
          color: #374151 !important;
        }
        .pharmacist-dashboard-menu .ant-menu-item-selected::after {
          display: none !important;
        }
        .pharmacist-dashboard-menu .ant-menu-item-icon,
        .pharmacist-dashboard-menu .anticon {
          font-size: 20px !important;
          width: 20px !important;
          height: 20px !important;
        }
      `}</style>
      <div className="pharmacist-dashboard-wrapper">
      <Layout style={{ minHeight: '100vh', backgroundColor: pharmacistTheme.background }}>
      {/* Sidebar */}
      {!isMobile ? (
        <Sider
          width={80}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            background: '#fff',
            boxShadow: '0 2px 16px rgba(16, 185, 129, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            borderRight: '1px solid #E5E7EB',
          }}
        >
          <PharmacistSidebar 
            selectedMenuKey={selectedMenuKey}
            onMenuClick={(key) => {
              if (key) setSidebarView(key);
              setLocation(key === 'dashboard' ? '/dashboard/pharmacist' : `/dashboard/pharmacist?view=${key}`);
            }}
            hospitalName={hospitalName}
          />
        </Sider>
      ) : (
        <Drawer
          title="Navigation"
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          bodyStyle={{ padding: 0 }}
          width={80}
        >
          <PharmacistSidebar 
            selectedMenuKey={selectedMenuKey}
            onMenuClick={(key) => {
              if (key) setSidebarView(key);
              setLocation(key === 'dashboard' ? '/dashboard/pharmacist' : `/dashboard/pharmacist?view=${key}`);
              setMobileDrawerOpen(false);
            }}
            hospitalName={hospitalName}
          />
        </Drawer>
      )}

      {/* Main Content */}
      <Layout style={{
        marginLeft: isMobile ? 0 : 80, // Narrow sidebar width matching PatientSidebar
        minHeight: '100vh',
        background: pharmacistTheme.background,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh', // Fixed height to enable scrolling
      }}>
        {/* TopHeader - Matching Patient Dashboard Design */}
        <TopHeader
          userName={user?.fullName || 'Pharmacist'}
          userRole="Pharmacist"
          userId={userId}
          userInitials={userInitials}
          notificationCount={0}
        />

        <Content style={{
          background: pharmacistTheme.background,
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0, // Important for flex scrolling
          margin: 0,
          width: '100%',
        }}>
          <div style={{
            // Responsive padding - reduced to save side space
            padding: isMobile 
              ? '12px 12px 16px'  // Mobile: smaller side padding
              : isTablet 
                ? '12px 16px 20px'  // Tablet: medium side padding
                : '12px 16px 20px', // Desktop: reduced padding
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

            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>

    {/* Non-Consulting Patient Dispense Modal */}
    <Modal
      title="Dispense Medicine for Non-Consulting Patient"
      open={nonConsultingDispenseModalOpen}
      onCancel={() => {
        setNonConsultingDispenseModalOpen(false);
        nonConsultingDispenseForm.resetFields();
      }}
      footer={null}
      width={800}
    >
      <NonConsultingDispenseForm
        form={nonConsultingDispenseForm}
        pharmacistProfile={pharmacistProfile}
        onCancel={() => {
          setNonConsultingDispenseModalOpen(false);
          nonConsultingDispenseForm.resetFields();
        }}
        onSuccess={() => {
          setNonConsultingDispenseModalOpen(false);
          nonConsultingDispenseForm.resetFields();
          queryClient.invalidateQueries({ queryKey: ['/api/prescriptions', 'pharmacist'] });
          queryClient.invalidateQueries({ queryKey: ['/api/pharmacy/dispensing'] });
          queryClient.invalidateQueries({ queryKey: ['/api/pharmacy/inventory'] });
        }}
      />
    </Modal>
    </div>
    </>
  );
}

// Fuzzy matching function for medicine search (same as prescription form)
function fuzzyMatch(searchTerm: string, target: string): boolean {
  if (!searchTerm || !target) return false;
  const search = searchTerm.toLowerCase();
  const text = target.toLowerCase();
  let searchIndex = 0;
  let textIndex = 0;
  while (searchIndex < search.length && textIndex < text.length) {
    if (search[searchIndex] === text[textIndex]) {
      searchIndex++;
    }
    textIndex++;
  }
  return searchIndex === search.length;
}

// Non-Consulting Patient Dispense Form Component
function NonConsultingDispenseForm({ 
  form, 
  pharmacistProfile, 
  onSuccess,
  onCancel
}: { 
  form: any; 
  pharmacistProfile: any; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [selectedMedicines, setSelectedMedicines] = useState<Array<{
    medicineId: number;
    medicineName: string;
    inventoryId: number | null;
    quantity: number;
    availableStock: number;
    unit: string;
    frequency?: string;
  }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMedicine, setCurrentMedicine] = useState<{
    medicineId: number | null;
    medicineName: string;
    inventoryId: number | null;
    quantity: number;
    frequency: string;
  }>({
    medicineId: null,
    medicineName: '',
    inventoryId: null,
    quantity: 1,
    frequency: '',
  });
  const [patientSearchMobile, setPatientSearchMobile] = useState('');
  const [searchedPatient, setSearchedPatient] = useState<any>(null);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);

  // Fetch medicines catalog (like doctors do)
  const { data: medicinesData = [], isLoading: isLoadingMedicines } = useQuery({
    queryKey: ['/api/medicines'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/medicines', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) return [];
      const data = await response.json();
      const medicines = Array.isArray(data) ? data : (data?.medicines || []);
      return medicines.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    },
  });

  // Fetch inventory
  const { data: inventory = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ['/api/pharmacy/inventory'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/pharmacy/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Get available inventory for selected medicine
  const availableInventoryForMedicine = useMemo(() => {
    if (!currentMedicine.medicineId) return [];
    const selectedMed = medicinesData.find((m: any) => m.id === currentMedicine.medicineId);
    if (!selectedMed) return [];
    
    // Inventory API returns flat structure: { ...inventoryFields, medicine: {...}, isExpired, etc }
    // Match by medicineCatalogId (from inventory) with medicine.id (from catalog)
    return inventory.filter((inv: any) => {
      // The inventory has medicineCatalogId field directly
      const medicineCatalogId = inv.medicineCatalogId;
      const stockQty = inv.quantity || 0;
      
      // Match medicine by ID
      const matches = medicineCatalogId === selectedMed.id;
      
      return matches && stockQty > 0;
    });
  }, [currentMedicine.medicineId, inventory, medicinesData]);

  const handleAddMedicine = () => {
    if (!currentMedicine.medicineId || !currentMedicine.medicineName) {
      message.error('Please select a medicine');
      return;
    }
    if (!currentMedicine.inventoryId) {
      message.error('Please select inventory for the medicine');
      return;
    }
    if (currentMedicine.quantity <= 0) {
      message.error('Please enter a valid quantity');
      return;
    }

    const selectedInv = availableInventoryForMedicine.find((inv: any) => inv.id === currentMedicine.inventoryId);
    if (!selectedInv) {
      message.error('Selected inventory not found');
      return;
    }

    const maxStock = selectedInv.quantity || 0;
    if (currentMedicine.quantity > maxStock) {
      message.error(`Quantity cannot exceed available stock (${maxStock})`);
      return;
    }

    setSelectedMedicines([...selectedMedicines, {
      medicineId: currentMedicine.medicineId,
      medicineName: currentMedicine.medicineName,
      inventoryId: currentMedicine.inventoryId,
      quantity: currentMedicine.quantity,
      availableStock: selectedInv.quantity || 0,
      unit: selectedInv.unit || '',
      frequency: currentMedicine.frequency || '',
    }]);

    // Reset current medicine
    setCurrentMedicine({
      medicineId: null,
      medicineName: '',
      inventoryId: null,
      quantity: 1,
      frequency: '',
    });
    message.success('Medicine added');
  };

  const handleRemoveMedicine = (index: number) => {
    setSelectedMedicines(selectedMedicines.filter((_, i) => i !== index));
  };

  const handleMedicineSelect = (medicineName: string) => {
    const medicine = medicinesData.find((m: any) => m.name === medicineName);
    if (medicine) {
      setCurrentMedicine({
        ...currentMedicine,
        medicineId: medicine.id,
        medicineName: medicine.name,
        inventoryId: null, // Reset inventory when medicine changes
      });
    }
  };

  // Search patient by mobile number only
  const handleSearchPatient = async () => {
    if (!patientSearchMobile || patientSearchMobile.length !== 10) {
      message.warning('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSearchingPatient(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/reception/patients/lookup?mobile=${patientSearchMobile}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.patient) {
          // Patient found in database - use their data
          setSearchedPatient({
            name: data.user.fullName,
            mobile: data.user.mobileNumber,
          });
          form.setFieldsValue({
            patientName: data.user.fullName,
            mobileNumber: data.user.mobileNumber,
          });
          message.success(`Patient found: ${data.user.fullName}`);
        } else if (data.user && !data.patient) {
          // User exists but no patient profile - allow manual entry
          setSearchedPatient(null);
          form.setFieldsValue({
            mobileNumber: patientSearchMobile,
            patientName: data.user.fullName || '', // Pre-fill name if available
          });
          message.info('User found but no patient profile. Please enter patient name.');
        } else {
          // Patient not found in database - allow manual entry (non-consulting patient)
          setSearchedPatient(null);
          form.setFieldsValue({
            mobileNumber: patientSearchMobile,
            patientName: '', // Clear name so user can enter manually
          });
          message.info('Patient not registered. Please enter patient name manually.');
        }
      } else {
        // API error - allow manual entry
        setSearchedPatient(null);
        form.setFieldsValue({
          mobileNumber: patientSearchMobile,
          patientName: '', // Clear name so user can enter manually
        });
        message.info('Patient not registered. Please enter patient name manually.');
      }
    } catch (error: any) {
      console.error('Error searching patient:', error);
      // On error, allow manual entry
      setSearchedPatient(null);
      form.setFieldsValue({
        mobileNumber: patientSearchMobile,
        patientName: '', // Clear name so user can enter manually
      });
      message.info('Could not search patient. Please enter details manually.');
    } finally {
      setIsSearchingPatient(false);
    }
  };


  // Reset patient search when canceling
  const handleCancel = () => {
    setPatientSearchMobile('');
    setSearchedPatient(null);
    form.resetFields();
    onCancel();
  };

  const handleSubmit = async (values: any) => {
    if (!values.patientName || !values.mobileNumber) {
      message.error('Please enter patient name and mobile number');
      return;
    }

    if (selectedMedicines.length === 0) {
      message.error('Please add at least one medicine');
      return;
    }

    if (selectedMedicines.some(m => !m.inventoryId || m.quantity <= 0)) {
      message.error('Please select inventory and quantity for all medicines');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/pharmacy/dispensing/non-consulting', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientName: values.patientName,
          mobileNumber: values.mobileNumber,
          hospitalId: pharmacistProfile?.hospitalId,
          items: selectedMedicines.map(m => ({
            inventoryId: m.inventoryId,
            quantity: m.quantity,
            medicineName: m.medicineName,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to dispense medicine');
      }

      message.success('Medicine dispensed successfully');
      setSelectedMedicines([]);
      onSuccess();
    } catch (error: any) {
      message.error(error.message || 'Failed to dispense medicine');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
    >
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label="Search Patient by Mobile Number"
            required
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="Enter mobile number to search"
                value={patientSearchMobile}
                onChange={(e) => setPatientSearchMobile(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                onPressEnter={handleSearchPatient}
                disabled={isSearchingPatient}
              />
              <Button 
                type="primary" 
                onClick={handleSearchPatient}
                loading={isSearchingPatient}
              >
                Search
              </Button>
            </Space.Compact>
          </Form.Item>
        </Col>
      </Row>

      {searchedPatient && (
        <Alert
          message={`Patient Found: ${searchedPatient.name}`}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setSearchedPatient(null)}
        />
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="patientName"
            label="Patient Name"
            rules={[{ required: true, message: 'Please enter patient name' }]}
          >
            <Input 
              placeholder="Enter patient name" 
              disabled={!!searchedPatient}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="mobileNumber"
            label="Mobile Number"
            rules={[
              { required: true, message: 'Please enter mobile number' },
              { pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit mobile number' }
            ]}
          >
            <Input 
              placeholder="Enter mobile number" 
              maxLength={10}
              disabled={!!searchedPatient}
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider>Medicines</Divider>

      {/* Medicine Selection Form */}
      <Card size="small" style={{ marginBottom: 16, background: '#F9FAFB' }}>
        <Row gutter={16} align="middle">
          <Col span={10}>
            <Form.Item label="Search Medicine" required>
              <Select
                showSearch
                placeholder="Search or select medicine... (try: prctm for Paracetamol)"
                loading={isLoadingMedicines}
                value={currentMedicine.medicineName || undefined}
                onChange={handleMedicineSelect}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && currentMedicine.medicineId && currentMedicine.inventoryId) {
                    e.preventDefault();
                    handleAddMedicine();
                  }
                }}
                optionFilterProp="label"
                filterOption={(input, option) => {
                  const label = String(option?.label || '').toLowerCase();
                  const value = String(option?.value || '').toLowerCase();
                  const searchTerm = input.toLowerCase().trim();
                  if (!searchTerm) return true;
                  if (label.includes(searchTerm) || value.includes(searchTerm)) return true;
                  return fuzzyMatch(searchTerm, label) || fuzzyMatch(searchTerm, value);
                }}
                popupMatchSelectWidth={true}
                notFoundContent={
                  isLoadingMedicines 
                    ? <span>Loading medicines...</span> 
                    : medicinesData.length === 0
                      ? <span>No medicines available</span>
                      : <span>No medicines found matching your search</span>
                }
              >
                {medicinesData.map((med: any) => (
                  <Select.Option key={med.id} value={med.name} label={med.name}>
                    {med.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Inventory" required>
              {currentMedicine.medicineId ? (
                <Select
                  placeholder="Select inventory"
                  value={currentMedicine.inventoryId || undefined}
                  onChange={(value) => {
                    const selectedInv = availableInventoryForMedicine.find((inv: any) => inv.id === value);
                    setCurrentMedicine({
                      ...currentMedicine,
                      inventoryId: value,
                      quantity: 1,
                    });
                  }}
                  loading={isLoadingInventory}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && currentMedicine.medicineId && currentMedicine.inventoryId) {
                      e.preventDefault();
                      handleAddMedicine();
                    }
                  }}
                  showSearch
                  filterOption={(input, option) => {
                    const text = String(option?.children || '').toLowerCase();
                    return text.includes(input.toLowerCase());
                  }}
                >
                  {availableInventoryForMedicine.length > 0 ? (
                    availableInventoryForMedicine.map((inv: any) => (
                      <Select.Option key={inv.id} value={inv.id}>
                        Stock: {inv.quantity || 0} {inv.unit || ''} | Batch: {inv.batchNumber || 'N/A'}
                      </Select.Option>
                    ))
                  ) : (
                    <Select.Option disabled value="">
                      No inventory available for this medicine
                    </Select.Option>
                  )}
                </Select>
              ) : (
                <Input placeholder="Select medicine first" disabled />
              )}
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="Quantity" required>
              <InputNumber
                min={1}
                max={availableInventoryForMedicine.find((inv: any) => inv.id === currentMedicine.inventoryId)?.quantity || 1}
                value={currentMedicine.quantity}
                onChange={(value) => setCurrentMedicine({ ...currentMedicine, quantity: value || 1 })}
                style={{ width: '100%' }}
                disabled={!currentMedicine.inventoryId}
                onPressEnter={(e) => {
                  if (currentMedicine.medicineId && currentMedicine.inventoryId) {
                    handleAddMedicine();
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Frequency (Optional)">
              <Input
                placeholder="e.g., 1-0-1, Twice daily"
                value={currentMedicine.frequency}
                onChange={(e) => setCurrentMedicine({ ...currentMedicine, frequency: e.target.value })}
                onPressEnter={(e) => {
                  if (currentMedicine.medicineId && currentMedicine.inventoryId) {
                    handleAddMedicine();
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={2}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddMedicine}
              style={{ marginTop: 30 }}
              disabled={!currentMedicine.medicineId || !currentMedicine.inventoryId}
            >
              Add
            </Button>
          </Col>
        </Row>
      </Card>

      {selectedMedicines.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          {selectedMedicines.map((medicine, index) => (
            <Card key={index} size="small" style={{ marginBottom: 8 }}>
              <Row gutter={16} align="middle">
                <Col span={14}>
                  <Text strong>{medicine.medicineName}</Text>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    Quantity: {medicine.quantity} {medicine.unit} | Available: {medicine.availableStock} {medicine.unit}
                    {medicine.frequency && <span> | Frequency: {medicine.frequency}</span>}
                  </div>
                </Col>
                <Col span={8} style={{ textAlign: 'right' }}>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveMedicine(index)}
                  >
                    Remove
                  </Button>
                </Col>
              </Row>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ 
          border: '2px dashed #D1D5DB', 
          borderRadius: '8px', 
          padding: '40px',
          textAlign: 'center',
          background: '#FFFFFF',
          marginBottom: 16
        }}>
          <MedicineBoxOutlined style={{ fontSize: '32px', color: '#9CA3AF', marginBottom: '8px' }} />
          <div>
            <Text type="secondary">No medicines added yet. Select medicine above and click Add</Text>
          </div>
        </div>
      )}

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            disabled={selectedMedicines.length === 0}
          >
            Dispense Medicine
          </Button>
          <Button onClick={() => {
            setSelectedMedicines([]);
            setCurrentMedicine({
              medicineId: null,
              medicineName: '',
              inventoryId: null,
              quantity: 1,
              frequency: '',
            });
            setPatientSearchMobile('');
            setSearchedPatient(null);
            handleCancel();
          }}>
            Cancel
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
