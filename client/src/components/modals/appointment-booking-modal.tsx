import React, { useState, useEffect } from 'react';
import {
  Modal,
  Steps,
  Card,
  Row,
  Col,
  Button,
  Select,
  Input,
  DatePicker,
  TimePicker,
  Form,
  Typography,
  Divider,
  Tag,
  Avatar,
  Space,
  Alert,
  Spin,
  message,
  Radio,
  InputNumber
} from 'antd';
import {
  CalendarOutlined,
  MedicineBoxOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  DollarOutlined,
  StarOutlined,
  PhoneOutlined,
  MailOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { RangePicker } = TimePicker;

interface Hospital {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  departments: string[];
  services: string[];
  operating_hours: string;
  emergency_services: boolean;
  total_beds: number;
  established_year: number;
}

interface Doctor {
  id: number;
  user_id: number;
  hospital_id: number;
  specialty: string;
  license_number: string;
  qualification: string;
  experience: number;
  consultation_fee: string;
  is_available: boolean;
  working_hours: string;
  available_slots: string[];
  status: string;
  languages: string[];
  awards: string[];
  bio: string;
  user?: {
    fullName: string;
    mobileNumber: string;
    email: string;
  };
}

interface AppointmentBookingModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function AppointmentBookingModal({
  open,
  onCancel,
  onSuccess
}: AppointmentBookingModalProps) {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  // Load hospitals on component mount
  useEffect(() => {
    if (open) {
      loadHospitals();
    }
  }, [open]);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hospitals');
      const data = await response.json();
      setHospitals(data.hospitals || []);
    } catch (error) {
      console.error('Error loading hospitals:', error);
      message.error('Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorsByHospital = async (hospitalId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/doctors/hospital/${hospitalId}`);
      const data = await response.json();
      setDoctors(data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
      message.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleHospitalSelect = (hospitalId: number) => {
    const hospital = hospitals.find(h => h.id === hospitalId);
    setSelectedHospital(hospital || null);
    setSelectedDoctor(null);
    setAvailableSlots([]);
    setSelectedSlot('');
    form.setFieldsValue({ doctorId: undefined, timeSlot: undefined });
    
    if (hospitalId) {
      loadDoctorsByHospital(hospitalId);
    }
  };

  const handleDoctorSelect = (doctorId: number) => {
    const doctor = doctors.find(d => d.id === doctorId);
    setSelectedDoctor(doctor || null);
    setAvailableSlots([]);
    setSelectedSlot('');
    form.setFieldsValue({ timeSlot: undefined });
    
    if (doctor) {
      try {
        const slots = JSON.parse(doctor.available_slots);
        setAvailableSlots(slots);
      } catch (error) {
        console.error('Error parsing available slots:', error);
        setAvailableSlots([]);
      }
    }
  };

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    setSelectedDate(date);
    setSelectedSlot('');
    form.setFieldsValue({ timeSlot: undefined });
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    form.setFieldsValue({ timeSlot: slot });
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const appointmentData = {
        patientId: user?.id,
        doctorId: values.doctorId,
        hospitalId: values.hospitalId,
        appointmentDate: selectedDate?.format('YYYY-MM-DD'),
        appointmentTime: selectedSlot.split('-')[0],
        timeSlot: selectedSlot,
        reason: values.reason,
        symptoms: values.symptoms || '',
        notes: values.notes || '',
        type: 'online',
        priority: values.priority || 'normal'
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(appointmentData)
      });

      if (response.ok) {
        message.success('Appointment booked successfully!');
        onSuccess();
        handleCancel();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      message.error('Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentStep(0);
    setSelectedHospital(null);
    setSelectedDoctor(null);
    setAvailableSlots([]);
    setSelectedDate(null);
    setSelectedSlot('');
    form.resetFields();
    onCancel();
  };

  const steps = [
    {
      title: 'Select Hospital',
      icon: <EnvironmentOutlined />,
      content: (
        <div>
          <Title level={4}>Choose a Hospital</Title>
          <Text type="secondary">Select the hospital where you want to book an appointment</Text>
          
          <Form.Item
            name="hospitalId"
            rules={[{ required: true, message: 'Please select a hospital' }]}
            style={{ marginTop: 24 }}
          >
            <Select
              placeholder="Search and select a hospital"
              size="large"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
              onChange={handleHospitalSelect}
            >
              {hospitals.map(hospital => (
                <Option key={hospital.id} value={hospital.id}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{hospital.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {hospital.address}, {hospital.city}, {hospital.state}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedHospital && (
            <Card style={{ marginTop: 16, border: '1px solid #1890ff' }}>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Title level={5} style={{ margin: 0, color: '#1890ff' }}>
                    {selectedHospital.name}
                  </Title>
                  <Text type="secondary">
                    {selectedHospital.address}, {selectedHospital.city}, {selectedHospital.state}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Established:</Text> {selectedHospital.established_year}
                </Col>
                <Col span={12}>
                  <Text strong>Total Beds:</Text> {selectedHospital.total_beds}
                </Col>
                <Col span={24}>
                  <Text strong>Departments:</Text>
                  <div style={{ marginTop: 4 }}>
                    {JSON.parse(selectedHospital.departments).map((dept: string) => (
                      <Tag key={dept} color="blue">{dept}</Tag>
                    ))}
                  </div>
                </Col>
                <Col span={24}>
                  <Text strong>Emergency Services:</Text>{' '}
                  <Tag color={selectedHospital.emergency_services ? 'green' : 'red'}>
                    {selectedHospital.emergency_services ? 'Available' : 'Not Available'}
                  </Tag>
                </Col>
              </Row>
            </Card>
          )}
        </div>
      )
    },
    {
      title: 'Select Doctor',
      icon: <UserOutlined />,
      content: (
        <div>
          <Title level={4}>Choose a Doctor</Title>
          <Text type="secondary">
            Select a doctor from {selectedHospital?.name}
          </Text>

          {selectedHospital && (
            <Form.Item
              name="doctorId"
              rules={[{ required: true, message: 'Please select a doctor' }]}
              style={{ marginTop: 24 }}
            >
              <Select
                placeholder="Search and select a doctor"
                size="large"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
                onChange={handleDoctorSelect}
                loading={loading}
              >
                {doctors.map(doctor => (
                  <Option key={doctor.id} value={doctor.id}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        Dr. {doctor.user?.fullName || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {doctor.specialty} • {doctor.experience} years experience
                      </div>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {selectedDoctor && (
            <Card style={{ marginTop: 16, border: '1px solid #52c41a' }}>
              <Row gutter={[16, 16]}>
                <Col span={4}>
                  <Avatar size={64} icon={<UserOutlined />} />
                </Col>
                <Col span={20}>
                  <Title level={5} style={{ margin: 0, color: '#52c41a' }}>
                    Dr. {selectedDoctor.user?.fullName || 'Unknown'}
                  </Title>
                  <Text type="secondary">{selectedDoctor.specialty}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space wrap>
                      <Tag icon={<StarOutlined />} color="gold">
                        {selectedDoctor.experience} years experience
                      </Tag>
                      <Tag icon={<DollarOutlined />} color="green">
                        ₹{selectedDoctor.consultation_fee}
                      </Tag>
                      <Tag color={selectedDoctor.status === 'in' ? 'green' : 'orange'}>
                        {selectedDoctor.status === 'in' ? 'Available Now' : 'Available'}
                      </Tag>
                    </Space>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">{selectedDoctor.bio}</Text>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Text strong>Languages: </Text>
                    {JSON.parse(selectedDoctor.languages).map((lang: string) => (
                      <Tag key={lang} size="small">{lang}</Tag>
                    ))}
                  </div>
                </Col>
              </Row>
            </Card>
          )}
        </div>
      )
    },
    {
      title: 'Select Date & Time',
      icon: <CalendarOutlined />,
      content: (
        <div>
          <Title level={4}>Choose Date & Time</Title>
          <Text type="secondary">Select your preferred date and time slot</Text>

          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col span={24}>
              <Form.Item
                name="appointmentDate"
                rules={[{ required: true, message: 'Please select a date' }]}
              >
                <DatePicker
                  placeholder="Select appointment date"
                  size="large"
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  onChange={handleDateChange}
                />
              </Form.Item>
            </Col>

            {selectedDate && selectedDoctor && (
              <Col span={24}>
                <Title level={5}>Available Time Slots</Title>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                  {availableSlots.map(slot => (
                    <Button
                      key={slot}
                      type={selectedSlot === slot ? 'primary' : 'default'}
                      onClick={() => handleSlotSelect(slot)}
                      style={{ height: '40px' }}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
                {availableSlots.length === 0 && (
                  <Alert
                    message="No available slots"
                    description="Please select a different date or doctor"
                    type="warning"
                    style={{ marginTop: 16 }}
                  />
                )}
              </Col>
            )}
          </Row>

          {selectedDate && selectedSlot && (
            <Card style={{ marginTop: 16, border: '1px solid #722ed1' }}>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Text strong>Date:</Text>
                  <div>{selectedDate.format('dddd, DD/MM/YYYY')}</div>
                </Col>
                <Col span={8}>
                  <Text strong>Time:</Text>
                  <div>{selectedSlot}</div>
                </Col>
                <Col span={8}>
                  <Text strong>Duration:</Text>
                  <div>30 minutes</div>
                </Col>
              </Row>
            </Card>
          )}
        </div>
      )
    },
    {
      title: 'Appointment Details',
      icon: <CheckCircleOutlined />,
      content: (
        <div>
          <Title level={4}>Appointment Details</Title>
          <Text type="secondary">Provide additional information for your appointment</Text>

          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col span={24}>
              <Form.Item
                name="reason"
                rules={[{ required: true, message: 'Please provide reason for visit' }]}
                label="Reason for Visit"
              >
                <Select placeholder="Select reason for visit" size="large">
                  <Option value="consultation">General Consultation</Option>
                  <Option value="follow-up">Follow-up Visit</Option>
                  <Option value="checkup">Routine Checkup</Option>
                  <Option value="emergency">Emergency</Option>
                  <Option value="vaccination">Vaccination</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="priority"
                label="Priority Level"
                initialValue="normal"
              >
                <Radio.Group>
                  <Radio value="low">Low</Radio>
                  <Radio value="normal">Normal</Radio>
                  <Radio value="high">High</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                name="symptoms"
                label="Symptoms (Optional)"
              >
                <TextArea
                  placeholder="Describe your symptoms or concerns..."
                  rows={3}
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                name="notes"
                label="Additional Notes (Optional)"
              >
                <TextArea
                  placeholder="Any additional information you'd like to share..."
                  rows={2}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Appointment Summary */}
          {selectedHospital && selectedDoctor && selectedDate && selectedSlot && (
            <Card style={{ marginTop: 24, border: '1px solid #1890ff' }}>
              <Title level={5} style={{ color: '#1890ff', marginBottom: 16 }}>
                Appointment Summary
              </Title>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>Hospital:</Text>
                  <div>{selectedHospital.name}</div>
                </Col>
                <Col span={12}>
                  <Text strong>Doctor:</Text>
                  <div>Dr. {selectedDoctor.user?.fullName}</div>
                </Col>
                <Col span={12}>
                  <Text strong>Specialty:</Text>
                  <div>{selectedDoctor.specialty}</div>
                </Col>
                <Col span={12}>
                  <Text strong>Fee:</Text>
                  <div>₹{selectedDoctor.consultation_fee}</div>
                </Col>
                <Col span={12}>
                  <Text strong>Date:</Text>
                  <div>{selectedDate.format('dddd, DD/MM/YYYY')}</div>
                </Col>
                <Col span={12}>
                  <Text strong>Time:</Text>
                  <div>{selectedSlot}</div>
                </Col>
              </Row>
            </Card>
          )}
        </div>
      )
    }
  ];

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center' }}>
          <CalendarOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: 8 }} />
          Book New Appointment
        </div>
      }
      open={open}
      onCancel={handleCancel}
      width={800}
      footer={null}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((step, index) => (
            <Steps.Step key={index} title={step.title} icon={step.icon} />
          ))}
        </Steps>

        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          {steps[currentStep].content}
        </Form>

        <Divider />

        <div style={{ textAlign: 'right' }}>
          <Space>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>
                Previous
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button
                type="primary"
                onClick={handleNext}
                disabled={
                  (currentStep === 0 && !selectedHospital) ||
                  (currentStep === 1 && !selectedDoctor) ||
                  (currentStep === 2 && (!selectedDate || !selectedSlot))
                }
              >
                Next
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                disabled={!selectedHospital || !selectedDoctor || !selectedDate || !selectedSlot}
                icon={<CheckCircleOutlined />}
              >
                Book Appointment
              </Button>
            )}
          </Space>
        </div>
      </Spin>
    </Modal>
  );
}
