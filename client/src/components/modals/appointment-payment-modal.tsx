import React, { useState } from 'react';
import {
  Modal,
  Form,
  Radio,
  Button,
  Space,
  message,
  Typography,
  Divider,
  Card,
  Input,
  Spin,
} from 'antd';
import {
  CreditCardOutlined,
  MobileOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface AppointmentPaymentModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (paymentMethod: 'online' | 'counter', paymentDetails?: any) => void;
  amount: number;
  appointmentId?: number;
}

export default function AppointmentPaymentModal({
  open,
  onCancel,
  onSuccess,
  amount,
  appointmentId,
}: AppointmentPaymentModalProps) {
  const [form] = Form.useForm();
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'counter' | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'processing' | 'success'>('select');

  const handlePaymentMethodChange = (e: any) => {
    setPaymentMethod(e.target.value);
  };

  const handlePayOnline = async () => {
    if (!paymentMethod || paymentMethod !== 'online') {
      message.error('Please select a payment method');
      return;
    }

    setProcessingPayment(true);
    setPaymentStep('processing');

    // Simulate payment processing (demo)
    setTimeout(() => {
      // Generate demo payment details
      const paymentDetails = {
        method: 'online',
        transactionId: `TXN${Date.now()}`,
        paymentMethod: Math.random() > 0.5 ? 'card' : 'upi',
        amount: amount,
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      setPaymentStep('success');
      
      setTimeout(() => {
        onSuccess('online', paymentDetails);
        handleClose();
      }, 1500);
    }, 2000); // Simulate 2 second payment processing
  };

  const handlePayAtCounter = () => {
    onSuccess('counter');
    handleClose();
  };

  const handleClose = () => {
    form.resetFields();
    setPaymentMethod(null);
    setProcessingPayment(false);
    setPaymentStep('select');
    onCancel();
  };

  return (
    <Modal
      title="Payment"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={500}
      closable={!processingPayment}
      maskClosable={!processingPayment}
    >
      {paymentStep === 'select' && (
        <div>
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <Title level={4} style={{ marginBottom: 8 }}>
              Consultation Fee
            </Title>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff' }}>
              ₹{amount.toFixed(2)}
            </Text>
          </div>

          <Divider />

          <Form form={form} layout="vertical">
            <Form.Item
              name="paymentOption"
              rules={[{ required: true, message: 'Please select a payment option' }]}
            >
              <Radio.Group onChange={handlePaymentMethodChange} style={{ width: '100%' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Radio value="online" style={{ width: '100%' }}>
                    <Card
                      hoverable
                      style={{
                        marginLeft: 8,
                        border: paymentMethod === 'online' ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      }}
                    >
                      <Space>
                        <CreditCardOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                        <div>
                          <Text strong>Pay Online</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Pay now using Card or UPI
                          </Text>
                        </div>
                      </Space>
                    </Card>
                  </Radio>

                  <Radio value="counter" style={{ width: '100%' }}>
                    <Card
                      hoverable
                      style={{
                        marginLeft: 8,
                        border: paymentMethod === 'counter' ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      }}
                    >
                      <Space>
                        <MobileOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                        <div>
                          <Text strong>Pay at Counter</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Pay when you arrive at the hospital
                          </Text>
                        </div>
                      </Space>
                    </Card>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            {paymentMethod === 'online' && (
              <div style={{ marginTop: 16, padding: 16, background: '#f0f9ff', borderRadius: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  You will be redirected to a secure payment gateway. Demo payment will be processed automatically.
                </Text>
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleClose}>Cancel</Button>
              <Space>
                {paymentMethod === 'online' && (
                  <Button type="primary" onClick={handlePayOnline} loading={processingPayment}>
                    Pay Now
                  </Button>
                )}
                {paymentMethod === 'counter' && (
                  <Button type="primary" onClick={handlePayAtCounter}>
                    Confirm & Book
                  </Button>
                )}
              </Space>
            </div>
          </Form>
        </div>
      )}

      {paymentStep === 'processing' && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} />
          <div style={{ marginTop: 24 }}>
            <Title level={4}>Processing Payment...</Title>
            <Text type="secondary">Please wait while we process your payment</Text>
          </div>
        </div>
      )}

      {paymentStep === 'success' && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
          <Title level={4} style={{ color: '#52c41a' }}>
            Payment Successful!
          </Title>
          <Text type="secondary">Your appointment has been confirmed</Text>
        </div>
      )}
    </Modal>
  );
}





