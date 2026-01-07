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
import dayjs from 'dayjs';
import { getISTNow } from '../../lib/timezone';
import { playNotificationSound } from '../../lib/notification-sounds';

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

  // Get prescriptions for dispensing (mock data for now)
  const { data: prescriptions = [], isLoading: isLoadingPrescriptions } = useQuery({
    queryKey: ['/api/prescriptions', 'pharmacist'],
    queryFn: async () => {
      // For now, return mock prescriptions that need dispensing
      // In a real implementation, this would fetch prescriptions ready for dispensing
      return [
        {
          id: 1,
          patientName: 'Rajesh Kumar',
          doctorName: 'Dr. Priya Sharma',
          medicines: ['Paracetamol 500mg', 'Amoxicillin 250mg'],
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          patientName: 'Meera Jain',
          doctorName: 'Dr. Amit Patel',
          medicines: ['Ibuprofen 200mg', 'Cetirizine 10mg'],
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ];
    },
    enabled: !!pharmacistProfile,
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalPrescriptions = prescriptions.length;
    const pendingPrescriptions = prescriptions.filter((p: any) => p.status === 'pending').length;
    const dispensedToday = prescriptions.filter((p: any) =>
      dayjs(p.createdAt).isSame(dayjs(), 'day') && p.status === 'dispensed'
    ).length;
    const lowStockAlerts = 3; // Mock low stock alerts

    return [
      {
        title: 'Pending Prescriptions',
        value: pendingPrescriptions,
        icon: <MedicineBoxOutlined />,
        color: pharmacistTheme.primary,
        trend: '+2',
        trendLabel: 'new today',
      },
      {
        title: 'Dispensed Today',
        value: dispensedToday,
        icon: <CheckCircleOutlined />,
        color: '#059669',
        trend: '+5',
        trendLabel: 'vs yesterday',
      },
      {
        title: 'Total Prescriptions',
        value: totalPrescriptions,
        icon: <ShoppingCartOutlined />,
        color: pharmacistTheme.accent,
        trend: '+12',
        trendLabel: 'this week',
      },
      {
        title: 'Low Stock Alerts',
        value: lowStockAlerts,
        icon: <ExperimentOutlined />,
        color: '#EF4444',
        trend: 'Needs attention',
        trendLabel: '',
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
      {/* Welcome Section */}
      <Card
        style={{
          background: `linear-gradient(135deg, ${pharmacistTheme.primary} 0%, ${pharmacistTheme.accent} 100%)`,
          color: 'white',
        }}
      >
        <Space direction="vertical" size="small">
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            Welcome back, {pharmacistProfile?.user?.fullName?.split(' ')[0] || 'Pharmacist'}
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
            {pharmacistProfile?.hospital?.name} • {pharmacistProfile?.pharmacyType || 'Hospital'} Pharmacy
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
            {prescriptions.filter((p: any) => p.status === 'pending').length} prescriptions waiting for dispensing
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
      <Card title="Recent Dispensing Activity" size="small">
        <List
          size="small"
          dataSource={[
            { time: '2 hours ago', action: 'Dispensed Paracetamol to Rajesh Kumar', type: 'dispensed' },
            { time: '4 hours ago', action: 'Checked inventory for Amoxicillin', type: 'inventory' },
            { time: '6 hours ago', action: 'Counseled patient on medication usage', type: 'counseling' },
          ]}
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
    <Layout style={{ minHeight: '100vh', backgroundColor: pharmacistTheme.background }}>
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
                backgroundColor: pharmacistTheme.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
              }}>
                💊
              </div>
              <div>
                <Text strong style={{ fontSize: '16px' }}>
                  {pharmacistProfile?.user?.fullName || 'Pharmacist'}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {pharmacistProfile?.hospital?.name || 'Hospital'}
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
                backgroundColor: pharmacistTheme.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
              }}>
                💊
              </div>
              <div>
                <Text strong>{pharmacistProfile?.user?.fullName || 'Pharmacist'}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {pharmacistProfile?.hospital?.name || 'Hospital'}
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
        backgroundColor: pharmacistTheme.background,
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
            <Title level={4} style={{ margin: 0, color: pharmacistTheme.primary }}>
              Pharmacy Dashboard
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
