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
  Avatar,
  Menu,
  Dropdown,
  Badge,
  Progress,
  Timeline,
  List,
  Upload
} from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  MedicineBoxOutlined, 
  FileTextOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  ExperimentOutlined,
  UploadOutlined,
  FileSearchOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function LabDashboard() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Get dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => ({
      totalTests: 156,
      completedTests: 142,
      pendingTests: 14,
      todayTests: 8,
      criticalResults: 3,
      normalResults: 139
    })
  });

  // Get lab reports
  const { data: labReports } = useQuery({
    queryKey: ['/api/lab-reports/my'],
    queryFn: async () => [
      {
        id: 1,
        patient: 'John Doe',
        testName: 'Blood Sugar Test',
        date: '2024-09-26',
        status: 'completed',
        result: 'Normal',
        priority: 'Normal'
      },
      {
        id: 2,
        patient: 'Jane Smith',
        testName: 'Cholesterol Test',
        date: '2024-09-26',
        status: 'pending',
        result: 'Pending',
        priority: 'High'
      },
      {
        id: 3,
        patient: 'Mike Johnson',
        testName: 'Liver Function Test',
        date: '2024-09-25',
        status: 'completed',
        result: 'Abnormal',
        priority: 'Critical'
      }
    ]
  });

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

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logout,
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
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
          style={{ border: 'none' }}
        />
      </Sider>

      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Button
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px' }}
          >
            {collapsed ? '☰' : '✕'}
          </Button>
          
          <Space>
            <Tag color="purple" style={{ marginRight: '8px' }}>
              🧪 LAB DASHBOARD
            </Tag>
            <Badge count={5} size="small">
              <BellOutlined style={{ fontSize: '18px' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<ExperimentOutlined />} />
                <Text strong>{user?.fullName}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: '24px', background: '#f5f5f5' }}>
          <div style={{ marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0 }}>
              Laboratory Dashboard
            </Title>
            <Text type="secondary">
              Welcome back, {user?.fullName} - Lab Technician
            </Text>
              </div>

          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
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
              <Button type="primary" icon={<UploadOutlined />} size="large">
                Upload Report
            </Button>
              <Button icon={<FileTextOutlined />} size="large">
                View All Reports
                    </Button>
              <Button icon={<BarChartOutlined />} size="large">
                Lab Analytics
              </Button>
            </Space>
      </Card>

          <Row gutter={[16, 16]}>
            {/* Recent Lab Reports */}
            <Col xs={24} lg={16}>
              <Card 
                title="Recent Lab Reports" 
                extra={<Button type="link">View All</Button>}
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
        </Content>
      </Layout>
    </Layout>
  );
}