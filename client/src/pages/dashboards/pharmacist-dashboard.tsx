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
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const shownNotificationIdsRef = useRef<Set<number>>(new Set());
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>('dashboard');

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
    enabled: !!user && user.role?.toUpperCase() === 'PHARMACIST',
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

  // Show floating notifications for unread notifications
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const unread = notifications.filter((n: any) => !n.isRead);
    
    unread.forEach((notif: any) => {
      const notifId = Number(notif.id);
      
      // Only show if we haven't shown this notification before
      if (!shownNotificationIdsRef.current.has(notifId)) {
        shownNotificationIdsRef.current.add(notifId);
        
        const type = (notif.type || '').toLowerCase();
        let notificationType: 'info' | 'success' | 'warning' | 'error' = 'info';
        if (type.includes('cancel') || type.includes('reject') || type.includes('critical')) notificationType = 'error';
        else if (type.includes('confirm') || type.includes('complete') || type.includes('ready')) notificationType = 'success';
        else if (type.includes('pending') || type.includes('resched') || type.includes('processing')) notificationType = 'warning';
        
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
      }
    });
  }, [notifications, notificationApi, queryClient]);

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

  // Get prescriptions for dispensing (real data)
  const { data: prescriptions = [], isLoading: isLoadingPrescriptions } = useQuery({
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
  });

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

  // Quick actions for pharmacists
  const quickActions = [
    {
      title: 'Dispense Medicine',
      description: 'Process prescription dispensing',
      icon: <MedicineBoxOutlined />,
      action: () => setSelectedMenuKey('dispensing'),
      color: pharmacistTheme.primary,
    },
    {
      title: 'Check Inventory',
      description: 'View medicine stock levels',
      icon: <ShoppingCartOutlined />,
      action: () => setSelectedMenuKey('inventory'),
      color: pharmacistTheme.accent,
    },
    {
      title: 'Patient Counseling',
      description: 'Record medication counseling',
      icon: <FileTextOutlined />,
      action: () => message.info('Patient counseling feature coming soon'),
      color: '#059669',
    },
    {
      title: 'Stock Alerts',
      description: 'Manage low stock notifications',
      icon: <BellOutlined />,
      action: () => message.info('Stock alerts feature coming soon'),
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
                  onClick={() => message.info('Dispense feature coming soon')}
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
              if (key) setSelectedMenuKey(key);
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
              if (key) setSelectedMenuKey(key);
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
          userId={useMemo(() => {
            if (user?.id) {
              const year = new Date().getFullYear();
              const idNum = String(user.id).padStart(3, '0');
              return `PHA-${year}-${idNum}`;
            }
            return 'PHA-2024-001';
          }, [user?.id])}
          userInitials={useMemo(() => {
            if (user?.fullName) {
              const names = user.fullName.split(' ');
              if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
              }
              return user.fullName.substring(0, 2).toUpperCase();
            }
            return 'PH';
          }, [user?.fullName])}
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
    </div>
    </>
  );
}
