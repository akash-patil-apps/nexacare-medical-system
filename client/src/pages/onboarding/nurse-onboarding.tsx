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

const NURSE_STEPS = [
  { title: 'Hospital Selection' },
  { title: 'Professional Qualifications' },
  { title: 'Specialization & Skills' },
  { title: 'Work Details' },
];

const STEP_TITLES = ['Hospital Selection', 'Professional Qualifications', 'Specialization & Skills', 'Work Details'];
const STEP_NOTES = [
  'Select the hospital you work at.',
  'Add your nursing qualifications and license.',
  'Add specializations, skills, and certifications.',
  'Set your shift type and preferences.',
];

const fieldStyle = { borderRadius: 12 };

const NURSING_QUAL_OPTIONS = ['BSc Nursing', 'GNM', 'ANM', 'Post Basic BSc', 'MSc Nursing', 'Other'];
const SPECIALIZATION_OPTIONS = ['General Medicine', 'Intensive Care (ICU)', 'Emergency & Trauma', 'Pediatrics', 'Maternity & Gynecology', 'Surgical', 'Cardiology', 'Oncology', 'Neurology', 'Psychiatry', 'Community Health', 'General Nursing'];
const SKILL_OPTIONS = ['Vital Signs Monitoring', 'IV Cannulation', 'Medication Administration', 'Wound Care', 'Patient Assessment', 'Emergency Response', 'Ventilator Management', 'ECG Monitoring', 'Blood Transfusion', 'Catheter Care', 'Pain Management', 'Patient Education'];
const CERT_OPTIONS = ['ACLS', 'BLS', 'PALS', 'NALS', 'TNCC', 'ENPC', 'CCRN', 'CEN'];
const WARD_OPTIONS = ['General Medicine', 'ICU', 'Emergency', 'Pediatrics', 'Maternity', 'Surgical', 'Cardiac', 'Oncology', 'Neurology'];

export default function NurseOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [qualifications, setQualifications] = useState<string[]>(['']);
  const [experiences, setExperiences] = useState<Array<{ role: string; years: number }>>([{ role: '', years: 0 }]);

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
      const res = await apiRequest('POST', '/api/onboarding/nurse/complete', data);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', 'nurse'] });
      localStorage.setItem('onboarding-just-completed', 'true');
      message.success('Profile completed successfully! Welcome to NexaCare!');
      setTimeout(() => setLocation('/dashboard/nurse'), 500);
    },
    onError: (error: any) => {
      message.error(error?.message || 'Failed to complete profile');
    },
  });

  const stepFields: Record<number, string[]> = {
    0: ['hospitalId'],
    1: ['licenseNumber'],
    2: [],
    3: ['shiftType'],
  };

  const handleNext = async () => {
    try {
      const fields = stepFields[currentStep] || [];
      if (currentStep === 1 && qualifications.every((q) => !q?.trim())) {
        message.error('Please add at least one nursing qualification');
        return;
      }
      if (fields.length > 0) await form.validateFields(fields);
      setCurrentStep(currentStep + 1);
    } catch (e) {
      // validation failed
    }
  };

  const handlePrev = () => setCurrentStep(currentStep - 1);

  const handleComplete = async () => {
    try {
      await form.validateFields(['hospitalId', 'licenseNumber', 'shiftType']);
      if (qualifications.every((q) => !q?.trim())) {
        message.error('Please add at least one nursing qualification');
        return;
      }
      const values = form.getFieldsValue(true);
      const qualificationText = qualifications.filter((q) => q.trim()).join(', ');
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
  const addExperience = () => setExperiences([...experiences, { role: '', years: 0 }]);
  const removeExperience = (index: number) => {
    if (experiences.length > 1) setExperiences(experiences.filter((_, i) => i !== index));
  };
  const updateExperience = (index: number, field: 'role' | 'years', value: string | number) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], [field]: value };
    setExperiences(updated);
  };

  const handleBack = () => {
    if (currentStep === 0) setLocation('/dashboard/nurse');
    else setCurrentStep(currentStep - 1);
  };

  const isLastStep = currentStep === NURSE_STEPS.length - 1;

  const renderStepContent = () => (
    <Form form={form} layout="vertical" preserve={true}>
      {currentStep === 0 && (
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Form.Item name="hospitalId" label="Hospital" rules={[{ required: true, message: 'Please select a hospital' }]}>
              <Select placeholder="Select hospital" loading={hospitalsLoading} showSearch optionFilterProp="children" size="large" style={fieldStyle}>
                {hospitals.map((hospital: any) => (
                  <Option key={hospital.id} value={hospital.id}>{hospital.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      )}
      {currentStep === 1 && (
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Form.Item label="Nursing Qualifications" required>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {qualifications.map((qual, index) => (
                  <Space key={index} style={{ width: '100%' }}>
                    <Select placeholder="Select nursing qualification" value={qual || undefined} onChange={(value) => updateQualification(index, value)} style={{ flex: 1, borderRadius: 12 }} size="large">
                      {NURSING_QUAL_OPTIONS.map((o) => <Option key={o} value={o}>{o}</Option>)}
                    </Select>
                    {qualifications.length > 1 && <Button icon={<DeleteOutlined />} onClick={() => removeQualification(index)} danger />}
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={addQualification} style={{ width: '100%', borderRadius: 12 }}>Add Qualification</Button>
              </Space>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="licenseNumber" label="Nursing License Number" rules={[{ required: true, message: 'Please enter license number' }]}>
              <Input placeholder="Enter nursing license number" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="languages" label="Languages Spoken">
              <Select mode="tags" placeholder="Add languages (press enter after each)" size="large" style={fieldStyle}>
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
            <Form.Item name="specialization" label="Nursing Specialization">
              <Select placeholder="Select specialization" size="large" style={fieldStyle}>
                {SPECIALIZATION_OPTIONS.map((s) => <Option key={s} value={s}>{s}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="skills" label="Key Nursing Skills">
              <Select mode="tags" placeholder="Add skills" size="large" style={fieldStyle}>
                {SKILL_OPTIONS.map((s) => <Option key={s} value={s}>{s}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="certifications" label="Additional Certifications">
              <Select mode="tags" placeholder="Add certifications" size="large" style={fieldStyle}>
                {CERT_OPTIONS.map((c) => <Option key={c} value={c}>{c}</Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      )}
      {currentStep === 3 && (
        <Row gutter={[16, 8]}>
          <Col span={8}>
            <Form.Item name="shiftType" label="Preferred Shift Type" rules={[{ required: true, message: 'Please select shift type' }]}>
              <Select placeholder="Select shift type" size="large" style={fieldStyle}>
                <Option value="day">Day Shift (7 AM - 7 PM)</Option>
                <Option value="night">Night Shift (7 PM - 7 AM)</Option>
                <Option value="rotation">Rotating Shifts</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="workingHours" label="Working Hours Preference">
              <Input placeholder="e.g., 8 hours/day, 6 days/week" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="wardPreferences" label="Preferred Ward Types">
              <Select mode="tags" placeholder="Add preferred wards" size="large" style={fieldStyle}>
                {WARD_OPTIONS.map((w) => <Option key={w} value={w}>{w}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="bio" label="Professional Bio">
              <TextArea rows={3} placeholder="Tell us about your nursing experience and approach to patient care..." style={{ borderRadius: 12 }} />
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
      steps={NURSE_STEPS}
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
