import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Form, Input, DatePicker, Select, Button, Card, Steps, message } from 'antd';
import { UserOutlined, MedicineBoxOutlined, SafetyOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Option } = Select;
const { TextArea } = Input;

export default function PatientOnboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/onboarding/patient/complete', data);
    },
    onSuccess: () => {
      message.success('Profile completed successfully!');
      setLocation('/dashboard/patient');
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to complete profile');
    },
  });

  const handleNext = () => {
    form.validateFields().then(() => {
      setCurrentStep(currentStep + 1);
    });
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      completeOnboardingMutation.mutate(values);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const steps = [
    {
      title: 'Personal Info',
      icon: <UserOutlined />,
      content: (
        <>
          <Form.Item
            name="dateOfBirth"
            label="Date of Birth"
            rules={[{ required: true, message: 'Please select your date of birth' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="gender"
            label="Gender"
            rules={[{ required: true, message: 'Please select your gender' }]}
          >
            <Select placeholder="Select gender">
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>
          <Form.Item name="bloodGroup" label="Blood Group">
            <Select placeholder="Select blood group">
              <Option value="A+">A+</Option>
              <Option value="A-">A-</Option>
              <Option value="B+">B+</Option>
              <Option value="B-">B-</Option>
              <Option value="AB+">AB+</Option>
              <Option value="AB-">AB-</Option>
              <Option value="O+">O+</Option>
              <Option value="O-">O-</Option>
            </Select>
          </Form.Item>
          <Form.Item name="height" label="Height (cm)">
            <Input type="number" placeholder="Enter height in cm" />
          </Form.Item>
          <Form.Item name="weight" label="Weight (kg)">
            <Input type="number" placeholder="Enter weight in kg" />
          </Form.Item>
        </>
      ),
    },
    {
      title: 'Medical History',
      icon: <MedicineBoxOutlined />,
      content: (
        <>
          <Form.Item name="medicalHistory" label="Medical History">
            <TextArea rows={4} placeholder="Enter any relevant medical history" />
          </Form.Item>
          <Form.Item name="allergies" label="Allergies">
            <TextArea rows={2} placeholder="Enter any allergies (medications, food, etc.)" />
          </Form.Item>
          <Form.Item name="currentMedications" label="Current Medications">
            <TextArea rows={3} placeholder="List any medications you are currently taking" />
          </Form.Item>
          <Form.Item name="chronicConditions" label="Chronic Conditions">
            <TextArea rows={3} placeholder="Enter any chronic conditions" />
          </Form.Item>
        </>
      ),
    },
    {
      title: 'Emergency & Insurance',
      icon: <SafetyOutlined />,
      content: (
        <>
          <Form.Item
            name="emergencyContactName"
            label="Emergency Contact Name"
            rules={[{ required: true, message: 'Please enter emergency contact name' }]}
          >
            <Input placeholder="Enter emergency contact name" />
          </Form.Item>
          <Form.Item
            name="emergencyContact"
            label="Emergency Contact Number"
            rules={[{ required: true, message: 'Please enter emergency contact number' }]}
          >
            <Input placeholder="Enter emergency contact number" />
          </Form.Item>
          <Form.Item name="emergencyRelation" label="Relationship">
            <Input placeholder="Relationship with emergency contact" />
          </Form.Item>
          <Form.Item name="insuranceProvider" label="Insurance Provider">
            <Input placeholder="Enter insurance provider name" />
          </Form.Item>
          <Form.Item name="insuranceNumber" label="Insurance Number">
            <Input placeholder="Enter insurance number" />
          </Form.Item>
        </>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '24px' }}>
      <Card style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Complete Your Profile</h1>
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((item) => (
            <Steps.Step key={item.title} title={item.title} icon={item.icon} />
          ))}
        </Steps>

        <Form form={form} layout="vertical">
          <div style={{ minHeight: 400 }}>{steps[currentStep].content}</div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>Previous</Button>
            )}
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={handleNext} style={{ marginLeft: 'auto' }}>
                Next
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={completeOnboardingMutation.isPending}
                style={{ marginLeft: 'auto' }}
              >
                Complete Profile
              </Button>
            )}
          </div>
        </Form>
      </Card>
    </div>
  );
}




