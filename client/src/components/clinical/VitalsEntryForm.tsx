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
import { HeartOutlined, SaveOutlined, CloseOutlined, LineChartOutlined, EditOutlined } from '@ant-design/icons';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { getAuthToken } from '../../lib/auth';

const { TextArea } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

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

  // Vitals state (matching prescription form pattern)
  const [vitals, setVitals] = useState({
    bp: '',
    temp: '',
    pulse: '',
    spo2: '',
    rr: '',
    weight: '',
    height: '',
  });
  const [isHeightEditable, setIsHeightEditable] = useState(false);

  // Get hospital ID - use prop if provided, otherwise fetch
  const [hospitalId, setHospitalId] = useState<number | null>(propHospitalId || null);

  // Fetch patient data for height pre-fill
  const { data: patientData } = useQuery({
    queryKey: [`/api/patients/${patientId}/info`],
    queryFn: async () => {
      const token = getAuthToken();
      const response = await fetch(`/api/patients/${patientId}/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!patientId && open,
  });

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

  // Initialize vitals from initialVitals or patient data
  React.useEffect(() => {
    if (open) {
      if (initialVitals && mode === 'edit') {
        // Format BP from systolic/diastolic
        const bpValue = initialVitals.bpSystolic && initialVitals.bpDiastolic
          ? `${initialVitals.bpSystolic}/${initialVitals.bpDiastolic}`
          : '';
        
        setVitals({
          bp: bpValue,
          temp: initialVitals.temperature ? String(initialVitals.temperature) : '',
          pulse: initialVitals.pulse ? String(initialVitals.pulse) : '',
          spo2: initialVitals.spo2 ? String(initialVitals.spo2) : '',
          rr: initialVitals.respirationRate ? String(initialVitals.respirationRate) : '',
          weight: initialVitals.weight ? String(initialVitals.weight) : '',
          height: initialVitals.height ? String(initialVitals.height) : '',
        });
        form.setFieldsValue({
          notes: initialVitals.notes,
        });
      } else if (patientData?.patient?.height) {
        // Pre-fill height from patient data
        setVitals(prev => ({
          ...prev,
          height: String(patientData.patient.height),
        }));
        setIsHeightEditable(false);
      } else {
        // Reset vitals
        setVitals({
          bp: '',
          temp: '',
          pulse: '',
          spo2: '',
          rr: '',
          weight: '',
          height: '',
        });
        setIsHeightEditable(false);
      }
    }
  }, [open, initialVitals, mode, patientData, form]);

  const handleSubmit = async (values: any) => {
    if (!hospitalId) {
      message.error('Hospital information not available');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      
      // Parse BP from "120/80" format
      let bpSystolic: number | undefined;
      let bpDiastolic: number | undefined;
      if (vitals.bp) {
        const bpMatch = vitals.bp.match(/(\d+)\s*\/\s*(\d+)/);
        if (bpMatch) {
          bpSystolic = parseInt(bpMatch[1]);
          bpDiastolic = parseInt(bpMatch[2]);
        }
      }

      // Parse temperature
      let temperature: number | undefined;
      if (vitals.temp) {
        temperature = parseFloat(vitals.temp);
      }

      const vitalsPayload: any = {
        hospitalId,
        patientId,
        encounterId,
        appointmentId,
        bpSystolic,
        bpDiastolic,
        temperature,
        temperatureUnit: 'C', // Always Celsius
        pulse: vitals.pulse ? parseInt(vitals.pulse) : undefined,
        spo2: vitals.spo2 ? parseInt(vitals.spo2) : undefined,
        respirationRate: vitals.rr ? parseInt(vitals.rr) : undefined,
        weight: vitals.weight ? parseFloat(vitals.weight) : undefined,
        height: vitals.height ? parseFloat(vitals.height) : undefined,
        notes: values.notes,
      };

      // Remove undefined values
      Object.keys(vitalsPayload).forEach(key => {
        if (vitalsPayload[key] === undefined) {
          delete vitalsPayload[key];
        }
      });

      const response = await fetch('/api/clinical/vitals', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vitalsPayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save vitals');
      }

      // Update patient height/weight if provided
      if (vitals.height || vitals.weight) {
        const patientUpdatePayload: any = {};
        if (vitals.height) {
          patientUpdatePayload.height = parseFloat(vitals.height);
        }
        if (vitals.weight) {
          patientUpdatePayload.weight = parseFloat(vitals.weight);
        }

        if (Object.keys(patientUpdatePayload).length > 0) {
          try {
            const updateResponse = await fetch(`/api/patients/${patientId}/profile`, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(patientUpdatePayload),
            });
            if (updateResponse.ok) {
              console.log('✅ Patient height/weight updated');
            }
          } catch (updateError) {
            console.warn('⚠️ Failed to update patient height/weight:', updateError);
          }
        }
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
    setVitals({
      bp: '',
      temp: '',
      pulse: '',
      spo2: '',
      rr: '',
      weight: '',
      height: '',
    });
    setIsHeightEditable(false);
    onCancel();
  };


  // Don't render if patientId is missing
  if (!patientId) {
    return null;
  }

  return (
    <Modal
      title={null}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={850}
      style={{ top: 20 }}
      destroyOnHidden
      closeIcon={<CloseOutlined />}
      styles={{
        body: {
          padding: '24px',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto'
        }
      }}
    >
      {/* Custom Header */}
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <LineChartOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
          <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Record Vitals
          </Title>
        </div>
        <div style={{ marginLeft: '28px' }}>
          <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>
            Enter patient vital signs and measurements
          </Text>
          {patientData?.patient?.user?.fullName && (
            <Text strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
              Patient: {patientData.patient.user.fullName}
              {patientData.patient.dateOfBirth && (() => {
                const age = new Date().getFullYear() - new Date(patientData.patient.dateOfBirth).getFullYear();
                return ` (${age}Y)`;
              })()}
            </Text>
          )}
        </div>
      </div>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ marginBottom: 0 }}
      >
        {/* Vitals Record Section (matching prescription form design) */}
        <div style={{ 
          border: '2px solid #D1FAE5', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '24px',
          background: '#F0FDF4'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <LineChartOutlined style={{ color: '#10B981' }} />
            <Text strong style={{ fontSize: '14px' }}>Vitals Record</Text>
          </div>
          <Row gutter={16}>
            <Col span={6}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>BP</Text>
                <Input 
                  placeholder="120/80" 
                  value={vitals.bp}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                    // Auto-format: if 4+ digits, add "/" after 3rd digit
                    if (value.length > 3) {
                      value = value.slice(0, 3) + '/' + value.slice(3, 5);
                    }
                    setVitals({ ...vitals, bp: value });
                  }}
                  maxLength={6}
                  style={{ marginTop: '4px' }}
                />
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '2px' }}>mmHg</Text>
              </div>
            </Col>
            <Col span={6}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>Temp</Text>
                <Input 
                  placeholder="37.0" 
                  value={vitals.temp}
                  onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                  style={{ marginTop: '4px' }}
                />
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '2px' }}>°C</Text>
              </div>
            </Col>
            <Col span={6}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>Pulse</Text>
                <Input 
                  placeholder="72" 
                  value={vitals.pulse}
                  onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                  style={{ marginTop: '4px' }}
                />
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '2px' }}>bpm</Text>
              </div>
            </Col>
            <Col span={6}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>SpO2</Text>
                <Input 
                  placeholder="98" 
                  value={vitals.spo2}
                  onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                  style={{ marginTop: '4px' }}
                />
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '2px' }}>%</Text>
              </div>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: '12px' }}>
            <Col span={6}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>RR</Text>
                <Input 
                  placeholder="16" 
                  value={vitals.rr}
                  onChange={(e) => setVitals({ ...vitals, rr: e.target.value })}
                  style={{ marginTop: '4px' }}
                />
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '2px' }}>/min</Text>
              </div>
            </Col>
            <Col span={6}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>Weight</Text>
                <Input 
                  placeholder="70" 
                  value={vitals.weight}
                  onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                  style={{ marginTop: '4px' }}
                />
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '2px' }}>kg</Text>
              </div>
            </Col>
            <Col span={6}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>Height</Text>
                <Input 
                  placeholder="170" 
                  value={vitals.height}
                  onChange={(e) => setVitals({ ...vitals, height: e.target.value })}
                  disabled={!isHeightEditable && patientData?.patient?.height}
                  style={{ marginTop: '4px' }}
                  suffix={
                    patientData?.patient?.height && !isHeightEditable ? (
                      <EditOutlined 
                        onClick={() => setIsHeightEditable(true)}
                        style={{ cursor: 'pointer', color: '#1890ff' }}
                      />
                    ) : null
                  }
                />
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '2px' }}>cm</Text>
              </div>
            </Col>
          </Row>
        </div>

        {/* Notes Section */}
        <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
          <TextArea rows={2} placeholder="Additional notes..." />
        </Form.Item>
      </Form>

      {/* Footer */}
      <div style={{ 
        marginTop: '24px', 
        paddingTop: '16px', 
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px'
      }}>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          type="primary"
          onClick={() => form.submit()}
          loading={isSubmitting}
          icon={<SaveOutlined />}
        >
          Record Vitals
        </Button>
      </div>
    </Modal>
  );
};
