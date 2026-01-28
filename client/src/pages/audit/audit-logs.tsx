import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Table,
  DatePicker,
  Select,
  Button,
  Space,
  Typography,
  Tag,
  Spin,
  message,
} from 'antd';
import {
  ReloadOutlined,
  AuditOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useAuth } from '../../hooks/use-auth';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface AuditLogRow {
  id: number;
  hospitalId: number | null;
  patientId: number | null;
  actorUserId: number;
  actorRole: string;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  summary?: string | null;
  reason?: string | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [entityFilter, setEntityFilter] = useState<string | undefined>();
  const [roleFilter, setRoleFilter] = useState<string | undefined>();

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('dateFrom', dateRange[0].startOf('day').toISOString());
      params.append('dateTo', dateRange[1].endOf('day').toISOString());
    }
    if (actionFilter) params.append('action', actionFilter);
    if (entityFilter) params.append('entityType', entityFilter);
    if (roleFilter) params.append('actorRole', roleFilter);
    params.append('limit', '200');
    return params.toString();
  };

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<{ data: AuditLogRow[] }>({
    queryKey: ['audit-logs', dateRange, actionFilter, entityFilter, roleFilter],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const qs = buildQueryString();
      const res = await fetch(`/api/audit?${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load audit logs');
      }
      return res.json();
    },
    enabled: !!user && (!!dateRange),
    keepPreviousData: true,
  });

  const logs = data?.data || [];

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const qs = buildQueryString();
      const res = await fetch(`/api/audit/export?${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to export audit logs');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${dayjs().format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export audit logs error:', err);
      message.error(err.message || 'Failed to export audit logs');
    }
  };

  const columns = [
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#999' }} />
          <span>{dayjs(value).format('DD MMM YYYY, HH:mm')}</span>
        </Space>
      ),
    },
    {
      title: 'User',
      dataIndex: 'actorName',
      key: 'actor',
      width: 200,
      render: (_: any, row: AuditLogRow) => (
        <Space direction="vertical" size={0}>
          <Space size={6}>
            <UserOutlined style={{ color: '#1890ff' }} />
            <Text strong>{row.actorName || `User #${row.actorUserId}`}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.actorRole}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 180,
      render: (value: string) => (
        <Tag color="geekblue">
          {value.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Entity',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 160,
      render: (_: any, row: AuditLogRow) => (
        <span>
          <Text>{row.entityType}</Text>
          {row.entityId ? (
            <Text type="secondary" style={{ marginLeft: 4 }}>
              #{row.entityId}
            </Text>
          ) : null}
        </span>
      ),
    },
    {
      title: 'Patient',
      dataIndex: 'patientId',
      key: 'patientId',
      width: 120,
      render: (value: number | null) =>
        value ? <Text>#{value}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Summary',
      dataIndex: 'summary',
      key: 'summary',
      render: (value: string | null, row: AuditLogRow) => (
        <div>
          <Text>{value || `${row.action} on ${row.entityType}`}</Text>
          {row.reason && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Reason: {row.reason}
              </Text>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <Card
      variant="borderless"
      style={{
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #E5E7EB',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <Space
        align="center"
        style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}
      >
        <Space align="center">
          <AuditOutlined style={{ fontSize: 20, color: '#7C3AED' }} />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Audit Logs
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Track high‑risk actions across hospital dashboards
            </Text>
          </div>
        </Space>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isFetching}
          >
            Refresh
          </Button>
          <Button onClick={handleExport}>
            Export CSV
          </Button>
        </Space>
      </Space>

      {/* Filters */}
      <Space
        wrap
        style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}
      >
        <Space wrap>
          <RangePicker
            value={dateRange as any}
            onChange={(val) => setDateRange(val as [Dayjs, Dayjs] | null)}
            allowClear={false}
            format="DD MMM YYYY"
          />
          <Select
            allowClear
            placeholder="Filter by role"
            style={{ minWidth: 160 }}
            onChange={(val) => setRoleFilter(val)}
            options={[
              { label: 'Receptionist', value: 'RECEPTIONIST' },
              { label: 'Doctor', value: 'DOCTOR' },
              { label: 'Nurse', value: 'NURSE' },
              { label: 'Hospital Admin', value: 'HOSPITAL' },
              { label: 'Admin', value: 'ADMIN' },
              { label: 'Lab', value: 'LAB' },
              { label: 'Pharmacist', value: 'PHARMACIST' },
            ]}
          />
          <Select
            allowClear
            placeholder="Filter by action"
            style={{ minWidth: 200 }}
            onChange={(val) => setActionFilter(val)}
            options={[
              { label: 'Appointment confirmed', value: 'APPOINTMENT_CONFIRMED' },
              { label: 'Vitals recorded', value: 'VITALS_RECORDED' },
              { label: 'Prescription created', value: 'PRESCRIPTION_CREATED' },
              { label: 'Payment recorded', value: 'record_payment' },
              { label: 'Bed created', value: 'BED_CREATED' },
            ]}
          />
          <Select
            allowClear
            placeholder="Filter by entity"
            style={{ minWidth: 180 }}
            onChange={(val) => setEntityFilter(val)}
            options={[
              { label: 'Appointment', value: 'appointment' },
              { label: 'Vitals', value: 'vitals_chart' },
              { label: 'Prescription', value: 'prescription' },
              { label: 'Payment', value: 'payment' },
              { label: 'Bed', value: 'bed' },
            ]}
          />
        </Space>
      </Space>

      {/* Table */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">Loading audit logs...</Text>
            </div>
          </div>
        ) : (
          <Table
            size="small"
            rowKey="id"
            columns={columns as any}
            dataSource={logs}
            pagination={{ pageSize: 25, showSizeChanger: false }}
            scroll={{ x: 'max-content', y: 'calc(100vh - 480px)' }}
          />
        )}
      </div>
    </Card>
  );
}

