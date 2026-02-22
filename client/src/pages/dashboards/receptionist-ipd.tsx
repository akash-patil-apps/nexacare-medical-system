import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'wouter';
import { ConfigProvider, Layout, Card, Button, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getThemeForRole } from '../../antd.config';
import { FIGMA_COLORS, ROLE_PRIMARY } from '../../design-tokens';
import { useAuth } from '../../hooks/use-auth';
import { ReceptionistSidebar } from '../../components/layout/ReceptionistSidebar';
import { TopHeader } from '../../components/layout/TopHeader';
import { AdmissionModal, IpdEncountersList, TransferModal, DischargeModal } from '../../components/ipd';
import type { IpdEncounter } from '../../types/ipd';
import { useQueryClient } from '@tanstack/react-query';

const { Content } = Layout;
const { Text } = Typography;

const RECEPTIONIST_PRIMARY = ROLE_PRIMARY.receptionist;

export default function ReceptionistIpdPage() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState<IpdEncounter | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [hospitalId, setHospitalId] = useState<number | undefined>(undefined);

  const { data: profile } = useQuery({
    queryKey: ['/api/profile/me'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/profile/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!user && user.role?.toUpperCase() === 'RECEPTIONIST',
  });

  React.useEffect(() => {
    if (profile?.hospitalId) setHospitalId(profile.hospitalId);
  }, [profile?.hospitalId]);

  if (authLoading || !user) {
    return null;
  }
  if (user.role?.toUpperCase() !== 'RECEPTIONIST') {
    return <Redirect to="/dashboard/receptionist" />;
  }

  return (
    <ConfigProvider theme={getThemeForRole('receptionist')}>
      <Layout style={{ minHeight: '100vh', background: FIGMA_COLORS.backgroundPage }}>
        <ReceptionistSidebar selectedMenuKey="ipd" />
        <Layout>
          <TopHeader title="IPD Management" subtitle={profile?.hospitalName ?? 'NexaCare Medical Center'} rolePrimaryColor={RECEPTIONIST_PRIMARY} />
          <Content
            style={{
              padding: '24px 24px 0',
              overflow: 'auto',
            }}
          >
            <Card
              variant="borderless"
              style={{
                borderRadius: 16,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: `1px solid ${FIGMA_COLORS.border}`,
                background: FIGMA_COLORS.backgroundCard,
              }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <Text strong style={{ fontSize: 18, fontWeight: 600 }}>Active IPD Patients</Text>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsAdmissionModalOpen(true)}
                    style={{ borderRadius: 10 }}
                  >
                    Admit to IPD
                  </Button>
                </div>
              }
            >
              <IpdEncountersList
                hospitalId={hospitalId}
                onTransfer={(encounter: IpdEncounter) => {
                  setSelectedEncounter(encounter);
                  setIsTransferModalOpen(true);
                }}
                onDischarge={(encounter: IpdEncounter) => {
                  setSelectedEncounter(encounter);
                  setIsDischargeModalOpen(true);
                }}
              />
            </Card>
          </Content>
        </Layout>
      </Layout>

      <AdmissionModal
        open={isAdmissionModalOpen}
        onCancel={() => setIsAdmissionModalOpen(false)}
        onSuccess={() => {
          message.success('Patient admitted successfully');
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/beds/available'] });
          setIsAdmissionModalOpen(false);
        }}
        hospitalId={hospitalId}
        todayAppointments={[]}
      />

      <TransferModal
        open={isTransferModalOpen}
        onCancel={() => {
          setIsTransferModalOpen(false);
          setSelectedEncounter(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/beds/available'] });
          setIsTransferModalOpen(false);
          setSelectedEncounter(null);
        }}
        encounter={selectedEncounter}
      />

      <DischargeModal
        open={isDischargeModalOpen}
        onCancel={() => {
          setIsDischargeModalOpen(false);
          setSelectedEncounter(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/beds/available'] });
          setIsDischargeModalOpen(false);
          setSelectedEncounter(null);
        }}
        encounter={selectedEncounter}
      />
    </ConfigProvider>
  );
}
