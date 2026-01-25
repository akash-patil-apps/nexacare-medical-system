import React, { useState } from 'react';
import { Modal, Form, Input, Button, Tabs, App, Typography, Steps } from 'antd';
import { PhoneOutlined, MailOutlined, LockOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { OTPInput } from '../common/OTPInput';
import { useMutation } from '@tanstack/react-query';

const { Text, Title } = Typography;
const { Step } = Steps;

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type OtpMethod = 'mobile' | 'email';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [otpMethod, setOtpMethod] = useState<OtpMethod>('mobile');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [identifier, setIdentifier] = useState('');

  const getCurrentStep = () => {
    if (!otpSent && !otpVerified) return 0; // Enter Mobile
    if (otpSent && !otpVerified) return 1; // Verify OTP
    if (otpVerified) return 2; // New Password
    return 0;
  };

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
      message.success('Password reset successfully!');
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 1500);
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const handleClose = () => {
    form.resetFields();
    setOtpSent(false);
    setOtpVerified(false);
    setOtpValue('');
    setIdentifier('');
    onClose();
  };

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
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={520}
      centered
      closable={false}
      styles={{
        body: { padding: '32px' }
      }}
    >
      <div>
        {/* Back to Login Link */}
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleClose}
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

        {/* Title and Subtitle */}
        <div style={{ marginBottom: '32px' }}>
          <Title 
            level={2} 
            style={{ 
              margin: 0, 
              marginBottom: '8px', 
              textAlign: 'center', 
              fontSize: '32px', 
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1.2,
              letterSpacing: '-0.5px'
            }}
          >
            Forgot Password
          </Title>
          <Text 
            style={{ 
              fontSize: '14px', 
              color: '#6B7280', 
              display: 'block', 
              textAlign: 'center',
              lineHeight: 1.5
            }}
          >
            Reset your password using OTP verification
          </Text>
        </div>

        {/* Progress Steps */}
        <Steps
          current={getCurrentStep()}
          style={{ marginBottom: '32px' }}
          items={[
            {
              title: 'Enter Mobile',
              icon: <PhoneOutlined />,
            },
            {
              title: 'Verify OTP',
              icon: <LockOutlined />,
            },
            {
              title: 'New Password',
              icon: <LockOutlined />,
            },
            {
              title: 'Success',
              icon: <CheckCircleOutlined />,
            },
          ]}
        />

        {/* Step 1: Enter Mobile/Email */}
        {!otpSent && !otpVerified && (
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
                        height: '48px', 
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
                      height: '48px', 
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
                    height: '48px', 
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
        {otpSent && !otpVerified && (
          <Form
            form={form}
            onFinish={handleVerifyOtp}
            layout="vertical"
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
              />
            </Form.Item>

            <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
              <Button
                htmlType="submit"
                loading={verifyOtpMutation.isPending}
                block
                size="large"
                style={{ 
                  height: '48px', 
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
        {otpVerified && !resetPasswordMutation.isSuccess && (
          <>
            <Text style={{ fontSize: '14px', color: '#6B7280', display: 'block', marginBottom: '24px' }}>
              Your new password must be different from previously used password.
            </Text>
            <Form
              form={form}
              onFinish={handleResetPassword}
              layout="vertical"
            >
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
                    height: '48px', 
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
                    height: '48px', 
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
                    height: '48px', 
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  Reset Password
                </Button>
              </Form.Item>
            </Form>
          </>
        )}

        {/* Step 4: Success */}
        {resetPasswordMutation.isSuccess && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <CheckCircleOutlined style={{ fontSize: '64px', color: '#10B981', marginBottom: '24px' }} />
            <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
              Password Reset Successful!
            </Title>
            <Text style={{ color: '#6B7280', display: 'block', marginBottom: '32px' }}>
              Your password has been reset successfully. You can now login with your new password.
            </Text>
          </div>
        )}
      </div>
    </Modal>
  );
};
