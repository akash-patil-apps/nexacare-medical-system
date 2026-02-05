import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocation } from 'wouter';
import {
  Card,
  Descriptions,
  Typography,
  Spin,
  Button,
  Space,
  Select,
  List,
  Row,
  Col,
} from 'antd';
import { ArrowLeftOutlined, UserOutlined, TeamOutlined, PlusOutlined, SwapOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/use-auth';
import { useActingPatient } from '../hooks/use-acting-patient';
import AddFamilyMemberModal from '../components/profile/AddFamilyMemberModal';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const cardStyle = {
  borderRadius: 10,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  border: '1px solid #e8e8e8',
  height: '100%',
} as const;

const CARD_BODY = { padding: '16px 20px' } as const;

const PROFILE_ENDPOINTS: Record<string, string> = {
  PATIENT: '/api/patients/profile',
  DOCTOR: '/api/doctors/profile',
  RECEPTIONIST: '/api/reception/profile',
  HOSPITAL: '/api/onboarding/hospital/status',
  LAB: '/api/labs/profile',
  NURSE: '/api/nurses/profile',
  PHARMACIST: '/api/pharmacists/profile',
  RADIOLOGY_TECHNICIAN: '/api/radiology-technicians/profile',
};

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [actingPatientId, setActingPatientId] = useActingPatient();
  const [addFamilyModalOpen, setAddFamilyModalOpen] = useState(false);
  const role = user?.role?.toUpperCase() || '';

  const endpoint = PROFILE_ENDPOINTS[role];
  // Determine which profile to fetch: acting patient or own
  const targetPatientId = role === 'PATIENT' && actingPatientId ? actingPatientId : null;
  
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/profile', role, user?.id, targetPatientId],
    queryFn: async () => {
      if (!endpoint || !user) return null;
      const token = localStorage.getItem('auth-token');
      
      // If acting as a family member, fetch their profile
      if (role === 'PATIENT' && targetPatientId) {
        const res = await fetch(`/api/patients/profile-by-id/${targetPatientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error('Failed to load profile');
        }
        const data = await res.json();
        return { ...data, profile: data }; // Normalize structure
      }
      
      // Otherwise fetch own profile
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to load profile');
      }
      return res.json();
    },
    enabled: !!user && !!endpoint,
  });

  const myPatientId = role === 'PATIENT' && profileData?.id != null ? profileData.id : null;
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['/api/patients/family-members'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const res = await fetch('/api/patients/family-members', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: role === 'PATIENT' && !!user,
  });

  if (!authLoading && !user) {
    return <Redirect to="/login" />;
  }

  const loading = authLoading || profileLoading;
  const profile = profileData?.profile ?? profileData?.hospital ?? profileData;
  // Use acting patient's user info if available, otherwise fall back to logged-in user
  const displayUser = profileData?.user ?? user;
  const patientProfile = role === 'PATIENT' ? profileData : null;
  const myId = patientProfile?.id ?? myPatientId;

  const renderUserSection = () => (
    <Card
      title={<Space size={8}><UserOutlined style={{ color: '#1A8FE3', fontSize: 16 }} /> Account</Space>}
      style={cardStyle}
      bodyStyle={CARD_BODY}
    >
      <Descriptions column={1} size="small" colon={false} labelStyle={{ width: 100, color: '#8C8C8C' }}>
        <Descriptions.Item label="Full Name">
          <Text strong>{displayUser?.fullName ?? user?.fullName}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Email">{(displayUser?.email ?? user?.email) || '—'}</Descriptions.Item>
        <Descriptions.Item label="Mobile">{displayUser?.mobileNumber ?? (user as any)?.mobileNumber}</Descriptions.Item>
        <Descriptions.Item label="Role">{role?.replace('_', ' ')}</Descriptions.Item>
      </Descriptions>
    </Card>
  );

  const renderProfileFields = () => {
    if (!profile || typeof profile !== 'object') return null;
    const skipKeys = ['id', 'userId', 'user_id', 'hospitalId', 'hospital_id', 'createdAt', 'created_at', 'isVerified', 'isActive', 'approvalStatus'];
    const items = Object.entries(profile)
      .filter(([k, v]) => !skipKeys.includes(k) && v != null && v !== '')
      .map(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).replace(/_/g, ' ');
        let display: React.ReactNode = String(value);
        if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
          try {
            display = dayjs(value).format('DD MMM YYYY');
          } catch (_) {}
        }
        return <Descriptions.Item key={key} label={label}>{display}</Descriptions.Item>;
      });
    if (items.length === 0) return null;
    return (
      <Card
        title="Profile (from onboarding)"
        style={cardStyle}
        bodyStyle={CARD_BODY}
      >
        <Descriptions column={1} size="small" colon={false} labelStyle={{ width: 120, color: '#8C8C8C' }}>
          {items}
        </Descriptions>
      </Card>
    );
  };

  const goBack = () => {
    setLocation('/dashboard');
  };

  const switchOptions: { value: number; label: string }[] = [];
  if (myId != null) switchOptions.push({ value: myId, label: 'Self' });
  familyMembers.forEach((m: { relatedPatientId: number; relationship: string; fullName: string }) => {
    const label = `${m.relationship.charAt(0).toUpperCase() + m.relationship.slice(1)} (${m.fullName})`;
    switchOptions.push({ value: m.relatedPatientId, label });
  });

  return (
    <div
      className="medical-container"
      style={{
        padding: '16px 20px',
        maxWidth: '100%',
        width: '100%',
        minHeight: '100vh',
        boxSizing: 'border-box',
        display: 'block',
        alignItems: 'unset',
        justifyContent: 'unset',
        background: '#F3F4F6',
      }}
    >
      <div style={{ marginBottom: 24, paddingLeft: 0 }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={goBack} 
          style={{ 
            padding: '4px 8px',
            marginBottom: 16,
            fontSize: 14,
            color: '#6B7280',
            height: 'auto',
            lineHeight: '1.5'
          }}
        >
          Back to Dashboard
        </Button>
        <Title 
          level={2} 
          style={{ 
            margin: 0, 
            fontWeight: 700, 
            fontSize: 28, 
            color: '#111827',
            lineHeight: '1.2'
          }}
        >
          Profile
        </Title>
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} lg={role === 'PATIENT' ? 8 : 12}>
            {renderUserSection()}
          </Col>
          {role === 'PATIENT' && (
            <>
              <Col xs={24} lg={8}>
                <Card
                  title={<Space size={8}><TeamOutlined style={{ color: '#1A8FE3', fontSize: 16 }} /> Family members</Space>}
                  extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setAddFamilyModalOpen(true)} size="small">Add member</Button>}
                  style={cardStyle}
                  bodyStyle={CARD_BODY}
                >
                  {familyMembers.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 13 }}>No family members added yet. Add a member to book appointments on their behalf.</Text>
                  ) : (
                    <List
                      size="small"
                      dataSource={familyMembers}
                      renderItem={(m: { id: number; relationship: string; fullName: string; mobileNumber: string; email: string }) => (
                        <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <List.Item.Meta
                            title={<Text style={{ fontSize: 13 }}>{`${m.relationship.charAt(0).toUpperCase() + m.relationship.slice(1)} – ${m.fullName}`}</Text>}
                            description={<Text type="secondary" style={{ fontSize: 12 }}>{`${m.mobileNumber} • ${m.email}`}</Text>}
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
                <AddFamilyMemberModal
                  open={addFamilyModalOpen}
                  onClose={() => setAddFamilyModalOpen(false)}
                  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/patients/family-members'] })}
                />
              </Col>
            </>
          )}
          <Col xs={24} md={role === 'PATIENT' ? 24 : 12} lg={role === 'PATIENT' ? 24 : 12}>
            {renderProfileFields()}
          </Col>
        </Row>
      )}
    </div>
  );
}
