import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, Button, Typography, Space, App, Tag } from 'antd';
import { LeftOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

type RoleOption = {
  key: string;
  label: string;
  caption: string;
  emoji: string;
  route?: string;
  available?: boolean;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    key: 'patient',
    label: "I'm a Patient",
    caption: 'Access appointments and prescriptions',
    emoji: '🙂',
    available: false,
  },
  {
    key: 'doctor',
    label: "I'm a Doctor",
    caption: 'Manage clinical workflows',
    emoji: '🩺',
    available: false,
  },
  {
    key: 'hospital',
    label: 'I manage a Hospital',
    caption: 'Create hospital profile & onboard team',
    emoji: '🏥',
    route: '/onboarding/hospital',
    available: true,
  },
  {
    key: 'lab',
    label: 'I run a Lab',
    caption: 'Publish diagnostics & reports',
    emoji: '🧪',
    available: false,
  },
  {
    key: 'receptionist',
    label: "I'm a Receptionist",
    caption: 'Assist patients & manage walk-ins',
    emoji: '💼',
    available: false,
  },
  {
    key: 'nurse',
    label: "I'm a Nurse",
    caption: 'Provide patient care & monitor vitals',
    emoji: '👩‍⚕️',
    route: '/onboarding/nurse',
    available: true,
  },
  {
    key: 'pharmacist',
    label: "I'm a Pharmacist",
    caption: 'Manage medications & prescriptions',
    emoji: '💊',
    route: '/onboarding/pharmacist',
    available: true,
  },
  {
    key: 'radiology_technician',
    label: 'I am a Radiology Technician',
    caption: 'Perform imaging & manage equipment',
    emoji: '🩻',
    route: '/onboarding/radiology-technician',
    available: true,
  },
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
    if (!role.available || !role.route) {
      message.info('Onboarding for this role is coming soon.');
    } else {
      setLocation(role.route);
    }
  };

  const renderProgressDots = () => (
    <Space size={8} style={{ marginBottom: 16 }}>
      {ROLE_OPTIONS.slice(0, 4).map((_, idx) => (
        <span
          key={idx}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: idx === Math.min(selectedIndex, 3) ? '#1890ff' : 'rgba(255,255,255,0.35)',
            display: 'inline-block',
          }}
        />
      ))}
    </Space>
  );

  return (
    <div className="medical-container">
      <div className="medical-container__inner">
        <Card
          className="medical-card"
          style={{
            borderRadius: 18,
            width: '100%',
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => setLocation('/login')}
            className="role-selection-back"
            aria-label="Back to login"
            style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            Back
          </Button>
          <Space direction="vertical" align="center" style={{ width: '100%' }}>
            <Title level={3} style={{ marginBottom: 4 }}>Choose Your Role</Title>
            <Text type="secondary" style={{ textAlign: 'center', maxWidth: 480 }}>
              Tell us who you are so we can tailor the onboarding experience to your workflow.
            </Text>
            {renderProgressDots()}
          </Space>

          <div className="role-selection-strip" style={{ margin: '24px 0' }}>
            {ROLE_OPTIONS.map((role) => {
              const active = role.key === selectedRole;
              const cardClasses = [
                'role-selection-card',
                active ? 'active' : '',
                role.available ? '' : 'disabled',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={role.key}
                  type="button"
                  className={cardClasses}
                  onClick={() => handleSelect(role.key)}
                  disabled={!role.available}
                >
                  <div className="role-emoji">{role.emoji}</div>
                  <Space direction="vertical" size={4} style={{ textAlign: 'center' }}>
                    <Text strong>{role.label}</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>{role.caption}</Text>
                  </Space>
                  {!role.available && (
                    <Tag color="processing" style={{ marginTop: 8 }}>Coming Soon</Tag>
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
