import { useLocation } from 'wouter';
import { Card, Button, Space, Typography, Result, Alert } from 'antd';
import { CloseCircleOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function PaymentFailure() {
  const [location, setLocation] = useLocation();

  // Get query params
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const orderId = searchParams.get('orderId');
  const invoiceId = searchParams.get('invoiceId');
  const error = searchParams.get('error');

  return (
    <div style={{ padding: '40px 20px', maxWidth: 600, margin: '0 auto' }}>
      <Result
        status="error"
        icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
        title="Payment Failed"
        subTitle={
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text>Your payment could not be processed.</Text>
            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
            {orderId && <Text type="secondary">Order ID: {orderId}</Text>}
          </Space>
        }
        extra={[
          invoiceId && (
            <Button
              type="primary"
              key="retry"
              icon={<ReloadOutlined />}
              onClick={() => setLocation(`/payment/checkout?invoiceId=${invoiceId}`)}
            >
              Try Again
            </Button>
          ),
          <Button
            key="dashboard"
            icon={<HomeOutlined />}
            onClick={() => setLocation('/dashboard/patient')}
          >
            Go to Dashboard
          </Button>,
        ].filter(Boolean)}
      />
    </div>
  );
}
