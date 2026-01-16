import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  Space,
  Typography,
  message,
  InputNumber,
} from 'antd';
import {
  UserOutlined,
  MedicineBoxOutlined,
  DollarOutlined,
  CheckCircleFilled,
  RightCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Option } = Select;
const { TextArea } = Input;

interface DoctorFormValues {
  hospitalId: number;
  specialty: string;
  qualification: string;
  licenseNumber: string;
  experience?: number;
  consultationFee?: number;
  workingHours?: string;
  languages?: string[];
  bio?: string;
  awards?: string;
}

type StepConfig = {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
};

export default function DoctorOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm<DoctorFormValues>();
  const [qualifications, setQualifications] = useState<string[]>(['']);

  // Fetch hospitals for selection
  const { data: hospitals = [], isLoading: hospitalsLoading } = useQuery({
    queryKey: ['/api/hospitals'],
    queryFn: async () => {
      const res = await fetch('/api/hospitals');
      if (!res.ok) throw new Error('Failed to fetch hospitals');
      return res.json();
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/onboarding/doctor/complete', data);
      return res.json();
    },
    onSuccess: async (data) => {
      console.log('✅ Doctor onboarding completed successfully:', data);

      const userRole = localStorage.getItem('userRole') || 'doctor';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });

      localStorage.setItem('onboarding-just-completed', 'true');
      localStorage.setItem('onboarding-completed-timestamp', Date.now().toString());

      message.success('Profile completed successfully! Welcome to NexaCare!');

      setTimeout(() => {
        setLocation('/dashboard/doctor');
      }, 500);
    },
    onError: (error: any) => {
      console.error('❌ Doctor onboarding error:', error);
      message.error(error.message || 'Failed to complete profile');
    },
  });

  const handleNext = async () => {
    try {
      const stepFields: Record<number, (keyof DoctorFormValues)[]> = {
        0: ['hospitalId', 'specialty', 'qualification', 'licenseNumber'],
        1: ['consultationFee'],
      };

      const fieldsToValidate = stepFields[currentStep] || [];
      if (fieldsToValidate.length > 0) {
        await form.validateFields(fieldsToValidate);
      }

      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {
    if (completeOnboardingMutation.isPending) return;

    try {
      await form.validateFields(['hospitalId', 'specialty', 'qualification', 'licenseNumber']);

      const allValues = form.getFieldsValue(true);
      
      // Combine qualifications
      const qualificationText = qualifications.filter(q => q.trim()).join(', ');

      const transformedValues = {
        ...allValues,
        qualification: qualificationText || allValues.qualification,
        languages: Array.isArray(allValues.languages) ? allValues.languages.join(', ') : allValues.languages,
      };

      completeOnboardingMutation.mutate(transformedValues);
    } catch (error: any) {
      console.error('❌ Validation failed:', error);
      if (error.errorFields && error.errorFields.length > 0) {
        const firstError = error.errorFields[0];
        message.error(firstError?.errors?.[0] || 'Please fill in all required fields');
      } else {
        message.error('Please fill in all required fields');
      }
    }
  };

  const addQualification = () => {
    setQualifications([...qualifications, '']);
  };

  const removeQualification = (index: number) => {
    if (qualifications.length > 1) {
      setQualifications(qualifications.filter((_, i) => i !== index));
    }
  };

  const updateQualification = (index: number, value: string) => {
    const updated = [...qualifications];
    updated[index] = value;
    setQualifications(updated);
  };

  const steps: StepConfig[] = [
    {
      title: 'Hospital & Professional Info',
      icon: <UserOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="hospitalId"
              label="Hospital"
              rules={[{ required: true, message: 'Please select a hospital' }]}
            >
              <Select
                placeholder="Select hospital"
                loading={hospitalsLoading}
                showSearch
                optionFilterProp="children"
                size="large"
              >
                {hospitals.map((hospital: any) => (
                  <Option key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="specialty"
              label="Specialty"
              rules={[{ required: true, message: 'Please enter your specialty' }]}
            >
              <Select
                placeholder="Select or enter specialty"
                showSearch
                allowClear
                size="large"
              >
                <Option value="General Medicine">General Medicine</Option>
                <Option value="Cardiology">Cardiology</Option>
                <Option value="Pediatrics">Pediatrics</Option>
                <Option value="Orthopedics">Orthopedics</Option>
                <Option value="Dermatology">Dermatology</Option>
                <Option value="Neurology">Neurology</Option>
                <Option value="Oncology">Oncology</Option>
                <Option value="Gynecology">Gynecology</Option>
                <Option value="Psychiatry">Psychiatry</Option>
                <Option value="ENT">ENT</Option>
                <Option value="Ophthalmology">Ophthalmology</Option>
                <Option value="Urology">Urology</Option>
                <Option value="Gastroenterology">Gastroenterology</Option>
                <Option value="Pulmonology">Pulmonology</Option>
                <Option value="Endocrinology">Endocrinology</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="Qualifications">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {qualifications.map((qual, index) => (
                  <Space key={index} style={{ width: '100%' }}>
                    <Input
                      placeholder="e.g., MBBS, MD, MS, DM"
                      value={qual}
                      onChange={(e) => updateQualification(index, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {qualifications.length > 1 && (
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => removeQualification(index)}
                        danger
                      />
                    )}
                  </Space>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addQualification}
                  style={{ width: '100%' }}
                >
                  Add Qualification
                </Button>
              </Space>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="licenseNumber"
              label="Medical License Number"
              rules={[{ required: true, message: 'Please enter license number' }]}
            >
              <Input placeholder="Enter medical license number" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="experience" label="Years of Experience">
              <InputNumber
                placeholder="Years"
                min={0}
                max={50}
                style={{ width: '100%' }}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: 'Practice Details',
      icon: <DollarOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item name="consultationFee" label="Consultation Fee (₹)">
              <InputNumber
                placeholder="Enter fee"
                min={0}
                style={{ width: '100%' }}
                size="large"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="workingHours" label="Working Hours">
              <Input placeholder="e.g., 9:00 AM - 5:00 PM" size="large" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="languages" label="Languages Spoken">
              <Select
                mode="tags"
                placeholder="Add languages (press enter after each)"
                size="large"
              >
                <Option value="English">English</Option>
                <Option value="Hindi">Hindi</Option>
                <Option value="Marathi">Marathi</Option>
                <Option value="Gujarati">Gujarati</Option>
                <Option value="Tamil">Tamil</Option>
                <Option value="Telugu">Telugu</Option>
                <Option value="Bengali">Bengali</Option>
                <Option value="Kannada">Kannada</Option>
                <Option value="Malayalam">Malayalam</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="awards" label="Awards & Recognitions">
              <TextArea
                rows={3}
                placeholder="List any awards, recognitions, or achievements"
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="bio" label="Professional Bio">
              <TextArea
                rows={4}
                placeholder="Tell us about your medical practice and approach to patient care..."
              />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
  ];

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

  const progressLabel = `Step ${currentStep + 1} of ${steps.length}`;

  return (
    <div className="doctor-onboarding-wrapper">
      <Card
        className="doctor-onboarding-card"
        variant="borderless"
        style={{ borderRadius: 28, boxShadow: '0 28px 60px rgba(29, 78, 216, 0.12)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="doctor-onboarding-layout">
          <aside className="doctor-onboarding-stepper">
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary" className="doctor-onboarding-progress-label">
                {progressLabel}
              </Typography.Text>
              <Typography.Title level={4} style={{ margin: 0, color: '#1D4ED8' }}>
                Doctor Profile Setup
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Complete your profile to start managing patients.
              </Typography.Paragraph>
            </Space>
            <ul className="doctor-stepper-list">
              {steps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                  <li key={step.title} className={`doctor-stepper-item ${status}`}>
                    <span className="doctor-stepper-icon">
                      {renderStatusIcon(status)}
                    </span>
                    <div className="doctor-stepper-copy">
                      <Typography.Text className="doctor-stepper-title">
                        {step.title}
                      </Typography.Text>
                      <Typography.Text className="doctor-stepper-status">
                        {renderStatusLabel(status)}
                      </Typography.Text>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="doctor-onboarding-content">
            <Typography.Title level={2} style={{ marginBottom: 16, color: '#1D4ED8' }}>
              {steps[currentStep].title}
            </Typography.Title>

            <Form
              form={form}
              layout="vertical"
              preserve={true}
              initialValues={{}}
            >
              <div className="doctor-onboarding-content-inner">
                {steps[currentStep].content}
              </div>
              <div className="doctor-onboarding-footer">
                {currentStep > 0 && (
                  <Button onClick={handlePrev} size="large">
                    Previous
                  </Button>
                )}
                {currentStep < steps.length - 1 && (
                  <Button
                    type="primary"
                    onClick={handleNext}
                    size="large"
                    style={{ backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' }}
                  >
                    Next
                  </Button>
                )}
                {currentStep === steps.length - 1 && (
                  <Button
                    type="primary"
                    onClick={handleComplete}
                    loading={completeOnboardingMutation.isPending}
                    size="large"
                    style={{
                      backgroundColor: '#1D4ED8',
                      borderColor: '#1D4ED8',
                      boxShadow: '0 12px 24px rgba(29, 78, 216, 0.25)',
                    }}
                  >
                    Complete Profile
                  </Button>
                )}
              </div>
            </Form>
          </div>
        </div>
      </Card>
    </div>
  );
}
