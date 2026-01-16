import React, { useState } from 'react';
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
  DatePicker,
} from 'antd';
import {
  UserOutlined,
  BankOutlined,
  ClockCircleOutlined,
  CheckCircleFilled,
  RightCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiRequest } from '../../lib/queryClient';

const { Option } = Select;

type StepConfig = {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
};

export default function ReceptionistOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  // Fetch hospitals
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
      const res = await apiRequest('POST', '/api/onboarding/receptionist/complete', data);
      return res.json();
    },
    onSuccess: async () => {
      const userRole = localStorage.getItem('userRole') || 'receptionist';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });
      localStorage.setItem('onboarding-just-completed', 'true');
      message.success('Profile completed successfully!');
      setTimeout(() => setLocation('/dashboard/receptionist'), 500);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to complete profile');
    },
  });

  const handleNext = async () => {
    try {
      const stepFields: Record<number, string[]> = {
        0: ['hospitalId'],
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
      await form.validateFields(['hospitalId']);
      const values = form.getFieldsValue(true);
      const transformedValues = {
        ...values,
        dateOfJoining: values.dateOfJoining ? values.dateOfJoining.format('YYYY-MM-DD') : null,
      };
      completeOnboardingMutation.mutate(transformedValues);
    } catch (error: any) {
      message.error('Please fill in all required fields');
    }
  };

  const steps: StepConfig[] = [
    {
      title: 'Hospital Selection',
      icon: <BankOutlined />,
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
        </Row>
      ),
    },
    {
      title: 'Work Details',
      icon: <ClockCircleOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item name="employeeId" label="Employee ID">
              <Input placeholder="Enter employee ID" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="department" label="Department">
              <Input placeholder="Enter department" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="shift" label="Shift">
              <Select placeholder="Select shift" size="large">
                <Option value="day">Day</Option>
                <Option value="night">Night</Option>
                <Option value="rotation">Rotation</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="workingHours" label="Working Hours">
              <Input placeholder="e.g., 9:00 AM - 5:00 PM" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="dateOfJoining" label="Date of Joining">
              <DatePicker style={{ width: '100%' }} size="large" />
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
    <div className="receptionist-onboarding-wrapper">
      <Card
        className="receptionist-onboarding-card"
        variant="borderless"
        style={{ borderRadius: 28, boxShadow: '0 28px 60px rgba(249, 115, 22, 0.12)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="receptionist-onboarding-layout">
          <aside className="receptionist-onboarding-stepper">
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary" className="receptionist-onboarding-progress-label">
                {progressLabel}
              </Typography.Text>
              <Typography.Title level={4} style={{ margin: 0, color: '#F97316' }}>
                Receptionist Profile Setup
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Complete your profile to start assisting patients.
              </Typography.Paragraph>
            </Space>
            <ul className="receptionist-stepper-list">
              {steps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                  <li key={step.title} className={`receptionist-stepper-item ${status}`}>
                    <span className="receptionist-stepper-icon">
                      {renderStatusIcon(status)}
                    </span>
                    <div className="receptionist-stepper-copy">
                      <Typography.Text className="receptionist-stepper-title">
                        {step.title}
                      </Typography.Text>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="receptionist-onboarding-content">
            <Typography.Title level={2} style={{ marginBottom: 16, color: '#F97316' }}>
              {steps[currentStep].title}
            </Typography.Title>

            <Form form={form} layout="vertical" preserve={true}>
              <div className="receptionist-onboarding-content-inner">
                {steps[currentStep].content}
              </div>
              <div className="receptionist-onboarding-footer">
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
                    style={{ backgroundColor: '#F97316', borderColor: '#F97316' }}
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
                      backgroundColor: '#F97316',
                      borderColor: '#F97316',
                      boxShadow: '0 12px 24px rgba(249, 115, 22, 0.25)',
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
