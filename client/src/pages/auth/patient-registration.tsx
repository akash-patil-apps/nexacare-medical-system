import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  DatePicker, 
  Space, 
  Typography, 
  Row, 
  Col,
  App,
  Divider
} from 'antd';
import { 
  UserOutlined, 
  ArrowLeftOutlined,
  PhoneOutlined,
  MailOutlined,
  HeartOutlined
} from '@ant-design/icons';
import { apiRequest } from "../../lib/queryClient";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function PatientRegistration() {
  const { message } = App.useApp();
  const [, setLocation] = useLocation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const registrationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/patients/register', data);
    },
    onSuccess: () => {
      message.success('Registration successful! Please check your phone for OTP verification.');
      setLocation('/auth/otp-verification');
    },
    onError: (error: any) => {
      message.error(error.message || 'Registration failed. Please try again.');
    },
  });

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await registrationMutation.mutateAsync({
        ...values,
        dateOfBirth: values.dateOfBirth?.format('YYYY-MM-DD'),
        role: 'patient'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: '500px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <UserOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={2} style={{ margin: '0 0 8px 0', color: '#1890ff' }}>
            Patient Registration
          </Title>
          <Text type="secondary">
            Create your patient account to access medical services
          </Text>
          </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: 'Please enter your first name' }]}
              >
                <Input placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true, message: 'Please enter your last name' }]}
              >
                <Input placeholder="Enter last name" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[
              { required: true, message: 'Please enter your phone number' },
              { pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit phone number' }
            ]}
          >
                <Input
              prefix={<PhoneOutlined />}
              placeholder="Enter 10-digit phone number" 
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email (optional)"
            rules={[{ type: 'email', message: 'Please enter a valid email' }]}
          >
                <Input
              prefix={<MailOutlined />}
              placeholder="Optional" 
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dateOfBirth"
                label="Date of Birth"
                rules={[{ required: true, message: 'Please select your date of birth' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  placeholder="Select date of birth"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="gender"
                label="Gender"
                rules={[{ required: true, message: 'Please select gender' }]}
              >
                <Select placeholder="Select gender">
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="bloodGroup"
            label="Blood Group"
            rules={[{ required: true, message: 'Please select blood group' }]}
          >
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

          <Form.Item
            name="medicalHistory"
            label="Medical History"
          >
            <TextArea 
                  rows={3}
              placeholder="Any existing medical conditions or history"
            />
          </Form.Item>

          <Form.Item
            name="allergies"
            label="Allergies"
          >
            <TextArea 
                  rows={2}
              placeholder="Any known allergies"
            />
          </Form.Item>

          <Form.Item
            name="emergencyContact"
            label="Emergency Contact"
            rules={[{ required: true, message: 'Please enter emergency contact number' }]}
          >
                  <Input
              prefix={<PhoneOutlined />}
              placeholder="Emergency contact number" 
            />
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button 
                icon={<ArrowLeftOutlined />}
                onClick={() => setLocation('/auth/register')}
              >
                Back
              </Button>
            <Button
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<HeartOutlined />}
                style={{ minWidth: '120px' }}
              >
                Register
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text type="secondary">
            Already have an account?{' '}
            <Button type="link" onClick={() => setLocation('/auth/login')}>
              Sign In
            </Button>
          </Text>
        </div>
      </Card>
    </div>
  );
}