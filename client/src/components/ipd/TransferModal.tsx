import React, { useState } from 'react';
import { Modal, Form, Input, Button, Space, message, Spin } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BedSelector } from './BedSelector';
import type { BedStructure, IpdEncounter } from '../../types/ipd';

const { TextArea } = Input;

interface TransferModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  encounter: IpdEncounter | null;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  open,
  onCancel,
  onSuccess,
  encounter,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch bed structure
  const { data: structure, isLoading: structureLoading } = useQuery<BedStructure>({
    queryKey: ['/api/ipd/structure'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/ipd/structure', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch bed structure');
      return response.json();
    },
    enabled: open,
  });

  // Fetch available beds
  const { data: availableBeds = [], isLoading: bedsLoading } = useQuery({
    queryKey: ['/api/ipd/beds/available'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/ipd/beds/available', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch available beds');
      return response.json();
    },
    enabled: open,
  });

  const handleSubmit = async (values: any) => {
    if (!encounter) {
      message.warning('No encounter selected');
      return;
    }

    if (!selectedBedId) {
      message.warning('Please select a new bed');
      return;
    }

    if (selectedBedId === encounter.currentBed?.id) {
      message.warning('Please select a different bed');
      return;
    }

    if (!values.reason || values.reason.trim().length === 0) {
      message.warning('Please provide a reason for transfer');
      return;
    }

    // Show confirmation dialog
    Modal.confirm({
      title: 'Confirm Patient Transfer',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to transfer this patient to the new bed? The current bed will be marked for cleaning.`,
      okText: 'Yes, Transfer Patient',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        setIsSubmitting(true);
        try {
          const token = localStorage.getItem('auth-token');
          const response = await fetch(`/api/ipd/encounters/${encounter.id}/transfer`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              newBedId: selectedBedId,
              reason: values.reason || 'Transfer',
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to transfer patient');
          }

          message.success('Patient transferred successfully');
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/beds/available'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
          onSuccess();
          handleClose();
        } catch (error: any) {
          message.error(error.message || 'Failed to transfer patient');
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleClose = () => {
    form.resetFields();
    setSelectedBedId(null);
    onCancel();
  };

  if (!encounter) {
    return null;
  }

  return (
    <Modal
      title="Transfer Patient"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={800}
      styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
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
            <strong>Status:</strong> {encounter.status}
          </div>
        </Space>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="reason"
          label="Transfer Reason"
          rules={[{ required: true, message: 'Please provide a reason for transfer' }]}
        >
          <TextArea rows={3} placeholder="Enter reason for transfer" />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <strong>Select New Bed:</strong>
        </div>

        {structureLoading || bedsLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : (
          <BedSelector
            structure={structure || null}
            selectedBedId={selectedBedId}
            onSelectBed={setSelectedBedId}
            showOnlyAvailable={true}
            excludeBedId={encounter.currentBed?.id || null}
          />
        )}

        {selectedBedId && (
          <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 8 }}>
            <span style={{ color: '#52c41a' }}>New bed selected: {selectedBedId}</span>
          </div>
        )}

        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
              disabled={!selectedBedId}
            >
              {isSubmitting ? 'Transferring...' : 'Transfer Patient'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};



