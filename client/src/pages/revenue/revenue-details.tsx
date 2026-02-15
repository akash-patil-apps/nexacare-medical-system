import React, { useState, useMemo, useEffect } from 'react';
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
  Layout,
  Drawer,
  Popover,
  Descriptions,
} from 'antd';
import { Tabs } from 'antd';
import {
  DollarOutlined,
  DownloadOutlined,
  ReloadOutlined,
  CalendarOutlined,
  UserOutlined,
  BellOutlined,
  SettingOutlined,
  BankOutlined,
  TeamOutlined,
  FileTextOutlined,
  BarChartOutlined,
  MenuUnfoldOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { CopyIcon } from '../../components/common/CopyIcon';
import { apiRequest } from '../../lib/queryClient';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuth } from '../../hooks/use-auth';
import { useResponsive } from '../../hooks/use-responsive';
import { useLocation } from 'wouter';
import { TopHeader } from '../../components/layout/TopHeader';
import { HospitalSidebar } from '../../components/layout/HospitalSidebar';
import { getCalendarDateIST } from '../../lib/timezone';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Content, Sider } = Layout;

interface RevenueTransaction {
  id: number;
  amount: number;
  paymentMethod: string;
  status: string;
  receivedAt: string;
  invoiceNumber?: string;
  invoiceId?: number;
  source: 'appointment' | 'ipd' | 'opd' | 'test' | 'pharmacy';
  sourceId?: number;
  patientId?: number;
  notes?: string;
  transactionId?: string;
}

