import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  message,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Title } = Typography;

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [form] = Form.useForm();

  // Fetch suppliers
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['/api/pharmacy/suppliers'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/pharmacy/suppliers');
      return res.json();
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/pharmacy/suppliers', data);
      return res.json();
    },
    onSuccess: () => {
      message.success(editingSupplier ? 'Supplier updated successfully' : 'Supplier created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/pharmacy/suppliers'] });
      setModalOpen(false);
      form.resetFields();
      setEditingSupplier(null);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to save supplier');
    },
  });

  const handleSubmit = async (values: any) => {
    await saveMutation.mutateAsync(values);
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    form.setFieldsValue(supplier);
    setModalOpen(true);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Contact Person',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      render: (text: string) => text || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => text || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string) => text || '-',
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      render: (text: string) => text || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
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
              Suppliers
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                setEditingSupplier(null);
                setModalOpen(true);
              }}
            >
              Add Supplier
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={suppliers}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 20 }}
          />
        </Space>
      </Card>

      {/* Add/Edit Supplier Modal */}
      <Modal
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditingSupplier(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Supplier Name"
            rules={[{ required: true, message: 'Please enter supplier name' }]}
          >
            <Input placeholder="Supplier name" />
          </Form.Item>

          <Form.Item
            name="contactPerson"
            label="Contact Person"
          >
            <Input placeholder="Contact person name" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: 'email', message: 'Invalid email' }]}
              >
                <Input placeholder="email@example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone"
              >
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="Address"
          >
            <Input.TextArea rows={2} placeholder="Street address" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="city"
                label="City"
              >
                <Input placeholder="City" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="state"
                label="State"
              >
                <Input placeholder="State" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="zipCode"
                label="ZIP Code"
              >
                <Input placeholder="ZIP code" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="gstNumber"
            label="GST Number"
          >
            <Input placeholder="GST number" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
                {editingSupplier ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
