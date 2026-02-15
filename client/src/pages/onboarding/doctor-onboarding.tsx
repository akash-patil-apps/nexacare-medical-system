import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Space,
  message,
  InputNumber,
} from 'antd';
import { RightOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';
import { OnboardingStepsLayout } from '../../components/onboarding/OnboardingStepsLayout';

const { Option } = Select;
const { TextArea } = Input;

const DOCTOR_STEPS = [
  { title: 'Hospital & Professional Info' },
  { title: 'Practice Details' },
];

const STEP_TITLES = ['Hospital & Professional Info', 'Practice Details'];
const STEP_NOTES = ['Select your hospital and enter professional details.', 'Set your consultation fee and practice information.'];

const fieldStyle = { borderRadius: 12 };

export default function DoctorOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [qualifications, setQualifications] = useState<string[]>(['']);

  const { data: hospitals = [], isLoading: hospitalsLoading } = useQuery({
    queryKey: ['/api/hospitals'],
    queryFn: async () => {
      const res = await fetch('/api/hospitals');
      if (!res.ok) throw new Error('Failed to fetch hospitals');
      const data = await res.json();
      return data.hospitals ?? data;
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/onboarding/doctor/complete', data);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', 'doctor'] });
      localStorage.setItem('onboarding-just-completed', 'true');
      message.success('Profile completed successfully! Welcome to NexaCare!');
      setTimeout(() => setLocation('/dashboard/doctor'), 500);
    },
    onError: (error: any) => {
      message.error(error?.message || 'Failed to complete profile');
    },
  });

  const handleNext = async () => {
    try {
      const stepFields: Record<number, string[]> = {
        0: ['hospitalId', 'specialty', 'qualification', 'licenseNumber'],
        1: [],
      };
      const fields = stepFields[currentStep] || [];
      if (fields.length > 0) await form.validateFields(fields);
      setCurrentStep(currentStep + 1);
    } catch (e) {
      // validation failed
    }
  };

  const handlePrev = () => setCurrentStep(currentStep - 1);

  const handleComplete = async () => {
    if (completeOnboardingMutation.isPending) return;
    try {
      await form.validateFields(['hospitalId', 'specialty', 'qualification', 'licenseNumber']);
      const allValues = form.getFieldsValue(true);
      const qualificationText = qualifications.filter((q) => q.trim()).join(', ');
      const transformedValues = {
        ...allValues,
        qualification: qualificationText || allValues.qualification,
        languages: Array.isArray(allValues.languages) ? allValues.languages.join(', ') : allValues.languages,
      };
      completeOnboardingMutation.mutate(transformedValues);
    } catch (err: any) {
      message.error(err?.errorFields?.[0]?.errors?.[0] || 'Please fill in all required fields');
    }
  };

  const addQualification = () => setQualifications([...qualifications, '']);
  const removeQualification = (index: number) => {
    if (qualifications.length > 1) setQualifications(qualifications.filter((_, i) => i !== index));
  };
  const updateQualification = (index: number, value: string) => {
    const updated = [...qualifications];
    updated[index] = value;
    setQualifications(updated);
  };

  const handleBack = () => {
    if (currentStep === 0) setLocation('/dashboard/doctor');
    else setCurrentStep(currentStep - 1);
  };

  const specialtyOptions = [
    'General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'Neurology', 'Oncology', 'Gynecology', 'Psychiatry', 'ENT', 'Ophthalmology', 'Urology', 'Gastroenterology', 'Pulmonology', 'Endocrinology', 'Other',
  ];

  const renderStepContent = () => (
    <Form form={form} layout="vertical" preserve={true}>
      {currentStep === 0 && (
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <Form.Item name="hospitalId" label="Hospital" rules={[{ required: true, message: 'Please select a hospital' }]}>
              <Select placeholder="Select hospital" loading={hospitalsLoading} showSearch optionFilterProp="children" size="large" style={fieldStyle}>
                {hospitals.map((hospital: any) => (
                  <Option key={hospital.id} value={hospital.id}>{hospital.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="specialty" label="Specialty" rules={[{ required: true, message: 'Please select your specialty' }]}>
              <Select placeholder="Select specialty" showSearch allowClear size="large" style={fieldStyle}>
                {specialtyOptions.map((s) => <Option key={s} value={s}>{s}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="Qualifications">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {qualifications.map((qual, index) => (
                  <Space key={index} style={{ width: '100%' }}>
                    <Input placeholder="e.g., MBBS, MD, MS, DM" value={qual} onChange={(e) => updateQualification(index, e.target.value)} style={{ flex: 1, borderRadius: 12 }} />
                    {qualifications.length > 1 && <Button icon={<DeleteOutlined />} onClick={() => removeQualification(index)} danger />}
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={addQualification} style={{ width: '100%', borderRadius: 12 }}>Add Qualification</Button>
              </Space>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="licenseNumber" label="Medical License Number" rules={[{ required: true, message: 'Please enter license number' }]}>
              <Input placeholder="Enter medical license number" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="experience" label="Years of Experience">
              <InputNumber placeholder="Years" min={0} max={50} style={{ width: '100%', borderRadius: 12 }} size="large" />
            </Form.Item>
          </Col>
        </Row>
      )}
      {currentStep === 1 && (
        <Row gutter={[16, 8]}>
          <Col span={8}>
            <Form.Item name="consultationFee" label="Consultation Fee (₹)">
              <InputNumber placeholder="Enter fee" min={0} style={{ width: '100%', borderRadius: 12 }} size="large" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="workingHours" label="Working Hours">
              <Input placeholder="e.g., 9:00 AM - 5:00 PM" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="languages" label="Languages Spoken">
              <Select mode="tags" placeholder="Add languages" size="large" style={fieldStyle}>
                {['English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Bengali', 'Kannada', 'Malayalam'].map((l) => <Option key={l} value={l}>{l}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="awards" label="Awards & Recognitions">
              <TextArea rows={2} placeholder="Awards, recognitions" style={{ borderRadius: 12 }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="bio" label="Professional Bio">
              <TextArea rows={2} placeholder="Medical practice and approach to care..." style={{ borderRadius: 12 }} />
            </Form.Item>
          </Col>
        </Row>
      )}
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        {currentStep === 0 ? (
          <>
            <Button size="large" onClick={handleBack} style={{ borderRadius: 12 }}>Back</Button>
            <Button type="primary" size="large" onClick={handleNext} icon={<RightOutlined />} iconPosition="end" style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Next</Button>
          </>
        ) : (
          <>
            <Button size="large" onClick={handlePrev} style={{ borderRadius: 12 }}>Previous</Button>
            <Button type="primary" size="large" loading={completeOnboardingMutation.isPending} onClick={handleComplete} style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Complete Profile</Button>
          </>
                )}
              </div>
            </Form>
  );

  return (
    <OnboardingStepsLayout
      steps={DOCTOR_STEPS}
      currentStepIndex={currentStep}
      stepTitle={STEP_TITLES[currentStep]}
      stepNote={STEP_NOTES[currentStep]}
      onBack={handleBack}
      showHelpLink
    >
      {renderStepContent()}
    </OnboardingStepsLayout>
  );
}
