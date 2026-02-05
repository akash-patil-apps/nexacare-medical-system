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
  Progress,
  Steps,
  Divider,
} from 'antd';
import {
  UserOutlined,
  MedicineBoxOutlined,
  SecurityScanOutlined,
  CheckCircleFilled,
  ArrowLeftOutlined,
  CalendarOutlined,
  HeartOutlined,
  FileTextOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { apiRequest } from '../../lib/queryClient';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

interface PatientFormValues {
  dateOfBirth: Dayjs | null;
  gender: string;
  bloodGroup?: string;
  height?: number;
  weight?: number;
  governmentIdType?: string;
  governmentIdNumber?: string;
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

export default function PatientOnboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm<PatientFormValues>();
  const totalSteps = 3;

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/onboarding/patient/complete', data);
      return res.json();
    },
    onSuccess: async (data) => {
      const userRole = localStorage.getItem('userRole') || 'patient';
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });
      
      const refetchResults = await queryClient.refetchQueries({ 
        queryKey: ['onboarding-status', userRole],
      });
      
      let updatedStatus = null;
      if (refetchResults && refetchResults.length > 0) {
        const result = refetchResults[0];
        updatedStatus = result?.data || result?.state?.data;
      }
      
      if (!updatedStatus) {
        try {
          const res = await apiRequest('GET', '/api/onboarding/patient/status');
          updatedStatus = await res.json();
        } catch (err) {
          console.error('Failed to fetch updated status:', err);
        }
      }
      
      localStorage.setItem('onboarding-just-completed', 'true');
      localStorage.setItem('onboarding-completed-timestamp', Date.now().toString());
      
      message.success('Profile completed successfully! Welcome to NexaCare!');
      
      setTimeout(() => {
        setLocation('/dashboard/patient');
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
      const stepFields: Record<number, (keyof PatientFormValues)[]> = {
        0: ['dateOfBirth', 'gender'],
        1: [],
        2: ['emergencyContactName', 'emergencyContact'],
      };

      const fieldsToValidate = stepFields[currentStep] || [];
      if (fieldsToValidate.length > 0) {
        await form.validateFields(fieldsToValidate);
      }

        setCurrentStep(currentStep + 1);
    } catch (error) {
        console.error('Validation error on Next:', error);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
    setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (completeOnboardingMutation.isPending) {
      return;
    }

    try {
      await form.validateFields(['dateOfBirth', 'gender', 'emergencyContactName', 'emergencyContact']);

      const allValues = form.getFieldsValue(true);
      
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
      
      delete transformedValues.emergencyRelationOther;
      
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

  const getProgressPercentage = () => {
    return Math.round(((currentStep + 1) / totalSteps) * 100);
  };

  const stepItems = [
    { title: 'Personal', description: 'Information' },
    { title: 'Medical', description: 'History' },
    { title: 'Emergency', description: '& Insurance' },
  ];

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <div style={{ padding: '24px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1A8FE3 0%, #10B981 100%)',
              marginBottom: '16px',
              boxShadow: '0 4px 12px rgba(26, 143, 227, 0.3)'
            }}>
              <UserOutlined style={{ fontSize: '32px', color: '#FFFFFF' }} />
            </div>
            <Title level={2} style={{ margin: 0, marginBottom: '8px', fontSize: '28px', fontWeight: 700 }}>
              Personal Information
            </Title>
            <Text style={{ fontSize: '16px', color: '#8C8C8C' }}>
              Let's get to know you better
            </Text>
          </div>

          <Form form={form} layout="vertical" preserve={true}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
          <Form.Item
            name="dateOfBirth"
                  label={<Text strong>Date of Birth <Text type="danger">*</Text></Text>}
            rules={[{ required: true, message: 'Please select your date of birth' }]}
          >
              <DatePicker
                    style={{ width: '100%', height: '48px', borderRadius: '12px' }}
                placeholder="Select your date of birth"
                format="DD/MM/YYYY"
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
          </Form.Item>
          </Col>
          <Col span={24}>
          <Form.Item
            name="gender"
                  label={<Text strong>Gender <Text type="danger">*</Text></Text>}
            rules={[{ required: true, message: 'Please select your gender' }]}
          >
                  <Select 
                    placeholder="Select gender"
                    style={{ height: '48px', borderRadius: '12px' }}
                  >
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>
          </Col>
          <Col span={12}>
                <Form.Item name="bloodGroup" label={<Text strong>Blood Group</Text>}>
                  <Select 
                    placeholder="Select blood group"
                    style={{ height: '48px', borderRadius: '12px' }}
                  >
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
                <Form.Item name="height" label={<Text strong>Height (cm)</Text>}>
              <Input
                type="number"
                placeholder="Enter height in cm"
                    style={{ height: '48px', borderRadius: '12px' }}
                min={0}
                max={300}
              />
          </Form.Item>
          </Col>
          <Col span={12}>
                <Form.Item name="weight" label={<Text strong>Weight (kg)</Text>}>
              <Input
                type="number"
                placeholder="Enter weight in kg"
                    style={{ height: '48px', borderRadius: '12px' }}
                min={0}
                max={500}
              />
          </Form.Item>
          </Col>
          <Col span={12}>
                <Form.Item name="governmentIdType" label={<Text strong>Government ID Type</Text>}>
                  <Select
                    placeholder="Select ID type (optional)"
                    style={{ height: '48px', borderRadius: '12px' }}
                    allowClear
                  >
                    <Option value="aadhaar">Aadhaar Card</Option>
                    <Option value="pan">PAN Card</Option>
                    <Option value="driving_license">Driving License</Option>
                    <Option value="passport">Passport</Option>
                  </Select>
                </Form.Item>
          </Col>
          <Col span={12}>
                <Form.Item
                  name="governmentIdNumber"
                  label={<Text strong>Government ID Number</Text>}
                  dependencies={['governmentIdType']}
                >
                  <Input
                    placeholder="Enter ID number (optional)"
                    style={{ height: '48px', borderRadius: '12px' }}
                    maxLength={50}
                  />
                </Form.Item>
          </Col>
        </Row>
          </Form>
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <div style={{ padding: '24px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1A8FE3 0%, #10B981 100%)',
              marginBottom: '16px',
              boxShadow: '0 4px 12px rgba(26, 143, 227, 0.3)'
            }}>
              <MedicineBoxOutlined style={{ fontSize: '32px', color: '#FFFFFF' }} />
            </div>
            <Title level={2} style={{ margin: 0, marginBottom: '8px', fontSize: '28px', fontWeight: 700 }}>
              Medical History
            </Title>
            <Text style={{ fontSize: '16px', color: '#8C8C8C' }}>
              Help us provide better care
            </Text>
          </div>

          <Form form={form} layout="vertical" preserve={true}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
                <Form.Item name="allergies" label={<Text strong>Known Allergies</Text>}>
              <TextArea
                    rows={3}
                    placeholder="e.g., Penicillin, Peanuts, Latex (or leave blank if none)"
                    style={{ borderRadius: '12px' }}
              />
          </Form.Item>
          </Col>
          <Col span={24}>
                <Form.Item name="chronicConditions" label={<Text strong>Chronic Conditions</Text>}>
              <TextArea
                rows={3}
                    placeholder="e.g., Diabetes, Hypertension, Asthma (or leave blank if none)"
                    style={{ borderRadius: '12px' }}
              />
          </Form.Item>
          </Col>
          <Col span={24}>
                <Form.Item name="currentMedications" label={<Text strong>Current Medications</Text>}>
              <TextArea
                rows={3}
                    placeholder="List any medications you're currently taking"
                    style={{ borderRadius: '12px' }}
              />
          </Form.Item>
          </Col>
          <Col span={24}>
                <Form.Item name="medicalHistory" label={<Text strong>Medical History</Text>}>
              <TextArea
                    rows={4}
                    placeholder="Enter any relevant medical history, past surgeries, or significant health events"
                    style={{ borderRadius: '12px' }}
              />
          </Form.Item>
          </Col>
        </Row>
          </Form>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div style={{ padding: '24px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1A8FE3 0%, #10B981 100%)',
              marginBottom: '16px',
              boxShadow: '0 4px 12px rgba(26, 143, 227, 0.3)'
            }}>
              <SecurityScanOutlined style={{ fontSize: '32px', color: '#FFFFFF' }} />
            </div>
            <Title level={2} style={{ margin: 0, marginBottom: '8px', fontSize: '28px', fontWeight: 700 }}>
              Emergency & Insurance
            </Title>
            <Text style={{ fontSize: '16px', color: '#8C8C8C' }}>
              Complete your contact and insurance information
            </Text>
          </div>

          <Form 
            form={form} 
            layout="vertical" 
            preserve={true}
            onValuesChange={(changedValues) => {
              if (changedValues.emergencyRelation !== undefined) {
                form.setFieldsValue({ emergencyRelationOther: undefined });
              }
            }}
          >
        <Row gutter={[16, 16]}>
          <Col span={24}>
          <Form.Item
            name="emergencyContactName"
                  label={<Text strong>Emergency Contact Name <Text type="danger">*</Text></Text>}
            rules={[{ required: true, message: 'Please enter emergency contact name' }]}
          >
                  <Input 
                    placeholder="Enter emergency contact full name"
                    style={{ height: '48px', borderRadius: '12px' }}
                  />
          </Form.Item>
          </Col>
          <Col span={12}>
          <Form.Item
            name="emergencyContact"
                  label={<Text strong>Emergency Contact Number <Text type="danger">*</Text></Text>}
              rules={[
                { required: true, message: 'Please enter emergency contact number' },
                { pattern: /^[0-9]{10}$/, message: 'Enter a valid 10-digit mobile number' },
              ]}
          >
              <Input
                placeholder="10-digit mobile number"
                maxLength={10}
                    style={{ height: '48px', borderRadius: '12px' }}
              />
          </Form.Item>
          </Col>
          <Col span={12}>
                <Form.Item name="emergencyRelation" label={<Text strong>Relationship</Text>}>
              <Select
                placeholder="Select relationship"
                allowClear
                    style={{ height: '48px', borderRadius: '12px' }}
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
                    label={<Text strong>Specify Relationship <Text type="danger">*</Text></Text>}
                rules={[{ required: true, message: 'Please specify the relationship' }]}
              >
                    <Input 
                      placeholder="Enter relationship"
                      style={{ height: '48px', borderRadius: '12px' }}
                    />
          </Form.Item>
            </Col>
          )}
          <Col span={12}>
                <Form.Item name="insuranceProvider" label={<Text strong>Insurance Provider</Text>}>
                  <Input 
                    placeholder="Enter insurance provider name (optional)"
                    style={{ height: '48px', borderRadius: '12px' }}
                  />
          </Form.Item>
          </Col>
          <Col span={12}>
                <Form.Item name="insuranceNumber" label={<Text strong>Insurance Number</Text>}>
                  <Input 
                    placeholder="Enter insurance number (optional)"
                    style={{ height: '48px', borderRadius: '12px' }}
                  />
          </Form.Item>
          </Col>
        </Row>
          </Form>
        </div>
      );
    }

    // Completion screen
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #1A8FE3 0%, #10B981 100%)',
          marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(26, 143, 227, 0.4)'
        }}>
          <CheckCircleFilled style={{ fontSize: '48px', color: '#FFFFFF' }} />
        </div>
        <Title level={2} style={{ margin: 0, marginBottom: '12px', fontSize: '36px', fontWeight: 700 }}>
          All Set! 🎉
        </Title>
        <Paragraph style={{ fontSize: '18px', color: '#8C8C8C', marginBottom: '32px' }}>
          Your patient profile has been created successfully
        </Paragraph>

        <Card
          style={{
            background: 'linear-gradient(135deg, #E6F7FF 0%, #B3E5FC 100%)',
            borderRadius: '16px',
            border: 'none',
            marginBottom: '24px'
          }}
          bodyStyle={{ padding: '32px' }}
        >
          <Title level={4} style={{ marginBottom: '24px', textAlign: 'left' }}>
            What you can do now:
          </Title>
          
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', textAlign: 'left' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
                <CalendarOutlined style={{ fontSize: '24px', color: '#1A8FE3' }} />
              </div>
              <div>
                <Title level={5} style={{ margin: 0, marginBottom: '4px' }}>Book Appointments</Title>
                <Text style={{ color: '#8C8C8C' }}>
                  Schedule visits with doctors and specialists at your convenience
                </Text>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', textAlign: 'left' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
                <HeartOutlined style={{ fontSize: '24px', color: '#FF4D4F' }} />
              </div>
              <div>
                <Title level={5} style={{ margin: 0, marginBottom: '4px' }}>Health Records</Title>
                <Text style={{ color: '#8C8C8C' }}>
                  Access your complete medical history anytime, anywhere
                </Text>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', textAlign: 'left' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
                <FileTextOutlined style={{ fontSize: '24px', color: '#722ED1' }} />
              </div>
              <div>
                <Title level={5} style={{ margin: 0, marginBottom: '4px' }}>Prescriptions & Reports</Title>
                <Text style={{ color: '#8C8C8C' }}>
                  View digital prescriptions and lab reports instantly
                </Text>
              </div>
            </div>
          </Space>
        </Card>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '800px' }}>
      <Card
          style={{
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            overflow: 'hidden'
          }}
          bodyStyle={{ padding: 0 }}
        >
          {/* Progress Header */}
          <div style={{
            background: 'linear-gradient(135deg, #FAFAFA 0%, #FFFFFF 100%)',
            padding: '32px',
            borderBottom: '1px solid #F0F0F0'
          }}>
            {currentStep < totalSteps && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={handlePrev}
                style={{
                  marginBottom: '24px',
                  padding: 0,
                  height: 'auto',
                  color: '#8C8C8C'
                }}
              >
                Back
              </Button>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <Text style={{ fontSize: '12px', fontWeight: 600, color: '#8C8C8C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Step {currentStep + 1} of {totalSteps}
                </Text>
                <Paragraph style={{ margin: '4px 0 0 0', color: '#595959' }}>
                  Complete your profile
                </Paragraph>
              </div>
              {currentStep < totalSteps && (
                <div style={{ textAlign: 'right' }}>
                  <Title level={2} style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #1A8FE3 0%, #10B981 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {getProgressPercentage()}%
                  </Title>
                  <Text style={{ fontSize: '12px', color: '#8C8C8C' }}>Completed</Text>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {currentStep < totalSteps && (
              <Progress
                percent={getProgressPercentage()}
                strokeColor={{
                  '0%': '#1A8FE3',
                  '100%': '#10B981',
                }}
                showInfo={false}
                style={{ marginBottom: '24px' }}
              />
            )}

            {/* Step Indicators */}
            {currentStep < totalSteps && (
              <Steps
                current={currentStep}
                items={stepItems.map((item, index) => ({
                  title: item.title,
                  description: item.description,
                  icon: index < currentStep ? (
                    <CheckCircleFilled style={{ color: '#10B981' }} />
                  ) : (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: index === currentStep 
                        ? 'linear-gradient(135deg, #1A8FE3 0%, #10B981 100%)'
                        : '#F0F0F0',
                      color: index === currentStep ? '#FFFFFF' : '#BFBFBF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}>
                      {index + 1}
                    </div>
                  ),
                }))}
              />
            )}
          </div>

          {/* Form Content */}
          <div style={{ padding: '32px' }}>
            {renderStepContent()}

            {/* Action Buttons */}
            {currentStep < totalSteps && (
              <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            {currentStep > 0 && (
                  <Button
                    size="large"
                    onClick={handlePrev}
                    style={{
                      height: '56px',
                      padding: '0 32px',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 600
                    }}
                  >
                    Previous
                  </Button>
            )}
                {currentStep < totalSteps - 1 && (
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleNext}
                    icon={<RightOutlined />}
                    iconPosition="end"
                    style={{
                      height: '56px',
                      padding: '0 32px',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #1A8FE3 0%, #10B981 100%)',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(26, 143, 227, 0.3)'
                    }}
                  >
                    Continue
              </Button>
            )}
                {currentStep === totalSteps - 1 && (
              <Button
                type="primary"
                    size="large"
                    onClick={handleComplete}
                loading={completeOnboardingMutation.isPending}
                    icon={<RightOutlined />}
                    iconPosition="end"
                    style={{
                      height: '56px',
                      padding: '0 32px',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #1A8FE3 0%, #10B981 100%)',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(26, 143, 227, 0.3)'
                    }}
              >
                Complete Profile
              </Button>
            )}
          </div>
            )}
          </div>
        </Card>
        </div>
    </div>
  );
}
