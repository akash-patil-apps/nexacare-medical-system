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
  Divider,
} from 'antd';
import { FileTextOutlined, SaveOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface ClinicalNotesEditorProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  patientId: number;
  encounterId?: number;
  appointmentId?: number;
  noteType?: 'admission' | 'progress' | 'discharge' | 'consultation';
  initialNote?: any;
  mode?: 'create' | 'edit';
}

export const ClinicalNotesEditor: React.FC<ClinicalNotesEditorProps> = ({
  open,
  onCancel,
  onSuccess,
  patientId,
  encounterId,
  appointmentId,
  noteType = 'consultation',
  initialNote,
  mode = 'create',
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('soap');

  // Get hospital ID from user context
  const { data: hospitalData } = useQuery({
    queryKey: ['/api/hospitals/my'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/hospitals/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch hospital');
      return response.json();
    },
  });

  // Get diagnosis codes for autocomplete
  const { data: diagnosisCodes = [] } = useQuery({
    queryKey: ['/api/clinical/diagnosis-codes'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/clinical/diagnosis-codes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  useEffect(() => {
    if (initialNote && mode === 'edit') {
      form.setFieldsValue({
        noteType: initialNote.noteType,
        chiefComplaint: initialNote.chiefComplaint,
        historyOfPresentIllness: initialNote.historyOfPresentIllness,
        subjective: initialNote.subjective,
        objective: initialNote.objective,
        assessment: initialNote.assessment,
        plan: initialNote.plan,
        admissionDiagnosis: initialNote.admissionDiagnosis,
        physicalExamination: initialNote.physicalExamination,
        reviewOfSystems: initialNote.reviewOfSystems,
        allergies: initialNote.allergies,
        medications: initialNote.medications,
        pastMedicalHistory: initialNote.pastMedicalHistory,
        familyHistory: initialNote.familyHistory,
        socialHistory: initialNote.socialHistory,
        isDraft: initialNote.isDraft,
      });
    } else {
      form.setFieldsValue({
        noteType,
        isDraft: false,
      });
    }
  }, [initialNote, mode, noteType, form]);

  const handleSubmit = async (values: any) => {
    if (!hospitalData?.id) {
      message.error('Hospital information not available');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth-token');
      const url = mode === 'edit' && initialNote
        ? `/api/clinical/notes/${initialNote.id}`
        : '/api/clinical/notes';

      const payload = {
        hospitalId: hospitalData.id,
        patientId,
        encounterId,
        appointmentId,
        noteType: values.noteType,
        chiefComplaint: values.chiefComplaint,
        historyOfPresentIllness: values.historyOfPresentIllness,
        subjective: values.subjective,
        objective: values.objective,
        assessment: values.assessment,
        plan: values.plan,
        admissionDiagnosis: values.admissionDiagnosis,
        physicalExamination: values.physicalExamination,
        reviewOfSystems: values.reviewOfSystems,
        allergies: values.allergies,
        medications: values.medications,
        pastMedicalHistory: values.pastMedicalHistory,
        familyHistory: values.familyHistory,
        socialHistory: values.socialHistory,
        isDraft: values.isDraft || false,
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
        throw new Error(error.message || 'Failed to save clinical note');
      }

      message.success(mode === 'edit' ? 'Clinical note updated successfully' : 'Clinical note created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/clinical/notes'] });
      onSuccess();
      handleClose();
    } catch (error: any) {
      message.error(error.message || 'Failed to save clinical note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSign = async () => {
    if (!initialNote?.id) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/clinical/notes/${initialNote.id}/sign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to sign note');
      }

      message.success('Clinical note signed successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/clinical/notes'] });
      onSuccess();
      handleClose();
    } catch (error: any) {
      message.error(error.message || 'Failed to sign note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setActiveTab('soap');
    onCancel();
  };

  const soapTabContent = (
    <>
      <Form.Item
        name="subjective"
        label="Subjective (S)"
        rules={[{ required: noteType === 'progress', message: 'Subjective is required for progress notes' }]}
      >
        <TextArea
          rows={4}
          placeholder="Patient complaints, symptoms, history..."
        />
      </Form.Item>

      <Form.Item
        name="objective"
        label="Objective (O)"
        rules={[{ required: noteType === 'progress', message: 'Objective is required for progress notes' }]}
      >
        <TextArea
          rows={4}
          placeholder="Physical exam findings, vitals, lab results..."
        />
      </Form.Item>

      <Form.Item
        name="assessment"
        label="Assessment (A)"
        rules={[{ required: noteType === 'progress', message: 'Assessment is required for progress notes' }]}
      >
        <TextArea
          rows={4}
          placeholder="Diagnosis, condition assessment..."
        />
      </Form.Item>

      <Form.Item
        name="plan"
        label="Plan (P)"
        rules={[{ required: noteType === 'progress', message: 'Plan is required for progress notes' }]}
      >
        <TextArea
          rows={4}
          placeholder="Treatment plan, orders, follow-up..."
        />
      </Form.Item>
    </>
  );

  const admissionTabContent = (
    <>
      <Form.Item
        name="chiefComplaint"
        label="Chief Complaint"
        rules={[{ required: noteType === 'admission', message: 'Chief complaint is required' }]}
      >
        <TextArea rows={2} placeholder="Primary reason for admission..." />
      </Form.Item>

      <Form.Item
        name="historyOfPresentIllness"
        label="History of Present Illness"
      >
        <TextArea rows={4} placeholder="Detailed history of current illness..." />
      </Form.Item>

      <Form.Item
        name="admissionDiagnosis"
        label="Admission Diagnosis"
      >
        <TextArea rows={2} placeholder="Initial diagnosis..." />
      </Form.Item>

      <Form.Item
        name="physicalExamination"
        label="Physical Examination"
      >
        <TextArea rows={6} placeholder="Physical examination findings..." />
      </Form.Item>

      <Form.Item
        name="reviewOfSystems"
        label="Review of Systems"
      >
        <TextArea rows={4} placeholder="System review findings..." />
      </Form.Item>
    </>
  );

  const historyTabContent = (
    <>
      <Form.Item name="allergies" label="Allergies">
        <TextArea rows={2} placeholder="Known allergies..." />
      </Form.Item>

      <Form.Item name="medications" label="Current Medications">
        <TextArea rows={3} placeholder="Current medications..." />
      </Form.Item>

      <Form.Item name="pastMedicalHistory" label="Past Medical History">
        <TextArea rows={4} placeholder="Previous medical conditions, surgeries..." />
      </Form.Item>

      <Form.Item name="familyHistory" label="Family History">
        <TextArea rows={3} placeholder="Family medical history..." />
      </Form.Item>

      <Form.Item name="socialHistory" label="Social History">
        <TextArea rows={3} placeholder="Smoking, alcohol, occupation, lifestyle..." />
      </Form.Item>
    </>
  );

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>{mode === 'edit' ? 'Edit Clinical Note' : 'Create Clinical Note'}</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={900}
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          noteType,
          isDraft: false,
        }}
      >
        <Form.Item
          name="noteType"
          label="Note Type"
          rules={[{ required: true }]}
        >
          <Select disabled={mode === 'edit'}>
            <Option value="admission">Admission Note</Option>
            <Option value="progress">Progress Note (SOAP)</Option>
            <Option value="discharge">Discharge Summary</Option>
            <Option value="consultation">Consultation Note</Option>
          </Select>
        </Form.Item>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'soap',
              label: 'SOAP Format',
              children: soapTabContent,
            },
            {
              key: 'admission',
              label: 'Admission Details',
              children: admissionTabContent,
              disabled: noteType !== 'admission' && mode === 'create',
            },
            {
              key: 'history',
              label: 'History',
              children: historyTabContent,
            },
          ]}
        />

        <Divider />

        <Form.Item name="isDraft" valuePropName="checked">
          <Select>
            <Option value={false}>Final (Ready to Sign)</Option>
            <Option value={true}>Draft</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
              icon={<SaveOutlined />}
            >
              {mode === 'edit' ? 'Update' : 'Save'} Note
            </Button>
            {mode === 'edit' && initialNote && !initialNote.signedAt && (
              <Button
                type="default"
                onClick={handleSign}
                loading={isSubmitting}
                icon={<CheckCircleOutlined />}
              >
                Sign Note
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};