export default function RevenueDetails() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { isMobile, isTablet } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [activeTransactionTab, setActiveTransactionTab] = useState<string>('today');
  // const [selectedMenuKey] = useState<string>('revenue'); // Unused variable

  // Get notifications for TopHeader
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications/me'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/notifications/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 15000,
  });
  
  const siderWidth = isMobile ? 0 : 80; // Narrow sidebar width matching PatientSidebar

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
      if (dateRange[0]) {
        const startDate = dayjs(dateRange[0]).startOf('day').toISOString();
        params.append('startDate', startDate);
      }
      if (dateRange[1]) {
        const endDate = dayjs(dateRange[1]).endOf('day').toISOString();
        params.append('endDate', endDate);
      }
      if (paymentMethodFilter !== 'all') params.append('paymentMethod', paymentMethodFilter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      params.append('limit', '1000');
      
      const res = await apiRequest('GET', `/api/revenue/transactions?${params.toString()}`);
      return res.json();
    },
    enabled: true, // Always enabled
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

  // Group transactions by calendar date in IST (avoids timezone/parsing bugs like "2nd May")
  const transactionsByDate = useMemo(() => {
    const todayIST = getCalendarDateIST();
    const [ty, tm, td] = todayIST.split('-').map(Number);
    const tomorrowIST = getCalendarDateIST(new Date(Date.UTC(ty, tm - 1, td + 1)));
    
    const groups: Record<string, RevenueTransaction[]> = {
      today: [],
      tomorrow: [],
    };
    
    filteredTransactions.forEach((t: RevenueTransaction) => {
      if (!t.receivedAt) return;
      const dateStr = getCalendarDateIST(t.receivedAt);
      if (dateStr === todayIST) {
        groups.today.push(t);
      } else if (dateStr === tomorrowIST) {
        groups.tomorrow.push(t);
      } else {
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(t);
      }
    });
    
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => dayjs(b.receivedAt).unix() - dayjs(a.receivedAt).unix());
    });
    return groups;
  }, [filteredTransactions]);

  // Get transactions for active tab
  const transactionsToShow = useMemo(() => {
    return transactionsByDate[activeTransactionTab] || [];
  }, [activeTransactionTab, transactionsByDate]);

  // Generate tab items for transactions
  const transactionTabs = useMemo(() => {
    const tabs: Array<{ key: string; label: string; count: number }> = [];
    
    if (transactionsByDate.today && transactionsByDate.today.length > 0) {
      tabs.push({ 
        key: 'today', 
        label: `Today (${transactionsByDate.today.length})`, 
        count: transactionsByDate.today.length 
      });
    }
    
    if (transactionsByDate.tomorrow && transactionsByDate.tomorrow.length > 0) {
      tabs.push({ 
        key: 'tomorrow', 
        label: `Tomorrow (${transactionsByDate.tomorrow.length})`, 
        count: transactionsByDate.tomorrow.length 
      });
    }
    
    Object.keys(transactionsByDate)
      .filter(key => key !== 'today' && key !== 'tomorrow')
      .sort((a, b) => dayjs(b).unix() - dayjs(a).unix()) // Descending (newest first)
      .forEach(dateKey => {
        const count = transactionsByDate[dateKey]?.length || 0;
        if (count > 0) {
          const date = dayjs(dateKey);
          tabs.push({ 
            key: dateKey, 
            label: `${date.format('DD MMM')} (${count})`, 
            count 
          });
        }
      });
    
    // If no tabs, add empty today tab
    if (tabs.length === 0) {
      tabs.push({ key: 'today', label: 'Today (0)', count: 0 });
    }
    
    return tabs;
  }, [transactionsByDate]);

  // Update active tab if current tab has no transactions
  useEffect(() => {
    if (transactionTabs.length > 0 && !transactionsByDate[activeTransactionTab]) {
      // Find first tab with transactions
      const firstTabWithData = transactionTabs.find(tab => tab.count > 0);
      if (firstTabWithData) {
        setActiveTransactionTab(firstTabWithData.key);
      } else if (transactionTabs.length > 0) {
        setActiveTransactionTab(transactionTabs[0].key);
      }
    }
  }, [transactionTabs, transactionsByDate, activeTransactionTab]);

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
        <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>₹{amount.toFixed(2)}</Text>
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
          gpay: 'blue',
          phonepe: 'cyan',
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
          test: 'orange',
          pharmacy: 'purple',
        };
        return <Tag color={colors[source] || 'default'}>{source.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Invoice',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 180,
      render: (invoice: string) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{invoice || 'N/A'}</span>,
    },
    {
      title: 'Transaction ID',
      dataIndex: 'transactionId',
      key: 'transactionId',
      width: 200,
      render: (id: string) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{id || '-'}</span>,
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
      title: 'Details',
      key: 'details',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: RevenueTransaction) => {
        const popoverContent = (
          <div style={{ maxWidth: '400px' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Transaction ID">
                <Space>
                  <Text style={{ fontFamily: 'monospace' }}>{record.transactionId || 'N/A'}</Text>
                  {record.transactionId && record.transactionId !== 'N/A' && (
                    <CopyIcon text={record.transactionId} label="Transaction ID" />
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Number">
                <Space>
                  <Text>{record.invoiceNumber || 'N/A'}</Text>
                  {record.invoiceNumber && record.invoiceNumber !== 'N/A' && (
                    <CopyIcon text={record.invoiceNumber} label="Invoice Number" />
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>₹{record.amount.toFixed(2)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                <Tag color={record.paymentMethod === 'cash' ? 'green' : record.paymentMethod === 'upi' ? 'orange' : 'blue'}>
                  {record.paymentMethod?.toUpperCase() || 'N/A'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Source">
                <Tag color={
                  record.source === 'appointment' ? 'blue' :
                  record.source === 'test' ? 'orange' :
                  record.source === 'pharmacy' ? 'purple' :
                  record.source === 'ipd' ? 'red' : 'green'
                }>
                  {record.source?.toUpperCase() || 'N/A'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color="green">{record.status?.toUpperCase() || 'COMPLETED'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Date & Time">
                {dayjs(record.receivedAt).format('DD MMM YYYY, hh:mm A')}
              </Descriptions.Item>
              {record.notes && (
                <Descriptions.Item label="Notes">
                  <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{record.notes}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        );

        return (
          <Popover
            content={popoverContent}
            title="Transaction Details"
            overlayStyle={{ maxWidth: '450px' }}
            trigger="hover"
            placement="left"
          >
            <InfoCircleOutlined style={{ color: '#1890ff', fontSize: '18px', cursor: 'pointer' }} />
          </Popover>
        );
      },
    },
  ];


  const handleExport = () => {
    // TODO: Implement CSV/PDF export
    message.info('Export feature coming soon');
  };

  return (
    <>
    <Layout className="revenue-details-wrapper" style={{ minHeight: '100vh', background: '#F5F7FF' }}>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <Sider
          width={80}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            background: '#fff',
            boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            borderRight: '1px solid #E5E7EB',
          }}
        >
          <HospitalSidebar selectedMenuKey="revenue" />
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title="Navigation"
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          styles={{ body: { padding: 0 } }}
          width={260}
        >
          <HospitalSidebar selectedMenuKey="revenue" onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: '#F5F7FF',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        {/* TopHeader - Matching Patient Dashboard Design */}
        <TopHeader
          userName={user?.fullName || 'Hospital Admin'}
          userRole="Hospital"
          userId={useMemo(() => {
            if (user?.id) {
              const year = new Date().getFullYear();
              const idNum = String(user.id).padStart(3, '0');
              return `HOS-${year}-${idNum}`;
            }
            return 'HOS-2024-001';
          }, [user?.id])}
          userInitials={useMemo(() => {
            if (user?.fullName) {
              const names = user.fullName.split(' ');
              if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
              }
              return user.fullName.substring(0, 2).toUpperCase();
            }
            return 'HA';
          }, [user?.fullName])}
          notificationCount={notifications.filter((n: any) => !n.isRead).length}
        />

        <Content
          style={{
            background: '#F5F7FF',
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
            // Responsive padding - reduced to save side space
            padding: isMobile 
              ? '12px 12px 16px'
              : isTablet 
                ? '12px 16px 20px'
                : '12px 16px 20px',
            display: 'flex',
            flexDirection: 'column',
            margin: 0,
            width: '100%',
          }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1,
            minHeight: 0,
          }}>
            {/* Mobile Menu Button */}
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 16 }}>
                <Button
                  type="text"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setMobileDrawerOpen(true)}
                  style={{ fontSize: '18px' }}
                />
              </div>
            )}

        {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                <DollarOutlined style={{ marginRight: 8 }} /> Revenue & Transactions
              </Title>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={() => { refetchStats(); refetchTransactions(); }}>
                  Refresh
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleExport} type="primary">
                  Export
                </Button>
              </Space>
            </div>

        {/* Revenue Statistics */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Daily Revenue"
                    value={stats?.daily || 0}
                    prefix="₹"
                    valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: 'bold' }}
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
                    valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: 'bold' }}
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
                    valueStyle={{ color: '#fa8c16', fontSize: '24px', fontWeight: 'bold' }}
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
                    valueStyle={{ color: '#722ed1', fontSize: '24px', fontWeight: 'bold' }}
                    loading={statsLoading}
                  />
                </Card>
              </Col>
            </Row>

        {/* Revenue Breakdown */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} md={12}>
                <Card title={<><FileTextOutlined style={{ marginRight: 8 }} /> Revenue by Source</>}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Appointments:</Text>
                      <Text strong>₹{revenueBySource?.appointment?.toFixed(2) || '0.00'}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">IPD:</Text>
                      <Text strong>₹{revenueBySource?.ipd?.toFixed(2) || '0.00'}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">OPD:</Text>
                      <Text strong>₹{revenueBySource?.opd?.toFixed(2) || '0.00'}</Text>
                    </div>
                    {(revenueBySource?.test || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">Tests:</Text>
                        <Text strong>₹{revenueBySource?.test?.toFixed(2) || '0.00'}</Text>
                      </div>
                    )}
                    {(revenueBySource?.pharmacy || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">Pharmacy:</Text>
                        <Text strong>₹{revenueBySource?.pharmacy?.toFixed(2) || '0.00'}</Text>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 8 }}>
                      <Text strong>Total:</Text>
                      <Text strong style={{ fontSize: 16 }}>₹{revenueBySource?.total?.toFixed(2) || '0.00'}</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title={<><FileTextOutlined style={{ marginRight: 8 }} /> Revenue by Payment Method</>}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {revenueByMethod && Object.entries(revenueByMethod)
                      .filter(([method, amount]: [string, any]) => method !== 'total' && amount > 0)
                      .map(([method, amount]: [string, any]) => (
                        <div key={method} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">{method.charAt(0).toUpperCase() + method.slice(1)}:</Text>
                          <Text strong>₹{amount.toFixed(2)}</Text>
                        </div>
                      ))}
                    {(!revenueByMethod || Object.keys(revenueByMethod).filter(key => key !== 'total').length === 0) && (
                      <Text type="secondary">No payment data available</Text>
                    )}
                    {revenueByMethod && revenueByMethod.total !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 8 }}>
                        <Text strong>Total:</Text>
                        <Text strong style={{ fontSize: 16 }}>₹{revenueByMethod.total.toFixed(2)}</Text>
                      </div>
                    )}
                  </Space>
                </Card>
              </Col>
            </Row>

        {/* Filters */}
            <Card style={{ marginBottom: 24 }}>
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
                    <Option value="gpay">Google Pay</Option>
                    <Option value="phonepe">PhonePe</Option>
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
                    <Option value="test">Tests</Option>
                    <Option value="pharmacy">Pharmacy</Option>
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
            <Card title={<><CalendarOutlined style={{ marginRight: 8 }} /> All Transactions</>}>
              <Tabs
                activeKey={activeTransactionTab}
                onChange={setActiveTransactionTab}
                items={transactionTabs.map(tab => ({
                  key: tab.key,
                  label: tab.label,
                }))}
                style={{ marginBottom: 16 }}
              />
              <Table
                columns={columns}
                dataSource={transactionsToShow}
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
    </div>
        </Content>
      </Layout>
    </Layout>
    </>
  );
}

