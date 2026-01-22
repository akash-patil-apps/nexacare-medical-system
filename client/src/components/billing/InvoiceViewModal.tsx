import React from 'react';
import {
  Modal,
  Descriptions,
  Table,
  Tag,
  Space,
  Typography,
  Divider,
  Button,
  Spin,
} from 'antd';
import { FileTextOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { CopyIcon } from '../common/CopyIcon';

const { Title, Text } = Typography;

interface InvoiceViewModalProps {
  open: boolean;
  onCancel: () => void;
  invoiceId: number;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  open,
  onCancel,
  invoiceId,
}) => {
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

  if (isLoading) {
    return (
      <Modal title="Invoice Details" open={open} onCancel={onCancel} footer={null} width={800}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Loading invoice details...</Text>
          </div>
        </div>
      </Modal>
    );
  }

  if (!invoice) {
    return null;
  }

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
      render: (price: string) => `₹${parseFloat(price || '0').toFixed(2)}`,
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_: any, record: any) => {
        const qty = record.quantity || 1;
        const price = parseFloat(record.unitPrice || '0');
        return `₹${(qty * price).toFixed(2)}`;
      },
    },
  ];

  const paymentColumns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => {
        const methodMap: Record<string, { label: string; color: string }> = {
          cash: { label: 'Cash', color: 'green' },
          card: { label: 'Card', color: 'blue' },
          gpay: { label: 'GPay', color: 'cyan' },
          phonepe: { label: 'PhonePe', color: 'purple' },
          online: { label: 'Online', color: 'orange' },
          upi: { label: 'UPI', color: 'geekblue' },
        };
        const methodInfo = methodMap[method?.toLowerCase()] || { label: method || 'N/A', color: 'default' };
        return <Tag color={methodInfo.color}>{methodInfo.label}</Tag>;
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: string) => `₹${parseFloat(amount || '0').toFixed(2)}`,
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      render: (ref: string) => ref || '-',
    },
  ];

  const total = parseFloat(invoice.total || '0');
  const paid = parseFloat(invoice.paidAmount || '0');
  const balance = parseFloat(invoice.balanceAmount || '0');
  const subtotal = parseFloat(invoice.subtotal || '0');
  const discount = parseFloat(invoice.discountAmount || '0');
  const tax = parseFloat(invoice.taxAmount || '0');

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>Invoice #{invoice.invoiceNumber || invoice.id}</span>
          <Tag color={invoice.status === 'issued' ? 'green' : 'orange'}>
            {invoice.status?.toUpperCase() || 'DRAFT'}
          </Tag>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>
          Print
        </Button>,
        <Button key="close" onClick={onCancel}>
          Close
        </Button>,
      ]}
      width={900}
    >
      <div style={{ padding: '0 8px' }}>
        {/* Invoice Header */}
        <Descriptions column={2} size="small" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="Invoice Number">
            <Space>
              <Text strong>#{invoice.invoiceNumber || invoice.id}</Text>
              <CopyIcon text={String(invoice.invoiceNumber || invoice.id)} label="Invoice Number" />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Invoice Date">
            {dayjs(invoice.createdAt).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Patient">
            {invoice.patient?.fullName || invoice.patientName || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Appointment ID">
            <Space>
              <Text>{invoice.appointmentId ? `#${invoice.appointmentId}` : 'N/A'}</Text>
              {invoice.appointmentId && <CopyIcon text={String(invoice.appointmentId)} label="Appointment ID" />}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Doctor">
            {invoice.doctor?.fullName || invoice.doctorName || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={invoice.status === 'issued' ? 'green' : 'orange'}>
              {invoice.status?.toUpperCase() || 'DRAFT'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* Invoice Items */}
        <Title level={5}>Invoice Items</Title>
        <Table
          columns={itemColumns}
          dataSource={invoice.items || []}
          rowKey="id"
          pagination={false}
          size="small"
          style={{ marginBottom: 24 }}
        />

        {/* Summary */}
        <div style={{ textAlign: 'right', marginBottom: 24 }}>
          <Space direction="vertical" align="end" size="small">
            <Text>Subtotal: ₹{subtotal.toFixed(2)}</Text>
            {discount > 0 && (
              <Text type="secondary">Discount: -₹{discount.toFixed(2)}</Text>
            )}
            {tax > 0 && (
              <Text type="secondary">Tax: ₹{tax.toFixed(2)}</Text>
            )}
            <Divider style={{ margin: '8px 0' }} />
            <Text strong style={{ fontSize: 18 }}>
              Total: ₹{total.toFixed(2)}
            </Text>
            <Text type="secondary">Paid: ₹{paid.toFixed(2)}</Text>
            <Text type={balance > 0 ? 'danger' : 'success'} strong>
              Balance: ₹{balance.toFixed(2)}
            </Text>
          </Space>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <>
            <Divider />
            <Title level={5}>Payment History</Title>
            <Table
              columns={paymentColumns}
              dataSource={invoice.payments}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </>
        )}
      </div>
    </Modal>
  );
};
