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
  EyeOutlined,
  CalendarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import PrescriptionForm from '../../components/prescription-form';
import { apiRequest } from '../../lib/queryClient';
import { formatDate } from '../../lib/utils';
import { TopHeader } from '../../components/layout/TopHeader';
import { useResponsive } from '../../hooks/use-responsive';
import { useLocation } from 'wouter';
import { CopyIcon } from '../../components/common/CopyIcon';
import { Drawer, Button } from 'antd';
import { MenuUnfoldOutlined } from '@ant-design/icons';
import { PrescriptionPreview } from '../../components/prescription/PrescriptionPreview';
import dayjs from 'dayjs';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function DoctorPrescriptionsPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Fetch lab tests for selected prescription
  const { data: labTests } = useQuery({
    queryKey: ['/api/labs/reports', selectedPrescription?.patientId],
    queryFn: async () => {
      if (!selectedPrescription?.patientId) return [];
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/labs/reports?patientId=${selectedPrescription.patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) return [];
      const data = await response.json();
      // Filter for tests related to this prescription/appointment
      return data.filter((test: any) => 
        test.appointmentId === selectedPrescription.appointmentId ||
        (test.status === 'recommended' || test.status === 'pending')
      );
    },
    enabled: !!selectedPrescription?.patientId,
  });

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
  
  // Sidebar content component - matching doctor dashboard
  const SidebarContent = ({ onMenuClick }: { onMenuClick?: () => void }) => {
    const handleMenuClick = (key: string) => {
      if (onMenuClick) onMenuClick();
      switch (key) {
        case 'dashboard':
          setLocation('/dashboard/doctor');
          break;
        case 'appointments':
          setLocation('/dashboard/doctor/appointments');
          break;
        case 'patients':
          message.info('Patients page coming soon.');
          break;
        case 'prescriptions':
          setLocation('/dashboard/doctor/prescriptions');
          break;
        case 'reports':
          message.info('Lab Reports page coming soon.');
          break;
        case 'ipd':
          message.info('IPD Patients page coming soon.');
          break;
        case 'availability':
          message.info('Availability page coming soon.');
          break;
        default:
          break;
      }
    };

    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        background: '#fff',
        width: '80px',
        alignItems: 'center',
        padding: '16px 0',
        gap: '12px',
        borderRight: '1px solid #E5E7EB',
      }}>
        <Button
          type="text"
          icon={<UserOutlined style={{ fontSize: '20px', color: '#1A8FE3' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#E3F2FF',
            borderRadius: '8px',
          }}
          onClick={() => message.info('Profile coming soon.')}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, alignItems: 'center' }}>
          <Button
            type="text"
            icon={<UserOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('dashboard')}
          />
          <Button
            type="text"
            icon={<CalendarOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('appointments')}
          />
          <Button
            type="text"
            icon={<TeamOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('patients')}
          />
          <Button
            type="text"
            icon={<MedicineBoxOutlined style={{ fontSize: '20px', color: '#1A8FE3' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#E3F2FF',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('prescriptions')}
          />
          <Button
            type="text"
            icon={<FileTextOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('reports')}
          />
          <Button
            type="text"
            icon={<TeamOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('ipd')}
          />
          <Button
            type="text"
            icon={<SettingOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('availability')}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => message.info('Notifications coming soon.')}
          />
          <Button
            type="text"
            icon={<SettingOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => message.info('Settings coming soon.')}
          />
        </div>
      </div>
    );
  };

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
      width: 100,
      render: (id: number) => (
        <Space>
          <Text>#{id}</Text>
          <CopyIcon text={String(id)} label="Prescription ID" size={12} />
        </Space>
      ),
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
    <Layout style={{ minHeight: '100vh', background: '#F5F7FF' }}>
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
          styles={{ body: { padding: 0 } }}
          width={260}
        >
          <SidebarContent onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: '#F5F7FF',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        {/* TopHeader - Matching Patient Dashboard Design */}
        <TopHeader
          userName={user?.fullName || 'Doctor'}
          userRole="Doctor"
          userId={(() => {
            if (user?.id) {
              const year = new Date().getFullYear();
              const idNum = String(user.id).padStart(3, '0');
              return `DOC-${year}-${idNum}`;
            }
            return 'DOC-2024-001';
          })()}
          userInitials={(() => {
            if (user?.fullName) {
              const names = user.fullName.split(' ');
              if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
              }
              return user.fullName.substring(0, 2).toUpperCase();
            }
            return 'DR';
          })()}
          notificationCount={notifications.filter((n: any) => !n.isRead).length}
        />

        <Content
          style={{
            background: '#F5F7FF',
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

          <div style={{ paddingBottom: 24 }}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, border: '1px solid #E5E7EB' }}>
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
            width={900}
          >
            {selectedPrescription && (() => {
              // Parse medications
              let medications: any[] = [];
              try {
                medications = JSON.parse(selectedPrescription.medications);
                if (!Array.isArray(medications)) medications = [];
              } catch {
                medications = [];
              }

              // Parse instructions to extract chief complaints, clinical findings, advice
              let chiefComplaints: string[] = [];
              let clinicalFindings: string[] = [];
              let advice: string[] = [];
              
              try {
                if (selectedPrescription.instructions) {
                  const parsed = JSON.parse(selectedPrescription.instructions);
                  if (parsed.chiefComplaints) chiefComplaints = parsed.chiefComplaints;
                  if (parsed.clinicalFindings) clinicalFindings = parsed.clinicalFindings;
                  if (parsed.advice) advice = parsed.advice;
                }
              } catch {
                // If not JSON, treat as plain text advice
                if (selectedPrescription.instructions) {
                  advice = [selectedPrescription.instructions];
                }
              }

              return (
                <PrescriptionPreview
                  hospitalName={selectedPrescription.hospital?.name}
                  hospitalAddress={selectedPrescription.hospital?.address}
                  doctorName={selectedPrescription.doctor?.fullName || 'Dr. Unknown'}
                  doctorQualification="M.S."
                  doctorRegNo="MMC 2018"
                  patientId={selectedPrescription.patientId}
                  patientName={selectedPrescription.patient?.fullName || 'Unknown'}
                  patientGender={selectedPrescription.patient?.user?.gender || 'M'}
                  patientAge={selectedPrescription.patient?.user?.dateOfBirth 
                    ? dayjs().diff(dayjs(selectedPrescription.patient.user.dateOfBirth), 'year')
                    : undefined}
                  patientMobile={selectedPrescription.patient?.user?.mobileNumber}
                  patientAddress={selectedPrescription.patient?.user?.address}
                  weight={selectedPrescription.patient?.weight}
                  height={selectedPrescription.patient?.height}
                  date={selectedPrescription.createdAt}
                  chiefComplaints={chiefComplaints}
                  clinicalFindings={clinicalFindings}
                  diagnosis={selectedPrescription.diagnosis}
                  medications={medications}
                  labTests={labTests?.map((test: any) => ({
                    testName: test.testName,
                    testType: test.testType,
                  })) || []}
                  advice={advice}
                  followUpDate={selectedPrescription.followUpDate}
                />
              );
            })()}
          </Modal>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}