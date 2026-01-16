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
  InputNumber,
} from 'antd';
import {
  BankOutlined,
  UserOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
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

export default function RadiologyTechnicianOnboarding() {
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
      const res = await apiRequest('POST', '/api/onboarding/radiology-technician/complete', data);
      return res.json();
    },
    onSuccess: async () => {
      const userRole = localStorage.getItem('userRole') || 'radiology_technician';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });
      localStorage.setItem('onboarding-just-completed', 'true');
      message.success('Profile completed successfully! Welcome to NexaCare!');
      setTimeout(() => setLocation('/dashboard/radiology-technician'), 500);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to complete profile');
    },
  });

  const handleNext = async () => {
    try {
      const stepFields: Record<number, string[]> = {
        0: ['hospitalId'],
        1: ['radiologyDegree', 'licenseNumber'],
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
      await form.validateFields(['hospitalId', 'radiologyDegree', 'licenseNumber', 'shiftType']);
      const values = form.getFieldsValue(true);
      
      // Combine qualifications
      const qualificationText = qualifications.filter(q => q.trim()).join(', ');
      
      // Calculate total experience
      const totalExperience = experiences.reduce((sum, exp) => sum + (exp.years || 0), 0);
      
      const transformedValues = {
        ...values,
        radiologyDegree: qualificationText || values.radiologyDegree,
        experience: totalExperience || values.experience,
        modalities: Array.isArray(values.modalities) ? values.modalities : null,
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
            <Form.Item label="Radiology Qualifications">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {qualifications.map((qual, index) => (
                  <Space key={index} style={{ width: '100%' }}>
                    <Select
                      placeholder="Select radiology qualification"
                      value={qual || undefined}
                      onChange={(value) => updateQualification(index, value)}
                      style={{ flex: 1 }}
                    >
                      <Option value="B.Sc Radiology">Bachelor of Science in Radiology</Option>
                      <Option value="Diploma Radiology">Diploma in Radiology</Option>
                      <Option value="M.Sc Radiology">Master of Science in Radiology</Option>
                      <Option value="B.Sc Medical Imaging">Bachelor of Science in Medical Imaging</Option>
                      <Option value="Certificate">Radiology Technology Certificate</Option>
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
              label="Radiology License Number"
              rules={[{ required: true, message: 'Please enter license number' }]}
            >
              <Input placeholder="Enter radiology license number" size="large" />
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
      title: 'Specialization & Modalities',
      icon: <ExperimentOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item name="specialization" label="Primary Specialization">
              <Select placeholder="Select specialization" size="large">
                <Option value="General Radiology">General Radiology</Option>
                <Option value="X-Ray Technician">X-Ray Technician</Option>
                <Option value="CT Scan Technician">CT Scan Technician</Option>
                <Option value="MRI Technician">MRI Technician</Option>
                <Option value="Ultrasound Technician">Ultrasound Technician</Option>
                <Option value="Mammography">Mammography</Option>
                <Option value="Interventional Radiology">Interventional Radiology</Option>
                <Option value="Nuclear Medicine">Nuclear Medicine</Option>
                <Option value="Cardiac Imaging">Cardiac Imaging</Option>
                <Option value="Pediatric Imaging">Pediatric Imaging</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="modalities" label="Imaging Modalities">
              <Select
                mode="tags"
                placeholder="Add modalities (press enter after each)"
                size="large"
              >
                <Option value="X-Ray">X-Ray</Option>
                <Option value="CT Scan">CT Scan</Option>
                <Option value="MRI">MRI</Option>
                <Option value="Ultrasound">Ultrasound</Option>
                <Option value="Mammography">Mammography</Option>
                <Option value="DEXA">DEXA (Bone Density)</Option>
                <Option value="Fluoroscopy">Fluoroscopy</Option>
                <Option value="Angiography">Angiography</Option>
                <Option value="Nuclear Medicine">Nuclear Medicine</Option>
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
                <Option value="ARRT">American Registry of Radiologic Technologists (ARRT)</Option>
                <Option value="ARMRIT">Registered Magnetic Resonance Imaging Technologist (ARMRIT)</Option>
                <Option value="RDMS">Registered Diagnostic Medical Sonographer (RDMS)</Option>
                <Option value="RVT">Registered Vascular Technologist (RVT)</Option>
                <Option value="CNMT">Certified Nuclear Medicine Technologist (CNMT)</Option>
                <Option value="CT">Computed Tomography (CT)</Option>
                <Option value="VI">Vascular Interventional (VI)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: 'Work Details',
      icon: <MedicineBoxOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item
              name="shiftType"
              label="Preferred Shift Type"
              rules={[{ required: true, message: 'Please select shift type' }]}
            >
              <Select placeholder="Select shift type" size="large">
                <Option value="day">Day Shift (8 AM - 4 PM)</Option>
                <Option value="evening">Evening Shift (4 PM - 12 AM)</Option>
                <Option value="night">Night Shift (12 AM - 8 AM)</Option>
                <Option value="rotation">Rotating Shifts</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="workingHours" label="Working Hours Preference">
              <Input placeholder="e.g., 8 hours/day, 5 days/week" size="large" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="bio" label="Professional Bio">
              <TextArea
                rows={4}
                placeholder="Tell us about your radiology experience and approach to patient care..."
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
    <div className="radiology-onboarding-wrapper">
      <Card
        className="radiology-onboarding-card"
        variant="borderless"
        style={{ borderRadius: 28, boxShadow: '0 28px 60px rgba(124, 58, 237, 0.12)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="radiology-onboarding-layout">
          <aside className="radiology-onboarding-stepper">
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary" className="radiology-onboarding-progress-label">
                {progressLabel}
              </Typography.Text>
              <Typography.Title level={4} style={{ margin: 0, color: '#7C3AED' }}>
                Radiology Technician Profile Setup
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Complete your profile to start performing imaging services.
              </Typography.Paragraph>
            </Space>
            <ul className="radiology-stepper-list">
              {steps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                  <li key={step.title} className={`radiology-stepper-item ${status}`}>
                    <span className="radiology-stepper-icon">
                      {renderStatusIcon(status)}
                    </span>
                    <div className="radiology-stepper-copy">
                      <Typography.Text className="radiology-stepper-title">
                        {step.title}
                      </Typography.Text>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="radiology-onboarding-content">
            <Typography.Title level={2} style={{ marginBottom: 16, color: '#7C3AED' }}>
              {steps[currentStep].title}
            </Typography.Title>

            <Form form={form} layout="vertical" preserve={true}>
              <div className="radiology-onboarding-content-inner">
                {steps[currentStep].content}
              </div>
              <div className="radiology-onboarding-footer">
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
                    style={{ backgroundColor: '#7C3AED', borderColor: '#7C3AED' }}
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
                      backgroundColor: '#7C3AED',
                      borderColor: '#7C3AED',
                      boxShadow: '0 12px 24px rgba(124, 58, 237, 0.25)',
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
