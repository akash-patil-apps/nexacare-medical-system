import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Select, Button, Card, Steps, App, Space, Typography } from 'antd';
import { UserOutlined, MedicineBoxOutlined, SecurityScanOutlined, HeartOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

export default function NurseOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/onboarding/nurse/complete', data);
      return res.json();
    },
    onSuccess: async (data) => {
      console.log('✅ Nurse onboarding completed successfully:', data);

      // Invalidate and refetch onboarding status query
      const userRole = localStorage.getItem('userRole') || 'nurse';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });

      // Refetch the onboarding status
      const refetchResults = await queryClient.refetchQueries({
        queryKey: ['onboarding-status', userRole]
      });

      // Get the updated status from the refetch result
      let updatedStatus = null;
      if (refetchResults && refetchResults.length > 0) {
        const result = refetchResults[0];
        updatedStatus = result?.data || result?.state?.data;
      }

      // If refetch didn't work, try fetching directly
      if (!updatedStatus) {
        try {
          const res = await apiRequest('GET', '/api/onboarding/nurse/status');
          updatedStatus = await res.json();
        } catch (err) {
          console.error('Failed to fetch updated status:', err);
        }
      }

      console.log('🔄 Updated onboarding status after completion:', updatedStatus);

      // Set localStorage flag to prevent redirect loop
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('onboardingCompletedAt', Date.now().toString());

      message.success('Welcome to NexaCare! Your nurse profile has been created.');

      // Redirect to nurse dashboard
      setTimeout(() => {
        setLocation('/dashboard/nurse');
      }, 1000);
    },
    onError: (error: any) => {
      console.error('❌ Nurse onboarding failed:', error);
      message.error('Failed to complete nurse onboarding. Please try again.');
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
          nursingDegree: allValues.nursingDegree,
          licenseNumber: allValues.licenseNumber,
          specialization: allValues.specialization,
          experience: allValues.experience,
          shiftType: allValues.shiftType,
          workingHours: allValues.workingHours,
          wardPreferences: allValues.wardPreferences,
          skills: allValues.skills,
          languages: allValues.languages,
          certifications: allValues.certifications,
          bio: allValues.bio,
        };

        console.log('Submitting nurse onboarding data:', onboardingData);
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
      icon: <HeartOutlined />,
      description: 'Schedule & preferences',
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
              name="nursingDegree"
              label="Nursing Degree"
              rules={[{ required: true, message: 'Please select your nursing degree' }]}
            >
              <Select placeholder="Select your nursing qualification">
                <Option value="BSc Nursing">BSc Nursing</Option>
                <Option value="GNM">General Nursing and Midwifery (GNM)</Option>
                <Option value="ANM">Auxiliary Nurse Midwife (ANM)</Option>
                <Option value="Post Basic BSc">Post Basic BSc Nursing</Option>
                <Option value="MSc Nursing">MSc Nursing</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="licenseNumber"
              label="Nursing License Number"
              rules={[{ required: true, message: 'Please enter your license number' }]}
            >
              <Input placeholder="Enter your nursing license number" />
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
              label="Nursing Specialization"
            >
              <Select placeholder="Select your area of specialization">
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

            <Form.Item
              name="skills"
              label="Key Nursing Skills"
            >
              <Select mode="multiple" placeholder="Select your nursing skills">
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

            <Form.Item
              name="certifications"
              label="Additional Certifications"
            >
              <Select mode="multiple" placeholder="Select any additional certifications">
                <Option value="ACLS">Advanced Cardiac Life Support (ACLS)</Option>
                <Option value="BLS">Basic Life Support (BLS)</Option>
                <Option value="PALS">Pediatric Advanced Life Support (PALS)</Option>
                <Option value="NALS">Neonatal Advanced Life Support (NALS)</Option>
                <Option value="TNCC">Trauma Nursing Core Course (TNCC)</Option>
                <Option value="ENPC">Emergency Nursing Pediatric Course (ENPC)</Option>
                <Option value="CCRN">Critical Care Registered Nurse (CCRN)</Option>
                <Option value="CEN">Certified Emergency Nurse (CEN)</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
          </div>
        );

      case 2:
        return (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
              Work Preferences & Schedule
            </Title>
            <Form.Item
              name="shiftType"
              label="Preferred Shift Type"
              rules={[{ required: true, message: 'Please select your preferred shift' }]}
            >
              <Select placeholder="Select your preferred shift">
                <Option value="day">Day Shift (7 AM - 7 PM)</Option>
                <Option value="night">Night Shift (7 PM - 7 AM)</Option>
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
              name="wardPreferences"
              label="Preferred Ward Types"
            >
              <Select mode="multiple" placeholder="Select ward types you prefer to work in">
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

            <Form.Item
              name="bio"
              label="Professional Bio"
            >
              <TextArea
                rows={4}
                placeholder="Tell us about your nursing experience and approach to patient care..."
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
              👩‍⚕️
            </div>
            <Title level={2} style={{ color: '#059669', margin: 0 }}>
              Nurse Onboarding
            </Title>
            <Text type="secondary">
              Help us create your nursing profile for optimal patient care
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
