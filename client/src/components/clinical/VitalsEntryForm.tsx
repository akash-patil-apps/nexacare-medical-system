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
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get hospital ID from user context
  const [hospitalId, setHospitalId] = useState<number | null>(null);

  React.useEffect(() => {
    const fetchHospital = async () => {
      try {
        const token = localStorage.getItem('auth-token');
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
  }, []);

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
      const token = localStorage.getItem('auth-token');
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
      footer={null}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="temperature"
              label="Temperature (°C)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={30}
                max={45}
                step={0.1}
                placeholder="36.5"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="temperatureUnit"
              label="Unit"
              initialValue="C"
            >
              <Select>
                <Option value="C">°C</Option>
                <Option value="F">°F</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="bpSystolic"
              label="BP Systolic (mmHg)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={50}
                max={250}
                placeholder="120"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="bpDiastolic"
              label="BP Diastolic (mmHg)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={30}
                max={150}
                placeholder="80"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="pulse"
              label="Pulse (bpm)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={30}
                max={200}
                placeholder="72"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="respirationRate"
              label="Respiration Rate (per min)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={10}
                max={40}
                placeholder="16"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="spo2"
              label="SpO2 (%)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={70}
                max={100}
                placeholder="98"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="painScale"
              label="Pain Scale (0-10)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={10}
                placeholder="0"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="weight"
              label="Weight (kg)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={300}
                step={0.1}
                placeholder="70"
                onBlur={calculateBMI}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="height"
              label="Height (cm)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={50}
                max={250}
                step={0.1}
                placeholder="170"
                onBlur={calculateBMI}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="bmi"
              label="BMI"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={10}
                max={50}
                step={0.1}
                disabled
                placeholder="Auto-calculated"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="bloodGlucose"
              label="Blood Glucose (mg/dL)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={50}
                max={500}
                placeholder="100"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="gcs"
              label="GCS (3-15)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={3}
                max={15}
                placeholder="15"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="urineOutput"
              label="Urine Output (ml)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={5000}
                placeholder="500"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notes" label="Notes">
          <TextArea rows={3} placeholder="Additional notes about vitals..." />
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
              Record Vitals
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};


