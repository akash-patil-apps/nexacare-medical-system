import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  message,
  Row,
  Col,
  Alert,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

export default function PharmacyInventory() {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<{ lowStock?: boolean; expired?: boolean }>({});
  const [addStockModalOpen, setAddStockModalOpen] = useState(false);
  const [adjustStockModalOpen, setAdjustStockModalOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<any>(null);
  const [form] = Form.useForm();
  const [adjustForm] = Form.useForm();

  // Fetch inventory
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['/api/pharmacy/inventory', filters, searchText],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      if (filters.lowStock) params.append('lowStock', 'true');
      if (filters.expired) params.append('expired', 'true');

      const res = await apiRequest('GET', `/api/pharmacy/inventory?${params.toString()}`);
      return res.json();
    },
  });

  // Fetch medicines for dropdown
  const { data: medicines = [], isLoading: isLoadingMedicines, error: medicinesError } = useQuery({
    queryKey: ['/api/medicines'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/medicines?limit=500');
        const data = await res.json();
        // Ensure we always return an array
        return Array.isArray(data) ? data : [];
      } catch (error: any) {
        console.error('Error fetching medicines:', error);
        // Return empty array on error to prevent component crash
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Fetch alerts
  const { data: lowStockAlerts = [] } = useQuery({
    queryKey: ['/api/pharmacy/inventory/alerts/low-stock'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/pharmacy/inventory/alerts/low-stock');
      return res.json();
    },
  });

  const { data: expiryAlerts = [] } = useQuery({
    queryKey: ['/api/pharmacy/inventory/alerts/expiry'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/pharmacy/inventory/alerts/expiry');
      return res.json();
    },
  });

  // Add stock mutation
  const addStockMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/pharmacy/inventory/add-stock', data);
      return res.json();
    },
    onSuccess: () => {
      message.success('Stock added successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacy/inventory'] });
      setAddStockModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to add stock');
    },
  });

  // Adjust stock mutation
  const adjustStockMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(
        'POST',
        `/api/pharmacy/inventory/${selectedInventory?.id}/reduce-stock`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      message.success('Stock adjusted successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacy/inventory'] });
      setAdjustStockModalOpen(false);
      adjustForm.resetFields();
      setSelectedInventory(null);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to adjust stock');
    },
  });

  const handleAddStock = async (values: any) => {
    await addStockMutation.mutate({
      medicineCatalogId: values.medicineCatalogId,
      batchNumber: values.batchNumber,
      expiryDate: values.expiryDate.toISOString(),
      quantity: values.quantity,
      unit: values.unit,
      purchasePrice: values.purchasePrice,
      sellingPrice: values.sellingPrice,
      mrp: values.mrp,
      location: values.location,
      reorderLevel: values.reorderLevel || 10,
      minStockLevel: values.minStockLevel || 5,
      maxStockLevel: values.maxStockLevel,
      reason: values.reason || 'Manual stock addition',
    });
  };

  const handleAdjustStock = async (values: any) => {
    await adjustStockMutation.mutate({
      quantity: values.quantity,
      movementType: values.movementType,
      reason: values.reason,
    });
  };

  const columns = [
    {
      title: 'Medicine',
      dataIndex: ['medicine', 'name'],
      key: 'medicine',
      render: (_: any, record: any) => (
        <div>
          <Text strong>{record.medicine?.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Batch: {record.batchNumber}
          </Text>
        </div>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number, record: any) => (
        <div>
          <Text strong>{quantity}</Text> <Text type="secondary">{record.unit}</Text>
          {record.isLowStock && (
            <Tag color="orange" icon={<WarningOutlined />} style={{ marginLeft: 8 }}>
              Low Stock
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Expiry',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (date: string, record: any) => {
        if (!date) return '-';
        const expiry = dayjs(date);
        const isExpired = expiry.isBefore(dayjs());
        const isExpiringSoon = expiry.diff(dayjs(), 'days') <= 30;

        return (
          <div>
            <Text>{expiry.format('DD MMM YYYY')}</Text>
            {isExpired && <Tag color="red" style={{ marginLeft: 8 }}>Expired</Tag>}
            {!isExpired && isExpiringSoon && (
              <Tag color="orange" style={{ marginLeft: 8 }}>Expiring Soon</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Price',
      key: 'price',
      render: (_: any, record: any) => (
        <div>
          {record.sellingPrice && (
            <div>
              <Text>₹{parseFloat(record.sellingPrice).toFixed(2)}</Text>
            </div>
          )}
          {record.mrp && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              MRP: ₹{parseFloat(record.mrp).toFixed(2)}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (loc: string) => loc || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedInventory(record);
              setAdjustStockModalOpen(true);
            }}
          >
            Adjust
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="pharmacy-inventory-wrapper" style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>
              Pharmacy Inventory
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddStockModalOpen(true)}
            >
              Add Stock
            </Button>
          </div>

          {/* Alerts */}
          {medicinesError && (
            <Alert
              message="Failed to load medicines"
              description="Please refresh the page or try again later."
              type="error"
              showIcon
              closable
            />
          )}
          {(lowStockAlerts.length > 0 || expiryAlerts.length > 0) && (
            <Alert
              message={`${lowStockAlerts.length} low stock items, ${expiryAlerts.length} expiring soon`}
              type="warning"
              showIcon
              closable
            />
          )}

          {/* Filters */}
          <Row gutter={16}>
            <Col span={8}>
              <Input
                placeholder="Search medicines or batch number"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="Filter"
                style={{ width: '100%' }}
                allowClear
                onChange={(value) => setFilters({ ...filters, lowStock: value === 'lowStock' })}
              >
                <Option value="lowStock">Low Stock</Option>
                <Option value="expired">Expired</Option>
              </Select>
            </Col>
          </Row>

          {/* Inventory Table */}
          <Table
            columns={columns}
            dataSource={inventory}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 20 }}
          />
        </Space>
      </Card>

      {/* Add Stock Modal */}
      <Modal
        title="Add Stock"
        open={addStockModalOpen}
        onCancel={() => {
          setAddStockModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleAddStock}>
          <Form.Item
            name="medicineCatalogId"
            label="Medicine"
            rules={[{ required: true, message: 'Please select a medicine' }]}
          >
            <Select
              placeholder={isLoadingMedicines ? "Loading medicines..." : "Select medicine"}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.children).toLowerCase().includes(input.toLowerCase())
              }
              loading={isLoadingMedicines}
              disabled={isLoadingMedicines || !!medicinesError}
            >
              {Array.isArray(medicines) && medicines.length > 0 ? medicines.map((med: any) => (
                <Option key={med.id} value={med.id}>
                  {med.name}
                </Option>
              )) : (
                <Option disabled value="">
                  {medicinesError ? "Error loading medicines" : "No medicines available"}
                </Option>
              )}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="batchNumber"
                label="Batch Number"
                rules={[{ required: true, message: 'Please enter batch number' }]}
              >
                <Input placeholder="Batch number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryDate"
                label="Expiry Date"
                rules={[{ required: true, message: 'Please select expiry date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="Quantity"
                rules={[{ required: true, message: 'Please enter quantity' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Unit"
                rules={[{ required: true, message: 'Please enter unit' }]}
              >
                <Select placeholder="Select unit">
                  <Option value="tablet">Tablet</Option>
                  <Option value="capsule">Capsule</Option>
                  <Option value="ml">ML</Option>
                  <Option value="vial">Vial</Option>
                  <Option value="bottle">Bottle</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="purchasePrice" label="Purchase Price">
                <InputNumber min={0} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sellingPrice" label="Selling Price">
                <InputNumber min={0} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="mrp" label="MRP">
                <InputNumber min={0} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="location" label="Storage Location">
            <Input placeholder="e.g., Rack A-1" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="reorderLevel" label="Reorder Level">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minStockLevel" label="Min Stock Level">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxStockLevel" label="Max Stock Level">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="reason" label="Reason">
            <Input.TextArea rows={2} placeholder="Reason for adding stock" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={addStockMutation.isPending}
              >
                Add Stock
              </Button>
              <Button onClick={() => setAddStockModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        title="Adjust Stock"
        open={adjustStockModalOpen}
        onCancel={() => {
          setAdjustStockModalOpen(false);
          adjustForm.resetFields();
          setSelectedInventory(null);
        }}
        footer={null}
      >
        {selectedInventory && (
          <Form form={adjustForm} layout="vertical" onFinish={handleAdjustStock}>
            <Alert
              message={`Current Stock: ${selectedInventory.quantity} ${selectedInventory.unit}`}
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              name="quantity"
              label="Quantity to Adjust"
              rules={[{ required: true, message: 'Please enter quantity' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="movementType"
              label="Adjustment Type"
              rules={[{ required: true, message: 'Please select type' }]}
            >
              <Select>
                <Option value="adjustment">Adjustment</Option>
                <Option value="expiry">Expiry</Option>
                <Option value="damage">Damage</Option>
                <Option value="return">Return</Option>
              </Select>
            </Form.Item>

            <Form.Item name="reason" label="Reason">
              <Input.TextArea rows={3} placeholder="Reason for adjustment" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={adjustStockMutation.isPending}
                >
                  Adjust Stock
                </Button>
                <Button onClick={() => setAdjustStockModalOpen(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
