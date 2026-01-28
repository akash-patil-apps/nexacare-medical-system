import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Tabs,
  DatePicker,
  Select,
  Button,
  Table,
  Statistic,
  Row,
  Col,
  Space,
  Typography,
  Spin,
  message,
  Tag,
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  CalendarOutlined,
  DollarOutlined,
  ExperimentOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface ReportsPageProps {
  hospitalId?: number;
}

export default function ReportsPage({ hospitalId }: ReportsPageProps) {
  const [activeTab, setActiveTab] = useState<string>('opd');
  const [opdFilters, setOpdFilters] = useState<{
    dateFrom?: string;
    dateTo?: string;
    doctorId?: number;
  }>({});
  const [labFilters, setLabFilters] = useState<{
    dateFrom?: string;
    dateTo?: string;
  }>({});
  const [financeFilters, setFinanceFilters] = useState<{
    dateFrom?: string;
    dateTo?: string;
  }>({});
  const [ipdFilters, setIpdFilters] = useState<{
    date?: string;
  }>({});

  // Fetch doctors for OPD filter
  const { data: doctors = [] } = useQuery({
    queryKey: ['/api/doctors'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/doctors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch doctors');
      return response.json();
    },
  });

  // Fetch OPD report
  const {
    data: opdReport,
    isLoading: opdLoading,
    refetch: refetchOpd,
  } = useQuery({
    queryKey: ['/api/reports/opd', opdFilters],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams();
      if (opdFilters.dateFrom) params.append('dateFrom', opdFilters.dateFrom);
      if (opdFilters.dateTo) params.append('dateTo', opdFilters.dateTo);
      if (opdFilters.doctorId) params.append('doctorId', String(opdFilters.doctorId));

      const response = await fetch(`/api/reports/opd?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch OPD report');
      return response.json();
    },
    enabled: !!hospitalId,
  });

  // Fetch Lab report
  const {
    data: labReport,
    isLoading: labLoading,
    refetch: refetchLab,
  } = useQuery({
    queryKey: ['/api/reports/lab', labFilters],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams();
      if (labFilters.dateFrom) params.append('dateFrom', labFilters.dateFrom);
      if (labFilters.dateTo) params.append('dateTo', labFilters.dateTo);

      const response = await fetch(`/api/reports/lab?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch Lab report');
      return response.json();
    },
    enabled: !!hospitalId,
  });

  // Fetch Finance report
  const {
    data: financeReport,
    isLoading: financeLoading,
    refetch: refetchFinance,
  } = useQuery({
    queryKey: ['/api/reports/finance/opd', financeFilters],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams();
      if (financeFilters.dateFrom) params.append('dateFrom', financeFilters.dateFrom);
      if (financeFilters.dateTo) params.append('dateTo', financeFilters.dateTo);

      const response = await fetch(`/api/reports/finance/opd?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch Finance report');
      return response.json();
    },
    enabled: !!hospitalId,
  });

  // Fetch IPD census report
  const {
    data: ipdReport,
    isLoading: ipdLoading,
    refetch: refetchIpd,
  } = useQuery({
    queryKey: ['/api/reports/ipd/census', ipdFilters],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams();
      if (ipdFilters.date) params.append('date', ipdFilters.date);

      const response = await fetch(`/api/reports/ipd/census?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch IPD census report');
      return response.json();
    },
    enabled: !!hospitalId,
  });

  // Export handler
  const handleExport = async (type: string) => {
    try {
      const token = localStorage.getItem('auth-token');
      let params = new URLSearchParams();
      
      switch (type) {
        case 'opd':
          if (opdFilters.dateFrom) params.append('dateFrom', opdFilters.dateFrom);
          if (opdFilters.dateTo) params.append('dateTo', opdFilters.dateTo);
          if (opdFilters.doctorId) params.append('doctorId', String(opdFilters.doctorId));
          break;
        case 'lab':
          if (labFilters.dateFrom) params.append('dateFrom', labFilters.dateFrom);
          if (labFilters.dateTo) params.append('dateTo', labFilters.dateTo);
          break;
        case 'finance':
          if (financeFilters.dateFrom) params.append('dateFrom', financeFilters.dateFrom);
          if (financeFilters.dateTo) params.append('dateTo', financeFilters.dateTo);
          break;
      }

      const response = await fetch(`/api/reports/${type}/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to export report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `${type}-report.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('Report exported successfully');
    } catch (error: any) {
      console.error('Export error:', error);
      message.error(error.message || 'Failed to export report');
    }
  };

  // OPD Report Columns
  const opdColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Date',
      key: 'date',
      width: 120,
      render: (_: any, record: any) => {
        const date = record.appointmentDate instanceof Date 
          ? record.appointmentDate 
          : new Date(record.appointmentDate);
        return dayjs(date).format('DD MMM YYYY');
      },
    },
    {
      title: 'Patient ID',
      dataIndex: 'patientId',
      key: 'patientId',
      width: 100,
    },
    {
      title: 'Doctor ID',
      dataIndex: 'doctorId',
      key: 'doctorId',
      width: 100,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'walk-in' ? 'orange' : 'blue'}>
          {type?.toUpperCase() || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusColors: Record<string, string> = {
          'pending': 'orange',
          'confirmed': 'blue',
          'checked-in': 'cyan',
          'in_consultation': 'purple',
          'completed': 'green',
          'cancelled': 'red',
        };
        return (
          <Tag color={statusColors[status] || 'default'}>
            {status?.toUpperCase().replace('_', ' ') || 'PENDING'}
          </Tag>
        );
      },
    },
  ];

  // Lab Report Columns
  const labColumns = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 120,
    },
    {
      title: 'Patient ID',
      dataIndex: 'patientId',
      key: 'patientId',
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusColors: Record<string, string> = {
          'ordered': 'orange',
          'sample_collected': 'blue',
          'processing': 'purple',
          'completed': 'green',
          'released': 'cyan',
        };
        return (
          <Tag color={statusColors[status] || 'default'}>
            {status?.toUpperCase().replace('_', ' ') || 'N/A'}
          </Tag>
        );
      },
    },
    {
      title: 'Created',
      key: 'created',
      width: 150,
      render: (_: any, record: any) => {
        const date = record.createdAt instanceof Date 
          ? record.createdAt 
          : new Date(record.createdAt);
        return dayjs(date).format('DD MMM YYYY, HH:mm');
      },
    },
    {
      title: 'Released',
      key: 'released',
      width: 150,
      render: (_: any, record: any) => {
        if (!record.releasedAt) return <Text type="secondary">-</Text>;
        const date = record.releasedAt instanceof Date 
          ? record.releasedAt 
          : new Date(record.releasedAt);
        return dayjs(date).format('DD MMM YYYY, HH:mm');
      },
    },
  ];

  // Finance Report Columns
  const financeColumns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 120,
    },
    {
      title: 'Patient ID',
      dataIndex: 'patientId',
      key: 'patientId',
      width: 100,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      render: (total: string) => `₹${parseFloat(total || '0').toLocaleString()}`,
    },
    {
      title: 'Paid',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 120,
      render: (paid: string) => `₹${parseFloat(paid || '0').toLocaleString()}`,
    },
    {
      title: 'Balance',
      dataIndex: 'balanceAmount',
      key: 'balanceAmount',
      width: 120,
      render: (balance: string) => `₹${parseFloat(balance || '0').toLocaleString()}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusColors: Record<string, string> = {
          'paid': 'green',
          'partially_paid': 'orange',
          'issued': 'blue',
          'draft': 'default',
        };
        return (
          <Tag color={statusColors[status] || 'default'}>
            {status?.toUpperCase().replace('_', ' ') || 'N/A'}
          </Tag>
        );
      },
    },
    {
      title: 'Created',
      key: 'created',
      width: 150,
      render: (_: any, record: any) => {
        const date = record.createdAt instanceof Date 
          ? record.createdAt 
          : new Date(record.createdAt);
        return dayjs(date).format('DD MMM YYYY, HH:mm');
      },
    },
  ];

  // IPD Report Columns
  const ipdColumns = [
    {
      title: 'Encounter ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: 'Patient ID',
      dataIndex: 'patientId',
      key: 'patientId',
      width: 100,
    },
    {
      title: 'Admitted',
      key: 'admitted',
      width: 150,
      render: (_: any, record: any) => {
        const date = record.admittedAt instanceof Date 
          ? record.admittedAt 
          : new Date(record.admittedAt);
        return dayjs(date).format('DD MMM YYYY, HH:mm');
      },
    },
    {
      title: 'Discharged',
      key: 'discharged',
      width: 150,
      render: (_: any, record: any) => {
        if (!record.dischargedAt) return <Text type="secondary">-</Text>;
        const date = record.dischargedAt instanceof Date 
          ? record.dischargedAt 
          : new Date(record.dischargedAt);
        return dayjs(date).format('DD MMM YYYY, HH:mm');
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusColors: Record<string, string> = {
          'admitted': 'blue',
          'discharged': 'green',
          'LAMA': 'orange',
          'death': 'red',
          'absconded': 'red',
        };
        return (
          <Tag color={statusColors[status] || 'default'}>
            {status?.toUpperCase() || 'N/A'}
          </Tag>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '16px', background: '#F6F2FF', minHeight: '100%' }}>
      <Card
        variant="borderless"
        style={{
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid #E5E7EB',
          background: '#fff',
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'opd',
              label: (
                <Space>
                  <CalendarOutlined />
                  OPD Report
                </Space>
              ),
              children: (
                <div>
                  {/* Filters */}
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <Space wrap>
                      <RangePicker
                        onChange={(dates) => {
                          if (dates && dates[0] && dates[1]) {
                            setOpdFilters({
                              ...opdFilters,
                              dateFrom: dates[0].format('YYYY-MM-DD'),
                              dateTo: dates[1].format('YYYY-MM-DD'),
                            });
                          } else {
                            setOpdFilters({
                              ...opdFilters,
                              dateFrom: undefined,
                              dateTo: undefined,
                            });
                          }
                        }}
                        format="DD MMM YYYY"
                      />
                      <Select
                        placeholder="Filter by Doctor"
                        style={{ width: 200 }}
                        allowClear
                        onChange={(value) => {
                          setOpdFilters({
                            ...opdFilters,
                            doctorId: value,
                          });
                        }}
                      >
                        {doctors.map((doc: any) => (
                          <Select.Option key={doc.id} value={doc.id}>
                            {doc.user?.fullName || `Doctor ${doc.id}`}
                          </Select.Option>
                        ))}
                      </Select>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => refetchOpd()}
                      >
                        Refresh
                      </Button>
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => handleExport('opd')}
                      >
                        Export CSV
                      </Button>
                    </Space>
                  </Card>

                  {/* Statistics */}
                  {opdReport?.statistics && (
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Total Appointments"
                            value={opdReport.statistics.total}
                            prefix={<CalendarOutlined />}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Completed"
                            value={opdReport.statistics.completed}
                            valueStyle={{ color: '#3f8600' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Pending"
                            value={opdReport.statistics.pending}
                            valueStyle={{ color: '#cf1322' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="No Shows"
                            value={opdReport.statistics.noShow || 0}
                            valueStyle={{ color: '#faad14' }}
                          />
                        </Card>
                      </Col>
                    </Row>
                  )}

                  {/* Table */}
                  <Table
                    columns={opdColumns}
                    dataSource={opdReport?.appointments || []}
                    loading={opdLoading}
                    rowKey="id"
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              ),
            },
            {
              key: 'lab',
              label: (
                <Space>
                  <ExperimentOutlined />
                  Lab Report
                </Space>
              ),
              children: (
                <div>
                  {/* Filters */}
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <Space wrap>
                      <RangePicker
                        onChange={(dates) => {
                          if (dates && dates[0] && dates[1]) {
                            setLabFilters({
                              dateFrom: dates[0].format('YYYY-MM-DD'),
                              dateTo: dates[1].format('YYYY-MM-DD'),
                            });
                          } else {
                            setLabFilters({});
                          }
                        }}
                        format="DD MMM YYYY"
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => refetchLab()}
                      >
                        Refresh
                      </Button>
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => handleExport('lab')}
                      >
                        Export CSV
                      </Button>
                    </Space>
                  </Card>

                  {/* Statistics */}
                  {labReport?.statistics && (
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Total Orders"
                            value={labReport.statistics.total}
                            prefix={<ExperimentOutlined />}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Completed"
                            value={labReport.statistics.completed}
                            valueStyle={{ color: '#3f8600' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Processing"
                            value={labReport.statistics.processing}
                            valueStyle={{ color: '#1890ff' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Avg TAT (hours)"
                            value={labReport.tat?.average?.toFixed(1) || 0}
                            valueStyle={{ color: '#722ed1' }}
                            suffix="hrs"
                          />
                        </Card>
                      </Col>
                    </Row>
                  )}

                  {/* Table */}
                  <Table
                    columns={labColumns}
                    dataSource={labReport?.orders || []}
                    loading={labLoading}
                    rowKey="id"
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              ),
            },
            {
              key: 'finance',
              label: (
                <Space>
                  <DollarOutlined />
                  Finance Report
                </Space>
              ),
              children: (
                <div>
                  {/* Filters */}
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <Space wrap>
                      <RangePicker
                        onChange={(dates) => {
                          if (dates && dates[0] && dates[1]) {
                            setFinanceFilters({
                              dateFrom: dates[0].format('YYYY-MM-DD'),
                              dateTo: dates[1].format('YYYY-MM-DD'),
                            });
                          } else {
                            setFinanceFilters({});
                          }
                        }}
                        format="DD MMM YYYY"
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => refetchFinance()}
                      >
                        Refresh
                      </Button>
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => handleExport('finance')}
                      >
                        Export CSV
                      </Button>
                    </Space>
                  </Card>

                  {/* Statistics */}
                  {financeReport?.statistics && (
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Total Billed"
                            value={financeReport.statistics.totalBilled}
                            prefix="₹"
                            precision={2}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Total Paid"
                            value={financeReport.statistics.totalPaid}
                            prefix="₹"
                            precision={2}
                            valueStyle={{ color: '#3f8600' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Outstanding"
                            value={financeReport.statistics.outstandingBalance}
                            prefix="₹"
                            precision={2}
                            valueStyle={{ color: '#cf1322' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Total Invoices"
                            value={financeReport.statistics.invoiceCount}
                          />
                        </Card>
                      </Col>
                    </Row>
                  )}

                  {/* Table */}
                  <Table
                    columns={financeColumns}
                    dataSource={financeReport?.invoices || []}
                    loading={financeLoading}
                    rowKey="id"
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              ),
            },
            {
              key: 'ipd',
              label: (
                <Space>
                  <HomeOutlined />
                  IPD Census
                </Space>
              ),
              children: (
                <div>
                  {/* Filters */}
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <Space wrap>
                      <DatePicker
                        placeholder="Select Date"
                        defaultValue={dayjs()}
                        onChange={(date) => {
                          setIpdFilters({
                            date: date ? date.format('YYYY-MM-DD') : undefined,
                          });
                        }}
                        format="DD MMM YYYY"
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => refetchIpd()}
                      >
                        Refresh
                      </Button>
                    </Space>
                  </Card>

                  {/* Statistics */}
                  {ipdReport?.statistics && (
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Active Encounters"
                            value={ipdReport.statistics.totalActive}
                            prefix={<HomeOutlined />}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Admissions (Date)"
                            value={ipdReport.statistics.admissionsOnDate}
                            valueStyle={{ color: '#1890ff' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Discharges (Date)"
                            value={ipdReport.statistics.dischargesOnDate}
                            valueStyle={{ color: '#3f8600' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card>
                          <Statistic
                            title="Bed Occupancy"
                            value={Object.keys(ipdReport.statistics.bedOccupancy || {}).length}
                            suffix="beds"
                          />
                        </Card>
                      </Col>
                    </Row>
                  )}

                  {/* Table */}
                  <Table
                    columns={ipdColumns}
                    dataSource={ipdReport?.activeEncounters || []}
                    loading={ipdLoading}
                    rowKey="id"
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
