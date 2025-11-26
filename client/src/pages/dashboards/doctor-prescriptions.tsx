import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  Tag, 
  Space, 
  Typography,
  Avatar,
  Menu,
  Dropdown,
  Badge,
  List,
  Modal,
  Form,
  Input,
  Select,
  Table,
  Popconfirm,
  App
} from 'antd';
import { 
  UserOutlined, 
  MedicineBoxOutlined, 
  FileTextOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import PrescriptionForm from '../../components/prescription-form';
import { apiRequest } from '../../lib/queryClient';
import { formatDate } from '../../lib/utils';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function DoctorPrescriptionsPage() {
  const { message } = App.useApp();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
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
      type: 'divider' as const,
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
  const { data: prescriptions = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/prescriptions/doctor'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/prescriptions/doctor');
      return response.json();
    },
  });

  const handleEditPrescription = (prescription: any) => {
    setSelectedPrescription(prescription);
    setIsPrescriptionModalOpen(true);
  };

  const handleViewPrescription = (prescription: any) => {
    setSelectedPrescription(prescription);
    setIsViewModalOpen(true);
  };

  const handleDeletePrescription = async (prescriptionId: number) => {
    try {
      await apiRequest('DELETE', `/prescriptions/${prescriptionId}`);
      message.success('Prescription deleted successfully');
      refetch();
    } catch (error) {
      message.error('Failed to delete prescription');
    }
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
      title: 'Patient',
      dataIndex: 'patient',
      key: 'patient',
      render: (patient: any) => patient?.fullName || 'Unknown',
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
      width: 150,
      render: (_, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewPrescription(record)}
            title="View"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditPrescription(record)}
            title="Edit"
          />
          <Popconfirm
            title="Delete prescription?"
            description="Are you sure you want to delete this prescription?"
            onConfirm={() => handleDeletePrescription(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="Delete"
            />
          </Popconfirm>
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
            <Badge count={5} size="small">
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <Title level={2} style={{ margin: '0 0 8px 0', color: '#1890ff' }}>
                  <FileTextOutlined style={{ marginRight: '8px' }} />
                  Prescriptions
                </Title>
                <Text type="secondary">Manage patient prescriptions</Text>
              </div>
              <Space>
                <Button icon={<DownloadOutlined />}>
                  Export
                </Button>
                <Button icon={<UploadOutlined />}>
                  Import
                </Button>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setIsPrescriptionModalOpen(true)}
                >
                  New Prescription
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
                  value={156}
                  prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="This Month"
                  value={42}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Pending"
                  value={8}
                  prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Today"
                  value={12}
                  prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* Prescriptions Table */}
          <Card title="Prescription Management">
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

          {/* Prescription Form Modal */}
          <PrescriptionForm
            isOpen={isPrescriptionModalOpen}
            onClose={() => {
              setIsPrescriptionModalOpen(false);
              setSelectedPrescription(null);
            }}
            prescription={selectedPrescription}
            doctorId={user?.id}
            hospitalId={user?.hospitalId}
          />

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
                    <Text strong>Patient:</Text> {selectedPrescription.patient?.fullName || 'Unknown'}
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