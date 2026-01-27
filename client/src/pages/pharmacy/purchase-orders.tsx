import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  InputNumber,
  Input,
  DatePicker,
  message,
  Row,
  Col,
  Select,
  Descriptions,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [form] = Form.useForm();
  const [receiveForm] = Form.useForm();

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['/api/pharmacy/purchase-orders'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/pharmacy/purchase-orders');
      return res.json();
    },
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['/api/pharmacy/suppliers'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/pharmacy/suppliers');
      return res.json();
    },
  });

  // Fetch medicines
  const { data: medicines = [], isLoading: isLoadingMedicines, error: medicinesError } = useQuery({
    queryKey: ['/api/medicines'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/medicines?limit=500');
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error: any) {
        console.error('Error fetching medicines:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Create PO mutation
  const createPOMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/pharmacy/purchase-orders', data);
      return res.json();
    },
    onSuccess: () => {
      message.success('Purchase order created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacy/purchase-orders'] });
      setCreateModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create purchase order');
    },
  });

  // Receive PO mutation
  const receivePOMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', `/api/pharmacy/purchase-orders/${selectedPO?.id}/receive`, data);
      return res.json();
    },
    onSuccess: () => {
      message.success('Purchase order received successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacy/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacy/inventory'] });
      setReceiveModalOpen(false);
      receiveForm.resetFields();
      setSelectedPO(null);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to receive purchase order');
    },
  });

  const handleCreatePO = async (values: any) => {
    const items = form.getFieldValue('items') || [];
    if (items.length === 0) {
      message.error('Please add at least one item');
      return;
    }

    await createPOMutation.mutateAsync({
      supplierId: values.supplierId,
      orderDate: values.orderDate?.toISOString(),
      expectedDeliveryDate: values.expectedDeliveryDate?.toISOString(),
      items: items.map((item: any) => ({
        medicineCatalogId: item.medicineCatalogId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate?.toISOString(),
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
      })),
      notes: values.notes,
    });
  };

  const handleReceivePO = async (values: any) => {
    const items = receiveForm.getFieldValue('items') || [];
    await receivePOMutation.mutateAsync({
      items: items.map((item: any) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        receivedQuantity: item.receivedQuantity,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate?.toISOString(),
      })),
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      approved: 'blue',
      ordered: 'cyan',
      received: 'green',
      cancelled: 'red',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'PO Number',
      dataIndex: 'poNumber',
      key: 'poNumber',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_: any, record: any) => (
        <Text>{record.supplier?.name || 'N/A'}</Text>
      ),
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Expected Delivery',
      dataIndex: 'expectedDeliveryDate',
      key: 'expectedDeliveryDate',
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Total Amount',
      dataIndex: 'finalAmount',
      key: 'finalAmount',
      render: (amount: string) => `₹${parseFloat(amount || '0').toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedPO(record);
              setViewModalOpen(true);
            }}
          >
            View
          </Button>
          {record.status === 'ordered' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setSelectedPO(record);
                receiveForm.setFieldsValue({
                  items: record.items?.map((item: any) => ({
                    purchaseOrderItemId: item.id,
                    receivedQuantity: item.quantity - (item.receivedQuantity || 0),
                    batchNumber: item.batchNumber,
                    expiryDate: item.expiryDate ? dayjs(item.expiryDate) : null,
                  })) || [],
                });
                setReceiveModalOpen(true);
              }}
            >
              Receive
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>
              Purchase Orders
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                form.setFieldsValue({ items: [] });
                setCreateModalOpen(true);
              }}
            >
              Create Purchase Order
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={purchaseOrders}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 20 }}
          />
        </Space>
      </Card>

      {/* Create PO Modal */}
      <Modal
        title="Create Purchase Order"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleCreatePO}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplierId"
                label="Supplier"
                rules={[{ required: true, message: 'Please select supplier' }]}
              >
                <Select placeholder="Select supplier">
                  {suppliers.map((supplier: any) => (
                    <Option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="orderDate"
                label="Order Date"
                rules={[{ required: true, message: 'Please select order date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="expectedDeliveryDate"
            label="Expected Delivery Date"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Items">
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <Card key={field.key} size="small" style={{ marginBottom: 16 }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'medicineCatalogId']}
                            label="Medicine"
                            rules={[{ required: true }]}
                          >
                            <Select placeholder="Select medicine" showSearch>
                              {medicines.map((med: any) => (
                                <Option key={med.id} value={med.id}>
                                  {med.name}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'quantity']}
                            label="Quantity"
                            rules={[{ required: true }]}
                          >
                            <InputNumber min={1} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'unit']}
                            label="Unit"
                            rules={[{ required: true }]}
                          >
                            <Select placeholder="Unit">
                              <Option value="tablet">Tablet</Option>
                              <Option value="capsule">Capsule</Option>
                              <Option value="bottle">Bottle</Option>
                              <Option value="vial">Vial</Option>
                              <Option value="strip">Strip</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'unitPrice']}
                            label="Unit Price"
                            rules={[{ required: true }]}
                          >
                            <InputNumber min={0} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Button
                            type="link"
                            danger
                            onClick={() => remove(field.name)}
                            style={{ marginTop: 30 }}
                          >
                            Remove
                          </Button>
                        </Col>
                      </Row>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'batchNumber']}
                            label="Batch Number"
                          >
                            <Input placeholder="Batch number" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'expiryDate']}
                            label="Expiry Date"
                          >
                            <DatePicker style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Add Item
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Additional notes" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createPOMutation.isPending}>
                Create Purchase Order
              </Button>
              <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View PO Modal */}
      <Modal
        title={`Purchase Order: ${selectedPO?.poNumber}`}
        open={viewModalOpen}
        onCancel={() => {
          setViewModalOpen(false);
          setSelectedPO(null);
        }}
        footer={null}
        width={800}
      >
        {selectedPO && (
          <>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="PO Number">{selectedPO.poNumber}</Descriptions.Item>
              <Descriptions.Item label="Supplier">{selectedPO.supplier?.name}</Descriptions.Item>
              <Descriptions.Item label="Order Date">
                {dayjs(selectedPO.orderDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Expected Delivery">
                {selectedPO.expectedDeliveryDate ? dayjs(selectedPO.expectedDeliveryDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedPO.status)}>{selectedPO.status.toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                ₹{parseFloat(selectedPO.finalAmount || '0').toFixed(2)}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Items</Divider>
            <Table
              columns={[
                { title: 'Medicine', key: 'medicine', render: (_: any, item: any) => item.medicineName || 'N/A' },
                { title: 'Quantity', dataIndex: 'quantity' },
                { title: 'Unit', dataIndex: 'unit' },
                { title: 'Unit Price', dataIndex: 'unitPrice', render: (price: string) => `₹${parseFloat(price || '0').toFixed(2)}` },
                { title: 'Total', dataIndex: 'totalPrice', render: (price: string) => `₹${parseFloat(price || '0').toFixed(2)}` },
              ]}
              dataSource={selectedPO.items || []}
              pagination={false}
              size="small"
            />
          </>
        )}
      </Modal>

      {/* Receive PO Modal */}
      <Modal
        title={`Receive Purchase Order: ${selectedPO?.poNumber}`}
        open={receiveModalOpen}
        onCancel={() => {
          setReceiveModalOpen(false);
          receiveForm.resetFields();
          setSelectedPO(null);
        }}
        footer={null}
        width={800}
      >
        <Form form={receiveForm} layout="vertical" onFinish={handleReceivePO}>
          <Form.Item label="Items">
            <Form.List name="items">
              {(fields) => (
                <>
                  {fields.map((field, index) => {
                    const item = selectedPO?.items?.[index];
                    return (
                      <Card key={field.key} size="small" style={{ marginBottom: 16 }}>
                        <Text strong>{item?.medicineName || 'Item'}</Text>
                        <Row gutter={16} style={{ marginTop: 8 }}>
                          <Col span={6}>
                            <Form.Item
                              {...field}
                              name={[field.name, 'receivedQuantity']}
                              label="Received Quantity"
                              rules={[{ required: true }]}
                            >
                              <InputNumber min={1} max={item?.quantity} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item
                              {...field}
                              name={[field.name, 'batchNumber']}
                              label="Batch Number"
                            >
                              <Input placeholder="Batch number" />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item
                              {...field}
                              name={[field.name, 'expiryDate']}
                              label="Expiry Date"
                            >
                              <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={receivePOMutation.isPending}>
                Receive Order
              </Button>
              <Button onClick={() => setReceiveModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
