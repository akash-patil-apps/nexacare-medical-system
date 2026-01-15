import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  message,
  Typography,
  Divider,
  Descriptions,
} from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const { TextArea } = Input;
const { Text } = Typography;

interface PaymentModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  invoiceId: number;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onCancel,
  onSuccess,
  invoiceId,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch invoice details
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['/api/billing/opd/invoices', invoiceId],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/billing/opd/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch invoice');
      return response.json();
    },
    enabled: open && !!invoiceId,
  });

  useEffect(() => {
    if (invoice) {
      const balance = parseFloat(invoice.balanceAmount || '0');
      form.setFieldsValue({
        amount: balance,
        method: 'cash',
      });
    }
  }, [invoice, form]);

  const handleSubmit = async (values: any) => {
    if (!values.amount || values.amount <= 0) {
      message.warning('Please enter a valid payment amount');
      return;
    }

    const balance = parseFloat(invoice?.balanceAmount || '0');
    if (values.amount > balance) {
      message.warning(`Payment amount cannot exceed balance of ₹${balance.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/billing/opd/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: values.method,
          amount: values.amount,
          reference: values.reference || null,
          notes: values.notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to record payment');
      }

      message.success('Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/billing/opd/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
      onSuccess();
      handleClose();
    } catch (error: any) {
      message.error(error.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onCancel();
  };

  if (isLoading) {
    return (
      <Modal title="Record Payment" open={open} onCancel={handleClose} footer={null}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Text>Loading invoice details...</Text>
        </div>
      </Modal>
    );
  }

  if (!invoice) {
    return null;
  }

  const balance = parseFloat(invoice.balanceAmount || '0');
  const total = parseFloat(invoice.total || '0');
  const paid = parseFloat(invoice.paidAmount || '0');

  return (
    <Modal
      title="Record Payment"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          method: 'cash',
          amount: balance,
        }}
      >
        <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Invoice Number">
            <Text strong>{invoice.invoiceNumber}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            <Text>₹{total.toFixed(2)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Paid Amount">
            <Text>₹{paid.toFixed(2)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Balance">
            <Text strong type={balance > 0 ? 'danger' : 'success'}>
              ₹{balance.toFixed(2)}
            </Text>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Form.Item
          name="method"
          label="Payment Method"
          rules={[{ required: true, message: 'Please select payment method' }]}
        >
          <Select>
            <Select.Option value="cash">Cash</Select.Option>
            <Select.Option value="card">Card</Select.Option>
            <Select.Option value="upi">UPI</Select.Option>
            <Select.Option value="online">Online</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="amount"
          label="Payment Amount"
          rules={[
            { required: true, message: 'Please enter payment amount' },
            { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
          ]}
        >
          <InputNumber
            min={0.01}
            max={balance}
            prefix="₹"
            style={{ width: '100%' }}
            precision={2}
          />
        </Form.Item>

        <Form.Item name="reference" label="Reference (Optional)">
          <Input placeholder="Transaction ID, UPI reference, etc." />
        </Form.Item>

        <Form.Item name="notes" label="Notes (Optional)">
          <TextArea rows={2} placeholder="Additional payment notes" />
        </Form.Item>

        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
              icon={<DollarOutlined />}
              disabled={balance === 0}
            >
              Record Payment
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};








