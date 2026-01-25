import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { 
  Form, 
  Input, 
  Button, 
  App, 
  Typography, 
  Tabs,
  Card,
  Row,
  Col
} from 'antd';
import { 
  PhoneOutlined, 
  MailOutlined,
  LockOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useResponsive } from "../../hooks/use-responsive";
import { OTPInput } from "../../components/common/OTPInput";
import loginHeroImage from '../../assets/images/login-hero.png';

const { Title, Text } = Typography;

type OtpMethod = 'mobile' | 'email';

export default function ForgotPassword() {
  const { message } = App.useApp();
  const { isMobile, isTablet } = useResponsive();
  const [form] = Form.useForm();
  const [otpMethod, setOtpMethod] = useState<OtpMethod>('mobile');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [passwordReset, setPasswordReset] = useState(false);
  const [, setLocation] = useLocation();

  const sendOtpMutation = useMutation({
    mutationFn: async ({ method, identifier }: { method: OtpMethod; identifier: string }) => {
      if (method === 'email') {
        throw new Error('Email OTP is not yet implemented. Please use mobile number.');
      }
      
      const response = await fetch('/api/auth/password-reset/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: identifier }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send OTP');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      setIdentifier(variables.identifier);
      setOtpSent(true);
      setOtpValue('');
      message.success(`OTP sent to ${variables.identifier}`);
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ method, identifier, otp }: { method: OtpMethod; identifier: string; otp: string }) => {
      if (method === 'email') {
        throw new Error('Email OTP is not yet implemented. Please use mobile number.');
      }
      
      const response = await fetch('/api/auth/password-reset/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mobileNumber: identifier,
          otp 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'OTP verification failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setOtpVerified(true);
      message.success('OTP verified successfully');
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ method, identifier, newPassword }: { method: OtpMethod; identifier: string; newPassword: string }) => {
      if (method === 'email') {
        throw new Error('Email OTP is not yet implemented. Please use mobile number.');
      }
      
      const response = await fetch('/api/auth/password-reset/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mobileNumber: identifier,
          newPassword 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset password');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setPasswordReset(true);
      message.success('Password reset successfully!');
      setTimeout(() => {
        setLocation('/login');
      }, 2000);
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const handleSendOtp = (values: any) => {
    const value = otpMethod === 'mobile' ? values.mobileNumber : values.email;
    sendOtpMutation.mutate({ method: otpMethod, identifier: value });
  };

  const handleVerifyOtp = (values: { otp: string }) => {
    verifyOtpMutation.mutate({ method: otpMethod, identifier, otp: values.otp });
  };

  const handleResetPassword = (values: { newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }
    resetPasswordMutation.mutate({ method: otpMethod, identifier, newPassword: values.newPassword });
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row'
    }}>
      {/* Left Section - Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '32px 24px' : '32px',
        background: '#FFFFFF'
      }}>
        <div style={{ width: '100%', maxWidth: '448px' }}>
          {/* Back to Login Link */}
          <Link href="/login">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              style={{ 
                padding: 0, 
                height: 'auto', 
                marginBottom: '32px',
                color: '#374151',
                fontWeight: 500,
                fontSize: '14px'
              }}
            >
              Back to Login
            </Button>
          </Link>

          {/* Title */}
          <Title 
            level={1} 
            style={{ 
              margin: 0, 
              marginBottom: '8px', 
              fontSize: '32px', 
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1.2
            }}
          >
            Forgot Password
          </Title>
          <Text 
            style={{ 
              fontSize: '14px', 
              color: '#6B7280', 
              display: 'block', 
              marginBottom: '32px',
              lineHeight: 1.5
            }}
          >
            Reset your password using OTP verification
          </Text>

          {/* Success Message with Animation */}
          {passwordReset && (
            <div style={{ 
              textAlign: 'center', 
              padding: '48px 0',
              animation: 'fadeIn 0.5s ease-in'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'scaleIn 0.5s ease-out'
              }}>
                <CheckCircleOutlined style={{ 
                  fontSize: '48px', 
                  color: '#10B981',
                  animation: 'checkmark 0.6s ease-in-out 0.3s both'
                }} />
              </div>
              <Title level={3} style={{ margin: 0, marginBottom: '8px', color: '#111827' }}>
                Password Reset Successful!
              </Title>
              <Text style={{ color: '#6B7280', display: 'block', marginBottom: '32px' }}>
                Your password has been reset successfully. Redirecting to login...
              </Text>
            </div>
          )}

          {/* Step 1: Enter Mobile/Email and Send OTP */}
          {!otpSent && !passwordReset && (
            <>
              <Tabs
                activeKey={otpMethod}
                onChange={(key) => {
                  setOtpMethod(key as OtpMethod);
                  form.resetFields();
                }}
                items={[
                  {
                    key: 'mobile',
                    label: (
                      <span>
                        <PhoneOutlined /> Mobile
                      </span>
                    ),
                  },
                  {
                    key: 'email',
                    label: (
                      <span>
                        <MailOutlined /> Email
                      </span>
                    ),
                  },
                ]}
                style={{ marginBottom: '24px' }}
              />

              <Form
                form={form}
                onFinish={handleSendOtp}
                layout="vertical"
                size="large"
              >
                {otpMethod === 'mobile' ? (
                  <Form.Item
                    name="mobileNumber"
                    label={
                      <span style={{ fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                        <span style={{ color: '#EF4444' }}>*</span> Mobile Number <span style={{ color: '#EF4444' }}>*</span>
                      </span>
                    }
                    rules={[
                      { required: true, message: 'Please enter your mobile number' },
                      { pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit mobile number' }
                    ]}
                    style={{ marginBottom: '24px' }}
                    required={false}
                  >
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        zIndex: 1,
                        pointerEvents: 'none'
                      }}>
                        <PhoneOutlined style={{ color: '#9CA3AF', fontSize: '20px' }} />
                        <span style={{ color: '#9CA3AF', fontSize: '16px' }}>+91</span>
                      </div>
                      <Input
                        placeholder="Enter 10-digit mobile number"
                        style={{ 
                          height: '56px', 
                          borderRadius: '12px',
                          fontSize: '16px',
                          paddingLeft: '80px',
                          borderColor: '#D1D5DB'
                        }}
                      />
                    </div>
                  </Form.Item>
                ) : (
                  <Form.Item
                    name="email"
                    label={
                      <span style={{ fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                        <span style={{ color: '#EF4444' }}>*</span> Email Address <span style={{ color: '#EF4444' }}>*</span>
                      </span>
                    }
                    rules={[
                      { required: true, message: 'Please enter your email address' },
                      { type: 'email', message: 'Please enter a valid email address' }
                    ]}
                    style={{ marginBottom: '24px' }}
                    required={false}
                  >
                    <Input
                      prefix={<MailOutlined style={{ color: '#9CA3AF' }} />}
                      placeholder="Enter your email address"
                      style={{ 
                        height: '56px', 
                        borderRadius: '12px',
                        fontSize: '16px',
                        paddingLeft: '48px',
                        borderColor: '#D1D5DB'
                      }}
                    />
                  </Form.Item>
                )}

                <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
                  <Button
                    htmlType="submit"
                    loading={sendOtpMutation.isPending}
                    block
                    size="large"
                    style={{ 
                      height: '56px', 
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
                      border: 'none',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    Send OTP
                  </Button>
                </Form.Item>
              </Form>
            </>
          )}

          {/* Step 2: Verify OTP */}
          {otpSent && !otpVerified && !passwordReset && (
            <Form
              form={form}
              onFinish={handleVerifyOtp}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="otp"
                rules={[
                  { required: true, message: 'Please enter the OTP' },
                  { pattern: /^[0-9]{6}$/, message: 'Please enter a valid 6-digit OTP' }
                ]}
              >
                <OTPInput
                  length={6}
                  value={otpValue}
                  onChange={(value) => {
                    setOtpValue(value);
                    form.setFieldsValue({ otp: value });
                  }}
                  onComplete={(value) => {
                    setOtpValue(value);
                    form.setFieldsValue({ otp: value });
                    setTimeout(() => {
                      form.submit();
                    }, 100);
                  }}
                  mobileNumber={otpMethod === 'mobile' ? identifier : undefined}
                  otpSent={otpSent}
                  autoFocus={true}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
                <Button
                  htmlType="submit"
                  loading={verifyOtpMutation.isPending}
                  block
                  size="large"
                  style={{ 
                    height: '56px', 
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  Verify OTP
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Button
                  type="link"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpValue('');
                    form.resetFields();
                  }}
                  style={{ color: '#10B981', fontWeight: 500 }}
                >
                  Change {otpMethod === 'mobile' ? 'Mobile Number' : 'Email'}
                </Button>
              </div>
            </Form>
          )}

          {/* Step 3: Reset Password */}
          {otpVerified && !passwordReset && (
            <Form
              form={form}
              onFinish={handleResetPassword}
              layout="vertical"
              size="large"
            >
              <Text 
                style={{ 
                  fontSize: '14px', 
                  color: '#6B7280', 
                  display: 'block', 
                  marginBottom: '24px',
                  lineHeight: 1.5
                }}
              >
                Your new password must be different from previously used password.
              </Text>

              <Form.Item
                name="newPassword"
                label={
                  <span style={{ fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                    <span style={{ color: '#EF4444' }}>*</span> Password <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                }
                rules={[
                  { required: true, message: 'Please enter a new password' },
                  { min: 6, message: 'Password must be at least 6 characters' }
                ]}
                style={{ marginBottom: '24px' }}
                required={false}
              >
                <Input.Password
                  placeholder="Enter new password"
                  prefix={<LockOutlined style={{ color: '#9CA3AF' }} />}
                  style={{ 
                    height: '56px', 
                    borderRadius: '12px',
                    fontSize: '16px',
                    paddingLeft: '48px',
                    borderColor: '#D1D5DB'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={
                  <span style={{ fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                    <span style={{ color: '#EF4444' }}>*</span> Confirm Password <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                }
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm your password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
                style={{ marginBottom: '24px' }}
                required={false}
              >
                <Input.Password
                  placeholder="Confirm new password"
                  prefix={<LockOutlined style={{ color: '#9CA3AF' }} />}
                  style={{ 
                    height: '56px', 
                    borderRadius: '12px',
                    fontSize: '16px',
                    paddingLeft: '48px',
                    borderColor: '#D1D5DB'
                  }}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
                <Button
                  htmlType="submit"
                  loading={resetPasswordMutation.isPending}
                  block
                  size="large"
                  style={{ 
                    height: '56px', 
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  Create New Password
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </div>

      {/* Right Section - Promotional (Hidden on Mobile) */}
      {!isMobile && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isTablet ? '40px 48px' : '48px',
          background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 50%, #ECFEFF 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background Pattern */}
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            pointerEvents: 'none'
          }}>
            <div style={{
              position: 'absolute',
              top: '80px',
              right: '80px',
              width: '288px',
              height: '288px',
              borderRadius: '50%',
              background: '#10B981',
              filter: 'blur(96px)'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '80px',
              left: '80px',
              width: '384px',
              height: '384px',
              borderRadius: '50%',
              background: '#14B8A6',
              filter: 'blur(96px)'
            }}></div>
          </div>

          <div style={{ position: 'relative', zIndex: 10, maxWidth: '512px', width: '100%' }}>
            {/* Hero Image */}
            <Card
              style={{ 
                borderRadius: '24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                marginBottom: '32px',
                padding: 0,
                overflow: 'hidden',
                background: '#FFFFFF'
              }}
              bodyStyle={{ padding: '32px' }}
            >
              <img 
                src={loginHeroImage} 
                alt="Healthcare Management"
                style={{
                  width: '100%',
                  height: '256px',
                  objectFit: 'cover',
                  borderRadius: '16px'
                }}
              />
            </Card>

            {/* Headline */}
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <Title level={1} style={{ 
                margin: 0, 
                fontSize: '36px', 
                fontWeight: 700, 
                color: '#111827',
                lineHeight: 1.2
              }}>
                Healthcare Management,{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Simplified
                </span>
              </Title>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
              <Text style={{ 
                fontSize: '18px', 
                color: '#4B5563',
                lineHeight: 1.6
              }}>
                Manage patients, appointments, prescriptions, and your entire healthcare workflow in one unified platform.
              </Text>
            </div>

            {/* Statistics Cards */}
            <Row gutter={16}>
              <Col span={8}>
                <Card 
                  style={{ 
                    borderRadius: '16px',
                    textAlign: 'center',
                    background: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <Title level={2} style={{ 
                    margin: 0, 
                    fontSize: '30px', 
                    fontWeight: 700,
                    color: '#10B981',
                    marginBottom: '4px'
                  }}>
                    50K+
                  </Title>
                  <Text style={{ fontSize: '14px', color: '#4B5563' }}>Patients</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card 
                  style={{ 
                    borderRadius: '16px',
                    textAlign: 'center',
                    background: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <Title level={2} style={{ 
                    margin: 0, 
                    fontSize: '30px', 
                    fontWeight: 700,
                    color: '#10B981',
                    marginBottom: '4px'
                  }}>
                    500+
                  </Title>
                  <Text style={{ fontSize: '14px', color: '#4B5563' }}>Doctors</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card 
                  style={{ 
                    borderRadius: '16px',
                    textAlign: 'center',
                    background: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <Title level={2} style={{ 
                    margin: 0, 
                    fontSize: '30px', 
                    fontWeight: 700,
                    color: '#10B981',
                    marginBottom: '4px'
                  }}>
                    100+
                  </Title>
                  <Text style={{ fontSize: '14px', color: '#4B5563' }}>Hospitals</Text>
                </Card>
              </Col>
            </Row>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
        
        @keyframes checkmark {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
