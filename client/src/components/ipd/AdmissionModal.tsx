import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  message,
  Spin,
  Typography,
  Divider,
  Empty,
} from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { UserOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BedSelector } from './BedSelector';
import type { BedStructure, IpdEncounter } from '../../types/ipd';
import dayjs, { type Dayjs } from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface AdmissionModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (encounter: IpdEncounter) => void;
  patientId?: number;
  hospitalId?: number;
}

export const AdmissionModal: React.FC<AdmissionModalProps> = ({
  open,
  onCancel,
  onSuccess,
  patientId,
  hospitalId,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
  const [searchMobile, setSearchMobile] = useState('');
  const [foundPatient, setFoundPatient] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch bed structure
  const { data: structure, isLoading: structureLoading, error: structureError } = useQuery<BedStructure>({
    queryKey: ['/api/ipd/structure', hospitalId],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('Fetching bed structure from /api/ipd/structure');
      const response = await fetch('/api/ipd/structure', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch bed structure';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error('Failed to fetch bed structure:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Bed structure fetched successfully:', {
        floors: data.floors?.length || 0,
        wards: data.wards?.length || 0,
        rooms: data.rooms?.length || 0,
        beds: data.beds?.length || 0,
        structure: data,
      });
      return data;
    },
    enabled: open,
    retry: 1,
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

  // Fetch doctors
  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ['/api/doctors/hospital', hospitalId],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      if (!hospitalId) {
        // If no hospitalId, fetch all doctors
        const response = await fetch('/api/doctors', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch doctors');
        return response.json();
      }
      // Use the correct endpoint for hospital-specific doctors
      const response = await fetch(`/api/doctors/hospital/${hospitalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        console.error('Failed to fetch doctors:', response.status, await response.text());
        throw new Error('Failed to fetch doctors');
      }
      const data = await response.json();
      console.log('Fetched doctors:', data);
      return data;
    },
    enabled: open,
  });

  // Search patient by mobile
  const handleSearchPatient = async () => {
    if (!searchMobile || searchMobile.length < 10) {
      message.warning('Please enter a valid mobile number (at least 10 digits)');
      return;
    }

    setIsSearching(true);
    try {
      const token = localStorage.getItem('auth-token');
      // Use the lookup endpoint which searches by mobile number
      const response = await fetch(`/api/reception/patients/lookup?mobile=${searchMobile}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Patient lookup result:', data);
        
        if (data.user && data.patient) {
          // User exists and has patient profile
          setFoundPatient({
            id: data.patient.id,
            userId: data.user.id,
            user: data.user,
          });
          form.setFieldsValue({ patientId: data.patient.id });
          message.success(`Patient found: ${data.user.fullName}`);
        } else if (data.user && !data.patient) {
          // User exists but no patient profile - need to create patient profile
          message.warning('User found but patient profile not created. Please register as patient first.');
          setFoundPatient(null);
        } else {
          // No user found
          message.warning('Patient not found. Please register the patient first.');
          setFoundPatient(null);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to search patient' }));
        message.error(errorData.message || 'Failed to search patient');
        setFoundPatient(null);
      }
    } catch (error: any) {
      console.error('Error searching patient:', error);
      message.error(error.message || 'Error searching patient');
      setFoundPatient(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (values: any) => {
    if (!selectedBedId) {
      message.warning('Please select a bed');
      return;
    }

    if (!values.patientId && !patientId) {
      message.warning('Please search and select a patient');
      return;
    }

    if (!values.admissionType) {
      message.warning('Please select an admission type');
      return;
    }

    // Show confirmation dialog
    Modal.confirm({
      title: 'Confirm Patient Admission',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to admit this patient to the selected bed? This action will allocate the bed and create an IPD encounter.`,
      okText: 'Yes, Admit Patient',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        setIsSubmitting(true);
        try {
          const token = localStorage.getItem('auth-token');
          const response = await fetch('/api/ipd/encounters', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              patientId: values.patientId || patientId,
              admittingDoctorId: values.admittingDoctorId || null,
              attendingDoctorId: values.attendingDoctorId || null,
              admissionType: values.admissionType,
              bedId: selectedBedId,
              // Note: admissionNotes is not stored in schema yet - can be added later
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to admit patient');
          }

          const encounter = await response.json();
          message.success('Patient admitted successfully');
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/encounters'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/beds/available'] });
          queryClient.invalidateQueries({ queryKey: ['/api/ipd/structure'] });
          onSuccess(encounter);
          handleClose();
        } catch (error: any) {
          message.error(error.message || 'Failed to admit patient');
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleClose = () => {
    form.resetFields();
    setSelectedBedId(null);
    setSearchMobile('');
    setFoundPatient(null);
    onCancel();
  };

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      if (patientId) {
        form.setFieldsValue({ patientId });
        // Note: We don't set foundPatient here because we don't have user info
        // The form will work with just the patientId
      } else {
        form.resetFields();
        setSearchMobile('');
        setFoundPatient(null);
      }
      setSelectedBedId(null);
    }
  }, [open, patientId, form]);

  return (
    <Modal
      title="Admit Patient to IPD"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={900}
      styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          admissionType: 'elective',
        }}
      >
        {/* Patient Search/Selection */}
        {!patientId && (
          <>
            <Form.Item label="Search Patient by Mobile">
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  value={searchMobile}
                  onChange={(e) => setSearchMobile(e.target.value)}
                  prefix={<UserOutlined />}
                />
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  loading={isSearching}
                  onClick={handleSearchPatient}
                >
                  Search
                </Button>
              </Space.Compact>
            </Form.Item>
            {foundPatient && (
              <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 8 }}>
                <Space direction="vertical" size={4}>
                  <Space>
                    <UserOutlined />
                    <div>
                      <Text strong>{foundPatient.user?.fullName || 'Unknown'}</Text>
                      <br />
                      <Text type="secondary">Mobile: {foundPatient.user?.mobileNumber}</Text>
                    </div>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 24 }}>
                    Patient ID: {foundPatient.id}
                  </Text>
                </Space>
              </div>
            )}
            <Form.Item
              name="patientId"
              label="Patient ID"
              rules={[{ required: true, message: 'Please search and select a patient' }]}
              help={foundPatient ? `Patient found: ${foundPatient.user?.fullName}` : 'Search by mobile number to find patient'}
            >
              <Input 
                type="number" 
                placeholder={foundPatient ? `Patient ID: ${foundPatient.id}` : "Enter patient ID or search by mobile"} 
                disabled={!!foundPatient}
              />
            </Form.Item>
          </>
        )}

        {/* Admission Details */}
        <Form.Item
          name="admissionType"
          label="Admission Type"
          rules={[{ required: true, message: 'Please select admission type' }]}
        >
          <Select>
            <Select.Option value="elective">Elective</Select.Option>
            <Select.Option value="emergency">Emergency</Select.Option>
            <Select.Option value="day_care">Day Care</Select.Option>
            <Select.Option value="observation">Observation</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="admittingDoctorId" label="Admitting Doctor">
          <Select 
            placeholder="Select admitting doctor" 
            allowClear
            loading={doctorsLoading}
            notFoundContent={doctorsLoading ? <Spin size="small" /> : 'No doctors available'}
            showSearch
            filterOption={(input, option) =>
              (option?.children as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
            }
          >
            {doctors.length === 0 && !doctorsLoading ? (
              <Select.Option disabled value="">
                No doctors found. Please ensure doctors are registered for this hospital.
              </Select.Option>
            ) : (
              doctors.map((doc: any) => (
                <Select.Option key={doc.id} value={doc.id}>
                  {doc.fullName || 'Unknown'} - {doc.specialty || 'General'}
                </Select.Option>
              ))
            )}
          </Select>
        </Form.Item>

        <Form.Item name="attendingDoctorId" label="Attending Doctor">
          <Select 
            placeholder="Select attending doctor" 
            allowClear
            loading={doctorsLoading}
            notFoundContent={doctorsLoading ? <Spin size="small" /> : 'No doctors available'}
            showSearch
            filterOption={(input, option) =>
              (option?.children as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
            }
          >
            {doctors.length === 0 && !doctorsLoading ? (
              <Select.Option disabled value="">
                No doctors found. Please ensure doctors are registered for this hospital.
              </Select.Option>
            ) : (
              doctors.map((doc: any) => (
                <Select.Option key={doc.id} value={doc.id}>
                  {doc.fullName || 'Unknown'} - {doc.specialty || 'General'}
                </Select.Option>
              ))
            )}
          </Select>
        </Form.Item>

        <Form.Item name="admissionNotes" label="Admission Notes">
          <TextArea rows={3} placeholder="Enter admission notes (optional)" />
        </Form.Item>

        <Divider>Bed Selection</Divider>

        {/* Bed Selector */}
        {structureLoading || bedsLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Loading bed structure...</Text>
            </div>
          </div>
        ) : structureError ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Empty 
              description={
                <div>
                  <Text type="danger">Failed to load bed structure</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {structureError instanceof Error ? structureError.message : 'Unknown error'}
                  </Text>
                  <br />
                  <Button 
                    type="link" 
                    onClick={() => window.location.reload()}
                    style={{ marginTop: 8 }}
                  >
                    Reload Page
                  </Button>
                </div>
              }
            />
          </div>
        ) : structure ? (
          <BedSelector
            structure={structure}
            selectedBedId={selectedBedId}
            onSelectBed={setSelectedBedId}
            showOnlyAvailable={true}
            isLoading={structureLoading || bedsLoading}
          />
        ) : (
          <Empty description="No bed structure available. Please set up beds from the admin dashboard." />
        )}

        {selectedBedId && (
          <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 8 }}>
            <Text type="success">Bed selected: {selectedBedId}</Text>
          </div>
        )}

        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              disabled={!selectedBedId || (!patientId && !form.getFieldValue('patientId'))}
            >
              Admit Patient
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

