import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, message, TimePicker, Switch, Row, Col, Space, Typography } from 'antd';
import { UserOutlined, HomeOutlined, EnvironmentOutlined, SettingOutlined, PhoneOutlined, LockOutlined, MailOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { apiRequest } from '../../lib/queryClient';
import { setAuthToken } from '../../lib/auth';
import { OnboardingStepsLayout } from '../../components/onboarding/OnboardingStepsLayout';

const { Text } = Typography;

const HOSPITAL_STEPS = [
  { title: 'Account Setup' },
  { title: 'Verify OTP' },
  { title: 'Hospital Basics' },
  { title: 'Location & Contact' },
  { title: 'Operations & Services' },
];
const STEP_TITLES = ['Account Setup', 'Verify OTP', 'Hospital Basics', 'Location & Contact', 'Operations & Services'];
const STEP_NOTES = [
  'Create your hospital admin account.',
  'Enter the OTP sent to your mobile.',
  'Enter hospital name and license.',
  'Enter address and contact details.',
  'Set departments, hours, and services.',
];
const fieldStyle = { borderRadius: 12 };

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
    queryFn: async () => {
      const response = await fetch('/api/locations/states');
      if (!response.ok) {
        throw new Error('Failed to fetch states');
      }
      return response.json();
    },
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

  const handleBack = () => {
    if (currentStep === 0) setLocation('/dashboard/hospital');
    else setCurrentStep(currentStep - 1);
  };

  return (
    <OnboardingStepsLayout
      steps={HOSPITAL_STEPS}
      currentStepIndex={currentStep}
      stepTitle={STEP_TITLES[currentStep]}
      stepNote={STEP_NOTES[currentStep]}
      onBack={handleBack}
      showHelpLink
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          emergencyServices: true,
          operatingHours: [dayjs().hour(9).minute(0), dayjs().hour(21).minute(0)],
        }}
        disabled={currentStep > 1 && !accountRegistered}
      >
        {currentStep === 0 && (
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: 'Please enter your full name' }]}>
                <Input prefix={<UserOutlined />} placeholder="Administrator full name" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please enter a valid email', type: 'email' }]}>
                <Input prefix={<MailOutlined />} placeholder="Email address" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mobileNumber" label="Mobile Number" rules={[{ required: true, message: 'Please enter mobile number' }, { pattern: /^[0-9]{10}$/, message: 'Enter a valid 10-digit number' }]}>
                <Input prefix={<PhoneOutlined />} placeholder="10-digit mobile" maxLength={10} style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter a password' }, { min: 6, message: 'Minimum 6 characters' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="Create password" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="confirmPassword" label="Confirm Password" dependencies={['password']} rules={[{ required: true, message: 'Please confirm password' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) return Promise.resolve(); return Promise.reject(new Error('Passwords do not match')); } })]}>
                <Input.Password prefix={<LockOutlined />} placeholder="Re-enter password" style={fieldStyle} />
              </Form.Item>
            </Col>
          </Row>
        )}
        {currentStep === 1 && (
          <div>
            <Text type="secondary">Enter the 6-digit OTP sent to <strong>{form.getFieldValue('mobileNumber')}</strong>.</Text>
            <Form.Item name="otp" label="OTP" rules={[{ required: true, message: 'Please enter OTP' }, { pattern: /^[0-9]{6}$/, message: 'Enter 6-digit OTP' }]} style={{ marginTop: 8 }}>
              <Input maxLength={6} placeholder="Enter OTP" style={{ textAlign: 'center', letterSpacing: 4, borderRadius: 12 }} />
            </Form.Item>
          </div>
        )}
        {currentStep === 2 && (
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Form.Item name="hospitalName" label="Hospital Name" rules={[{ required: true, message: 'Please enter hospital name' }]}>
                <Input placeholder="Hospital name" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="licenseNumber" label="License Number" rules={[{ required: true, message: 'Please enter license number' }]}>
                <Input placeholder="License number" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="establishedYear" label="Established Year">
                <Input type="number" placeholder="e.g., 1998" min={1800} max={new Date().getFullYear()} style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Total beds are managed in Hospital → IPD → Beds. Add beds after onboarding.</Text>
            </Col>
          </Row>
        )}
        {currentStep === 3 && (
          <Row gutter={[16, 8]}>
            <Col span={24}>
              <Form.Item name="address" label="Street & Area" rules={[{ required: true, message: 'Please enter address' }]}>
                <Input placeholder="Street address, area" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="city" label="City" rules={[{ required: true, message: 'Please enter city' }]}>
                <Input placeholder="City" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="stateId" label="State" rules={[{ required: true, message: 'Please select state' }]}>
                <Select placeholder="Select state" loading={statesLoading} showSearch optionFilterProp="children" style={fieldStyle}>
                  {stateOptions.map((state: StateOption) => <Select.Option key={state.id} value={state.id}>{state.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="zipCode" label="Zip Code" rules={[{ required: true, message: 'Please enter zip code' }]}>
                <Input placeholder="Zip / Postal code" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactEmail" label="Contact Email">
                <Input type="email" placeholder="Contact email (optional)" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="website" label="Website">
                <Input placeholder="https://example.com" style={fieldStyle} />
              </Form.Item>
            </Col>
          </Row>
        )}
        {currentStep === 4 && (
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Form.Item name="departments" label="Departments">
                <Select mode="tags" placeholder="Add departments" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="services" label="Services Offered">
                <Select mode="tags" placeholder="Add services" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="operatingHours" label="Operating Hours" rules={[{ required: true, message: 'Please select operating hours' }]}>
                <TimePicker.RangePicker format="hh:mm A" use12Hours style={{ width: '100%', borderRadius: 12 }} minuteStep={15} placeholder={['Opens at', 'Closes at']} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="emergencyServices" label="Emergency Services" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="photos" label="Photo URLs (optional)">
                <Select mode="tags" placeholder="Paste photo URLs" style={fieldStyle} />
              </Form.Item>
            </Col>
          </Row>
        )}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          {currentStep === 0 && <Button type="primary" onClick={handleSendOtp} loading={sendingOtp} style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Send OTP</Button>}
          {currentStep === 1 && (
            <Space>
              <Button onClick={() => setCurrentStep(0)} style={{ borderRadius: 12 }}>Back</Button>
              <Button type="primary" onClick={handleVerifyOtp} loading={verifyingOtp} style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Verify & Continue</Button>
            </Space>
          )}
          {currentStep >= 2 && (
            <>
              <Button onClick={() => setCurrentStep(currentStep - 1)} style={{ borderRadius: 12 }}>Previous</Button>
              {currentStep < 4 ? (
                <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)} icon={<RightOutlined />} iconPosition="end" style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Next</Button>
              ) : (
                <Button type="primary" onClick={handleCompleteOnboarding} loading={completeOnboardingMutation.isPending} style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Complete Profile</Button>
              )}
            </>
          )}
        </div>
      </Form>
    </OnboardingStepsLayout>
  );
}

