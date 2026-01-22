import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Card,
  Row,
  Col,
  Space,
  Typography,
  message,
} from 'antd';
import {
  UserOutlined,
  MedicineBoxOutlined,
  SecurityScanOutlined,
  CheckCircleFilled,
  RightCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { apiRequest } from '../../lib/queryClient';

const { Option } = Select;
const { TextArea } = Input;

interface PatientFormValues {
  dateOfBirth: Dayjs | null;
  gender: string;
  bloodGroup?: string;
  height?: number;
  weight?: number;
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  chronicConditions?: string;
  emergencyContactName: string;
  emergencyContact: string;
  emergencyRelation?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
}

type StepConfig = {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
};

export default function PatientOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm<PatientFormValues>();

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/onboarding/patient/complete', data);
      return res.json();
    },
    onSuccess: async (data) => {
      // Invalidate and refetch onboarding status query
      const userRole = localStorage.getItem('userRole') || 'patient';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });
      
      // Refetch the onboarding status
      const refetchResults = await queryClient.refetchQueries({ 
        queryKey: ['onboarding-status', userRole],
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

      // Set localStorage flag to prevent redirect loop
      localStorage.setItem('onboarding-just-completed', 'true');
      localStorage.setItem('onboarding-completed-timestamp', Date.now().toString());
      
      message.success('Profile completed successfully! Welcome to NexaCare!');
      
      // Redirect after a short delay
      setTimeout(() => {
        setLocation('/dashboard/patient');
        
        // Clear the flag after redirect
        setTimeout(() => {
          localStorage.removeItem('onboarding-just-completed');
        }, 5000);
      }, 500);
    },
    onError: (error: any) => {
      console.error('❌ Patient onboarding error:', error);
      const errorMessage = error.message || error.toString() || 'Failed to complete profile';
      message.error(errorMessage);
    },
  });

  const handleNext = async () => {
    try {
      // Validate current step fields
      const stepFields: Record<number, (keyof PatientFormValues)[]> = {
        0: ['dateOfBirth', 'gender'],
        1: [], // Medical history step has no required fields
        2: ['emergencyContactName', 'emergencyContact'],
      };

      const fieldsToValidate = stepFields[currentStep] || [];
      if (fieldsToValidate.length > 0) {
        await form.validateFields(fieldsToValidate);
      }

        setCurrentStep(currentStep + 1);
    } catch (error) {
        console.error('Validation error on Next:', error);
        // Don't change step if validation fails
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {
    // Prevent double submission
    if (completeOnboardingMutation.isPending) {
      return;
    }

    try {
      // Validate all required fields
      await form.validateFields(['dateOfBirth', 'gender', 'emergencyContactName', 'emergencyContact']);

      // Get all form values
      const allValues = form.getFieldsValue(true);
      
      // Convert DatePicker Dayjs object to ISO string for backend
      let dateOfBirthFormatted = null;
      if (allValues.dateOfBirth) {
        if (allValues.dateOfBirth.format) {
          dateOfBirthFormatted = allValues.dateOfBirth.format('YYYY-MM-DD');
        } else if (typeof allValues.dateOfBirth === 'string') {
          dateOfBirthFormatted = allValues.dateOfBirth;
        } else {
          dateOfBirthFormatted = allValues.dateOfBirth.toString();
        }
      }

      // Handle "Other" relationship option
      let emergencyRelation = allValues.emergencyRelation;
      if (emergencyRelation === 'Other' && allValues.emergencyRelationOther) {
        emergencyRelation = allValues.emergencyRelationOther;
      }
      
      const transformedValues = {
        ...allValues,
        dateOfBirth: dateOfBirthFormatted,
        gender: allValues.gender || null,
        emergencyRelation: emergencyRelation || null,
      };
      
      // Remove the temporary field
      delete transformedValues.emergencyRelationOther;
      
      // Validate that required fields are present
      if (!transformedValues.dateOfBirth || !transformedValues.gender) {
        message.error('Please fill in all required fields (Date of Birth and Gender)');
        setCurrentStep(0);
        return;
      }

      if (!transformedValues.emergencyContactName || !transformedValues.emergencyContact) {
        message.error('Please fill in all required fields (Emergency Contact Name and Number)');
        setCurrentStep(2);
        return;
      }
      
      completeOnboardingMutation.mutate(transformedValues);
    } catch (error: any) {
      console.error('❌ Validation failed:', error);
      if (error.errorFields && error.errorFields.length > 0) {
        const firstError = error.errorFields[0];
        const errorMessage = firstError?.errors?.[0] || 'Please fill in all required fields';
        message.error(errorMessage);
        
        // Navigate to the step with the error
        const fieldName = firstError?.name?.[0];
        if (fieldName === 'dateOfBirth' || fieldName === 'gender') {
          if (currentStep !== 0) {
            setCurrentStep(0);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else if (fieldName === 'emergencyContactName' || fieldName === 'emergencyContact') {
          if (currentStep !== 2) {
            setCurrentStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      } else {
        message.error('Please fill in all required fields');
      }
    }
  };

  const steps: StepConfig[] = [
    {
      title: 'Personal Information',
      icon: <UserOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
          <Form.Item
            name="dateOfBirth"
            label="Date of Birth"
            rules={[{ required: true, message: 'Please select your date of birth' }]}
          >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Select your date of birth"
                format="DD/MM/YYYY"
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
          </Form.Item>
          </Col>
          <Col span={24}>
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
          </Col>
          <Col span={12}>
          <Form.Item name="bloodGroup" label="Blood Group">
              <Select placeholder="Select blood group (optional)">
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
          </Col>
          <Col span={12}>
          <Form.Item name="height" label="Height (cm)">
              <Input
                type="number"
                placeholder="Enter height in cm"
                min={0}
                max={300}
              />
          </Form.Item>
          </Col>
          <Col span={12}>
          <Form.Item name="weight" label="Weight (kg)">
              <Input
                type="number"
                placeholder="Enter weight in kg"
                min={0}
                max={500}
              />
          </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: 'Medical History',
      icon: <MedicineBoxOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
          <Form.Item name="medicalHistory" label="Medical History">
              <TextArea
                rows={4}
                placeholder="Enter any relevant medical history, past surgeries, or significant health events"
              />
          </Form.Item>
          </Col>
          <Col span={24}>
          <Form.Item name="allergies" label="Allergies">
              <TextArea
                rows={3}
                placeholder="Enter any allergies (medications, food, environmental, etc.)"
              />
          </Form.Item>
          </Col>
          <Col span={24}>
          <Form.Item name="currentMedications" label="Current Medications">
              <TextArea
                rows={3}
                placeholder="List any medications you are currently taking, including dosage and frequency"
              />
          </Form.Item>
          </Col>
          <Col span={24}>
          <Form.Item name="chronicConditions" label="Chronic Conditions">
              <TextArea
                rows={3}
                placeholder="Enter any chronic conditions or ongoing health issues"
              />
          </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: 'Emergency & Insurance',
      icon: <SecurityScanOutlined />,
      content: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
          <Form.Item
            name="emergencyContactName"
            label="Emergency Contact Name"
            rules={[{ required: true, message: 'Please enter emergency contact name' }]}
          >
              <Input placeholder="Enter emergency contact full name" />
          </Form.Item>
          </Col>
          <Col span={12}>
          <Form.Item
            name="emergencyContact"
            label="Emergency Contact Number"
              rules={[
                { required: true, message: 'Please enter emergency contact number' },
                { pattern: /^[0-9]{10}$/, message: 'Enter a valid 10-digit mobile number' },
              ]}
          >
              <Input
                placeholder="10-digit mobile number"
                maxLength={10}
              />
          </Form.Item>
          </Col>
          <Col span={12}>
          <Form.Item name="emergencyRelation" label="Relationship">
              <Select
                placeholder="Select relationship"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                <Option value="Spouse">Spouse</Option>
                <Option value="Parent">Parent</Option>
                <Option value="Child">Child</Option>
                <Option value="Sibling">Sibling</Option>
                <Option value="Friend">Friend</Option>
                <Option value="Relative">Relative</Option>
                <Option value="Guardian">Guardian</Option>
                <Option value="Colleague">Colleague</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
          </Col>
          {form.getFieldValue('emergencyRelation') === 'Other' && (
            <Col span={12}>
              <Form.Item
                name="emergencyRelationOther"
                label="Specify Relationship"
                rules={[{ required: true, message: 'Please specify the relationship' }]}
              >
                <Input placeholder="Enter relationship" />
              </Form.Item>
            </Col>
          )}
          {form.getFieldValue('emergencyRelation') === 'Other' && (
            <Col span={12}>
              <Form.Item
                name="emergencyRelationOther"
                label="Specify Relationship"
                rules={[{ required: true, message: 'Please specify the relationship' }]}
              >
                <Input placeholder="Enter relationship" />
          </Form.Item>
            </Col>
          )}
          <Col span={12}>
          <Form.Item name="insuranceProvider" label="Insurance Provider">
              <Input placeholder="Enter insurance provider name (optional)" />
          </Form.Item>
          </Col>
          <Col span={12}>
          <Form.Item name="insuranceNumber" label="Insurance Number">
              <Input placeholder="Enter insurance number (optional)" />
          </Form.Item>
          </Col>
        </Row>
      ),
    },
  ];

  const getStepStatus = (index: number) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'active';
    return 'upcoming';
  };

  const renderStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'In progress';
      default:
        return 'Pending';
    }
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleFilled />;
      case 'active':
        return <RightCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const progressLabel = `Step ${currentStep + 1} of ${steps.length}`;

  return (
    <div className="patient-onboarding-wrapper">
      <Card
        className="patient-onboarding-card"
        variant="borderless"
        style={{ borderRadius: 28, boxShadow: '0 28px 60px rgba(26, 143, 227, 0.12)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="patient-onboarding-layout">
          <aside className="patient-onboarding-stepper">
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary" className="patient-onboarding-progress-label">
                {progressLabel}
              </Typography.Text>
              <Typography.Title level={4} style={{ margin: 0, color: '#1A8FE3' }}>
                Patient Profile Setup
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Complete your profile to get the best healthcare experience.
              </Typography.Paragraph>
            </Space>
            <ul className="patient-stepper-list">
              {steps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                  <li key={step.title} className={`patient-stepper-item ${status}`}>
                    <span className="patient-stepper-icon">
                      {renderStatusIcon(status)}
                    </span>
                    <div className="patient-stepper-copy">
                      <Typography.Text className="patient-stepper-title">
                        {step.title}
                      </Typography.Text>
                      <Typography.Text className="patient-stepper-status">
                        {renderStatusLabel(status)}
                      </Typography.Text>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="patient-onboarding-content">
            <Typography.Title level={2} style={{ marginBottom: 16, color: '#1A8FE3' }}>
              {steps[currentStep].title}
            </Typography.Title>

        <Form 
          form={form} 
          layout="vertical"
          preserve={true}
          initialValues={{}}
              onValuesChange={(changedValues) => {
                // Force re-render when emergencyRelation changes to show/hide "Other" field
                if (changedValues.emergencyRelation !== undefined) {
                  form.setFieldsValue({ emergencyRelationOther: undefined });
                }
              }}
            >
              <div className="patient-onboarding-content-inner">
                {steps[currentStep].content}
            </div>
              <div className="patient-onboarding-footer">
            {currentStep > 0 && (
                  <Button onClick={handlePrev} size="large">
                    Previous
                  </Button>
            )}
            {currentStep < steps.length - 1 && (
                  <Button
                    type="primary"
                    onClick={handleNext}
                    size="large"
                    style={{ backgroundColor: '#1A8FE3', borderColor: '#1A8FE3' }}
                  >
                Next
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button
                type="primary"
                    onClick={handleComplete}
                loading={completeOnboardingMutation.isPending}
                    size="large"
                    style={{
                      backgroundColor: '#1A8FE3',
                      borderColor: '#1A8FE3',
                      boxShadow: '0 12px 24px rgba(26, 143, 227, 0.25)',
                    }}
              >
                Complete Profile
              </Button>
            )}
          </div>
        </Form>
          </div>
        </div>
      </Card>
    </div>
  );
}
