import React, { useState, useMemo } from 'react';
import {
  Layout,
  Card,
  Typography,
  Upload,
  message as antdMessage,
  Button,
  Drawer,
  Space,
  Empty,
} from 'antd';
import { InboxOutlined, MenuUnfoldOutlined, FileTextOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'wouter';
import { useAuth } from '../../hooks/use-auth';
import { PatientSidebar } from '../../components/layout/PatientSidebar';
import { TopHeader } from '../../components/layout/TopHeader';
import { useResponsive } from '../../hooks/use-responsive';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Dragger } = Upload;

export default function PatientDocumentsPage() {
  const { user, isLoading } = useAuth();
  const { isMobile } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications/me'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const res = await fetch('/api/notifications/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }
  if (!isLoading && user && user.role?.toUpperCase() !== 'PATIENT') {
    antdMessage.warning('You do not have access to this page');
    return <Redirect to="/dashboard/patient" />;
  }

  const siderWidth = isMobile ? 0 : 80;

  const uploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    beforeUpload: () => {
      antdMessage.info('Document upload will be available once file storage is configured. Your files are not saved yet.');
      return Upload.LIST_IGNORE;
    },
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#F7FBFF' }}>
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
            borderRight: '1px solid #E5E7EB',
          }}
        >
          <PatientSidebar selectedMenuKey="dashboard" />
        </Sider>
      )}

      {isMobile && (
        <Drawer
          title="Navigation"
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          styles={{ body: { padding: 0 } }}
          width={260}
        >
          <PatientSidebar selectedMenuKey="dashboard" onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout style={{ marginLeft: siderWidth, minHeight: '100vh', background: '#F7FBFF' }}>
        <TopHeader
          userName={user?.fullName || 'User'}
          userRole="Patient"
          userId={useMemo(() => {
            if (user?.id) {
              const year = new Date().getFullYear();
              return `PAT-${year}-${String(user.id).padStart(3, '0')}`;
            }
            return 'PAT-2024-001';
          }, [user?.id])}
          userInitials={useMemo(() => {
            if (user?.fullName) {
              const names = user.fullName.split(' ');
              return names.length >= 2
                ? `${names[0][0]}${names[1][0]}`.toUpperCase()
                : user.fullName.substring(0, 2).toUpperCase();
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
            padding: isMobile ? '12px 12px 16px' : '12px 16px 20px',
          }}
        >
          {isMobile && (
            <div style={{ marginBottom: 16 }}>
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{ fontSize: 18 }}
              />
            </div>
          )}

          <div style={{ background: '#fff', padding: 24, borderRadius: 8, marginBottom: 24 }}>
            <Title level={2} style={{ margin: '0 0 8px 0', color: '#1A8FE3' }}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              My Documents
            </Title>
            <Text type="secondary">Upload and manage your medical documents (reports, referrals, etc.)</Text>
          </div>

          <Card title="Upload documents">
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 48, color: '#1A8FE3' }} />
              </p>
              <p className="ant-upload-text">Click or drag files here to upload</p>
              <p className="ant-upload-hint">Supports reports, referrals, and other medical documents. Storage integration coming soon.</p>
            </Dragger>
          </Card>

          <Card title="Uploaded documents" style={{ marginTop: 24 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No documents uploaded yet. Use the upload area above when storage is available."
            />
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
