import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Button,
  Select,
  Input,
  DatePicker,
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
  InputNumber,
  Breadcrumb
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
  ArrowLeftOutlined,
  ArrowRightOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { useAuth } from '../hooks/use-auth';
import { useLocation } from 'wouter';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface Hospital {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  departments: string;
  services: string;
  operatingHours: string;
  emergencyServices: boolean;
  totalBeds: number;
  establishedYear: number;
  isVerified: boolean;
}

interface Doctor {
  id: number;
  userId: number;
  hospitalId: number;
  specialty: string;
  licenseNumber: string;
  qualification: string;
  experience: number;
  consultationFee: string;
  isAvailable: boolean;
  workingHours: string;
  availableSlots: string;
  status: string;
  languages: string;
  awards: string;
  bio: string;
  approvalStatus: string;
  createdAt: string;
  fullName: string;
  mobileNumber: string;
  email: string;
}

export default function BookAppointment() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
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
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [allSpecialties, setAllSpecialties] = useState<string[]>([]);

  // Load user city on component mount
  useEffect(() => {
    loadUserCity();
    // Auto-select today's date for appointments
    const today = dayjs();
    setSelectedDate(today);
    form.setFieldsValue({ appointmentDate: today });
  }, []);

  // Load hospitals when selectedCity changes
  useEffect(() => {
    if (selectedCity) {
      loadHospitals();
    }
  }, [selectedCity]);

  // Debug doctors state
  useEffect(() => {
    console.log('🔍 Doctors state changed:', doctors.length, doctors);
  }, [doctors]);

  const loadUserCity = async () => {
    try {
      // For now, we'll use a default city since we don't have patient city in the user profile
      // In a real app, this would come from the patient's profile
      const defaultCity = 'Mumbai'; // Default to Mumbai for Maharashtra hospitals
      setSelectedCity(defaultCity);
      
      // Get all unique cities from hospitals
      const response = await fetch('/api/hospitals');
      const data = await response.json();
      const cities = [...new Set(data.hospitals.map((h: Hospital) => h.city))].sort();
      setAvailableCities(cities);
    } catch (error) {
      console.error('Error loading user city:', error);
      // Fallback to Mumbai
      setSelectedCity('Mumbai');
      setAvailableCities(['Mumbai', 'Pune', 'Nashik', 'Nagpur', 'Aurangabad']);
    }
  };

  const loadHospitals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hospitals');
      const data = await response.json();
      const allHospitals = data.hospitals || [];
      
      // Filter hospitals by selected city
      const cityFilteredHospitals = selectedCity 
        ? allHospitals.filter((hospital: Hospital) => hospital.city === selectedCity)
        : allHospitals;
      
      setHospitals(cityFilteredHospitals);
      
      // Extract all unique specialties from hospitals
      const specialties = new Set<string>();
      cityFilteredHospitals.forEach(hospital => {
        try {
          const departments = typeof hospital.departments === 'string' 
            ? JSON.parse(hospital.departments) 
            : hospital.departments;
          if (Array.isArray(departments)) {
            departments.forEach(dept => specialties.add(dept));
          }
        } catch (e) {
          console.warn('Error parsing departments for hospital:', hospital.name);
        }
      });
      
      setAllSpecialties(Array.from(specialties).sort());
      
      // Apply initial filtering
      applyHospitalFilters(cityFilteredHospitals, searchTerm, selectedSpecialty);
      
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
      console.log(`🔍 Loading doctors for hospital ${hospitalId}`);
      const response = await fetch(`/api/doctors/hospital/${hospitalId}`);
      const data = await response.json();
      console.log('📋 Doctors API response:', data);
      console.log('📋 Doctors count:', data?.length || 0);
      setDoctors(data || []);
      console.log('✅ Doctors state updated:', data?.length || 0, 'doctors');
    } catch (error) {
      console.error('Error loading doctors:', error);
      message.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleHospitalSelect = (hospitalId: number) => {
    console.log(`🏥 Hospital selected: ${hospitalId}`);
    const hospital = filteredHospitals.find(h => h.id === hospitalId);
    console.log('🏥 Selected hospital:', hospital);
    setSelectedHospital(hospital || null);
    setSelectedDoctor(null);
    setAvailableSlots([]);
    setSelectedSlot('');
    form.setFieldsValue({ 
      hospitalId: hospitalId,
      doctorId: undefined, 
      timeSlot: undefined 
    });
    
    if (hospitalId) {
      loadDoctorsByHospital(hospitalId);
            // Auto-advance to doctor selection step after doctors are loaded
            setTimeout(() => {
              console.log('🚀 Auto-advancing to doctor selection step (step 1)');
              setCurrentStep(1);
            }, 1500);
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
        const slots = JSON.parse(doctor.availableSlots);
        setAvailableSlots(slots);
      } catch (error) {
        console.error('Error parsing available slots:', error);
        setAvailableSlots([]);
      }
      
              // Auto-advance to date & time selection step
              setTimeout(() => {
                console.log('🚀 Auto-advancing to date & time selection step (step 2)');
                setCurrentStep(2);
              }, 500);
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
    
            // Auto-advance to patient details step
            setTimeout(() => {
              console.log('🚀 Auto-advancing to patient details step (step 3)');
              setCurrentStep(3);
            }, 500);
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedHospital(null);
    setSelectedDoctor(null);
    setAvailableSlots([]);
    setSelectedSlot('');
    setSearchTerm('');
    setSelectedSpecialty('');
    form.setFieldsValue({ 
      hospitalId: undefined,
      doctorId: undefined, 
      timeSlot: undefined 
    });
    
    // Reload hospitals for the selected city
    loadHospitals();
  };

  const applyHospitalFilters = (hospitalsToFilter: Hospital[], search: string, specialty: string) => {
    let filtered = hospitalsToFilter;

    // Apply search filter
    if (search) {
      filtered = filtered.filter(hospital => 
        hospital.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply specialty filter
    if (specialty) {
      filtered = filtered.filter(hospital => {
        try {
          const departments = typeof hospital.departments === 'string' 
            ? JSON.parse(hospital.departments) 
            : hospital.departments;
          return Array.isArray(departments) && departments.includes(specialty);
        } catch (e) {
          return false;
        }
      });
    }

    setFilteredHospitals(filtered);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value;
    setSearchTerm(search);
    applyHospitalFilters(hospitals, search, selectedSpecialty);
  };

  const handleSpecialtyChange = (specialty: string) => {
    setSelectedSpecialty(specialty);
    applyHospitalFilters(hospitals, searchTerm, specialty);
  };

  // Auto-advance functions - no manual Next/Previous needed

  const handleCancel = () => {
    setLocation('/appointments');
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      console.log('🚀 Starting appointment booking...');
      console.log('🏥 Selected hospital:', selectedHospital?.id);
      console.log('👨‍⚕️ Selected doctor:', selectedDoctor?.id);
      console.log('📅 Selected date:', selectedDate?.format('YYYY-MM-DD'));
      console.log('⏰ Selected slot:', selectedSlot);
      console.log('👤 User:', user?.id);
      
      // Validate required fields
      if (!selectedHospital || !selectedDoctor || !selectedDate || !selectedSlot) {
        message.error('Please complete all steps before booking');
        return;
      }
      
      const appointmentData = {
        // patientId will be set by backend based on authenticated user
        doctorId: selectedDoctor.id,
        hospitalId: selectedHospital.id,
        appointmentDate: selectedDate.format('YYYY-MM-DD'),
        appointmentTime: selectedSlot.split('-')[0],
        timeSlot: selectedSlot,
        reason: 'consultation',
        symptoms: '',
        notes: '',
        type: 'online',
        priority: 'normal'
      };

      console.log('📤 Sending appointment data:', appointmentData);
      
      const token = localStorage.getItem('auth-token');
      console.log('🔐 Frontend token:', token ? `${token.substring(0, 20)}...` : 'none');

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(appointmentData)
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Appointment booked successfully:', result);
        message.success('Appointment booked successfully! Please wait for confirmation.');
        setLocation('/appointments');
      } else {
        const errorData = await response.json();
        console.error('❌ Booking failed:', errorData);
        message.error(errorData.message || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('❌ Error booking appointment:', error);
      message.error('Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Select Hospital',
      icon: <EnvironmentOutlined />,
      content: (
        <div>
          <Title level={3}>Choose a Hospital</Title>
          <Text type="secondary" style={{ fontSize: '16px', marginBottom: '24px', display: 'block' }}>
            Select the hospital where you want to book an appointment
          </Text>
          
          {/* City Selector */}
          <div style={{ marginBottom: '24px' }}>
            <Text strong style={{ marginBottom: '8px', display: 'block' }}>Select City:</Text>
            <Select
              value={selectedCity}
              onChange={handleCityChange}
              style={{ width: '200px' }}
              placeholder="Select city"
            >
              {availableCities.map(city => (
                <Option key={city} value={city}>
                  📍 {city}
                </Option>
              ))}
            </Select>
          </div>

          {/* Search and Filter */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12}>
              <Text strong style={{ marginBottom: '8px', display: 'block' }}>Search Hospital:</Text>
              <Input
                placeholder="Search by hospital name..."
                value={searchTerm}
                onChange={handleSearchChange}
                prefix={<EnvironmentOutlined />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12}>
              <Text strong style={{ marginBottom: '8px', display: 'block' }}>Filter by Specialty:</Text>
              <Select
                placeholder="Select specialty..."
                value={selectedSpecialty}
                onChange={handleSpecialtyChange}
                style={{ width: '100%' }}
                allowClear
              >
                {allSpecialties.map(specialty => (
                  <Option key={specialty} value={specialty}>
                    🏥 {specialty}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>

          {/* Results Count */}
          {filteredHospitals.length !== hospitals.length && (
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary">
                Showing {filteredHospitals.length} of {hospitals.length} hospitals
              </Text>
            </div>
          )}
          
          <Form.Item
            name="hospitalId"
            rules={[{ required: true, message: 'Please select a hospital' }]}
            style={{ display: 'none' }}
          >
            <Input />
          </Form.Item>

          {/* Hospital List */}
          {filteredHospitals.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px' }}>
              <EnvironmentOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
              <Title level={4} type="secondary">No Hospitals Found</Title>
              <Text type="secondary">
                {hospitals.length === 0 
                  ? `No hospitals are available in ${selectedCity}. Please select a different city.`
                  : 'No hospitals match your search criteria. Try adjusting your filters.'
                }
              </Text>
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {filteredHospitals.map(hospital => (
                <Col xs={24} sm={12} lg={8} key={hospital.id}>
                <Card
                  hoverable
                  style={{
                    border: selectedHospital?.id === hospital.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    cursor: 'pointer',
                    height: '100%'
                  }}
                  onClick={() => handleHospitalSelect(hospital.id)}
                  bodyStyle={{ padding: '16px' }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <Title level={4} style={{ margin: 0, color: selectedHospital?.id === hospital.id ? '#1890ff' : '#262626' }}>
                      {hospital.name}
                    </Title>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      📍 {hospital.address}, {hospital.city}, {hospital.state}
                    </Text>
                  </div>
                  
                  <Row gutter={[8, 8]} style={{ marginBottom: '12px' }}>
                    <Col span={12}>
                      <Text strong style={{ fontSize: '12px' }}>Established:</Text>
                      <div style={{ fontSize: '12px' }}>{hospital.establishedYear}</div>
                    </Col>
                    <Col span={12}>
                      <Text strong style={{ fontSize: '12px' }}>Beds:</Text>
                      <div style={{ fontSize: '12px' }}>{hospital.totalBeds}</div>
                    </Col>
                  </Row>

                  <div style={{ marginBottom: '12px' }}>
                    <Text strong style={{ fontSize: '12px' }}>Departments:</Text>
                    <div style={{ marginTop: '4px' }}>
                      {JSON.parse(hospital.departments).slice(0, 3).map((dept: string) => (
                        <Tag key={dept} color="blue" size="small">{dept}</Tag>
                      ))}
                      {JSON.parse(hospital.departments).length > 3 && (
                        <Tag color="default" size="small">+{JSON.parse(hospital.departments).length - 3} more</Tag>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tag color={hospital.emergencyServices ? 'green' : 'red'} size="small">
                      {hospital.emergencyServices ? '🚑 Emergency Available' : '❌ No Emergency'}
                    </Tag>
                    <Tag color="orange" size="small">
                      {hospital.is_verified ? '✅ Verified' : '⏳ Pending'}
                    </Tag>
                  </div>
                </Card>
                </Col>
              ))}
            </Row>
          )}

          {selectedHospital && (
            <Card style={{ marginTop: 24, border: '2px solid #1890ff', background: '#f0f8ff' }}>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                    ✅ Selected: {selectedHospital.name}
                  </Title>
                  <Text type="secondary">
                    {selectedHospital.address}, {selectedHospital.city}, {selectedHospital.state}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Established:</Text> {selectedHospital.establishedYear}
                </Col>
                <Col span={12}>
                  <Text strong>Total Beds:</Text> {selectedHospital.totalBeds}
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
                  <Tag color={selectedHospital.emergencyServices ? 'green' : 'red'}>
                    {selectedHospital.emergencyServices ? 'Available' : 'Not Available'}
                  </Tag>
                </Col>
                <Col span={24}>
                  <div style={{ textAlign: 'center', marginTop: '16px', padding: '16px', background: '#e6f7ff', borderRadius: '8px' }}>
                    <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                      🏥 Hospital Selected! Loading doctors...
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                      {loading ? 'Fetching doctors...' : `Found ${doctors.length} doctors available`}
                    </Text>
                    <br />
                    <Button 
                      type="primary" 
                      size="large"
                      onClick={() => setCurrentStep(1)}
                      style={{ marginTop: '12px' }}
                      disabled={loading}
                    >
                      {loading ? 'Loading Doctors...' : `View ${doctors.length} Doctors`}
                    </Button>
                  </div>
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
          <Title level={3}>Choose a Doctor</Title>
          <Text type="secondary" style={{ fontSize: '16px', marginBottom: '24px', display: 'block' }}>
            Select a doctor from {selectedHospital?.name}
          </Text>

          {selectedHospital && (
            <div>
              <div style={{ marginBottom: '16px', padding: '12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '8px' }}>
                <Text strong style={{ color: '#52c41a' }}>
                  📊 {loading ? 'Loading doctors...' : `Found ${doctors.length} doctors in ${selectedHospital.name}`}
                </Text>
              </div>
              
              {doctors.length > 0 ? (
                <div>
                  <Text strong style={{ fontSize: '16px', marginBottom: '16px', display: 'block' }}>
                    Select a doctor by clicking on their card:
                  </Text>
                  <Row gutter={[16, 16]}>
                    {doctors.map(doctor => (
                      <Col xs={24} sm={12} lg={8} key={doctor.id}>
                        <Card
                          hoverable
                          style={{
                            border: selectedDoctor?.id === doctor.id ? '2px solid #52c41a' : '1px solid #d9d9d9',
                            cursor: 'pointer',
                            height: '100%',
                            opacity: doctor.isAvailable ? 1 : 0.6
                          }}
                          onClick={() => handleDoctorSelect(doctor.id)}
                          bodyStyle={{ padding: '16px' }}
                        >
                          <div style={{ marginBottom: '12px' }}>
                            <Title level={4} style={{ margin: 0, color: selectedDoctor?.id === doctor.id ? '#52c41a' : '#262626' }}>
                              {doctor.fullName || 'Dr. Unknown'}
                            </Title>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {doctor.specialty}
                            </Text>
                          </div>
                          
                          <Row gutter={[8, 8]} style={{ marginBottom: '12px' }}>
                            <Col span={12}>
                              <Text strong style={{ fontSize: '12px' }}>Experience:</Text>
                              <div style={{ fontSize: '12px' }}>{doctor.experience} years</div>
                            </Col>
                            <Col span={12}>
                              <Text strong style={{ fontSize: '12px' }}>Fee:</Text>
                              <div style={{ fontSize: '12px' }}>₹{doctor.consultationFee}</div>
                            </Col>
                          </Row>

                          <div style={{ marginBottom: '12px' }}>
                            <Text strong style={{ fontSize: '12px' }}>Qualification:</Text>
                            <div style={{ fontSize: '12px' }}>{doctor.qualification}</div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Tag color={doctor.isAvailable ? 'green' : 'red'} size="small">
                              {doctor.isAvailable ? '✅ Available' : '❌ Not Available'}
                            </Tag>
                            <Tag color={doctor.status === 'in' ? 'green' : 'orange'} size="small">
                              {doctor.status === 'in' ? '🟢 In' : doctor.status === 'out' ? '🔴 Out' : '🟡 Busy'}
                            </Tag>
                          </div>

                          {doctor.bio && (
                            <div style={{ marginTop: '8px' }}>
                              <Text style={{ fontSize: '11px', color: '#666' }}>
                                {doctor.bio.length > 100 ? `${doctor.bio.substring(0, 100)}...` : doctor.bio}
                              </Text>
                            </div>
                          )}
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  
                  <Form.Item
                    name="doctorId"
                    rules={[{ required: true, message: 'Please select a doctor' }]}
                    style={{ display: 'none' }}
                  >
                    <Input />
                  </Form.Item>
                </div>
              ) : (
                <div>
                  <Card style={{ textAlign: 'center', padding: '40px' }}>
                    <UserOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
                    <Title level={4} type="secondary">No Doctors Found</Title>
                    <Text type="secondary">
                      {loading ? 'Loading doctors...' : 'No doctors are available in this hospital. Please select a different hospital.'}
                    </Text>
                  </Card>
                  
                  {/* Debug: Show doctors as simple list */}
                  {doctors.length > 0 && (
                    <Card style={{ marginTop: '16px', background: '#fff7e6' }}>
                      <Title level={5}>Debug: Doctors List ({doctors.length})</Title>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {doctors.map(doctor => (
                          <div key={doctor.id} style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                            <Text strong>{doctor.fullName}</Text> - {doctor.specialty} (₹{doctor.consultationFee})
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedDoctor && (
            <Card style={{ marginTop: 24, border: '1px solid #52c41a' }}>
              <Row gutter={[16, 16]}>
                <Col span={4}>
                  <Avatar size={64} icon={<UserOutlined />} />
                </Col>
                <Col span={20}>
                  <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                    {selectedDoctor.fullName || 'Dr. Unknown'}
                  </Title>
                  <Text type="secondary">{selectedDoctor.specialty}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space wrap>
                      <Tag icon={<StarOutlined />} color="gold">
                        {selectedDoctor.experience} years experience
                      </Tag>
                      <Tag icon={<DollarOutlined />} color="green">
                        ₹{selectedDoctor.consultationFee}
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
                    {JSON.parse(selectedDoctor.languages || '[]').map((lang: string) => (
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
          <Title level={3}>Choose Date & Time</Title>
          <Text type="secondary" style={{ fontSize: '16px', marginBottom: '24px', display: 'block' }}>
            Select your preferred date and time slot (Available for today and tomorrow only)
          </Text>

          <Row gutter={[24, 24]}>
            <Col span={24}>
              <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ fontSize: '16px', marginBottom: '12px', display: 'block' }}>
                  Quick Date Selection:
                </Text>
                <Space size="middle">
                  <Button 
                    type={selectedDate?.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD') ? 'primary' : 'default'}
                    size="large"
                    onClick={() => {
                      const today = dayjs();
                      setSelectedDate(today);
                      form.setFieldsValue({ appointmentDate: today });
                    }}
                  >
                    📅 Today ({dayjs().format('MMM D, YYYY')})
                  </Button>
                  <Button 
                    type={selectedDate?.format('YYYY-MM-DD') === dayjs().add(1, 'day').format('YYYY-MM-DD') ? 'primary' : 'default'}
                    size="large"
                    onClick={() => {
                      const tomorrow = dayjs().add(1, 'day');
                      setSelectedDate(tomorrow);
                      form.setFieldsValue({ appointmentDate: tomorrow });
                    }}
                  >
                    📅 Tomorrow ({dayjs().add(1, 'day').format('MMM D, YYYY')})
                  </Button>
                </Space>
              </div>
              
              <Form.Item
                name="appointmentDate"
                rules={[{ required: true, message: 'Please select a date' }]}
              >
                <DatePicker
                  placeholder="Or select a specific date"
                  size="large"
                  style={{ width: '100%' }}
                  disabledDate={(current) => {
                    const today = dayjs().startOf('day');
                    const tomorrow = dayjs().add(1, 'day').startOf('day');
                    return current && (current < today || current > tomorrow);
                  }}
                  onChange={handleDateChange}
                />
              </Form.Item>
              
              {selectedDate && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '8px' }}>
                  <Text strong style={{ color: '#52c41a' }}>
                    📅 Selected Date: {selectedDate.format('dddd, MMMM D, YYYY')}
                  </Text>
                </div>
              )}
            </Col>

            {selectedDate && selectedDoctor && (
              <Col span={24}>
                <Title level={4}>Available Time Slots</Title>
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
            <Card style={{ marginTop: 24, border: '1px solid #722ed1' }}>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Text strong>Date:</Text>
                  <div>{selectedDate.format('dddd, MMMM D, YYYY')}</div>
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
      title: 'Confirm Appointment',
      icon: <CheckCircleOutlined />,
      content: (
        <div>
          <Title level={3}>Confirm Your Appointment</Title>
          <Text type="secondary" style={{ fontSize: '16px', marginBottom: '24px', display: 'block' }}>
            Please review your appointment details and confirm
          </Text>

          {selectedHospital && selectedDoctor && selectedDate && selectedSlot && (
            <Card style={{ border: '2px solid #52c41a', background: '#f6ffed' }}>
              <Title level={4} style={{ color: '#52c41a', marginBottom: 24, textAlign: 'center' }}>
                ✅ Appointment Summary
              </Title>
              
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={12}>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#fff', borderRadius: '8px' }}>
                    <Title level={5} style={{ color: '#1890ff', margin: '0 0 8px 0' }}>🏥 Hospital</Title>
                    <Text strong style={{ fontSize: '16px' }}>{selectedHospital.name}</Text>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {selectedHospital.address}, {selectedHospital.city}
                    </div>
                  </div>
                </Col>
                
                <Col xs={24} sm={12}>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#fff', borderRadius: '8px' }}>
                    <Title level={5} style={{ color: '#722ed1', margin: '0 0 8px 0' }}>👨‍⚕️ Doctor</Title>
                    <Text strong style={{ fontSize: '16px' }}>{selectedDoctor.fullName}</Text>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {selectedDoctor.specialty} • {selectedDoctor.experience} years
                    </div>
                  </div>
                </Col>
                
                <Col xs={24} sm={12}>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#fff', borderRadius: '8px' }}>
                    <Title level={5} style={{ color: '#fa8c16', margin: '0 0 8px 0' }}>📅 Date & Time</Title>
                    <Text strong style={{ fontSize: '16px' }}>{selectedDate.format('MMM D, YYYY')}</Text>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {selectedDate.format('dddd')} • {selectedSlot}
                    </div>
                  </div>
                </Col>
                
                <Col xs={24} sm={12}>
                  <div style={{ textAlign: 'center', padding: '16px', background: '#fff', borderRadius: '8px' }}>
                    <Title level={5} style={{ color: '#eb2f96', margin: '0 0 8px 0' }}>💰 Fee</Title>
                    <Text strong style={{ fontSize: '20px', color: '#eb2f96' }}>₹{selectedDoctor.consultationFee}</Text>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Consultation Fee
                    </div>
                  </div>
                </Col>
              </Row>
              
              <div style={{ textAlign: 'center', marginTop: '24px', padding: '16px', background: '#e6f7ff', borderRadius: '8px' }}>
                <Text style={{ fontSize: '14px', color: '#1890ff' }}>
                  💡 Your appointment will be confirmed after payment. You'll receive a confirmation message shortly.
                </Text>
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '12px', padding: '12px', background: '#f0f8ff', borderRadius: '6px' }}>
                <Text style={{ fontSize: '12px', color: '#1890ff' }}>
                  🔄 <strong>Auto-Navigation:</strong> The system automatically advances when you make selections. Use "Previous Step" to go back if needed.
                </Text>
              </div>
            </Card>
          )}

          {/* Hidden form fields for submission */}
          <Form.Item name="hospitalId" style={{ display: 'none' }}>
            <Input value={selectedHospital?.id} />
          </Form.Item>
          <Form.Item name="doctorId" style={{ display: 'none' }}>
            <Input value={selectedDoctor?.id} />
          </Form.Item>
          <Form.Item name="appointmentDate" style={{ display: 'none' }}>
            <Input value={selectedDate?.format('YYYY-MM-DD')} />
          </Form.Item>
          <Form.Item name="timeSlot" style={{ display: 'none' }}>
            <Input value={selectedSlot} />
          </Form.Item>
          <Form.Item name="reason" initialValue="consultation" style={{ display: 'none' }}>
            <Input />
          </Form.Item>
          <Form.Item name="priority" initialValue="normal" style={{ display: 'none' }}>
            <Input />
          </Form.Item>
        </div>
      )
    }
  ];

  console.log('🎯 Current step:', currentStep, 'Selected hospital:', selectedHospital?.name, 'Doctors count:', doctors.length);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ 
        background: '#fff', 
        padding: '16px 24px',
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => setLocation('/appointments')}
                type="text"
              >
                Back to Appointments
              </Button>
              <Divider type="vertical" />
              <Breadcrumb>
                <Breadcrumb.Item>
                  <HomeOutlined />
                  <span onClick={() => setLocation('/dashboard')} style={{ cursor: 'pointer' }}>
                    Dashboard
                  </span>
                </Breadcrumb.Item>
                <Breadcrumb.Item>
                  <CalendarOutlined />
                  Book Appointment
                </Breadcrumb.Item>
              </Breadcrumb>
            </Space>
          </Col>
          <Col>
            <Space>
              <Text strong>Step {currentStep + 1} of {steps.length}</Text>
              <Button danger onClick={handleCancel}>
                Cancel
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Content */}
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Spin spinning={loading}>
          <Card style={{ marginBottom: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <CalendarOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
              <Title level={2} style={{ margin: 0 }}>
                {steps[currentStep].title}
              </Title>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                {steps[currentStep].icon}
              </Text>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                {currentStep === 0 && '🏥 Step 1: Choose your hospital'}
                {currentStep === 1 && '👨‍⚕️ Step 2: Select a doctor'}
                {currentStep === 2 && '📅 Step 3: Pick date & time'}
                {currentStep === 3 && '📝 Step 4: Enter patient details'}
              </div>
            </div>

            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              size="large"
            >
              {steps[currentStep].content}
            </Form>

            <Divider />

            <div style={{ textAlign: 'center' }}>
              <Space size="large">
                <Button danger onClick={handleCancel}>
                  Cancel Booking
                </Button>
                
                {/* Previous Button */}
                {currentStep > 0 && (
                  <Button 
                    onClick={handlePrevious}
                    icon={<ArrowLeftOutlined />}
                  >
                    Previous Step
                  </Button>
                )}
                
                {/* Next Button - Only show if auto-advance failed or user wants manual control */}
                {currentStep < steps.length - 1 && (
                  <Button 
                    type="primary"
                    onClick={handleNext}
                    icon={<ArrowRightOutlined />}
                  >
                    Next Step (Manual)
                  </Button>
                )}
                
                {/* Book Appointment Button */}
                {currentStep === steps.length - 1 && (
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={!selectedHospital || !selectedDoctor || !selectedDate || !selectedSlot}
                    icon={<CheckCircleOutlined />}
                  >
                    🏥 Book Appointment
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        </Spin>
      </div>
    </Layout>
  );
}
