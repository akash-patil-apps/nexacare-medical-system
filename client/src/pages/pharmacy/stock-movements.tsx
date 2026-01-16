import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Table,
  Space,
  Typography,
  Tag,
  DatePicker,
  Select,
  Input,
  Row,
  Col,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function StockMovements() {
  const [filters, setFilters] = useState<{
    inventoryId?: number;
    movementType?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  // Fetch stock movements
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['/api/pharmacy/inventory/movements', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.inventoryId) params.append('inventoryId', filters.inventoryId.toString());
      if (filters.movementType) params.append('movementType', filters.movementType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await apiRequest('GET', `/api/pharmacy/inventory/movements?${params.toString()}`);
      return res.json();
    },
  });

  const getMovementTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      purchase: 'green',
      sale: 'red',
      adjustment: 'orange',
      expiry: 'red',
      damage: 'red',
      return: 'blue',
      transfer: 'cyan',
    };
    return colors[type] || 'default';
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Medicine',
      key: 'medicine',
      render: (_: any, record: any) => (
        <Text>{record.inventory?.medicine?.name || 'N/A'}</Text>
      ),
    },
    {
      title: 'Batch Number',
      key: 'batchNumber',
      render: (_: any, record: any) => (
        <Text>{record.inventory?.batchNumber || '-'}</Text>
      ),
    },
    {
      title: 'Movement Type',
      dataIndex: 'movementType',
      key: 'movementType',
      render: (type: string) => (
        <Tag color={getMovementTypeColor(type)}>{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number) => (
        <Text strong style={{ color: qty > 0 ? 'green' : 'red' }}>
          {qty > 0 ? '+' : ''}{qty} {qty !== 0 ? (qty === 1 ? 'unit' : 'units') : ''}
        </Text>
      ),
    },
    {
      title: 'Reference',
      key: 'reference',
      render: (_: any, record: any) => (
        <Text type="secondary">
          {record.referenceType || '-'} {record.referenceId ? `#${record.referenceId}` : ''}
        </Text>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) => reason || '-',
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>
              Stock Movement History
            </Title>
          </div>

          {/* Filters */}
          <Row gutter={16}>
            <Col span={6}>
              <Select
                placeholder="Movement Type"
                style={{ width: '100%' }}
                allowClear
                onChange={(value) => setFilters({ ...filters, movementType: value })}
              >
                <Option value="purchase">Purchase</Option>
                <Option value="sale">Sale</Option>
                <Option value="adjustment">Adjustment</Option>
                <Option value="expiry">Expiry</Option>
                <Option value="damage">Damage</Option>
                <Option value="return">Return</Option>
                <Option value="transfer">Transfer</Option>
              </Select>
            </Col>
            <Col span={8}>
              <RangePicker
                style={{ width: '100%' }}
                onChange={(dates) => {
                  if (dates) {
                    setFilters({
                      ...filters,
                      startDate: dates[0]?.toISOString(),
                      endDate: dates[1]?.toISOString(),
                    });
                  } else {
                    setFilters({
                      ...filters,
                      startDate: undefined,
                      endDate: undefined,
                    });
                  }
                }}
              />
            </Col>
          </Row>

          <Table
            columns={columns}
            dataSource={movements}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 20 }}
          />
        </Space>
      </Card>
    </div>
  );
}
