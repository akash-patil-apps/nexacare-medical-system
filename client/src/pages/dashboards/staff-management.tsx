import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocation } from 'wouter';
import {
  Layout,
  Card,
  Table,
  Button,
  Space,
  Typography,
  message,
  Modal,
  Tabs,
  Tag,
  Spin,
  Row,
  Col,
  Statistic,
  Drawer,
} from 'antd';
import {
  TeamOutlined,
  UserAddOutlined,
  DeleteOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  IdcardOutlined,
  ExperimentOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { HospitalSidebar } from '../../components/layout/HospitalSidebar';
import { TopHeader } from '../../components/layout/TopHeader';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const hospitalTheme = {
  primary: '#7C3AED',
  secondary: '#0EA5E9',
  background: '#F6F2FF',
  highlight: '#EDE9FE',
};

type StaffRole = 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'radiology_technician';

interface StaffMember {
  id: number;
  userId: number;
  role: StaffRole;
  fullName: string;
  email: string;
  mobileNumber: string;
  [key: string]: unknown;
}

interface StaffData {
  doctors: StaffMember[];
  nurses: StaffMember[];
  receptionists: StaffMember[];
  pharmacists: StaffMember[];
  radiologyTechnicians: StaffMember[];
}

export default function StaffManagement() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { isMobile } = useResponsive();
  const queryClient = useQueryClient();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ role: StaffRole; id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<StaffRole>('doctor');

  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }
  if (!isLoading && user) {
    const role = user.role?.toUpperCase();
    if (role !== 'HOSPITAL' && role !== 'ADMIN') {
      message.warning('You do not have access to this page');
      return <Redirect to="/dashboard/hospital" />;
    }
  }

  const { data: staff = { doctors: [], nurses: [], receptionists: [], pharmacists: [], radiologyTechnicians: [] } as StaffData, isLoading: staffLoading } = useQuery({
    queryKey: ['/api/hospitals/my/staff'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const res = await fetch('/api/hospitals/my/staff', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load staff');
      return res.json();
    },
    enabled: !!user && (user.role?.toUpperCase() === 'HOSPITAL' || user.role?.toUpperCase() === 'ADMIN'),
  });

  const totalStaff = useMemo(() => {
    return (
      staff.doctors.length +
      staff.nurses.length +
      staff.receptionists.length +
      staff.pharmacists.length +
      staff.radiologyTechnicians.length
    );
  }, [staff]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('auth-token');
      const res = await fetch(`/api/hospitals/my/staff/${deleteModal.role}/${deleteModal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to remove staff');
      }
      message.success('Staff member removed');
      setDeleteModal(null);
      queryClient.invalidateQueries({ queryKey: ['/api/hospitals/my/staff'] });
    } catch (e: any) {
      message.error(e.message || 'Failed to remove staff');
    } finally {
      setDeleting(false);
    }
  };

  const columnsForRole = (role: StaffRole) => {
    const base = [
      { title: 'Name', dataIndex: 'fullName', key: 'fullName', render: (v: string) => v || '—' },
      { title: 'Email', dataIndex: 'email', key: 'email', render: (v: string) => v || '—' },
      { title: 'Mobile', dataIndex: 'mobileNumber', key: 'mobileNumber', render: (v: string) => v || '—' },
    ];
    if (role === 'doctor') {
      base.push({ title: 'Specialty', dataIndex: 'specialty', key: 'specialty', render: (v: string) => v || '—' });
      base.push({ title: 'License', dataIndex: 'licenseNumber', key: 'licenseNumber', render: (v: string) => v || '—' });
    }
    if (role === 'nurse') {
      base.push({ title: 'Degree', dataIndex: 'nursingDegree', key: 'nursingDegree', render: (v: string) => v || '—' });
      base.push({ title: 'License', dataIndex: 'licenseNumber', key: 'licenseNumber', render: (v: string) => v || '—' });
    }
    if (role === 'receptionist') {
      base.push({ title: 'Department', dataIndex: 'department', key: 'department', render: (v: string) => v || '—' });
      base.push({ title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId', render: (v: string) => v || '—' });
    }
    if (role === 'pharmacist') {
      base.push({ title: 'Degree', dataIndex: 'pharmacyDegree', key: 'pharmacyDegree', render: (v: string) => v || '—' });
      base.push({ title: 'License', dataIndex: 'licenseNumber', key: 'licenseNumber', render: (v: string) => v || '—' });
    }
    if (role === 'radiology_technician') {
      base.push({ title: 'Degree', dataIndex: 'radiologyDegree', key: 'radiologyDegree', render: (v: string) => v || '—' });
      base.push({ title: 'License', dataIndex: 'licenseNumber', key: 'licenseNumber', render: (v: string) => v || '—' });
    }
    base.push({
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: StaffMember) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => setDeleteModal({ role, id: record.id, name: record.fullName })}
        >
          Remove
        </Button>
      ),
    });
    return base;
  };

  const tabItems = [
    { key: 'doctor', label: 'Doctors', children: staff.doctors, icon: <MedicineBoxOutlined /> },
    { key: 'nurse', label: 'Nurses', children: staff.nurses, icon: <UserOutlined /> },
    { key: 'receptionist', label: 'Receptionists', children: staff.receptionists, icon: <IdcardOutlined /> },
    { key: 'pharmacist', label: 'Pharmacists', children: staff.pharmacists, icon: <MedicineBoxOutlined /> },
    { key: 'radiology_technician', label: 'Radiology Technicians', children: staff.radiologyTechnicians, icon: <ExperimentOutlined /> },
  ] as const;

  const siderWidth = isMobile ? 0 : 80;

  return (
    <Layout style={{ minHeight: '100vh', background: hospitalTheme.background }}>
      {isMobile && (
        <Drawer
          title="Menu"
          placement="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          width={260}
        >
          <HospitalSidebar selectedMenuKey="staff" onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}
      {!isMobile && (
        <Sider
          width={80}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            background: '#fff',
            zIndex: 10,
            boxShadow: '1px 0 4px rgba(0,0,0,0.04)',
          }}
        >
          <HospitalSidebar selectedMenuKey="staff" />
        </Sider>
      )}

      <Layout style={{ marginLeft: siderWidth, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <TopHeader
          userName={user?.fullName || 'Admin'}
          userRole={user?.role === 'ADMIN' ? 'Admin' : 'Hospital'}
          userId={user?.id ? `H-${user.id}` : 'H-001'}
          userInitials={user?.fullName ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'AD'}
          notificationCount={0}
        />

        <Content
          style={{
            padding: isMobile ? 12 : 24,
            background: hospitalTheme.background,
            flex: 1,
            overflow: 'auto',
          }}
        >
          {isMobile && (
            <Button
              type="text"
              icon={<MenuUnfoldOutlined />}
              onClick={() => setMobileDrawerOpen(true)}
              style={{ marginBottom: 16 }}
            />
          )}

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <Statistic
                  title="Total staff"
                  value={totalStaff}
                  prefix={<TeamOutlined style={{ color: hospitalTheme.primary }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <Statistic title="Doctors" value={staff.doctors.length} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <Statistic title="Nurses" value={staff.nurses.length} />
              </Card>
            </Col>
          </Row>

          <Card
            title={
              <Space>
                <TeamOutlined style={{ color: hospitalTheme.primary }} />
                <Title level={5} style={{ margin: 0 }}>
                  Staff management
                </Title>
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setLocation('/register/with-role')}
              >
                Add staff
              </Button>
            }
            style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Add new staff via Register with role. Remove staff below to deactivate them from this hospital.
            </Text>
            {staffLoading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <Spin size="large" />
              </div>
            ) : (
              <Tabs
                activeKey={activeTab}
                onChange={(k) => setActiveTab(k as StaffRole)}
                items={tabItems.map(({ key, label, children, icon }) => ({
                  key,
                  label: (
                    <span>
                      {icon} {label} <Tag>{children.length}</Tag>
                    </span>
                  ),
                  children: (
                    <Table
                      rowKey="id"
                      dataSource={children}
                      columns={columnsForRole(key)}
                      pagination={{ pageSize: 10 }}
                      size="small"
                    />
                  ),
                }))}
              />
            )}
          </Card>
        </Content>
      </Layout>

      <Modal
        title="Remove staff member"
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        onOk={handleDelete}
        confirmLoading={deleting}
        okText="Remove"
        okButtonProps={{ danger: true }}
      >
        {deleteModal && (
          <p>
            Remove <strong>{deleteModal.name}</strong> from this hospital? They will be deactivated/unlinked from your staff list.
          </p>
        )}
      </Modal>
    </Layout>
  );
}
