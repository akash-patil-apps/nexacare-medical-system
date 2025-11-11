import { useState } from "react";
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
  Menu,
  Progress,
  List,
  message
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
  BarChartOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { SidebarProfile } from '../../components/dashboard/SidebarProfile';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function LabDashboard() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

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

  const siderWidth = collapsed ? 80 : 260;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
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
        <div style={{ 
          padding: '16px', 
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <ExperimentOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          {!collapsed && (
            <Title level={4} style={{ margin: '8px 0 0 0', color: '#1890ff' }}>
              NexaCare Lab
            </Title>
          )}
              </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={sidebarMenu}
          style={{ border: 'none', flex: 1 }}
        />
        <SidebarProfile
          collapsed={collapsed}
          name={user?.fullName || 'Lab Technician'}
          roleLabel="LAB TECHNICIAN"
          roleColor="#0EA5E9"
          avatarIcon={<ExperimentOutlined />}
          onSettingsClick={() => message.info('Profile settings coming soon.')}
          onLogoutClick={logout}
        />
      </Sider>

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: '#f5f5f5',
          transition: 'margin-left 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            background: '#f5f5f5',
            height: '100vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '32px 24px', maxWidth: '1320px', margin: '0 auto', paddingBottom: 48 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <Button
                type="text"
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: 16 }}
              >
                {collapsed ? '☰' : '✕'}
              </Button>
            </div>

          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Tests"
                  value={stats?.totalTests || 0}
                  prefix={<ExperimentOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Completed Today"
                  value={stats?.completedTests || 0}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Pending Tests"
                  value={stats?.pendingTests || 0}
                  prefix={<FileSearchOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
        </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
        <Card>
                <Statistic
                  title="Critical Results"
                  value={stats?.criticalResults || 0}
                  prefix={<MedicineBoxOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
        </Card>
            </Col>
          </Row>

          {/* Quick Actions */}
          <Card title="Quick Actions" style={{ marginBottom: '24px' }}>
            <Space wrap>
              <Button 
                type="primary" 
                icon={<UploadOutlined />} 
                size="large"
                onClick={() => message.info('Upload report feature coming soon')}
              >
                Upload Report
              </Button>
              <Button 
                icon={<FileTextOutlined />} 
                size="large"
                onClick={() => message.info('View all reports feature coming soon')}
              >
                View All Reports
              </Button>
              <Button 
                icon={<BarChartOutlined />} 
                size="large"
                onClick={() => message.info('Lab analytics feature coming soon')}
              >
                Lab Analytics
              </Button>
            </Space>
      </Card>

          <Row gutter={[16, 16]}>
            {/* Recent Lab Reports */}
            <Col xs={24} lg={16}>
              <Card 
                title="Recent Lab Reports" 
                extra={<Button type="link" onClick={() => message.info('View all reports feature coming soon')}>View All</Button>}
              >
                <Table
                  columns={reportColumns}
                  dataSource={labReports}
                  pagination={false}
                  rowKey="id"
                />
              </Card>
            </Col>

            {/* Lab Performance & Critical Results */}
            <Col xs={24} lg={8}>
              <Card title="Lab Performance">
                <Progress 
                  percent={85} 
                  status="active" 
                  strokeColor="#52c41a"
                  style={{ marginBottom: '16px' }}
                />
                <Text type="secondary">
                  {stats?.completedTests || 0} of {stats?.totalTests || 0} tests completed
                </Text>
              </Card>

              <Card title="Critical Results" style={{ marginTop: '16px' }}>
                <List
                  dataSource={labReports?.filter((report: any) => report.priority === 'Critical')}
                  renderItem={(report: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={report.patient}
                        description={
                          <Space direction="vertical" size={0}>
                            <Text type="secondary">{report.testName}</Text>
                            <Tag color="red">CRITICAL</Tag>
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