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
  Modal,
  Drawer
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
import { useState, useMemo } from 'react';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from '../../lib/queryClient';
import { formatDate } from '../../lib/utils';
import { PatientSidebar } from '../../components/layout/PatientSidebar';
import { TopHeader } from '../../components/layout/TopHeader';
import { useResponsive } from '../../hooks/use-responsive';
import { MenuUnfoldOutlined } from '@ant-design/icons';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function PatientPrescriptionsPage() {
  const { user } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Get notifications for TopHeader
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
  });
  
  const siderWidth = isMobile ? 0 : 80; // Narrow sidebar width matching PatientSidebar

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
    <Layout style={{ minHeight: '100vh', background: '#F7FBFF' }}>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <Sider
          width={80}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            background: '#fff',
            boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            borderRight: '1px solid #E5E7EB',
          }}
        >
          <PatientSidebar selectedMenuKey="prescriptions" />
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title="Navigation"
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          styles={{ body: { padding: 0 } }}
          width={260}
        >
          <PatientSidebar selectedMenuKey="prescriptions" onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: '#F7FBFF',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        {/* TopHeader - Matching Patient Dashboard Design */}
        <TopHeader
          userName={user?.fullName || 'User'}
          userRole="Patient"
          userId={useMemo(() => {
            if (user?.id) {
              const year = new Date().getFullYear();
              const idNum = String(user.id).padStart(3, '0');
              return `PAT-${year}-${idNum}`;
            }
            return 'PAT-2024-001';
          }, [user?.id])}
          userInitials={useMemo(() => {
            if (user?.fullName) {
              const names = user.fullName.split(' ');
              if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
              }
              return user.fullName.substring(0, 2).toUpperCase();
            }
            return 'UP';
          }, [user?.fullName])}
          notificationCount={notifications.filter((n: any) => !n.isRead).length}
        />

        <Content
          style={{
            background: '#F7FBFF',
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
            // Responsive padding - reduced to save side space
            padding: isMobile 
              ? '12px 12px 16px'
              : isTablet 
                ? '12px 16px 20px'
                : '12px 16px 20px',
            margin: 0,
            width: '100%',
          }}
        >
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
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
            <Title level={2} style={{ margin: '0 0 16px 0', color: '#1890ff' }}>
              <FileTextOutlined style={{ marginRight: '8px' }} />
              My Prescriptions
            </Title>
            <Text type="secondary">View and download your prescriptions</Text>
          </div>

          {/* Quick Stats */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
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