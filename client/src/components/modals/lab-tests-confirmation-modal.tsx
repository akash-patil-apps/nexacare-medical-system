import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Radio,
  Button,
  Space,
  message,
  Typography,
  Divider,
  Descriptions,
  List,
  Tag,
} from 'antd';
import { DollarOutlined, CheckCircleOutlined, CloseCircleOutlined, CreditCardOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface LabTest {
  id: number;
  testName: string;
  testType?: string;
  reportDate?: string;
  priority?: string;
  notes?: string;
  doctorName?: string;
}

interface LabTestsConfirmationModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  patientId: number;
  patientName?: string;
  labTests: LabTest[];
  hospitalId: number;
}

export const LabTestsConfirmationModal: React.FC<LabTestsConfirmationModalProps> = ({
  open,
  onCancel,
  onSuccess,
  patientId,
  patientName,
  labTests,
  hospitalId,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testPrices] = useState<Record<number, number>>({});
  const [testConfirmations, setTestConfirmations] = useState<Record<number, boolean>>({});
  const [defaultPrice] = useState(500); // Default lab test price
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [discountValue, setDiscountValue] = useState<number | null>(null);

  useEffect(() => {
    if (open && labTests.length > 0) {
      // Initialize prices and confirmations for all tests
      const initialConfirmations: Record<number, boolean> = {};
      labTests.forEach((test) => {
        initialConfirmations[test.id] = true; // Default to confirmed
      });
      setTestConfirmations(initialConfirmations);
      // Only reset discount when modal first opens
      setDiscountValue(null);
      setDiscountType('percentage');
      
      form.setFieldsValue({
        method: 'cash',
      });
    }
  }, [open]); // Only depend on open - reset when modal opens/closes, not on every render

  // Get confirmed tests only
  const confirmedTests = useMemo(() => {
    return labTests.filter(test => testConfirmations[test.id] === true);
  }, [labTests, testConfirmations]);

  const calculateSubtotal = () => {
    return confirmedTests.reduce((sum, test) => {
      return sum + defaultPrice;
    }, 0);
  };

  const calculateDiscount = () => {
    if (discountValue === null || discountValue === 0) {
      return 0;
    }
    const subtotal = calculateSubtotal();
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    } else {
      return Math.min(discountValue, subtotal); // Don't allow discount more than subtotal
    }
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    return Math.max(0, subtotal - discount);
  };

  const handleTestToggle = (testId: number) => {
    setTestConfirmations(prev => ({
      ...prev,
      [testId]: !prev[testId],
    }));
  };

  // Get common date and doctor from tests
  const commonDate = useMemo(() => {
    if (labTests.length === 0) return null;
    const dates = labTests.map(t => t.reportDate).filter(Boolean);
    if (dates.length === 0) return null;
    // Return the most common date or first date
    return dates[0];
  }, [labTests]);

  const commonDoctor = useMemo(() => {
    if (labTests.length === 0) return null;
    const doctors = labTests.map(t => t.doctorName).filter(Boolean);
    if (doctors.length === 0) return null;
    // Return the most common doctor or first doctor
    return doctors[0];
  }, [labTests]);

  const handleSubmit = async (values: any) => {
    if (confirmedTests.length === 0) {
      message.warning('Please confirm at least one test to proceed');
      return;
    }

    const totalAmount = calculateTotal();
    if (totalAmount <= 0) {
      message.warning('Total amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth-token');
      
      const subtotal = calculateSubtotal();
      const discount = calculateDiscount();
      const discountAmount = discount || 0;
      const discountTypeValue = discountType;

      // Step 1: Create combined invoice for confirmed lab tests only
      const invoiceItems = confirmedTests.map((test) => ({
        type: 'lab_test',
        description: `Lab Test: ${test.testName}`,
        quantity: 1,
        unitPrice: defaultPrice,
      }));

      const invoiceResponse = await fetch('/api/billing/opd/invoices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hospitalId,
          patientId: patientId,
          items: invoiceItems,
          discountAmount: discountAmount,
          discountType: discountTypeValue,
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
          amount: totalAmount,
          reference: values.reference || null,
          notes: `Payment for ${confirmedTests.length} lab test(s): ${confirmedTests.map(t => t.testName).join(', ')}`,
        }),
      });

      if (!paymentResponse.ok) {
        const error = await paymentResponse.json();
        throw new Error(error.message || 'Failed to record payment');
      }

      message.success('Payment recorded successfully');

      // Step 3: Confirm only selected lab tests and send to lab
      const confirmPromises = confirmedTests.map((test) =>
        fetch(`/api/reception/lab-recommendations/${test.id}/confirm`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      );

      const confirmResults = await Promise.all(confirmPromises);
      const failed = confirmResults.filter(r => !r.ok);
      
      if (failed.length > 0) {
        message.warning(`Some tests could not be confirmed. ${failed.length} test(s) failed.`);
      } else {
        message.success(`${confirmedTests.length} lab test(s) confirmed and sent to lab technician`);
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error processing lab tests payment:', error);
      message.error(error.message || 'Failed to process payment and confirm lab tests');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setTestConfirmations({});
    setDiscountValue(null);
    setDiscountType('percentage');
    onCancel();
  };

  const totalAmount = calculateTotal();
  const hasConfirmedTests = confirmedTests.length > 0;

  return (
    <Modal
      title={
        <Space>
          <Text strong>Confirm Lab Tests</Text>
          <Tag color="orange">{labTests.length} test(s)</Tag>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          method: 'cash',
        }}
      >
        <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Patient">
            <Text strong>{patientName || `Patient ID: ${patientId}`}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Number of Tests">
            <Text>{labTests.length} test(s) recommended</Text>
          </Descriptions.Item>
          {commonDate && (
            <Descriptions.Item label="Date">
              <Text>{dayjs(commonDate).format('DD MMM YYYY')}</Text>
            </Descriptions.Item>
          )}
          {commonDoctor && (
            <Descriptions.Item label="Recommended by">
              <Text>{commonDoctor}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider />

        <Title level={5} style={{ marginBottom: 16 }}>Select Tests to Confirm</Title>
        <List
          dataSource={labTests}
          renderItem={(test) => {
            const isConfirmed = testConfirmations[test.id] === true;
            return (
              <List.Item
                style={{
                  background: isConfirmed ? '#f6ffed' : '#fff1f0',
                  border: `1px solid ${isConfirmed ? '#b7eb8f' : '#ffccc7'}`,
                  borderRadius: 8,
                  marginBottom: 12,
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => handleTestToggle(test.id)}
              >
                <div style={{ width: '100%' }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space>
                      <Text strong style={{ fontSize: 15 }}>{test.testName}</Text>
                      {test.priority && (
                        <Tag color={
                          test.priority.toLowerCase() === 'urgent' ? 'red' :
                          test.priority.toLowerCase() === 'high' ? 'orange' : 'blue'
                        }>
                          {test.priority}
                        </Tag>
                      )}
                    </Space>
                    {test.testType && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {test.testType}
                      </Text>
                    )}
                    {test.notes && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Notes: {test.notes}
                      </Text>
                    )}
                    <Space>
                      <Text type="secondary">Price:</Text>
                      <Text strong>₹{defaultPrice.toFixed(2)}</Text>
                    </Space>
                  </Space>
                </div>
              </List.Item>
            );
          }}
        />

        <Divider />

        <Form.Item
          name="method"
          label="Payment Method"
          rules={[{ required: true, message: 'Please select payment method' }]}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { value: 'card', label: 'Card', icon: <CreditCardOutlined style={{ fontSize: 28 }} /> },
              { value: 'gpay', label: 'GPay', icon: <span style={{ fontSize: 28, fontWeight: 'bold', color: '#4285F4' }}>G</span> },
              { value: 'phonepe', label: 'PhonePe', icon: <span style={{ fontSize: 24, fontWeight: 'bold', color: '#5F259F' }}>P</span> },
              { value: 'cash', label: 'Cash', icon: <DollarOutlined style={{ fontSize: 28 }} /> },
            ].map((method) => {
              const isSelected = form.getFieldValue('method') === method.value;
              return (
                <Button
                  key={method.value}
                  type="default"
                  style={{
                    width: 130,
                    height: 110,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isSelected ? '2px solid #1890ff' : '2px solid #d9d9d9',
                    borderRadius: 12,
                    backgroundColor: isSelected ? '#e6f7ff' : '#fff',
                    color: isSelected ? '#1890ff' : '#000',
                    transition: 'all 0.3s',
                  }}
                  onClick={() => {
                    form.setFieldsValue({ method: method.value });
                    form.validateFields(['method']);
                  }}
                >
                  <div style={{ marginBottom: 8, color: isSelected ? '#1890ff' : 'inherit' }}>
                    {method.icon}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{method.label}</div>
                </Button>
              );
            })}
          </div>
        </Form.Item>

        <Divider />

        <div style={{ 
          background: '#f5f5f5', 
          padding: 16, 
          borderRadius: 4, 
          marginBottom: 16 
        }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: 16 }}>Confirmed Tests:</Text>
              <Text>{confirmedTests.length} of {labTests.length}</Text>
            </Space>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14 }}>Subtotal:</Text>
              <Text>₹{calculateSubtotal().toFixed(2)}</Text>
            </Space>
            <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text style={{ fontSize: 14 }}>Discount:</Text>
                <Radio.Group
                  value={discountType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setDiscountType(newType);
                    // Keep the discount value, just change the type
                    // Don't reset discount value when changing type
                  }}
                  buttonStyle="solid"
                  size="small"
                >
                  <Radio.Button value="percentage">%</Radio.Button>
                  <Radio.Button value="amount">₹</Radio.Button>
                </Radio.Group>
                <InputNumber
                  min={0}
                  max={discountType === 'percentage' ? 100 : calculateSubtotal()}
                  value={discountValue}
                  onChange={(value) => {
                    // Handle null, undefined, or empty string
                    if (value === null || value === undefined || value === '') {
                      setDiscountValue(null);
                    } else {
                      const numValue = typeof value === 'number' ? value : Number(value);
                      if (!isNaN(numValue) && numValue >= 0) {
                        setDiscountValue(numValue);
                      }
                    }
                  }}
                  placeholder={discountType === 'percentage' ? '0' : '0.00'}
                  prefix={discountType === 'amount' ? '₹' : undefined}
                  suffix={discountType === 'percentage' ? '%' : undefined}
                  precision={discountType === 'percentage' ? 0 : 2}
                  style={{ width: 140 }}
                  stringMode={false}
                />
              </Space>
              {discountValue !== null && discountValue > 0 && (
                <Text type="secondary">-₹{calculateDiscount().toFixed(2)}</Text>
              )}
            </Space>
            <Divider style={{ margin: '8px 0' }} />
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: 18 }}>Total Amount:</Text>
              <Text strong style={{ fontSize: 20, color: '#1890ff' }}>
                ₹{totalAmount.toFixed(2)}
              </Text>
            </Space>
          </Space>
        </div>

        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
          <Space>
            <Button 
              onClick={handleClose}
              icon={<CloseCircleOutlined />}
              size="large"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
              icon={<CheckCircleOutlined />}
              size="large"
              disabled={!hasConfirmedTests}
            >
              Payment and Confirm
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
