import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Tabs, 
  App, 
  Space, 
  Typography, 
  Divider, 
  Row, 
  Col 
} from 'antd';
import { 
  LockOutlined, 
  PhoneOutlined, 
  SafetyOutlined,
  MedicineBoxOutlined 
} from '@ant-design/icons';
import { authApi, setAuthToken } from "../../lib/auth";

const { Title, Text } = Typography;

export default function Login() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [otpForm] = Form.useForm();
  const [otpSent, setOtpSent] = useState(false);
  const [, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      console.log('🔍 Login success - data:', data);
      setAuthToken(data.token);
      message.success(`Welcome back, ${data.user.fullName}!`);
      
      // Wait for auth context to update before redirecting
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
    onSuccess: (data) => {
      console.log('🔍 OTP sent successfully:', data);
      setOtpSent(true);
      message.success(`OTP sent to ${data.mobileNumber}`);
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
      console.log('🔍 OTP verification success:', data);
      setAuthToken(data.token);
      message.success(`Welcome, ${data.user.fullName}!`);
      
      // Wait for auth context to update before redirecting
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
    <div className="medical-container" style={{ 
      height: '100vh', 
      width: '100vw',
      background: 'url("/hospital-background.png") center/cover no-repeat',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Form Overlay */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '40%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <Card className="medical-card" style={{ 
            borderRadius: '16px', 
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)'
          }}>
            <div className="medical-form" style={{ height: '450px', display: 'flex', flexDirection: 'column' }}>
              <Tabs 
                defaultActiveKey="password" 
                centered
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                items={[
                  {
                    key: 'password',
                    label: (
                      <span>
                        <LockOutlined />
                        Password Login
                      </span>
                    ),
                    children: (
                      <div style={{ height: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <Form
                        form={form}
                        name="password-login"
                        onFinish={onPasswordLogin}
                        layout="vertical"
                        size="large"
                      >
                        <Form.Item
                          name="mobileNumber"
                          label="Mobile Number"
                          rules={[
                            { required: true, message: 'Please enter your mobile number' },
                            { pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit mobile number' }
                          ]}
                        >
                          <Input
                            prefix={<PhoneOutlined />}
                            placeholder="Enter 10-digit mobile number"
                            className="medical-input"
                              style={{ height: '48px', borderRadius: '8px' }}
                          />
                        </Form.Item>

                        <Form.Item
                          name="password"
                          label="Password"
                          rules={[{ required: true, message: 'Please enter your password' }]}
                        >
                          <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Enter your password"
                            className="medical-input"
                              style={{ height: '48px', borderRadius: '8px' }}
                          />
                        </Form.Item>

                        <Form.Item>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={loginMutation.isPending}
                            className="medical-button-primary"
                            block
                            size="large"
                              style={{ 
                                height: '48px', 
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600'
                              }}
                            >
                              Sign In
                          </Button>
                        </Form.Item>
                      </Form>
                      </div>
                    )
                  },
                  {
                    key: 'otp',
                    label: (
                      <span>
                        <SafetyOutlined />
                        OTP Login
                      </span>
                    ),
                    children: (
                      <div style={{ height: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        {!otpSent ? (
                      <Form
                        form={form}
                        name="send-otp"
                        onFinish={onSendOtp}
                        layout="vertical"
                        size="large"
                      >
                        <Form.Item
                          name="mobileNumber"
                          label="Mobile Number"
                          rules={[
                            { required: true, message: 'Please enter your mobile number' },
                            { pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit mobile number' }
                          ]}
                        >
                <Input
                            prefix={<PhoneOutlined />}
                            placeholder="Enter 10-digit mobile number"
                            className="medical-input"
                                style={{ height: '48px', borderRadius: '8px' }}
                          />
                        </Form.Item>

                        <Form.Item>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={sendOtpMutation.isPending}
                            className="medical-button-primary"
                            block
                            size="large"
                                style={{ 
                                  height: '48px', 
                                  borderRadius: '8px',
                                  fontSize: '16px',
                                  fontWeight: '600'
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
                      >
                        <Form.Item
                          name="mobileNumber"
                          label="Mobile Number"
                          rules={[{ required: true, message: 'Please enter your mobile number' }]}
                        >
                  <Input
                            prefix={<PhoneOutlined />}
                            placeholder="Enter 10-digit mobile number"
                            className="medical-input"
                                style={{ height: '48px', borderRadius: '8px' }}
                          />
                        </Form.Item>

                        <Form.Item
                          name="otp"
                          label="OTP Code"
                          rules={[
                            { required: true, message: 'Please enter the OTP' },
                            { pattern: /^[0-9]{6}$/, message: 'Please enter a valid 6-digit OTP' }
                          ]}
                        >
                    <Input
                            prefix={<SafetyOutlined />}
                      placeholder="Enter 6-digit OTP"
                            className="medical-input"
                                style={{ height: '48px', borderRadius: '8px' }}
                      maxLength={6}
                    />
                        </Form.Item>

                        <Form.Item>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Button
                              type="primary"
                              htmlType="submit"
                              loading={verifyOtpMutation.isPending}
                              className="medical-button-primary"
                              block
                              size="large"
                                  style={{ 
                                    height: '48px', 
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: '600'
                                  }}
                            >
                              Verify OTP
                            </Button>
                    <Button
                              type="link"
                              onClick={() => setOtpSent(false)}
                              style={{ width: '100%' }}
                            >
                              Change Mobile Number
                            </Button>
                          </Space>
                        </Form.Item>
                      </Form>
                        )}
                      </div>
                    )
                  }
                ]}
              />

              <Divider />

              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">
                  Don't have an account?{' '}
                  <Link href="/register">
                    <Button type="link" style={{ padding: 0, fontWeight: '600' }}>
                      Register here
                    </Button>
                  </Link>
                </Text>
              </div>
            </div>
      </Card>
        </div>
      </div>
    </div>
  );
}