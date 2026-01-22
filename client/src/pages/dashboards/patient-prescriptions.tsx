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
import { CopyIcon } from '../../components/common/CopyIcon';
import { PrescriptionPreview } from '../../components/prescription/PrescriptionPreview';
import dayjs from 'dayjs';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

export default function PatientPrescriptionsPage() {
  const { user } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
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
      width: 100,
      render: (id: number) => (
        <Space>
          <Text>#{id}</Text>
          <CopyIcon text={String(id)} label="Prescription ID" size={12} />
        </Space>
      ),
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
                  patientName={user?.fullName || 'Unknown'}
                  patientGender={user?.gender || 'M'}
                  patientAge={user?.dateOfBirth 
                    ? dayjs().diff(dayjs(user.dateOfBirth), 'year')
                    : undefined}
                  patientMobile={user?.mobileNumber}
                  patientAddress={user?.address}
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
        </Content>
      </Layout>
    </Layout>
  );
} 