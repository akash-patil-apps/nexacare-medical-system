// client/src/pages/ipd/bed-management.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, Select, message, Badge, Row, Col, Statistic } from 'antd';
import { HomeOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function BedManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch bed structure
  const { data: structure, isLoading } = useQuery({
    queryKey: ['/api/ipd/structure'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/ipd/structure');
      return res.json();
    },
  });

  // Calculate statistics
  const stats = {
    total: structure?.beds?.length || 0,
    available: structure?.beds?.filter((b: any) => b.status === 'available').length || 0,
    occupied: structure?.beds?.filter((b: any) => b.status === 'occupied').length || 0,
    cleaning: structure?.beds?.filter((b: any) => b.status === 'cleaning').length || 0,
    blocked: structure?.beds?.filter((b: any) => b.status === 'blocked').length || 0,
    maintenance: structure?.beds?.filter((b: any) => b.status === 'maintenance').length || 0,
  };

  const filteredBeds = structure?.beds?.filter((bed: any) => {
    if (statusFilter === 'all') return true;
    return bed.status === statusFilter;
  }) || [];

  const columns = [
    {
      title: 'Bed Number',
      dataIndex: 'bedNumber',
      key: 'bedNumber',
      render: (text: string, record: any) => (
        <Space>
          <Text strong>{text}</Text>
          {record.bedName && <Text type="secondary">({record.bedName})</Text>}
        </Space>
      ),
    },
    {
      title: 'Room',
      key: 'room',
      render: (_: any, record: any) => (
        <Text>{record.room?.roomNumber || record.room?.name || 'N/A'}</Text>
      ),
    },
    {
      title: 'Ward',
      key: 'ward',
      render: (_: any, record: any) => (
        <Text>{record.room?.ward?.name || 'N/A'}</Text>
      ),
    },
    {
      title: 'Floor',
      key: 'floor',
      render: (_: any, record: any) => (
        <Text>{record.room?.ward?.floor?.floorNumber || 'N/A'}</Text>
      ),
    },
    {
      title: 'Bed Type',
      dataIndex: 'bedType',
      key: 'bedType',
      render: (type: string) => <Tag>{type || 'Standard'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: any = {
          available: 'green',
          occupied: 'red',
          cleaning: 'orange',
          blocked: 'red',
          maintenance: 'purple',
        };
        return <Tag color={colors[status] || 'default'}>{status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: any, record: any) => {
        // This would need to be fetched from bed allocations
        return <Text type="secondary">-</Text>;
      },
    },
  ];

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              <HomeOutlined /> Bed Management
            </Title>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] })}
            >
              Refresh
            </Button>
          </div>

          {/* Statistics */}
          <Row gutter={16}>
            <Col xs={12} sm={8} md={4}>
              <Card>
                <Statistic title="Total Beds" value={stats.total} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card>
                <Statistic title="Available" value={stats.available} valueStyle={{ color: '#3f8600' }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card>
                <Statistic title="Occupied" value={stats.occupied} valueStyle={{ color: '#cf1322' }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card>
                <Statistic title="Cleaning" value={stats.cleaning} valueStyle={{ color: '#fa8c16' }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card>
                <Statistic title="Blocked" value={stats.blocked} valueStyle={{ color: '#cf1322' }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card>
                <Statistic title="Maintenance" value={stats.maintenance} valueStyle={{ color: '#722ed1' }} />
              </Card>
            </Col>
          </Row>

          {/* Filter */}
          <Space>
            <Text strong>Filter by Status:</Text>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
            >
              <Option value="all">All Status</Option>
              <Option value="available">Available</Option>
              <Option value="occupied">Occupied</Option>
              <Option value="cleaning">Cleaning</Option>
              <Option value="blocked">Blocked</Option>
              <Option value="maintenance">Maintenance</Option>
            </Select>
          </Space>

          {/* Beds Table */}
          <Table
            columns={columns}
            dataSource={filteredBeds}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 20 }}
          />
        </Space>
      </Card>
    </div>
  );
}
