import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Drawer,
  Badge,
  Empty,
  Spin,
  Select
} from 'antd';

const { Option } = Select;
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
  MenuUnfoldOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { SidebarProfile } from '../../components/dashboard/SidebarProfile';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QuickActionTile } from '../../components/dashboard/QuickActionTile';
import { NotificationItem } from '../../components/dashboard/NotificationItem';
import LabReportUploadModal from '../../components/modals/lab-report-upload-modal';
import { formatDateTime } from '../../lib/utils';

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
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      setCollapsed(true);
    }
  }, [isMobile, isTablet]);

  // Get lab reports from API
  const { data: labReportsData = [], isLoading: labReportsLoading } = useQuery({
    queryKey: ['/api/labs/me/reports'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/labs/me/reports', {
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
      console.log('📋 Sample report data:', data[0] ? {
        id: data[0].id,
        patientId: data[0].patientId,
        patientName: data[0].patientName,
        testName: data[0].testName
      } : 'No reports');
      return data;
    },
    enabled: !!user,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Get notifications for lab technician
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/notifications/me'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/notifications/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.log('⚠️ Notifications API not ready yet');
        return [];
      }
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Mark notification as read
  const markNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/notifications/read/${notificationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to mark notification as read');
      return response.json();
    },
    onSuccess: () => {
      message.success('Notification marked as read.');
    },
    onError: () => {
      message.error('Failed to mark notification as read.');
    },
  });

  // Update lab report status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: number; status: string }) => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/labs/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
      }
      return response.json();
    },
    onSuccess: () => {
      message.success('Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/lab-reports/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/labs/me/reports'] });
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to update status');
    },
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

  // Filter lab reports by status
  const filteredLabReports = useMemo(() => {
    if (!labReportsData) return [];
    if (statusFilter === 'all') return labReportsData;
    return labReportsData.filter((report: any) => report.status === statusFilter);
  }, [labReportsData, statusFilter]);

  // Separate doctor requests (pending with placeholder results) from regular reports
  const doctorRequests = useMemo(() => {
    return filteredLabReports.filter((report: any) => 
      report.status === 'pending' && 
      (report.results === 'Pending - Awaiting lab processing' || report.results?.includes('Pending - Awaiting')) &&
      report.doctorId // Has a doctor ID, meaning it's a request
    );
  }, [filteredLabReports]);

  // Transform lab reports for table display
  const labReports = useMemo(() => {
    return filteredLabReports.map((report: any) => ({
      ...report,
      id: report.id,
      patient: report.patientName || report.patient || 'Unknown',
      testName: report.testName || 'Test',
      date: report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'N/A',
      result: report.result || (report.status === 'ready' ? 'Ready' : 'Pending'),
      priority: report.priority || 'Normal',
      status: report.status || 'pending',
    }));
  }, [filteredLabReports]);

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
      render: (status: string, record: any) => (
        <Space>
          <Tag color={
            status === 'completed' || status === 'ready' ? 'green' : 
            status === 'processing' ? 'blue' : 
            'orange'
          }>
            {status?.toUpperCase() || 'PENDING'}
        </Tag>
          {status !== 'completed' && (
            <Select
              size="small"
              value={status}
              onChange={(newStatus) => updateStatusMutation.mutate({ reportId: record.id, status: newStatus })}
              style={{ width: 100 }}
            >
              <Option value="pending">Pending</Option>
              <Option value="processing">Processing</Option>
              <Option value="ready">Ready</Option>
              <Option value="completed">Completed</Option>
            </Select>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedReport(record);
              setIsUploadModalOpen(true);
            }}
          >
            Edit
          </Button>
        </Space>
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
            padding: isMobile ? '0 16px 16px' : isTablet ? '0 20px 20px' : '0 24px 24px',
            paddingTop: 0,
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
                <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
              <KpiCard
                label="Samples Pending"
                value={stats?.pendingTests || 0}
                icon={<FileSearchOutlined style={{ fontSize: '24px', color: labTheme.primary }} />}
                trendLabel="Awaiting Analysis"
                trendType="neutral"
              />
            </Col>
                <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
              <KpiCard
                label="Reports Ready"
                value={stats?.completedTests || 0}
                icon={<CheckCircleOutlined style={{ fontSize: '24px', color: labTheme.secondary }} />}
                trendLabel="Completed Today"
                trendType="positive"
              />
            </Col>
                <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
              <KpiCard
                label="Critical Alerts"
                value={stats?.criticalResults || 0}
                icon={<AlertOutlined style={{ fontSize: '24px', color: labTheme.accent }} />}
                trendLabel="Requires Attention"
                trendType={stats?.criticalResults > 0 ? 'negative' : 'positive'}
              />
            </Col>
                <Col xs={24} sm={12} md={6} style={{ display: 'flex' }}>
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
                  onClick={() => {
                    setSelectedReport(null);
                    setIsUploadModalOpen(true);
                  }}
                />
                <QuickActionTile
                  label="Upload Report"
                  icon={<UploadOutlined />}
                  onClick={() => {
                    setSelectedReport(null);
                    setIsUploadModalOpen(true);
                  }}
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
                    onClick={() => {
                      setSelectedReport(null);
                      setIsUploadModalOpen(true);
                    }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <QuickActionTile
                    label="Upload Report"
                    icon={<UploadOutlined />}
                    onClick={() => {
                      setSelectedReport(null);
                      setIsUploadModalOpen(true);
                    }}
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
            {/* Lab Reports Queue */}
            <Col xs={24} lg={16}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {/* Doctor Requests Section */}
                {doctorRequests.length > 0 && (
                  <Card 
                    title={
                      <Space>
                        <ExperimentOutlined style={{ color: labTheme.accent }} />
                        <span>Doctor Requests ({doctorRequests.length})</span>
                        <Tag color="orange">New</Tag>
                      </Space>
                    }
                    style={{ borderRadius: 16, border: `2px solid ${labTheme.accent}` }}
                  >
                    <div style={{ overflowX: 'auto' }}>
                      <Table
                        columns={reportColumns}
                        dataSource={doctorRequests.map((report: any) => ({
                          ...report,
                          id: report.id,
                          patient: report.patientName || report.patient || 'Unknown',
                          testName: report.testName || 'Test',
                          date: report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'N/A',
                          result: 'Requested',
                          priority: report.priority || 'Normal',
                          status: report.status || 'pending',
                        }))}
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
                )}

                {/* Regular Lab Reports */}
              <Card 
                  title="Lab Reports Queue" 
                  extra={
                    <Space>
                      <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 120 }}
                        size="small"
                      >
                        <Option value="all">All Status</Option>
                        <Option value="pending">Pending</Option>
                        <Option value="processing">Processing</Option>
                        <Option value="ready">Ready</Option>
                        <Option value="completed">Completed</Option>
                      </Select>
                      <Button type="link" onClick={() => message.info('View all reports feature coming soon')}>View All</Button>
                    </Space>
                  }
                style={{ borderRadius: 16 }}
              >
                  <div style={{ overflowX: 'auto' }}>
                <Table
                  columns={reportColumns}
                      dataSource={labReports.filter((r: any) => !doctorRequests.find((dr: any) => dr.id === r.id))}
                  pagination={false}
                  rowKey="id"
                  variant="borderless"
                      size={isMobile ? "small" : "middle"}
                      scroll={isMobile ? { x: 'max-content' } : undefined}
                      loading={labReportsLoading}
                  style={{
                    backgroundColor: labTheme.background
                  }}
                />
                  </div>
              </Card>
              </Space>
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
                title={
                  <Space>
                    <BellOutlined />
                    <span>Notifications</span>
                    {notifications.filter((notif: any) => !notif.read).length > 0 && (
                      <Badge count={notifications.filter((notif: any) => !notif.read).length} />
                    )}
                  </Space>
                }
                style={{ 
                  marginTop: '16px',
                  borderRadius: 16
                }}
              >
                {notificationsLoading ? (
                  <Spin size="small" />
                ) : notifications.length > 0 ? (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {notifications.slice(0, 5).map((notif: any) => (
                      <NotificationItem
                        key={notif.id}
                        title={notif.title || 'Notification'}
                        message={notif.message || ''}
                        timestamp={formatDateTime(notif.createdAt)}
                        severity={notif.type === 'urgent' ? 'urgent' : 'info'}
                        read={Boolean(notif.read)}
                        onMarkRead={() => !notif.read && markNotificationMutation.mutate(notif.id)}
                      />
                    ))}
                  </Space>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="All caught up"
                    style={{ padding: '20px 0' }}
                  />
                )}
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

      {/* Lab Report Upload Modal */}
      <LabReportUploadModal
        open={isUploadModalOpen}
        onCancel={() => {
          setIsUploadModalOpen(false);
          setSelectedReport(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/lab-reports/my'] });
          queryClient.invalidateQueries({ queryKey: ['/api/labs/me/reports'] });
        }}
        report={selectedReport}
      />
    </Layout>
  );
}