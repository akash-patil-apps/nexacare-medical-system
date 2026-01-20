import { useEffect, useState, useRef, useMemo } from "react";
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
  InputNumber,
  DatePicker
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  MedicineBoxOutlined,
  FileTextOutlined,
  CloseOutlined,
  LineChartOutlined,
  EditOutlined
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { apiRequest } from "../lib/queryClient";
import { getAuthToken, getUserFromToken } from "../lib/auth";
import type { Medication } from "../../../shared/schema";
import dayjs from "dayjs";
import prescriptionIcon from '../assets/images/prescription.png';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/**
 * Fuzzy matching function: checks if all characters in search term
 * appear in order in the target string (case-insensitive)
 * Examples:
 * - "prctm" matches "paracetamol" (p-r-c-t-m appear in order)
 * - "para" matches "paracetamol" (p-a-r-a appear in order)
 * - "amox" matches "amoxicillin" (a-m-o-x appear in order)
 */
function fuzzyMatch(searchTerm: string, target: string): boolean {
  if (!searchTerm || !target) return false;
  
  const search = searchTerm.toLowerCase();
  const text = target.toLowerCase();
  
  let searchIndex = 0;
  let textIndex = 0;
  
  // Check if all characters in search term appear in order in target
  while (searchIndex < search.length && textIndex < text.length) {
    if (search[searchIndex] === text[textIndex]) {
      searchIndex++; // Found a match, move to next character in search term
    }
    textIndex++; // Always move forward in target
  }
  
  // If we've matched all characters in search term, it's a match
  return searchIndex === search.length;
}

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
  const [isExtendLoading, setIsExtendLoading] = useState(false);
  
  // Inline medication form state
  const [currentMedication, setCurrentMedication] = useState<Partial<Medication>>({
    name: '',
    dosage: '',
    unit: 'mg',
    frequency: '',
    duration: '',
    timing: 'After meals',
    instructions: '',
  });
  
  // Vitals state
  const [vitals, setVitals] = useState({
    bp: '',
    temp: '',
    pulse: '',
    spo2: '',
    rr: '',
    weight: '',
    height: '',
  });
  
  // Patient data state
  const [patientData, setPatientData] = useState<any>(null);
  const [isHeightEditable, setIsHeightEditable] = useState(false);

  // Fetch patients for doctor to select from
  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/patients');
      return response.json();
    },
    enabled: !!doctorId && !patientsOverride,
  });

  // Fetch patient data when patientId is available
  const { data: fetchedPatientData } = useQuery({
    queryKey: ['/api/reception/patients', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const token = getAuthToken();
      const response = await fetch(`/api/reception/patients/${patientId}/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!patientId && isOpen,
  });

  // Update patientData when fetchedPatientData changes
  useEffect(() => {
    if (fetchedPatientData) {
      setPatientData(fetchedPatientData);
      // Pre-fill height if available
      if (fetchedPatientData.patient?.height && !isHeightEditable) {
        setVitals(prev => ({
          ...prev,
          height: fetchedPatientData.patient.height?.toString() || '',
        }));
      }
    }
  }, [fetchedPatientData, isHeightEditable]);

  // Fetch hospitals for doctor to select from
  const { data: hospitals } = useQuery({
    queryKey: ['/api/hospitals'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/hospitals');
      return response.json();
    },
    enabled: !!doctorId && !hideHospitalSelect,
  });

  // Fetch medicines catalog for selection - Pre-load when component mounts
  const { data: medicinesData, isLoading: isLoadingMedicines, error: medicinesError } = useQuery({
    queryKey: ['/api/medicines'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/medicines');
        const data = await response.json();
        // API returns array directly, not wrapped in { medicines: [...] }
        const medicines = Array.isArray(data) ? data : (data?.medicines || []);
        // Sort alphabetically by name
        const sorted = medicines.sort((a: any, b: any) => 
          (a.name || '').localeCompare(b.name || '')
        );
        console.log('✅ Medicines loaded:', sorted.length, 'items');
        if (sorted.length > 0) {
          console.log('📦 Sample medicines:', sorted.slice(0, 3).map((m: any) => m.name));
        }
        return sorted;
      } catch (error: any) {
        console.error('❌ Error fetching medicines:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const medicines = Array.isArray(medicinesData) ? medicinesData : [];
  
  // Debug logging
  useEffect(() => {
    if (isMedicationModalOpen) {
      console.log('💊 Medicine modal opened:', {
        isLoading: isLoadingMedicines,
        error: medicinesError,
        count: medicines.length,
        sample: medicines.slice(0, 3),
      });
    }
  }, [isMedicationModalOpen, isLoadingMedicines, medicinesError, medicines.length]);

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
  const loadMedicationsFromPrescription = (p: any | undefined) => {
    if (!p) {
      setMedications([]);
      return;
    }
    try {
      const meds = typeof p.medications === 'string' ? JSON.parse(p.medications) : p.medications;
      if (Array.isArray(meds)) {
        setMedications(meds as Medication[]);
      } else {
        setMedications([]);
      }
    } catch (err) {
      console.warn('⚠️ Failed to parse medications from prescription', err);
      setMedications([]);
    }
  };

  // Reset form only when modal first opens (not on every prop change)
  useEffect(() => {
    // Only reset when modal transitions from closed to open
    if (isOpen && !prevIsOpenRef.current) {
      form.resetFields();
      loadMedicationsFromPrescription(prescription);
      const derivedAppointmentId =
        appointmentId ??
        (patientId ? appointmentIdMap?.[patientId] : undefined);

      form.setFieldsValue({
        patientId: patientId ?? undefined,
        hospitalId: hospitalId ?? undefined,
        appointmentId: derivedAppointmentId ?? undefined,
        diagnosis: prescription?.diagnosis,
        instructions: prescription?.instructions,
      });
      
      // Reset inline medication form
      setCurrentMedication({
        name: '',
        dosage: '',
        unit: 'mg',
        frequency: '',
        duration: '',
        timing: 'After meals',
        instructions: '',
      });
      
      // Reset vitals (but keep height if patient has it)
      const initialHeight = fetchedPatientData?.patient?.height?.toString() || '';
      setVitals({
        bp: '',
        temp: '',
        pulse: '',
        spo2: '',
        rr: '',
        weight: '',
        height: initialHeight,
      });
      setIsHeightEditable(false);
    }
    // Update ref to track previous state
    prevIsOpenRef.current = isOpen;
  }, [isOpen, fetchedPatientData]); // Only depend on isOpen to prevent clearing fields while typing


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
      
      // Include appointmentId from form selection or prop - CRITICAL for tracking prescriptions
      const finalAppointmentId = cleanData.appointmentId || appointmentId;
      if (finalAppointmentId) {
        requestBody.appointmentId = finalAppointmentId;
        console.log('📋 Creating prescription with appointmentId:', finalAppointmentId);
      } else {
        console.warn('⚠️ WARNING: Creating prescription without appointmentId!');
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
    onSuccess: async (data: any) => {
      message.success('Prescription created successfully!');
      console.log('✅ Prescription created:', data);
      console.log('📋 Created prescription appointmentId:', data?.appointmentId || 'NOT SET');
      
      // Save vitals if any are provided
      if (vitals.bp || vitals.temp || vitals.pulse || vitals.spo2 || vitals.rr || vitals.weight || vitals.height) {
        try {
          const token = getAuthToken();
          const user = getUserFromToken();
          
          if (token && user && hospitalId) {
            // Parse BP (format: "120/80")
            let bpSystolic: number | undefined;
            let bpDiastolic: number | undefined;
            if (vitals.bp) {
              const bpMatch = vitals.bp.match(/(\d+)\s*\/\s*(\d+)/);
              if (bpMatch) {
                bpSystolic = parseInt(bpMatch[1]);
                bpDiastolic = parseInt(bpMatch[2]);
              }
            }
            
            // Parse temperature (convert from Fahrenheit to Celsius if needed)
            let temperature: number | undefined;
            let temperatureUnit = 'F'; // Default to Fahrenheit as shown in UI
            if (vitals.temp) {
              temperature = parseFloat(vitals.temp);
            }
            
            const vitalsPayload: any = {
              patientId: data.patientId || patientId,
              appointmentId: data.appointmentId || appointmentId,
              recordedByUserId: user.id,
              bpSystolic,
              bpDiastolic,
              temperature,
              temperatureUnit,
              pulse: vitals.pulse ? parseInt(vitals.pulse) : undefined,
              spo2: vitals.spo2 ? parseInt(vitals.spo2) : undefined,
              respirationRate: vitals.rr ? parseInt(vitals.rr) : undefined,
              weight: vitals.weight ? parseFloat(vitals.weight) : undefined,
              height: vitals.height ? parseFloat(vitals.height) : undefined,
            };
            
            // Remove undefined values
            Object.keys(vitalsPayload).forEach(key => {
              if (vitalsPayload[key] === undefined) {
                delete vitalsPayload[key];
              }
            });
            
            const vitalsResponse = await fetch('/api/clinical/vitals', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(vitalsPayload),
            });
            
            if (vitalsResponse.ok) {
              console.log('✅ Vitals saved successfully');
            } else {
              console.warn('⚠️ Failed to save vitals:', await vitalsResponse.text());
            }
            
            // Update patient profile with height/weight if provided
            const patientUpdatePayload: any = {};
            if (vitals.height) {
              patientUpdatePayload.height = parseFloat(vitals.height);
            }
            if (vitals.weight) {
              patientUpdatePayload.weight = parseFloat(vitals.weight);
            }
            
            // Note: Patient profile update is handled by backend when vitals are saved
            // The vitals chart stores the latest values, and patient profile can be updated separately if needed
            if (Object.keys(patientUpdatePayload).length > 0) {
              console.log('📝 Patient vitals to update:', patientUpdatePayload);
              // Backend can handle patient profile updates if needed
            }
          }
        } catch (error) {
          console.error('❌ Error saving vitals:', error);
          // Don't show error to user - vitals are optional
        }
      }
      
      // Invalidate all prescription-related queries to ensure all dashboards update
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions/doctor'] }); // Doctor dashboard
      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-prescriptions'] });
      
      // Force immediate refetch with await to ensure it completes
      try {
        await queryClient.refetchQueries({ queryKey: ['/api/prescriptions/doctor'] });
        console.log('✅ Prescriptions refetched after creation');
      } catch (error) {
        console.error('❌ Error refetching prescriptions:', error);
      }
      
      // Small delay before closing to allow UI to update
      setTimeout(() => {
        onClose();
        form.resetFields();
        setMedications([]);
      }, 100);
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
    onSuccess: async () => {
      message.success('Prescription updated successfully!');
      // Invalidate all prescription-related queries to ensure all dashboards update
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions/doctor'] }); // Doctor dashboard
      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-prescriptions'] });
      // Small delay to ensure backend has processed, then refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/prescriptions/doctor'] });
      }, 300);
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
  
  // Handle inline medication addition
  const handleAddMedicationInline = () => {
    if (!currentMedication.name || !currentMedication.dosage || !currentMedication.frequency || !currentMedication.duration) {
      message.error('Please fill in all required medication fields');
      return;
    }
    
    // Format duration to include "days" if it's just a number
    let durationValue = currentMedication.duration!;
    if (/^\d+$/.test(durationValue)) {
      durationValue = `${durationValue} days`;
    }
    
    const newMedication: Medication = {
      name: currentMedication.name!,
      dosage: currentMedication.dosage!,
      unit: currentMedication.unit || 'mg',
      frequency: currentMedication.frequency!,
      duration: durationValue,
      timing: currentMedication.timing || 'After meals',
      instructions: currentMedication.instructions || '',
    };
    
    setMedications([...medications, newMedication]);
    setCurrentMedication({
      name: '',
      dosage: '',
      unit: 'mg',
      frequency: '',
      duration: '',
      timing: 'After meals',
      instructions: '',
    });
    message.success('Medication added successfully!');
  };
  

  const isEditExpired = useMemo(() => {
    if (!prescription || !prescription.editableUntil) return false;
    const end = dayjs(prescription.editableUntil);
    return end.isValid() ? end.isBefore(dayjs()) : false;
  }, [prescription]);

  const remainingLabel = useMemo(() => {
    if (!prescription || !prescription.editableUntil) return null;
    const end = dayjs(prescription.editableUntil);
    if (!end.isValid()) return null;
    const diffHours = end.diff(dayjs(), 'hour');
    if (diffHours < 0) return 'Edit window expired';
    if (diffHours < 24) return `Edit window: ${diffHours}h left`;
    const diffDays = end.diff(dayjs(), 'day');
    return `Edit window: ${diffDays} days left`;
  }, [prescription]);

  const handleExtend = async () => {
    if (!prescription?.id) return;
    try {
      setIsExtendLoading(true);
      const token = getAuthToken();
      const res = await fetch(`/api/prescriptions/${prescription.id}/extend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error || 'Failed to extend');
        return;
      }
      message.success('Edit window extended by 7 days');
      await queryClient.invalidateQueries({ queryKey: ['/api/prescriptions/doctor'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
      // Refresh local view
      loadMedicationsFromPrescription(data);
      form.setFieldsValue({
        patientId: patientId ?? undefined,
        hospitalId: hospitalId ?? undefined,
        appointmentId: appointmentId ?? undefined,
        diagnosis: data?.diagnosis,
        instructions: data?.instructions,
      });
    } catch (err) {
      console.error('Extend error', err);
      message.error('Failed to extend');
    } finally {
      setIsExtendLoading(false);
    }
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
    message.success('Medication removed');
  };

  return (
    <>
      <Modal
        title={null}
        open={isOpen}
        onCancel={onClose}
        footer={null}
        width={1100}
        destroyOnHidden
        getContainer={() => document.body}
        zIndex={2000}
        maskClosable={false}
        closeIcon={<CloseOutlined />}
        styles={{
          body: {
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }
        }}
      >
        {/* Custom Header */}
        <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <FileTextOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  {prescription ? 'Edit Prescription' : 'Create New Prescription'}
                </Title>
              </div>
              <Text type="secondary" style={{ fontSize: '14px', marginLeft: '28px' }}>
                Quick medication entry with minimal clicks
              </Text>
            </div>
          </div>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={prescription}
        >
          {/* Patient and Diagnosis Section */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={12}>
              <Form.Item
                name="patientId"
                label={<Text strong>Patient *</Text>}
                rules={[{ required: true, message: 'Please select a patient' }]}
              >
                {patientId && (selectedPatientOption || fallbackPatientOption || patientData) ? (
                  <div style={{ 
                    padding: '8px 12px', 
                    border: '1px solid #D9D9D9', 
                    borderRadius: '6px',
                    background: '#FAFAFA',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <Text>
                      Patient : {(() => {
                        const patient = selectedPatientOption || fallbackPatientOption || (patientData?.user);
                        const name = patient?.fullName || patient?.name || patientName || 'Unknown';
                        // Calculate age from dateOfBirth
                        let age = '';
                        if (patientData?.patient?.dateOfBirth) {
                          const dob = dayjs(patientData.patient.dateOfBirth);
                          const years = dayjs().diff(dob, 'year');
                          age = `${years}Y`;
                        }
                        return `${name}${age ? ` ${age}` : ''}`;
                      })()}
                    </Text>
                  </div>
                ) : (
                <Select
                  placeholder="Select patient"
                  showSearch
                  optionFilterProp="children"
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
                )}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="diagnosis"
                label={<Text strong>Diagnosis *</Text>}
                rules={[{ required: true, message: 'Please enter diagnosis' }]}
              >
                <Input placeholder="e.g., Upper Respiratory Tract Infection" />
              </Form.Item>
            </Col>
          </Row>

            {hideHospitalSelect || hospitalId ? (
              <Form.Item name="hospitalId" initialValue={hospitalId} hidden>
                <Input />
              </Form.Item>
            ) : (
                <Form.Item
                  name="hospitalId"
                  label="Hospital"
                  rules={[{ required: true, message: 'Please select a hospital' }]}
                  initialValue={hospitalId}
              hidden={!!hospitalId}
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
            )}

          <Form.Item name="appointmentId" hidden initialValue={appointmentId}>
            <Input />
          </Form.Item>

          {/* Vitals Record Section (Optional) */}
          <div style={{ 
            border: '2px solid #D1FAE5', 
            borderRadius: '8px', 
            padding: '16px', 
            marginBottom: '24px',
            background: '#F0FDF4'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <LineChartOutlined style={{ color: '#10B981' }} />
              <Text strong style={{ fontSize: '14px' }}>Vitals Record (Optional)</Text>
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

          {/* Medications Section */}
          <div style={{ 
            border: '2px solid #DBEAFE', 
            borderRadius: '8px', 
            padding: '16px', 
            marginBottom: '24px',
            background: '#EFF6FF'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MedicineBoxOutlined style={{ color: '#3B82F6', fontSize: '18px' }} />
                <Text strong style={{ fontSize: '14px' }}>Medications ({medications.length})</Text>
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>Press Enter or select from dropdown to add</Text>
            </div>

            {/* Inline Medication Form */}
            <Row gutter={8} style={{ marginBottom: '12px' }}>
              <Col span={6}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Medicine Name *</Text>
                <Select
                  showSearch
                  placeholder="e.g., Amoxicillin"
                  value={currentMedication.name}
                  onChange={(value) => {
                    // Just update the name, dosage will be auto-filled onSelect
                    setCurrentMedication({ ...currentMedication, name: value });
                  }}
                  onSelect={(value) => {
                    // When medicine is selected from dropdown, check if we can auto-add
                    const selectedMedicine = medicines.find((m: any) => m.name === value);
                    let updatedMedication = { ...currentMedication, name: value };
                    
                    if (selectedMedicine) {
                      const strengthMatch = selectedMedicine.strength?.match(/(\d+)/);
                      const dosageValue = strengthMatch ? strengthMatch[1] : selectedMedicine.strength || '';
                      let unitValue = selectedMedicine.unit || '';
                      if (!unitValue && selectedMedicine.strength) {
                        const unitMatch = selectedMedicine.strength.match(/([a-zA-Z]+)/);
                        unitValue = unitMatch ? unitMatch[1] : selectedMedicine.dosageForm || '';
                      }
                      if (!unitValue) {
                        unitValue = selectedMedicine.dosageForm || '';
                      }
                      updatedMedication = {
                        ...updatedMedication,
                        dosage: dosageValue,
                        unit: unitValue,
                      };
                    }
                    
                    setCurrentMedication(updatedMedication);
                    // Try to add medication if all required fields are filled
                    if (updatedMedication.name && updatedMedication.dosage && updatedMedication.frequency && updatedMedication.duration) {
                      handleAddMedicationInline();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMedicationInline();
                    }
                  }}
                  loading={isLoadingMedicines}
                  filterOption={(input, option) => {
                    const label = String(option?.label || '').toLowerCase();
                    const value = String(option?.value || '').toLowerCase();
                    const searchTerm = input.toLowerCase().trim();
                    if (!searchTerm) return true;
                    if (label.includes(searchTerm) || value.includes(searchTerm)) return true;
                    return fuzzyMatch(searchTerm, label) || fuzzyMatch(searchTerm, value);
                  }}
                  options={medicines.map((medicine: any) => ({
                    value: medicine.name,
                    label: `${medicine.name}${medicine.strength ? ` (${medicine.strength})` : ''}`,
                  }))}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={4}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Dosage *</Text>
                <Input 
                  placeholder="500mg" 
                  value={currentMedication.dosage}
                  onChange={(e) => setCurrentMedication({ ...currentMedication, dosage: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMedicationInline();
                    }
                  }}
                />
              </Col>
              <Col span={4}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Frequency *</Text>
                <Select
                  showSearch
                  placeholder="Select or type (e.g., 222)"
                  value={currentMedication.frequency}
                  onChange={(value) => {
                    const updatedMedication = { ...currentMedication, frequency: value };
                    setCurrentMedication(updatedMedication);
                    // Try to add medication if all required fields are filled
                    if (updatedMedication.name && updatedMedication.dosage && updatedMedication.frequency && updatedMedication.duration) {
                      handleAddMedicationInline();
                    }
                  }}
                  onSearch={(value) => {
                    // Auto-format manual input like "222" to "2-2-2" when user types 3 digits
                    if (/^\d{3}$/.test(value)) {
                      const formatted = value.split('').join('-');
                      setCurrentMedication({ ...currentMedication, frequency: formatted });
                    } else if (/^\d{1,3}-\d{1,3}-\d{1,3}$/.test(value)) {
                      setCurrentMedication({ ...currentMedication, frequency: value });
                    }
                  }}
                  onBlur={() => {
                    // Format on blur if user typed something like "222"
                    const value = currentMedication.frequency || '';
                    if (/^\d{3}$/.test(value)) {
                      const formatted = value.split('').join('-');
                      setCurrentMedication({ ...currentMedication, frequency: formatted });
                    }
                  }}
                  filterOption={(input, option) => {
                    const label = String(option?.label || '').toLowerCase();
                    const value = String(option?.value || '').toLowerCase();
                    const searchTerm = input.toLowerCase().trim();
                    if (!searchTerm) return true;
                    // Allow custom input if it matches pattern (e.g., "222" or "2-2-2")
                    if (/^\d{3}$/.test(searchTerm) || /^\d{1,3}-\d{1,3}-\d{1,3}$/.test(searchTerm)) {
                      return true;
                    }
                    return label.includes(searchTerm) || value.includes(searchTerm);
                  }}
                  allowClear
                  style={{ width: '100%' }}
                >
                  <Option value="1-0-0">1-0-0</Option>
                  <Option value="0-1-0">0-1-0</Option>
                  <Option value="0-0-1">0-0-1</Option>
                  <Option value="1-0-1">1-0-1</Option>
                  <Option value="1-1-1">1-1-1</Option>
                  <Option value="0-1-1">0-1-1</Option>
                  <Option value="1-1-0">1-1-0</Option>
                </Select>
              </Col>
              <Col span={4}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Days *</Text>
                <Input.Group compact style={{ display: 'flex' }}>
                <Button
                  onClick={() => {
                      const currentDays = parseInt(currentMedication.duration?.replace(/\D/g, '') || '0') || 0;
                      if (currentDays > 0) {
                        setCurrentMedication({ ...currentMedication, duration: (currentDays - 1).toString() });
                      }
                  }}
                    style={{ width: '32px', padding: 0 }}
                >
                    -
                </Button>
                  <Input 
                    placeholder="7" 
                    value={currentMedication.duration?.replace(/\D/g, '') || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Only numbers
                      setCurrentMedication({ ...currentMedication, duration: value });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMedicationInline();
                      }
                    }}
                    style={{ flex: 1, textAlign: 'center' }}
                  />
                  <Button 
                    onClick={() => {
                      const currentDays = parseInt(currentMedication.duration?.replace(/\D/g, '') || '0') || 0;
                      setCurrentMedication({ ...currentMedication, duration: (currentDays + 1).toString() });
                    }}
                    style={{ width: '32px', padding: 0 }}
                  >
                    +
                  </Button>
                </Input.Group>
              </Col>
              <Col span={4}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Timing</Text>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button
                    type={currentMedication.timing === 'Before meals' ? 'primary' : 'default'}
                    onClick={() => setCurrentMedication({ ...currentMedication, timing: 'Before meals' })}
                    style={{ flex: 1 }}
                  >
                    B
                  </Button>
                  <Button
                    type={currentMedication.timing === 'After meals' ? 'primary' : 'default'}
                    onClick={() => setCurrentMedication({ ...currentMedication, timing: 'After meals' })}
                    style={{ flex: 1 }}
                  >
                    A
                  </Button>
                  <Select
                    value={currentMedication.timing}
                    onChange={(value) => setCurrentMedication({ ...currentMedication, timing: value })}
                    style={{ flex: 1 }}
                    size="small"
                  >
                    <Option value="With meals">With</Option>
                    <Option value="Morning">Morning</Option>
                    <Option value="Evening">Evening</Option>
                    <Option value="Night">Night</Option>
                    <Option value="Anytime">Any</Option>
                  </Select>
            </div>
              </Col>
            </Row>


            {/* Medications List */}
            {medications.length > 0 ? (
              <div style={{ 
                border: '1px dashed #D1D5DB', 
                borderRadius: '8px', 
                padding: '16px',
                background: '#FFFFFF',
                minHeight: '100px'
              }}>
                {medications.map((medication, index) => (
                  <div key={index} style={{ 
                    padding: '8px', 
                    marginBottom: '8px', 
                    background: '#F9FAFB', 
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                        <div>
                      <Text strong>{medication.name}</Text>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        {medication.dosage} {medication.unit} • {medication.frequency} • {medication.duration} • {medication.timing}
                        {medication.instructions && <div style={{ marginTop: '4px' }}>{medication.instructions}</div>}
                        </div>
                    </div>
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={() => handleRemoveMedication(index)}
                      size="small"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                border: '2px dashed #D1D5DB', 
                borderRadius: '8px', 
                padding: '40px',
                textAlign: 'center',
                background: '#FFFFFF'
              }}>
                <MedicineBoxOutlined style={{ fontSize: '32px', color: '#9CA3AF', marginBottom: '8px' }} />
                <div>
                  <Text type="secondary">No medications added yet. Fill the form above and press Enter or select medicine from dropdown</Text>
                </div>
              </div>
            )}
          </div>

          {/* General Instructions */}
          <Form.Item
            name="instructions"
            label={<Text strong>General Instructions</Text>}
            style={{ marginBottom: '24px' }}
          >
            <TextArea
              rows={3}
              placeholder="Enter general instructions for the patient (e.g., Rest, avoid cold drinks, etc.)"
            />
          </Form.Item>

          {/* Date Fields */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={12}>
              <Form.Item
                name="followUpDate"
                label={<Text strong>Follow-up Date (Optional)</Text>}
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder="dd/mm/yyyy"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
              {remainingLabel && (
                <Text type={isEditExpired ? 'danger' : 'secondary'} style={{ marginRight: 'auto', alignSelf: 'center' }}>
                  {remainingLabel}
                </Text>
              )}
              {isEditExpired && (
                <Button onClick={handleExtend} loading={isExtendLoading}>
                  Extend edit window (+7 days)
                </Button>
              )}
              <Button onClick={onClose} style={{ minWidth: '100px' }}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<FileTextOutlined />}
                loading={createPrescriptionMutation.isPending || updatePrescriptionMutation.isPending}
                disabled={!!prescription && isEditExpired && !isExtendLoading}
                style={{ minWidth: '160px' }}
              >
                {prescription ? 'Update Prescription' : 'Create Prescription'}
              </Button>
            </div>
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
        zIndex={3000} // Higher than parent prescription modal to stay on top
        getContainer={() => document.body}
        maskClosable={true}
      >
        <Form
          form={medicationForm}
          layout="vertical"
          onFinish={handleAddMedication}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="name"
                label="Medicine Name"
                rules={[{ required: true, message: 'Please select medicine' }]}
              >
                <Select
                  showSearch
                  placeholder="Search or select medicine... (try: prctm for Paracetamol)"
                  loading={isLoadingMedicines}
                  optionFilterProp="label"
                  filterOption={(input, option) => {
                    const label = String(option?.label || '').toLowerCase();
                    const value = String(option?.value || '').toLowerCase();
                    const searchTerm = input.toLowerCase().trim();
                    
                    // Show all when no search term
                    if (!searchTerm) return true;
                    
                    // Exact match (fast path)
                    if (label.includes(searchTerm) || value.includes(searchTerm)) {
                      return true;
                    }
                    
                    // Fuzzy matching: check if all characters in search term appear in order in the medicine name
                    // Example: "prctm" matches "paracetamol" because p-r-c-t-m appear in order
                    return fuzzyMatch(searchTerm, label) || fuzzyMatch(searchTerm, value);
                  }}
                  popupMatchSelectWidth={true}
                  notFoundContent={
                    isLoadingMedicines 
                      ? <span>Loading medicines...</span> 
                      : medicines.length === 0
                        ? <span>No medicines available. Please contact administrator.</span>
                        : <span>No medicines found matching your search</span>
                  }
                  onChange={(value) => {
                    // Auto-fill fields from selected medicine
                    const selectedMedicine = medicines.find((m: any) => m.name === value);
                    if (selectedMedicine) {
                      // Extract numeric value from strength (e.g., "500mg" -> "500")
                      const strengthMatch = selectedMedicine.strength?.match(/(\d+)/);
                      const dosageValue = strengthMatch ? strengthMatch[1] : selectedMedicine.strength || '';
                      
                      // Determine unit from strength or dosageForm
                      let unitValue = selectedMedicine.unit || '';
                      if (!unitValue && selectedMedicine.strength) {
                        // Extract unit from strength (e.g., "500mg" -> "mg")
                        const unitMatch = selectedMedicine.strength.match(/([a-zA-Z]+)/);
                        unitValue = unitMatch ? unitMatch[1] : selectedMedicine.dosageForm || '';
                      }
                      if (!unitValue) {
                        unitValue = selectedMedicine.dosageForm || '';
                      }
                      
                      medicationForm.setFieldsValue({
                        dosage: dosageValue,
                        unit: unitValue,
                        name: selectedMedicine.name,
                      });
                    }
                  }}
                  options={medicines.map((medicine: any) => ({
                    value: medicine.name,
                    label: `${medicine.name}${medicine.strength ? ` (${medicine.strength})` : ''}${medicine.brandName ? ` - ${medicine.brandName}` : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dosage"
                label="Dosage"
                rules={[{ required: true, message: 'Please enter dosage' }]}
              >
                <Input placeholder="e.g., 500" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Unit"
                rules={[{ required: true, message: 'Please select unit' }]}
              >
                <Select placeholder="Select unit" showSearch>
                  <Option value="mg">mg</Option>
                  <Option value="g">g</Option>
                  <Option value="ml">ml</Option>
                  <Option value="tablets">tablets</Option>
                  <Option value="capsules">capsules</Option>
                  <Option value="drops">drops</Option>
                  <Option value="spoonful">spoonful</Option>
                  <Option value="tablet">tablet</Option>
                  <Option value="capsule">capsule</Option>
                  <Option value="injection">injection</Option>
                  <Option value="vial">vial</Option>
                  <Option value="ampoule">ampoule</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
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
