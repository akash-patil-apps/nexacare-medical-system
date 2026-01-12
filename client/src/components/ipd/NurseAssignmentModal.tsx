import React, { useState } from 'react';
import { Modal, Form, Select, Input, Button, Space, message, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const { TextArea } = Input;

interface NurseAssignmentModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  encounterId: number;
  patientId: number;
  hospitalId: number;
  currentNurseId?: number | null;
}

interface Nurse {
  id: number;
  userId: number;
  hospitalId: number;
  employeeId?: string;
  department?: string;
  user?: {
    fullName: string;
    mobileNumber: string;
    email: string;
  };
}

interface NurseResponse {
  nurse: Nurse;
  user?: {
    id: number;
    fullName: string;
    mobileNumber: string;
    email: string;
  };
}

export const NurseAssignmentModal: React.FC<NurseAssignmentModalProps> = ({
  open,
  onCancel,
  onSuccess,
  encounterId,
  patientId,
  hospitalId,
  currentNurseId,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available nurses for this hospital
  const { data: nursesData = [], isLoading: nursesLoading } = useQuery<NurseResponse[]>({
    queryKey: ['/api/nurses/hospital', hospitalId],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/nurses/hospital/${hospitalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch nurses');
      }
      return response.json();
    },
    enabled: open && !!hospitalId,
  });

  // Transform nurses data to flat structure
  const nurses = nursesData.map((item) => ({
    ...item.nurse,
    user: item.user,
  }));

  const handleSubmit = async (values: any) => {
    if (!values.nurseId) {
      message.error('Please select a nurse');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/ipd/encounters/${encounterId}/assign-nurse`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nurseId: values.nurseId,
          reason: values.reason || null,
          shiftType: values.shiftType || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign nurse');
      }

      message.success('Nurse assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nurses/my-patients'] });
      onSuccess();
      form.resetFields();
      onCancel();
    } catch (error: any) {
      console.error('Error assigning nurse:', error);
      message.error(error.message || 'Failed to assign nurse');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Assign Nurse to Patient"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          shiftType: 'day',
        }}
      >
        <Form.Item
          name="nurseId"
          label="Select Nurse"
          rules={[{ required: true, message: 'Please select a nurse' }]}
        >
          <Select
            placeholder="Select a nurse"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            loading={nursesLoading}
            notFoundContent={nursesLoading ? <Spin size="small" /> : 'No nurses available'}
          >
            {nurses.map((nurse) => (
              <Select.Option key={nurse.id} value={nurse.id} label={nurse.user?.fullName || `Nurse ${nurse.id}`}>
                <Space>
                  <UserOutlined />
                  <span>{nurse.user?.fullName || `Nurse ${nurse.id}`}</span>
                  {nurse.department && (
                    <span style={{ color: '#999', fontSize: '12px' }}>
                      ({nurse.department})
                    </span>
                  )}
                  {nurse.employeeId && (
                    <span style={{ color: '#999', fontSize: '12px' }}>
                      - {nurse.employeeId}
                    </span>
                  )}
                </Space>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="shiftType"
          label="Shift Type"
        >
          <Select>
            <Select.Option value="day">Day Shift</Select.Option>
            <Select.Option value="night">Night Shift</Select.Option>
            <Select.Option value="rotation">Rotation</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="reason"
          label="Assignment Reason (Optional)"
        >
          <TextArea
            rows={3}
            placeholder="e.g., Primary care nurse, Specialized care, etc."
          />
        </Form.Item>

        {currentNurseId && (
          <div style={{ 
            padding: 12, 
            background: '#fff7e6', 
            borderRadius: 4, 
            marginBottom: 16,
            border: '1px solid #ffd591'
          }}>
            <span style={{ color: '#d46b08' }}>
              ⚠️ Patient already has an assigned nurse. This will update the assignment.
            </span>
          </div>
        )}

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              Assign Nurse
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

