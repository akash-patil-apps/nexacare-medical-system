import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  Space,
  Typography,
  message,
  Row,
  Col,
  Tag,
  Alert,
} from 'antd';
import {
  ExperimentOutlined,
  UserOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

interface LabRequestModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  patientId?: number;
  appointmentId?: number;
  patientsOverride?: Array<{ id: number; fullName: string; mobileNumber?: string }>;
}

export default function LabRequestModal({
  open,
  onCancel,
  onSuccess,
  patientId,
  appointmentId,
  patientsOverride,
}: LabRequestModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch patients for selection
  const { data: patientsData } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return { patients: [] };
      return response.json();
    },
    enabled: !patientsOverride,
  });

  const patients = patientsOverride || 
    (Array.isArray(patientsData?.patients) 
      ? patientsData.patients 
      : Array.isArray(patientsData) 
        ? patientsData 
        : []);

  // Fetch labs for selection
  const { data: labsData } = useQuery({
    queryKey: ['/api/labs'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/labs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const labs = Array.isArray(labsData) ? labsData : [];

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        patientId: patientId,
        appointmentId: appointmentId,
        priority: 'normal',
        requestedDate: dayjs(),
      });
    }
  }, [open, patientId, appointmentId, form]);

  const requestMutation = useMutation({
    mutationFn: async (values: any) => {
      const token = localStorage.getItem('auth-token');
      const payload = {
        patientId: values.patientId,
        labId: values.labId,
        testName: Array.isArray(values.testName) ? values.testName[0] : values.testName,
        testType: values.testType,
        reportDate: values.requestedDate ? values.requestedDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        priority: values.priority,
        notes: values.notes,
        instructions: values.instructions,
      };

      const response = await fetch('/api/labs/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create lab request');
      }

      return response.json();
    },
    onSuccess: () => {
      message.success('Lab request created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/labs/doctor/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/labs/requests'] });
      form.resetFields();
      onSuccess?.();
      onCancel();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create lab request');
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      requestMutation.mutate(values);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const testTypes = [
    'Blood Test',
    'Urine Test',
    'X-Ray',
    'CT Scan',
    'MRI',
    'Ultrasound',
    'ECG',
    'Biopsy',
    'Culture',
    'Other',
  ];

  const commonTests = [
    'Complete Blood Count (CBC)',
    'Blood Glucose (Fasting)',
    'Lipid Profile',
    'Liver Function Test (LFT)',
    'Kidney Function Test (KFT)',
    'Thyroid Function Test (TFT)',
    'Urine Routine',
    'Chest X-Ray',
    'ECG',
    'Other',
  ];

  return (
    <Modal
      title={
        <Space>
          <ExperimentOutlined style={{ fontSize: '20px', color: '#1D4ED8' }} />
          <span>Request Lab Test</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={requestMutation.isPending}
          icon={<ExperimentOutlined />}
        >
          Request Test
        </Button>,
      ]}
      destroyOnClose
    >
      <Alert
        message="Lab Request"
        description="This will create a lab request that will appear in the lab technician's queue. The lab will process the request and upload results when ready."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="patientId"
              label="Patient"
              rules={[{ required: true, message: 'Please select a patient' }]}
            >
              <Select
                placeholder="Select patient"
                showSearch
                disabled={!!patientId}
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {patients.map((patient: any) => (
                  <Option key={patient.id} value={patient.id}>
                    {patient.fullName || patient.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="labId"
              label="Preferred Lab (Optional)"
            >
              <Select
                placeholder="Select lab"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {labs.map((lab: any) => (
                  <Option key={lab.id} value={lab.id}>
                    {lab.name || `Lab ${lab.id}`}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="appointmentId"
          hidden
        >
          <Input type="hidden" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="testName"
              label="Test Name"
              rules={[{ required: true, message: 'Please enter or select test name' }]}
            >
              <Select
                placeholder="Select or type test name"
                showSearch
                allowClear
                mode="tags"
                options={commonTests.map(test => ({ label: test, value: test }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="testType"
              label="Test Type"
              rules={[{ required: true, message: 'Please select test type' }]}
            >
              <Select placeholder="Select test type">
                {testTypes.map((type) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="priority"
          label="Priority"
          rules={[{ required: true, message: 'Please select priority' }]}
        >
          <Select>
            <Option value="normal">
              <Tag color="blue">Normal</Tag>
            </Option>
            <Option value="high">
              <Tag color="orange">High</Tag>
            </Option>
            <Option value="urgent">
              <Tag color="red">Urgent</Tag>
            </Option>
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="requestedDate"
              label="Requested Date"
              rules={[{ required: true, message: 'Please select requested date' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="notes"
              label="Clinical Notes (Optional)"
            >
              <Input placeholder="Reason for test, clinical findings..." />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="instructions"
          label="Special Instructions (Optional)"
        >
          <TextArea
            rows={3}
            placeholder="Any special instructions for the lab technician..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

