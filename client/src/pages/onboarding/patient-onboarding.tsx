import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Typography,
  message,
  Radio,
} from 'antd';
import { RightOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { apiRequest } from '../../lib/queryClient';
import { OnboardingStepsLayout } from '../../components/onboarding/OnboardingStepsLayout';
import { ChipSelectFormField } from '../../components/onboarding/ChipSelect';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const DRAFT_KEY = 'patient-onboarding-draft';

const ALLERGY_OPTIONS = [
  { label: 'None', value: 'None' },
  { label: 'Penicillin', value: 'Penicillin' },
  { label: 'Peanuts', value: 'Peanuts' },
  { label: 'Latex', value: 'Latex' },
  { label: 'Shellfish', value: 'Shellfish' },
  { label: 'Eggs', value: 'Eggs' },
  { label: 'Dairy', value: 'Dairy' },
  { label: 'Soy', value: 'Soy' },
  { label: 'Tree Nuts', value: 'Tree Nuts' },
  { label: 'Pollen', value: 'Pollen' },
  { label: 'Dust', value: 'Dust' },
];

const CHRONIC_CONDITION_OPTIONS = [
  { label: 'None', value: 'None' },
  { label: 'Diabetes', value: 'Diabetes' },
  { label: 'Hypertension', value: 'Hypertension' },
  { label: 'Asthma', value: 'Asthma' },
  { label: 'Heart Disease', value: 'Heart Disease' },
  { label: 'Thyroid', value: 'Thyroid' },
  { label: 'Arthritis', value: 'Arthritis' },
  { label: 'COPD', value: 'COPD' },
  { label: 'Kidney Disease', value: 'Kidney Disease' },
];

function computeBmi(heightCm: number, weightKg: number): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentYear = dayjs().year();

function DateOfBirthInput({ value, onChange }: { value: Dayjs | null; onChange: (d: Dayjs | null) => void }) {
  const [month, setMonth] = useState<number>(value ? value.month() + 1 : 0);
  const [day, setDay] = useState<number>(value ? value.date() : 0);
  const [year, setYear] = useState<number>(value ? value.year() : 0);

  useEffect(() => {
    if (value) {
      setMonth(value.month() + 1);
      setDay(value.date());
      setYear(value.year());
    } else {
      setMonth(0);
      setDay(0);
      setYear(0);
    }
  }, [value?.valueOf()]);

  const notify = (m: number, d: number, y: number) => {
    if (m && d && y && y >= 1900 && y <= currentYear) {
      const dObj = dayjs(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      if (dObj.isValid() && dObj.date() === d && !dObj.isAfter(dayjs().endOf('day'))) onChange(dObj);
      else onChange(null);
    } else onChange(null);
  };

  return (
    <Row gutter={8}>
      <Col span={8}>
        <Select
          placeholder="Month"
          value={month || undefined}
          onChange={(m) => { setMonth(m); notify(m, day, year); }}
          style={{ width: '100%', borderRadius: 12, height: 48 }}
          options={MONTHS.map((name, i) => ({ label: name, value: i + 1 }))}
        />
      </Col>
      <Col span={8}>
        <Input
          type="number"
          placeholder="Day"
          min={1}
          max={31}
          value={day || ''}
          onChange={(e) => { const v = parseInt(e.target.value, 10) || 0; setDay(v); notify(month, v, year); }}
          style={{ borderRadius: 12, height: 48 }}
        />
      </Col>
      <Col span={8}>
        <Input
          type="number"
          placeholder="Year"
          min={1900}
          max={currentYear}
          value={year || ''}
          onChange={(e) => { const v = parseInt(e.target.value, 10) || 0; setYear(v); notify(month, day, v); }}
          style={{ borderRadius: 12, height: 48 }}
        />
      </Col>
    </Row>
  );
}

const PATIENT_STEPS = [
  { title: 'Personal Information' },
  { title: 'Medical History' },
  { title: 'Emergency & Insurance' },
];

const STEP_TITLES = ['Personal Information', 'Medical History', 'Emergency & Insurance'];
const STEP_NOTES = [
  "Let's get to know you better",
  'Help us provide better care',
  'Complete your contact and insurance information',
];

const fieldStyle = { height: 48, borderRadius: 12 };

interface PatientFormValues {
  dateOfBirth: Dayjs | null;
  gender: string;
  bloodGroup: string;
  height: number;
  weight: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  occupation?: string;
  maritalStatus?: string;
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

  const userRole = localStorage.getItem('userRole') || 'patient';
  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboarding-status', userRole],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/onboarding/patient/status');
      return res.json();
    },
    enabled: true,
  });
  const userMobile = onboardingStatus?.user?.mobileNumber ?? '';

  const height = Form.useWatch('height', form);
  const weight = Form.useWatch('weight', form);
  const formValues = Form.useWatch(undefined, form);
  const bmi = height && weight ? computeBmi(Number(height), Number(weight)) : null;

  const saveDraft = useCallback(() => {
    try {
      const values = form.getFieldsValue(true);
      const payload = {
        step: currentStep,
        values: {
          ...values,
          dateOfBirth: values.dateOfBirth ? (values.dateOfBirth?.toISOString?.() ?? values.dateOfBirth) : null,
        },
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [form, currentStep]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft?.step != null && typeof draft.step === 'number') setCurrentStep(Math.min(Math.max(0, draft.step), 2));
      if (draft?.values && typeof draft.values === 'object') {
        const v = { ...draft.values };
        if (v.dateOfBirth) v.dateOfBirth = dayjs(v.dateOfBirth);
        form.setFieldsValue(v);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(saveDraft, 800);
    return () => clearTimeout(t);
  }, [currentStep, formValues, saveDraft]);

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/onboarding/patient/complete', data);
      return res.json();
    },
    onSuccess: async () => {
      localStorage.removeItem(DRAFT_KEY);
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', userRole] });
      localStorage.setItem('onboarding-just-completed', 'true');
      message.success('Profile completed successfully! Welcome to NexaCare!');
      setTimeout(() => {
        setLocation('/dashboard/patient');
      }, 500);
    },
    onError: (error: any) => {
      message.error(error?.message || 'Failed to complete profile');
    },
  });

  const handleNext = async () => {
    try {
      const stepFields: Record<number, (keyof PatientFormValues)[]> = {
        0: ['dateOfBirth', 'gender', 'bloodGroup', 'height', 'weight'],
        1: [],
        2: ['emergencyContactName', 'emergencyContact'],
      };
      const fieldsToValidate = stepFields[currentStep] || [];
      if (fieldsToValidate.length > 0) await form.validateFields(fieldsToValidate);
      setCurrentStep(currentStep + 1);
      saveDraft();
    } catch (e) {
      // validation failed
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      saveDraft();
    }
  };

  const handleComplete = async () => {
    if (completeOnboardingMutation.isPending) return;
    try {
      await form.validateFields(['dateOfBirth', 'gender', 'bloodGroup', 'height', 'weight', 'emergencyContactName', 'emergencyContact']);
      const allValues = form.getFieldsValue(true);
      let dateOfBirthFormatted = null;
      if (allValues.dateOfBirth) {
        dateOfBirthFormatted = allValues.dateOfBirth?.format?.('YYYY-MM-DD') ?? (typeof allValues.dateOfBirth === 'string' ? allValues.dateOfBirth : allValues.dateOfBirth?.toString?.());
      }
      let emergencyRelation = allValues.emergencyRelation;
      if (emergencyRelation === 'Other' && allValues.emergencyRelationOther) emergencyRelation = allValues.emergencyRelationOther;
      const transformedValues = { ...allValues, dateOfBirth: dateOfBirthFormatted, emergencyRelation: emergencyRelation || null } as any;
      delete transformedValues.emergencyRelationOther;
      completeOnboardingMutation.mutate(transformedValues);
    } catch (err: any) {
      if (err?.errorFields?.length) {
        message.error(err.errorFields[0]?.errors?.[0] || 'Please fill required fields');
      } else message.error('Please fill in all required fields');
    }
  };

  const handleBack = () => {
    if (currentStep === 0) setLocation('/dashboard/patient');
    else setCurrentStep(currentStep - 1);
  };

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <Form form={form} layout="vertical" preserve={true}>
          <Row gutter={[16, 8]}>
            <Col span={24}>
              <Form.Item name="dateOfBirth" label={<Text strong>Date of Birth <Text type="danger">*</Text></Text>} rules={[{ required: true, message: 'Please enter your date of birth' }]}>
                <DateOfBirthInput />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="gender" label={<Text strong>Gender <Text type="danger">*</Text></Text>} rules={[{ required: true, message: 'Please select your gender' }]}>
                <Radio.Group optionType="button" buttonStyle="solid" style={{ width: '100%', display: 'flex', gap: 8 }} size="large">
                  <Radio.Button value="Male" style={{ flex: 1, height: 48, lineHeight: '46px', textAlign: 'center', borderRadius: 12 }}>Male</Radio.Button>
                  <Radio.Button value="Female" style={{ flex: 1, height: 48, lineHeight: '46px', textAlign: 'center', borderRadius: 12 }}>Female</Radio.Button>
                  <Radio.Button value="Other" style={{ flex: 1, height: 48, lineHeight: '46px', textAlign: 'center', borderRadius: 12 }}>Other</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bloodGroup" label={<Text strong>Blood Group <Text type="danger">*</Text></Text>} rules={[{ required: true, message: 'Please select blood group' }]}>
                <Select placeholder="Select blood group" style={fieldStyle}>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => <Option key={g} value={g}>{g}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="height" label={<Text strong>Height (cm) <Text type="danger">*</Text></Text>} rules={[{ required: true, message: 'Please enter height' }]}>
                <Input type="number" placeholder="Height in cm" style={fieldStyle} min={0} max={300} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="weight" label={<Text strong>Weight (kg) <Text type="danger">*</Text></Text>} rules={[{ required: true, message: 'Please enter weight' }]}>
                <Input type="number" placeholder="Weight in kg" style={fieldStyle} min={0} max={500} />
              </Form.Item>
            </Col>
            {bmi != null && (
              <Col span={24}>
                <div style={{ padding: '12px 16px', background: '#F0FDF4', borderRadius: 12, border: '1px solid #BBF7D0' }}>
                  <Text strong>BMI: {bmi}</Text>
                  <Text style={{ marginLeft: 8, color: '#059669' }}>({bmiCategory(bmi)})</Text>
                </div>
              </Col>
            )}
            <Col span={24}>
              <Form.Item name="address" label={<Text strong>Address</Text>}>
                <Input placeholder="Street, area, landmark" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city" label={<Text strong>City</Text>}>
                <Input placeholder="City" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="state" label={<Text strong>State</Text>}>
                <Input placeholder="State" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="zipCode" label={<Text strong>Zip Code</Text>}>
                <Input placeholder="Zip / PIN" style={fieldStyle} maxLength={10} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="occupation" label={<Text strong>Occupation</Text>}>
                <Input placeholder="Occupation (optional)" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maritalStatus" label={<Text strong>Marital Status</Text>}>
                <Select placeholder="Select (optional)" style={fieldStyle} allowClear>
                  {['Single', 'Married', 'Divorced', 'Widowed', 'Other'].map((s) => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="governmentIdType" label={<Text strong>Government ID Type</Text>}>
                <Select placeholder="Select ID type (optional)" style={fieldStyle} allowClear>
                  <Option value="aadhaar">Aadhaar Card</Option>
                  <Option value="pan">PAN Card</Option>
                  <Option value="driving_license">Driving License</Option>
                  <Option value="passport">Passport</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="governmentIdNumber" label={<Text strong>Government ID Number</Text>}>
                <Input placeholder="Enter ID number (optional)" style={fieldStyle} maxLength={50} />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <Button size="large" onClick={handleBack} style={{ borderRadius: 12 }}>Back</Button>
            <Button type="primary" size="large" onClick={handleNext} icon={<RightOutlined />} iconPosition="end" style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Continue</Button>
          </div>
        </Form>
      );
    }

    if (currentStep === 1) {
      return (
        <Form form={form} layout="vertical" preserve={true}>
          <Row gutter={[16, 8]}>
            <Col span={24}>
              <Form.Item name="allergies" label={<Text strong>Known Allergies (optional)</Text>}>
                <ChipSelectFormField options={ALLERGY_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="chronicConditions" label={<Text strong>Chronic Conditions (optional)</Text>}>
                <ChipSelectFormField options={CHRONIC_CONDITION_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="currentMedications" label={<Text strong>Current Medications</Text>}>
                <TextArea rows={3} placeholder="List any medications you're currently taking" style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="medicalHistory" label={<Text strong>Medical History</Text>}>
                <TextArea rows={4} placeholder="Past surgeries, significant health events" style={{ borderRadius: 12 }} />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <Button size="large" onClick={handlePrev} style={{ borderRadius: 12 }}>Previous</Button>
            <Button type="primary" size="large" onClick={handleNext} icon={<RightOutlined />} iconPosition="end" style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Continue</Button>
          </div>
        </Form>
      );
    }

    if (currentStep === 2) {
      return (
        <Form form={form} layout="vertical" preserve={true} onValuesChange={(changed) => { if (changed.emergencyRelation !== undefined) form.setFieldsValue({ emergencyRelationOther: undefined }); }}>
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Form.Item name="emergencyContactName" label={<Text strong>Emergency Contact Name <Text type="danger">*</Text></Text>} rules={[{ required: true, message: 'Please enter emergency contact name' }]}>
                <Input placeholder="Emergency contact full name" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
              name="emergencyContact"
              label={<Text strong>Emergency Contact Number <Text type="danger">*</Text></Text>}
              rules={[
                { required: true, message: 'Required' },
                { pattern: /^[0-9]{10}$/, message: 'Valid 10-digit number' },
                {
                  validator: (_, value) => {
                    if (!value || !userMobile) return Promise.resolve();
                    const normalize = (s: string) => String(s).replace(/\D/g, '').slice(-10);
                    if (normalize(value) === normalize(userMobile)) {
                      return Promise.reject(new Error("Must be different from your registered mobile number"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder="10-digit mobile number (different from yours)" maxLength={10} style={fieldStyle} />
            </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="emergencyRelation" label={<Text strong>Relationship</Text>}>
                <Select placeholder="Select relationship" allowClear style={fieldStyle}>
                  {['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Relative', 'Guardian', 'Colleague', 'Other'].map((r) => <Option key={r} value={r}>{r}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            {form.getFieldValue('emergencyRelation') === 'Other' && (
              <Col span={8}>
                <Form.Item name="emergencyRelationOther" label={<Text strong>Specify Relationship <Text type="danger">*</Text></Text>} rules={[{ required: true, message: 'Please specify' }]}>
                  <Input placeholder="Enter relationship" style={fieldStyle} />
                </Form.Item>
              </Col>
            )}
            <Col span={12}>
              <Form.Item name="insuranceProvider" label={<Text strong>Insurance Provider</Text>}>
                <Input placeholder="Insurance provider (optional)" style={fieldStyle} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="insuranceNumber" label={<Text strong>Insurance Number</Text>}>
                <Input placeholder="Insurance number (optional)" style={fieldStyle} />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <Button size="large" onClick={handlePrev} style={{ borderRadius: 12 }}>Previous</Button>
            <Button type="primary" size="large" loading={completeOnboardingMutation.isPending} onClick={handleComplete} icon={<RightOutlined />} iconPosition="end" style={{ borderRadius: 12, background: '#059669', borderColor: '#059669' }}>Complete Profile</Button>
          </div>
        </Form>
      );
    }

    return null;
  };

  return (
    <OnboardingStepsLayout
      steps={PATIENT_STEPS}
      currentStepIndex={currentStep}
      stepTitle={STEP_TITLES[currentStep]}
      stepNote={STEP_NOTES[currentStep]}
      onBack={handleBack}
      showHelpLink={true}
    >
      {renderStepContent()}
    </OnboardingStepsLayout>
  );
}
