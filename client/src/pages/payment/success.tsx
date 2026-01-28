import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, Button, Space, Typography, Result } from 'antd';
import { CheckCircleOutlined, HomeOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function PaymentSuccess() {
  const [location, setLocation] = useLocation();

  // Get query params
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const orderId = searchParams.get('orderId');
  const paymentId = searchParams.get('paymentId');
  const invoiceId = searchParams.get('invoiceId');

  return (
    <div style={{ padding: '40px 20px', maxWidth: 600, margin: '0 auto' }}>
      <Result
        status="success"
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        title="Payment Successful!"
        subTitle={
          <Space direction="vertical" size="small">
            <Text>Your payment has been processed successfully.</Text>
            {orderId && <Text type="secondary">Order ID: {orderId}</Text>}
            {paymentId && <Text type="secondary">Payment ID: {paymentId}</Text>}
          </Space>
        }
        extra={[
          <Button
            type="primary"
            key="dashboard"
            icon={<HomeOutlined />}
            onClick={() => setLocation('/dashboard/patient')}
          >
            Go to Dashboard
          </Button>,
          invoiceId && (
            <Button
              key="invoice"
              icon={<FileTextOutlined />}
              onClick={() => setLocation(`/dashboard/patient?viewInvoice=${invoiceId}`)}
            >
              View Invoice
            </Button>
          ),
        ].filter(Boolean)}
      />
    </div>
  );
}
