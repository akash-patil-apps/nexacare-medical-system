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
  Breadcrumb,
  Drawer
} from 'antd';

const { Content, Sider } = Layout;
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
  HomeOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  MenuUnfoldOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../hooks/use-auth';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PatientSidebar } from '../components/layout/PatientSidebar';
import { useResponsive } from '../hooks/use-responsive';
import { formatTimeSlot12h, parseTimeTo24h } from '../lib/time';
import { playNotificationSound } from '../lib/notification-sounds';
import AppointmentPaymentModal from '../components/modals/appointment-payment-modal';

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
  photo?: string;
}

export default function BookAppointment() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [slotBookings, setSlotBookings] = useState<Record<string, number>>({}); // Track bookings per slot: { "14:00-14:30": 3 }
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [allSpecialties, setAllSpecialties] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookedAppointmentId, setBookedAppointmentId] = useState<number | null>(null);
  const [consultationFee, setConsultationFee] = useState<number>(500);

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
      
      console.log('🏥 All hospitals loaded:', allHospitals.length);
      console.log('🏙️ Selected city:', selectedCity);
      if (allHospitals.length > 0) {
        console.log('📍 Sample hospital cities:', allHospitals.slice(0, 5).map((h: Hospital) => h.city));
      }
      
      // Filter hospitals by selected city (case-insensitive)
      const cityFilteredHospitals = selectedCity 
        ? allHospitals.filter((hospital: Hospital) => {
            const hospitalCity = hospital.city?.trim().toLowerCase() || '';
            const selectedCityLower = selectedCity.trim().toLowerCase();
            return hospitalCity === selectedCityLower;
          })
        : allHospitals;
      
      console.log('✅ Filtered hospitals:', cityFilteredHospitals.length);
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
      
      if (!response.ok) {
        throw new Error(`Failed to load doctors: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Doctors API response:', data);
      console.log('📋 Doctors count:', data?.length || 0);
      
      const doctorsList = Array.isArray(data) ? data : [];
      setDoctors(doctorsList);
      console.log('✅ Doctors state updated:', doctorsList.length, 'doctors');
      
      // Auto-advance to doctor selection step after doctors are loaded
      if (doctorsList.length > 0) {
        setTimeout(() => {
          console.log('🚀 Auto-advancing to doctor selection step (step 1)');
          setCurrentStep(1);
        }, 500);
      } else {
        message.warning('No doctors available in this hospital');
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      message.error('Failed to load doctors. Please try again.');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHospitalSelect = (hospitalId: number) => {
    console.log(`🏥 Hospital selected: ${hospitalId}`);
    const hospital = filteredHospitals.find(h => h.id === hospitalId);
    console.log('🏥 Selected hospital:', hospital);
    
    // Set hospital first, then load doctors
    if (hospital) {
      setSelectedHospital(hospital);
    setSelectedDoctor(null);
    setAvailableSlots([]);
    setSelectedSlot('');
      setDoctors([]); // Clear previous doctors
    form.setFieldsValue({ 
      hospitalId: hospitalId,
      doctorId: undefined, 
      timeSlot: undefined 
    });
    
      // Load doctors for the selected hospital
      loadDoctorsByHospital(hospitalId);
    }
  };

  // Helper function to get doctor's available slots
  const getDoctorSlots = (doctor: Doctor): string[] => {
    try {
      if (!doctor.availableSlots) return [];
      
        let slots: string[];
        if (typeof doctor.availableSlots === 'string') {
          if (doctor.availableSlots.startsWith('[') && doctor.availableSlots.endsWith(']')) {
            // JSON array format
            slots = JSON.parse(doctor.availableSlots);
          } else {
            // Comma-separated string format
          slots = doctor.availableSlots.split(',').map((slot: string) => slot.trim()).filter(s => s);
          }
        } else {
        slots = Array.isArray(doctor.availableSlots) ? doctor.availableSlots : [];
        }
      return slots;
      } catch (error) {
        console.error('Error parsing available slots:', error);
      return [];
    }
  };

  /**
   * Fetches booked appointments for a doctor on a specific date
   * Returns a map of slot -> booking count: { "14:00-14:30": 3 }
   * Each slot can have max 5 patients
   */
  const fetchBookedAppointments = async (doctorId: number, date: string) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/appointments/doctor/${doctorId}/date/${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.warn('Failed to fetch booked appointments, using empty data');
        return {};
      }
      const appointments = await response.json();
      const appointmentsList = Array.isArray(appointments) ? appointments : [];
      
      // Count bookings per slot
      const bookings: Record<string, number> = {};
      appointmentsList.forEach((apt: any) => {
        // Use timeSlot if available, otherwise use appointmentTime
        const slot = apt.timeSlot || apt.appointmentTime;
        if (slot) {
          // Normalize slot format for matching
          const normalizedSlot = slot.trim();
          bookings[normalizedSlot] = (bookings[normalizedSlot] || 0) + 1;
        }
      });
      
      console.log('📊 Bookings per slot:', bookings);
      return bookings;
    } catch (error) {
      console.error('Error fetching booked appointments:', error);
      return {};
    }
  };

  /**
   * Determines doctor availability status.
   * 
   * NEW LOGIC:
   * - "Not Available" ONLY when doctor is unavailable for ENTIRE day (isAvailable=false OR status='out' OR no slots)
   * - "Available" or "Busy" when doctor has slots (even if some time ranges are unavailable)
   * - Individual slots will show color coding (green/yellow/red) based on booking count
   * 
   * Scenarios:
   * 1. Doctor unavailable 2pm-4pm, patient at 3pm: Shows "Available" (has other slots)
   * 2. Doctor has slots but some are fully booked: Shows "Available" (slots show red/yellow/green)
   * 3. Doctor not available entire day: Shows "Not Available"
   */
  const getDoctorAvailabilityStatus = (doctor: Doctor): {
    statusText: string;
    statusColor: string;
    statusBg: string;
    statusIcon: React.ReactNode;
    hasSlots: boolean;
  } => {
    // Only show "Not Available" if doctor is unavailable for ENTIRE day
    if (!doctor.isAvailable || doctor.status === 'out') {
      return {
        statusText: 'Not Available',
        statusColor: '#EF4444',
        statusBg: '#FEE2E2',
        statusIcon: <CloseCircleOutlined />,
        hasSlots: false,
      };
    }

    const doctorSlots = getDoctorSlots(doctor);
    const hasAnySlots = doctorSlots.length > 0;

    // No slots at all for the day
    if (!hasAnySlots) {
      return {
        statusText: 'Not Available',
        statusColor: '#EF4444',
        statusBg: '#FEE2E2',
        statusIcon: <CloseCircleOutlined />,
        hasSlots: false,
      };
    }

    // If status is 'busy' but has slots, show as busy
    if (doctor.status === 'busy') {
      return {
        statusText: 'Busy',
        statusColor: '#F59E0B',
        statusBg: '#FEF3C7',
        statusIcon: <ClockCircleOutlined />,
        hasSlots: true,
      };
    }

    // Doctor has slots (even if some time ranges are unavailable, we show as Available)
    // Individual slot availability will be shown with color coding when user selects date
    return {
      statusText: 'Available',
      statusColor: '#10B981',
      statusBg: '#D1FAE5',
      statusIcon: <CheckCircleOutlined />,
      hasSlots: true,
    };
  };

  /**
   * Gets slot availability color based on booking count
   * - Green: ≤2 bookings (3+ slots available)
   * - Yellow: 3-4 bookings (1-2 slots available)
   * - Red: 5 bookings (fully booked)
   * Each slot has a limit of 5 patients
   */
  const getSlotAvailabilityColor = (slot: string, maxSlots: number = 5): {
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    isAvailable: boolean;
    availableCount: number;
  } => {
    const bookings = slotBookings[slot] || 0;
    const availableCount = maxSlots - bookings;

    if (availableCount >= 3) {
      // Green: 3+ slots available (≤2 bookings)
      return {
        color: 'green',
        bgColor: '#D1FAE5',
        borderColor: '#10B981',
        textColor: '#047857',
        isAvailable: true,
        availableCount,
      };
    } else if (availableCount >= 1) {
      // Yellow: 1-2 slots available (3-4 bookings)
      return {
        color: 'yellow',
        bgColor: '#FEF3C7',
        borderColor: '#F59E0B',
        textColor: '#92400E',
        isAvailable: true,
        availableCount,
      };
    } else {
      // Red: 0 slots available (5 bookings - fully booked)
      return {
        color: 'red',
        bgColor: '#FEE2E2',
        borderColor: '#EF4444',
        textColor: '#991B1B',
        isAvailable: false,
        availableCount: 0,
      };
    }
  };

  const handleDoctorSelect = (doctorId: number) => {
    const doctor = doctors.find(d => d.id === doctorId);
    setSelectedDoctor(doctor || null);
    setAvailableSlots([]);
    setSelectedSlot('');
    setSlotBookings({});
    form.setFieldsValue({ timeSlot: undefined });
    
    if (doctor) {
      const slots = getDoctorSlots(doctor);
      
      // If the date is already selected and it's today, hide past slots immediately
      if (selectedDate) {
        const filteredSlots = slots.filter(slot => !isSlotInPast(slot, selectedDate));
        setAvailableSlots(filteredSlots);
        console.log(`📅 Filtered slots after doctor select: ${filteredSlots.length} available (${slots.length - filteredSlots.length} past slots hidden)`);
      } else {
        setAvailableSlots(slots);
      }
      
      // Auto-advance to date & time selection step
      setTimeout(() => {
        console.log('🚀 Auto-advancing to date & time selection step (step 2)');
        setCurrentStep(2);
      }, 500);
    }
  };

  /**
   * Helper function to check if a time slot has ended
   * Returns true if the slot should be filtered out (slot has completely ended)
   * 
   * Logic:
   * - If selected date is in the future: all slots are valid (return false)
   * - If selected date is today: check if slot END time has already passed
   * - Patients can book as long as current time is BEFORE the slot end time
   * - Example: Current time is 4:55 PM, slot is 4:30-5:00 PM
   *   → Slot ends at 5:00 PM, current time (4:55 PM) is before 5:00 PM → Should be shown (return false)
   * - Example: Current time is 5:05 PM, slot is 4:30-5:00 PM
   *   → Slot ended at 5:00 PM, current time (5:05 PM) is after 5:00 PM → Should be filtered (return true)
   */
  const isSlotInPast = (slot: string, selectedDate: dayjs.Dayjs | null): boolean => {
    if (!selectedDate) return false;
    
    const now = dayjs();
    const today = now.format('YYYY-MM-DD');
    const selectedDateStr = selectedDate.format('YYYY-MM-DD');
    
    // Only filter past slots if the selected date is today
    if (selectedDateStr !== today) {
      return false; // Future dates - all slots are valid
    }
    
    try {
      // Use END time for range slots: "HH:mm-HH:mm"
      const endPart = slot.includes('-') ? slot.split('-')[1].trim() : slot.trim();
      const parsedEnd = parseTimeTo24h(endPart);

      // If slot is single time "HH:mm", assume it's a 30-minute slot (end = start + 30m)
      const endTime =
        parsedEnd ||
        (() => {
          const parsedStart = parseTimeTo24h(slot.trim());
          if (!parsedStart) return null;
          const dt = dayjs().hour(parsedStart.hours24).minute(parsedStart.minutes).add(30, 'minute');
          return { hours24: dt.hour(), minutes: dt.minute() };
        })();

      if (!endTime) {
        console.warn(`Invalid time format for slot: ${slot}`);
        return false; // Invalid time format, don't filter
      }

      // Create a dayjs object for the slot END time today
      const slotEndDateTime = dayjs()
        .hour(endTime.hours24)
        .minute(endTime.minutes)
        .second(0)
        .millisecond(0);
      
      // Check if slot END time has already passed
      // Only filter if current time is AFTER slot end time (slot has completely ended)
      // If current time equals end time, still allow booking (slot is still active)
      const hasEnded = now.isAfter(slotEndDateTime);
      
      if (hasEnded) {
        console.log(`⏰ Filtering out ended slot: ${slot} (ended at ${slotEndDateTime.format('HH:mm')}, current time: ${now.format('HH:mm')})`);
      } else {
        console.log(`✅ Slot still available: ${slot} (ends at ${slotEndDateTime.format('HH:mm')}, current time: ${now.format('HH:mm')})`);
      }
      
      return hasEnded;
    } catch (error) {
      console.error('Error checking if slot is in past:', error, 'slot:', slot);
      return false; // On error, don't filter
    }
  };

  const handleDateChange = async (date: dayjs.Dayjs | null) => {
    setSelectedDate(date);
    setSelectedSlot('');
    setSlotBookings({});
    form.setFieldsValue({ timeSlot: undefined });
    
    // When date changes, update available slots and fetch booked appointments
    if (date && selectedDoctor) {
      const allSlots = getDoctorSlots(selectedDoctor);
      
      // Filter out past slots if the selected date is today
      const filteredSlots = allSlots.filter(slot => !isSlotInPast(slot, date));
      
      setAvailableSlots(filteredSlots);
      console.log(`📅 Filtered slots: ${filteredSlots.length} available (${allSlots.length - filteredSlots.length} past slots hidden)`);
      
      // Fetch booked appointments for this doctor and date
      const dateStr = date.format('YYYY-MM-DD');
      const bookings = await fetchBookedAppointments(selectedDoctor.id, dateStr);
      setSlotBookings(bookings);
      console.log('📅 Booked appointments for', dateStr, ':', bookings);
    }
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

  const handleSpecialtyChange = (specialty?: string) => {
    const nextSpecialty = specialty || '';
    setSelectedSpecialty(nextSpecialty);
    applyHospitalFilters(hospitals, searchTerm, nextSpecialty);
  };

  // Auto-advance functions - no manual Next/Previous needed

  const handleCancel = () => {
    setLocation('/dashboard/patient/appointments');
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

  const handlePaymentSuccess = async (paymentMethod: 'online' | 'counter', paymentDetails?: any) => {
    try {
      if (!bookedAppointmentId) {
        message.error('Appointment ID not found');
        return;
      }

      const token = localStorage.getItem('auth-token');
      
      // Update appointment with payment status
      const updateData: any = {};

      // Add payment details to notes if online payment
      if (paymentMethod === 'online' && paymentDetails) {
        const now = new Date();
        const paymentDate = now.toLocaleDateString('en-IN');
        const paymentTime = now.toLocaleTimeString('en-IN');
        const paymentNote = `Payment: ${paymentDetails.transactionId} | Method: ${paymentDetails.paymentMethod} | Amount: ₹${paymentDetails.amount} | Status: ${paymentDetails.status} | Date: ${paymentDate} | Time: ${paymentTime}`;
        updateData.notes = paymentNote;
        updateData.paymentStatus = 'paid';
      } else {
        updateData.paymentStatus = 'pending';
      }

      const response = await fetch(`/api/appointments/${bookedAppointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        // Play booking success sound
        playNotificationSound('booking');
        
        // Invalidate all appointment queries to refresh dashboards
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
        queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
        
        if (paymentMethod === 'online') {
          message.success('Appointment booked and payment completed successfully!');
        } else {
          message.success('Appointment booked successfully! Please pay at the counter when you arrive.');
        }
        
        setTimeout(() => {
          setLocation('/dashboard/patient/appointments');
        }, 1500);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to update payment status:', errorData);
        message.warning('Appointment booked but payment status update failed. Please contact support.');
        setLocation('/dashboard/patient/appointments');
      }
    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      message.warning('Appointment booked but payment status update failed. Please contact support.');
      setLocation('/dashboard/patient/appointments');
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
      
      // Extract appointment time from slot (format: "HH:MM-HH:MM" or "HH:MM")
      let appointmentTime = selectedSlot;
      if (selectedSlot.includes('-')) {
        appointmentTime = selectedSlot.split('-')[0].trim();
      }
      
      // Ensure all required fields are present
      if (!appointmentTime || appointmentTime === '') {
        message.error('Please select a valid time slot');
        setLoading(false);
        return;
      }
      
      // Get form values including priority
      const formValues = form.getFieldsValue();
      
      const appointmentData = {
        // patientId will be set by backend based on authenticated user
        doctorId: selectedDoctor.id,
        hospitalId: selectedHospital.id,
        appointmentDate: selectedDate.format('YYYY-MM-DD'),
        appointmentTime: appointmentTime,
        timeSlot: selectedSlot || appointmentTime,
        reason: 'consultation',
        symptoms: '',
        notes: '',
        type: 'online',
        priority: formValues.priority || 'normal'
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
        
        // Get consultation fee from selected doctor
        const fee = selectedDoctor?.consultationFee 
          ? parseFloat(selectedDoctor.consultationFee.toString()) 
          : 500;
        setConsultationFee(fee);
        setBookedAppointmentId(result.id || result.appointment?.id);
        
        // Show payment modal instead of redirecting
        setShowPaymentModal(true);
        setLoading(false);
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
          {/* Search and Filter Section */}
          <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
            <Col xs={24} md={8}>
              <Text strong style={{ marginBottom: '8px', display: 'block', fontSize: '14px', color: '#374151' }}>
                Search Hospital
              </Text>
              <Input
                placeholder="Search by hospital name..."
                value={searchTerm}
                onChange={handleSearchChange}
                prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
                allowClear
                style={{ borderRadius: '8px' }}
                size="large"
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong style={{ marginBottom: '8px', display: 'block', fontSize: '14px', color: '#374151' }}>
                Filter by Specialty
              </Text>
              <Select
                placeholder="All Specialties"
                value={selectedSpecialty || undefined}
                onChange={handleSpecialtyChange}
                style={{ width: '100%', borderRadius: '8px' }}
                allowClear
                suffixIcon={<ArrowRightOutlined style={{ transform: 'rotate(90deg)', color: '#9CA3AF' }} />}
                size="large"
              >
                {allSpecialties.map(specialty => (
                  <Option key={specialty} value={specialty}>
                    {specialty}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} md={8}>
              <Text strong style={{ marginBottom: '8px', display: 'block', fontSize: '14px', color: '#374151' }}>
                Select City
              </Text>
              <Select
                value={selectedCity}
                onChange={handleCityChange}
                style={{ width: '100%', borderRadius: '8px' }}
                placeholder="Select city"
                suffixIcon={<ArrowRightOutlined style={{ transform: 'rotate(90deg)', color: '#9CA3AF' }} />}
                size="large"
              >
                {availableCities.map(city => (
                  <Option key={city} value={city}>
                    <Space>
                      <EnvironmentOutlined style={{ color: '#9CA3AF' }} />
                      {city}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>

          {/* Results Count */}
          <div style={{ marginBottom: '24px' }}>
            <Text style={{ fontSize: '14px', color: '#6B7280' }}>
              Showing {filteredHospitals.length} hospitals in {selectedCity}
              </Text>
            </div>
          
          <Form.Item
            name="hospitalId"
            rules={[{ required: true, message: 'Please select a hospital' }]}
            style={{ display: 'none' }}
          >
            <Input />
          </Form.Item>

          {/* Hospital List */}
          {filteredHospitals.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '16px' }}>
              <EnvironmentOutlined style={{ fontSize: '48px', color: '#9CA3AF', marginBottom: '16px' }} />
              <Title level={4} style={{ color: '#6B7280', marginBottom: '8px' }}>No Hospitals Found</Title>
              <Text style={{ color: '#9CA3AF' }}>
                {hospitals.length === 0 
                  ? `No hospitals are available in ${selectedCity}. Please select a different city.`
                  : 'No hospitals match your search criteria. Try adjusting your filters.'
                }
              </Text>
            </Card>
          ) : (
            <Row gutter={[24, 24]}>
              {filteredHospitals.map(hospital => {
                const departments = typeof hospital.departments === 'string' 
                  ? JSON.parse(hospital.departments) 
                  : hospital.departments || [];
                const status = hospital.is_verified ? 'Available' : 'Pending';
                const statusColor = hospital.is_verified ? '#10B981' : '#F59E0B';
                const statusBg = hospital.is_verified ? '#D1FAE5' : '#FEF3C7';
                
                return (
                <Col xs={24} sm={12} lg={8} key={hospital.id}>
                  <Card
                    hoverable
                    onClick={() => handleHospitalSelect(hospital.id)}
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '16px',
                      border: selectedHospital?.id === hospital.id ? '2px solid #2563eb' : '1px solid #E5E7EB',
                      boxShadow: selectedHospital?.id === hospital.id
                        ? '0 12px 24px rgba(37, 99, 235, 0.12)'
                          : '0 2px 8px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      background: '#ffffff',
                    }}
                    styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%' } }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                      {/* Hospital Name and Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <Title level={4} style={{ margin: 0, color: '#111827', fontSize: '20px', fontWeight: 700, flex: 1, lineHeight: 1.3 }}>
                          {hospital.name}
                        </Title>
                        <Tag
                          style={{
                            background: statusBg,
                            color: statusColor,
                            border: 'none',
                            borderRadius: '12px',
                            padding: '4px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            margin: 0,
                            height: 28,
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          {status}
                        </Tag>
                      </div>

                      {/* Address */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <EnvironmentOutlined style={{ color: '#9CA3AF', fontSize: '16px', marginTop: 2, flexShrink: 0 }} />
                        <div style={{ display: 'grid', gap: 2 }}>
                          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: 1.4 }}>
                            {hospital.address}
                          </Text>
                          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: 1.4 }}>
                            {hospital.city}, {hospital.state}
                          </Text>
                        </div>
                      </div>

                      {/* Established and Total Beds */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <CalendarOutlined style={{ color: '#9CA3AF', fontSize: '16px' }} />
                          <div style={{ display: 'grid', gap: 2 }}>
                            <Text style={{ fontSize: '12px', color: '#6B7280', display: 'block' }}>Established</Text>
                            <Text strong style={{ fontSize: '16px', color: '#111827' }}>{hospital.establishedYear || 'N/A'}</Text>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <MedicineBoxOutlined style={{ color: '#9CA3AF', fontSize: '16px' }} />
                          <div style={{ display: 'grid', gap: 2 }}>
                            <Text style={{ fontSize: '12px', color: '#6B7280', display: 'block' }}>Total Beds</Text>
                            <Text strong style={{ fontSize: '16px', color: '#111827' }}>{hospital.totalBeds || 0}</Text>
                          </div>
                        </div>
                      </div>

                      {/* Departments */}
                      <div>
                        <Text style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'block', marginBottom: 8 }}>
                          Departments
                        </Text>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {departments.slice(0, 4).map((dept: string) => (
                            <Tag
                              key={dept}
                              style={{
                                background: '#F3F4F6',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '12px',
                                lineHeight: 1.2,
                                margin: 0,
                              }}
                            >
                              {dept}
                            </Tag>
                          ))}
                          {departments.length > 4 && (
                            <Tag
                              style={{
                                background: '#F3F4F6',
                                color: '#6B7280',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '12px',
                                lineHeight: 1.2,
                                margin: 0,
                              }}
                            >
                              +{departments.length - 4}
                            </Tag>
                          )}
                        </div>
                      </div>

                      {/* Availability Status */}
                      <div style={{ marginTop: 'auto', display: 'grid', gap: 8, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
                        {hospital.emergencyServices && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ThunderboltOutlined style={{ color: '#10B981', fontSize: '16px' }} />
                            <Text style={{ fontSize: '14px', color: '#10B981', fontWeight: 600 }}>
                              Emergency Available
                            </Text>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ClockCircleOutlined style={{ color: hospital.operatingHours ? '#10B981' : '#EF4444', fontSize: '16px' }} />
                          <Text style={{ fontSize: '14px', color: hospital.operatingHours ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                            {hospital.operatingHours || 'Hours not available'}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>
                );
              })}
            </Row>
          )}

          <Form.Item
            name="hospitalId"
            rules={[{ required: true, message: 'Please select a hospital' }]}
            style={{ display: 'none' }}
          >
            <Input />
          </Form.Item>
        </div>
      )
    },
    {
      title: 'Select Doctor',
      icon: <UserOutlined />,
      content: (
        <div>
          {!selectedHospital ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Text style={{ color: '#6B7280' }}>Please select a hospital first</Text>
            </div>
          ) : (
            <div>
              {/* Doctor Count */}
              <div style={{ marginBottom: '24px' }}>
                <Text style={{ fontSize: '14px', color: '#6B7280' }}>
                  {loading && doctors.length === 0 ? (
                    'Loading doctors...'
                  ) : (
                    <>
                      Showing <Text strong style={{ color: '#111827' }}>{doctors.length}</Text> doctors available
                    </>
                  )}
                </Text>
              </div>
              
              {loading && doctors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: '16px' }}>
                    <Text style={{ color: '#6B7280' }}>Loading doctors...</Text>
                  </div>
                </div>
              ) : doctors.length > 0 ? (
                <div>
                  {/* Group doctors by specialty */}
                  {(() => {
                    // Group doctors by specialty
                    const doctorsBySpecialty = doctors.reduce((acc, doctor) => {
                      const specialty = doctor.specialty || 'General';
                      if (!acc[specialty]) {
                        acc[specialty] = [];
                      }
                      acc[specialty].push(doctor);
                      return acc;
                    }, {} as Record<string, Doctor[]>);

                    // Sort specialties alphabetically
                    const sortedSpecialties = Object.keys(doctorsBySpecialty).sort();

                    return (
                      <div>
                        {/* Display doctors grouped by specialty */}
                        {sortedSpecialties.map((specialty, specialtyIndex) => {
                          const specialtyDoctors = doctorsBySpecialty[specialty];
                          
                          return (
                            <div key={specialty} style={{ marginBottom: specialtyIndex < sortedSpecialties.length - 1 ? '40px' : '0' }}>
                              {/* Specialty Header */}
                              <div style={{ marginBottom: '20px' }}>
                                <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#111827' }}>
                                  {specialty}
                                </Title>
                                <Text style={{ fontSize: '14px', color: '#6B7280' }}>
                                  {specialtyDoctors.length} doctor{specialtyDoctors.length !== 1 ? 's' : ''} available
                  </Text>
                              </div>

                              {/* Doctors Grid */}
                              <Row gutter={[24, 24]}>
                                {specialtyDoctors.map(doctor => {
                                  // Get availability status (only checks if doctor has slots, not specific time availability)
                                  const availability = getDoctorAvailabilityStatus(doctor);
                                  const { statusText, statusColor, statusBg, statusIcon } = availability;

                                  // Get doctor initials for avatar
                                  const getDoctorInitials = (name: string) => {
                                    if (!name) return 'DR';
                                    const names = name.split(' ');
                                    if (names.length >= 2) {
                                      return `${names[0][0]}${names[1][0]}`.toUpperCase();
                                    }
                                    return name.substring(0, 2).toUpperCase();
                                  };

                                  return (
                      <Col xs={24} sm={12} lg={8} key={doctor.id}>
                        <Card
                          hoverable
                          style={{
                                          border: selectedDoctor?.id === doctor.id ? '2px solid #1A8FE3' : '1px solid #E5E7EB',
                                          borderRadius: '16px',
                                          boxShadow: selectedDoctor?.id === doctor.id 
                                            ? '0 4px 12px rgba(26, 143, 227, 0.15)' 
                                            : '0 2px 8px rgba(0, 0, 0, 0.08)',
                            cursor: 'pointer',
                            height: '100%',
                                          background: '#fff',
                                          transition: 'all 0.2s ease',
                          }}
                          onClick={() => handleDoctorSelect(doctor.id)}
                                        styles={{ body: { padding: '24px' } }}
                                      >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                          {/* Doctor Photo and Name */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <Avatar
                                              size={64}
                                              src={doctor.photo || undefined}
                                              style={{
                                                backgroundColor: '#1A8FE3',
                                                fontSize: '20px',
                                                fontWeight: 600,
                                                flexShrink: 0,
                                              }}
                                            >
                                              {!doctor.photo && getDoctorInitials(doctor.fullName || 'Dr. Unknown')}
                                            </Avatar>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                              {doctor.fullName || 'Dr. Unknown'}
                            </Title>
                                              <Text style={{ fontSize: '14px', color: '#6B7280' }}>
                              {doctor.specialty}
                            </Text>
                                            </div>
                          </div>
                          
                                          {/* Experience and Fee */}
                                          <div style={{ display: 'flex', gap: 24 }}>
                                            <div>
                                              <Text style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Experience</Text>
                                              <Text strong style={{ fontSize: '16px', color: '#111827' }}>{doctor.experience} years</Text>
                                            </div>
                                            <div>
                                              <Text style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Fee</Text>
                                              <Text strong style={{ fontSize: '16px', color: '#111827' }}>
                                                ₹{typeof doctor.consultationFee === 'string' 
                                                  ? parseFloat(doctor.consultationFee).toFixed(2) 
                                                  : (Number(doctor.consultationFee) || 0).toFixed(2)}
                                              </Text>
                                            </div>
                          </div>

                                          {/* Qualification */}
                                          <div>
                                            <Text style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Qualification</Text>
                                            <Text style={{ fontSize: '14px', color: '#111827' }}>{doctor.qualification || 'MBBS, MD'}</Text>
                          </div>

                                          {/* Status Button */}
                                          <div>
                                            <Button
                                              type="default"
                                              icon={statusIcon}
                                              style={{
                                                width: '100%',
                                                height: '40px',
                                                borderRadius: '8px',
                                                background: statusBg,
                                                border: `1px solid ${statusColor}`,
                                                color: statusColor,
                                                fontWeight: 500,
                                                fontSize: '14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                              }}
                                              disabled
                                            >
                                              {statusText}
                                            </Button>
                            </div>
                                        </div>
                        </Card>
                      </Col>
                                  );
                                })}
                  </Row>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  
                  <Form.Item
                    name="doctorId"
                    rules={[{ required: true, message: 'Please select a doctor' }]}
                    style={{ display: 'none' }}
                  >
                    <Input />
                  </Form.Item>
                </div>
              ) : (
                <Card style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '16px' }}>
                  <UserOutlined style={{ fontSize: '48px', color: '#9CA3AF', marginBottom: '16px' }} />
                  <Title level={4} style={{ color: '#6B7280', marginBottom: '8px' }}>No Doctors Found</Title>
                  <Text style={{ color: '#9CA3AF' }}>
                      {loading ? 'Loading doctors...' : 'No doctors are available in this hospital. Please select a different hospital.'}
                    </Text>
                    </Card>
                  )}
                </div>
          )}
        </div>
      )
    },
    {
      title: 'Select Date & Time',
      icon: <CalendarOutlined />,
      content: (
        <div>
          {/* Date Selection */}
          <Card variant="borderless" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: 24 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                width: '100%',
                justifyContent: 'space-between',
                  }}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                    const date = dayjs().add(offset, 'day');
                    const isSelected = selectedDate?.isSame(date, 'day');
                    const isDisabled = offset > 6;

                    return (
                      <div
                        key={offset}
                        onClick={() => !isDisabled && handleDateChange(date)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                      flex: 1,
                          padding: '10px 14px',
                          borderRadius: 12,
                          border: `1px solid ${isSelected ? '#ff385c' : '#d1d5db'}`,
                          background: isSelected ? '#ff385c' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#111827',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.4 : 1,
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 4px 12px rgba(255, 56, 92, 0.2)' : undefined,
                        }}
                      >
                    <Text style={{ fontSize: 12, letterSpacing: '0.08em', fontWeight: 500 }}>
                          {date.format('ddd').toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                          {date.format('DD/MM/YYYY')}
                        </Text>
                      </div>
                    );
                  })}
                </div>
              </Card>

          {/* Time Slots Section */}
          <Card variant="borderless" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: 24, background: '#ffffff' }}>
                <div
                  style={{
                    display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 12,
                padding: '20px',
                  }}
                >
                  {availableSlots.length > 0 ? (
                    availableSlots.map(slot => {
                      const isSelected = selectedSlot === slot;
                  const slotAvailability = getSlotAvailabilityColor(slot);
                  const { bgColor, borderColor, textColor, isAvailable, availableCount } = slotAvailability;
                  
                  // If slot is fully booked (red), disable it
                  const isDisabled = !isAvailable;
                  
                  // Lighter green background with darker border for available slots
                  const finalBgColor = isSelected 
                    ? '#16a34a' 
                    : isDisabled 
                      ? '#F3F4F6' 
                      : slotAvailability.color === 'green'
                        ? '#ECFDF5' // Lighter green
                        : slotAvailability.color === 'yellow'
                          ? '#FFFBEB' // Lighter yellow
                          : bgColor;
                  
                  const finalBorderColor = isSelected 
                    ? '#16a34a' 
                    : isDisabled 
                      ? '#D1D5DB' 
                      : slotAvailability.color === 'green'
                        ? '#10B981' // Darker green border
                        : slotAvailability.color === 'yellow'
                          ? '#F59E0B' // Darker yellow border
                          : borderColor;
                  
                      return (
                        <button
                          key={slot}
                      onClick={() => !isDisabled && handleSlotSelect(slot)}
                      disabled={isDisabled}
                          style={{
                        height: 56,
                            borderRadius: 8,
                        border: `1px solid ${finalBorderColor}`,
                        background: finalBgColor,
                        color: isSelected 
                          ? '#ffffff' 
                          : isDisabled 
                            ? '#9CA3AF' 
                            : slotAvailability.color === 'green'
                              ? '#047857' // Darker green text
                              : slotAvailability.color === 'yellow'
                                ? '#92400E' // Darker yellow text
                                : textColor,
                            fontWeight: 600,
                            fontSize: 14,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.6 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                      }}
                      title={isDisabled 
                        ? 'Fully booked (5/5 patients)' 
                        : `${availableCount} slot${availableCount !== 1 ? 's' : ''} available (${availableCount}/5)`}
                    >
                      <span>{formatTimeSlot12h(slot)}</span>
                        </button>
                      );
                    })
                  ) : (
                    <Alert message="No slots available for the selected date" type="warning" showIcon />
                  )}
                </div>
            
            {/* Separating Line */}
            <div style={{
              height: '1px',
              background: '#E5E7EB',
              margin: '20px 0',
            }} />
            
            {/* Available Time Slots Heading and Legend */}
            <div style={{ padding: '0 20px 20px 20px' }}>
              <Title level={4} style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                Available Time Slots
              </Title>
              
              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
                {/* Available */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: '#ECFDF5',
                      border: '1px solid #10B981',
                    }}
                  />
                  <Text style={{ fontSize: '14px', color: '#374151' }}>Available</Text>
                </div>

                {/* Limited Availability (Yellow) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: '#FFFBEB',
                      border: '1px solid #F59E0B',
                    }}
                  />
                  <Text style={{ fontSize: '14px', color: '#374151' }}>Limited (1-2 slots)</Text>
                </div>

                {/* Fully Booked (Red) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: '#FEE2E2',
                      border: '1px solid #EF4444',
                    }}
                  />
                  <Text style={{ fontSize: '14px', color: '#374151' }}>Slot Full (5/5)</Text>
                </div>

                {/* Not Available */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: '#F3F4F6',
                      border: '1px solid #D1D5DB',
                    }}
                  />
                  <Text style={{ fontSize: '14px', color: '#374151' }}>Not Available</Text>
                </div>
              </div>
            </div>
            </Card>
        </div>
      )
    },
    {
      title: 'Confirm Appointment',
      icon: <CheckCircleOutlined />,
      content: (
        <div>
          {selectedHospital && selectedDoctor && selectedDate && selectedSlot ? (
            <Card
              variant="borderless"
              style={{
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                boxShadow: '0 12px 32px rgba(15,23,42,0.08)',
                padding: 24,
              }}
            >
              <Space direction="vertical" size={20} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 13 }}>Hospital</Text>
                    <Title level={4} style={{ margin: '8px 0 4px' }}>{selectedHospital.name}</Title>
                    <Text style={{ fontSize: 13, color: '#6b7280' }}>{selectedHospital.address}, {selectedHospital.city}</Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>Doctor</Text>
                    <Title level={4} style={{ margin: '8px 0 4px' }}>{selectedDoctor.fullName}</Title>
                    <Text style={{ fontSize: 13, color: '#6b7280' }}>{selectedDoctor.specialty} • {selectedDoctor.experience} yrs</Text>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: '1 1 220px', padding: '16px 20px', borderRadius: 12, border: '1px solid #f0f2f5', background: '#f9fafb' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Date</Text>
                    <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{selectedDate.format('dddd, DD/MM/YYYY')}</div>
                  </div>
                  <div style={{ flex: '1 1 220px', padding: '16px 20px', borderRadius: 12, border: '1px solid #f0f2f5', background: '#f9fafb' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Time</Text>
                    <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{formatTimeSlot12h(selectedSlot)}</div>
                  </div>
                  <div style={{ flex: '1 1 220px', padding: '16px 20px', borderRadius: 12, border: '1px solid #f0f2f5', background: '#f9fafb' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Consultation Fee</Text>
                    <div style={{ fontSize: 18, fontWeight: 600, marginTop: 6 }}>₹{selectedDoctor.consultationFee}</div>
                  </div>
                </div>

                {/* Priority Selection */}
                <div style={{ marginTop: 16 }}>
                  <Form.Item 
                    label={<Text strong style={{ fontSize: 14 }}>Priority</Text>}
                    name="priority"
                    initialValue="normal"
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      style={{ width: '100%' }}
                      options={[
                        { value: 'normal', label: 'Normal' },
                        { value: 'high', label: 'High' },
                        { value: 'urgent', label: 'Urgent' },
                      ]}
                    />
                  </Form.Item>
                </div>

                <div style={{ padding: '14px 18px', borderRadius: 12, background: '#ecfdf5', border: '1px solid #bbf7d0' }}>
                  <Text style={{ fontSize: 13, color: '#047857' }}>
                    Once you confirm, a receipt and status updates will be shared with you instantly.
                  </Text>
                </div>
              </Space>
            </Card>
          ) : (
            <Card style={{ borderRadius: 16, textAlign: 'center' }}>
              <Title level={4}>Missing Details</Title>
              <Text type="secondary">Please complete the previous steps to review your appointment.</Text>
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
    <>
      <style>{`
        /* Override medical-container padding for book-appointment page */
        body:has(.book-appointment-wrapper) .medical-container {
          padding: 0 !important;
          display: block !important;
          align-items: unset !important;
          justify-content: unset !important;
          background: transparent !important;
        }
        /* Allow scrolling on book-appointment page */
        body:has(.book-appointment-wrapper) {
          overflow: auto !important;
          overflow-x: hidden !important;
        }
        html:has(.book-appointment-wrapper) {
          overflow: auto !important;
          overflow-x: hidden !important;
        }
        /* Patient sidebar menu styles */
        .patient-dashboard-menu .ant-menu-item {
          border-radius: 12px !important;
          margin: 4px 8px !important;
          height: 48px !important;
          line-height: 48px !important;
          transition: all 0.3s ease !important;
          padding-left: 16px !important;
          background: transparent !important;
          border: none !important;
        }
        .patient-dashboard-menu .ant-menu-item:hover {
          background: transparent !important;
        }
        .patient-dashboard-menu .ant-menu-item:hover,
        .patient-dashboard-menu .ant-menu-item:hover .ant-menu-title-content {
          color: #595959 !important;
        }
        .patient-dashboard-menu .ant-menu-item-selected {
          background: #1A8FE3 !important;
          font-weight: 500 !important;
          border: none !important;
          padding-left: 16px !important;
        }
        .patient-dashboard-menu .ant-menu-item-selected,
        .patient-dashboard-menu .ant-menu-item-selected .ant-menu-title-content {
          color: #fff !important;
        }
        .patient-dashboard-menu .ant-menu-item-selected .ant-menu-item-icon,
        .patient-dashboard-menu .ant-menu-item-selected .anticon,
        .patient-dashboard-menu .ant-menu-item-selected img {
          color: #fff !important;
          filter: brightness(0) invert(1) !important;
        }
        .patient-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) {
          color: #8C8C8C !important;
          background: transparent !important;
        }
        .patient-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-title-content {
          color: #8C8C8C !important;
        }
        .patient-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .ant-menu-item-icon,
        .patient-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) .anticon,
        .patient-dashboard-menu .ant-menu-item:not(.ant-menu-item-selected) img {
          color: #8C8C8C !important;
        }
        .patient-dashboard-menu .ant-menu-item-selected::after {
          display: none !important;
        }
        .patient-dashboard-menu .ant-menu-item-icon,
        .patient-dashboard-menu .anticon {
          font-size: 18px !important;
          width: 18px !important;
          height: 18px !important;
        }
      `}</style>
      <Layout style={{ minHeight: '100vh', background: '#F3F4F6' }} className="book-appointment-wrapper">
        {/* Desktop/Tablet Sidebar */}
        {!isMobile && (
          <Sider
            width={260}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100vh',
              width: 260,
              background: '#fff',
              boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10,
              borderLeft: '1px solid #E3F2FF',
              borderBottom: '1px solid #E3F2FF',
            }}
          >
            <PatientSidebar selectedMenuKey="appointments" />
          </Sider>
        )}

        {/* Mobile Drawer */}
        {isMobile && (
          <Drawer
            title="Navigation"
            placement="left"
            onClose={() => setMobileDrawerOpen(false)}
            open={mobileDrawerOpen}
            styles={{ body: { padding: 0 } }}
            width={260}
          >
            <PatientSidebar selectedMenuKey="appointments" onMenuClick={() => setMobileDrawerOpen(false)} />
          </Drawer>
        )}

        <Layout
          style={{
            marginLeft: isMobile ? 0 : 260,
            minHeight: '100vh',
            background: '#F3F4F6',
            overflow: 'hidden',
          }}
        >
        <Content
          style={{
            background: '#F3F4F6',
            height: '100vh',
            overflowY: 'auto',
            padding: 0,
          }}
        >
          {/* Mobile Menu Button */}
          {(isMobile && (currentStep === 0 || currentStep === 1)) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#F3F4F6' }}>
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{ fontSize: '18px' }}
              />
              <div style={{ width: 32 }} /> {/* Spacer for centering */}
            </div>
          )}

          {/* Header - Select Hospital step */}
          {currentStep === 0 && (
          <div style={{ 
            background: '#F3F4F6', 
            padding: '16px 32px',
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              position: 'relative',
            }}>
              {/* Back Button - Left Aligned */}
              <div style={{ position: 'absolute', left: 0 }}>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => setLocation('/dashboard/patient')}
                  type="text"
                  style={{ padding: 0, height: 'auto', fontSize: '14px', color: '#6B7280' }}
                >
                  Back
                </Button>
              </div>
              
              {/* Title and Subtitle - Centered */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center',
                width: '100%',
                flex: 1,
              }}>
                <Title level={2} style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#111827' }}>
                  Select Hospital
                </Title>
                <Text style={{ fontSize: '16px', color: '#6B7280', marginTop: '4px' }}>
                  Choose a hospital in your region
                </Text>
              </div>
            </div>
            {/* Line Separator */}
            <div style={{
              height: '1px',
              background: '#E5E7EB',
              marginTop: '16px',
            }} />
          </div>
        )}

          {/* Header - Select Doctor step */}
          {currentStep === 1 && selectedHospital && (
          <div style={{ 
            background: '#F3F4F6', 
            padding: '16px 32px',
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              position: 'relative',
            }}>
              {/* Back Button - Left Aligned */}
              <div style={{ position: 'absolute', left: 0 }}>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={handlePrevious}
                  type="text"
                  style={{ padding: 0, height: 'auto', fontSize: '14px', color: '#6B7280' }}
                >
                  Back
                </Button>
              </div>
              
              {/* Title and Subtitle - Centered */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center',
                width: '100%',
                flex: 1,
              }}>
                <Title level={2} style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#111827' }}>
                  Select Doctor
                </Title>
                <Text style={{ fontSize: '16px', color: '#6B7280', marginTop: '4px' }}>
                  {selectedHospital.name}
                </Text>
              </div>
            </div>
            {/* Line Separator */}
            <div style={{
              height: '1px',
              background: '#E5E7EB',
              marginTop: '16px',
            }} />
          </div>
        )}

      {/* Header - Select Date & Time step */}
      {currentStep === 2 && selectedDoctor && selectedHospital && (
        <div style={{ 
          background: '#F3F4F6', 
          padding: '16px 32px',
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            position: 'relative',
          }}>
            {/* Back Button - Left Aligned */}
            <div style={{ position: 'absolute', left: 0 }}>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={handlePrevious}
                type="text"
                style={{ padding: 0, height: 'auto', fontSize: '14px', color: '#6B7280' }}
              >
                Back
              </Button>
            </div>
            
            {/* Title and Subtitle - Centered */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              textAlign: 'center',
              width: '100%',
              flex: 1,
            }}>
              <Title level={2} style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#111827' }}>
                Select Date & Time
              </Title>
              <Text style={{ fontSize: '16px', color: '#6B7280', marginTop: '4px' }}>
                {selectedDoctor.fullName} - {selectedHospital.name}
              </Text>
            </div>
          </div>
          {/* Line Separator */}
          <div style={{
            height: '1px',
            background: '#E5E7EB',
            marginTop: '16px',
          }} />
        </div>
      )}

      {/* Standard Header for Confirm step */}
      {currentStep === 3 && (
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
                onClick={handlePrevious}
                type="text"
              >
                Back
              </Button>
            </Space>
          </Col>
        </Row>
      </div>
      )}

      {/* Content */}
          <div style={{ padding: (currentStep === 0 || currentStep === 1 || currentStep === 2) ? '32px' : '32px 24px', maxWidth: '1320px', margin: '0 auto', width: '100%', minHeight: '400px' }}>
        <Spin spinning={loading} tip={loading ? (currentStep === 0 ? 'Loading hospitals...' : currentStep === 1 ? 'Loading doctors...' : 'Loading...') : undefined}>
          {currentStep === 0 || currentStep === 1 || currentStep === 2 ? (
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
            >
              {steps[currentStep]?.content || <div style={{ textAlign: 'center', padding: '40px' }}><Text>Loading...</Text></div>}
            </Form>
          ) : (
          <Card style={{ marginBottom: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <CalendarOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
              <Title level={2} style={{ margin: 0 }}>
                {steps[currentStep].title}
              </Title>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                {steps[currentStep].icon}
              </Text>
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
                {currentStep > 0 && (
                  <Button 
                    onClick={handlePrevious}
                    icon={<ArrowLeftOutlined />}
                  >
                    Previous Step
                  </Button>
                )}
                
                {currentStep < steps.length - 1 && (
                  <Button 
                    type="primary"
                    onClick={handleNext}
                    icon={<ArrowRightOutlined />}
                  >
                    Next Step (Manual)
                  </Button>
                )}
                
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
          )}
        </Spin>
      </div>
        </Content>
    </Layout>
    </Layout>

    {/* Payment Modal */}
    <AppointmentPaymentModal
      open={showPaymentModal}
      onCancel={() => {
        setShowPaymentModal(false);
        // Still redirect even if cancelled
        setLocation('/dashboard/patient/appointments');
      }}
      onSuccess={handlePaymentSuccess}
      amount={consultationFee}
      appointmentId={bookedAppointmentId || undefined}
    />
    </>
  );
}
