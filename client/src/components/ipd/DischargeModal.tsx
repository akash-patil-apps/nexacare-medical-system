import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, Space, message, Spin } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import type { IpdEncounter } from '../../types/ipd';

const { TextArea } = Input;

interface DischargeModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  encounter: IpdEncounter | null;
}

export const DischargeModal: React.FC<DischargeModalProps> = ({
  open,
  onCancel,
  onSuccess,
  encounter,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: any) => {
    if (!encounter) {
      message.warning('No encounter selected');
      return;
    }

    if (!values.dischargeSummaryText || values.dischargeSummaryText.trim().length === 0) {
      message.warning('Please enter a discharge summary');
      return;
    }

    // Show confirmation dialog
    const dischargeType = values.status || 'discharged';
    const dischargeTypeLabel = dischargeType === 'discharged' ? 'discharge' : dischargeType.toLowerCase();
    
    Modal.confirm({
      title: 'Confirm Patient Discharge',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to ${dischargeTypeLabel} this patient? The bed will be released and marked for cleaning. This action cannot be undone.`,
      okText: `Yes, ${dischargeType === 'discharged' ? 'Discharge' : 'Confirm'}`,
      okType: dischargeType === 'death' || dischargeType === 'LAMA' ? 'danger' : 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        setIsSubmitting(true);
        try {
          const token = localStorage.getItem('auth-token');
          const response = await fetch(`/api/ipd/encounters/${encounter.id}/discharge`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dischargeSummaryText: values.dischargeSummaryText || null,
              status: dischargeType, // Send discharge type (discharged, LAMA, transfer, death, absconded)
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to discharge patient');
          }

          message.success(`Patient ${dischargeTypeLabel}ed successfully`);
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/beds/available'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
          onSuccess();
          handleClose();
        } catch (error: any) {
          message.error(error.message || 'Failed to discharge patient');
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleClose = () => {
    form.resetFields();
    onCancel();
  };

  if (!encounter) {
    return null;
  }

  // Calculate length of stay
  const admittedDate = new Date(encounter.admittedAt);
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - admittedDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Modal
      title="Discharge Patient"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={600}
    >
      <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 8 }}>
        <Space direction="vertical" size="small">
          <div>
            <strong>Patient:</strong> {encounter.patient?.user?.fullName || 'Unknown'}
          </div>
          <div>
            <strong>Current Bed:</strong> {
              encounter.currentBed 
                ? (encounter.currentBed.bedName || `Bed ${encounter.currentBed.bedNumber}`)
                : (encounter.currentBedId ? `Bed ID: ${encounter.currentBedId}` : 'N/A')
            }
          </div>
          <div>
            <strong>Admitted:</strong> {new Date(encounter.admittedAt).toLocaleDateString()}
          </div>
          <div>
            <strong>Length of Stay:</strong> {daysDiff} day{daysDiff !== 1 ? 's' : ''}
          </div>
        </Space>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="status"
          label="Discharge Type"
          rules={[{ required: true, message: 'Please select discharge type' }]}
          initialValue="discharged"
        >
          <Select>
            <Select.Option value="discharged">Normal Discharge</Select.Option>
            <Select.Option value="LAMA">LAMA (Leave Against Medical Advice)</Select.Option>
            <Select.Option value="transfer">Transfer to Another Hospital</Select.Option>
            <Select.Option value="death">Death</Select.Option>
            <Select.Option value="absconded">Absconded</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="dischargeSummaryText"
          label="Discharge Summary"
          rules={[{ required: true, message: 'Please enter discharge summary' }]}
        >
          <TextArea
            rows={6}
            placeholder="Enter discharge summary including diagnosis, treatment given, medications, follow-up instructions, etc."
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting} danger>
              {isSubmitting ? 'Discharging...' : 'Discharge Patient'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};



