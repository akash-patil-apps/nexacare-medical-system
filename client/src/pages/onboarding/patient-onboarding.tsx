import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, DatePicker, Select, Button, Card, Steps, App } from 'antd';
import { UserOutlined, MedicineBoxOutlined, SecurityScanOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiRequest } from '../../lib/queryClient';

const { Option } = Select;
const { TextArea } = Input;

export default function PatientOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/onboarding/patient/complete', data);
      return res.json();
    },
    onSuccess: async (data) => {
      console.log('✅ Onboarding completed successfully:', data);
      
      // Invalidate and refetch onboarding status query to ensure cache is updated
      const userRole = localStorage.getItem('userRole') || 'patient';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });
      
      // Refetch the onboarding status and wait for it to complete
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
          const res = await apiRequest('GET', '/api/onboarding/patient/status');
          updatedStatus = await res.json();
        } catch (err) {
          console.error('Failed to fetch updated status:', err);
        }
      }
      
      console.log('📊 Updated onboarding status:', updatedStatus);
      console.log('📊 isCompleted value:', updatedStatus?.isCompleted);
      console.log('📊 isComplete value:', updatedStatus?.isComplete);
      
      // Check both isCompleted and isComplete for compatibility
      const isActuallyCompleted = updatedStatus?.isCompleted === true || updatedStatus?.isComplete === true;
      
      if (!isActuallyCompleted) {
        console.warn('⚠️ Onboarding status shows incomplete after completion. This might be a data issue.');
        console.warn('⚠️ Profile data:', updatedStatus?.profile);
      }
      
      // Set a flag to prevent onboarding check from redirecting back
      // Keep this flag longer to prevent redirect on next login
      localStorage.setItem('onboarding-just-completed', 'true');
      localStorage.setItem('onboarding-completed-timestamp', Date.now().toString());
      
      message.success('Profile completed successfully!');
      
      // Redirect after a short delay
      setTimeout(() => {
        console.log('🔄 Redirecting to dashboard...');
        setLocation('/dashboard/patient');
        
        // Clear the flag after redirect (give enough time for dashboard to load)
        // But keep a timestamp so we can check if it was recently completed
        setTimeout(() => {
          localStorage.removeItem('onboarding-just-completed');
          console.log('✅ Onboarding completion flag cleared');
        }, 5000); // Increased to 5 seconds
      }, 300);
    },
    onError: (error: any) => {
      console.error('❌ Onboarding error:', error);
      const errorMessage = error.message || error.toString() || 'Failed to complete profile';
      message.error(errorMessage);
    },
  });

  const handleNext = () => {
    form.validateFields()
      .then(() => {
        setCurrentStep(currentStep + 1);
      })
      .catch((error) => {
        console.error('Validation error on Next:', error);
        // Don't change step if validation fails
      });
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (completeOnboardingMutation.isPending) {
      return;
    }

    try {
      // Validate all fields from all steps - explicitly validate all required fields
      // Note: validateFields with specific field names validates only those fields
      // We need to validate all fields to ensure data is captured
      const values = await form.validateFields();
      
      // Get all form values (including optional fields)
      // Use getFieldsValue with true to get all fields including those not in current step
      const allValues = form.getFieldsValue(true);
      
      console.log('📋 Raw form values:', allValues);
      console.log('📋 dateOfBirth raw:', allValues.dateOfBirth);
      console.log('📋 gender raw:', allValues.gender);
      
      // Convert DatePicker Dayjs object to ISO string for backend
      let dateOfBirthFormatted = null;
      if (allValues.dateOfBirth) {
        if (allValues.dateOfBirth.format) {
          // It's a Dayjs object
          dateOfBirthFormatted = allValues.dateOfBirth.format('YYYY-MM-DD');
        } else if (typeof allValues.dateOfBirth === 'string') {
          // It's already a string
          dateOfBirthFormatted = allValues.dateOfBirth;
        } else {
          // Try to convert it
          dateOfBirthFormatted = allValues.dateOfBirth.toString();
        }
      }
      
      const transformedValues = {
        ...allValues,
        dateOfBirth: dateOfBirthFormatted,
        gender: allValues.gender || null,
      };
      
      console.log('✅ All validation passed. Submitting onboarding data:', transformedValues);
      console.log('✅ dateOfBirth formatted:', transformedValues.dateOfBirth);
      console.log('✅ gender:', transformedValues.gender);
      
      // Validate that required fields are present
      if (!transformedValues.dateOfBirth || !transformedValues.gender) {
        console.error('❌ Missing required fields:', {
          dateOfBirth: transformedValues.dateOfBirth,
          gender: transformedValues.gender,
        });
        message.error('Please fill in all required fields (Date of Birth and Gender)');
        setCurrentStep(0); // Go back to first step
        return;
      }
      
      completeOnboardingMutation.mutate(transformedValues);
    } catch (error: any) {
      console.error('❌ Validation failed:', error);
      // Show validation errors to user
      if (error.errorFields && error.errorFields.length > 0) {
        const firstError = error.errorFields[0];
        const errorMessage = firstError?.errors?.[0] || 'Please fill in all required fields';
        message.error(errorMessage);
        
        // Navigate to the step with the error, but only if we're not already there
        const fieldName = firstError?.name?.[0];
        if (fieldName === 'dateOfBirth' || fieldName === 'gender') {
          if (currentStep !== 0) {
            setCurrentStep(0);
            // Scroll to top to show the error
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else if (fieldName === 'emergencyContactName' || fieldName === 'emergencyContact') {
          if (currentStep !== 2) {
            setCurrentStep(2);
            // Scroll to top to show the error
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      } else {
        message.error('Please fill in all required fields');
      }
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
      icon: <SecurityScanOutlined />,
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

        <Form 
          form={form} 
          layout="vertical"
          preserve={true}
          initialValues={{}}
          onValuesChange={(changedValues, allValues) => {
            // Debug: log when values change
            if (changedValues.dateOfBirth || changedValues.gender) {
              console.log('📝 Form values changed:', { changedValues, allValues });
            }
          }}
        >
          {/* Render all form fields but hide non-active steps to preserve values */}
          {steps.map((step, index) => (
            <div key={index} style={{ display: currentStep === index ? 'block' : 'none' }}>
              {step.content}
            </div>
          ))}

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








