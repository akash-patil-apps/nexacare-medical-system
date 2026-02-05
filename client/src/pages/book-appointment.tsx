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
  Drawer,
  Modal
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
  CloseCircleOutlined,
  CreditCardOutlined,
  MobileOutlined,
  WalletOutlined,
  BankOutlined
} from '@ant-design/icons';
import { useAuth } from '../hooks/use-auth';
import { getActingPatientId, useActingPatient } from '../hooks/use-acting-patient';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { CopyIcon } from '../components/common/CopyIcon';
import { PatientSidebar } from '../components/layout/PatientSidebar';
import { useResponsive } from '../hooks/use-responsive';
import { formatTimeSlot12h, parseTimeTo24h } from '../lib/time';
import { playNotificationSound } from '../lib/notification-sounds';

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
  const [selectedPriority, setSelectedPriority] = useState<string>('normal');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'googlepay' | 'phonepe' | 'card' | 'cash' | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const isPatient = user?.role?.toUpperCase() === 'PATIENT';
  const [actingPatientId, setActingPatientId] = useActingPatient();

  // Current user's patient profile ID (for "Self" in For whom)
  const { data: patientProfile } = useQuery({
    queryKey: ['/api/patients/profile'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      if (!token) return null;
      const res = await fetch('/api/patients/profile', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && isPatient,
  });
  const myPatientId = patientProfile?.id ?? null;

  // Family members for "For whom" options
  const { data: familyMembersData = [] } = useQuery({
    queryKey: ['/api/patients/family-members'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      if (!token) return [];
      const res = await fetch('/api/patients/family-members', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && isPatient,
  });
  const familyMembers = Array.isArray(familyMembersData) ? familyMembersData : [];

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
      
      // Filter hospitals by selected city (case-insensitive)
      const cityFilteredHospitals = selectedCity 
        ? allHospitals.filter((hospital: Hospital) => {
            const hospitalCity = hospital.city?.trim().toLowerCase() || '';
            const selectedCityLower = selectedCity.trim().toLowerCase();
            return hospitalCity === selectedCityLower;
          })
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
      const response = await fetch(`/api/doctors/hospital/${hospitalId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load doctors: ${response.status}`);
      }
      
      const data = await response.json();
      
      const doctorsList = Array.isArray(data) ? data : [];
      setDoctors(doctorsList);
      
      // Auto-advance to doctor selection step after doctors are loaded
      if (doctorsList.length > 0) {
        setTimeout(() => {
          // Hospital is baseStep 0, doctor is baseStep 1
          setCurrentStep(hasForWhomStep ? 2 : 1);
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
    const hospital = filteredHospitals.find(h => h.id === hospitalId);
    
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
      
      return bookings;
    } catch (error) {
      console.error('Error fetching booked appointments:', error);
      return {};
    }
  };

  /**
   * Determines doctor availability status.
   * 
   * DOCTOR AVAILABILITY LOGIC:
   * 
   * 1. "Not Available" (Red) - Doctor unavailable for ENTIRE day:
   *    - Condition: doctor.isAvailable === false OR doctor.status === 'out' OR no slots configured
   *    - Shows: Red button with "Not Available" text and close icon
   *    - Patient cannot select this doctor
   * 
   * 2. "Busy" (Yellow) - Doctor manually marked as busy but has available slots:
   *    - Condition: doctor.status === 'busy' AND has slots configured
   *    - Shows: Yellow/orange button with "Busy" text and clock icon
   *    - Patient can still book, but doctor may be less responsive
   * 
   * 3. "Available" (Green) - Doctor has available slots:
   *    - Condition: doctor.isAvailable === true AND doctor.status !== 'busy' AND doctor.status !== 'out' AND has slots
   *    - Shows: Green button with "Available" text and check icon
   *    - Patient can book normally
   * 
   * Note: Individual time slot availability (green/yellow/red) is shown when user selects a date,
   * based on booking count per slot (max 5 patients per 30-minute slot).
   * 
   * Scenarios:
   * - Doctor unavailable 2pm-4pm, patient at 3pm: Shows "Available" (has other slots)
   * - Doctor has slots but some are fully booked: Shows "Available" (slots show red/yellow/green)
   * - Doctor not available entire day: Shows "Not Available"
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
      } else {
        setAvailableSlots(slots);
      }
      
      // Auto-advance to date & time selection step (baseStep 2)
      setTimeout(() => {
        setCurrentStep(hasForWhomStep ? 3 : 2);
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
      
      // Fetch booked appointments for this doctor and date
      const dateStr = date.format('YYYY-MM-DD');
      const bookings = await fetchBookedAppointments(selectedDoctor.id, dateStr);
      setSlotBookings(bookings);
    }
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    form.setFieldsValue({ timeSlot: slot });
    
            // Auto-advance to patient details step (baseStep 3)
            setTimeout(() => {
              setCurrentStep(hasForWhomStep ? 4 : 3);
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


  const handleSubmit = async () => {
    try {
      // Validate payment method is selected
      if (!selectedPaymentMethod) {
        message.error('Please select a payment method');
        return;
      }

      setLoading(true);
      
      // Validate required fields
      if (!selectedHospital || !selectedDoctor || !selectedDate || !selectedSlot) {
        message.error('Please complete all steps before booking');
        setLoading(false);
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
      const priority = selectedPriority || formValues.priority || 'normal';
      
      // Process payment first if online payment method
      let paymentDetails: any = null;
      const onlinePaymentMethods = ['googlepay', 'phonepe', 'card'];
      if (selectedPaymentMethod && onlinePaymentMethods.includes(selectedPaymentMethod)) {
        // Simulate online payment processing
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate payment processing
        
        paymentDetails = {
          method: selectedPaymentMethod,
          transactionId: `TXN${Date.now()}`,
          paymentMethod: selectedPaymentMethod,
          amount: typeof selectedDoctor.consultationFee === 'string' 
            ? parseFloat(selectedDoctor.consultationFee) 
            : (Number(selectedDoctor.consultationFee) || 500),
          timestamp: new Date().toISOString(),
          status: 'success',
        };
      }
      
      const actingId = getActingPatientId();
      const patientIdToUse = actingId ?? selectedForWhom ?? myPatientId ?? null;
      const appointmentData: Record<string, unknown> = {
        doctorId: selectedDoctor.id,
        hospitalId: selectedHospital.id,
        appointmentDate: selectedDate.format('YYYY-MM-DD'),
        appointmentTime: appointmentTime,
        timeSlot: selectedSlot || appointmentTime,
        reason: 'consultation',
        symptoms: '',
        notes: paymentDetails ? `Payment: ${paymentDetails.transactionId} | Method: ${paymentDetails.paymentMethod} | Amount: ₹${paymentDetails.amount} | Status: ${paymentDetails.status} | Date: ${new Date().toLocaleDateString('en-IN')} | Time: ${new Date().toLocaleTimeString('en-IN')}` : '',
        type: 'online',
        priority: priority,
        paymentStatus: selectedPaymentMethod && ['googlepay', 'phonepe', 'card'].includes(selectedPaymentMethod) ? 'paid' : 'pending',
      };
      if (patientIdToUse != null) appointmentData.patientId = patientIdToUse;

      const token = localStorage.getItem('auth-token');

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(appointmentData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Play booking success sound
        playNotificationSound('booking');
        
        // Invalidate all appointment queries to refresh dashboards
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
        queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
        
        if (selectedPaymentMethod && ['googlepay', 'phonepe', 'card'].includes(selectedPaymentMethod) && paymentDetails) {
          // Show receipt for online payment
          setReceiptData({
            appointment: result,
            payment: paymentDetails,
            doctor: selectedDoctor,
            hospital: selectedHospital,
            date: selectedDate,
            slot: selectedSlot,
          });
          setShowReceipt(true);
        } else {
          message.success('Appointment booked successfully! Please pay at the counter when you arrive.');
          setTimeout(() => {
            setLocation('/dashboard/patient/appointments');
          }, 1500);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Booking failed:', errorData);
        // Show the actual error message from backend if available
        const errorMessage = errorData.error || errorData.message || 'Failed to book appointment';
        message.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error booking appointment:', error);
      message.error('Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  // Build "For whom" options
  const forWhomOptions: { value: number | null; label: string }[] = [];
  if (myPatientId != null) {
    forWhomOptions.push({ value: myPatientId, label: 'Self' });
  }
  familyMembers.forEach((m: { relatedPatientId: number; relationship: string; fullName: string }) => {
    const label = `${m.relationship.charAt(0).toUpperCase() + m.relationship.slice(1)} (${m.fullName})`;
    forWhomOptions.push({ value: m.relatedPatientId, label });
  });
  
  const [selectedForWhom, setSelectedForWhom] = useState<number | null>(() => {
    // Initialize with current acting patient ID if set
    const actingId = getActingPatientId();
    return actingId ?? (myPatientId || null);
  });
  
  // Helper: check if we have "For whom" step
  const hasForWhomStep = isPatient && forWhomOptions.length > 1;
  // Helper: get base step (0 = hospital, 1 = doctor, 2 = date/time, 3 = details)
  const getBaseStep = (step: number) => hasForWhomStep ? step - 1 : step;
  const baseStep = getBaseStep(currentStep);

  const steps = [
    ...(isPatient && forWhomOptions.length > 1 ? [{
      title: 'For Whom',
      icon: <UserOutlined />,
      content: (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <Text style={{ fontSize: '16px', color: '#6B7280', display: 'block', marginBottom: 24 }}>
            Who is this appointment for?
          </Text>
          <Select
            value={selectedForWhom}
            onChange={(v) => {
              setSelectedForWhom(v);
              setActingPatientId(v);
              // Auto-advance to next step
              setTimeout(() => {
                setCurrentStep(1);
              }, 300);
            }}
            options={forWhomOptions}
            style={{ width: '100%', maxWidth: 400 }}
            size="large"
            placeholder="Select person"
          />
        </div>
      ),
    }] : []),
    {
      title: 'Select Hospital',
      icon: <EnvironmentOutlined />,
      content: (
        <div>
          {/* Search and Filter Section */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} md={8}>
              <Text strong style={{ marginBottom: '8px', display: 'block', fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                Search Hospital
              </Text>
              <Input
                placeholder="Search by hospital name..."
                value={searchTerm}
                onChange={handleSearchChange}
                prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
                allowClear
                style={{ borderRadius: '8px', height: '40px' }}
                size="large"
              />
            </Col>
            <Col xs={24} md={8}>
              <Text strong style={{ marginBottom: '8px', display: 'block', fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                Filter by Specialty
              </Text>
              <Select
                placeholder="All Specialties"
                value={selectedSpecialty || undefined}
                onChange={handleSpecialtyChange}
                style={{ width: '100%', borderRadius: '8px', height: '40px' }}
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
              <Text strong style={{ marginBottom: '8px', display: 'block', fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                Select City
              </Text>
              <Select
                value={selectedCity}
                onChange={handleCityChange}
                style={{ width: '100%', borderRadius: '8px', height: '40px' }}
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
              Showing {filteredHospitals.length} hospital{filteredHospitals.length !== 1 ? 's' : ''} in {selectedCity}
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
                // Hospital status logic:
                // - "Pending" (Yellow): hospital.isVerified === false (not yet verified by admin)
                // - "Available" (Green): hospital.isVerified === true (verified and approved)
                const status = hospital.isVerified ? 'Available' : 'Pending';
                const statusColor = hospital.isVerified ? '#10B981' : '#F59E0B';
                const statusBg = hospital.isVerified ? '#D1FAE5' : '#FEF3C7';
                
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
                          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: 1.4 }}>
                          {hospital.address}, {hospital.city}, {hospital.state}
                          </Text>
                      </div>

                      {/* Established and Total Beds */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CalendarOutlined style={{ color: '#9CA3AF', fontSize: '16px' }} />
                          <Text style={{ fontSize: '14px', color: '#374151' }}>
                            Established {hospital.establishedYear || 'N/A'}
                          </Text>
                          </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <MedicineBoxOutlined style={{ color: '#9CA3AF', fontSize: '16px' }} />
                          <Text style={{ fontSize: '14px', color: '#374151' }}>
                            Total Beds {hospital.totalBeds || 0}
                          </Text>
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
                          <ClockCircleOutlined style={{ color: '#10B981', fontSize: '16px' }} />
                          <Text style={{ fontSize: '14px', color: '#10B981', fontWeight: 600 }}>
                            24/7
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
            <div style={{ 
              maxWidth: '600px', 
              margin: '0 auto', 
              padding: '24px',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              justifyContent: 'center',
            }}>
              {/* Confirm Appointment Title Card */}
              <div style={{ 
                background: '#FFFFFF', 
                borderRadius: 16,
                padding: '20px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                textAlign: 'center',
              }}>
                <Title level={3} style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                  Confirm Appointment
                </Title>
                </div>

              {/* Main Appointment Info - Professional */}
              <div style={{ 
                background: '#FFFFFF', 
                borderRadius: 16, 
                padding: '24px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #E5E7EB' }}>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <Text style={{ fontSize: '20px', fontWeight: 700, color: '#111827', display: 'block', lineHeight: 1.3, marginBottom: 6 }}>
                      {formatTimeSlot12h(selectedSlot).split(' - ')[0]}
                    </Text>
                    <Text style={{ fontSize: '20px', fontWeight: 700, color: '#111827', display: 'block', lineHeight: 1.3 }}>
                      {selectedDate.format('dddd, MMMM D, YYYY').toUpperCase()}
                    </Text>
                  </div>
                  <div style={{ width: '1px', height: '50px', background: '#E5E7EB', margin: '0 16px' }} />
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <Text style={{ fontSize: '16px', fontWeight: 700, color: '#111827', display: 'block', lineHeight: 1.3, marginBottom: 6 }}>
                      {selectedDoctor.fullName}
                    </Text>
                    <Text style={{ fontSize: '16px', fontWeight: 700, color: '#111827', display: 'block', lineHeight: 1.3 }}>
                      {selectedHospital.name.toUpperCase()} | {selectedHospital.city}, {selectedHospital.state}
                    </Text>
                  </div>
                  </div>
                </div>

                {/* Priority Selection */}
              <div style={{ 
                background: '#FFFFFF', 
                borderRadius: 16, 
                padding: '20px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                marginBottom: 16,
              }}>
                <Text strong style={{ fontSize: 14, color: '#111827', marginBottom: 12, display: 'block', textAlign: 'center' }}>Priority</Text>
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  {[
                    { value: 'normal', label: 'Normal', color: '#10B981', bgColor: '#D1FAE5', borderColor: '#10B981' },
                    { value: 'high', label: 'High', color: '#F59E0B', bgColor: '#FEF3C7', borderColor: '#F59E0B' },
                    { value: 'urgent', label: 'Urgent', color: '#EF4444', bgColor: '#FEE2E2', borderColor: '#EF4444' },
                  ].map(option => {
                    const isSelected = selectedPriority === option.value;
                    
                    return (
                      <Button
                        key={option.value}
                        type="default"
                        onClick={() => {
                          setSelectedPriority(option.value);
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
                </div>

              {/* Payment Selection - Professional */}
              <div style={{ 
                background: '#FFFFFF', 
                borderRadius: 16, 
                padding: '20px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                marginBottom: 16,
              }}>
                <Text strong style={{ fontSize: 14, color: '#111827', marginBottom: 12, display: 'block', textAlign: 'center' }}>
                  Payment Method
                  </Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
                  <Button
                    type={selectedPaymentMethod === 'googlepay' ? 'primary' : 'default'}
                    icon={<WalletOutlined />}
                    onClick={() => setSelectedPaymentMethod('googlepay')}
                    style={{
                      height: '48px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    Google Pay
                  </Button>
                  <Button
                    type={selectedPaymentMethod === 'phonepe' ? 'primary' : 'default'}
                    icon={<MobileOutlined />}
                    onClick={() => setSelectedPaymentMethod('phonepe')}
                    style={{
                      height: '48px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    PhonePe
                  </Button>
                  <Button
                    type={selectedPaymentMethod === 'card' ? 'primary' : 'default'}
                    icon={<CreditCardOutlined />}
                    onClick={() => setSelectedPaymentMethod('card')}
                    style={{
                      height: '48px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    Card
                  </Button>
                  <Button
                    type={selectedPaymentMethod === 'cash' ? 'primary' : 'default'}
                    icon={<BankOutlined />}
                    onClick={() => setSelectedPaymentMethod('cash')}
                    style={{
                      height: '48px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    Cash
                  </Button>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  paddingTop: 16, 
                  borderTop: '1px solid #E5E7EB',
                  paddingLeft: 4,
                  paddingRight: 4,
                }}>
                  <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>Consultation Fee</Text>
                  <Text style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                    ₹{typeof selectedDoctor.consultationFee === 'string' 
                      ? parseFloat(selectedDoctor.consultationFee).toFixed(2) 
                      : (Number(selectedDoctor.consultationFee) || 0).toFixed(2)}
                  </Text>
                </div>
              </div>

              {/* Confirm Button */}
              <Button
                type="primary"
                size="large"
                block
                onClick={handleSubmit}
                loading={loading}
                disabled={!selectedPaymentMethod}
                style={{
                  height: '48px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  marginTop: 'auto',
                }}
              >
                {selectedPaymentMethod && ['googlepay', 'phonepe', 'card'].includes(selectedPaymentMethod) 
                  ? 'Pay & Confirm Appointment' 
                  : 'Confirm Appointment'}
              </Button>
                </div>
          ) : (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '60px 20px' }}>
              <Title level={4} style={{ color: '#6B7280', marginBottom: 8 }}>Missing Details</Title>
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
          {/* Hidden form field for priority - updated by color-coded buttons */}
          <Form.Item name="priority" initialValue="normal" style={{ display: 'none' }}>
            <Input />
          </Form.Item>
        </div>
      )
    }
  ];

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
            width={80}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100vh',
              width: 80,
              background: '#fff',
              boxShadow: '0 2px 16px rgba(26, 143, 227, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10,
              borderRight: '1px solid #E5E7EB',
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
            width={80}
          >
            <PatientSidebar selectedMenuKey="appointments" onMenuClick={() => setMobileDrawerOpen(false)} />
          </Drawer>
        )}

        <Layout
          style={{
            marginLeft: isMobile ? 0 : 80,
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
          {(isMobile && (currentStep === 0 || currentStep === 1 || (isPatient && forWhomOptions.length > 1 && currentStep === 0))) && (
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

          {/* Header - For Whom or Select Hospital step */}
          {((isPatient && forWhomOptions.length > 1 && currentStep === 0) || (!isPatient || forWhomOptions.length <= 1) && currentStep === 0) && (
          <div style={{ 
            background: '#F3F4F6', 
            padding: '24px 32px 24px 32px',
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              position: 'relative',
              marginBottom: '24px',
            }}>
              {/* Back Button - Left Aligned */}
              <div style={{ position: 'absolute', left: 0 }}>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => setLocation('/dashboard/patient')}
                  type="text"
                  style={{ 
                    padding: 0, 
                    height: 'auto', 
                    fontSize: '14px', 
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ← Back
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
                <Title level={2} style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                  {steps[currentStep]?.title || 'Select Hospital'}
                </Title>
                <Text style={{ fontSize: '16px', color: '#6B7280', marginTop: '8px' }}>
                  {steps[currentStep]?.title === 'For Whom' 
                    ? 'Who is this appointment for?' 
                    : 'Choose a hospital in your region'}
                </Text>
              </div>
            </div>
          </div>
        )}

          {/* Header - Select Doctor step */}
          {baseStep === 1 && selectedHospital && (
          <div style={{ 
            background: '#F3F4F6', 
            padding: '24px 32px 24px 32px',
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              position: 'relative',
              marginBottom: '24px',
            }}>
              {/* Back Button - Left Aligned */}
              <div style={{ position: 'absolute', left: 0 }}>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={handlePrevious}
                  type="text"
                  style={{ 
                    padding: 0, 
                    height: 'auto', 
                    fontSize: '14px', 
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ← Back
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
                <Title level={2} style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                  Select Doctor
                </Title>
                <Text style={{ fontSize: '16px', color: '#6B7280', marginTop: '8px' }}>
                  {selectedHospital.name}
                </Text>
              </div>
            </div>
          </div>
        )}

      {/* Header - Select Date & Time step */}
      {baseStep === 2 && selectedDoctor && selectedHospital && (
        <div style={{ 
          background: '#F3F4F6', 
          padding: '24px 32px 24px 32px',
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            position: 'relative',
            marginBottom: '24px',
          }}>
            {/* Back Button - Left Aligned */}
            <div style={{ position: 'absolute', left: 0 }}>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={handlePrevious}
                type="text"
                style={{ 
                  padding: 0, 
                  height: 'auto', 
                  fontSize: '14px', 
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ← Back
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
              <Title level={2} style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                Select Date & Time
              </Title>
              <Text style={{ fontSize: '16px', color: '#6B7280', marginTop: '8px' }}>
                {selectedDoctor.fullName} - {selectedHospital.name}
              </Text>
            </div>
          </div>
        </div>
      )}


      {/* Content */}
      <div style={{ 
            padding: (baseStep < 3) ? '0 32px 32px 32px' : '0', 
            width: '100%', 
            height: baseStep === 3 ? '100vh' : 'auto',
            overflow: baseStep === 3 ? 'hidden' : 'auto',
            background: '#F3F4F6',
            position: 'relative',
          }}>
        <Spin spinning={loading} tip={loading ? (baseStep === 0 ? 'Loading hospitals...' : baseStep === 1 ? 'Loading doctors...' : 'Loading...') : undefined}>
          {/* Back Button - Outside card, top left corner for step 3 */}
          {baseStep === 3 && (
            <div style={{ position: 'absolute', top: '16px', left: '24px', zIndex: 10 }}>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={handlePrevious}
                type="text"
                style={{ 
                  padding: 0, 
                  height: 'auto', 
                  fontSize: '14px', 
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ← Back
              </Button>
      </div>
      )}

          {baseStep < 3 ? (
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
            >
              {steps[currentStep]?.content || <div style={{ textAlign: 'center', padding: '40px' }}><Text>Loading...</Text></div>}
            </Form>
          ) : (
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
            >
              {steps[currentStep].content}
            </Form>
          )}
        </Spin>
      </div>
        </Content>
    </Layout>
    </Layout>

    {/* Receipt Modal for Online Payment - Compact */}
    {showReceipt && receiptData && (
      <Modal
        title="Payment Receipt"
        open={showReceipt}
      onCancel={() => {
          setShowReceipt(false);
          setReceiptData(null);
        setLocation('/dashboard/patient/appointments');
      }}
        footer={[
          <Button key="close" type="primary" onClick={() => {
            setShowReceipt(false);
            setReceiptData(null);
            setLocation('/dashboard/patient/appointments');
          }}>
            View My Appointments
          </Button>
        ]}
        width={500}
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }} />
            <Title level={4} style={{ color: '#52c41a', marginBottom: 4, fontSize: '18px' }}>Payment Successful!</Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>Your appointment has been confirmed</Text>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 14, marginBottom: 12, display: 'block' }}>Appointment Details</Text>
            <Row gutter={[12, 8]}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Appointment ID</Text>
                <div style={{ fontWeight: 600, marginTop: 2, fontSize: 13 }}>#{receiptData.appointment.id || receiptData.appointment.appointment?.id}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Date</Text>
                <div style={{ fontWeight: 600, marginTop: 2, fontSize: 13 }}>{receiptData.date.format('DD/MM/YYYY')}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Time</Text>
                <div style={{ fontWeight: 600, marginTop: 2, fontSize: 13 }}>{formatTimeSlot12h(receiptData.slot)}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Doctor</Text>
                <div style={{ fontWeight: 600, marginTop: 2, fontSize: 13 }}>{receiptData.doctor.fullName}</div>
              </Col>
              <Col span={24}>
                <Text type="secondary" style={{ fontSize: 12 }}>Hospital</Text>
                <div style={{ fontWeight: 600, marginTop: 2, fontSize: 13 }}>{receiptData.hospital.name}</div>
              </Col>
            </Row>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <div>
            <Text strong style={{ fontSize: 14, marginBottom: 12, display: 'block' }}>Payment Details</Text>
            <Row gutter={[12, 8]}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Transaction ID</Text>
                <div style={{ fontWeight: 600, marginTop: 2, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {receiptData.payment.transactionId}
                  <CopyIcon text={receiptData.payment.transactionId} label="Transaction ID" size={12} />
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Payment Method</Text>
                <div style={{ fontWeight: 600, marginTop: 2, fontSize: 13 }}>{receiptData.payment.paymentMethod.toUpperCase()}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Amount Paid</Text>
                <div style={{ fontWeight: 600, marginTop: 2, fontSize: 16, color: '#52c41a' }}>
                  ₹{receiptData.payment.amount.toFixed(2)}
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                <div style={{ fontWeight: 600, marginTop: 2, fontSize: 13, color: '#52c41a' }}>Paid</div>
              </Col>
            </Row>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}
