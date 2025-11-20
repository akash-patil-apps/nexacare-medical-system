import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Typography,
  Menu,
  Progress,
  List,
  message,
  Drawer
} from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  MedicineBoxOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  UploadOutlined,
  FileSearchOutlined,
  BarChartOutlined,
  AlertOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { SidebarProfile } from '../../components/dashboard/SidebarProfile';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const labTheme = {
  primary: '#0EA5E9', // Sky blue
  secondary: '#22C55E', // Green
  accent: '#F87171', // Red
  background: '#F0FAFF', // Light blue
  highlight: '#DFF3FF', // Lighter blue
};

export default function LabDashboard() {
  const { user, logout } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      setCollapsed(true);
    }
  }, [isMobile, isTablet]);

  // Get lab reports from API
  const { data: labReportsData = [], isLoading: labReportsLoading } = useQuery({
    queryKey: ['/api/lab-reports/my'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/lab-reports/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        // If API not ready, return empty array
        console.log('⚠️ Lab reports API not ready yet');
        return [];
      }
      const data = await response.json();
      console.log('📋 Lab reports loaded:', data.length, 'reports');
      return data;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Calculate real stats from lab reports data
  const stats = labReportsData ? {
    totalTests: labReportsData.length,
    completedTests: labReportsData.filter((report: any) => report.status === 'completed').length,
    pendingTests: labReportsData.filter((report: any) => report.status === 'pending').length,
    todayTests: labReportsData.filter((report: any) => {
      if (!report.reportDate && !report.date) return false;
      const reportDate = new Date(report.reportDate || report.date);
      const today = new Date();
      return reportDate.toDateString() === today.toDateString();
    }).length,
    criticalResults: labReportsData.filter((report: any) => 
      report.priority === 'Critical' || report.result === 'Abnormal'
    ).length,
    normalResults: labReportsData.filter((report: any) => 
      report.result === 'Normal'
    ).length
  } : {
    totalTests: 0,
    completedTests: 0,
    pendingTests: 0,
    todayTests: 0,
    criticalResults: 0,
    normalResults: 0
  };

  const labReports = labReportsData;

  const reportColumns = [
    {
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
    },
    {
      title: 'Test Name',
      dataIndex: 'testName',
      key: 'testName',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      render: (result: string) => (
        <Tag color={result === 'Normal' ? 'green' : result === 'Abnormal' ? 'red' : 'orange'}>
          {result}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={priority === 'Critical' ? 'red' : priority === 'High' ? 'orange' : 'blue'}>
          {priority}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
  ];

  const sidebarMenu = [
    {
      key: 'dashboard',
      icon: <ExperimentOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: 'Test Reports',
    },
    {
      key: 'patients',
      icon: <UserOutlined />,
      label: 'Patients',
    },
    {
      key: 'upload',
      icon: <UploadOutlined />,
      label: 'Upload Results',
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
    },
  ];

  const siderWidth = isMobile ? 0 : (collapsed ? 80 : 260);

  // Sidebar content component (reusable for drawer and sider)
  const SidebarContent = ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <>
      <div style={{ 
        padding: '16px', 
        textAlign: 'center',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <ExperimentOutlined style={{ fontSize: '24px', color: labTheme.primary }} />
        {(!collapsed || isMobile) && (
          <Title level={4} style={{ margin: '8px 0 0 0', color: labTheme.primary }}>
            NexaCare Lab
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
        name={user?.fullName || 'Lab Technician'}
        roleLabel="LAB TECHNICIAN"
        roleColor="#0EA5E9"
        avatarIcon={<ExperimentOutlined />}
        onSettingsClick={() => message.info('Profile settings coming soon.')}
        onLogoutClick={logout}
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
          background: labTheme.background,
          transition: 'margin-left 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            background: labTheme.background,
            height: '100vh',
            overflowY: 'auto',
            padding: isMobile ? '12px 16px' : isTablet ? '16px 20px' : '16px 24px 24px',
          }}
        >
          <div style={{ paddingBottom: 24, maxWidth: '1320px', margin: '0 auto' }}>
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
                  { label: "Samples Pending", value: stats?.pendingTests || 0, icon: <FileSearchOutlined style={{ fontSize: '24px', color: labTheme.primary }} />, trendLabel: "Awaiting Analysis", trendType: "neutral" as const, onView: () => message.info('View pending tests') },
                  { label: "Reports Ready", value: stats?.completedTests || 0, icon: <CheckCircleOutlined style={{ fontSize: '24px', color: labTheme.secondary }} />, trendLabel: "Completed Today", trendType: "positive" as const, onView: () => message.info('View completed tests') },
                  { label: "Critical Alerts", value: stats?.criticalResults || 0, icon: <AlertOutlined style={{ fontSize: '24px', color: labTheme.accent }} />, trendLabel: "Requires Attention", trendType: (stats?.criticalResults > 0 ? "negative" : "positive") as const, onView: () => message.info('View critical alerts') },
                  { label: "Total Tests", value: stats?.totalTests || 0, icon: <ExperimentOutlined style={{ fontSize: '24px', color: labTheme.primary }} />, trendLabel: "All Time", trendType: "neutral" as const, onView: () => message.info('View all tests') },
                ].map((kpi, idx) => (
                  <div key={idx} style={{ minWidth: 200, scrollSnapAlign: 'start' }}>
                    <KpiCard {...kpi} />
                  </div>
                ))}
              </div>
            ) : (
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                  <KpiCard
                    label="Samples Pending"
                    value={stats?.pendingTests || 0}
                    icon={<FileSearchOutlined style={{ fontSize: '24px', color: labTheme.primary }} />}
                    trendLabel="Awaiting Analysis"
                    trendType="neutral"
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <KpiCard
                    label="Reports Ready"
                    value={stats?.completedTests || 0}
                    icon={<CheckCircleOutlined style={{ fontSize: '24px', color: labTheme.secondary }} />}
                    trendLabel="Completed Today"
                    trendType="positive"
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <KpiCard
                    label="Critical Alerts"
                    value={stats?.criticalResults || 0}
                    icon={<AlertOutlined style={{ fontSize: '24px', color: labTheme.accent }} />}
                    trendLabel="Requires Attention"
                    trendType={stats?.criticalResults > 0 ? 'negative' : 'positive'}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <KpiCard
                    label="Total Tests"
                    value={stats?.totalTests || 0}
                    icon={<ExperimentOutlined style={{ fontSize: '24px', color: labTheme.primary }} />}
                    trendLabel="All Time"
                    trendType="neutral"
                  />
                </Col>
              </Row>
            )}

          {/* Quick Actions */}
          <Card 
            title="Quick Actions" 
            style={{ 
              marginBottom: '24px',
              borderRadius: 16,
              background: labTheme.background
            }}
            bodyStyle={{ padding: isMobile ? 16 : 20 }}
          >
            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <QuickActionTile
                  label="Log Sample"
                  icon={<ExperimentOutlined />}
                  onClick={() => message.info('Log sample feature coming soon')}
                />
                <QuickActionTile
                  label="Upload Report"
                  icon={<UploadOutlined />}
                  onClick={() => message.info('Upload report feature coming soon')}
                />
                <QuickActionTile
                  label="Assign Technician"
                  icon={<UserOutlined />}
                  onClick={() => message.info('Assign technician feature coming soon')}
                />
                <QuickActionTile
                  label="Request Re-test"
                  icon={<FileSearchOutlined />}
                  onClick={() => message.info('Request re-test feature coming soon')}
                />
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Log Sample"
                    icon={<ExperimentOutlined />}
                    onClick={() => message.info('Log sample feature coming soon')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Upload Report"
                    icon={<UploadOutlined />}
                    onClick={() => message.info('Upload report feature coming soon')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Assign Technician"
                    icon={<UserOutlined />}
                    onClick={() => message.info('Assign technician feature coming soon')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Request Re-test"
                    icon={<FileSearchOutlined />}
                    onClick={() => message.info('Request re-test feature coming soon')}
                  />
                </Col>
              </Row>
            )}
          </Card>

          <Row gutter={[16, 16]}>
            {/* Recent Lab Reports */}
            <Col xs={24} lg={16}>
              <Card 
                title="Recent Lab Reports" 
                extra={<Button type="link" onClick={() => message.info('View all reports feature coming soon')}>View All</Button>}
                style={{ borderRadius: 16 }}
              >
                <div style={{ overflowX: 'auto' }}>
                  <Table
                    columns={reportColumns}
                    dataSource={labReports}
                    pagination={false}
                    rowKey="id"
                    variant="borderless"
                    size={isMobile ? "small" : "middle"}
                    scroll={isMobile ? { x: 'max-content' } : undefined}
                    style={{
                      backgroundColor: labTheme.background
                    }}
                  />
                </div>
              </Card>
            </Col>

            {/* Lab Performance & Critical Results */}
            <Col xs={24} lg={8}>
              <Card 
                title="Lab Performance"
                style={{ borderRadius: 16 }}
              >
                <Progress 
                  percent={stats?.totalTests ? Math.round((stats.completedTests / stats.totalTests) * 100) : 0} 
                  status="active" 
                  strokeColor={labTheme.primary}
                  style={{ marginBottom: '16px' }}
                />
                <Text type="secondary">
                  {stats?.completedTests || 0} of {stats?.totalTests || 0} tests completed
                </Text>
              </Card>

              <Card 
                title="Critical Results" 
                style={{ 
                  marginTop: '16px',
                  borderRadius: 16,
                  borderColor: labTheme.accent
                }}
              >
                <List
                  dataSource={labReports?.filter((report: any) => report.priority === 'Critical')}
                  renderItem={(report: any) => (
                    <List.Item style={{ 
                      padding: '12px 0',
                      borderBottom: '1px solid #f0f0f0'
                    }}>
                      <List.Item.Meta
                        title={<Text strong>{report.patient}</Text>}
                        description={
                          <Space direction="vertical" size={0}>
                            <Text type="secondary">{report.testName}</Text>
                            <Tag color={labTheme.accent}>CRITICAL</Tag>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}