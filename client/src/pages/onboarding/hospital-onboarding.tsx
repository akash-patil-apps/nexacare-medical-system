import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  message,
  TimePicker,
  Switch,
  Row,
  Col,
  Space,
  Typography,
} from 'antd';
import {
  UserOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  SettingOutlined,
  SafetyOutlined,
  PhoneOutlined,
  LockOutlined,
  MailOutlined,
} from '@ant-design/icons';
import {
  CheckCircleFilled,
  RightCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { apiRequest } from '../../lib/queryClient';
import { setAuthToken } from '../../lib/auth';

const { TextArea } = Input;

interface StateOption {
  id: number;
  name: string;
  iso2?: string;
}

interface HospitalFormValues {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
  otp?: string;
  hospitalName: string;
  licenseNumber: string;
  establishedYear?: number;
  totalBeds?: number;
  address: string;
  city: string;
  stateId: number;
  zipCode: string;
  departments?: string[];
  services?: string[];
  operatingHours?: [Dayjs, Dayjs];
  emergencyServices: boolean;
  contactEmail?: string;
  website?: string;
  photos?: string[];
}

type StepConfig = {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  footer?: React.ReactNode;
};

export default function HospitalOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm<HospitalFormValues>();
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [accountRegistered, setAccountRegistered] = useState(false);
  const [accountValues, setAccountValues] = useState<Pick<HospitalFormValues, 'fullName' | 'email' | 'mobileNumber' | 'password'>>();

  const { data: statesResponse, isLoading: statesLoading } = useQuery<StateOption[]>({
    queryKey: ['/api/locations/states'],
  });

  const stateOptions = useMemo(() => statesResponse ?? [], [statesResponse]);

  const completeOnboardingMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest('POST', '/api/onboarding/hospital/complete', values);
      return res.json();
    },
    onSuccess: async () => {
      // Invalidate onboarding status query to refresh the cache
      const userRole = localStorage.getItem('userRole') || 'hospital';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });
      
      message.success('Hospital profile completed successfully!');
      
      // Small delay to ensure cache is updated before redirect
      setTimeout(() => {
        setLocation('/dashboard/hospital');
      }, 100);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to complete hospital onboarding');
    },
  });

  const validateAccountFields = async () => {
    const values = await form.validateFields(['fullName', 'email', 'mobileNumber', 'password', 'confirmPassword']);
    setAccountValues({
      fullName: values.fullName,
      email: values.email,
      mobileNumber: values.mobileNumber,
      password: values.password,
    });
    return values;
  };

  const handleSendOtp = async () => {
    try {
      const values = await validateAccountFields();
      setSendingOtp(true);
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: values.mobileNumber,
          role: 'hospital',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      message.success(`OTP sent to ${values.mobileNumber}`);
      console.log('Registration OTP:', data.otp);
      setCurrentStep(1);
    } catch (error: any) {
      message.error(error.message || 'Unable to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!accountValues) {
      message.error('Account details missing. Please go back.');
      return;
    }
    try {
      const { otp } = await form.validateFields(['otp']);
      setVerifyingOtp(true);

      const verifyResponse = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: accountValues.mobileNumber,
          otp,
        }),
      });
      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(verifyData.message || 'OTP verification failed');
      }

      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: accountValues.mobileNumber,
          fullName: accountValues.fullName,
          email: accountValues.email,
          password: accountValues.password,
          role: 'hospital',
        }),
      });
      const registerData = await registerResponse.json();
      if (!registerResponse.ok) {
        throw new Error(registerData.message || 'Registration failed');
      }

      setAuthToken(registerData.token);
      localStorage.setItem('userRole', 'hospital');
      message.success('Account created successfully!');
      setAccountRegistered(true);
      setCurrentStep(2);
    } catch (error: any) {
      message.error(error.message || 'Failed to verify OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      const values = await form.validateFields();
      const operatingHours = values.operatingHours || [];

      const payload = {
        hospitalName: values.hospitalName,
        licenseNumber: values.licenseNumber,
        establishedYear: values.establishedYear ? Number(values.establishedYear) : undefined,
        totalBeds: values.totalBeds ? Number(values.totalBeds) : undefined,
        address: values.address,
        city: values.city,
        stateId: values.stateId,
        zipCode: values.zipCode,
        departments: values.departments,
        services: values.services,
        operatingHoursStart: operatingHours[0]?.format('HH:mm'),
        operatingHoursEnd: operatingHours[1]?.format('HH:mm'),
        emergencyServices: values.emergencyServices,
        contactEmail: values.contactEmail,
        website: values.website,
        photos: values.photos,
      };

      completeOnboardingMutation.mutate(payload);
    } catch (error) {
      console.error('Hospital onboarding validation failed:', error);
    }
  };

  const steps: StepConfig[] = [
    {
      title: 'Account Setup',
      icon: <UserOutlined />,
      content: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="fullName"
              label="Full Name"
              rules={[{ required: true, message: 'Please enter your full name' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Administrator full name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, message: 'Please enter a valid email', type: 'email' }]}
            >
              <Input prefix={<MailOutlined />} placeholder="Email address" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="mobileNumber"
              label="Mobile Number"
              rules={[
                { required: true, message: 'Please enter mobile number' },
                { pattern: /^[0-9]{10}$/, message: 'Enter a valid 10-digit Indian mobile number' },
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="10-digit mobile" maxLength={10} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter a password' }, { min: 6, message: 'Minimum 6 characters' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Create password" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={["password"]}
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
              <Input.Password prefix={<LockOutlined />} placeholder="Re-enter password" />
            </Form.Item>
          </Col>
        </Row>
      ),
      footer: (
        <Button type="primary" onClick={handleSendOtp} loading={sendingOtp}>
          Send OTP
        </Button>
      ),
    },
    {
      title: 'Verify OTP',
      icon: <SafetyOutlined />,
      content: (
        <div>
          <Typography.Paragraph>
            Enter the 6-digit OTP sent to <strong>{form.getFieldValue('mobileNumber')}</strong>.
          </Typography.Paragraph>
          <Form.Item
            name="otp"
            label="OTP"
            rules={[{ required: true, message: 'Please enter OTP' }, { pattern: /^[0-9]{6}$/, message: 'Enter 6-digit OTP' }]}
          >
            <Input maxLength={6} placeholder="Enter OTP" style={{ textAlign: 'center', letterSpacing: 4 }} />
          </Form.Item>
        </div>
      ),
      footer: (
        <Space>
          <Button onClick={() => setCurrentStep(0)}>
            Back
          </Button>
          <Button type="primary" onClick={handleVerifyOtp} loading={verifyingOtp}>
            Verify & Continue
          </Button>
        </Space>
      ),
    },
    {
      title: 'Hospital Basics',
      icon: <HomeOutlined />,
      content: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="hospitalName"
              label="Hospital Name"
              rules={[{ required: true, message: 'Please enter hospital name' }]}
            >
              <Input placeholder="Hospital name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="licenseNumber"
              label="License Number"
              rules={[{ required: true, message: 'Please enter license number' }]}
            >
              <Input placeholder="License number" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="establishedYear" label="Established Year">
              <Input type="number" placeholder="e.g., 1998" min={1800} max={new Date().getFullYear()} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="totalBeds" label="Total Beds">
              <Input type="number" placeholder="Enter total beds" min={0} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: 'Location & Contact',
      icon: <EnvironmentOutlined />,
      content: (
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="address"
              label="Street & Area"
              rules={[{ required: true, message: 'Please enter address' }]}
            >
              <Input placeholder="Street address, area" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="city"
              label="City"
              rules={[{ required: true, message: 'Please enter city' }]}
            >
              <Input placeholder="City" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="stateId"
              label="State"
              rules={[{ required: true, message: 'Please select state' }]}
            >
              <Select
                placeholder="Select state"
                loading={statesLoading}
                showSearch
                optionFilterProp="children"
              >
                {stateOptions.map((state) => (
                  <Select.Option key={state.id} value={state.id}>
                    {state.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="zipCode"
              label="Zip Code"
              rules={[{ required: true, message: 'Please enter zip code' }]}
            >
              <Input placeholder="Zip / Postal code" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="contactEmail" label="Contact Email">
              <Input type="email" placeholder="Contact email (optional)" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="website" label="Website">
              <Input placeholder="https://example.com" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: 'Operations & Services',
      icon: <SettingOutlined />,
      content: (
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="departments" label="Departments">
              <Select mode="tags" placeholder="Add departments (press enter after each)" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="services" label="Services Offered">
              <Select mode="tags" placeholder="Add services (press enter after each)" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="operatingHours"
              label="Operating Hours"
              rules={[{ required: true, message: 'Please select operating hours' }]}
            >
              <TimePicker.RangePicker
                format="hh:mm A"
                use12Hours
                style={{ width: '100%' }}
                minuteStep={15}
                placeholder={["Opens at", "Closes at"]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="emergencyServices" label="Emergency Services" valuePropName="checked">
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="photos" label="Photo URLs (optional)">
              <Select mode="tags" placeholder="Paste photo URLs and press enter" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
  ];

  const renderFooter = () => {
    if (currentStep <= 1) {
      return steps[currentStep].footer ?? null;
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => setCurrentStep((prev) => prev - 1)}>Previous</Button>
        {currentStep < steps.length - 1 && (
          <Button type="primary" onClick={() => setCurrentStep((prev) => prev + 1)}>
            Next
          </Button>
        )}
        {currentStep === steps.length - 1 && (
          <Button
            type="primary"
            onClick={handleCompleteOnboarding}
            loading={completeOnboardingMutation.isPending}
          >
            Complete Profile
          </Button>
        )}
      </div>
    );
  };

  const isAccountStep = currentStep <= 1;
  const allowTransition = accountRegistered || currentStep <= 1;

  const getStepStatus = (index: number) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'active';
    return 'upcoming';
  };

  const renderStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'In progress';
      default:
        return 'Pending';
    }
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleFilled />;
      case 'active':
        return <RightCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const progressLabel = `Step ${Math.min(currentStep + 1, steps.length)} of ${steps.length}`;

  return (
    <div className="hospital-onboarding-wrapper">
      <Card
        className="hospital-onboarding-card"
        variant="borderless"
        style={{ borderRadius: 28, boxShadow: '0 28px 60px rgba(15, 34, 67, 0.12)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="hospital-onboarding-layout">
          <aside className="hospital-onboarding-stepper">
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary" className="hospital-onboarding-progress-label">
                {progressLabel}
              </Typography.Text>
              <Typography.Title level={4} style={{ margin: 0 }}>
                Hospital Onboarding
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Complete the following steps to set up your hospital profile.
              </Typography.Paragraph>
            </Space>
            <ul className="hospital-stepper-list">
              {steps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                  <li key={step.title} className={`hospital-stepper-item ${status}`}>
                    <span className="hospital-stepper-icon">
                      {renderStatusIcon(status)}
                    </span>
                    <div className="hospital-stepper-copy">
                      <Typography.Text className="hospital-stepper-title">
                        {step.title}
                      </Typography.Text>
                      <Typography.Text className="hospital-stepper-status">
                        {renderStatusLabel(status)}
                      </Typography.Text>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="hospital-onboarding-content">
            <Typography.Title level={2} style={{ marginBottom: 24 }}>
              {isAccountStep ? 'Create Hospital Admin Account' : 'Complete Hospital Profile'}
            </Typography.Title>

            {!allowTransition && (
              <Typography.Paragraph type="warning" style={{ marginBottom: 16 }}>
                Please complete account setup before continuing.
              </Typography.Paragraph>
            )}

            <Form
              form={form}
              layout="vertical"
              initialValues={{
                emergencyServices: true,
                operatingHours: [dayjs().hour(9).minute(0), dayjs().hour(21).minute(0)],
              }}
              disabled={currentStep > 1 && !accountRegistered}
            >
              <div className="hospital-onboarding-content-inner">
                {steps[currentStep].content}
              </div>
              <div className="hospital-onboarding-footer">{renderFooter()}</div>
            </Form>
          </div>
        </div>
      </Card>
    </div>
  );
}

