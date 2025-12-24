import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Select, 
  Space, 
  Typography, 
  Divider,
  Row,
  Col,
  Card,
  List,
  Popconfirm,
  App,
  InputNumber
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  MedicineBoxOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { apiRequest } from "../lib/queryClient";
import { getAuthToken } from "../lib/auth";
import type { Medication } from "../../../shared/schema";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface PrescriptionFormProps {
  isOpen: boolean;
  onClose: () => void;
  prescription?: any;
  patientId?: number;
  patientName?: string;
  doctorId?: number;
  hospitalId?: number;
  appointmentId?: number;
  patientsOverride?: Array<{ id: number; fullName: string; mobileNumber?: string }>;
  hideHospitalSelect?: boolean;
  appointmentIdMap?: Record<number, number | undefined>;
}

export default function PrescriptionForm({
  isOpen,
  onClose,
  prescription,
  patientId,
  patientName,
  doctorId,
  hospitalId,
  appointmentId,
  patientsOverride,
  hideHospitalSelect,
  appointmentIdMap,
}: PrescriptionFormProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);
  const [medicationForm] = Form.useForm();
  const queryClient = useQueryClient();
  const prevIsOpenRef = useRef(false);

  // Fetch patients for doctor to select from
  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/patients');
      return response.json();
    },
    enabled: !!doctorId && !patientsOverride,
  });

  // Fetch hospitals for doctor to select from
  const { data: hospitals } = useQuery({
    queryKey: ['/api/hospitals'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/hospitals');
      return response.json();
    },
    enabled: !!doctorId && !hideHospitalSelect,
  });

  const resolvedPatients =
    patientsOverride ??
    (Array.isArray(patients?.patients)
      ? patients.patients
      : Array.isArray(patients)
        ? patients
        : []);

  const selectedPatientOption =
    patientId && Array.isArray(resolvedPatients)
      ? resolvedPatients.find((p: any) => p.id === patientId)
      : null;

  const fallbackPatientOption =
    !selectedPatientOption && patientId
      ? {
          id: patientId,
          fullName: patientName || `Patient #${patientId}`,
          mobileNumber: undefined,
        }
      : null;

  const resolvedHospitals =
    Array.isArray(hospitals?.hospitals)
      ? hospitals.hospitals
      : Array.isArray(hospitals)
        ? hospitals
        : [];
  // Reset form only when modal first opens (not on every prop change)
  useEffect(() => {
    // Only reset when modal transitions from closed to open
    if (isOpen && !prevIsOpenRef.current) {
      form.resetFields();
      setMedications([]);
      const derivedAppointmentId =
        appointmentId ??
        (patientId ? appointmentIdMap?.[patientId] : undefined);

      form.setFieldsValue({
        patientId: patientId ?? undefined,
        hospitalId: hospitalId ?? undefined,
        appointmentId: derivedAppointmentId ?? undefined,
      });
    }
    // Update ref to track previous state
    prevIsOpenRef.current = isOpen;
  }, [isOpen]); // Only depend on isOpen to prevent clearing fields while typing


  const createPrescriptionMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Don't send doctorId - backend will get it from the authenticated user
      const { doctorId: _, ...cleanData } = data;
      
      const requestBody: any = {
        ...cleanData,
        medications: JSON.stringify(medications),
        patientId: cleanData.patientId || patientId,
        hospitalId: cleanData.hospitalId || hospitalId,
      };
      
      // Include appointmentId from form selection or prop
      if (cleanData.appointmentId || appointmentId) {
        requestBody.appointmentId = cleanData.appointmentId || appointmentId;
      }

      // Exclude fields not in the schema (followUpDate, id, createdAt, updatedAt, etc.)
      const { followUpDate, id, createdAt, updatedAt, doctorId: __, ...cleanRequestBody } = requestBody;

      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanRequestBody),
        credentials: 'include',
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (!response.ok) {
        let errorMessage = 'Failed to create prescription';
        let errorDetails: any = null;
        
        if (isJson) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            errorDetails = errorData.details;
            
            // If there are validation details, format them nicely
            if (errorDetails && Array.isArray(errorDetails)) {
              const validationErrors = errorDetails.map((e: any) => `${e.field}: ${e.message}`).join(', ');
              errorMessage = `${errorMessage}. ${validationErrors}`;
            } else if (errorDetails && typeof errorDetails === 'string') {
              errorMessage = `${errorMessage}. ${errorDetails}`;
            }
          } catch (e) {
            errorMessage = `Server error (${response.status}). Please try again.`;
          }
        } else {
          // Response is HTML or plain text
          const text = await response.text();
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            errorMessage = `Server error (${response.status}). Please check your authentication and try again.`;
          } else {
            errorMessage = text || `Server error (${response.status})`;
          }
        }
        
        throw new Error(errorMessage);
      }

      // Response is OK, parse JSON
      if (isJson) {
        return await response.json();
      } else {
        throw new Error('Server returned non-JSON response');
      }
    },
    onSuccess: () => {
      message.success('Prescription created successfully!');
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-prescriptions'] });
      onClose();
      form.resetFields();
      setMedications([]);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create prescription');
    },
  });

  const updatePrescriptionMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Exclude fields not in the schema (followUpDate, id, createdAt, updatedAt, etc.)
      const { followUpDate, id, createdAt, updatedAt, doctorId: __, ...cleanUpdateData } = data;
      
      const response = await fetch(`/api/prescriptions/${prescription.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...cleanUpdateData,
          medications: JSON.stringify(medications),
          appointmentId: cleanUpdateData.appointmentId || appointmentId,
        }),
        credentials: 'include',
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (!response.ok) {
        let errorMessage = 'Failed to update prescription';
        
        if (isJson) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = `Server error (${response.status}). Please try again.`;
          }
        } else {
          const text = await response.text();
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            errorMessage = `Server error (${response.status}). Please check your authentication and try again.`;
          } else {
            errorMessage = text || `Server error (${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      // Response is OK, parse JSON
      if (isJson) {
        return await response.json();
      } else {
        throw new Error('Server returned non-JSON response');
      }
    },
    onSuccess: () => {
      message.success('Prescription updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-prescriptions'] });
      onClose();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to update prescription');
    },
  });

  const handleSubmit = (values: any) => {
    if (medications.length === 0) {
      message.error('Please add at least one medication');
      return;
    }

    if (prescription) {
      updatePrescriptionMutation.mutate(values);
    } else {
      createPrescriptionMutation.mutate(values);
    }
  };

  const handleAddMedication = (values: Medication) => {
    setMedications([...medications, values]);
    medicationForm.resetFields();
    setIsMedicationModalOpen(false);
    message.success('Medication added successfully!');
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
    message.success('Medication removed');
  };

  const formatMedicationDisplay = (med: Medication) => {
    return `${med.name} - ${med.dosage} ${med.unit} (${med.frequency}, ${med.timing})`;
  };

  return (
    <>
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            {prescription ? 'Edit Prescription' : 'Create New Prescription'}
          </Space>
        }
        open={isOpen}
        onCancel={onClose}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={prescription}
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
                  optionFilterProp="children"
                  disabled={!!patientId}
                  onChange={(value: number) => {
                    form.setFieldsValue({
                      appointmentId: appointmentIdMap?.[value],
                    });
                  }}
                >
                  {selectedPatientOption && !resolvedPatients?.some((p: any) => p.id === selectedPatientOption.id) && (
                    <Option key={selectedPatientOption.id} value={selectedPatientOption.id}>
                      {selectedPatientOption.fullName || selectedPatientOption.name || `Patient #${selectedPatientOption.id}`}
                      {selectedPatientOption.mobileNumber ? ` (${selectedPatientOption.mobileNumber})` : ''}
                    </Option>
                  )}
                  {fallbackPatientOption && (
                    <Option key={fallbackPatientOption.id} value={fallbackPatientOption.id}>
                      {fallbackPatientOption.fullName}
                    </Option>
                  )}
                  {resolvedPatients?.map((patient: any) => (
                    <Option key={patient.id} value={patient.id}>
                      {patient.fullName || patient.name || 'Unknown'}{' '}
                      {patient.mobileNumber ? `(${patient.mobileNumber})` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            {hideHospitalSelect || hospitalId ? (
              <Form.Item name="hospitalId" initialValue={hospitalId} hidden>
                <Input />
              </Form.Item>
            ) : (
              <Col span={12}>
                <Form.Item
                  name="hospitalId"
                  label="Hospital"
                  rules={[{ required: true, message: 'Please select a hospital' }]}
                  initialValue={hospitalId}
                >
                  <Select
                    placeholder="Select hospital"
                    showSearch
                    optionFilterProp="children"
                    disabled={!!hospitalId}
                  >
                    {resolvedHospitals?.map((hospital: any) => (
                      <Option key={hospital.id} value={hospital.id}>
                        {hospital.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>

          <Form.Item name="appointmentId" hidden initialValue={appointmentId}>
            <Input />
          </Form.Item>

          <Form.Item
            name="diagnosis"
            label="Diagnosis"
            rules={[{ required: true, message: 'Please enter diagnosis' }]}
          >
            <TextArea
              rows={3}
              placeholder="Enter patient diagnosis"
            />
          </Form.Item>

          <Form.Item
            name="instructions"
            label="General Instructions"
          >
            <TextArea
              rows={2}
              placeholder="Enter general instructions for the patient"
            />
          </Form.Item>

          <Divider />

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Title level={5} style={{ margin: 0 }}>
                <MedicineBoxOutlined style={{ marginRight: '8px' }} />
                Medications ({medications.length})
              </Title>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setIsMedicationModalOpen(true);
                }}
              >
                Add Medication
              </Button>
            </div>

            {medications.length > 0 ? (
              <List
                dataSource={medications}
                renderItem={(medication, index) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        title="Remove medication?"
                        description="Are you sure you want to remove this medication?"
                        onConfirm={() => handleRemoveMedication(index)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      title={medication.name}
                      description={
                        <div>
                          <Text strong>Dosage:</Text> {medication.dosage} {medication.unit}<br />
                          <Text strong>Frequency:</Text> {medication.frequency}<br />
                          <Text strong>Timing:</Text> {medication.timing}<br />
                          <Text strong>Duration:</Text> {medication.duration}<br />
                          {medication.instructions && (
                            <>
                              <Text strong>Instructions:</Text> {medication.instructions}
                            </>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Card style={{ textAlign: 'center', background: '#fafafa' }}>
                <Text type="secondary">No medications added yet. Click "Add Medication" to start.</Text>
              </Card>
            )}
          </div>

          <Divider />

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createPrescriptionMutation.isPending || updatePrescriptionMutation.isPending}
              >
                {prescription ? 'Update Prescription' : 'Create Prescription'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Medication Form Modal */}
      <Modal
        title="Add Medication"
        open={isMedicationModalOpen}
        onCancel={() => {
          setIsMedicationModalOpen(false);
          medicationForm.resetFields();
        }}
        footer={null}
        width={600}
        zIndex={2000}
        getContainer={() => document.body}
        maskClosable={true}
      >
        <Form
          form={medicationForm}
          layout="vertical"
          onFinish={handleAddMedication}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Medicine Name"
                rules={[{ required: true, message: 'Please enter medicine name' }]}
              >
                <Input placeholder="e.g., Paracetamol" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dosage"
                label="Dosage"
                rules={[{ required: true, message: 'Please enter dosage' }]}
              >
                <Input placeholder="e.g., 500" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Unit"
                rules={[{ required: true, message: 'Please select unit' }]}
              >
                <Select placeholder="Select unit">
                  <Option value="mg">mg</Option>
                  <Option value="g">g</Option>
                  <Option value="ml">ml</Option>
                  <Option value="tablets">tablets</Option>
                  <Option value="capsules">capsules</Option>
                  <Option value="drops">drops</Option>
                  <Option value="spoonful">spoonful</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="Quantity"
                rules={[{ required: true, message: 'Please enter quantity' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="e.g., 10"
                  min={1}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="frequency"
                label="Frequency"
                rules={[{ required: true, message: 'Please enter frequency' }]}
              >
                <Select placeholder="Select frequency">
                  <Option value="Once daily">Once daily</Option>
                  <Option value="Twice daily">Twice daily</Option>
                  <Option value="Three times daily">Three times daily</Option>
                  <Option value="Four times daily">Four times daily</Option>
                  <Option value="Every 4 hours">Every 4 hours</Option>
                  <Option value="Every 6 hours">Every 6 hours</Option>
                  <Option value="Every 8 hours">Every 8 hours</Option>
                  <Option value="Every 12 hours">Every 12 hours</Option>
                  <Option value="As needed">As needed</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="timing"
                label="Timing"
                rules={[{ required: true, message: 'Please enter timing' }]}
              >
                <Select placeholder="Select timing">
                  <Option value="Before meals">Before meals</Option>
                  <Option value="After meals">After meals</Option>
                  <Option value="With meals">With meals</Option>
                  <Option value="Morning">Morning</Option>
                  <Option value="Evening">Evening</Option>
                  <Option value="Night">Night</Option>
                  <Option value="Anytime">Anytime</Option>
                  <Option value="As directed">As directed</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="duration"
            label="Duration"
            rules={[{ required: true, message: 'Please enter duration' }]}
          >
            <Input placeholder="e.g., 7 days, 2 weeks, 1 month" />
          </Form.Item>

          <Form.Item
            name="instructions"
            label="Special Instructions"
          >
            <TextArea
              rows={2}
              placeholder="Any special instructions for this medication"
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsMedicationModalOpen(false);
                medicationForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Add Medication
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
