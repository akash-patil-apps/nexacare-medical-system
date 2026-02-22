import React, { useState, useEffect, useMemo } from 'react';
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
  List,
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
  defaultAdmittingDoctorId?: number; // Optional: auto-set admitting doctor (for doctor dashboard)
}

export const AdmissionModal: React.FC<AdmissionModalProps> = ({
  open,
  onCancel,
  onSuccess,
  patientId,
  hospitalId,
  defaultAdmittingDoctorId,
  todayAppointments = [],
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
  const [searchMobile, setSearchMobile] = useState('');
  const [foundPatient, setFoundPatient] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFromToday, setSelectedFromToday] = useState<TodayAppointmentItem | null>(null);
  const [quickCreateModalOpen, setQuickCreateModalOpen] = useState(false);
  const [quickCreateForm] = Form.useForm();
  const [quickCreateLoading, setQuickCreateLoading] = useState(false);

  // Unique today's patients (first appointment per patient)
  const todayPatientsList = useMemo(() => {
    if (!todayAppointments?.length) return [];
    const byId = new Map<number, TodayAppointmentItem>();
    todayAppointments.forEach((a) => {
      if (a.patientId && !byId.has(a.patientId)) {
        byId.set(a.patientId, a);
      }
    });
    return Array.from(byId.values());
  }, [todayAppointments]);

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
              patientId: pid,
              admittingDoctorId: values.admittingDoctorId || null,
              attendingDoctorId: values.attendingDoctorId || null,
              admissionType: values.admissionType,
              bedId: selectedBedId,
              attendantName: values.attendantName || null,
              attendantMobile: values.attendantMobile || null,
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
    quickCreateForm.resetFields();
    setSelectedBedId(null);
    setSearchMobile('');
    setFoundPatient(null);
    setSelectedFromToday(null);
    setQuickCreateModalOpen(false);
    onCancel();
  };

  const handleSelectTodayPatient = (item: TodayAppointmentItem) => {
    form.setFieldsValue({ patientId: item.patientId });
    setSelectedFromToday(item);
    setFoundPatient(null);
  };

  const handleQuickCreateSubmit = async (values: { fullName: string; mobileNumber: string; gender?: string; dateOfBirth?: any }) => {
    setQuickCreateLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const body: Record<string, string> = {
        fullName: values.fullName.trim(),
        mobileNumber: values.mobileNumber.trim(),
      };
      if (values.gender) body.gender = values.gender;
      if (values.dateOfBirth && dayjs.isDayjs(values.dateOfBirth)) {
        body.dateOfBirth = values.dateOfBirth.format('YYYY-MM-DD');
      }
      const response = await fetch('/api/reception/patients/quick-create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to create profile');
      }
      const data = await response.json();
      setFoundPatient({
        id: data.patient.id,
        userId: data.user.id,
        user: data.user,
      });
      form.setFieldsValue({ patientId: data.patient.id });
      setQuickCreateModalOpen(false);
      quickCreateForm.resetFields();
      message.success('Profile created. You can now select bed and admit.');
    } catch (e: any) {
      message.error(e.message || 'Failed to create profile');
    } finally {
      setQuickCreateLoading(false);
    }
  };

  const currentPatientId = patientId ?? form.getFieldValue('patientId') ?? foundPatient?.id ?? selectedFromToday?.patientId;
  const showPatientSearch = !patientId && !currentPatientId;

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      if (patientId) {
        form.setFieldsValue({ patientId });
      } else {
        form.resetFields();
        setSearchMobile('');
        setFoundPatient(null);
        setSelectedFromToday(null);
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
        {/* Patient Search/Selection - no ID search; today's patients first, then mobile search, then quick-create */}
        <Form.Item name="patientId" hidden>
          <Input type="hidden" />
        </Form.Item>
        {!patientId && (
          <>
            {currentPatientId ? (
              <div style={{ marginBottom: 16, padding: 12, background: 'var(--ant-color-primary-bg, #f0f9ff)', borderRadius: 8, border: '1px solid var(--ant-color-primary-border, #91caff)' }}>
                <Space direction="vertical" size={4}>
                  <Space>
                    <UserOutlined />
                    <div>
                      <Text strong>
                        {foundPatient?.user?.fullName ?? selectedFromToday?.patientName ?? 'Patient'}
                      </Text>
                      <br />
                      <Text type="secondary">
                        Mobile: {foundPatient?.user?.mobileNumber ?? selectedFromToday?.patientMobile ?? '—'}
                      </Text>
                    </div>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 24 }}>
                    Patient ID: {currentPatientId}
                  </Text>
                  <Button type="link" size="small" onClick={() => { form.setFieldsValue({ patientId: undefined }); setFoundPatient(null); setSelectedFromToday(null); }}>
                    Change patient
                  </Button>
                </Space>
              </div>
            ) : (
              <>
                {todayPatientsList.length > 0 && (
                  <>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Today&apos;s appointments – select a patient</Text>
                    <List
                      size="small"
                      dataSource={todayPatientsList}
                      style={{ marginBottom: 16, maxHeight: 200, overflow: 'auto' }}
                      renderItem={(item) => (
                        <List.Item
                          extra={
                            <Button type="primary" size="small" onClick={() => handleSelectTodayPatient(item)}>
                              Select & admit
                            </Button>
                          }
                        >
                          <Space direction="vertical" size={0}>
                            <Text strong>{item.patientName || 'Unknown'}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {item.patientMobile || '—'} · {item.timeSlot || '—'}
                            </Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                    <Divider style={{ margin: '12px 0' }}>Or search by mobile number</Divider>
                  </>
                )}
                <Form.Item label="Search by mobile number">
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="Enter 10-digit mobile number"
                      maxLength={15}
                      value={searchMobile}
                      onChange={(e) => setSearchMobile(e.target.value.replace(/\D/g, '').slice(0, 15))}
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
                {searchMobile.length >= 10 && !foundPatient && (
                  <div style={{ marginBottom: 16 }}>
                    <Button
                      type="dashed"
                      icon={<UserAddOutlined />}
                      onClick={() => {
                        quickCreateForm.setFieldsValue({ fullName: '', mobileNumber: searchMobile.trim() });
                        setQuickCreateModalOpen(true);
                      }}
                      block
                    >
                      Create profile for this number
                    </Button>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                      Patient not in system? Create minimal profile (name, mobile) and admit; fill rest later.
                    </Text>
                  </div>
                )}
                {foundPatient && (
                  <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 8 }}>
                    <Text type="success">Patient found: {foundPatient.user?.fullName}. You can select bed and admit below.</Text>
                  </div>
                )}
              </>
            )}
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
            allowClear={!defaultAdmittingDoctorId} // Disable clear if default is set
            disabled={!!defaultAdmittingDoctorId} // Disable if default is provided (doctor dashboard)
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
          {defaultAdmittingDoctorId && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              You are the admitting doctor
            </Text>
          )}
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

      {/* Quick-create patient modal (minimal profile for IPD admission) */}
      <Modal
        title="Create profile for this number"
        open={quickCreateModalOpen}
        onCancel={() => { setQuickCreateModalOpen(false); quickCreateForm.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={quickCreateForm}
          layout="vertical"
          onFinish={handleQuickCreateSubmit}
          initialValues={{ mobileNumber: searchMobile.trim() }}
        >
          <Form.Item
            name="fullName"
            label="Full name"
            rules={[{ required: true, message: 'Enter patient name' }, { min: 2, message: 'At least 2 characters' }]}
          >
            <Input placeholder="Patient full name" />
          </Form.Item>
          <Form.Item name="mobileNumber" label="Mobile number">
            <Input disabled placeholder="10-digit mobile" />
          </Form.Item>
          <Form.Item name="gender" label="Gender (optional)">
            <Select placeholder="Select" allowClear>
              <Select.Option value="male">Male</Select.Option>
              <Select.Option value="female">Female</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateOfBirth" label="Date of birth (optional)">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setQuickCreateModalOpen(false); quickCreateForm.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={quickCreateLoading}>
                Create & continue to admit
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

