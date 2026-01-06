import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  Space,
  message,
  Spin,
} from 'antd';
import { UserOutlined, SwapOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { IpdEncounter } from '../../types/ipd';

const { Option } = Select;
const { TextArea } = Input;

interface TransferDoctorModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  encounter: IpdEncounter | null;
  hospitalId?: number;
}

export const TransferDoctorModal: React.FC<TransferDoctorModalProps> = ({
  open,
  onCancel,
  onSuccess,
  encounter,
  hospitalId,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);

  // Fetch doctors for the hospital
  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ['/api/doctors/hospital', hospitalId],
    queryFn: async () => {
      if (!hospitalId) return [];
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/doctors/hospital/${hospitalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!hospitalId && open,
  });

  useEffect(() => {
    if (encounter && open) {
      form.setFieldsValue({
        currentDoctor: encounter.attendingDoctor?.fullName || encounter.admittingDoctor?.fullName || 'N/A',
      });
      setSelectedDoctorId(null);
    }
  }, [encounter, open, form]);

  const handleSubmit = async (values: any) => {
    if (!encounter) {
      message.warning('No encounter selected');
      return;
    }

    if (!selectedDoctorId) {
      message.warning('Please select a doctor');
      return;
    }

    if (selectedDoctorId === encounter.attendingDoctorId) {
      message.warning('Patient is already under this doctor');
      return;
    }

    Modal.confirm({
      title: 'Transfer Patient to Another Doctor?',
      content: `Are you sure you want to transfer this patient to the selected doctor?`,
      okText: 'Yes, Transfer',
      cancelText: 'Cancel',
      onOk: async () => {
        setIsSubmitting(true);
        try {
          const token = localStorage.getItem('auth-token');
          const response = await fetch(`/api/ipd/encounters/${encounter.id}/transfer-doctor`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              newAttendingDoctorId: selectedDoctorId,
              reason: values.reason || 'Doctor transfer',
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to transfer patient to doctor');
          }

          message.success('Patient transferred to doctor successfully');
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
          onSuccess();
          handleClose();
        } catch (error: any) {
          message.error(error.message || 'Failed to transfer patient to doctor');
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleClose = () => {
    form.resetFields();
    setSelectedDoctorId(null);
    onCancel();
  };

  if (!encounter) {
    return null;
  }

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined />
          <span>Transfer Patient to Another Doctor</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item label="Current Attending Doctor">
          <Input
            value={encounter.attendingDoctor?.fullName || encounter.admittingDoctor?.fullName || 'N/A'}
            disabled
            prefix={<UserOutlined />}
          />
        </Form.Item>

        <Form.Item
          name="newDoctorId"
          label="Select New Attending Doctor"
          rules={[{ required: true, message: 'Please select a doctor' }]}
        >
          <Select
            placeholder="Select doctor"
            loading={doctorsLoading}
            showSearch
            filterOption={(input, option) =>
              (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
            }
            onChange={(value) => setSelectedDoctorId(value)}
            notFoundContent={doctorsLoading ? <Spin size="small" /> : 'No doctors found'}
          >
            {doctors
              .filter((doc: any) => doc.id !== encounter.attendingDoctorId)
              .map((doctor: any) => (
                <Option key={doctor.id} value={doctor.id}>
                  {doctor.fullName} - {doctor.specialty}
                </Option>
              ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="reason"
          label="Reason for Transfer"
          rules={[{ required: true, message: 'Please provide a reason' }]}
        >
          <TextArea
            rows={4}
            placeholder="Enter reason for transferring patient to another doctor..."
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
              icon={<SwapOutlined />}
            >
              {isSubmitting ? 'Transferring...' : 'Transfer to Doctor'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

