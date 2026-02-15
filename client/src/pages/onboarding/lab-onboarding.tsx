import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Row, Col, TimePicker, message } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';
import { OnboardingStepsLayout } from '../../components/onboarding/OnboardingStepsLayout';

const { Option } = Select;
const { TextArea } = Input;

const LAB_STEPS = [{ title: 'Lab Basics' }, { title: 'Lab Details' }];
const STEP_TITLES = ['Lab Basics', 'Lab Details'];
const STEP_NOTES = ['Enter your lab name, license, and address.', 'Add contact, hours, and specializations.'];
const fieldStyle = { borderRadius: 12 };

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
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', 'lab'] });
      localStorage.setItem('onboarding-just-completed', 'true');
      message.success('Profile completed successfully!');
      setTimeout(() => setLocation('/dashboard/lab'), 500);
    },
    onError: (error: any) => {
      message.error(error?.message || 'Failed to complete profile');
    },
  });

  const handleNext = async () => {
    try {
      if (currentStep === 0) await form.validateFields(['name', 'licenseNumber', 'address', 'city', 'state', 'zipCode']);
      setCurrentStep(currentStep + 1);
    } catch (e) {}
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
    } catch (err: any) {
      message.error(err?.errorFields?.[0]?.errors?.[0] || 'Please fill in all required fields');
    }
  };

  const handleBack = () => {
    if (currentStep === 0) setLocation('/dashboard/lab');
    else setCurrentStep(currentStep - 1);
  };

  const isLastStep = currentStep === LAB_STEPS.length - 1;

  return (
    <OnboardingStepsLayout
      steps={LAB_STEPS}
      currentStepIndex={currentStep}
      stepTitle={STEP_TITLES[currentStep]}
      stepNote={STEP_NOTES[currentStep]}
      onBack={handleBack}
      showHelpLink
    >
      <Form form={form} layout="vertical" preserve={true}>
        {currentStep === 0 && (
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Form.Item name="name" label="Lab Name" rules={[{ required: true, message: 'Please enter lab name' }]}>
                <Input placeholder="Enter lab name" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
            <Col span={12}>
              <Form.Item name="licenseNumber" label="License Number" rules={[{ required: true, message: 'Please enter license number' }]}>
                <Input placeholder="Enter license number" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
          <Col span={24}>
              <Form.Item name="address" label="Street Address" rules={[{ required: true, message: 'Please enter address' }]}>
                <Input placeholder="Enter street address" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
            <Col span={8}>
              <Form.Item name="city" label="City" rules={[{ required: true, message: 'Please enter city' }]}>
                <Input placeholder="Enter city" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
            <Col span={8}>
              <Form.Item name="state" label="State" rules={[{ required: true, message: 'Please enter state' }]}>
                <Input placeholder="Enter state" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
            <Col span={8}>
              <Form.Item name="zipCode" label="Zip Code" rules={[{ required: true, message: 'Please enter zip code' }]}>
                <Input placeholder="Enter zip code" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
        </Row>
        )}
        {currentStep === 1 && (
          <Row gutter={[16, 8]}>
          <Col span={12}>
            <Form.Item name="contactEmail" label="Contact Email">
                <Input type="email" placeholder="Enter contact email" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="operatingHours" label="Operating Hours">
                <TimePicker.RangePicker format="HH:mm" style={{ width: '100%', borderRadius: 12 }} size="large" />
            </Form.Item>
          </Col>
            <Col span={8}>
            <Form.Item name="specializations" label="Specializations">
                <Select mode="tags" placeholder="Add specializations" size="large" style={fieldStyle}>
                <Option value="Pathology">Pathology</Option>
                <Option value="Microbiology">Microbiology</Option>
                <Option value="Biochemistry">Biochemistry</Option>
                <Option value="Hematology">Hematology</Option>
                <Option value="Immunology">Immunology</Option>
              </Select>
            </Form.Item>
          </Col>
            <Col span={8}>
            <Form.Item name="testCategories" label="Test Categories">
                <Select mode="tags" placeholder="Add test categories" size="large" style={fieldStyle}>
                <Option value="Blood Tests">Blood Tests</Option>
                <Option value="Urine Tests">Urine Tests</Option>
                <Option value="Stool Tests">Stool Tests</Option>
                <Option value="Culture Tests">Culture Tests</Option>
              </Select>
            </Form.Item>
          </Col>
            <Col span={8}>
            <Form.Item name="equipment" label="Equipment">
                <Select mode="tags" placeholder="Add equipment" size="large" style={fieldStyle} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="accreditation" label="Accreditation">
                <TextArea rows={2} placeholder="Enter accreditations and certifications" style={{ borderRadius: 12 }} />
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
              <Button size="large" onClick={() => setCurrentStep(0)} style={{ borderRadius: 12 }}>Previous</Button>
              <Button type="primary" size="large" loading={completeOnboardingMutation.isPending} onClick={handleComplete} style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Complete Profile</Button>
            </>
          ) : (
            <>
              <Button size="large" onClick={() => setCurrentStep(0)} style={{ borderRadius: 12 }}>Previous</Button>
              <Button type="primary" size="large" onClick={handleNext} icon={<RightOutlined />} iconPosition="end" style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Next</Button>
            </>
                )}
              </div>
            </Form>
    </OnboardingStepsLayout>
  );
}
