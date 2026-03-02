// client/src/pages/lab/result-entry.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, message, Badge, Checkbox } from 'antd';
import { ExperimentOutlined, PlusOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';

const { Title, Text } = Typography;
const { TextArea } = Input;

type ResultTemplateParam = {
  id: number;
  parameterName: string;
  unit?: string;
  normalRange?: string;
  sortOrder: number;
  isRequired: boolean;
  referenceRangesByGroup?: Array<{ group: string; unit?: string; normalRange: string }>;
};

type ResultTemplate = {
  labTest: { id: number; name: string; code?: string; category?: string };
  parameters: ResultTemplateParam[];
};

export default function LabResultEntry() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<{ order: any; item: any } | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [form] = Form.useForm();

  const catalogId = selectedOrder?.item?.labTestCatalogId ?? selectedOrder?.item?.test?.id ?? null;

  // Fetch orders for result entry (sample collected)
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/lab-workflow/orders/for-result-entry'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/lab-workflow/orders/for-result-entry');
      return res.json();
    },
  });

  // Fetch result template when modal opens with a catalog id
  const { data: resultTemplate, isLoading: templateLoading } = useQuery({
    queryKey: ['/api/lab-tests', catalogId, 'result-template'],
    queryFn: async (): Promise<ResultTemplate> => {
      const res = await apiRequest('GET', `/api/lab-tests/${catalogId}/result-template`);
      return res.json();
    },
    enabled: !!catalogId && resultModalVisible,
  });

  const hasTemplate = !!resultTemplate?.parameters?.length;
  const templateParams = resultTemplate?.parameters ?? [];

  // Enter result mutation (single parameter or one of many in template mode)
  const enterResultMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/lab-workflow/results', data);
      return res.json();
    },
    onSuccess: (_data, _variables, context?: { skipClose?: boolean }) => {
      if (!context?.skipClose) {
        message.success('Result entered successfully');
        queryClient.invalidateQueries({ queryKey: ['/api/lab-workflow/orders/for-result-entry'] });
        setResultModalVisible(false);
        form.resetFields();
        setSelectedOrder(null);
      }
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to enter result');
    },
  });

  const handleEnterResult = (order: any, item: any) => {
    setSelectedOrder({ order, item });
    form.resetFields();
    setResultModalVisible(true);
  };

  const onEnterResultSingle = async (values: any) => {
    await enterResultMutation.mutateAsync({
      labOrderItemId: selectedOrder!.item.id,
      testName: selectedOrder!.item.testName,
      parameterName: values.parameterName,
      resultValue: values.resultValue,
      unit: values.unit,
      normalRange: values.normalRange,
      isAbnormal: values.isAbnormal || false,
      notes: values.notes,
    });
  };

  const onEnterResultTemplate = async (values: any) => {
    const results = values.parameterResults as Array<{ parameterName: string; resultValue: string; unit?: string; normalRange?: string; isAbnormal?: boolean }>;
    for (const row of results) {
      if (row?.resultValue == null || String(row.resultValue).trim() === '') continue;
      await enterResultMutation.mutateAsync(
        {
          labOrderItemId: selectedOrder!.item.id,
          testName: selectedOrder!.item.testName,
          parameterName: row.parameterName,
          resultValue: String(row.resultValue).trim(),
          unit: row.unit,
          normalRange: row.normalRange,
          isAbnormal: row.isAbnormal || false,
          notes: values.notes,
        },
        { context: { skipClose: true } }
      );
    }
    message.success('Results entered successfully');
    queryClient.invalidateQueries({ queryKey: ['/api/lab-workflow/orders/for-result-entry'] });
    setResultModalVisible(false);
    form.resetFields();
    setSelectedOrder(null);
  };

  const columns = [
    {
      title: 'Order Number',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: any, record: any) => (
        <Text>{record.patient?.fullName || 'N/A'}</Text>
      ),
    },
    {
      title: 'Tests',
      key: 'items',
      render: (_: any, record: any) => (
        <Space direction="vertical" size="small">
          {record.items?.map((item: any) => (
            <div key={item.id}>
              <Tag color="green">{item.testName}</Tag>
              {item.status === 'sample_collected' && (
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleEnterResult(record, item)}
                >
                  Enter Result
                </Button>
              )}
            </div>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: any = {
          sample_collected: 'green',
          processing: 'orange',
          completed: 'green',
        };
        return <Tag color={colors[status] || 'default'}>{status?.replace('_', ' ').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              <ExperimentOutlined /> Result Entry
            </Title>
            <Badge count={orders.length} showZero>
              <Button type="primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/lab-workflow/orders/for-result-entry'] })}>
                Refresh
              </Button>
            </Badge>
          </div>

          <Table
            columns={columns}
            dataSource={orders}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Space>
      </Card>

      <Modal
        title="Enter Test Result"
        open={resultModalVisible}
        onCancel={() => {
          setResultModalVisible(false);
          form.resetFields();
          setSelectedOrder(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={enterResultMutation.isPending}
        width={hasTemplate ? 720 : 600}
        okText="Submit"
      >
        {templateLoading ? (
          <div style={{ padding: 24, textAlign: 'center' }}>Loading template…</div>
        ) : hasTemplate ? (
          <Form
            form={form}
            onFinish={onEnterResultTemplate}
            layout="vertical"
            initialValues={{
              parameterResults: templateParams.map((p) => ({
                parameterName: p.parameterName,
                unit: p.unit ?? '',
                normalRange: p.normalRange ?? '',
                resultValue: '',
                isAbnormal: false,
              })),
            }}
          >
            <Form.Item label="Test Name">
              <Input value={selectedOrder?.item?.testName ?? selectedOrder?.item?.test?.name} disabled />
            </Form.Item>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">Enter values for each parameter. Optional parameters can be left blank.</Text>
            </div>
            {templateParams.map((p, index) => (
              <div key={p.id} style={{ marginBottom: 16 }}>
                <Form.Item name={['parameterResults', index, 'parameterName']} hidden>
                  <Input />
                </Form.Item>
                <Form.Item name={['parameterResults', index, 'unit']} hidden>
                  <Input />
                </Form.Item>
                <Form.Item name={['parameterResults', index, 'normalRange']} hidden>
                  <Input />
                </Form.Item>
                <div style={{ marginBottom: 4 }}>
                  <Text strong>{p.parameterName}</Text>
                  {p.unit && <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>({p.unit})</Text>}
                  {p.normalRange && <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>Ref: {p.normalRange}</Text>}
                </div>
                <Space align="center">
                  <Form.Item
                    name={['parameterResults', index, 'resultValue']}
                    label="Value"
                    rules={p.isRequired ? [{ required: true, message: `Enter ${p.parameterName}` }] : undefined}
                    style={{ marginBottom: 0, minWidth: 140 }}
                  >
                    <Input placeholder={p.unit ? `Enter value in ${p.unit}` : 'Enter value'} />
                  </Form.Item>
                  <Form.Item name={['parameterResults', index, 'isAbnormal']} valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Checkbox>Abnormal</Checkbox>
                  </Form.Item>
                </Space>
              </div>
            ))}
            <Form.Item name="notes" label="Notes">
              <TextArea rows={2} placeholder="Any additional notes" />
            </Form.Item>
          </Form>
        ) : (
          <Form form={form} onFinish={onEnterResultSingle} layout="vertical">
            <Form.Item label="Test Name">
              <Input value={selectedOrder?.item?.testName ?? selectedOrder?.item?.test?.name} disabled />
            </Form.Item>
            <Form.Item
              name="parameterName"
              label="Parameter Name"
              rules={[{ required: true, message: 'Please enter parameter name' }]}
            >
              <Input placeholder="e.g., WBC, RBC, Hemoglobin, etc." />
            </Form.Item>
            <Form.Item
              name="resultValue"
              label="Result Value"
              rules={[{ required: true, message: 'Please enter result value' }]}
            >
              <Input placeholder="Enter the test result" />
            </Form.Item>
            <Form.Item name="unit" label="Unit">
              <Input placeholder="e.g., g/dL, mg/dL, cells/μL, etc." />
            </Form.Item>
            <Form.Item name="normalRange" label="Normal Range">
              <Input placeholder="e.g., 4.5-11.0, 12-16, etc." />
            </Form.Item>
            <Form.Item name="isAbnormal" valuePropName="checked" label="Abnormal Result">
              <Checkbox>Abnormal</Checkbox>
            </Form.Item>
            <Form.Item name="notes" label="Notes">
              <TextArea rows={3} placeholder="Any additional notes about the result" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
