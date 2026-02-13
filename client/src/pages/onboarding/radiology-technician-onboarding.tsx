import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Row, Col, Space, message, InputNumber } from 'antd';
import { RightOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';
import { OnboardingStepsLayout } from '../../components/onboarding/OnboardingStepsLayout';

const { Option } = Select;
const { TextArea } = Input;

const RADIOLOGY_STEPS = [
  { title: 'Hospital Selection' },
  { title: 'Professional Qualifications' },
  { title: 'Specialization & Modalities' },
  { title: 'Work Details' },
];
const STEP_TITLES = ['Hospital Selection', 'Professional Qualifications', 'Specialization & Modalities', 'Work Details'];
const STEP_NOTES = ['Select your hospital.', 'Add qualifications and license.', 'Add specialization and modalities.', 'Set shift and working hours.'];
const fieldStyle = { borderRadius: 12 };
const RAD_QUAL = ['B.Sc Radiology', 'Diploma Radiology', 'M.Sc Radiology', 'B.Sc Medical Imaging', 'Certificate', 'Other'];
const RAD_SPEC = ['General Radiology', 'X-Ray Technician', 'CT Scan Technician', 'MRI Technician', 'Ultrasound Technician', 'Mammography', 'Interventional Radiology', 'Nuclear Medicine', 'Cardiac Imaging', 'Pediatric Imaging'];
const RAD_MOD = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography', 'DEXA', 'Fluoroscopy', 'Angiography', 'Nuclear Medicine'];
const RAD_CERT = ['ARRT', 'ARMRIT', 'RDMS', 'RVT', 'CNMT', 'CT', 'VI'];

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
      const data = await res.json();
      return data.hospitals ?? data;
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

  const handleComplete = async () => {
    try {
      if (qualifications.every((q) => !q?.trim())) {
        message.error('Please add at least one radiology qualification');
        return;
      }
      await form.validateFields(['hospitalId', 'licenseNumber', 'shiftType']);
      const values = form.getFieldsValue(true);
      const qualificationText = qualifications.filter((q) => q.trim()).join(', ');
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
    } catch (err: any) {
      message.error(err?.errorFields?.[0]?.errors?.[0] || 'Please fill in all required fields');
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

  const handleBack = () => {
    if (currentStep === 0) setLocation('/dashboard/radiology-technician');
    else setCurrentStep(currentStep - 1);
  };

  const stepFields: Record<number, string[]> = { 0: ['hospitalId'], 1: ['licenseNumber'], 2: [], 3: ['shiftType'] };
  const handleNext = async () => {
    try {
      if (currentStep === 1 && qualifications.every((q) => !q?.trim())) {
        message.error('Please add at least one radiology qualification');
        return;
      }
      const fields = stepFields[currentStep] || [];
      if (fields.length > 0) await form.validateFields(fields);
      setCurrentStep(currentStep + 1);
    } catch (e) {}
  };
  const handlePrev = () => setCurrentStep(currentStep - 1);
  const isLastStep = currentStep === RADIOLOGY_STEPS.length - 1;

  const renderStepContent = () => (
    <Form form={form} layout="vertical" preserve={true}>
      {currentStep === 0 && (
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Form.Item name="hospitalId" label="Hospital" rules={[{ required: true, message: 'Please select a hospital' }]}>
              <Select placeholder="Select hospital" loading={hospitalsLoading} showSearch optionFilterProp="children" size="large" style={fieldStyle}>
                {hospitals.map((hospital: any) => <Option key={hospital.id} value={hospital.id}>{hospital.name}</Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      )}
      {currentStep === 1 && (
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Form.Item label="Radiology Qualifications" required>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {qualifications.map((qual, index) => (
                  <Space key={index} style={{ width: '100%' }}>
                    <Select placeholder="Select qualification" value={qual || undefined} onChange={(v) => updateQualification(index, v)} style={{ flex: 1, borderRadius: 12 }} size="large">
                      {RAD_QUAL.map((o) => <Option key={o} value={o}>{o}</Option>)}
                    </Select>
                    {qualifications.length > 1 && <Button icon={<DeleteOutlined />} onClick={() => removeQualification(index)} danger />}
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={addQualification} style={{ width: '100%', borderRadius: 12 }}>Add Qualification</Button>
              </Space>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="licenseNumber" label="Radiology License Number" rules={[{ required: true, message: 'Please enter license number' }]}>
              <Input placeholder="Enter radiology license number" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="languages" label="Languages Spoken">
              <Select mode="tags" placeholder="Add languages" size="large" style={fieldStyle}>
                {['English', 'Hindi', 'Marathi', 'Gujarati', 'Bengali', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'].map((l) => <Option key={l} value={l}>{l}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="Experience">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {experiences.map((exp, index) => (
                  <Space key={index} style={{ width: '100%' }}>
                    <Input placeholder="Role/Position" value={exp.role} onChange={(e) => updateExperience(index, 'role', e.target.value)} style={{ flex: 2, borderRadius: 12 }} />
                    <InputNumber placeholder="Years" value={exp.years} onChange={(v) => updateExperience(index, 'years', v || 0)} min={0} max={50} style={{ flex: 1, borderRadius: 12 }} />
                    {experiences.length > 1 && <Button icon={<DeleteOutlined />} onClick={() => removeExperience(index)} danger />}
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={addExperience} style={{ width: '100%', borderRadius: 12 }}>Add Experience</Button>
              </Space>
            </Form.Item>
          </Col>
        </Row>
      )}
      {currentStep === 2 && (
        <Row gutter={[16, 8]}>
          <Col span={8}>
            <Form.Item name="specialization" label="Primary Specialization">
              <Select placeholder="Select specialization" size="large" style={fieldStyle}>
                {RAD_SPEC.map((s) => <Option key={s} value={s}>{s}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="modalities" label="Imaging Modalities">
              <Select mode="tags" placeholder="Add modalities" size="large" style={fieldStyle}>
                {RAD_MOD.map((m) => <Option key={m} value={m}>{m}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="certifications" label="Additional Certifications">
              <Select mode="tags" placeholder="Add certifications" size="large" style={fieldStyle}>
                {RAD_CERT.map((c) => <Option key={c} value={c}>{c}</Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      )}
      {currentStep === 3 && (
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <Form.Item name="shiftType" label="Preferred Shift Type" rules={[{ required: true, message: 'Please select shift type' }]}>
              <Select placeholder="Select shift type" size="large" style={fieldStyle}>
                <Option value="day">Day Shift (8 AM - 4 PM)</Option>
                <Option value="evening">Evening Shift (4 PM - 12 AM)</Option>
                <Option value="night">Night Shift (12 AM - 8 AM)</Option>
                <Option value="rotation">Rotating Shifts</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="workingHours" label="Working Hours Preference">
              <Input placeholder="e.g., 8 hours/day, 5 days/week" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="bio" label="Professional Bio">
              <TextArea rows={3} placeholder="Tell us about your radiology experience and approach to patient care..." style={{ borderRadius: 12 }} />
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
        ) : isLastStep ? (
          <>
            <Button size="large" onClick={handlePrev} style={{ borderRadius: 12 }}>Previous</Button>
            <Button type="primary" size="large" loading={completeOnboardingMutation.isPending} onClick={handleComplete} style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Complete Profile</Button>
          </>
        ) : (
          <>
            <Button size="large" onClick={handlePrev} style={{ borderRadius: 12 }}>Previous</Button>
            <Button type="primary" size="large" onClick={handleNext} icon={<RightOutlined />} iconPosition="end" style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Next</Button>
          </>
        )}
      </div>
    </Form>
  );

  return (
    <OnboardingStepsLayout
      steps={RADIOLOGY_STEPS}
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
