import React, { useState, useEffect, useMemo } from 'react';
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
  CloseOutlined,
  FileTextOutlined,
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
  doctorId?: number; // For receptionist requests
  patientsOverride?: Array<{ id: number; fullName: string; mobileNumber?: string }>;
}

export default function LabRequestModal({
  open,
  onCancel,
  onSuccess,
  patientId,
  appointmentId,
  doctorId,
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

  const basePatients = patientsOverride || 
    (Array.isArray(patientsData?.patients) 
      ? patientsData.patients 
      : Array.isArray(patientsData) 
        ? patientsData 
        : []);

  // Fetch patient details if patientId is provided but not in the list
  const [fetchedPatient, setFetchedPatient] = useState<any>(null);
  
  useEffect(() => {
    if (patientId && open) {
      const patientInList = basePatients.find((p: any) => p.id === patientId || String(p.id) === String(patientId));
      if (!patientInList) {
        // Fetch patient details
        const fetchPatient = async () => {
          try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(`/api/patients/${patientId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (response.ok) {
              const patientData = await response.json();
              if (patientData.patient) {
                const patient = patientData.patient;
                setFetchedPatient({
                  id: patient.id,
                  fullName: patient.user?.fullName || patient.name || `Patient #${patient.id}`,
                  name: patient.user?.fullName || patient.name || `Patient #${patient.id}`,
                  mobileNumber: patient.user?.mobileNumber
                });
              }
            }
          } catch (error) {
            console.error('Error fetching patient:', error);
            // Fallback to placeholder
            setFetchedPatient({
              id: patientId,
              fullName: `Patient #${patientId}`,
              name: `Patient #${patientId}`,
            });
          }
        };
        fetchPatient();
      } else {
        setFetchedPatient(null);
      }
    } else {
      setFetchedPatient(null);
    }
  }, [patientId, open, basePatients]);

  // Ensure the selected patient is always in the list
  const patients = useMemo(() => {
    const patientList = [...basePatients];
    
    // If patientId is provided but patient is not in the list
    if (patientId && !patientList.find((p: any) => p.id === patientId || String(p.id) === String(patientId))) {
      // Try to find patient in patientsOverride first
      const overridePatient = patientsOverride?.find((p: any) => p.id === patientId);
      if (overridePatient) {
        patientList.push(overridePatient);
      } else if (fetchedPatient) {
        // Use fetched patient data
        patientList.push(fetchedPatient);
      } else {
        // Add a placeholder patient entry so the Select can display something
        patientList.push({
          id: patientId,
          fullName: `Patient #${patientId}`,
          name: `Patient #${patientId}`,
        });
      }
    }
    
    return patientList;
  }, [basePatients, patientId, patientsOverride, fetchedPatient]);

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
      
      // Wait for patients list to be ready before setting patientId
      const setFormValues = () => {
        const selectedPatient = patients.find((p: any) => 
          p.id === patientId || String(p.id) === String(patientId)
        );
        
        form.setFieldsValue({
          patientId: patientId,
          appointmentId: appointmentId,
          priority: 'normal',
          requestedDate: dayjs(),
        });
        
        // Force update to ensure Select displays the correct label
        if (patientId && selectedPatient) {
          setTimeout(() => {
            form.setFieldsValue({ patientId });
          }, 100);
        }
      };
      
      // If patients list is ready, set values immediately
      if (patients.length > 0 || fetchedPatient) {
        setFormValues();
      } else {
        // Otherwise wait a bit for patients to load
        const timer = setTimeout(setFormValues, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [open, patientId, appointmentId, form, patients, fetchedPatient]);

  const requestMutation = useMutation({
    mutationFn: async (values: any) => {
      const token = localStorage.getItem('auth-token');
      
      // Handle multiple test names - create a request for each test
      const testNames = Array.isArray(values.testName) ? values.testName : [values.testName];
      const testNamesFiltered = testNames.filter((name: string) => name && name.trim() !== '');
      
      if (testNamesFiltered.length === 0) {
        throw new Error('Please select at least one test name');
      }
      
      // Create requests for all selected tests
      const requests = await Promise.all(
        testNamesFiltered.map(async (testName: string) => {
          const payload = {
            patientId: values.patientId,
            doctorId: doctorId || values.doctorId || undefined, // Include doctorId if available (for receptionist requests)
            labId: values.labId,
            testName: testName.trim(),
            reportDate: values.requestedDate ? values.requestedDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            priority: values.priority,
            notes: values.notes,
            instructions: values.instructions,
          };
          
          const response = await fetch('/api/labs/requests', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to create lab request for ${testName}`);
          }
          
          return response.json();
        })
      );
      
      return { success: true, requests };
    },
    onSuccess: (data: any) => {
      const testCount = data?.requests?.length || 1;
      message.success(`Successfully created ${testCount} lab test request${testCount > 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: ['/api/labs/doctor/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/labs/requests'] });
      // Trigger a custom event to notify receptionist dashboard to refetch
      window.dispatchEvent(new CustomEvent('labTestCreated', { 
        detail: { patientId: form.getFieldValue('patientId') } 
      }));
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
      title={null}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={700}
      zIndex={3000}
      centered
      getContainer={() => document.body}
      maskClosable={false}
      destroyOnHidden
      closeIcon={<CloseOutlined />}
      styles={{
        body: {
          padding: '20px',
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'hidden',
        }
      }}
    >
      {/* Custom Header */}
      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <ExperimentOutlined style={{ fontSize: '18px', color: '#1D4ED8' }} />
          <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Request Lab Test
          </Title>
        </div>
        {patientId && (() => {
          const selectedPatient = patients.find((p: any) => p.id === patientId || String(p.id) === String(patientId));
          const patientName = selectedPatient?.fullName || selectedPatient?.name || fetchedPatient?.fullName || `Patient #${patientId}`;
          return (
            <Text type="secondary" style={{ fontSize: '13px', marginLeft: '26px' }}>
              Patient: {patientName}
            </Text>
          );
        })()}
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        style={{ marginBottom: 0 }}
      >
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="patientId"
              label={<Text style={{ fontSize: '13px' }}>Patient</Text>}
              rules={[{ required: true, message: 'Please select a patient' }]}
              style={{ marginBottom: '12px' }}
            >
              <Select
                placeholder="Select patient"
                showSearch
                disabled={!!patientId}
                size="small"
                filterOption={(input, option) => {
                  const label = option?.label as string;
                  const children = option?.children as string;
                  return label?.toLowerCase().includes(input.toLowerCase()) ||
                         children?.toLowerCase().includes(input.toLowerCase());
                }}
                optionLabelProp="label"
                value={patientId}
                notFoundContent={patients.length === 0 ? 'Loading patients...' : 'No patients found'}
              >
                {patients.map((patient: any) => {
                  const patientName = patient.fullName || patient.name || `Patient #${patient.id}`;
                  return (
                    <Option 
                      key={patient.id} 
                      value={patient.id}
                      label={patientName}
                    >
                      {patientName}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="labId"
              label={<Text style={{ fontSize: '13px' }}>Preferred Lab (Optional)</Text>}
              style={{ marginBottom: '12px' }}
            >
              <Select
                placeholder="Select lab"
                allowClear
                showSearch
                size="small"
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

        <Form.Item
          name="testName"
          label={<Text style={{ fontSize: '13px' }}>Test Name</Text>}
          rules={[{ required: true, message: 'Please enter or select test name' }]}
          style={{ marginBottom: '12px' }}
        >
          <Select
            placeholder="Select or type test name"
            showSearch
            allowClear
            mode="tags"
            size="small"
            options={commonTests.map(test => ({ label: test, value: test }))}
          />
        </Form.Item>

        <Form.Item
          name="priority"
          label={<Text style={{ fontSize: '13px' }}>Priority</Text>}
          rules={[{ required: true, message: 'Please select priority' }]}
          initialValue="normal"
          style={{ marginBottom: '12px' }}
        >
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            {[
              { value: 'normal', label: 'Normal', color: '#10B981', bgColor: '#D1FAE5', borderColor: '#10B981' },
              { value: 'high', label: 'High', color: '#F59E0B', bgColor: '#FEF3C7', borderColor: '#F59E0B' },
              { value: 'urgent', label: 'Urgent', color: '#EF4444', bgColor: '#FEE2E2', borderColor: '#EF4444' },
            ].map(option => {
              const isSelected = form.getFieldValue('priority') === option.value;
              
              return (
                <Button
                  key={option.value}
                  type="default"
                  onClick={() => {
                    form.setFieldsValue({ priority: option.value });
                  }}
                  style={{
                    flex: 1,
                    height: '40px',
                    borderRadius: '8px',
                    border: `2px solid ${isSelected ? option.borderColor : '#E5E7EB'}`,
                    background: isSelected ? option.bgColor : '#FFFFFF',
                    color: isSelected ? option.color : '#6B7280',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="requestedDate"
              label={<Text style={{ fontSize: '13px' }}>Requested Date</Text>}
              rules={[{ required: true, message: 'Please select requested date' }]}
              style={{ marginBottom: '12px' }}
            >
              <DatePicker
                style={{ width: '100%' }}
                size="small"
                format="YYYY-MM-DD"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="notes"
              label={<Text style={{ fontSize: '13px' }}>Clinical Notes (Optional)</Text>}
              style={{ marginBottom: '12px' }}
            >
              <Input 
                size="small"
                placeholder="Reason for test, clinical findings..." 
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="instructions"
          label={<Text style={{ fontSize: '13px' }}>Special Instructions (Optional)</Text>}
          style={{ marginBottom: 0 }}
        >
          <TextArea
            rows={2}
            size="small"
            placeholder="Any special instructions for the lab technician..."
          />
        </Form.Item>
      </Form>

      {/* Footer */}
      <div style={{ 
        marginTop: '16px', 
        paddingTop: '12px', 
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px'
      }}>
        <Button size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="small"
          type="primary"
          onClick={handleSubmit}
          loading={requestMutation.isPending}
          icon={<ExperimentOutlined />}
        >
          Request Test
        </Button>
      </div>
    </Modal>
  );
}

