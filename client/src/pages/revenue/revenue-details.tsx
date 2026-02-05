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
  
  // Sidebar content component - matching hospital dashboard
  const SidebarContent = ({ onMenuClick }: { onMenuClick?: () => void }) => {
    const handleMenuClick = (key: string) => {
      if (onMenuClick) onMenuClick();
      switch (key) {
        case 'dashboard':
          setLocation('/dashboard/hospital');
          break;
        case 'doctors':
          message.info('Doctors page coming soon.');
          break;
        case 'patients':
          message.info('Patients page coming soon.');
          break;
        case 'appointments':
          message.info('Appointments page coming soon.');
          break;
        case 'reports':
          message.info('Lab Reports page coming soon.');
          break;
        case 'revenue':
          setLocation('/dashboard/hospital/revenue');
          break;
        default:
          break;
      }
    };

    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        background: '#fff',
        width: '80px',
        alignItems: 'center',
        padding: '16px 0',
        gap: '12px',
        borderRight: '1px solid #E5E7EB',
      }}>
        <Button
          type="text"
          icon={<UserOutlined style={{ fontSize: '20px', color: '#1A8FE3' }} />}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#E3F2FF',
            borderRadius: '8px',
          }}
          onClick={() => window.location.href = '/dashboard/profile'}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, alignItems: 'center' }}>
          <Button
            type="text"
            icon={<BankOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('dashboard')}
          />
          <Button
            type="text"
            icon={<TeamOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('doctors')}
          />
          <Button
            type="text"
            icon={<UserOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('patients')}
          />
          <Button
            type="text"
            icon={<CalendarOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('appointments')}
          />
          <Button
            type="text"
            icon={<FileTextOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('reports')}
          />
          <Button
            type="text"
            icon={<BarChartOutlined style={{ fontSize: '20px', color: '#1A8FE3' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#E3F2FF',
              borderRadius: '8px',
            }}
            onClick={() => handleMenuClick('revenue')}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => message.info('Notifications coming soon.')}
          />
          <Button
            type="text"
            icon={<SettingOutlined style={{ fontSize: '20px', color: '#6B7280' }} />}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => message.info('Settings coming soon.')}
          />
        </div>
      </div>
    );
  };

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
      title: <span style={{ color: '#FFFFFF' }}>Date & Time</span>,
      dataIndex: 'receivedAt',
      key: 'receivedAt',
      width: 180,
      render: (date: string) => <span style={{ color: '#CCCCCC' }}>{dayjs(date).format('DD MMM YYYY, hh:mm A')}</span>,
      sorter: (a, b) => dayjs(a.receivedAt).unix() - dayjs(b.receivedAt).unix(),
    },
    {
      title: <span style={{ color: '#FFFFFF' }}>Amount</span>,
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => (
        <Text strong style={{ color: '#22C55E', fontSize: '16px' }}>₹{amount.toFixed(2)}</Text>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: <span style={{ color: '#FFFFFF' }}>Payment Method</span>,
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
      title: <span style={{ color: '#FFFFFF' }}>Source</span>,
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
      title: <span style={{ color: '#FFFFFF' }}>Invoice</span>,
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 180,
      render: (invoice: string) => <span style={{ color: '#CCCCCC', fontFamily: 'monospace', fontSize: '12px' }}>{invoice || 'N/A'}</span>,
    },
    {
      title: <span style={{ color: '#FFFFFF' }}>Transaction ID</span>,
      dataIndex: 'transactionId',
      key: 'transactionId',
      width: 200,
      render: (id: string) => <span style={{ color: '#CCCCCC', fontFamily: 'monospace', fontSize: '12px' }}>{id || '-'}</span>,
    },
    {
      title: <span style={{ color: '#FFFFFF' }}>Status</span>,
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
      title: <span style={{ color: '#FFFFFF' }}>Details</span>,
      key: 'details',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: RevenueTransaction) => {
        const popoverContent = (
          <div style={{ maxWidth: '400px' }}>
            <Descriptions
              column={1}
              size="small"
              labelStyle={{ color: '#CCCCCC', fontWeight: 600, width: '140px' }}
              contentStyle={{ color: '#FFFFFF' }}
            >
              <Descriptions.Item label="Transaction ID">
                <Space>
                  <Text style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{record.transactionId || 'N/A'}</Text>
                  {record.transactionId && record.transactionId !== 'N/A' && (
                    <CopyIcon text={record.transactionId} label="Transaction ID" style={{ color: '#FFFFFF' }} />
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Number">
                <Space>
                  <Text style={{ color: '#FFFFFF' }}>{record.invoiceNumber || 'N/A'}</Text>
                  {record.invoiceNumber && record.invoiceNumber !== 'N/A' && (
                    <CopyIcon text={record.invoiceNumber} label="Invoice Number" style={{ color: '#FFFFFF' }} />
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <Text strong style={{ color: '#22C55E', fontSize: '16px' }}>₹{record.amount.toFixed(2)}</Text>
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
                <Text style={{ color: '#FFFFFF' }}>
                  {dayjs(record.receivedAt).format('DD MMM YYYY, hh:mm A')}
                </Text>
              </Descriptions.Item>
              {record.notes && (
                <Descriptions.Item label="Notes">
                  <Text style={{ color: '#CCCCCC', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {record.notes}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        );

        return (
          <Popover
            content={popoverContent}
            title={
              <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
                Transaction Details
              </span>
            }
            overlayStyle={{ maxWidth: '450px' }}
            overlayInnerStyle={{ 
              background: '#2A2A2A', 
              border: '1px solid #3A3A3A',
              borderRadius: '8px',
            }}
            trigger="hover"
            placement="left"
          >
            <InfoCircleOutlined 
              style={{ 
                color: '#1A8FE3', 
                fontSize: '18px', 
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#4A9EFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#1A8FE3';
              }}
            />
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
      <style>{`
        .date-header-row {
          background: #1A1A1A !important;
        }
        .date-header-row:hover {
          background: #1A1A1A !important;
        }
        .date-header-row td {
          border-bottom: 1px solid #3A3A3A !important;
          padding: 12px 16px !important;
        }
        /* Override medical-container padding for revenue page */
        body:has(.revenue-details-wrapper) .medical-container {
          padding: 0 !important;
          display: block !important;
          align-items: unset !important;
          justify-content: unset !important;
          background: transparent !important;
          min-height: 100vh !important;
        }
        .dark-select-dropdown .ant-select-dropdown {
          background: #2A2A2A !important;
        }
        .dark-select-dropdown .ant-select-item {
          color: #FFFFFF !important;
        }
        .dark-select-dropdown .ant-select-item:hover {
          background: #3A3A3A !important;
        }
        .dark-select-dropdown .ant-select-item-selected {
          background: #3A3A3A !important;
        }
        .ant-table {
          background: #2A2A2A !important;
        }
        .ant-table-thead > tr > th {
          background: #2A2A2A !important;
          border-bottom: 1px solid #3A3A3A !important;
        }
        .ant-table-tbody > tr > td {
          background: #2A2A2A !important;
          border-bottom: 1px solid #3A3A3A !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: #3A3A3A !important;
        }
        .ant-pagination {
          color: #CCCCCC !important;
        }
        .ant-pagination-item {
          background: #2A2A2A !important;
          border-color: #3A3A3A !important;
        }
        .ant-pagination-item a {
          color: #CCCCCC !important;
        }
        .ant-pagination-item-active {
          background: #3A3A3A !important;
        }
        .ant-pagination-item-active a {
          color: #FFFFFF !important;
        }
      `}</style>
    <Layout className="revenue-details-wrapper" style={{ minHeight: '100vh', background: '#1A1A1A' }}>
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
          <SidebarContent />
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
          <SidebarContent onMenuClick={() => setMobileDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: siderWidth,
          minHeight: '100vh',
          background: '#1A1A1A', // Dark background
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
            background: '#1A1A1A', // Dark background
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
              <Title level={2} style={{ margin: 0, color: '#FFFFFF' }}>
                <DollarOutlined style={{ marginRight: 8 }} /> Revenue & Transactions
          </Title>
          <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={() => { refetchStats(); refetchTransactions(); }}
                  style={{ background: '#2A2A2A', borderColor: '#3A3A3A', color: '#FFFFFF' }}
                >
              Refresh
            </Button>
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={handleExport}
                  style={{ background: '#2A2A2A', borderColor: '#3A3A3A', color: '#FFFFFF' }}
                >
              Export
            </Button>
          </Space>
        </div>

        {/* Revenue Statistics */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ background: '#2A2A2A', borderColor: '#3A3A3A' }}>
              <Statistic
                title={<span style={{ color: '#CCCCCC' }}>Daily Revenue</span>}
                value={stats?.daily || 0}
                prefix="₹"
                valueStyle={{ color: '#22C55E', fontSize: '24px', fontWeight: 'bold' }}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ background: '#2A2A2A', borderColor: '#3A3A3A' }}>
              <Statistic
                title={<span style={{ color: '#CCCCCC' }}>Weekly Revenue</span>}
                value={stats?.weekly || 0}
                prefix="₹"
                valueStyle={{ color: '#3B82F6', fontSize: '24px', fontWeight: 'bold' }}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ background: '#2A2A2A', borderColor: '#3A3A3A' }}>
              <Statistic
                title={<span style={{ color: '#CCCCCC' }}>Monthly Revenue</span>}
                value={stats?.monthly || 0}
                prefix="₹"
                valueStyle={{ color: '#EF4444', fontSize: '24px', fontWeight: 'bold' }}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ background: '#2A2A2A', borderColor: '#3A3A3A' }}>
              <Statistic
                title={<span style={{ color: '#CCCCCC' }}>Total Revenue</span>}
                value={stats?.total || 0}
                prefix="₹"
                valueStyle={{ color: '#A855F7', fontSize: '24px', fontWeight: 'bold' }}
                loading={statsLoading}
              />
            </Card>
          </Col>
        </Row>

        {/* Revenue Breakdown */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} md={12}>
            <Card 
              title={
                <span style={{ color: '#FFFFFF' }}>
                  <FileTextOutlined style={{ marginRight: 8 }} /> Revenue by Source
                </span>
              }
              style={{ background: '#2A2A2A', borderColor: '#3A3A3A' }}
              headStyle={{ background: '#2A2A2A', borderBottom: '1px solid #3A3A3A' }}
              bodyStyle={{ background: '#2A2A2A' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#CCCCCC' }}>Appointments:</Text>
                  <Text strong style={{ color: '#FFFFFF' }}>₹{revenueBySource?.appointment?.toFixed(2) || '0.00'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#CCCCCC' }}>IPD:</Text>
                  <Text strong style={{ color: '#FFFFFF' }}>₹{revenueBySource?.ipd?.toFixed(2) || '0.00'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#CCCCCC' }}>OPD:</Text>
                  <Text strong style={{ color: '#FFFFFF' }}>₹{revenueBySource?.opd?.toFixed(2) || '0.00'}</Text>
                </div>
                {(revenueBySource?.test || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#CCCCCC' }}>Tests:</Text>
                    <Text strong style={{ color: '#FFFFFF' }}>₹{revenueBySource?.test?.toFixed(2) || '0.00'}</Text>
                  </div>
                )}
                {(revenueBySource?.pharmacy || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#CCCCCC' }}>Pharmacy:</Text>
                    <Text strong style={{ color: '#FFFFFF' }}>₹{revenueBySource?.pharmacy?.toFixed(2) || '0.00'}</Text>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #3A3A3A', paddingTop: 8, marginTop: 8 }}>
                  <Text strong style={{ color: '#FFFFFF' }}>Total:</Text>
                  <Text strong style={{ fontSize: 16, color: '#FFFFFF' }}>₹{revenueBySource?.total?.toFixed(2) || '0.00'}</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card 
              title={
                <span style={{ color: '#FFFFFF' }}>
                  <FileTextOutlined style={{ marginRight: 8 }} /> Revenue by Payment Method
                </span>
              }
              style={{ background: '#2A2A2A', borderColor: '#3A3A3A' }}
              headStyle={{ background: '#2A2A2A', borderBottom: '1px solid #3A3A3A' }}
              bodyStyle={{ background: '#2A2A2A' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {revenueByMethod && Object.entries(revenueByMethod)
                  .filter(([method, amount]: [string, any]) => method !== 'total' && amount > 0)
                  .map(([method, amount]: [string, any]) => (
                    <div key={method} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#CCCCCC' }}>{method.charAt(0).toUpperCase() + method.slice(1)}:</Text>
                      <Text strong style={{ color: '#FFFFFF' }}>₹{amount.toFixed(2)}</Text>
                    </div>
                  ))}
                {(!revenueByMethod || Object.keys(revenueByMethod).filter(key => key !== 'total').length === 0) && (
                  <Text style={{ color: '#888888' }}>No payment data available</Text>
                )}
                {revenueByMethod && revenueByMethod.total !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #3A3A3A', paddingTop: 8, marginTop: 8 }}>
                    <Text strong style={{ color: '#FFFFFF' }}>Total:</Text>
                    <Text strong style={{ fontSize: 16, color: '#FFFFFF' }}>₹{revenueByMethod.total.toFixed(2)}</Text>
                  </div>
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Filters */}
            <Card 
              style={{ background: '#2A2A2A', borderColor: '#3A3A3A', marginBottom: 24 }}
              bodyStyle={{ background: '#2A2A2A' }}
            >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Text strong style={{ color: '#FFFFFF' }}>Date Range:</Text>
              <RangePicker
                style={{ width: '100%', marginTop: 8 }}
                value={dateRange as any}
                onChange={(dates) => setDateRange(dates as any)}
                format="DD/MM/YYYY"
                popupStyle={{ background: '#2A2A2A' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong style={{ color: '#FFFFFF' }}>Payment Method:</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                value={paymentMethodFilter}
                onChange={setPaymentMethodFilter}
                popupClassName="dark-select-dropdown"
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
              <Text strong style={{ color: '#FFFFFF' }}>Source:</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                value={sourceFilter}
                onChange={setSourceFilter}
                popupClassName="dark-select-dropdown"
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
              <Text strong style={{ color: '#FFFFFF' }}>Search:</Text>
              <Input
                style={{ marginTop: 8, background: '#1A1A1A', borderColor: '#3A3A3A', color: '#FFFFFF' }}
                placeholder="Invoice, Transaction ID, Notes..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
          </Row>
        </Card>

        {/* Transactions Table */}
            <Card 
              title={
                <span style={{ color: '#FFFFFF' }}>
                  <CalendarOutlined style={{ marginRight: 8 }} /> All Transactions
                </span>
              }
              style={{ background: '#2A2A2A', borderColor: '#3A3A3A' }}
              headStyle={{ background: '#2A2A2A', borderBottom: '1px solid #3A3A3A' }}
              bodyStyle={{ background: '#2A2A2A' }}
            >
          <Tabs
            activeKey={activeTransactionTab}
            onChange={setActiveTransactionTab}
            items={transactionTabs.map(tab => ({
              key: tab.key,
              label: tab.label,
            }))}
            style={{ marginBottom: 16 }}
            tabBarStyle={{ 
              background: '#2A2A2A',
              borderBottom: '1px solid #3A3A3A',
              marginBottom: 0
            }}
          />
          <Table
            columns={columns}
            dataSource={transactionsToShow}
            loading={transactionsLoading}
            rowKey="id"
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
                  showTotal: (total) => <span style={{ color: '#CCCCCC' }}>Total {total} transactions</span>,
            }}
            scroll={{ x: 1200 }}
                style={{ background: '#2A2A2A' }}
          />
        </Card>
    </div>
        </Content>
      </Layout>
    </Layout>
    </>
  );
}
