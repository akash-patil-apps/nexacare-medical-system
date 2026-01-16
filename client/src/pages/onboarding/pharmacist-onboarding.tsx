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
  BankOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  ShoppingOutlined,
  CheckCircleFilled,
  RightCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Option } = Select;
const { TextArea } = Input;

type StepConfig = {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
};

export default function PharmacistOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [qualifications, setQualifications] = useState<string[]>(['']);
  const [experiences, setExperiences] = useState<Array<{ role: string; years: number }>>([{ role: '', years: 0 }]);

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
      const res = await apiRequest('POST', '/api/onboarding/pharmacist/complete', data);
      return res.json();
    },
    onSuccess: async () => {
      const userRole = localStorage.getItem('userRole') || 'pharmacist';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });
      localStorage.setItem('onboarding-just-completed', 'true');
      message.success('Profile completed successfully! Welcome to NexaCare!');
      setTimeout(() => setLocation('/dashboard/pharmacist'), 500);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to complete profile');
    },
  });

  const handleNext = async () => {
    try {
      const stepFields: Record<number, string[]> = {
        0: ['hospitalId'],
        1: ['pharmacyDegree', 'licenseNumber'],
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
      await form.validateFields(['hospitalId', 'pharmacyDegree', 'licenseNumber', 'pharmacyType', 'shiftType']);
      const values = form.getFieldsValue(true);
      
      // Combine qualifications
      const qualificationText = qualifications.filter(q => q.trim()).join(', ');
      
      // Calculate total experience
      const totalExperience = experiences.reduce((sum, exp) => sum + (exp.years || 0), 0);
      
      const transformedValues = {
        ...values,
        pharmacyDegree: qualificationText || values.pharmacyDegree,
        experience: totalExperience || values.experience,
        languages: Array.isArray(values.languages) ? values.languages.join(', ') : values.languages,
        certifications: Array.isArray(values.certifications) ? values.certifications.join(', ') : values.certifications,
      };

      completeOnboardingMutation.mutate(transformedValues);
    } catch (error: any) {
      message.error('Please fill in all required fields');
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

  const addExperience = () => {
    setExperiences([...experiences, { role: '', years: 0 }]);
  };

  const removeExperience = (index: number) => {
    if (experiences.length > 1) {
      setExperiences(experiences.filter((_, i) => i !== index));
    }
  };

  const updateExperience = (index: number, field: 'role' | 'years', value: string | number) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], [field]: value };
    setExperiences(updated);
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
      title: 'Professional Qualifications',
      icon: <UserOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item label="Pharmacy Qualifications">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {qualifications.map((qual, index) => (
                  <Space key={index} style={{ width: '100%' }}>
                    <Select
                      placeholder="Select pharmacy qualification"
                      value={qual || undefined}
                      onChange={(value) => updateQualification(index, value)}
                      style={{ flex: 1 }}
                    >
                      <Option value="BPharm">Bachelor of Pharmacy (BPharm)</Option>
                      <Option value="MPharm">Master of Pharmacy (MPharm)</Option>
                      <Option value="PharmD">Doctor of Pharmacy (PharmD)</Option>
                      <Option value="DPharm">Diploma in Pharmacy (DPharm)</Option>
                      <Option value="Other">Other</Option>
                    </Select>
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
              label="Pharmacy License Number"
              rules={[{ required: true, message: 'Please enter license number' }]}
            >
              <Input placeholder="Enter pharmacy license number" size="large" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="Experience">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {experiences.map((exp, index) => (
                  <Space key={index} style={{ width: '100%' }}>
                    <Input
                      placeholder="Role/Position"
                      value={exp.role}
                      onChange={(e) => updateExperience(index, 'role', e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <InputNumber
                      placeholder="Years"
                      value={exp.years}
                      onChange={(value) => updateExperience(index, 'years', value || 0)}
                      min={0}
                      max={50}
                      style={{ flex: 1 }}
                    />
                    {experiences.length > 1 && (
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => removeExperience(index)}
                        danger
                      />
                    )}
                  </Space>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addExperience}
                  style={{ width: '100%' }}
                >
                  Add Experience
                </Button>
              </Space>
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
                <Option value="Bengali">Bengali</Option>
                <Option value="Tamil">Tamil</Option>
                <Option value="Telugu">Telugu</Option>
                <Option value="Kannada">Kannada</Option>
                <Option value="Malayalam">Malayalam</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: 'Specialization & Certifications',
      icon: <MedicineBoxOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item name="specialization" label="Pharmacy Specialization">
              <Select placeholder="Select specialization" size="large">
                <Option value="Clinical Pharmacy">Clinical Pharmacy</Option>
                <Option value="Community Pharmacy">Community Pharmacy</Option>
                <Option value="Hospital Pharmacy">Hospital Pharmacy</Option>
                <Option value="Oncology Pharmacy">Oncology Pharmacy</Option>
                <Option value="Pediatric Pharmacy">Pediatric Pharmacy</Option>
                <Option value="Geriatric Pharmacy">Geriatric Pharmacy</Option>
                <Option value="Psychiatric Pharmacy">Psychiatric Pharmacy</Option>
                <Option value="Cardiovascular Pharmacy">Cardiovascular Pharmacy</Option>
                <Option value="Infectious Disease">Infectious Disease Pharmacy</Option>
                <Option value="General Pharmacy">General Pharmacy</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="certifications" label="Additional Certifications">
              <Select
                mode="tags"
                placeholder="Add certifications (press enter after each)"
                size="large"
              >
                <Option value="BCPS">Board Certified Pharmacotherapy Specialist (BCPS)</Option>
                <Option value="BCACP">Board Certified Ambulatory Care Pharmacist (BCACP)</Option>
                <Option value="BCOP">Board Certified Oncology Pharmacist (BCOP)</Option>
                <Option value="BCPP">Board Certified Psychiatric Pharmacist (BCPP)</Option>
                <Option value="BCCCP">Board Certified Critical Care Pharmacist (BCCCP)</Option>
                <Option value="CGP">Certified Geriatric Pharmacist (CGP)</Option>
                <Option value="CSP">Certified Specialty Pharmacist (CSP)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: 'Work Details',
      icon: <ShoppingOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="pharmacyType"
              label="Pharmacy Type"
              rules={[{ required: true, message: 'Please select pharmacy type' }]}
            >
              <Select placeholder="Select pharmacy type" size="large">
                <Option value="hospital">Hospital Pharmacy</Option>
                <Option value="retail">Retail Pharmacy</Option>
                <Option value="clinical">Clinical Pharmacy</Option>
                <Option value="specialty">Specialty Pharmacy</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="shiftType"
              label="Preferred Shift Type"
              rules={[{ required: true, message: 'Please select shift type' }]}
            >
              <Select placeholder="Select shift type" size="large">
                <Option value="day">Day Shift (9 AM - 6 PM)</Option>
                <Option value="night">Night Shift (6 PM - 9 AM)</Option>
                <Option value="rotation">Rotating Shifts</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="workingHours" label="Working Hours Preference">
              <Input placeholder="e.g., 8 hours/day, 6 days/week" size="large" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="bio" label="Professional Bio">
              <TextArea
                rows={4}
                placeholder="Tell us about your pharmacy experience and approach to patient care..."
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
    <div className="pharmacist-onboarding-wrapper">
      <Card
        className="pharmacist-onboarding-card"
        variant="borderless"
        style={{ borderRadius: 28, boxShadow: '0 28px 60px rgba(168, 85, 247, 0.12)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="pharmacist-onboarding-layout">
          <aside className="pharmacist-onboarding-stepper">
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary" className="pharmacist-onboarding-progress-label">
                {progressLabel}
              </Typography.Text>
              <Typography.Title level={4} style={{ margin: 0, color: '#a855f7' }}>
                Pharmacist Profile Setup
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Complete your profile to start managing medications.
              </Typography.Paragraph>
            </Space>
            <ul className="pharmacist-stepper-list">
              {steps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                  <li key={step.title} className={`pharmacist-stepper-item ${status}`}>
                    <span className="pharmacist-stepper-icon">
                      {renderStatusIcon(status)}
                    </span>
                    <div className="pharmacist-stepper-copy">
                      <Typography.Text className="pharmacist-stepper-title">
                        {step.title}
                      </Typography.Text>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="pharmacist-onboarding-content">
            <Typography.Title level={2} style={{ marginBottom: 16, color: '#a855f7' }}>
              {steps[currentStep].title}
            </Typography.Title>

            <Form form={form} layout="vertical" preserve={true}>
              <div className="pharmacist-onboarding-content-inner">
                {steps[currentStep].content}
              </div>
              <div className="pharmacist-onboarding-footer">
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
                    style={{ backgroundColor: '#a855f7', borderColor: '#a855f7' }}
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
                      backgroundColor: '#a855f7',
                      borderColor: '#a855f7',
                      boxShadow: '0 12px 24px rgba(168, 85, 247, 0.25)',
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
