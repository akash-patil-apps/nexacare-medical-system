import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Form,
  Input,
  InputNumber,
  TimePicker,
  Select,
  DatePicker,
  Modal,
  message,
  Tag,
  Typography,
  Divider,
  Popconfirm,
  Switch,
} from 'antd';
import { BulkRescheduleModal } from './BulkRescheduleModal';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

interface AvailabilityManagerProps {
  doctorId: number;
  hospitalId?: number;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const AvailabilityManager: React.FC<AvailabilityManagerProps> = ({
  doctorId,
  hospitalId,
}) => {
  const queryClient = useQueryClient();
  const [ruleForm] = Form.useForm();
  const [exceptionForm] = Form.useForm();
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [isBulkRescheduleModalOpen, setIsBulkRescheduleModalOpen] = useState(false);
  const [impactedAppointments, setImpactedAppointments] = useState<any[]>([]);
  const [leaveDateForReschedule, setLeaveDateForReschedule] = useState<string>('');

  // Fetch availability rules
  const { data: rules = [], isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ['/api/availability/doctor', doctorId],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/availability/doctor/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch availability rules');
      return response.json();
    },
  });

  // Fetch exceptions (next 90 days)
  const dateTo = dayjs().add(90, 'days').format('YYYY-MM-DD');
  const { data: exceptions = [], isLoading: exceptionsLoading, refetch: refetchExceptions } = useQuery({
    queryKey: ['/api/availability/doctor', doctorId, 'exceptions'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(
        `/api/availability/doctor/${doctorId}/exceptions?dateTo=${dateTo}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch availability exceptions');
      return response.json();
    },
  });

  const handleSaveRule = async (values: any) => {
    try {
      const token = localStorage.getItem('auth-token');
      const startTime = values.startTime.format('HH:mm');
      const endTime = values.endTime.format('HH:mm');

      const response = await fetch(`/api/availability/doctor/${doctorId}/rules`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dayOfWeek: values.dayOfWeek,
          startTime,
          endTime,
          slotDurationMinutes: values.slotDurationMinutes || 30,
          maxPatientsPerSlot: values.maxPatientsPerSlot || 1,
          isActive: values.isActive !== false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save availability rule');
      }

      message.success('Availability rule saved successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/availability/doctor', doctorId] });
      setIsRuleModalOpen(false);
      ruleForm.resetFields();
      setEditingRule(null);
    } catch (error: any) {
      message.error(error.message || 'Failed to save availability rule');
    }
  };

  const handleSaveException = async (values: any) => {
    try {
      const token = localStorage.getItem('auth-token');
      const date = values.date.format('YYYY-MM-DD');
      const startTime = values.startTime ? values.startTime.format('HH:mm') : undefined;
      const endTime = values.endTime ? values.endTime.format('HH:mm') : undefined;

      const response = await fetch(`/api/availability/doctor/${doctorId}/exceptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          type: values.type,
          startTime,
          endTime,
          reason: values.reason || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create availability exception');
      }

      const result = await response.json();
      
      // Handle response structure: { exception: [...], impactedAppointments: number, appointments: [...] }
      const exception = Array.isArray(result.exception) ? result.exception[0] : result.exception || result;
      const impactedCount = result.impactedAppointments || 0;
      const appointments = result.appointments || [];
      
      if (impactedCount > 0 && appointments.length > 0) {
        // Show bulk reschedule option
        setImpactedAppointments(appointments);
        setLeaveDateForReschedule(date);
        setIsBulkRescheduleModalOpen(true);
      } else if (impactedCount > 0) {
        Modal.info({
          title: 'Appointments Impacted',
          content: (
            <div>
              <p>
                This leave will impact <strong>{impactedCount}</strong> appointment(s).
              </p>
              <p>You may need to reschedule these appointments.</p>
            </div>
          ),
        });
      }

      message.success('Availability exception created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/availability/doctor', doctorId, 'exceptions'] });
      setIsExceptionModalOpen(false);
      exceptionForm.resetFields();
      setSelectedDate(null);
    } catch (error: any) {
      message.error(error.message || 'Failed to create availability exception');
    }
  };

  const handleDeleteException = async (exceptionId: number) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/availability/exceptions/${exceptionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete exception');
      }

      message.success('Exception deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/availability/doctor', doctorId, 'exceptions'] });
    } catch (error: any) {
      message.error(error.message || 'Failed to delete exception');
    }
  };

  const openEditRule = (rule: any) => {
    setEditingRule(rule);
    ruleForm.setFieldsValue({
      dayOfWeek: rule.dayOfWeek,
      startTime: dayjs(rule.startTime, 'HH:mm'),
      endTime: dayjs(rule.endTime, 'HH:mm'),
      slotDurationMinutes: rule.slotDurationMinutes || 30,
      maxPatientsPerSlot: rule.maxPatientsPerSlot || 1,
      isActive: rule.isActive,
    });
    setIsRuleModalOpen(true);
  };

  const ruleColumns = [
    {
      title: 'Day',
      dataIndex: 'dayOfWeek',
      key: 'dayOfWeek',
      render: (day: number) => DAYS_OF_WEEK.find(d => d.value === day)?.label || 'Unknown',
    },
    {
      title: 'Start Time',
      dataIndex: 'startTime',
      key: 'startTime',
    },
    {
      title: 'End Time',
      dataIndex: 'endTime',
      key: 'endTime',
    },
    {
      title: 'Slot Duration',
      dataIndex: 'slotDurationMinutes',
      key: 'slotDurationMinutes',
      render: (minutes: number) => `${minutes} min`,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => openEditRule(record)}
        >
          Edit
        </Button>
      ),
    },
  ];

  const exceptionColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const colors: Record<string, string> = {
          leave: 'orange',
          override_hours: 'blue',
          blocked: 'red',
        };
        const labels: Record<string, string> = {
          leave: 'Leave',
          override_hours: 'Override Hours',
          blocked: 'Blocked',
        };
        return <Tag color={colors[type]}>{labels[type] || type}</Tag>;
      },
    },
    {
      title: 'Time',
      key: 'time',
      render: (_: any, record: any) => {
        if (!record.startTime) return 'Full Day';
        return `${record.startTime} - ${record.endTime}`;
      },
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Popconfirm
          title="Delete this exception?"
          onConfirm={() => handleDeleteException(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            <span>Weekly Availability Schedule</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRule(null);
              ruleForm.resetFields();
              setIsRuleModalOpen(true);
            }}
          >
            Add Rule
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={ruleColumns}
          dataSource={rules}
          rowKey="id"
          loading={rulesLoading}
          pagination={false}
        />
      </Card>

      <Card
        title={
          <Space>
            <CalendarOutlined />
            <span>Leave & Exceptions</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              exceptionForm.resetFields();
              setSelectedDate(null);
              setIsExceptionModalOpen(true);
            }}
          >
            Add Exception
          </Button>
        }
      >
        <Table
          columns={exceptionColumns}
          dataSource={exceptions}
          rowKey="id"
          loading={exceptionsLoading}
          pagination={false}
        />
      </Card>

      {/* Rule Modal */}
      <Modal
        title={editingRule ? 'Edit Availability Rule' : 'Add Availability Rule'}
        open={isRuleModalOpen}
        onCancel={() => {
          setIsRuleModalOpen(false);
          ruleForm.resetFields();
          setEditingRule(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={ruleForm}
          layout="vertical"
          onFinish={handleSaveRule}
          initialValues={{
            slotDurationMinutes: 30,
            maxPatientsPerSlot: 1,
            isActive: true,
          }}
        >
          <Form.Item
            name="dayOfWeek"
            label="Day of Week"
            rules={[{ required: true, message: 'Please select a day' }]}
          >
            <Select placeholder="Select day">
              {DAYS_OF_WEEK.map(day => (
                <Option key={day.value} value={day.value}>
                  {day.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="startTime"
            label="Start Time"
            rules={[{ required: true, message: 'Please select start time' }]}
          >
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="endTime"
            label="End Time"
            rules={[{ required: true, message: 'Please select end time' }]}
          >
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="slotDurationMinutes" label="Slot Duration (minutes)">
            <InputNumber min={15} max={120} step={15} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="maxPatientsPerSlot" label="Max Patients Per Slot">
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="isActive" valuePropName="checked" label="Status">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={() => setIsRuleModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Save
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Exception Modal */}
      <Modal
        title="Add Leave/Exception"
        open={isExceptionModalOpen}
        onCancel={() => {
          setIsExceptionModalOpen(false);
          exceptionForm.resetFields();
          setSelectedDate(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={exceptionForm}
          layout="vertical"
          onFinish={handleSaveException}
        >
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              onChange={(date) => setSelectedDate(date)}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: 'Please select exception type' }]}
          >
            <Select placeholder="Select type">
              <Option value="leave">Leave (Full Day or Partial)</Option>
              <Option value="override_hours">Override Hours</Option>
              <Option value="blocked">Blocked</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              if (type === 'leave' || type === 'override_hours') {
                return (
                  <>
                    <Form.Item name="startTime" label="Start Time (Optional - leave empty for full day)">
                      <TimePicker format="HH:mm" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="endTime" label="End Time (Optional - leave empty for full day)">
                      <TimePicker format="HH:mm" style={{ width: '100%' }} />
                    </Form.Item>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item name="reason" label="Reason">
            <TextArea rows={3} placeholder="Enter reason for leave/exception" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={() => setIsExceptionModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Create Exception
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

