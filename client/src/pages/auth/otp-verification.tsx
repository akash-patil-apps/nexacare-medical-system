import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  App, 
  Space, 
  Typography, 
  Divider,
  Row,
  Col,
  Steps,
  Alert
} from 'antd';
import { 
  SecurityScanOutlined, 
  LockOutlined, 
  MedicineBoxOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { setAuthToken } from "../../lib/auth";
import { OTPInput } from "../../components/common/OTPInput";

const { Title, Text } = Typography;
const { Step } = Steps;

export default function OtpVerification() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [registrationData, setRegistrationData] = useState({
    mobileNumber: "",
    role: "",
    fullName: "",
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Get registration data from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const mobile = urlParams.get('mobile') || '';
    const role = urlParams.get('role') || '';
    const name = urlParams.get('name') || '';
    
    if (!mobile || !role) {
      setLocation('/register');
      return;
    }

    setRegistrationData({
      mobileNumber: mobile,
      role: role,
      fullName: name,
    });
  }, [setLocation]);

  const handleVerifyOtp = async (values: any) => {
    setIsLoading(true);
    try {
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
        message.success('OTP verified successfully!');
        setCurrentStep(1);
      } else {
        message.error(data.message || 'OTP verification failed');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      message.error('OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async (values: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registrationData,
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setAuthToken(data.token);
        message.success('Registration completed successfully!');
        setCurrentStep(2);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          setLocation('/dashboard');
        }, 2000);
      } else {
        message.error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      message.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    {
      title: 'Verify OTP',
      description: 'Enter the code sent to your mobile',
      icon: <SecurityScanOutlined />,
    },
    {
      title: 'Set Password',
      description: 'Create your account password',
      icon: <LockOutlined />,
    },
    {
      title: 'Complete',
      description: 'Account created successfully',
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <div className="medical-container">
      <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
        <Col xs={22} sm={18} md={12} lg={10} xl={8}>
          <Card className="medical-card" style={{ borderRadius: '12px' }}>
            <div className="medical-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
              <MedicineBoxOutlined style={{ fontSize: '32px', marginBottom: '16px' }} />
              <Title level={2} style={{ color: 'white', margin: 0 }}>
                Complete Registration
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                Verify your mobile number
              </Text>
            </div>

            <div className="medical-form">
              <Steps current={currentStep} items={steps} style={{ marginBottom: '32px' }} />

              {currentStep === 0 && (
                <Form
                  form={form}
                  name="verify-otp"
                  onFinish={handleVerifyOtp}
                  layout="vertical"
                  size="large"
                >
                  <Alert
                    message="OTP Sent"
                    description={`We've sent a 6-digit OTP to ${registrationData.mobileNumber}`}
                    type="info"
                    showIcon
                    style={{ marginBottom: '24px' }}
                  />

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
                        // Auto-submit when OTP is complete
                        setTimeout(() => {
                          form.submit();
                        }, 100);
                      }}
                      mobileNumber={registrationData.mobileNumber}
                    />
                  </Form.Item>

                  <Form.Item>
              <Button
                      type="primary"
                      htmlType="submit"
                      loading={isLoading}
                      className="medical-button-primary"
                      block
                      size="large"
                    >
                      Verify OTP
                    </Button>
                  </Form.Item>
                </Form>
              )}

              {currentStep === 1 && (
                <Form
                  form={form}
                  name="set-password"
                  onFinish={handleCompleteRegistration}
                  layout="vertical"
                  size="large"
                >
                  <Alert
                    message="OTP Verified"
                    description="Now create your account password"
                    type="success"
                    showIcon
                    style={{ marginBottom: '24px' }}
                  />

                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[
                      { required: true, message: 'Please enter your password' },
                      { min: 6, message: 'Password must be at least 6 characters' }
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Enter your password"
                      className="medical-input"
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
                      placeholder="Confirm your password"
                      className="medical-input"
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={isLoading}
                      className="medical-button-primary"
                      block
                      size="large"
                    >
                      Complete Registration
                </Button>
                  </Form.Item>
                </Form>
              )}

              {currentStep === 2 && (
                <div style={{ textAlign: 'center' }}>
                  <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a', marginBottom: '24px' }} />
                  <Title level={3} style={{ color: '#52c41a' }}>
                    Registration Complete!
                  </Title>
                  <Text type="secondary" style={{ marginBottom: '24px', display: 'block' }}>
                    Welcome to NexaCare Medical System, {registrationData.fullName}!
                  </Text>
                  <Text type="secondary" style={{ display: 'block' }}>
                    Redirecting to your dashboard...
                  </Text>
              </div>
              )}

              <Divider />

              <div style={{ textAlign: 'center' }}>
                <Button 
                  type="link"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => setLocation('/register')}
                >
                  Back to Registration
                </Button>
              </div>
            </div>
        </Card>
        </Col>
      </Row>
    </div>
  );
}