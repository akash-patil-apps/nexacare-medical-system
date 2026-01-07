import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Card, Steps, App, Space, Typography } from 'antd';
import { UserOutlined, MedicineBoxOutlined, SafetyOutlined, ShoppingOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

export default function PharmacistOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/onboarding/pharmacist/complete', data);
      return res.json();
    },
    onSuccess: async (data) => {
      console.log('✅ Pharmacist onboarding completed successfully:', data);

      // Invalidate and refetch onboarding status query
      const userRole = localStorage.getItem('userRole') || 'pharmacist';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });

      // Refetch the onboarding status
      const refetchResults = await queryClient.refetchQueries({
        queryKey: ['onboarding-status', userRole]
      });

      // Set localStorage flag to prevent redirect loop
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('onboardingCompletedAt', Date.now().toString());

      message.success('Welcome to NexaCare! Your pharmacist profile has been created.');

      // Redirect to pharmacist dashboard
      setTimeout(() => {
        setLocation('/dashboard/pharmacist');
      }, 1000);
    },
    onError: (error: any) => {
      console.error('❌ Pharmacist onboarding failed:', error);
      message.error('Failed to complete pharmacist onboarding. Please try again.');
    },
  });

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      console.log('Step validation passed:', currentStep, values);

      if (currentStep === 2) { // Last step
        // Combine all form values
        const allValues = form.getFieldsValue(true);
        console.log('All form values:', allValues);

        // Transform data for API
        const onboardingData = {
          pharmacyDegree: allValues.pharmacyDegree,
          licenseNumber: allValues.licenseNumber,
          specialization: allValues.specialization,
          experience: allValues.experience,
          shiftType: allValues.shiftType,
          workingHours: allValues.workingHours,
          pharmacyType: allValues.pharmacyType,
          languages: allValues.languages,
          certifications: allValues.certifications,
          bio: allValues.bio,
        };

        console.log('Submitting pharmacist onboarding data:', onboardingData);
        completeOnboardingMutation.mutate(onboardingData);
      } else {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
      message.error('Please fill in all required fields');
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const steps = [
    {
      title: 'Professional Info',
      icon: <UserOutlined />,
      description: 'Your qualifications',
    },
    {
      title: 'Specialization',
      icon: <MedicineBoxOutlined />,
      description: 'Your expertise',
    },
    {
      title: 'Work Details',
      icon: <ShoppingOutlined />,
      description: 'Schedule & pharmacy',
    },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
              Professional Qualifications
            </Title>
            <Form.Item
              name="pharmacyDegree"
              label="Pharmacy Degree"
              rules={[{ required: true, message: 'Please select your pharmacy degree' }]}
            >
              <Select placeholder="Select your pharmacy qualification">
                <Option value="BPharm">Bachelor of Pharmacy (BPharm)</Option>
                <Option value="MPharm">Master of Pharmacy (MPharm)</Option>
                <Option value="PharmD">Doctor of Pharmacy (PharmD)</Option>
                <Option value="DPharm">Diploma in Pharmacy (DPharm)</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="licenseNumber"
              label="Pharmacy License Number"
              rules={[{ required: true, message: 'Please enter your license number' }]}
            >
              <Input placeholder="Enter your pharmacy license number" />
            </Form.Item>

            <Form.Item
              name="experience"
              label="Years of Experience"
              rules={[{ required: true, message: 'Please enter your experience' }]}
            >
              <Select placeholder="Select years of experience">
                <Option value="0-1">Less than 1 year</Option>
                <Option value="1-2">1-2 years</Option>
                <Option value="2-5">2-5 years</Option>
                <Option value="5-10">5-10 years</Option>
                <Option value="10+">More than 10 years</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="languages"
              label="Languages Spoken"
            >
              <Select mode="multiple" placeholder="Select languages you speak">
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
          </div>
        );

      case 1:
        return (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
              Area of Specialization
            </Title>
            <Form.Item
              name="specialization"
              label="Pharmacy Specialization"
            >
              <Select placeholder="Select your area of specialization">
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

            <Form.Item
              name="certifications"
              label="Additional Certifications"
            >
              <Select mode="multiple" placeholder="Select any additional certifications">
                <Option value="BCPS">Board Certified Pharmacotherapy Specialist (BCPS)</Option>
                <Option value="BCACP">Board Certified Ambulatory Care Pharmacist (BCACP)</Option>
                <Option value="BCOP">Board Certified Oncology Pharmacist (BCOP)</Option>
                <Option value="BCPP">Board Certified Psychiatric Pharmacist (BCPP)</Option>
                <Option value="BCCCP">Board Certified Critical Care Pharmacist (BCCCP)</Option>
                <Option value="CGP">Certified Geriatric Pharmacist (CGP)</Option>
                <Option value="CSP">Certified Specialty Pharmacist (CSP)</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
          </div>
        );

      case 2:
        return (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
              Work Preferences & Pharmacy Type
            </Title>
            <Form.Item
              name="pharmacyType"
              label="Pharmacy Type"
              rules={[{ required: true, message: 'Please select pharmacy type' }]}
            >
              <Select placeholder="Select your pharmacy type">
                <Option value="hospital">Hospital Pharmacy</Option>
                <Option value="retail">Retail Pharmacy</Option>
                <Option value="clinical">Clinical Pharmacy</Option>
                <Option value="specialty">Specialty Pharmacy</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="shiftType"
              label="Preferred Shift Type"
              rules={[{ required: true, message: 'Please select your preferred shift' }]}
            >
              <Select placeholder="Select your preferred shift">
                <Option value="day">Day Shift (9 AM - 6 PM)</Option>
                <Option value="night">Night Shift (6 PM - 9 AM)</Option>
                <Option value="rotation">Rotating Shifts</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="workingHours"
              label="Working Hours Preference"
            >
              <Input placeholder="e.g., 8 hours/day, 6 days/week" />
            </Form.Item>

            <Form.Item
              name="bio"
              label="Professional Bio"
            >
              <TextArea
                rows={4}
                placeholder="Tell us about your pharmacy experience and approach to patient care..."
              />
            </Form.Item>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 800,
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 48,
              marginBottom: 16,
              color: '#059669'
            }}>
              💊
            </div>
            <Title level={2} style={{ color: '#059669', margin: 0 }}>
              Pharmacist Onboarding
            </Title>
            <Text type="secondary">
              Help us create your pharmacy profile for optimal patient care
            </Text>
          </div>

          <Steps
            current={currentStep}
            items={steps}
            style={{ padding: '0 20px' }}
          />

          <Form
            form={form}
            layout="vertical"
            style={{ padding: '0 20px' }}
          >
            {renderStepContent()}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 32,
              padding: '0 20px 20px'
            }}>
              <Button
                disabled={currentStep === 0}
                onClick={handlePrev}
                size="large"
              >
                Previous
              </Button>

              <Button
                type="primary"
                onClick={handleNext}
                size="large"
                loading={completeOnboardingMutation.isPending}
                style={{
                  background: '#059669',
                  borderColor: '#059669'
                }}
              >
                {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
              </Button>
            </div>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
