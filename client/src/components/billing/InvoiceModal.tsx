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
  Spin,
  Typography,
  Divider,
  Table,
  Tag,
  Checkbox,
  Alert,
} from 'antd';
import { DollarOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface InvoiceModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  appointmentId: number;
  patientId: number;
  doctorId: number;
  hospitalId?: number;
  appointmentType?: string; // 'online' or 'walk-in'
  paymentStatus?: string; // 'paid' or null/undefined
}

interface InvoiceItem {
  type: 'consultation_fee' | 'registration_fee';
  description: string;
  quantity: number;
  unitPrice: number;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  open,
  onCancel,
  onSuccess,
  appointmentId,
  patientId,
  doctorId,
  hospitalId,
  appointmentType = 'walk-in',
  paymentStatus,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discountType, setDiscountType] = useState<'amount' | 'percent' | null>(null);
  
  // Fetch appointment details to check payment status from notes
  const { data: appointmentDetails } = useQuery({
    queryKey: ['/api/appointments', appointmentId],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch appointment');
      return response.json();
    },
    enabled: open && !!appointmentId,
  });

  // Extract payment details from appointment notes
  const extractPaymentDetails = () => {
    if (!appointmentDetails?.notes) return null;
    const notes = appointmentDetails.notes;
    
    // Check for payment information in notes
    // Format: "Payment: TXN123 | Method: card | Amount: ₹500 | Status: success"
    const paymentMatch = notes.match(/Payment:\s*([^|]+)\s*\|\s*Method:\s*([^|]+)\s*\|\s*Amount:\s*([^|]+)\s*\|\s*Status:\s*([^\n]+)/i);
    if (paymentMatch) {
      // Try to extract date/time if available
      const dateMatch = notes.match(/Date:\s*([^\n|]+)/i);
      const timeMatch = notes.match(/Time:\s*([^\n|]+)/i);
      
      return {
        transactionId: paymentMatch[1].trim(),
        method: paymentMatch[2].trim(),
        amount: paymentMatch[3].trim(),
        status: paymentMatch[4].trim().toLowerCase(),
        date: dateMatch ? dateMatch[1].trim() : appointmentDetails.confirmedAt ? new Date(appointmentDetails.confirmedAt).toLocaleDateString() : null,
        time: timeMatch ? timeMatch[1].trim() : appointmentDetails.confirmedAt ? new Date(appointmentDetails.confirmedAt).toLocaleTimeString() : null,
      };
    }
    
    // Also check for "Payment Status: paid" format
    if (notes.toLowerCase().includes('payment status: paid') || 
        notes.toLowerCase().includes('payment status:paid')) {
      return {
        transactionId: appointmentDetails.id ? `TXN-${appointmentDetails.id}` : 'Online Payment',
        method: 'online',
        amount: null,
        status: 'paid',
        date: appointmentDetails.confirmedAt ? new Date(appointmentDetails.confirmedAt).toLocaleDateString() : null,
        time: appointmentDetails.confirmedAt ? new Date(appointmentDetails.confirmedAt).toLocaleTimeString() : null,
      };
    }
    
    return null;
  };

  const paymentDetails = extractPaymentDetails();
  const isOnlinePayment = appointmentType?.toLowerCase() === 'online' && 
    (paymentStatus?.toLowerCase() === 'paid' || (paymentDetails && (paymentDetails.status === 'paid' || paymentDetails.status === 'success')));
  const needsPaymentMethod = !isOnlinePayment; // Only walk-in or unpaid online appointments need payment method

  // Fetch doctor details to get consultation fee
  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ['/api/doctors', doctorId],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/doctors/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch doctor');
      return response.json();
    },
    enabled: open && !!doctorId,
  });

  // Initialize items when doctor data is loaded
  useEffect(() => {
    if (doctor && items.length === 0) {
      const consultationFee = doctor.consultationFee 
        ? parseFloat(doctor.consultationFee.toString())
        : 500; // Default fee
      
      setItems([{
        type: 'consultation_fee',
        description: `Consultation fee - ${doctor.specialty || 'General'}`,
        quantity: 1,
        unitPrice: consultationFee,
      }]);
      
      form.setFieldsValue({
        consultationFee,
        registrationFee: 0,
      });
    }
  }, [doctor, items.length, form]);

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const registrationFee = form.getFieldValue('registrationFee') || 0;
    const totalSubtotal = subtotal + registrationFee;
    
    const discountAmount = form.getFieldValue('discountAmount') || 0;
    let finalDiscount = discountAmount;
    
    if (discountType === 'percent' && discountAmount > 0) {
      finalDiscount = (totalSubtotal * discountAmount) / 100;
    }
    
    const taxAmount = form.getFieldValue('taxAmount') || 0;
    const total = totalSubtotal - finalDiscount + taxAmount;
    
    return {
      subtotal: totalSubtotal,
      discountAmount: finalDiscount,
      taxAmount,
      total: Math.max(0, total),
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth-token');
      
      // Build invoice items
      const invoiceItems = [...items];
      if (values.registrationFee && values.registrationFee > 0) {
        invoiceItems.push({
          type: 'registration_fee' as const,
          description: 'Registration fee',
          quantity: 1,
          unitPrice: values.registrationFee,
        });
      }
      
      const response = await fetch('/api/billing/opd/invoices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId,
          items: invoiceItems,
          discountAmount: values.discountAmount || 0,
          discountType: discountType || null,
          discountReason: values.discountReason || null,
          taxAmount: values.taxAmount || 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create invoice');
      }

      const invoice = await response.json();
      
      // Issue the invoice immediately
      await fetch(`/api/billing/opd/invoices/${invoice.id}/issue`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Record payment - automatically for online payments, or from form for walk-in
      const paymentMethod = isOnlinePayment ? 'online' : values.paymentMethod;
      
      if (paymentMethod) {
        try {
          const paymentReference = isOnlinePayment && paymentDetails 
            ? paymentDetails.transactionId 
            : (values.paymentReference || null);
          
          const paymentNotes = isOnlinePayment && paymentDetails
            ? `Online payment completed during booking. Transaction: ${paymentDetails.transactionId}, Method: ${paymentDetails.method}, Amount: ${paymentDetails.amount || totals.total}`
            : (values.paymentNotes || null);

          const paymentResponse = await fetch(`/api/billing/opd/invoices/${invoice.id}/payments`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              method: paymentMethod,
              amount: totals.total,
              reference: paymentReference,
              notes: paymentNotes,
            }),
          });

          if (!paymentResponse.ok) {
            const error = await paymentResponse.json();
            console.error('Payment recording error:', error);
            message.warning('Invoice created but payment recording failed: ' + (error.message || 'Unknown error'));
          } else {
            message.success(isOnlinePayment 
              ? 'Invoice created and online payment recorded successfully' 
              : 'Invoice created and payment recorded successfully');
          }
        } catch (paymentError: any) {
          console.error('Payment recording error:', paymentError);
          message.warning('Invoice created but payment recording failed: ' + paymentError.message);
        }
      } else {
        message.success('Invoice created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/billing/opd/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
      onSuccess();
      handleClose();
    } catch (error: any) {
      // Better error handling for authorization issues
      let errorMessage = error.message || 'Failed to create invoice';
      if (errorMessage.includes('not authorized') || errorMessage.includes('Unauthorized') || errorMessage.includes('403')) {
        errorMessage = 'You are not authorized to create invoices. Please contact your administrator.';
      } else if (errorMessage.includes('401')) {
        errorMessage = 'Your session has expired. Please log in again.';
      }
      message.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setItems([]);
    setDiscountType(null);
    onCancel();
  };

  const itemColumns = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (price: number) => `₹${price.toFixed(2)}`,
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_: any, record: InvoiceItem) => `₹${(record.unitPrice * record.quantity).toFixed(2)}`,
    },
  ];

  return (
    <Modal
      title="Create Invoice"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={700}
    >
      {doctorLoading ? (
        <Spin />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            consultationFee: doctor?.consultationFee ? parseFloat(doctor.consultationFee.toString()) : 500,
            registrationFee: 0,
            discountAmount: 0,
            taxAmount: 0,
            paymentMethod: isOnlinePayment ? 'online' : (needsPaymentMethod ? undefined : 'online'),
            paymentReference: isOnlinePayment && paymentDetails ? paymentDetails.transactionId : undefined,
            paymentNotes: isOnlinePayment && paymentDetails 
              ? `Online payment completed during booking. Transaction: ${paymentDetails.transactionId}, Method: ${paymentDetails.method}`
              : undefined,
          }}
        >
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 8 }}>
            <Space direction="vertical" size="small">
              <Text strong>Appointment ID: {appointmentId}</Text>
              <Text>
                Doctor: {doctor?.user?.fullName || doctor?.fullName || 'Loading...'}
                {doctor?.specialty && ` (${doctor.specialty})`}
              </Text>
            </Space>
          </div>

          <Divider orientation="left">Invoice Items</Divider>
          
          <Table
            columns={itemColumns}
            dataSource={items}
            rowKey="type"
            pagination={false}
            size="small"
          />

          <Form.Item
            name="registrationFee"
            label="Registration Fee (Optional)"
            style={{ marginTop: 16 }}
          >
            <InputNumber
              min={0}
              prefix="₹"
              style={{ width: '100%' }}
              onChange={(value) => {
                if (value && value > 0 && !items.find(i => i.type === 'registration_fee')) {
                  setItems([...items, {
                    type: 'registration_fee',
                    description: 'Registration fee',
                    quantity: 1,
                    unitPrice: value,
                  }]);
                } else if ((!value || value === 0) && items.find(i => i.type === 'registration_fee')) {
                  setItems(items.filter(i => i.type !== 'registration_fee'));
                }
              }}
            />
          </Form.Item>

          <Divider orientation="left">Discount</Divider>

          <Form.Item name="discountType" label="Discount Type">
            <Select
              placeholder="Select discount type"
              allowClear
              onChange={(value) => setDiscountType(value)}
            >
              <Select.Option value="amount">Fixed Amount</Select.Option>
              <Select.Option value="percent">Percentage</Select.Option>
            </Select>
          </Form.Item>

          {discountType && (
            <>
              <Form.Item
                name="discountAmount"
                label={`Discount ${discountType === 'percent' ? '(%)' : '(₹)'}`}
                rules={[{ required: true, message: 'Please enter discount amount' }]}
              >
                <InputNumber
                  min={0}
                  max={discountType === 'percent' ? 100 : undefined}
                  prefix={discountType === 'amount' ? '₹' : undefined}
                  suffix={discountType === 'percent' ? '%' : undefined}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item name="discountReason" label="Discount Reason">
                <TextArea rows={2} placeholder="Enter reason for discount" />
              </Form.Item>
            </>
          )}

          <Form.Item name="taxAmount" label="Tax Amount (Optional)">
            <InputNumber min={0} prefix="₹" style={{ width: '100%' }} />
          </Form.Item>

          <Divider orientation="left">Payment</Divider>

          {isOnlinePayment && paymentDetails ? (
            <div style={{ padding: 16, background: '#f6ffed', borderRadius: 8, marginBottom: 16, border: '1px solid #b7eb8f' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                  <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                    Payment Already Completed Online
                  </Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">Transaction ID:</Text>
                    <Text strong>{paymentDetails.transactionId}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">Payment Method:</Text>
                    <Text strong style={{ textTransform: 'capitalize' }}>{paymentDetails.method}</Text>
                  </div>
                  {paymentDetails.amount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Amount Paid:</Text>
                      <Text strong>{paymentDetails.amount}</Text>
                    </div>
                  )}
                  {paymentDetails.date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Payment Date:</Text>
                      <Text strong>{paymentDetails.date}</Text>
                    </div>
                  )}
                  {paymentDetails.time && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Payment Time:</Text>
                      <Text strong>{paymentDetails.time}</Text>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">Status:</Text>
                    <Text strong style={{ color: '#52c41a' }}>Success</Text>
                  </div>
                </div>
                <Alert
                  message="Payment will be automatically recorded when invoice is created"
                  type="info"
                  showIcon
                  style={{ marginTop: 8 }}
                />
              </Space>
            </div>
          ) : isOnlinePayment ? (
            <div style={{ padding: 12, background: '#f6ffed', borderRadius: 8, marginBottom: 16 }}>
              <Text type="success">
                ✓ Patient has already paid online. Payment will be automatically recorded when invoice is created.
              </Text>
            </div>
          ) : (
            <>
              <Form.Item
                name="paymentMethod"
                label="Payment Method"
                rules={[{ required: true, message: 'Please select payment method' }]}
                tooltip="Select how the patient is paying for this appointment"
              >
                <Select placeholder="Select payment method">
                  <Select.Option value="cash">Cash</Select.Option>
                  <Select.Option value="card">Card</Select.Option>
                  <Select.Option value="upi">UPI</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="paymentReference"
                label="Payment Reference (Optional)"
                tooltip="Transaction ID, UPI reference, receipt number, etc."
              >
                <Input placeholder="e.g., UPI transaction ID, card last 4 digits" />
              </Form.Item>

              <Form.Item name="paymentNotes" label="Payment Notes (Optional)">
                <TextArea rows={2} placeholder="Additional payment notes" />
              </Form.Item>
            </>
          )}

          <Divider />

          <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Subtotal:</Text>
                <Text strong>₹{totals.subtotal.toFixed(2)}</Text>
              </div>
              {totals.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Discount:</Text>
                  <Text type="secondary">-₹{totals.discountAmount.toFixed(2)}</Text>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Tax:</Text>
                  <Text type="secondary">+₹{totals.taxAmount.toFixed(2)}</Text>
                </div>
              )}
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 16 }}>Total:</Text>
                <Text strong style={{ fontSize: 18, color: '#1890ff' }}>₹{totals.total.toFixed(2)}</Text>
              </div>
            </Space>
          </div>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space>
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={isSubmitting} icon={<FileTextOutlined />}>
                Create Invoice
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

