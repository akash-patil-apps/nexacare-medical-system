import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button, Typography, Space, App, Tag } from 'antd';
import { OnboardingStepsLayout } from "../../components/onboarding/OnboardingStepsLayout";

const { Text } = Typography;

const REG_STEPS = [{ title: 'Choose Your Role' }];

const roleCardStyle = (active: boolean, disabled: boolean) => ({
  width: 140,
  minHeight: 160,
  padding: '16px 12px',
  borderRadius: 14,
  border: active && !disabled ? '2px solid #059669' : '1px solid #E5E7EB',
  background: disabled ? '#F7F8FA' : active ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' : '#fff',
  boxShadow: active && !disabled ? '0 4px 16px rgba(5, 150, 105, 0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease',
  outline: 'none' as const,
});

const roleEmojiBox = (disabled: boolean) => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  background: disabled ? 'rgba(0,0,0,0.06)' : 'linear-gradient(135deg, rgba(5, 150, 105, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
});

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
    <OnboardingStepsLayout
      steps={REG_STEPS}
      currentStepIndex={0}
      stepTitle="Choose Your Role"
      stepNote="Tell us who you are so we can tailor the onboarding experience to your workflow."
      onBack={() => setLocation('/login')}
      showHelpLink={false}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 12,
          padding: '8px 0',
          minHeight: 0,
        }}
      >
        {ROLE_OPTIONS.map((role) => {
          const active = role.key === selectedRole;
          const disabled = !role.available;
          return (
            <button
              key={role.key}
              type="button"
              style={roleCardStyle(active, disabled)}
              onClick={() => handleSelect(role.key)}
              disabled={disabled}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.boxShadow = active ? '0 8px 24px rgba(5, 150, 105, 0.2)' : '0 4px 16px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = active && !disabled ? '0 4px 16px rgba(5, 150, 105, 0.15)' : '0 2px 8px rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={roleEmojiBox(disabled)}>{role.emoji}</div>
              <Space direction="vertical" size={4} style={{ textAlign: 'center' }}>
                <Text strong style={{ color: disabled ? '#BFBFBF' : '#111827', fontSize: 14 }}>
                  {role.label}
                </Text>
                <Text style={{ fontSize: 12, color: disabled ? '#BFBFBF' : '#6B7280' }}>
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
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button size="large" onClick={() => setLocation('/login')} style={{ borderRadius: 12 }}>
          Back to Login
        </Button>
        <div />
      </div>
    </OnboardingStepsLayout>
  );
}
