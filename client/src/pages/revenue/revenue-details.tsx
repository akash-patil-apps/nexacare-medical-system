import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Table,
  Space,
  Typography,
  Tag,
  Select,
  Row,
  Col,
  Statistic,
  Button,
  Input,
  message,
  DatePicker,
} from 'antd';
import {
  DollarOutlined,
  DownloadOutlined,
  ReloadOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface RevenueTransaction {
  id: number;
  amount: number;
  paymentMethod: string;
  status: string;
  receivedAt: string;
  invoiceNumber?: string;
  invoiceId?: number;
  source: 'appointment' | 'ipd' | 'opd';
  sourceId?: number;
  patientId?: number;
  notes?: string;
  transactionId?: string;
}

export default function RevenueDetails() {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');

  // Fetch revenue statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/revenue/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/revenue/stats');
      return res.json();
    },
  });

  // Fetch revenue by source
  const { data: revenueBySource } = useQuery({
    queryKey: ['/api/revenue/by-source', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange[0]) params.append('startDate', dateRange[0].toISOString());
      if (dateRange[1]) params.append('endDate', dateRange[1].toISOString());
      
      const res = await apiRequest('GET', `/api/revenue/by-source?${params.toString()}`);
      return res.json();
    },
  });

  // Fetch revenue by payment method
  const { data: revenueByMethod } = useQuery({
    queryKey: ['/api/revenue/by-method', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange[0]) params.append('startDate', dateRange[0].toISOString());
      if (dateRange[1]) params.append('endDate', dateRange[1].toISOString());
      
      const res = await apiRequest('GET', `/api/revenue/by-method?${params.toString()}`);
      return res.json();
    },
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['/api/revenue/transactions', dateRange, paymentMethodFilter, sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange[0]) params.append('startDate', dateRange[0].toISOString());
      if (dateRange[1]) params.append('endDate', dateRange[1].toISOString());
      if (paymentMethodFilter !== 'all') params.append('paymentMethod', paymentMethodFilter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      params.append('limit', '1000');
      
      const res = await apiRequest('GET', `/api/revenue/transactions?${params.toString()}`);
      return res.json();
    },
  });

  // Filter transactions by search text
  const filteredTransactions = transactions?.filter((t: RevenueTransaction) => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      t.invoiceNumber?.toLowerCase().includes(search) ||
      t.transactionId?.toLowerCase().includes(search) ||
      t.notes?.toLowerCase().includes(search)
    );
  }) || [];

  const columns: ColumnsType<RevenueTransaction> = [
    {
      title: 'Date & Time',
      dataIndex: 'receivedAt',
      key: 'receivedAt',
      width: 180,
      render: (date: string) => dayjs(date).format('DD MMM YYYY, hh:mm A'),
      sorter: (a, b) => dayjs(a.receivedAt).unix() - dayjs(b.receivedAt).unix(),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a' }}>₹{amount.toFixed(2)}</Text>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method: string) => {
        const colors: Record<string, string> = {
          online: 'blue',
          cash: 'green',
          card: 'purple',
          upi: 'orange',
          cheque: 'default',
        };
        return <Tag color={colors[method?.toLowerCase()] || 'default'}>{method?.toUpperCase() || 'N/A'}</Tag>;
      },
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (source: string) => {
        const colors: Record<string, string> = {
          appointment: 'blue',
          ipd: 'red',
          opd: 'green',
        };
        return <Tag color={colors[source] || 'default'}>{source.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Invoice',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 120,
      render: (invoice: string) => invoice || 'N/A',
    },
    {
      title: 'Transaction ID',
      dataIndex: 'transactionId',
      key: 'transactionId',
      width: 150,
      render: (id: string) => id || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          completed: 'green',
          pending: 'orange',
          failed: 'red',
        };
        return <Tag color={colors[status?.toLowerCase()] || 'default'}>{status?.toUpperCase() || 'N/A'}</Tag>;
      },
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string) => notes || '-',
    },
  ];

  const handleExport = () => {
    // TODO: Implement CSV/PDF export
    message.info('Export feature coming soon');
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>
            <DollarOutlined /> Revenue & Transactions
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => { refetchStats(); refetchTransactions(); }}>
              Refresh
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Export
            </Button>
          </Space>
        </div>

        {/* Revenue Statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Daily Revenue"
                value={stats?.daily || 0}
                prefix="₹"
                valueStyle={{ color: '#3f8600' }}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Weekly Revenue"
                value={stats?.weekly || 0}
                prefix="₹"
                valueStyle={{ color: '#1890ff' }}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Monthly Revenue"
                value={stats?.monthly || 0}
                prefix="₹"
                valueStyle={{ color: '#cf1322' }}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={stats?.total || 0}
                prefix="₹"
                valueStyle={{ color: '#722ed1' }}
                loading={statsLoading}
              />
            </Card>
          </Col>
        </Row>

        {/* Revenue Breakdown */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title={<><CreditCardOutlined /> Revenue by Source</>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Appointments:</Text>
                  <Text strong>₹{revenueBySource?.appointment?.toFixed(2) || '0.00'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>IPD:</Text>
                  <Text strong>₹{revenueBySource?.ipd?.toFixed(2) || '0.00'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>OPD:</Text>
                  <Text strong>₹{revenueBySource?.opd?.toFixed(2) || '0.00'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 8 }}>
                  <Text strong>Total:</Text>
                  <Text strong style={{ fontSize: 16 }}>₹{revenueBySource?.total?.toFixed(2) || '0.00'}</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title={<><WalletOutlined /> Revenue by Payment Method</>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {revenueByMethod && Object.entries(revenueByMethod).map(([method, amount]: [string, any]) => (
                  <div key={method} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>{method.charAt(0).toUpperCase() + method.slice(1)}:</Text>
                    <Text strong>₹{amount.toFixed(2)}</Text>
                  </div>
                ))}
                {(!revenueByMethod || Object.keys(revenueByMethod).length === 0) && (
                  <Text type="secondary">No payment data available</Text>
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Text strong>Date Range:</Text>
              <RangePicker
                style={{ width: '100%', marginTop: 8 }}
                value={dateRange as any}
                onChange={(dates) => setDateRange(dates as any)}
                format="DD/MM/YYYY"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong>Payment Method:</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                value={paymentMethodFilter}
                onChange={setPaymentMethodFilter}
              >
                <Option value="all">All Methods</Option>
                <Option value="online">Online</Option>
                <Option value="cash">Cash</Option>
                <Option value="card">Card</Option>
                <Option value="upi">UPI</Option>
                <Option value="cheque">Cheque</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong>Source:</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                value={sourceFilter}
                onChange={setSourceFilter}
              >
                <Option value="all">All Sources</Option>
                <Option value="appointment">Appointments</Option>
                <Option value="ipd">IPD</Option>
                <Option value="opd">OPD</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong>Search:</Text>
              <Input
                style={{ marginTop: 8 }}
                placeholder="Invoice, Transaction ID, Notes..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
          </Row>
        </Card>

        {/* Transactions Table */}
        <Card title={<><CalendarOutlined /> All Transactions</>}>
          <Table
            columns={columns}
            dataSource={filteredTransactions}
            loading={transactionsLoading}
            rowKey="id"
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} transactions`,
            }}
            scroll={{ x: 1200 }}
          />
        </Card>
      </Space>
    </div>
  );
}
