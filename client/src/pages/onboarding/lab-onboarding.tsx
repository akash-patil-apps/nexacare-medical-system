import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  TimePicker,
} from 'antd';
import {
  ExperimentOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  SettingOutlined,
  CheckCircleFilled,
  RightCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiRequest } from '../../lib/queryClient';

const { Option } = Select;
const { TextArea } = Input;

type StepConfig = {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
};

export default function LabOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/onboarding/lab/complete', data);
      return res.json();
    },
    onSuccess: async () => {
      const userRole = localStorage.getItem('userRole') || 'lab';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });
      localStorage.setItem('onboarding-just-completed', 'true');
      message.success('Profile completed successfully!');
      setTimeout(() => setLocation('/dashboard/lab'), 500);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to complete profile');
    },
  });

  const handleNext = async () => {
    try {
      const stepFields: Record<number, string[]> = {
        0: ['name', 'licenseNumber', 'address', 'city', 'state', 'zipCode'],
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

  const handleComplete = async () => {
    try {
      await form.validateFields(['name', 'licenseNumber', 'address', 'city', 'state', 'zipCode']);
      const values = form.getFieldsValue(true);
      const transformedValues = {
        ...values,
        operatingHours: values.operatingHours
          ? `${values.operatingHours[0]?.format('HH:mm')}-${values.operatingHours[1]?.format('HH:mm')}`
          : null,
      };
      completeOnboardingMutation.mutate(transformedValues);
    } catch (error: any) {
      message.error('Please fill in all required fields');
    }
  };

  const steps: StepConfig[] = [
    {
      title: 'Lab Basics',
      icon: <HomeOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="name"
              label="Lab Name"
              rules={[{ required: true, message: 'Please enter lab name' }]}
            >
              <Input placeholder="Enter lab name" size="large" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="licenseNumber"
              label="License Number"
              rules={[{ required: true, message: 'Please enter license number' }]}
            >
              <Input placeholder="Enter license number" size="large" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="address"
              label="Street Address"
              rules={[{ required: true, message: 'Please enter address' }]}
            >
              <Input placeholder="Enter street address" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="city"
              label="City"
              rules={[{ required: true, message: 'Please enter city' }]}
            >
              <Input placeholder="Enter city" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="state"
              label="State"
              rules={[{ required: true, message: 'Please enter state' }]}
            >
              <Input placeholder="Enter state" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="zipCode"
              label="Zip Code"
              rules={[{ required: true, message: 'Please enter zip code' }]}
            >
              <Input placeholder="Enter zip code" size="large" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: 'Lab Details',
      icon: <SettingOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item name="contactEmail" label="Contact Email">
              <Input type="email" placeholder="Enter contact email" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="operatingHours" label="Operating Hours">
              <TimePicker.RangePicker
                format="HH:mm"
                style={{ width: '100%' }}
                size="large"
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="specializations" label="Specializations">
              <Select
                mode="tags"
                placeholder="Add specializations (press enter after each)"
                size="large"
              >
                <Option value="Pathology">Pathology</Option>
                <Option value="Microbiology">Microbiology</Option>
                <Option value="Biochemistry">Biochemistry</Option>
                <Option value="Hematology">Hematology</Option>
                <Option value="Immunology">Immunology</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="testCategories" label="Test Categories">
              <Select
                mode="tags"
                placeholder="Add test categories (press enter after each)"
                size="large"
              >
                <Option value="Blood Tests">Blood Tests</Option>
                <Option value="Urine Tests">Urine Tests</Option>
                <Option value="Stool Tests">Stool Tests</Option>
                <Option value="Culture Tests">Culture Tests</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="equipment" label="Equipment">
              <Select
                mode="tags"
                placeholder="Add equipment (press enter after each)"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="accreditation" label="Accreditation">
              <TextArea
                rows={3}
                placeholder="Enter accreditations and certifications"
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
    <div className="lab-onboarding-wrapper">
      <Card
        className="lab-onboarding-card"
        variant="borderless"
        style={{ borderRadius: 28, boxShadow: '0 28px 60px rgba(14, 165, 233, 0.12)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="lab-onboarding-layout">
          <aside className="lab-onboarding-stepper">
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary" className="lab-onboarding-progress-label">
                {progressLabel}
              </Typography.Text>
              <Typography.Title level={4} style={{ margin: 0, color: '#0EA5E9' }}>
                Lab Profile Setup
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Complete your lab profile to start managing tests.
              </Typography.Paragraph>
            </Space>
            <ul className="lab-stepper-list">
              {steps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                  <li key={step.title} className={`lab-stepper-item ${status}`}>
                    <span className="lab-stepper-icon">
                      {renderStatusIcon(status)}
                    </span>
                    <div className="lab-stepper-copy">
                      <Typography.Text className="lab-stepper-title">
                        {step.title}
                      </Typography.Text>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="lab-onboarding-content">
            <Typography.Title level={2} style={{ marginBottom: 16, color: '#0EA5E9' }}>
              {steps[currentStep].title}
            </Typography.Title>

            <Form form={form} layout="vertical" preserve={true}>
              <div className="lab-onboarding-content-inner">
                {steps[currentStep].content}
              </div>
              <div className="lab-onboarding-footer">
                {currentStep > 0 && (
                  <Button onClick={() => setCurrentStep(currentStep - 1)} size="large">
                    Previous
                  </Button>
                )}
                {currentStep < steps.length - 1 && (
                  <Button
                    type="primary"
                    onClick={handleNext}
                    size="large"
                    style={{ backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' }}
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
                      backgroundColor: '#0EA5E9',
                      borderColor: '#0EA5E9',
                      boxShadow: '0 12px 24px rgba(14, 165, 233, 0.25)',
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
