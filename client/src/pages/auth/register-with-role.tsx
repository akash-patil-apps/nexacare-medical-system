import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Form,
  Input,
  Button,
  Typography,
  App,
  Modal,
  message,
  Row,
  Col,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  LockOutlined,
  SecurityScanOutlined,
  CheckCircleOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { setAuthToken } from "../../lib/auth";
import { OnboardingStepsLayout } from "../../components/onboarding/OnboardingStepsLayout";

const { Text } = Typography;

type RoleOption = {
  key: string;
  label: string;
  caption: string;
  emoji: string;
  available?: boolean;
};

const ROLE_OPTIONS: RoleOption[] = [
  { key: 'patient', label: "I'm a Patient", caption: 'Access appointments and prescriptions', emoji: '🙂', available: true },
  { key: 'hospital', label: 'I manage a Hospital', caption: 'Create hospital profile & onboard team', emoji: '🏥', available: true },
  { key: 'nurse', label: "I'm a Nurse", caption: 'Provide patient care & monitor vitals', emoji: '👩‍⚕️', available: true },
  { key: 'pharmacist', label: "I'm a Pharmacist", caption: 'Manage medications & prescriptions', emoji: '💊', available: true },
  { key: 'radiology_technician', label: 'I am a Radiology Technician', caption: 'Perform imaging & manage equipment', emoji: '🩻', available: true },
  { key: 'doctor', label: "I'm a Doctor", caption: 'Manage clinical workflows', emoji: '🩺', available: true },
  { key: 'receptionist', label: "I'm a Receptionist", caption: 'Assist patients & manage walk-ins', emoji: '💼', available: true },
  { key: 'lab', label: 'I run a Lab', caption: 'Publish diagnostics & reports', emoji: '🧪', available: true },
];

type RegistrationStep = 'role' | 'account' | 'complete';

const REG_STEPS = [
  { title: 'Select Role' },
  { title: 'Create Account' },
  { title: 'Complete' },
];

const STEP_TITLES: Record<RegistrationStep, string> = {
  role: 'Choose Your Role',
  account: 'Create Your Account',
  complete: 'Registration Successful!',
};

const STEP_NOTES: Partial<Record<RegistrationStep, string>> = {
  role: 'Tell us who you are so we can tailor the registration experience to your needs.',
  account: 'Enter your details, verify email & mobile, and set your password.',
  complete: 'Redirecting to onboarding...',
};

const inputStyle = { borderRadius: 10 };

type OtpModalType = 'email' | 'mobile' | null;

