import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Button,
  Space,
  message,
  Table,
  Typography,
  Alert,
  Spin,
} from 'antd';
import { CalendarOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

interface BulkRescheduleModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  doctorId: number;
  impactedAppointments: any[];
  leaveDate: string; // YYYY-MM-DD
}

export const BulkRescheduleModal: React.FC<BulkRescheduleModalProps> = ({
  open,
  onCancel,
  onSuccess,
  doctorId,
  impactedAppointments,
  leaveDate,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [rescheduleMode, setRescheduleMode] = useState<'same_slots' | 'auto_assign' | 'manual'>('auto_assign');

  // Fetch available slots for selected date
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !doctorId) {
        setAvailableSlots([]);
        return;
      }

      try {
        const token = localStorage.getItem('auth-token');
        const dateStr = selectedDate.format('YYYY-MM-DD');
        const response = await fetch(`/api/availability/doctor/${doctorId}/slots/${dateStr}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setAvailableSlots(data.slots || []);
        } else {
          setAvailableSlots([]);
        }
      } catch (error) {
        console.error('Error fetching slots:', error);
        setAvailableSlots([]);
      }
    };

    fetchSlots();
  }, [selectedDate, doctorId]);

  const handleSubmit = async (values: any) => {
    if (impactedAppointments.length === 0) {
      message.warning('No appointments to reschedule');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth-token');
      const rescheduleDate = values.rescheduleDate?.format('YYYY-MM-DD') || selectedDate?.format('YYYY-MM-DD');

      if (!rescheduleDate) {
        message.error('Please select a reschedule date');
        return;
      }

      // Reschedule each appointment
      const results = await Promise.allSettled(
        impactedAppointments.map(async (apt: any) => {
          let timeSlot = apt.timeSlot || apt.appointmentTime;
          
          // If auto_assign mode, find next available slot
          if (rescheduleMode === 'auto_assign' && availableSlots.length > 0) {
            // Try to find same time slot first
            const sameSlot = availableSlots.find(slot => slot === timeSlot);
            if (!sameSlot) {
              // Use first available slot
              timeSlot = availableSlots[0];
            }
          }

          const response = await fetch(`/api/appointments/${apt.id}/reschedule`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              appointmentDate: rescheduleDate,
              appointmentTime: timeSlot?.split('-')[0] || '09:00',
              timeSlot: timeSlot || availableSlots[0],
              rescheduleReason: `Bulk reschedule due to doctor leave on ${leaveDate}`,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to reschedule');
          }

          return response.json();
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        message.success(`Successfully rescheduled ${successful} appointment(s)`);
      }
      if (failed > 0) {
        message.warning(`${failed} appointment(s) could not be rescheduled`);
      }

      queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/availability/doctor', doctorId] });
      onSuccess();
      handleClose();
    } catch (error: any) {
      message.error(error.message || 'Failed to reschedule appointments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setSelectedDate(null);
    setAvailableSlots([]);
    setRescheduleMode('auto_assign');
    onCancel();
  };

  const appointmentColumns = [
    {
      title: 'Patient',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Current Date',
      key: 'date',
      render: (_: any, record: any) => {
        const date = record.appointmentDate || record.date;
        return date ? dayjs(date).format('DD MMM YYYY') : 'N/A';
      },
    },
    {
      title: 'Time Slot',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
  ];

  return (
    <Modal
      title="Bulk Reschedule Appointments"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={800}
    >
      <Alert
        message="Doctor Leave Detected"
        description={`The doctor will be on leave on ${dayjs(leaveDate).format('DD MMM YYYY')}. ${impactedAppointments.length} appointment(s) need to be rescheduled.`}
        type="warning"
        icon={<ExclamationCircleOutlined />}
        style={{ marginBottom: 24 }}
      />

      <Table
        columns={appointmentColumns}
        dataSource={impactedAppointments}
        rowKey="id"
        pagination={false}
        size="small"
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="rescheduleMode"
          label="Reschedule Mode"
          initialValue="auto_assign"
        >
          <Select onChange={(value) => setRescheduleMode(value)}>
            <Option value="auto_assign">Auto-assign to available slots</Option>
            <Option value="same_slots">Keep same time slots (if available)</Option>
            <Option value="manual">Manual selection (coming soon)</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="rescheduleDate"
          label="Reschedule To Date"
          rules={[{ required: true, message: 'Please select a date' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            disabledDate={(current) => {
              // Can't reschedule to past or leave date
              return current && (current < dayjs().startOf('day') || current.format('YYYY-MM-DD') === leaveDate);
            }}
            onChange={(date) => setSelectedDate(date)}
          />
        </Form.Item>

        {selectedDate && availableSlots.length > 0 && (
          <Alert
            message={`${availableSlots.length} available slot(s) on ${selectedDate.format('DD MMM YYYY')}`}
            type="info"
            style={{ marginBottom: 16 }}
          />
        )}

        {selectedDate && availableSlots.length === 0 && (
          <Alert
            message="No available slots on selected date"
            type="warning"
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item>
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
              disabled={!selectedDate || availableSlots.length === 0}
              icon={<CalendarOutlined />}
            >
              Reschedule All ({impactedAppointments.length})
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

