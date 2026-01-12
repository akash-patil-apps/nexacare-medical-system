import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Tabs,
  Typography,
} from 'antd';
import { TeamOutlined, SaveOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../../lib/auth';

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

interface NursingNotesFormProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  patientId: number;
  encounterId: number;
  initialNote?: any;
  mode?: 'create' | 'edit';
  hospitalId?: number; // Optional: if provided, will use this instead of fetching
}

export const NursingNotesForm: React.FC<NursingNotesFormProps> = ({
  open,
  onCancel,
  onSuccess,
  patientId,
  encounterId,
  initialNote,
  mode = 'create',
  hospitalId: propHospitalId,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [hospitalId, setHospitalId] = useState<number | null>(propHospitalId || null);

  useEffect(() => {
    // If hospitalId is provided as prop, use it
    if (propHospitalId) {
      setHospitalId(propHospitalId);
      return;
    }

    // Otherwise, try to fetch from API
    const fetchHospital = async () => {
      try {
        const token = getAuthToken();
        // Try doctor profile first (for doctors)
        const doctorResponse = await fetch('/api/doctors/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (doctorResponse.ok) {
          const doctorData = await doctorResponse.json();
          if (doctorData.hospitalId) {
            setHospitalId(doctorData.hospitalId);
            return;
          }
        }

        // Try nurse profile (for nurses)
        const nurseResponse = await fetch('/api/nurses/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (nurseResponse.ok) {
          const nurseData = await nurseResponse.json();
          if (nurseData.hospitalId) {
            setHospitalId(nurseData.hospitalId);
            return;
          }
        }

        // Fallback to hospitals/my endpoint
        const response = await fetch('/api/hospitals/my', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setHospitalId(data.id);
        }
      } catch (error) {
        console.error('Error fetching hospital:', error);
      }
    };
    fetchHospital();
  }, [propHospitalId]);

  useEffect(() => {
    if (initialNote && mode === 'edit') {
      form.setFieldsValue({
        noteType: initialNote.noteType,
        nursingAssessment: initialNote.nursingAssessment,
        carePlan: initialNote.carePlan,
        interventions: initialNote.interventions,
        evaluation: initialNote.evaluation,
        shiftType: initialNote.shiftType,
        handoverNotes: initialNote.handoverNotes,
        criticalInformation: initialNote.criticalInformation,
        outstandingTasks: initialNote.outstandingTasks,
        notes: initialNote.notes,
      });
      setActiveTab(initialNote.noteType === 'shift_handover' ? 'handover' : 'general');
    } else {
      form.setFieldsValue({
        noteType: 'general',
      });
    }
  }, [initialNote, mode, form]);

  const handleSubmit = async (values: any) => {
    if (!hospitalId) {
      message.error('Hospital information not available');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth-token');
      const url = mode === 'edit' && initialNote
        ? `/api/clinical/nursing-notes/${initialNote.id}`
        : '/api/clinical/nursing-notes';

      const payload = {
        hospitalId,
        patientId,
        encounterId,
        noteType: values.noteType,
        nursingAssessment: values.nursingAssessment,
        carePlan: values.carePlan,
        interventions: values.interventions,
        evaluation: values.evaluation,
        shiftType: values.shiftType,
        handoverNotes: values.handoverNotes,
        criticalInformation: values.criticalInformation,
        outstandingTasks: values.outstandingTasks,
        notes: values.notes,
      };

      const response = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save nursing note');
      }

      message.success(mode === 'edit' ? 'Nursing note updated successfully' : 'Nursing note created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/clinical/nursing-notes'] });
      onSuccess();
      handleClose();
    } catch (error: any) {
      message.error(error.message || 'Failed to save nursing note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setActiveTab('general');
    onCancel();
  };

  const generalTabContent = (
    <>
      <Form.Item name="notes" label="Nursing Notes">
        <TextArea rows={8} placeholder="Enter nursing notes..." />
      </Form.Item>
    </>
  );

  const assessmentTabContent = (
    <>
      <Form.Item
        name="nursingAssessment"
        label="Nursing Assessment"
        style={{ marginBottom: 8 }}
      >
        <TextArea rows={3} placeholder="Patient assessment findings..." size="small" />
      </Form.Item>

      <Form.Item
        name="carePlan"
        label="Care Plan"
        style={{ marginBottom: 8 }}
      >
        <TextArea rows={3} placeholder="Nursing care plan..." size="small" />
      </Form.Item>

      <Form.Item
        name="interventions"
        label="Interventions"
        style={{ marginBottom: 8 }}
      >
        <TextArea rows={2} placeholder="Nursing interventions performed..." size="small" />
      </Form.Item>

      <Form.Item
        name="evaluation"
        label="Evaluation"
        style={{ marginBottom: 0 }}
      >
        <TextArea rows={2} placeholder="Evaluation of care effectiveness..." size="small" />
      </Form.Item>
    </>
  );

  const handoverTabContent = (
    <>
      <Form.Item
        name="shiftType"
        label="Shift Type"
        style={{ marginBottom: 8 }}
      >
        <Select placeholder="Select shift" size="small">
          <Option value="morning">Morning</Option>
          <Option value="afternoon">Afternoon</Option>
          <Option value="night">Night</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="handoverNotes"
        label="Handover Notes"
        style={{ marginBottom: 8 }}
      >
        <TextArea rows={3} placeholder="Shift handover information..." size="small" />
      </Form.Item>

      <Form.Item
        name="criticalInformation"
        label="Critical Information"
        style={{ marginBottom: 8 }}
      >
        <TextArea rows={2} placeholder="Critical patient information for next shift..." size="small" />
      </Form.Item>

      <Form.Item
        name="outstandingTasks"
        label="Outstanding Tasks"
        style={{ marginBottom: 0 }}
      >
        <TextArea rows={2} placeholder="Tasks pending for next shift..." size="small" />
      </Form.Item>
    </>
  );

  return (
    <Modal
      title={
        <Space>
          <TeamOutlined />
          <span>{mode === 'edit' ? 'Edit Nursing Note' : 'Create Nursing Note'}</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={750}
      style={{ top: 20 }}
      bodyStyle={{ 
        padding: '12px 16px',
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto'
      }}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={() => form.submit()}
          loading={isSubmitting}
          icon={<SaveOutlined />}
        >
          {mode === 'edit' ? 'Update' : 'Save'} Note
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          noteType: 'general',
        }}
        style={{ marginBottom: 0 }}
      >
        <Form.Item
          name="noteType"
          label="Note Type"
          rules={[{ required: true }]}
          style={{ marginBottom: 12 }}
        >
          <Select onChange={(value) => {
            if (value === 'shift_handover') {
              setActiveTab('handover');
            } else if (value === 'assessment' || value === 'care_plan') {
              setActiveTab('assessment');
            } else {
              setActiveTab('general');
            }
          }}>
            <Option value="general">General Note</Option>
            <Option value="assessment">Assessment</Option>
            <Option value="care_plan">Care Plan</Option>
            <Option value="shift_handover">Shift Handover</Option>
          </Select>
        </Form.Item>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          items={[
            {
              key: 'general',
              label: 'General',
              children: generalTabContent,
            },
            {
              key: 'assessment',
              label: 'Assessment & Care Plan',
              children: assessmentTabContent,
            },
            {
              key: 'handover',
              label: 'Shift Handover',
              children: handoverTabContent,
            },
          ]}
        />
      </Form>
    </Modal>
  );
};





