import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Card,
  Button,
  Space,
  Typography,
  Spin,
  message,
  Descriptions,
  Divider,
  Alert,
  Tag,
} from 'antd';
import {
  DollarOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';

const { Title, Text } = Typography;

export default function PaymentCheckout() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Get invoiceId from URL query params
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const invoiceId = searchParams.get('invoiceId');

  // Fetch invoice details
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ['/api/billing/opd/invoices', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/billing/opd/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch invoice');
      return response.json();
    },
    enabled: !!invoiceId,
  });

  // Create payment order
  const { data: orderData, isLoading: orderLoading, refetch: createOrder } = useQuery({
    queryKey: ['/api/payments/create-order', invoiceId],
    queryFn: async () => {
      if (!invoiceId || !invoice) return null;
      const token = localStorage.getItem('auth-token');
      const balance = parseFloat(invoice.balanceAmount || '0');
      
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: +invoiceId,
          amount: balance,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment order');
      }

      const data = await response.json();
      setOrderId(data.order.id);
      return data;
    },
    enabled: false, // Don't auto-fetch, wait for user to click "Pay Now"
  });

  const handlePayNow = async () => {
    if (!invoice) {
      message.error('Invoice not found');
      return;
    }

    const balance = parseFloat(invoice.balanceAmount || '0');
    if (balance <= 0) {
      message.warning('Invoice is already paid');
      return;
    }

    setIsProcessing(true);
    try {
      await createOrder();
      message.success('Payment order created');
    } catch (error: any) {
      console.error('Payment order creation error:', error);
      message.error(error.message || 'Failed to create payment order');
      setIsProcessing(false);
    }
  };

  const handleMockPayment = async () => {
    if (!orderId || !invoiceId) {
      message.error('Payment order not found');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth-token');
      
      // Simulate payment success
      const simulateResponse = await fetch('/api/payments/simulate-success', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      if (!simulateResponse.ok) {
        throw new Error('Failed to simulate payment');
      }

      const simulateData = await simulateResponse.json();

      // Verify payment
      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          paymentId: simulateData.payment.payment_id,
          signature: 'mock_signature',
          invoiceId,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Payment verification failed');
      }

      message.success('Payment successful!');
      queryClient.invalidateQueries({ queryKey: ['/api/billing/opd/invoices'] });
      
      // Redirect to success page
      setLocation(`/payment/success?orderId=${orderId}&paymentId=${simulateData.payment.payment_id}&invoiceId=${invoiceId}`);
    } catch (error: any) {
      console.error('Payment processing error:', error);
      message.error(error.message || 'Payment processing failed');
      setLocation(`/payment/failure?orderId=${orderId}&invoiceId=${invoiceId}&error=${encodeURIComponent(error.message || 'Payment failed')}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!invoiceId) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <Alert
          message="Invalid Payment Link"
          description="Invoice ID is missing from the payment link."
          type="error"
          showIcon
          action={
            <Button onClick={() => setLocation('/dashboard/patient')}>
              Go to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  if (invoiceLoading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading invoice details...</Text>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <Alert
          message="Invoice Not Found"
          description="The invoice you're trying to pay does not exist or you don't have access to it."
          type="error"
          showIcon
          action={
            <Button onClick={() => setLocation('/dashboard/patient')}>
              Go to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  const balance = parseFloat(invoice.balanceAmount || '0');
  const total = parseFloat(invoice.total || '0');
  const paid = parseFloat(invoice.paidAmount || '0');

  if (balance <= 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <Card>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
          <Title level={3}>Invoice Already Paid</Title>
          <Text type="secondary">This invoice has been fully paid.</Text>
          <div style={{ marginTop: 24 }}>
            <Button type="primary" onClick={() => navigate('/dashboard/patient')}>
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: 800, margin: '0 auto' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => setLocation('/dashboard/patient')}
        style={{ marginBottom: 24 }}
      >
        Back to Dashboard
      </Button>

      <Card>
        <Title level={2}>Payment Checkout</Title>
        <Divider />

        {/* Invoice Details */}
        <Descriptions title="Invoice Details" bordered column={1} size="small">
          <Descriptions.Item label="Invoice Number">
            {invoice.invoiceNumber || `INV-${invoice.id}`}
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            ₹{total.toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="Amount Paid">
            ₹{paid.toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="Balance Amount">
            <Text strong style={{ fontSize: 18, color: '#cf1322' }}>
              ₹{balance.toFixed(2)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={invoice.status === 'paid' ? 'green' : invoice.status === 'partially_paid' ? 'orange' : 'blue'}>
              {invoice.status?.toUpperCase().replace('_', ' ') || 'ISSUED'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* Payment Amount */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Text type="secondary" style={{ fontSize: 16 }}>Amount to Pay</Text>
          <Title level={1} style={{ margin: '8px 0', color: '#1890ff' }}>
            ₹{balance.toFixed(2)}
          </Title>
        </div>

        {/* Payment Order Status */}
        {orderData && orderData.order && (
          <Alert
            message="Payment Order Created"
            description={`Order ID: ${orderData.order.id}`}
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Payment Button */}
        <div style={{ textAlign: 'center' }}>
          {!orderData ? (
            <Button
              type="primary"
              size="large"
              icon={<CreditCardOutlined />}
              onClick={handlePayNow}
              loading={orderLoading || isProcessing}
              style={{ minWidth: 200, height: 50, fontSize: 16 }}
            >
              Pay Now
            </Button>
          ) : (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Alert
                message="Mock Payment Mode"
                description="In development mode, click below to simulate a successful payment. In production, this would redirect to Razorpay checkout."
                type="warning"
                showIcon
              />
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleMockPayment}
                loading={isProcessing}
                style={{ minWidth: 200, height: 50, fontSize: 16 }}
              >
                Complete Payment (Mock)
              </Button>
            </Space>
          )}
        </div>

        <Divider />

        <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center' }}>
          Secure payment processing powered by Razorpay (Mock Mode)
        </Text>
      </Card>
    </div>
  );
}
