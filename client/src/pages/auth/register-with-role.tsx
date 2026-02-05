import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  App,
  Row,
  Col,
  Steps,
  message,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  LockOutlined,
  SecurityScanOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { setAuthToken } from "../../lib/auth";

const { Title, Text } = Typography;
const { Step } = Steps;

type RoleOption = {
  key: string;
  label: string;
  caption: string;
  emoji: string;
  available?: boolean;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    key: 'patient',
    label: "I'm a Patient",
    caption: 'Access appointments and prescriptions',
    emoji: '🙂',
    available: true,
  },
  {
    key: 'hospital',
    label: 'I manage a Hospital',
    caption: 'Create hospital profile & onboard team',
    emoji: '🏥',
    available: true,
  },
  {
    key: 'nurse',
    label: "I'm a Nurse",
    caption: 'Provide patient care & monitor vitals',
    emoji: '👩‍⚕️',
    available: true,
  },
  {
    key: 'pharmacist',
    label: "I'm a Pharmacist",
    caption: 'Manage medications & prescriptions',
    emoji: '💊',
    available: true,
  },
  {
    key: 'radiology_technician',
    label: 'I am a Radiology Technician',
    caption: 'Perform imaging & manage equipment',
    emoji: '🩻',
    available: true,
  },
  {
    key: 'doctor',
    label: "I'm a Doctor",
    caption: 'Manage clinical workflows',
    emoji: '🩺',
    available: true,
  },
  {
    key: 'receptionist',
    label: "I'm a Receptionist",
    caption: 'Assist patients & manage walk-ins',
    emoji: '💼',
    available: true,
  },
  {
    key: 'lab',
    label: 'I run a Lab',
    caption: 'Publish diagnostics & reports',
    emoji: '🧪',
    available: true,
  },
];

type RegistrationStep = 'role' | 'account' | 'otp' | 'password' | 'complete';

