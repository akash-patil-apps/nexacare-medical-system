import React, { useState, useMemo } from 'react';
import { Layout, Card, Row, Col, Space, Typography, Drawer, Tag, message } from 'antd';
import { ExperimentOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'wouter';
import { useAuth } from '../../hooks/use-auth';
import { PatientSidebar } from '../../components/layout/PatientSidebar';
import { TopHeader } from '../../components/layout/TopHeader';
import { useResponsive } from '../../hooks/use-responsive';
import LabReportViewerModal from '../../components/modals/lab-report-viewer-modal';
import { formatDateTime } from '../../lib/utils';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const fetchWithAuth = async <T,>(url: string): Promise<T> => {
  const token = localStorage.getItem('auth-token');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
};

export default function PatientLabReportsPage() {
  const { user, isLoading } = useAuth();
  const { isMobile } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['patient-lab-reports'],
    queryFn: () => fetchWithAuth<any[]>('/api/labs/patient/reports'),
    enabled: !!user,
  });

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
    message.warning('You do not have access to this page');
    return <Redirect to="/dashboard/patient" />;
  }

  const siderWidth = isMobile ? 0 : 80;

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
          <PatientSidebar selectedMenuKey="reports" />
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
          <PatientSidebar selectedMenuKey="reports" onMenuClick={() => setMobileDrawerOpen(false)} />
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
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 18 }}
                aria-label="Open menu"
              >
                <MenuUnfoldOutlined />
              </button>
            </div>
          )}

          <div style={{ background: '#fff', padding: 24, borderRadius: 8, marginBottom: 24 }}>
            <Title level={2} style={{ margin: '0 0 8px 0', color: '#1A8FE3' }}>
              <ExperimentOutlined style={{ marginRight: 8 }} />
              Lab Reports
            </Title>
            <Text type="secondary">View and download your lab test results</Text>
          </div>

          <Card loading={reportsLoading} title="All reports">
            {reports.length > 0 ? (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {reports.map((report: any) => (
                  <Card
                    key={report.id}
                    size="small"
                    style={{
                      border: '1px solid #E5E7EB',
                      cursor: 'pointer',
                      background: '#fff',
                    }}
                    styles={{ body: { padding: 12 } }}
                    hoverable
                    onClick={() => {
                      setSelectedReport(report);
                      setReportModalOpen(true);
                    }}
                  >
                    <Row justify="space-between" align="middle">
                      <Col flex="auto">
                        <Space direction="vertical" size={4}>
                          <Text strong>{report.testName}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {formatDateTime(report.reportDate)}
                          </Text>
                        </Space>
                      </Col>
                      <Col>
                        <Tag color="blue" style={{ borderRadius: 6, fontWeight: 500 }}>
                          {report.status || 'Completed'}
                        </Tag>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <ExperimentOutlined
                  style={{ fontSize: 48, color: '#9CA3AF', marginBottom: 16, display: 'block' }}
                />
                <Text type="secondary" style={{ fontSize: 14, color: '#9CA3AF' }}>
                  No lab reports yet. Results will appear here after your tests are completed and
                  released.
                </Text>
              </div>
            )}
          </Card>
        </Content>
      </Layout>

      <LabReportViewerModal
        open={reportModalOpen}
        onCancel={() => {
          setReportModalOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        loading={false}
      />
    </Layout>
  );
}
