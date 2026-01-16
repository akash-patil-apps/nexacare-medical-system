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
  ClockCircleOutlined,
  CheckCircleFilled,
  RightCircleOutlined,
  ClockCircleOutlined as ClockIcon,
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

export default function NurseOnboarding() {
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
      const res = await apiRequest('POST', '/api/onboarding/nurse/complete', data);
      return res.json();
    },
    onSuccess: async () => {
      const userRole = localStorage.getItem('userRole') || 'nurse';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });
      localStorage.setItem('onboarding-just-completed', 'true');
      message.success('Profile completed successfully! Welcome to NexaCare!');
      setTimeout(() => setLocation('/dashboard/nurse'), 500);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to complete profile');
    },
  });

  const handleNext = async () => {
    try {
      const stepFields: Record<number, string[]> = {
        0: ['hospitalId'],
        1: ['nursingDegree', 'licenseNumber'],
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
      await form.validateFields(['hospitalId', 'nursingDegree', 'licenseNumber', 'shiftType']);
      const values = form.getFieldsValue(true);
      
      // Combine qualifications
      const qualificationText = qualifications.filter(q => q.trim()).join(', ');
      
      // Calculate total experience from experiences array
      const totalExperience = experiences.reduce((sum, exp) => sum + (exp.years || 0), 0);
      
      const transformedValues = {
        ...values,
        nursingDegree: qualificationText || values.nursingDegree,
        experience: totalExperience || values.experience,
        wardPreferences: Array.isArray(values.wardPreferences) ? values.wardPreferences : null,
        skills: Array.isArray(values.skills) ? values.skills : null,
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
            <Form.Item label="Nursing Qualifications">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {qualifications.map((qual, index) => (
                  <Space key={index} style={{ width: '100%' }}>
                    <Select
                      placeholder="Select nursing qualification"
                      value={qual || undefined}
                      onChange={(value) => updateQualification(index, value)}
                      style={{ flex: 1 }}
                    >
                      <Option value="BSc Nursing">BSc Nursing</Option>
                      <Option value="GNM">General Nursing and Midwifery (GNM)</Option>
                      <Option value="ANM">Auxiliary Nurse Midwife (ANM)</Option>
                      <Option value="Post Basic BSc">Post Basic BSc Nursing</Option>
                      <Option value="MSc Nursing">MSc Nursing</Option>
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
              label="Nursing License Number"
              rules={[{ required: true, message: 'Please enter license number' }]}
            >
              <Input placeholder="Enter nursing license number" size="large" />
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
      title: 'Specialization & Skills',
      icon: <MedicineBoxOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item name="specialization" label="Nursing Specialization">
              <Select placeholder="Select specialization" size="large">
                <Option value="General Medicine">General Medicine</Option>
                <Option value="Intensive Care (ICU)">Intensive Care (ICU)</Option>
                <Option value="Emergency & Trauma">Emergency & Trauma</Option>
                <Option value="Pediatrics">Pediatrics</Option>
                <Option value="Maternity & Gynecology">Maternity & Gynecology</Option>
                <Option value="Surgical">Surgical</Option>
                <Option value="Cardiology">Cardiology</Option>
                <Option value="Oncology">Oncology</Option>
                <Option value="Neurology">Neurology</Option>
                <Option value="Psychiatry">Psychiatry</Option>
                <Option value="Community Health">Community Health</Option>
                <Option value="General Nursing">General Nursing</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="skills" label="Key Nursing Skills">
              <Select
                mode="tags"
                placeholder="Add skills (press enter after each)"
                size="large"
              >
                <Option value="Vital Signs Monitoring">Vital Signs Monitoring</Option>
                <Option value="IV Cannulation">IV Cannulation</Option>
                <Option value="Medication Administration">Medication Administration</Option>
                <Option value="Wound Care">Wound Care</Option>
                <Option value="Patient Assessment">Patient Assessment</Option>
                <Option value="Emergency Response">Emergency Response</Option>
                <Option value="Ventilator Management">Ventilator Management</Option>
                <Option value="ECG Monitoring">ECG Monitoring</Option>
                <Option value="Blood Transfusion">Blood Transfusion</Option>
                <Option value="Catheter Care">Catheter Care</Option>
                <Option value="Pain Management">Pain Management</Option>
                <Option value="Patient Education">Patient Education</Option>
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
                <Option value="ACLS">Advanced Cardiac Life Support (ACLS)</Option>
                <Option value="BLS">Basic Life Support (BLS)</Option>
                <Option value="PALS">Pediatric Advanced Life Support (PALS)</Option>
                <Option value="NALS">Neonatal Advanced Life Support (NALS)</Option>
                <Option value="TNCC">Trauma Nursing Core Course (TNCC)</Option>
                <Option value="ENPC">Emergency Nursing Pediatric Course (ENPC)</Option>
                <Option value="CCRN">Critical Care Registered Nurse (CCRN)</Option>
                <Option value="CEN">Certified Emergency Nurse (CEN)</Option>
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
          <Col span={24}>
            <Form.Item
              name="shiftType"
              label="Preferred Shift Type"
              rules={[{ required: true, message: 'Please select shift type' }]}
            >
              <Select placeholder="Select shift type" size="large">
                <Option value="day">Day Shift (7 AM - 7 PM)</Option>
                <Option value="night">Night Shift (7 PM - 7 AM)</Option>
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
            <Form.Item name="wardPreferences" label="Preferred Ward Types">
              <Select
                mode="tags"
                placeholder="Add preferred wards (press enter after each)"
                size="large"
              >
                <Option value="General Medicine">General Medicine</Option>
                <Option value="ICU">Intensive Care Unit (ICU)</Option>
                <Option value="Emergency">Emergency</Option>
                <Option value="Pediatrics">Pediatrics</Option>
                <Option value="Maternity">Maternity</Option>
                <Option value="Surgical">Surgical</Option>
                <Option value="Cardiac">Cardiac Care</Option>
                <Option value="Oncology">Oncology</Option>
                <Option value="Neurology">Neurology</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="bio" label="Professional Bio">
              <TextArea
                rows={4}
                placeholder="Tell us about your nursing experience and approach to patient care..."
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
        return <ClockIcon />;
    }
  };

  const progressLabel = `Step ${currentStep + 1} of ${steps.length}`;

  return (
    <div className="nurse-onboarding-wrapper">
      <Card
        className="nurse-onboarding-card"
        variant="borderless"
        style={{ borderRadius: 28, boxShadow: '0 28px 60px rgba(16, 185, 129, 0.12)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="nurse-onboarding-layout">
          <aside className="nurse-onboarding-stepper">
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary" className="nurse-onboarding-progress-label">
                {progressLabel}
              </Typography.Text>
              <Typography.Title level={4} style={{ margin: 0, color: '#10B981' }}>
                Nurse Profile Setup
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Complete your profile to start providing patient care.
              </Typography.Paragraph>
            </Space>
            <ul className="nurse-stepper-list">
              {steps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                  <li key={step.title} className={`nurse-stepper-item ${status}`}>
                    <span className="nurse-stepper-icon">
                      {renderStatusIcon(status)}
                    </span>
                    <div className="nurse-stepper-copy">
                      <Typography.Text className="nurse-stepper-title">
                        {step.title}
                      </Typography.Text>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="nurse-onboarding-content">
            <Typography.Title level={2} style={{ marginBottom: 16, color: '#10B981' }}>
              {steps[currentStep].title}
            </Typography.Title>

            <Form form={form} layout="vertical" preserve={true}>
              <div className="nurse-onboarding-content-inner">
                {steps[currentStep].content}
              </div>
              <div className="nurse-onboarding-footer">
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
                    style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
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
                      backgroundColor: '#10B981',
                      borderColor: '#10B981',
                      boxShadow: '0 12px 24px rgba(16, 185, 129, 0.25)',
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
