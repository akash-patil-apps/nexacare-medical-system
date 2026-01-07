import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Card, Steps, App, Space, Typography } from 'antd';
import { UserOutlined, MedicineBoxOutlined, SecurityScanOutlined, ExperimentOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

export default function RadiologyTechnicianOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/onboarding/radiology-technician/complete', data);
      return res.json();
    },
    onSuccess: async (data) => {
      console.log('✅ Radiology technician onboarding completed successfully:', data);

      // Invalidate and refetch onboarding status query
      const userRole = localStorage.getItem('userRole') || 'radiology_technician';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });

      // Refetch the onboarding status
      const refetchResults = await queryClient.refetchQueries({
        queryKey: ['onboarding-status', userRole]
      });

      // Set localStorage flag to prevent redirect loop
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('onboardingCompletedAt', Date.now().toString());

      message.success('Welcome to NexaCare! Your radiology technician profile has been created.');

      // Redirect to radiology technician dashboard
      setTimeout(() => {
        setLocation('/dashboard/radiology-technician');
      }, 1000);
    },
    onError: (error: any) => {
      console.error('❌ Radiology technician onboarding failed:', error);
      message.error('Failed to complete radiology technician onboarding. Please try again.');
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
          radiologyDegree: allValues.radiologyDegree,
          licenseNumber: allValues.licenseNumber,
          specialization: allValues.specialization,
          experience: allValues.experience,
          shiftType: allValues.shiftType,
          workingHours: allValues.workingHours,
          modalities: allValues.modalities,
          languages: allValues.languages,
          certifications: allValues.certifications,
          bio: allValues.bio,
        };

        console.log('Submitting radiology technician onboarding data:', onboardingData);
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
      icon: <ExperimentOutlined />,
      description: 'Imaging expertise',
    },
    {
      title: 'Work Details',
      icon: <MedicineBoxOutlined />,
      description: 'Schedule & equipment',
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
              name="radiologyDegree"
              label="Radiology Degree"
              rules={[{ required: true, message: 'Please select your radiology degree' }]}
            >
              <Select placeholder="Select your radiology qualification">
                <Option value="B.Sc Radiology">Bachelor of Science in Radiology</Option>
                <Option value="Diploma Radiology">Diploma in Radiology</Option>
                <Option value="M.Sc Radiology">Master of Science in Radiology</Option>
                <Option value="B.Sc Medical Imaging">Bachelor of Science in Medical Imaging</Option>
                <Option value="Certificate">Radiology Technology Certificate</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="licenseNumber"
              label="Radiology License Number"
              rules={[{ required: true, message: 'Please enter your license number' }]}
            >
              <Input placeholder="Enter your radiology license number" />
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
              Imaging Specializations & Modalities
            </Title>
            <Form.Item
              name="specialization"
              label="Primary Specialization"
            >
              <Select placeholder="Select your primary area of specialization">
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

            <Form.Item
              name="modalities"
              label="Imaging Modalities You Work With"
            >
              <Select mode="multiple" placeholder="Select imaging modalities you're trained in">
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

            <Form.Item
              name="certifications"
              label="Additional Certifications"
            >
              <Select mode="multiple" placeholder="Select any additional certifications">
                <Option value="ARRT">American Registry of Radiologic Technologists (ARRT)</Option>
                <Option value="ARMRIT">Registered Magnetic Resonance Imaging Technologist (ARMRIT)</Option>
                <Option value="RDMS">Registered Diagnostic Medical Sonographer (RDMS)</Option>
                <Option value="RVT">Registered Vascular Technologist (RVT)</Option>
                <Option value="CNMT">Certified Nuclear Medicine Technologist (CNMT)</Option>
                <Option value="CT">Computed Tomography (CT)</Option>
                <Option value="VI">Vascular Interventional (VI)</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
          </div>
        );

      case 2:
        return (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
              Work Schedule & Preferences
            </Title>
            <Form.Item
              name="shiftType"
              label="Preferred Shift Type"
              rules={[{ required: true, message: 'Please select your preferred shift' }]}
            >
              <Select placeholder="Select your preferred shift">
                <Option value="day">Day Shift (8 AM - 4 PM)</Option>
                <Option value="evening">Evening Shift (4 PM - 12 AM)</Option>
                <Option value="night">Night Shift (12 AM - 8 AM)</Option>
                <Option value="rotation">Rotating Shifts</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="workingHours"
              label="Working Hours Preference"
            >
              <Input placeholder="e.g., 8 hours/day, 5 days/week" />
            </Form.Item>

            <Form.Item
              name="bio"
              label="Professional Bio"
            >
              <TextArea
                rows={4}
                placeholder="Tell us about your radiology experience and approach to patient care..."
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
      background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
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
              color: '#7C3AED'
            }}>
              🩻
            </div>
            <Title level={2} style={{ color: '#7C3AED', margin: 0 }}>
              Radiology Technician Onboarding
            </Title>
            <Text type="secondary">
              Help us create your radiology profile for accurate imaging services
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
                  background: '#7C3AED',
                  borderColor: '#7C3AED'
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
