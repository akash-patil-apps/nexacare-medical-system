import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Button, message, Row, Col, Space } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { apiRequest } from '../../lib/queryClient';

const { Option } = Select;
const { TextArea } = Input;

const RELATIONSHIPS = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'other', label: 'Other' },
];

const EMERGENCY_RELATIONS = [
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Child', label: 'Child' },
  { value: 'Sibling', label: 'Sibling' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Father', label: 'Father' },
  { value: 'Friend', label: 'Friend' },
  { value: 'Relative', label: 'Relative' },
  { value: 'Guardian', label: 'Guardian' },
  { value: 'Other', label: 'Other' },
];

const RELATION_TO_GENDER: Record<string, string> = {
  mother: 'female',
  father: 'male',
  brother: 'male',
  sister: 'female',
  son: 'male',
  daughter: 'female',
  spouse: '',
  other: '',
};

interface AddFamilyMemberModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddFamilyMemberModal({ open, onClose, onSuccess }: AddFamilyMemberModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sendingMobileOtp, setSendingMobileOtp] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingMobileOtp, setVerifyingMobileOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileOtpVerified, setMobileOtpVerified] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [mobileOtp, setMobileOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');

  useEffect(() => {
    if (!open) {
      setMobileOtpSent(false);
      setEmailOtpSent(false);
      setMobileOtpVerified(false);
      setEmailOtpVerified(false);
      setMobileOtp('');
      setEmailOtp('');
      form.resetFields();
    }
  }, [open, form]);

  const handleRelationshipChange = (value: string) => {
    const gender = RELATION_TO_GENDER[value] || undefined;
    form.setFieldsValue({ gender: gender || undefined });
  };

  const handleSendMobileOtp = async () => {
    try {
      const mobileNumber = form.getFieldValue('mobileNumber');
      if (!mobileNumber || mobileNumber.length !== 10) {
        message.error('Please enter a valid 10-digit mobile number');
        return;
      }
      setSendingMobileOtp(true);
      await apiRequest('POST', '/api/auth/otp/send', { mobileNumber, role: 'PATIENT' });
      setMobileOtpSent(true);
      message.success('OTP sent to mobile number');
    } catch (err: any) {
      message.error(err?.message || 'Failed to send OTP');
    } finally {
      setSendingMobileOtp(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    try {
      if (!mobileOtp || mobileOtp.length !== 6) {
        message.error('Please enter a valid 6-digit OTP');
        return;
      }
      const mobileNumber = form.getFieldValue('mobileNumber');
      setVerifyingMobileOtp(true);
      await apiRequest('POST', '/api/auth/otp/verify', { mobileNumber, otp: mobileOtp });
      setMobileOtpVerified(true);
      message.success('Mobile number verified');
    } catch (err: any) {
      message.error(err?.message || 'Invalid OTP');
    } finally {
      setVerifyingMobileOtp(false);
    }
  };

  const handleSendEmailOtp = async () => {
    try {
      const email = form.getFieldValue('email');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        message.error('Please enter a valid email address');
        return;
      }
      setSendingEmailOtp(true);
      // Note: Email OTP endpoint might need to be created or use same endpoint with email param
      await apiRequest('POST', '/api/auth/otp/send', { mobileNumber: email, role: 'PATIENT' });
      setEmailOtpSent(true);
      message.success('OTP sent to email');
    } catch (err: any) {
      message.error(err?.message || 'Failed to send OTP');
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    try {
      if (!emailOtp || emailOtp.length !== 6) {
        message.error('Please enter a valid 6-digit OTP');
        return;
      }
      const email = form.getFieldValue('email');
      setVerifyingEmailOtp(true);
      await apiRequest('POST', '/api/auth/otp/verify', { mobileNumber: email, otp: emailOtp });
      setEmailOtpVerified(true);
      message.success('Email verified');
    } catch (err: any) {
      message.error(err?.message || 'Invalid OTP');
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      if (!mobileOtpVerified) {
        message.error('Please verify mobile number first');
        return;
      }
      const email = form.getFieldValue('email');
      if (email && !emailOtpVerified) {
        message.error('Please verify email if provided');
        return;
      }
      const values = await form.validateFields(['relationship', 'mobileNumber', 'fullName', 'password']);
      setLoading(true);
      const allValues = form.getFieldsValue(true);
      const payload = {
        relationship: allValues.relationship,
        mobileNumber: allValues.mobileNumber,
        otp: mobileOtp,
        fullName: allValues.fullName,
        email: allValues.email || undefined,
        password: allValues.password,
        dateOfBirth: allValues.dateOfBirth ? (allValues.dateOfBirth as Dayjs).toISOString?.() ?? String(allValues.dateOfBirth) : null,
        gender: allValues.gender || null,
        bloodGroup: allValues.bloodGroup || null,
        address: allValues.address || null,
        city: allValues.city || null,
        state: allValues.state || null,
        zipCode: allValues.zipCode || null,
        emergencyContactName: allValues.emergencyContactName || null,
        emergencyContact: allValues.emergencyContact || null,
        emergencyRelation: allValues.emergencyRelation || null,
        medicalHistory: allValues.medicalHistory || null,
        allergies: allValues.allergies || null,
        currentMedications: allValues.currentMedications || null,
        chronicConditions: allValues.chronicConditions || null,
      };
      await apiRequest('POST', '/api/patients/family-members', payload);
      message.success('Family member added successfully');
      form.resetFields();
      setMobileOtpSent(false);
      setEmailOtpSent(false);
      setMobileOtpVerified(false);
      setEmailOtpVerified(false);
      setMobileOtp('');
      setEmailOtp('');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || 'Failed to add family member';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderStep0 = () => (
    <Form form={form} layout="vertical" preserve={false} style={{ marginBottom: 0 }}>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="relationship" label="Relationship" rules={[{ required: true }]}>
            <Select placeholder="Select" size="middle" onChange={handleRelationshipChange}>
              {RELATIONSHIPS.map((r) => (
                <Option key={r.value} value={r.value}>{r.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="mobileNumber" label="Mobile" rules={[{ required: true, len: 10, message: '10-digit mobile' }]}>
            <Space.Compact style={{ width: '100%' }}>
              <Input 
                placeholder="10-digit" 
                size="middle" 
                maxLength={10}
                disabled={mobileOtpVerified}
                style={{ flex: 1 }}
              />
              {!mobileOtpVerified && (
                <Button 
                  onClick={handleSendMobileOtp} 
                  loading={sendingMobileOtp}
                  disabled={mobileOtpSent}
                  size="middle"
                >
                  {mobileOtpSent ? 'Sent' : 'Verify'}
                </Button>
              )}
            </Space.Compact>
          </Form.Item>
          {mobileOtpSent && !mobileOtpVerified && (
            <Form.Item label="Enter OTP">
              <Space.Compact style={{ width: '100%' }}>
                <Input 
                  placeholder="000000" 
                  size="middle" 
                  maxLength={6}
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                  style={{ textAlign: 'center', letterSpacing: 4 }}
                />
                <Button 
                  onClick={handleVerifyMobileOtp} 
                  loading={verifyingMobileOtp}
                  type="primary"
                  size="middle"
                >
                  Verify
                </Button>
              </Space.Compact>
            </Form.Item>
          )}
          {mobileOtpVerified && (
            <div style={{ color: '#10B981', fontSize: 12, marginTop: -8, marginBottom: 8 }}>
              ✓ Mobile verified
            </div>
          )}
        </Col>
        <Col span={12}>
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
            <Input placeholder="Full name" size="middle" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="email" label="Email (optional)">
            <Space.Compact style={{ width: '100%' }}>
              <Input 
                placeholder="Optional" 
                size="middle" 
                type="email"
                disabled={emailOtpVerified}
                style={{ flex: 1 }}
              />
              {form.getFieldValue('email') && !emailOtpVerified && (
                <Button 
                  onClick={handleSendEmailOtp} 
                  loading={sendingEmailOtp}
                  disabled={emailOtpSent}
                  size="middle"
                >
                  {emailOtpSent ? 'Sent' : 'Verify'}
                </Button>
              )}
            </Space.Compact>
          </Form.Item>
          {emailOtpSent && !emailOtpVerified && form.getFieldValue('email') && (
            <Form.Item label="Enter Email OTP">
              <Space.Compact style={{ width: '100%' }}>
                <Input 
                  placeholder="000000" 
                  size="middle" 
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                  style={{ textAlign: 'center', letterSpacing: 4 }}
                />
                <Button 
                  onClick={handleVerifyEmailOtp} 
                  loading={verifyingEmailOtp}
                  type="primary"
                  size="middle"
                >
                  Verify
                </Button>
              </Space.Compact>
            </Form.Item>
          )}
          {emailOtpVerified && form.getFieldValue('email') && (
            <div style={{ color: '#10B981', fontSize: 12, marginTop: -8, marginBottom: 8 }}>
              ✓ Email verified
            </div>
          )}
        </Col>
        <Col span={12}>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="Min 6 chars" size="middle" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="dateOfBirth" label="Date of Birth">
            <DatePicker style={{ width: '100%' }} size="middle" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="gender" label="Gender">
            <Select placeholder="Pre-filled from relation" size="middle" allowClear>
              <Option value="male">Male</Option>
              <Option value="female">Female</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="bloodGroup" label="Blood Group">
            <Select placeholder="Optional" size="middle" allowClear>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                <Option key={g} value={g}>{g}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="address" label="Address">
            <Input placeholder="Optional" size="middle" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="emergencyContactName" label="Emergency Name">
            <Input placeholder="Optional" size="middle" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="emergencyContact" label="Emergency Number">
            <Input placeholder="Optional" size="middle" maxLength={15} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="emergencyRelation" label="Emergency Relation">
            <Select placeholder="Select relation" size="middle" allowClear>
              {EMERGENCY_RELATIONS.map((r) => (
                <Option key={r.value} value={r.value}>{r.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="medicalHistory" label="Medical History">
            <TextArea rows={1} placeholder="Optional" size="middle" />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="allergies" label="Allergies">
            <Input placeholder="Optional" size="middle" />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );

  return (
    <Modal
      title="Add Family Member"
      open={open}
      onCancel={() => { 
        form.resetFields();
        setMobileOtpSent(false);
        setEmailOtpSent(false);
        setMobileOtpVerified(false);
        setEmailOtpVerified(false);
        setMobileOtp('');
        setEmailOtp('');
        onClose(); 
      }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button 
          key="create" 
          type="primary" 
          onClick={handleCreateAccount} 
          loading={loading}
          disabled={!mobileOtpVerified || (form.getFieldValue('email') && !emailOtpVerified)}
        >
          Create Account
        </Button>,
      ]}
      width={560}
      destroyOnClose
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto', paddingTop: 8 },
      }}
    >
      {renderStep0()}
    </Modal>
  );
}
