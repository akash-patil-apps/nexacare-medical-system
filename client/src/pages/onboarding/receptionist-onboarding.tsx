import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Row, Col, message, DatePicker } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';
import { OnboardingStepsLayout } from '../../components/onboarding/OnboardingStepsLayout';

const { Option } = Select;

const RECEPTIONIST_STEPS = [{ title: 'Hospital Selection' }, { title: 'Work Details' }];
const STEP_TITLES = ['Hospital Selection', 'Work Details'];
const STEP_NOTES = ['Select the hospital you work at.', 'Enter your work details.'];
const fieldStyle = { borderRadius: 12 };

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
      const data = await res.json();
      return data.hospitals ?? data;
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
      message.error(error?.message || 'Failed to complete profile');
    },
  });

  const handleNext = async () => {
    try {
      if (currentStep === 0) await form.validateFields(['hospitalId']);
      setCurrentStep(currentStep + 1);
    } catch (e) {}
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
    } catch (err: any) {
      message.error(err?.errorFields?.[0]?.errors?.[0] || 'Please fill in all required fields');
    }
  };

  const handleBack = () => {
    if (currentStep === 0) setLocation('/dashboard/receptionist');
    else setCurrentStep(currentStep - 1);
  };

  const isLastStep = currentStep === RECEPTIONIST_STEPS.length - 1;

  return (
    <OnboardingStepsLayout
      steps={RECEPTIONIST_STEPS}
      currentStepIndex={currentStep}
      stepTitle={STEP_TITLES[currentStep]}
      stepNote={STEP_NOTES[currentStep]}
      onBack={handleBack}
      showHelpLink
    >
      <Form form={form} layout="vertical" preserve={true}>
        {currentStep === 0 && (
          <Row gutter={[16, 16]}>
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
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Form.Item name="employeeId" label="Employee ID">
                <Input placeholder="Enter employee ID" size="large" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="department" label="Department">
                <Input placeholder="Enter department" size="large" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="shift" label="Shift">
                <Select placeholder="Select shift" size="large" style={fieldStyle}>
                  <Option value="day">Day</Option>
                  <Option value="night">Night</Option>
                  <Option value="rotation">Rotation</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="workingHours" label="Working Hours">
                <Input placeholder="e.g., 9:00 AM - 5:00 PM" size="large" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dateOfJoining" label="Date of Joining">
                <DatePicker style={{ width: '100%', borderRadius: 12 }} size="large" />
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
          ) : null}
        </div>
      </Form>
    </OnboardingStepsLayout>
  );
}
