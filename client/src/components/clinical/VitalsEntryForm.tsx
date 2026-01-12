import React, { useState } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Input,
  Button,
  Space,
  message,
  Row,
  Col,
  Typography,
  Select,
} from 'antd';
import { HeartOutlined, SaveOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../../lib/auth';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface VitalsEntryFormProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  patientId: number;
  encounterId?: number;
  appointmentId?: number;
  initialVitals?: any;
  mode?: 'create' | 'edit';
  hospitalId?: number; // Optional: if provided, will use this instead of fetching
}

export const VitalsEntryForm: React.FC<VitalsEntryFormProps> = ({
  open,
  onCancel,
  onSuccess,
  patientId,
  encounterId,
  appointmentId,
  initialVitals,
  mode = 'create',
  hospitalId: propHospitalId,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get hospital ID - use prop if provided, otherwise fetch
  const [hospitalId, setHospitalId] = useState<number | null>(propHospitalId || null);

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (initialVitals && mode === 'edit') {
      form.setFieldsValue({
        temperature: initialVitals.temperature ? parseFloat(initialVitals.temperature) : undefined,
        temperatureUnit: initialVitals.temperatureUnit || 'C',
        bpSystolic: initialVitals.bpSystolic,
        bpDiastolic: initialVitals.bpDiastolic,
        pulse: initialVitals.pulse,
        respirationRate: initialVitals.respirationRate,
        spo2: initialVitals.spo2,
        painScale: initialVitals.painScale,
        weight: initialVitals.weight ? parseFloat(initialVitals.weight) : undefined,
        height: initialVitals.height ? parseFloat(initialVitals.height) : undefined,
        bmi: initialVitals.bmi ? parseFloat(initialVitals.bmi) : undefined,
        bloodGlucose: initialVitals.bloodGlucose ? parseFloat(initialVitals.bloodGlucose) : undefined,
        gcs: initialVitals.gcs,
        urineOutput: initialVitals.urineOutput ? parseFloat(initialVitals.urineOutput) : undefined,
        notes: initialVitals.notes,
      });
    }
  }, [initialVitals, mode, form]);

  const handleSubmit = async (values: any) => {
    if (!hospitalId) {
      message.error('Hospital information not available');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/clinical/vitals', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hospitalId,
          patientId,
          encounterId,
          appointmentId,
          ...values,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save vitals');
      }

      message.success('Vitals recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/clinical/vitals'] });
      onSuccess();
      handleClose();
    } catch (error: any) {
      message.error(error.message || 'Failed to save vitals');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onCancel();
  };

  // Calculate BMI if weight and height are provided
  const calculateBMI = () => {
    const weight = form.getFieldValue('weight');
    const height = form.getFieldValue('height');
    if (weight && height && height > 0) {
      const heightInMeters = height / 100; // Convert cm to meters
      const bmi = weight / (heightInMeters * heightInMeters);
      form.setFieldsValue({ bmi: parseFloat(bmi.toFixed(2)) });
    }
  };

  // Don't render if patientId is missing
  if (!patientId) {
    return null;
  }

  return (
    <Modal
      title={
        <Space>
          <HeartOutlined />
          <span>Record Vitals</span>
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
          Record Vitals
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ marginBottom: 0 }}
      >
        <Row gutter={[12, 8]}>
          <Col span={8}>
            <Form.Item
              name="temperature"
              label="Temp (°C)"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={30}
                max={45}
                step={0.1}
                placeholder="36.5"
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="bpSystolic"
              label="BP Systolic"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={50}
                max={250}
                placeholder="120"
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="bpDiastolic"
              label="BP Diastolic"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={30}
                max={150}
                placeholder="80"
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="pulse"
              label="Pulse (bpm)"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={30}
                max={200}
                placeholder="72"
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="respirationRate"
              label="Respiration"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={10}
                max={40}
                placeholder="16"
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="spo2"
              label="SpO2 (%)"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={70}
                max={100}
                placeholder="98"
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="painScale"
              label="Pain (0-10)"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={10}
                placeholder="0"
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="weight"
              label="Weight (kg)"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={300}
                step={0.1}
                placeholder="70"
                onBlur={calculateBMI}
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="height"
              label="Height (cm)"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={50}
                max={250}
                step={0.1}
                placeholder="170"
                onBlur={calculateBMI}
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="bmi"
              label="BMI"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={10}
                max={50}
                step={0.1}
                disabled
                placeholder="Auto"
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="bloodGlucose"
              label="Glucose (mg/dL)"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={50}
                max={500}
                placeholder="100"
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="gcs"
              label="GCS (3-15)"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={3}
                max={15}
                placeholder="15"
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="urineOutput"
              label="Urine (ml)"
              style={{ marginBottom: 8 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={5000}
                placeholder="500"
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
              <TextArea rows={2} placeholder="Additional notes..." size="small" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
