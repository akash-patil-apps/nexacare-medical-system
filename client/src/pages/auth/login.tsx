import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { 
  Form, 
  Input, 
  Button, 
  App, 
  Space, 
  Typography, 
  Row, 
  Col,
  Card
} from 'antd';
import { 
  LockOutlined, 
  PhoneOutlined, 
  EyeInvisibleOutlined,
  EyeTwoTone,
  StarOutlined
} from '@ant-design/icons';
import { authApi, setAuthToken } from "../../lib/auth";
import { useResponsive } from "../../hooks/use-responsive";
import loginHeroImage from '../../assets/images/login-hero.png';
import { OTPInput } from "../../components/common/OTPInput";

const { Title, Text } = Typography;

export default function Login() {
  const { message } = App.useApp();
  const { isMobile, isTablet } = useResponsive();
  const [passwordForm] = Form.useForm();
  const [otpSendForm] = Form.useForm();
  const [otpForm] = Form.useForm();
  const [otpSent, setOtpSent] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [otpValue, setOtpValue] = useState('');
  const [, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuthToken(data.token);
      message.success(`Welcome back, ${data.user.fullName}!`);
      
      setTimeout(() => {
        setLocation("/dashboard");
      }, 100);
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (mobileNumber: string) => {
      const response = await fetch('/api/auth/login/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send OTP');
      }
      
      return response.json();
    },
    onSuccess: (data, mobileNumber) => {
      otpForm.setFieldsValue({ mobileNumber });
      setOtpSent(true);
      setOtpValue(''); // Reset OTP value
      message.success(`OTP sent to ${data.mobileNumber || mobileNumber}`);
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ mobileNumber, otp }: { mobileNumber: string; otp: string }) => {
      const response = await fetch('/api/auth/login/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, otp }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'OTP verification failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      message.success(`Welcome, ${data.user.fullName}!`);
      
      setTimeout(() => {
        setLocation("/dashboard");
      }, 100);
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const onPasswordLogin = (values: { mobileNumber: string; password: string }) => {
    loginMutation.mutate(values);
  };

  const onSendOtp = (values: { mobileNumber: string }) => {
    sendOtpMutation.mutate(values.mobileNumber);
  };

  const onVerifyOtp = (values: { mobileNumber: string; otp: string }) => {
    verifyOtpMutation.mutate(values);
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row'
    }}>
      {/* Left Section - Login Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        background: '#FFFFFF'
      }}>
        <div style={{ width: '100%', maxWidth: '448px' }}>
          {/* Logo and Header */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}>
                <StarOutlined style={{ color: '#FFFFFF', fontSize: '24px' }} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                  NexaCare HMS
                </Title>
                <Text style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.4 }}>
                  Healthcare Management System
                </Text>
              </div>
            </div>
            
            <div>
              <Title level={1} style={{ margin: 0, fontSize: '30px', fontWeight: 700, color: '#111827', marginBottom: '8px', lineHeight: 1.2 }}>
                Welcome back
              </Title>
              <Text style={{ fontSize: '16px', color: '#4B5563', lineHeight: 1.5 }}>
                Sign in to your account to continue
              </Text>
            </div>
          </div>

          {/* Login Method Tabs */}
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            marginBottom: '32px',
            background: '#F3F4F6',
            padding: '4px',
            borderRadius: '12px'
          }}>
            <Button
              type="text"
              icon={<LockOutlined />}
              onClick={() => setLoginMethod('password')}
              style={{
                flex: 1,
                borderRadius: '8px',
                height: '48px',
                padding: '0 16px',
                fontWeight: 500,
                background: loginMethod === 'password' ? '#FFFFFF' : 'transparent',
                border: 'none',
                boxShadow: loginMethod === 'password' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                color: loginMethod === 'password' ? '#111827' : '#4B5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Password
            </Button>
            <Button
              type="text"
              icon={<PhoneOutlined />}
              onClick={() => {
                setLoginMethod('otp');
                setOtpSent(false);
                setOtpValue('');
              }}
            style={{ 
                flex: 1,
                borderRadius: '8px',
                height: '48px',
                padding: '0 16px',
                fontWeight: 500,
                background: loginMethod === 'otp' ? '#FFFFFF' : 'transparent',
                border: 'none',
                boxShadow: loginMethod === 'otp' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                color: loginMethod === 'otp' ? '#111827' : '#4B5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              OTP
            </Button>
          </div>

          {/* Login Forms */}
          {loginMethod === 'password' ? (
                      <Form
                        form={passwordForm}
                        name="password-login"
                        onFinish={onPasswordLogin}
                        layout="vertical"
                        size="large"
                        preserve={false}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <Text style={{ fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                    <Text type="danger">*</Text> Mobile Number <Text type="danger">*</Text>
                  </Text>
                </div>
                        <Form.Item
                          name="mobileNumber"
                          rules={[
                            { required: true, message: 'Please enter your mobile number' },
                            { pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit mobile number' }
                          ]}
                  style={{ marginBottom: 0 }}
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
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
                  <Text style={{ fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                    <Text type="danger">*</Text> Password <Text type="danger">*</Text>
                  </Text>
                  <Link href="/forgot-password">
                    <Text style={{ color: '#10B981', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
                      Forgot password?
                    </Text>
                  </Link>
                </div>
                        <Form.Item
                          name="password"
                          rules={[{ required: true, message: 'Please enter your password' }]}
                  style={{ marginBottom: 0 }}
                >
                <div style={{ position: 'relative' }}>
                  <LockOutlined style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF',
                    fontSize: '20px',
                    zIndex: 1,
                    pointerEvents: 'none'
                  }} />
                          <Input.Password
                            placeholder="Enter your password"
                    iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                    style={{ 
                      height: '56px', 
                      borderRadius: '12px',
                      fontSize: '16px',
                      paddingLeft: '48px',
                      paddingRight: '48px',
                      borderColor: '#D1D5DB'
                    }}
                  />
                </div>
                        </Form.Item>
              </div>

              <Form.Item style={{ marginBottom: '0' }}>
                          <Button
                            htmlType="submit"
                            loading={loginMutation.isPending}
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #0D9488 100%)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                              }}
                            >
                              Sign In
                          </Button>
                        </Form.Item>
                      </Form>
          ) : (
            <div>
                        {!otpSent ? (
                      <Form
                        form={otpSendForm}
                        name="send-otp"
                        onFinish={onSendOtp}
                        layout="vertical"
                        size="large"
                        preserve={false}
                  style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
                >
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text style={{ fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                        <Text type="danger">*</Text> Mobile Number <Text type="danger">*</Text>
                      </Text>
                    </div>
                        <Form.Item
                          name="mobileNumber"
                          rules={[
                            { required: true, message: 'Please enter your mobile number' },
                            { pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit mobile number' }
                          ]}
                      style={{ marginBottom: 0 }}
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
                  </div>

                  <Form.Item style={{ marginBottom: '0' }}>
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
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #0D9488 100%)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                                }}
                          >
                            Send OTP
                          </Button>
                        </Form.Item>
                      </Form>
                    ) : (
                      <Form
                        form={otpForm}
                        name="verify-otp"
                        onFinish={onVerifyOtp}
                        layout="vertical"
                        size="large"
                  style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
                >
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text style={{ fontWeight: 500, color: '#374151', fontSize: '14px' }}>
                        <Text type="danger">*</Text> Mobile Number <Text type="danger">*</Text>
                      </Text>
                    </div>
                        <Form.Item
                          name="mobileNumber"
                          rules={[{ required: true, message: 'Please enter your mobile number' }]}
                      style={{ marginBottom: 0 }}
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
                        disabled
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
                  </div>

                  <div>
                    <Form.Item
                      name="otp"
                      rules={[
                        { required: true, message: 'Please enter the OTP' },
                        { pattern: /^[0-9]{6}$/, message: 'Please enter a valid 6-digit OTP' }
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <OTPInput
                        length={6}
                        value={otpValue}
                        onChange={(value) => {
                          setOtpValue(value);
                          otpForm.setFieldsValue({ otp: value });
                        }}
                        onComplete={(value) => {
                          setOtpValue(value);
                          otpForm.setFieldsValue({ otp: value });
                          // Auto-submit when OTP is complete
                          setTimeout(() => {
                            otpForm.submit();
                          }, 100);
                        }}
                        mobileNumber={otpForm.getFieldValue('mobileNumber')}
                      />
                    </Form.Item>
                  </div>

                  <Form.Item style={{ marginBottom: 0 }}>
                          <Space direction="vertical" style={{ width: '100%' }}>
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
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #0D9488 100%)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                                  }}
                            >
                              Verify OTP
                            </Button>
                    <Button
                              type="link"
                              onClick={() => setOtpSent(false)}
                        style={{ width: '100%', padding: 0, height: 'auto', color: '#10B981', fontWeight: 500, fontSize: '14px' }}
                            >
                        Resend OTP
                            </Button>
                          </Space>
                        </Form.Item>
                      </Form>
                        )}
                      </div>
          )}

          {/* Registration Link */}
          <div style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
            <Text style={{ color: '#4B5563', fontSize: '14px' }}>
                  Don't have an account?{' '}
                  <Link href="/register">
                <Text style={{ color: '#10B981', fontWeight: 600, cursor: 'pointer' }}>
                      Register here
                </Text>
                  </Link>
                </Text>
              </div>

          {/* Footer Links */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '24px',
            marginTop: '32px'
          }}>
            <Link href="/help">
              <Text style={{ color: '#6B7280', fontSize: '14px', cursor: 'pointer' }}>Help Center</Text>
            </Link>
            <Text style={{ color: '#D1D5DB' }}>•</Text>
            <Link href="/privacy">
              <Text style={{ color: '#6B7280', fontSize: '14px', cursor: 'pointer' }}>Privacy Policy</Text>
            </Link>
            <Text style={{ color: '#D1D5DB' }}>•</Text>
            <Link href="/terms">
              <Text style={{ color: '#6B7280', fontSize: '14px', cursor: 'pointer' }}>Terms</Text>
            </Link>
            </div>
        </div>
      </div>

      {/* Right Section - Promotional */}
      {!isMobile && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
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
    </div>
  );
}
