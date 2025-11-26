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
  Modal
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
  ExclamationCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from '../../lib/queryClient';
import { formatDate } from '../../lib/utils';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function PatientPrescriptionsPage() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
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
      icon: <UserOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'prescriptions',
      icon: <FileTextOutlined />,
      label: 'Prescriptions',
    },
  ];

  // Fetch prescriptions data
  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['/api/prescriptions/patient'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/prescriptions/patient');
      return response.json();
    },
  });

  const handleViewPrescription = (prescription: any) => {
    setSelectedPrescription(prescription);
    setIsViewModalOpen(true);
  };

  const formatMedications = (medications: string) => {
    try {
      const meds = JSON.parse(medications);
      return Array.isArray(meds) ? meds.map((med: any) => med.name).join(', ') : medications;
    } catch {
      return medications;
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Doctor',
      dataIndex: 'doctor',
      key: 'doctor',
      render: (doctor: any) => doctor?.fullName || 'Unknown',
    },
    {
      title: 'Diagnosis',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      ellipsis: true,
    },
    {
      title: 'Medications',
      dataIndex: 'medications',
      key: 'medications',
      render: (medications: string) => formatMedications(medications),
      ellipsis: true,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewPrescription(record)}
            title="View Details"
          />
          <Button
            type="text"
            icon={<DownloadOutlined />}
            title="Download"
          />
        </Space>
      ),
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
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ 
          padding: '16px', 
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <MedicineBoxOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          {!collapsed && (
            <Title level={4} style={{ margin: '8px 0 0 0', color: '#1890ff' }}>
              NexaCare
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
            <Badge count={3} size="small">
              <BellOutlined style={{ fontSize: '18px' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <Text strong>{user?.fullName}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        
        <Content style={{ margin: '0 24px 24px', marginTop: 0, background: '#f5f5f5', minHeight: 'calc(100vh - 112px)' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
            <Title level={2} style={{ margin: '0 0 16px 0', color: '#1890ff' }}>
              <FileTextOutlined style={{ marginRight: '8px' }} />
              My Prescriptions
            </Title>
            <Text type="secondary">View and download your prescriptions</Text>
          </div>

          {/* Quick Stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Prescriptions"
                  value={12}
                  prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Active"
                  value={8}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Follow-up Due"
                  value={2}
                  prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* Important Notice */}
          <Card style={{ marginBottom: '24px', borderLeft: '4px solid #1890ff' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <ExclamationCircleOutlined style={{ color: '#1890ff', fontSize: '20px', marginTop: '2px' }} />
              <div>
                <Title level={5} style={{ margin: '0 0 8px 0' }}>Important Information</Title>
                <Text type="secondary">
                  Always follow your doctor's instructions and complete the full course of medication. 
                  Contact your healthcare provider if you experience any side effects or have questions about your prescriptions.
                </Text>
              </div>
            </div>
          </Card>

          {/* Prescriptions Table */}
          <Card title="My Prescriptions">
            <Table
              columns={columns}
              dataSource={prescriptions}
              loading={isLoading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} prescriptions`,
              }}
            />
          </Card>

          {/* View Prescription Modal */}
          <Modal
            title="Prescription Details"
            open={isViewModalOpen}
            onCancel={() => {
              setIsViewModalOpen(false);
              setSelectedPrescription(null);
            }}
            footer={[
              <Button key="close" onClick={() => {
                setIsViewModalOpen(false);
                setSelectedPrescription(null);
              }}>
                Close
              </Button>
            ]}
            width={700}
          >
            {selectedPrescription && (
              <div>
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col span={12}>
                    <Text strong>Prescription ID:</Text> #{selectedPrescription.id}
                  </Col>
                  <Col span={12}>
                    <Text strong>Date:</Text> {formatDate(selectedPrescription.createdAt)}
                  </Col>
                </Row>
                
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col span={12}>
                    <Text strong>Doctor:</Text> {selectedPrescription.doctor?.fullName || 'Unknown'}
                  </Col>
                  <Col span={12}>
                    <Text strong>Status:</Text> 
                    <Tag color={selectedPrescription.isActive ? 'green' : 'red'} style={{ marginLeft: '8px' }}>
                      {selectedPrescription.isActive ? 'Active' : 'Inactive'}
                    </Tag>
                  </Col>
                </Row>

                <div style={{ marginBottom: '24px' }}>
                  <Text strong>Diagnosis:</Text>
                  <div style={{ marginTop: '8px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                    {selectedPrescription.diagnosis}
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <Text strong>Medications:</Text>
                  <div style={{ marginTop: '8px' }}>
                    {(() => {
                      try {
                        const medications = JSON.parse(selectedPrescription.medications);
                        return Array.isArray(medications) ? (
                          <List
                            dataSource={medications}
                            renderItem={(med: any) => (
                              <List.Item>
                                <Card size="small" style={{ width: '100%' }}>
                                  <Row gutter={[16, 8]}>
                                    <Col span={24}>
                                      <Text strong style={{ fontSize: '16px' }}>{med.name}</Text>
                                    </Col>
                                    <Col span={12}>
                                      <Text strong>Dosage:</Text> {med.dosage} {med.unit}
                                    </Col>
                                    <Col span={12}>
                                      <Text strong>Frequency:</Text> {med.frequency}
                                    </Col>
                                    <Col span={12}>
                                      <Text strong>Timing:</Text> {med.timing}
                                    </Col>
                                    <Col span={12}>
                                      <Text strong>Duration:</Text> {med.duration}
                                    </Col>
                                    {med.instructions && (
                                      <Col span={24}>
                                        <Text strong>Instructions:</Text> {med.instructions}
                                      </Col>
                                    )}
                                  </Row>
                                </Card>
                              </List.Item>
                            )}
                          />
                        ) : (
                          <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedPrescription.medications}
                          </div>
                        );
                      } catch {
                        return (
                          <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedPrescription.medications}
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                {selectedPrescription.instructions && (
                  <div style={{ marginBottom: '24px' }}>
                    <Text strong>General Instructions:</Text>
                    <div style={{ marginTop: '8px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                      {selectedPrescription.instructions}
                    </div>
                  </div>
                )}

                {selectedPrescription.followUpDate && (
                  <div>
                    <Text strong>Follow-up Date:</Text> {formatDate(selectedPrescription.followUpDate)}
                  </div>
                )}
              </div>
            )}
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
} 