export default function RegisterWithRole() {
  const { message: messageApi } = App.useApp();
  const [, setLocation] = useLocation();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('role');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    mobileNumber: '',
    email: '',
    fullName: '',
    role: '',
  });

  // Initialize role from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roleFromUrl = urlParams.get('role') || '';
    if (roleFromUrl) {
      const role = ROLE_OPTIONS.find((r) => r.key === roleFromUrl);
      if (role && role.available) {
        setSelectedRole(roleFromUrl);
        setCurrentStep('account');
        setRegistrationData((prev) => ({ ...prev, role: roleFromUrl }));
      }
    }
  }, []);

  const handleRoleSelect = (roleKey: string) => {
    const role = ROLE_OPTIONS.find((r) => r.key === roleKey);
    if (!role || !role.available) {
      messageApi.info('This role is not available yet.');
      return;
    }
    setSelectedRole(roleKey);
    setRegistrationData((prev) => ({ ...prev, role: roleKey }));
    setCurrentStep('account');
  };

  const handleAccountInfo = async (values: any) => {
    try {
      // Validate and store account info
      setRegistrationData({
        mobileNumber: values.mobileNumber,
        email: values.email,
        fullName: values.fullName,
        role: selectedRole,
      });

      // Send OTP
      setIsLoading(true);
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: values.mobileNumber,
          role: selectedRole,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        messageApi.success(`OTP sent to ${values.mobileNumber}`);
        console.log('Registration OTP:', data.otp); // For development
        setCurrentStep('otp');
      } else {
        messageApi.error(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      messageApi.error('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (values: any) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: registrationData.mobileNumber,
          otp: values.otp,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        messageApi.success('OTP verified successfully!');
        setCurrentStep('password');
      } else {
        messageApi.error(data.message || 'OTP verification failed');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      messageApi.error('OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async (values: any) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registrationData,
          password: values.password,
          email: registrationData.email,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setAuthToken(data.token);
        localStorage.setItem('userRole', selectedRole);
        messageApi.success('Registration completed successfully!');
        setCurrentStep('complete');

        // Redirect to onboarding after 1.5 seconds
        setTimeout(() => {
          const onboardingRoutes: Record<string, string> = {
            patient: '/onboarding/patient',
            hospital: '/onboarding/hospital',
            nurse: '/onboarding/nurse',
            pharmacist: '/onboarding/pharmacist',
            radiology_technician: '/onboarding/radiology-technician',
            doctor: '/onboarding/doctor',
            receptionist: '/onboarding/receptionist',
            lab: '/onboarding/lab',
          };
          const onboardingRoute = onboardingRoutes[selectedRole] || '/dashboard';
          setLocation(onboardingRoute);
        }, 1500);
      } else {
        messageApi.error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      messageApi.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIndex = () => {
    const steps: RegistrationStep[] = ['role', 'account', 'otp', 'password', 'complete'];
    return steps.indexOf(currentStep);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'role':
        return (
          <div>
            <Space direction="vertical" align="center" style={{ width: '100%', marginBottom: 32 }}>
              <Title level={3} style={{ marginBottom: 8 }}>Choose Your Role</Title>
              <Text type="secondary" style={{ textAlign: 'center', maxWidth: 480 }}>
                Tell us who you are so we can tailor the registration experience to your needs.
              </Text>
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
                    onClick={() => handleRoleSelect(role.key)}
                    disabled={!role.available}
                  >
                    <div className="role-emoji">{role.emoji}</div>
                    <Space direction="vertical" size={4} style={{ textAlign: 'center' }}>
                      <Text strong>{role.label}</Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>{role.caption}</Text>
                    </Space>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'account':
        return (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAccountInfo}
            initialValues={registrationData}
          >
            <Title level={4} style={{ marginBottom: 24 }}>Create Your Account</Title>
            <Form.Item
              name="fullName"
              label="Full Name"
              rules={[{ required: true, message: 'Please enter your full name' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your full name"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="email"
              label={selectedRole === 'patient' ? 'Email (optional)' : 'Email'}
              rules={[
                ...(selectedRole !== 'patient' ? [{ required: true, message: 'Please enter your email' }] : []),
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder={selectedRole === 'patient' ? 'Optional' : 'Enter your email address'}
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="mobileNumber"
              label="Mobile Number"
              rules={[
                { required: true, message: 'Please enter mobile number' },
                { pattern: /^[0-9]{10}$/, message: 'Enter a valid 10-digit mobile number' },
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="10-digit mobile number"
                maxLength={10}
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Button onClick={() => setCurrentStep('role')} size="large">
                  Back
                </Button>
                <Button type="primary" htmlType="submit" loading={isLoading} size="large">
                  Send OTP
                </Button>
              </Space>
            </Form.Item>
          </Form>
        );

      case 'otp':
        return (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleVerifyOtp}
          >
            <Title level={4} style={{ marginBottom: 24 }}>Verify OTP</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              Enter the 6-digit OTP sent to <strong>{registrationData.mobileNumber}</strong>
            </Text>
            <Form.Item
              name="otp"
              label="OTP"
              rules={[
                { required: true, message: 'Please enter OTP' },
                { pattern: /^[0-9]{6}$/, message: 'Enter 6-digit OTP' },
              ]}
            >
              <Input
                prefix={<SecurityScanOutlined />}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                size="large"
                style={{ textAlign: 'center', letterSpacing: 4, fontSize: 20 }}
              />
            </Form.Item>
            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Button onClick={() => setCurrentStep('account')} size="large">
                  Back
                </Button>
                <Button type="primary" htmlType="submit" loading={isLoading} size="large">
                  Verify OTP
                </Button>
              </Space>
            </Form.Item>
          </Form>
        );

      case 'password':
        return (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCompleteRegistration}
          >
            <Title level={4} style={{ marginBottom: 24 }}>Set Password</Title>
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please enter a password' },
                { min: 6, message: 'Password must be at least 6 characters' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Create a password"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Re-enter password"
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Button onClick={() => setCurrentStep('otp')} size="large">
                  Back
                </Button>
                <Button type="primary" htmlType="submit" loading={isLoading} size="large">
                  Complete Registration
                </Button>
              </Space>
            </Form.Item>
          </Form>
        );

      case 'complete':
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
            <Title level={3} style={{ marginBottom: 16 }}>Registration Successful!</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              Redirecting to onboarding...
            </Text>
          </div>
        );

      default:
        return null;
    }
  };

  const steps = [
    { title: 'Select Role', icon: <UserOutlined /> },
    { title: 'Account Info', icon: <MailOutlined /> },
    { title: 'Verify OTP', icon: <SecurityScanOutlined /> },
    { title: 'Set Password', icon: <LockOutlined /> },
    { title: 'Complete', icon: <CheckCircleOutlined /> },
  ];

  return (
    <div className="medical-container">
      <div className="medical-container__inner">
        <Card
          className="medical-card"
          style={{
            borderRadius: 18,
            width: '100%',
            maxWidth: 600,
            margin: '0 auto',
            padding: 32,
          }}
        >
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              if (currentStep === 'role') {
                setLocation('/login');
              } else {
                setCurrentStep('role');
              }
            }}
            style={{ marginBottom: 24 }}
          >
            Back
          </Button>

          <Steps current={getStepIndex()} style={{ marginBottom: 32 }}>
            {steps.map((step, index) => (
              <Step key={index} title={step.title} icon={step.icon} />
            ))}
          </Steps>

          {renderStepContent()}
        </Card>
      </div>
    </div>
  );
}