export default function RegisterWithRole() {
  const { message: messageApi } = App.useApp();
  const [, setLocation] = useLocation();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('role');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState<OtpModalType>(null);
  const [otpModalLoading, setOtpModalLoading] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    mobileNumber: '',
    email: '',
    fullName: '',
    role: '',
  });

  const isPatient = selectedRole === 'patient';
  const emailRequired = !isPatient;

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
    setMobileVerified(false);
    setEmailVerified(false);
    form.resetFields();
  };

  const openEmailVerifyModal = async () => {
    if (emailRequired) {
      try {
        await form.validateFields(['email']);
      } catch {
        return;
      }
    }
    const email = form.getFieldValue('email');
    if (emailRequired && !email) {
      messageApi.error('Please enter your email.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      messageApi.error('Please enter a valid email address.');
      return;
    }
    setOtpInput('');
    setOtpModalOpen('email');
  };

  const openMobileVerifyModal = async () => {
    try {
      await form.validateFields(['mobileNumber']);
    } catch {
      return;
    }
    const mobile = form.getFieldValue('mobileNumber');
    if (!/^[0-9]{10}$/.test(mobile)) {
      messageApi.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    setOtpInput('');
    setOtpModalOpen('mobile');
    setOtpModalLoading(true);
    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: mobile, role: selectedRole }),
      });
      const data = await response.json();
      if (response.ok) {
        messageApi.success(`OTP sent to ******${mobile.slice(-4)}`);
        console.log('Registration OTP:', data.otp);
      } else {
        messageApi.error(data.message || 'Failed to send OTP');
        setOtpModalOpen(null);
      }
    } catch {
      messageApi.error('Failed to send OTP.');
      setOtpModalOpen(null);
    } finally {
      setOtpModalLoading(false);
    }
  };

  const handleOtpModalVerify = async () => {
    if (!/^[0-9]{6}$/.test(otpInput)) {
      messageApi.error('Enter a valid 6-digit OTP.');
      return;
    }
    if (otpModalOpen === 'mobile') {
      const mobile = form.getFieldValue('mobileNumber');
      setOtpModalLoading(true);
      try {
        const response = await fetch('/api/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobileNumber: mobile, otp: otpInput }),
        });
        const data = await response.json();
        if (response.ok) {
          messageApi.success('Mobile number verified.');
          setMobileVerified(true);
          setOtpModalOpen(null);
          setOtpInput('');
        } else {
          messageApi.error(data.message || 'Invalid OTP');
        }
      } catch {
        messageApi.error('Verification failed.');
      } finally {
        setOtpModalLoading(false);
      }
    } else if (otpModalOpen === 'email') {
      setEmailVerified(true);
      setOtpModalOpen(null);
      setOtpInput('');
      messageApi.success('Email verified.');
    }
  };

  const handleCompleteRegistration = async (values: any) => {
    if (!mobileVerified) {
      messageApi.warning('Please verify your mobile number using the Verify button.');
      return;
    }
    try {
      setIsLoading(true);
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: values.fullName,
          email: values.email && String(values.email).trim() ? values.email : (isPatient ? '' : undefined),
          mobileNumber: values.mobileNumber,
          role: selectedRole,
          password: values.password,
        }),
      });
      const registerData = await registerRes.json();
      if (registerRes.ok) {
        setAuthToken(registerData.token);
        localStorage.setItem('userRole', selectedRole);
        messageApi.success('Registration completed successfully!');
        setCurrentStep('complete');
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
          setLocation(onboardingRoutes[selectedRole] || '/dashboard');
        }, 1500);
      } else {
        messageApi.error(registerData.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      messageApi.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const stepIndex = ['role', 'account', 'complete'].indexOf(currentStep);

  const handleBack = () => {
    if (currentStep === 'role') {
      setLocation('/register');
    } else if (currentStep === 'account') {
      setCurrentStep('role');
    }
  };

  const roleCardStyle = (active: boolean) => ({
    width: 140,
    minHeight: 140,
    padding: '16px 12px',
    borderRadius: 14,
    border: active ? '2px solid #059669' : '1px solid #E5E7EB',
    background: active ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' : '#fff',
    boxShadow: active ? '0 4px 16px rgba(5, 150, 105, 0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  });

  const INPUT_GROUP_HEIGHT = 40;
  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
    width: '100%',
    height: INPUT_GROUP_HEIGHT,
    minHeight: INPUT_GROUP_HEIGHT,
    border: '1px solid #d9d9d9',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  };
  const inputWrapStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    border: 'none',
    borderRadius: 0,
    height: '100%',
  };
  const verifyBtnStyle: React.CSSProperties = {
    height: '100%',
    minHeight: INPUT_GROUP_HEIGHT,
    borderRadius: '0 10px 10px 0',
    border: 'none',
    borderLeft: '1px solid #e8e8e8',
    paddingLeft: 16,
    paddingRight: 20,
    background: '#fff',
    color: '#059669',
    fontWeight: 600,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    boxShadow: 'none',
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'role':
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role.key}
                type="button"
                style={roleCardStyle(role.key === selectedRole)}
                onClick={() => handleRoleSelect(role.key)}
                disabled={!role.available}
              >
                <span style={{ fontSize: 28 }}>{role.emoji}</span>
                <Text strong style={{ fontSize: 13, color: '#111827', textAlign: 'center' }}>
                  {role.label}
                </Text>
                <Text style={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>
                  {role.caption}
                </Text>
              </button>
            ))}
          </div>
        );

      case 'account':
        return (
          <>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleCompleteRegistration}
              initialValues={{ ...registrationData, password: '', confirmPassword: '' }}
            >
              <Form.Item
                name="fullName"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter your full name' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Enter your full name" size="large" style={inputStyle} />
              </Form.Item>

              <Form.Item
                name="email"
                label={isPatient ? 'Email (optional)' : 'Email'}
                rules={[
                  ...(emailRequired ? [{ required: true, message: 'Please enter your email' }] : []),
                  { type: 'email', message: 'Please enter a valid email', validateTrigger: 'onSubmit' },
                ]}
              >
                <div className="register-verify-input-group" style={inputGroupStyle}>
                  <Input
                    prefix={<MailOutlined />}
                    placeholder={isPatient ? 'Optional' : 'Enter your email address'}
                    size="large"
                    bordered={false}
                    style={{ ...inputStyle, ...inputWrapStyle }}
                  />
                  <Button
                    type="button"
                    onClick={openEmailVerifyModal}
                    style={verifyBtnStyle}
                  >
                    {emailVerified ? <CheckCircleFilled style={{ color: '#059669', marginRight: 6 }} /> : null}
                    Verify
                  </Button>
                </div>
              </Form.Item>

              <Form.Item
                name="mobileNumber"
                label="Mobile Number"
                rules={[
                  { required: true, message: 'Please enter mobile number' },
                  { pattern: /^[0-9]{10}$/, message: 'Enter a valid 10-digit mobile number' },
                ]}
              >
                <div className="register-verify-input-group" style={inputGroupStyle}>
                  <Input
                    prefix={<PhoneOutlined />}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    size="large"
                    bordered={false}
                    style={{ ...inputStyle, ...inputWrapStyle }}
                  />
                  <Button
                    type="button"
                    onClick={openMobileVerifyModal}
                    style={verifyBtnStyle}
                  >
                    {mobileVerified ? <CheckCircleFilled style={{ color: '#059669', marginRight: 6 }} /> : null}
                    Verify
                  </Button>
                </div>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[
                      { required: true, message: 'Please enter a password' },
                      { min: 6, message: 'Password must be at least 6 characters' },
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="Create a password" size="large" style={inputStyle} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="confirmPassword"
                    label="Confirm Password"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please confirm your password' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) return Promise.resolve();
                          return Promise.reject(new Error('Passwords do not match'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="Re-enter password" size="large" style={inputStyle} />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <Button onClick={handleBack} size="large" style={{ borderRadius: 10 }}>
                  Back
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoading}
                  size="large"
                  style={{ borderRadius: 10, background: '#059669', borderColor: '#059669' }}
                >
                  Complete Registration
                </Button>
              </div>
            </Form>

            <Modal
              title={otpModalOpen === 'email' ? 'Verify your email' : 'Verify your mobile number'}
              open={otpModalOpen !== null}
              onCancel={() => { setOtpModalOpen(null); setOtpInput(''); }}
              footer={[
                <Button key="cancel" onClick={() => { setOtpModalOpen(null); setOtpInput(''); }}>
                  Cancel
                </Button>,
                <Button
                  key="verify"
                  type="primary"
                  loading={otpModalLoading}
                  onClick={handleOtpModalVerify}
                  style={{ background: '#059669', borderColor: '#059669' }}
                >
                  Verify OTP
                </Button>,
              ]}
              destroyOnClose
              width={400}
            >
              <div style={{ padding: '8px 0' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  {otpModalOpen === 'email'
                    ? 'Enter the 6-digit verification code sent to your email address.'
                    : `Enter the 6-digit OTP sent to ******${form.getFieldValue('mobileNumber')?.slice(-4) || '****'}.`}
                </Text>
                <Input
                  prefix={<SecurityScanOutlined />}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  size="large"
                  style={{ textAlign: 'center', letterSpacing: 6, fontSize: 18, borderRadius: 10 }}
                />
              </div>
            </Modal>
          </>
        );

      case 'complete':
        return (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <CheckCircleOutlined style={{ fontSize: 56, color: '#059669', marginBottom: 20 }} />
            <Text type="secondary" style={{ display: 'block', fontSize: 15 }}>
              Redirecting to onboarding...
            </Text>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <OnboardingStepsLayout
      steps={REG_STEPS}
      currentStepIndex={stepIndex}
      stepTitle={STEP_TITLES[currentStep]}
      stepNote={STEP_NOTES[currentStep]}
      onBack={handleBack}
      showHelpLink={currentStep !== 'complete'}
      hideBackButton={currentStep === 'complete'}
    >
      {renderStepContent()}
    </OnboardingStepsLayout>
  );
}
