import { useState } from "react";
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
  List
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
  BankOutlined,
  UserAddOutlined,
  BarChartOutlined,
  DownloadOutlined,
  TrendingUpOutlined,
  UserOutlined as UsersOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function HospitalPrescriptionsPage() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

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
      icon: <BankOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'prescriptions',
      icon: <FileTextOutlined />,
      label: 'Prescriptions',
    },
  ];

  // Mock prescription data
  const prescriptions = [
    {
      id: 1,
      patientName: "Jane Doe",
      doctorName: "Dr. John Smith",
      date: "2024-09-26",
      medications: [
        { name: "Paracetamol", dosage: "500mg", frequency: "3 times daily" },
        { name: "Amoxicillin", dosage: "250mg", frequency: "2 times daily" }
      ],
      status: "active"
    },
    {
      id: 2,
      patientName: "John Smith",
      doctorName: "Dr. Sarah Wilson",
      date: "2024-09-25",
      medications: [
        { name: "Ibuprofen", dosage: "400mg", frequency: "2 times daily" }
      ],
      status: "completed"
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ 
          padding: '16px', 
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <BankOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          {!collapsed && (
            <Title level={4} style={{ margin: '8px 0 0 0', color: '#1890ff' }}>
              NexaCare Hospital
            </Title>
          )}
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['prescriptions']}
          style={{ borderRight: 0 }}
          items={sidebarMenu}
        />
      </Sider>
      
      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <Button
            type="text"
            icon={collapsed ? <PlusOutlined /> : <PlusOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <Space>
            <Badge count={8} size="small">
              <BellOutlined style={{ fontSize: '18px' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<BankOutlined />} />
                <Text strong>{user?.fullName}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        
        <Content style={{ margin: '0 24px 24px', marginTop: 0, background: '#f5f5f5', minHeight: 'calc(100vh - 112px)' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <Title level={2} style={{ margin: '0 0 8px 0', color: '#1890ff' }}>
                  <FileTextOutlined style={{ marginRight: '8px' }} />
                  Hospital Prescriptions
                </Title>
                <Text type="secondary">Manage all hospital prescriptions</Text>
              </div>
              <Space>
                <Button icon={<DownloadOutlined />}>
                  Export Report
                </Button>
                <Button type="primary" icon={<PlusOutlined />}>
                  Generate Report
                </Button>
              </Space>
            </div>
          </div>

          {/* Quick Stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Total Prescriptions"
                  value={1247}
                  prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="This Month"
                  value={156}
                  prefix={<TrendingUpOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Active Doctors"
                  value={24}
                  prefix={<UsersOutlined style={{ color: '#faad14' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Today"
                  value={18}
                  prefix={<CalendarOutlined style={{ color: '#722ed1' }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* Prescriptions List */}
          <Card title="All Hospital Prescriptions">
            <div>
              {prescriptions.map((prescription) => (
                <Card 
                  key={prescription.id} 
                  style={{ marginBottom: '16px' }}
                  title={
                    <Space>
                      <FileTextOutlined />
                      Prescription #{prescription.id}
                    </Space>
                  }
                  extra={
                    <Space>
                      <Tag color={prescription.status === 'active' ? 'green' : 'blue'}>
                        {prescription.status}
                      </Tag>
                      <Button type="primary" icon={<DownloadOutlined />}>
                        Download
                      </Button>
                    </Space>
                  }
                >
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Text strong>Patient: </Text>
                      <Text>{prescription.patientName}</Text>
                    </Col>
                    <Col span={6}>
                      <Text strong>Doctor: </Text>
                      <Text>{prescription.doctorName}</Text>
                    </Col>
                    <Col span={6}>
                      <Text strong>Date: </Text>
                      <Text>{prescription.date}</Text>
                    </Col>
                    <Col span={6}>
                      <Text strong>Medications: </Text>
                      <Text>{prescription.medications.length}</Text>
                    </Col>
                  </Row>
                  
                  <div style={{ marginTop: '16px' }}>
                    <Title level={5}>Medications:</Title>
                    <List
                      dataSource={prescription.medications}
                      renderItem={(medication) => (
                        <List.Item>
                          <List.Item.Meta
                            title={medication.name}
                            description={`${medication.dosage} - ${medication.frequency}`}
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
} 