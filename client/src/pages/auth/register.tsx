import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, Button, Typography, Space, App, Tag } from 'antd';
import { ArrowLeftOutlined, UserOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const PAGE_STYLES = {
  wrapper: {
    minHeight: '100vh',
    maxHeight: '100vh',
    background: 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    boxSizing: 'border-box' as const,
  },
  card: {
    width: '100%',
    maxWidth: 960,
    maxHeight: 'calc(100vh - 32px)',
    borderRadius: 24,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    overflow: 'hidden' as const,
    display: 'flex' as const,
    flexDirection: 'column' as const,
  },
  cardBody: {
    padding: '16px 24px 20px',
    flex: 1,
    minHeight: 0,
    display: 'flex' as const,
    flexDirection: 'column' as const,
  },
  headerArea: {
    background: 'linear-gradient(135deg, #FAFAFA 0%, #FFFFFF 100%)',
    padding: '12px 24px 16px',
    borderBottom: '1px solid #F0F0F0',
    flexShrink: 0,
  },
  iconBox: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #1A8FE3 0%, #10B981 100%)',
    marginBottom: 8,
    boxShadow: '0 2px 8px rgba(26, 143, 227, 0.25)',
  },
  progressDot: (active: boolean) => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: active ? 'linear-gradient(135deg, #1A8FE3 0%, #10B981 100%)' : '#D9D9D9',
    display: 'inline-block',
  }),
  roleCard: (active: boolean, disabled: boolean) => ({
    width: 140,
    minHeight: 160,
    padding: '16px 12px',
    borderRadius: 14,
    border: active && !disabled ? '2px solid #1A8FE3' : '1px solid #F0F0F0',
    background: disabled ? '#F7F8FA' : active ? 'linear-gradient(135deg, #F0F8FF 0%, #E8F5E9 100%)' : '#FFFFFF',
    boxShadow: active && !disabled ? '0 6px 20px rgba(26, 143, 227, 0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  }),
  roleEmojiBox: (disabled: boolean) => ({
    width: 40,
    height: 40,
    borderRadius: 10,
    background: disabled ? 'rgba(0,0,0,0.06)' : 'linear-gradient(135deg, rgba(26, 143, 227, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
  }),
};

type RoleOption = {
  key: string;
  label: string;
  caption: string;
  emoji: string;
  route?: string;
  available?: boolean;
};

const ROLE_OPTIONS: RoleOption[] = [
  { key: 'patient', label: "I'm a Patient", caption: 'Access appointments and prescriptions', emoji: '🙂', route: '/onboarding/patient', available: true },
  { key: 'doctor', label: "I'm a Doctor", caption: 'Manage clinical workflows', emoji: '🩺', route: '/onboarding/doctor', available: true },
  { key: 'hospital', label: 'I manage a Hospital', caption: 'Create hospital profile & onboard team', emoji: '🏥', route: '/onboarding/hospital', available: true },
  { key: 'lab', label: 'I run a Lab', caption: 'Publish diagnostics & reports', emoji: '🧪', route: '/onboarding/lab', available: true },
  { key: 'receptionist', label: "I'm a Receptionist", caption: 'Assist patients & manage walk-ins', emoji: '💼', route: '/onboarding/receptionist', available: true },
  { key: 'nurse', label: "I'm a Nurse", caption: 'Provide patient care & monitor vitals', emoji: '👩‍⚕️', route: '/onboarding/nurse', available: true },
  { key: 'pharmacist', label: "I'm a Pharmacist", caption: 'Manage medications & prescriptions', emoji: '💊', route: '/onboarding/pharmacist', available: true },
  { key: 'radiology_technician', label: 'I am a Radiology Technician', caption: 'Perform imaging & manage equipment', emoji: '🩻', route: '/onboarding/radiology-technician', available: true },
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { message } = App.useApp();
  const availableKeys = useMemo(() => ROLE_OPTIONS.filter((r) => r.available).map((r) => r.key), []);
  const [selectedRole, setSelectedRole] = useState<string>(availableKeys[0] ?? ROLE_OPTIONS[0].key);

  const selectedIndex = ROLE_OPTIONS.findIndex((role) => role.key === selectedRole);

  const handleSelect = (key: string) => {
    setSelectedRole(key);
    const role = ROLE_OPTIONS.find((item) => item.key === key);
    if (!role) return;
    if (!role.available) {
      message.info('Registration for this role is coming soon.');
    } else {
      setLocation(`/register/with-role?role=${key}`);
    }
  };

  return (
    <div style={PAGE_STYLES.wrapper}>
      <div style={{ width: '100%', maxWidth: 960, maxHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <Card
          style={PAGE_STYLES.card}
          bodyStyle={PAGE_STYLES.cardBody}
        >
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => setLocation('/login')}
            aria-label="Back to login"
            style={{
              marginBottom: 8,
              padding: 0,
              height: 'auto',
              color: '#8C8C8C',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
            }}
          >
            Back
          </Button>

          <div style={{ ...PAGE_STYLES.headerArea, textAlign: 'center' }}>
            <div style={PAGE_STYLES.iconBox}>
              <UserOutlined style={{ fontSize: 20, color: '#FFFFFF' }} />
            </div>
            <Title level={2} style={{ margin: 0, marginBottom: 4, fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>
              Choose Your Role
            </Title>
            <Text style={{ fontSize: 13, color: '#8C8C8C', display: 'block', maxWidth: 420, margin: '0 auto 8px', lineHeight: 1.4 }}>
              Tell us who you are so we can tailor the onboarding experience to your workflow.
            </Text>
            <Space size={6}>
              {ROLE_OPTIONS.slice(0, 4).map((_, idx) => (
                <span
                  key={idx}
                  style={PAGE_STYLES.progressDot(idx === Math.min(selectedIndex, 3))}
                />
              ))}
            </Space>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 12,
              padding: '16px 8px 8px',
              minHeight: 0,
              overflow: 'auto',
            }}
          >
            {ROLE_OPTIONS.map((role) => {
              const active = role.key === selectedRole;
              const disabled = !role.available;
              return (
                <button
                  key={role.key}
                  type="button"
                  style={PAGE_STYLES.roleCard(active, disabled)}
                  onClick={() => handleSelect(role.key)}
                  disabled={disabled}
                  onMouseEnter={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.boxShadow = active ? '0 12px 28px rgba(26, 143, 227, 0.28)' : '0 4px 16px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = active && !disabled ? '0 8px 24px rgba(26, 143, 227, 0.2)' : '0 2px 8px rgba(0,0,0,0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={PAGE_STYLES.roleEmojiBox(disabled)}>{role.emoji}</div>
                  <Space direction="vertical" size={4} style={{ textAlign: 'center' }}>
                    <Text strong style={{ color: disabled ? '#BFBFBF' : '#262626', fontSize: 14 }}>
                      {role.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: disabled ? '#BFBFBF' : '#8C8C8C' }}>
                      {role.caption}
                    </Text>
                  </Space>
                  {!role.available && (
                    <Tag color="default" style={{ marginTop: 4 }}>Coming Soon</Tag>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
