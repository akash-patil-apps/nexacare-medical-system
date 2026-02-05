import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'wouter';
import {
  Layout,
  Card,
  Input,
  Table,
  Typography,
  Button,
  Space,
  message,
} from 'antd';
import { SearchOutlined, PhoneOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/use-auth';
import { ReceptionistSidebar } from '../components/layout/ReceptionistSidebar';
import { TopHeader } from '../components/layout/TopHeader';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const SIDER_WIDTH = 80;
const receptionistBackground = '#F3F4F6';

interface SearchResult {
  userId: number;
  patientId: number | null;
  fullName: string;
  mobileNumber: string;
  email?: string;
}

export default function ContactDirectoryPage() {
  const { user, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: results = [], isLoading: searchLoading, error: searchError } = useQuery({
    queryKey: ['/api/reception/patients/search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('Authentication required');
      }
      const res = await fetch(
        `/api/reception/patients/search?q=${encodeURIComponent(debouncedQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Search failed');
      }
      const data = await res.json();
      return data as SearchResult[];
    },
    enabled: !!user && user?.role?.toUpperCase() === 'RECEPTIONIST' && debouncedQuery.length >= 2,
    retry: 1,
  });

  React.useEffect(() => {
    if (searchError) {
      message.error(searchError instanceof Error ? searchError.message : 'Search failed. Please try again.');
    }
  }, [searchError]);

  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }
  if (!isLoading && user && user.role?.toUpperCase() !== 'RECEPTIONIST') {
    message.warning('Only receptionists can access the contact directory');
    return <Redirect to="/dashboard" />;
  }

  const columns = [
    {
      title: 'Patient ID',
      dataIndex: 'patientId',
      key: 'patientId',
      width: 100,
      render: (id: number | null) => (id != null ? <Text strong>#{id}</Text> : '—'),
    },
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (name: string) => (
        <Space>
          <UserOutlined style={{ color: '#8C8C8C' }} />
          <Text>{name || '—'}</Text>
        </Space>
      ),
    },
    {
      title: 'Mobile',
      dataIndex: 'mobileNumber',
      key: 'mobileNumber',
      render: (mobile: string) => (
        <Space>
          <Text copyable={{ text: mobile }}>{mobile || '—'}</Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: SearchResult) => (
        <Space size="middle">
          <Button
            type="primary"
            size="middle"
            icon={<PhoneOutlined />}
            href={`tel:${record.mobileNumber || ''}`}
            style={{
              borderRadius: 6,
              fontWeight: 500,
            }}
          >
            Call
          </Button>
          <Button
            size="middle"
            icon={<MessageOutlined />}
            href={`sms:${record.mobileNumber || ''}`}
            style={{
              borderRadius: 6,
              fontWeight: 500,
            }}
          >
            Message
          </Button>
        </Space>
      ),
    },
  ];

  const userId = useMemo(() => {
    if (user?.id) {
      const year = new Date().getFullYear();
      const idNum = String(user.id).padStart(3, '0');
      return `REC-${year}-${idNum}`;
    }
    return 'REC-2024-001';
  }, [user?.id]);

  const userInitials = useMemo(() => {
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.fullName.substring(0, 2).toUpperCase();
    }
    return 'RC';
  }, [user?.fullName]);

  return (
    <Layout
      className="receptionist-contact-directory-wrapper"
      style={{
        minHeight: '100vh',
        width: '100%',
        background: receptionistBackground,
      }}
    >
      <Sider
        width={SIDER_WIDTH}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: SIDER_WIDTH,
          background: '#fff',
          boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          borderRight: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}
      >
        <ReceptionistSidebar selectedMenuKey="contacts" />
      </Sider>
      <Layout
        style={{
          marginLeft: SIDER_WIDTH,
          minHeight: '100vh',
          background: receptionistBackground,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: `calc(100% - ${SIDER_WIDTH}px)`,
        }}
      >
        <TopHeader
          userName={user?.fullName || 'Receptionist'}
          userRole="Receptionist"
          userId={userId}
          userInitials={userInitials}
        />
        <Content
          style={{
            padding: '16px 24px 24px 20px',
            overflow: 'auto',
            background: receptionistBackground,
            flex: 1,
            display: 'block',
            margin: 0,
            minHeight: 0,
          }}
        >
          <Card
            style={{ 
              borderRadius: 16, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              background: '#FFFFFF',
              border: 'none'
            }}
            bodyStyle={{ padding: 32 }}
          >
            <div style={{ marginBottom: 24 }}>
              <Title level={2} style={{ margin: 0, marginBottom: 8, fontSize: 24, fontWeight: 700, color: '#111827' }}>
                Contact Directory
              </Title>
              <Text type="secondary" style={{ fontSize: 14, color: '#6B7280' }}>
                Search by patient name, patient ID, or mobile number. Use Call or Message to contact the patient.
              </Text>
            </div>
            <div style={{ marginBottom: 24 }}>
              <Input
                placeholder="Search by name, patient ID, or mobile number..."
                prefix={<SearchOutlined style={{ color: '#8C8C8C' }} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                size="large"
                style={{ 
                  maxWidth: 600,
                  borderRadius: 8,
                  height: 48
                }}
              />
            </div>
            <Table
              columns={columns}
              dataSource={results}
              rowKey={(r) => `${r.userId}-${r.patientId ?? 'u'}`}
              loading={searchLoading}
              pagination={results.length > 10 ? { 
                pageSize: 10,
                showSizeChanger: false,
                showTotal: (total) => `Total ${total} patients`
              } : false}
              locale={{
                emptyText: debouncedQuery.length < 2
                  ? <div style={{ padding: '40px 0', textAlign: 'center', color: '#8C8C8C' }}>
                      <SearchOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
                      <div style={{ fontSize: 16 }}>Type at least 2 characters to search</div>
                    </div>
                  : <div style={{ padding: '40px 0', textAlign: 'center', color: '#8C8C8C' }}>
                      <UserOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
                      <div style={{ fontSize: 16 }}>No patients found</div>
                      <div style={{ fontSize: 14, marginTop: 8, opacity: 0.7 }}>Try a different search term</div>
                    </div>,
              }}
              style={{
                background: '#FFFFFF',
              }}
            />
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
