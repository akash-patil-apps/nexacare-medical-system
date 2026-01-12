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
  ShoppingCartOutlined,
  PlusOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { PharmacistSidebar } from '../../components/layout/PharmacistSidebar';
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
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>('dashboard');

  // Redirect if not authenticated or not a pharmacist
  if (!isLoading && (!user || user.role?.toUpperCase() !== 'PHARMACIST')) {
    return <Redirect to="/login" />;
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
      action: () => message.info('Dispense medicine feature coming soon'),
      color: pharmacistTheme.primary,
    },
    {
      title: 'Check Inventory',
      description: 'View medicine stock levels',
      icon: <ShoppingCartOutlined />,
      action: () => message.info('Inventory management feature coming soon'),
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
    <Card title="Medicine Inventory" size="small">
      <Alert
        message="Inventory Management"
        description="Stock levels, expiry tracking, and reorder alerts will be available here."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={[
          { id: 1, name: 'Paracetamol 500mg', stock: 150, expiry: '2025-06-15', status: 'normal' },
          { id: 2, name: 'Amoxicillin 250mg', stock: 25, expiry: '2025-04-10', status: 'low' },
          { id: 3, name: 'Ibuprofen 200mg', stock: 80, expiry: '2025-08-22', status: 'normal' },
        ]}
        columns={[
          {
            title: 'Medicine',
            dataIndex: 'name',
            key: 'name',
            render: (name: string) => <Text strong>{name}</Text>,
          },
          {
            title: 'Stock',
            dataIndex: 'stock',
            key: 'stock',
            render: (stock: number) => (
              <Text style={{ color: stock < 50 ? '#EF4444' : '#059669' }}>
                {stock} units
              </Text>
            ),
          },
          {
            title: 'Expiry',
            dataIndex: 'expiry',
            key: 'expiry',
            render: (expiry: string) => dayjs(expiry).format('DD/MM/YYYY'),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
              <Tag color={status === 'low' ? 'red' : 'green'}>
                {status.toUpperCase()}
              </Tag>
            ),
          },
        ]}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </Card>
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
      <Layout style={{ minHeight: '100vh', backgroundColor: pharmacistTheme.background }}>
      {/* Sidebar */}
      {!isMobile ? (
        <Sider
          width={260}
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
          width={260}
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
        marginLeft: isMobile ? 0 : 260,
        minHeight: '100vh',
        background: pharmacistTheme.background,
      }}>
        <Content style={{
          background: pharmacistTheme.background,
          height: '100vh',
          overflowY: 'auto',
        }}>
          <div style={{
            padding: isMobile ? '24px 16px 16px' : isTablet ? '24px 20px 20px' : '24px 32px 24px',
          }}>
            {/* Mobile Menu Button and Header */}
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Button
                  type="text"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setMobileDrawerOpen(true)}
                  style={{ fontSize: '18px' }}
                />
                <Title level={4} style={{ margin: 0 }}>Pharmacy Dashboard</Title>
                <NotificationBell />
              </div>
            )}

            {/* Desktop Header */}
            {!isMobile && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <NotificationBell />
              </div>
            )}

            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
    </>
  );
}
