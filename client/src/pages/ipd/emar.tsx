// client/src/pages/ipd/emar.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, Select, message, Badge, Tabs, TimePicker } from 'antd';
import { MedicineBoxOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { apiRequest } from '../../lib/queryClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface EMARProps {
  encounterId?: number;
  nurseId?: number;
}

export default function EMAR({ encounterId, nurseId }: EMARProps) {
  const queryClient = useQueryClient();
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('due');

  // Fetch medications due
  const { data: medicationsDue = [], isLoading } = useQuery({
    queryKey: ['/api/ipd-workflow/emar/medications-due', encounterId, nurseId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (encounterId) params.append('encounterId', encounterId.toString());
      if (nurseId) params.append('nurseId', nurseId.toString());
      const res = await apiRequest('GET', `/api/ipd-workflow/emar/medications-due?${params.toString()}`);
      return res.json();
    },
  });

  // Fetch medication history
  const { data: history = [] } = useQuery({
    queryKey: ['/api/ipd-workflow/emar/history', encounterId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (encounterId) params.append('encounterId', encounterId.toString());
      const res = await apiRequest('GET', `/api/ipd-workflow/emar/history?${params.toString()}`);
      return res.json();
    },
  });

  // Record administration mutation
  const recordAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/ipd-workflow/emar/administrations', data);
      return res.json();
    },
    onSuccess: () => {
      message.success('Medication administration recorded');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd-workflow/emar/medications-due'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ipd-workflow/emar/history'] });
      setAdminModalVisible(false);
      form.resetFields();
      setSelectedMedication(null);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to record administration');
    },
  });

  const handleRecordAdmin = (medication: any, status: 'given' | 'omitted') => {
    setSelectedMedication({ ...medication, adminStatus: status });
    form.setFieldsValue({
      doseGiven: medication.dosage,
      route: medication.route,
      administeredAt: dayjs(),
    });
    setAdminModalVisible(true);
  };

  const onRecordAdmin = async (values: any) => {
    await recordAdminMutation.mutateAsync({
      medicationOrderId: selectedMedication.id,
      encounterId: selectedMedication.encounter?.id || encounterId,
      patientId: selectedMedication.patient?.id,
      administeredAt: values.administeredAt?.toDate() || new Date(),
      doseGiven: values.doseGiven,
      route: values.route,
      notes: values.notes,
      reasonForOmission: selectedMedication.adminStatus === 'omitted' ? values.reasonForOmission : undefined,
    });
  };

  const dueColumns = [
    {
      title: 'Medication',
      dataIndex: 'medicationName',
      key: 'medicationName',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Dosage',
      key: 'dosage',
      render: (_: any, record: any) => (
        <Text>{record.dosage} {record.unit}</Text>
      ),
    },
    {
      title: 'Route',
      dataIndex: 'route',
      key: 'route',
    },
    {
      title: 'Frequency',
      dataIndex: 'frequency',
      key: 'frequency',
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_: any, record: any) => (
        <Text>{record.patient?.fullName || 'N/A'}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'isDue',
      render: (_: any, record: any) => (
        <Tag color={record.isDue ? 'red' : 'green'}>
          {record.isDue ? 'Due' : 'Given'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {record.isDue && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleRecordAdmin(record, 'given')}
              >
                Given
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleRecordAdmin(record, 'omitted')}
              >
                Omitted
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const historyColumns = [
    {
      title: 'Medication',
      key: 'medication',
      render: (_: any, record: any) => (
        <Text strong>{record.order?.medicationName || 'N/A'}</Text>
      ),
    },
    {
      title: 'Dose Given',
      dataIndex: 'doseGiven',
      key: 'doseGiven',
    },
    {
      title: 'Route',
      dataIndex: 'routeUsed',
      key: 'routeUsed',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: any = {
          given: 'green',
          missed: 'red',
          held: 'orange',
          refused: 'red',
        };
        return <Tag color={colors[status] || 'default'}>{status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Administered At',
      dataIndex: 'administeredAt',
      key: 'administeredAt',
      render: (date: string) => date ? new Date(date).toLocaleString() : 'N/A',
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (text: string) => <Text type="secondary">{text || '-'}</Text>,
    },
  ];

  const dueMedications = medicationsDue.filter((m: any) => m.isDue);
  const givenMedications = medicationsDue.filter((m: any) => !m.isDue);

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              <MedicineBoxOutlined /> eMAR - Medication Administration
            </Title>
            <Space>
              <Badge count={dueMedications.length} showZero>
                <Tag color="red">Due: {dueMedications.length}</Tag>
              </Badge>
              <Badge count={givenMedications.length} showZero>
                <Tag color="green">Given: {givenMedications.length}</Tag>
              </Badge>
            </Space>
          </div>

          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane
              tab={
                <span>
                  Due Medications <Badge count={dueMedications.length} style={{ marginLeft: 8 }} />
                </span>
              }
              key="due"
            >
              <Table
                columns={dueColumns}
                dataSource={dueMedications}
                loading={isLoading}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </TabPane>

            <TabPane
              tab={
                <span>
                  Given Today <Badge count={givenMedications.length} style={{ marginLeft: 8 }} />
                </span>
              }
              key="given"
            >
              <Table
                columns={dueColumns}
                dataSource={givenMedications}
                loading={isLoading}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </TabPane>

            <TabPane
              tab={
                <span>
                  History <Badge count={history.length} style={{ marginLeft: 8 }} />
                </span>
              }
              key="history"
            >
              <Table
                columns={historyColumns}
                dataSource={history}
                loading={isLoading}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
          </Tabs>
        </Space>
      </Card>

      <Modal
        title={selectedMedication?.adminStatus === 'omitted' ? 'Record Medication Omission' : 'Record Medication Administration'}
        open={adminModalVisible}
        onCancel={() => {
          setAdminModalVisible(false);
          form.resetFields();
          setSelectedMedication(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={recordAdminMutation.isPending}
      >
        <Form form={form} onFinish={onRecordAdmin} layout="vertical">
          <Form.Item label="Medication">
            <Input value={selectedMedication?.medicationName} disabled />
          </Form.Item>
          <Form.Item
            name="doseGiven"
            label="Dose Given"
            rules={[{ required: true, message: 'Please enter dose given' }]}
          >
            <Input placeholder="e.g., 500mg" />
          </Form.Item>
          <Form.Item
            name="route"
            label="Route"
            rules={[{ required: true, message: 'Please select route' }]}
          >
            <Select>
              <Option value="oral">Oral</Option>
              <Option value="IV">IV</Option>
              <Option value="IM">IM</Option>
              <Option value="SC">SC</Option>
              <Option value="topical">Topical</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="administeredAt"
            label="Administered At"
            rules={[{ required: true, message: 'Please select time' }]}
          >
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          {selectedMedication?.adminStatus === 'omitted' && (
            <Form.Item
              name="reasonForOmission"
              label="Reason for Omission"
              rules={[{ required: true, message: 'Please enter reason' }]}
            >
              <TextArea rows={2} placeholder="Why was the medication omitted?" />
            </Form.Item>
          )}
          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Any additional notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
