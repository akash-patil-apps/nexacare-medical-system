import React, { useState } from 'react';
import { Modal, Form, Select, Input, Button, message } from 'antd';
import { SaveOutlined, TeamOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../../lib/auth';

const { TextArea } = Input;
const { Option } = Select;

export interface ShiftHandoverModalEncounter {
  id: number;
  patientId: number;
  patientName?: string;
  patient?: { fullName?: string };
}

interface ShiftHandoverModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  encounters: ShiftHandoverModalEncounter[];
  hospitalId?: number | null;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  open,
  onCancel,
  onSuccess,
  encounters,
  hospitalId,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: {
    encounterId: number;
    shiftType: string;
    handoverNotes: string;
    criticalInformation: string;
    outstandingTasks: string;
  }) => {
    if (!hospitalId) {
      message.error('Hospital information not available');
      return;
    }
    const encounter = encounters.find((e) => e.id === values.encounterId);
    if (!encounter) {
      message.error('Please select a patient');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/clinical/nursing-notes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hospitalId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          noteType: 'shift_handover',
          shiftType: values.shiftType || null,
          handoverNotes: values.handoverNotes || null,
          criticalInformation: values.criticalInformation || null,
          outstandingTasks: values.outstandingTasks || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to save shift handover');
      }

      message.success('Shift handover saved successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/clinical/nursing-notes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
      form.resetFields();
      onSuccess();
      onCancel();
    } catch (error: any) {
      message.error(error.message || 'Failed to save shift handover');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onCancel();
  };

  const patientName = (enc: ShiftHandoverModalEncounter) =>
    enc.patientName || enc.patient?.fullName || `Patient #${enc.patientId}`;

  const hasEncounters = encounters.length > 0;

  return (
    <Modal
      title={
        <span>
          <TeamOutlined style={{ marginRight: 8 }} />
          Shift Handover
        </span>
      }
      open={open}
      onCancel={handleClose}
      width={560}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SaveOutlined />}
          loading={isSubmitting}
          disabled={!hasEncounters}
          onClick={() => form.submit()}
        >
          Save Handover
        </Button>,
      ]}
    >
      {!hasEncounters ? (
        <p style={{ color: '#666', margin: 0 }}>No patients in your ward. Assign patients to your ward to document shift handover.</p>
      ) : (
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ shiftType: 'morning' }}
      >
        <Form.Item
          name="encounterId"
          label="Patient"
          rules={[{ required: true, message: 'Select a patient for this handover note' }]}
        >
          <Select
            placeholder="Select patient"
            showSearch
            optionFilterProp="children"
            filterOption={(input, opt) =>
              (opt?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
            options={encounters.map((e) => ({
              value: e.id,
              label: patientName(e),
            }))}
          />
        </Form.Item>

        <Form.Item name="shiftType" label="Shift Type" rules={[{ required: true }]}>
          <Select placeholder="Select shift">
            <Option value="morning">Morning</Option>
            <Option value="afternoon">Afternoon</Option>
            <Option value="night">Night</Option>
          </Select>
        </Form.Item>

        <Form.Item name="handoverNotes" label="Handover Notes">
          <TextArea rows={3} placeholder="Shift handover information for the next shift..." />
        </Form.Item>

        <Form.Item name="criticalInformation" label="Critical Information">
          <TextArea rows={2} placeholder="Critical patient information for next shift..." />
        </Form.Item>

        <Form.Item name="outstandingTasks" label="Outstanding Tasks">
          <TextArea rows={2} placeholder="Tasks pending for next shift..." />
        </Form.Item>
      </Form>
      )}
    </Modal>
  );
};
