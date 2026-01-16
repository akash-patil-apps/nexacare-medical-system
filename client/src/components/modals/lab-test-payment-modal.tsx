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

const { TextArea } = Input;
const { Text } = Typography;

interface LabTestPaymentModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  labTest: {
    id: number;
    testName: string;
    patientId: number;
    patientName?: string;
    doctorId?: number;
    doctorName?: string;
    priority?: string;
    notes?: string;
  };
  hospitalId: number;
}

export const LabTestPaymentModal: React.FC<LabTestPaymentModalProps> = ({
  open,
  onCancel,
  onSuccess,
  labTest,
  hospitalId,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultPrice] = useState(500); // Default lab test price

  useEffect(() => {
    if (open && labTest) {
      form.setFieldsValue({
        amount: defaultPrice,
        method: 'cash',
      });
    }
  }, [open, labTest, form, defaultPrice]);

  const handleSubmit = async (values: any) => {
    if (!values.amount || values.amount <= 0) {
      message.warning('Please enter a valid payment amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth-token');
      
      // Step 1: Create invoice for lab test
      const invoiceResponse = await fetch('/api/billing/opd/invoices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hospitalId,
          patientId: labTest.patientId,
          items: [
            {
              type: 'lab_test',
              description: `Lab Test: ${labTest.testName}`,
              quantity: 1,
              unitPrice: values.amount,
            },
          ],
        }),
      });

      if (!invoiceResponse.ok) {
        const error = await invoiceResponse.json();
        throw new Error(error.message || 'Failed to create invoice');
      }

      const invoice = await invoiceResponse.json();
      message.success('Invoice created successfully');

      // Step 2: Record payment
      const paymentResponse = await fetch(`/api/billing/opd/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: values.method,
          amount: values.amount,
          reference: values.reference || null,
          notes: values.notes || `Payment for lab test: ${labTest.testName}`,
        }),
      });

      if (!paymentResponse.ok) {
        const error = await paymentResponse.json();
        throw new Error(error.message || 'Failed to record payment');
      }

      message.success('Payment recorded successfully');

      // Step 3: Confirm and send to lab
      const confirmResponse = await fetch(`/api/reception/lab-recommendations/${labTest.id}/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!confirmResponse.ok) {
        const error = await confirmResponse.json();
        throw new Error(error.message || 'Failed to confirm lab test');
      }

      message.success('Lab test confirmed and sent to lab technician');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error processing lab test payment:', error);
      message.error(error.message || 'Failed to process payment and confirm lab test');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Record Payment & Confirm Lab Test"
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
          amount: defaultPrice,
        }}
      >
        <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Patient">
            <Text strong>{labTest.patientName || `Patient ID: ${labTest.patientId}`}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Lab Test">
            <Text strong>{labTest.testName}</Text>
          </Descriptions.Item>
          {labTest.doctorName && (
            <Descriptions.Item label="Recommended by">
              <Text>{labTest.doctorName}</Text>
            </Descriptions.Item>
          )}
          {labTest.priority && (
            <Descriptions.Item label="Priority">
              <Text>{labTest.priority}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider />

        <Form.Item
          name="amount"
          label="Test Price"
          rules={[
            { required: true, message: 'Please enter test price' },
            { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
          ]}
        >
          <InputNumber
            min={0.01}
            prefix="₹"
            style={{ width: '100%' }}
            precision={2}
            placeholder="Enter test price"
          />
        </Form.Item>

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
            >
              Record Payment & Confirm
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
