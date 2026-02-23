import { useState, useEffect, useMemo } from "react";
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Typography,
  Input,
  Select,
  Modal,
  message,
  Empty,
  Drawer,
  Spin,
  Form,
  DatePicker
} from 'antd';
import { 
  CalendarOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  MenuUnfoldOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  HeartOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Popconfirm } from 'antd';
import { PatientSidebar } from '../../components/layout/PatientSidebar';
import { TopHeader } from '../../components/layout/TopHeader';
import { useResponsive } from '../../hooks/use-responsive';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '../../lib/utils';
import { formatTimeSlot12h, parseTimeTo24h } from '../../lib/time';
import { subscribeToAppointmentEvents } from '../../lib/appointments-events';
import { playNotificationSound } from '../../lib/notification-sounds';
import dayjs from 'dayjs';
import { getISTNow, getISTStartOfDay, isSameDayIST, toIST } from '../../lib/timezone';
import { PrescriptionPreview } from '../../components/prescription/PrescriptionPreview';
import LabReportViewerModal from '../../components/modals/lab-report-viewer-modal';
import BookAppointmentModal from '../../components/modals/BookAppointmentModal';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

interface Appointment {
  id: number;
  doctorName: string;
  doctorSpecialty: string;
  hospitalName: string;
  appointmentDate: string;
  appointmentTime: string;
  timeSlot: string;
  reason: string;
  status: string;
  displayStatus?: string;
  rescheduledAt?: string | null;
  rescheduledFromDate?: string | null;
  rescheduledFromTimeSlot?: string | null;
  rescheduleReason?: string | null;
  type: string;
  priority: string;
  symptoms: string;
  notes: string;
  tokenNumber?: number | null;
  checkedInAt?: string | null;
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export default function PatientAppointments() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isMobile, isTablet } = useResponsive();
  
  // Get notifications for TopHeader
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications/me'],
    queryFn: async () => {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/notifications/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 15000,
  });
  
  const siderWidth = isMobile ? 0 : 80; // Narrow sidebar width matching PatientSidebar
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptionsByAppointment, setPrescriptionsByAppointment] = useState<Record<number, any>>({});
  const [labReportsByAppointment, setLabReportsByAppointment] = useState<Record<number, any[]>>({});
  const [vitalsByAppointment, setVitalsByAppointment] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [selectedLabReport, setSelectedLabReport] = useState<any | null>(null);
  const [selectedVitals, setSelectedVitals] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isLabReportModalOpen, setIsLabReportModalOpen] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  
  // Reschedule request state
  const [isRescheduleRequestModalOpen, setIsRescheduleRequestModalOpen] = useState(false);
  const [appointmentForReschedule, setAppointmentForReschedule] = useState<Appointment | null>(null);
  const [rescheduleRequestForm] = Form.useForm();
  const [rescheduleRequestSelectedDate, setRescheduleRequestSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [rescheduleRequestAvailableSlots, setRescheduleRequestAvailableSlots] = useState<string[]>([]);
  const [rescheduleRequestSlotBookings, setRescheduleRequestSlotBookings] = useState<Record<string, number>>({});
  const [isSubmittingRescheduleRequest, setIsSubmittingRescheduleRequest] = useState(false);
  const [bookAppointmentModalOpen, setBookAppointmentModalOpen] = useState(false);
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);

  const parseLocalDateTime = (dateStr?: string, timeStr?: string): Date | null => {
    if (!dateStr) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!m) {
      const d = new Date(dateStr);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    if (!timeStr) return new Date(y, mo - 1, da);

    const t = String(timeStr).trim();
    // Accept "HH:mm", "HH:mm:ss", "hh:mm AM/PM"
    const ampm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])$/.exec(t);
    if (ampm) {
      let hh = Number(ampm[1]);
      const mm = Number(ampm[2]);
      const ap = ampm[4].toUpperCase();
      if (ap === 'PM' && hh < 12) hh += 12;
      if (ap === 'AM' && hh === 12) hh = 0;
      return new Date(y, mo - 1, da, hh, mm, 0, 0);
    }
    const hm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t);
    if (hm) {
      const hh = Number(hm[1]);
      const mm = Number(hm[2]);
      const ss = hm[3] ? Number(hm[3]) : 0;
      return new Date(y, mo - 1, da, hh, mm, ss, 0);
    }

    // Fallback: date only
    return new Date(y, mo - 1, da);
  };

  /**
   * Calculate appointment slot end time from date and time slot string
   * Time slot can be:
   * - "02:00-02:30" (range) - use the end time (legacy: "02:00" means 2 PM)
   * - "02:00 PM" (single time) - assume 30 minutes duration
   * - "14:00" (24-hour format) - assume 30 minutes duration
   */
  const getSlotEndTime = (dateStr: string, timeSlot: string): Date | null => {
    if (!dateStr || !timeSlot) return null;
    
    // Parse date
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!dateMatch) return null;
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]) - 1; // 0-indexed
    const day = Number(dateMatch[3]);
    
    const slot = timeSlot.trim();
    
    // Check if it's a range like "02:00-02:30"
    if (slot.includes('-')) {
      const parts = slot.split('-').map(s => s.trim());
      if (parts.length === 2) {
        const endTimeStr = parts[1];
        // Use parseTimeTo24h to handle legacy convention properly
        const parsedEnd = parseTimeTo24h(endTimeStr);
        if (parsedEnd) {
          const endDate = new Date(year, month, day, parsedEnd.hours24, parsedEnd.minutes, 0, 0);
          return endDate;
        }
      }
    }
    
    // Single time - parse and add 30 minutes duration
    const parsedStart = parseTimeTo24h(slot);
    if (!parsedStart) return null;
    
    const startDate = new Date(year, month, day, parsedStart.hours24, parsedStart.minutes, 0, 0);
    
    // Add 30 minutes for default slot duration
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30);
    return endDate;
  };

  // Load appointments from API
  const loadAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/appointments/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      // Also load patient prescriptions, lab reports, and vitals
      const [rxResponse, labReportsResponse, vitalsResponse] = await Promise.all([
        fetch('/api/prescriptions/patient', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/labs/patient/reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/clinical/vitals', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (response.ok) {
        const data = await response.json();
        const rxData = rxResponse.ok ? await rxResponse.json() : [];
        const labReportsData = labReportsResponse.ok ? await labReportsResponse.json() : [];
        const vitalsData = vitalsResponse.ok ? await vitalsResponse.json() : [];

        // Map prescriptions by appointment
        const rxByAppointment: Record<number, boolean> = {};
        const rxMap: Record<number, any> = {};
        (rxData || []).forEach((rx: any) => {
          const aptId = rx.appointmentId || rx.appointment_id;
          if (aptId) {
            rxByAppointment[aptId] = true;
            rxMap[aptId] = rx;
          }
        });
        setPrescriptionsByAppointment(rxMap);

        // Map lab reports by appointment (via lab orders)
        // First, fetch lab orders for the patient to link reports to appointments
        const labReportsMap: Record<number, any[]> = {};
        try {
          // Get patient ID from user
          const patientRes = await fetch('/api/patients/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (patientRes.ok) {
            const patientData = await patientRes.json();
            const patientId = patientData?.id;
            
            if (patientId) {
              // Fetch all lab orders for this patient
              const ordersRes = await fetch(`/api/lab-workflow/orders?patientId=${patientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (ordersRes.ok) {
                const orders = await ordersRes.json();
                // Create a map: appointmentId -> orderIds
                const appointmentToOrderIds: Record<number, number[]> = {};
                (orders || []).forEach((order: any) => {
                  if (order.appointmentId) {
                    if (!appointmentToOrderIds[order.appointmentId]) {
                      appointmentToOrderIds[order.appointmentId] = [];
                    }
                    appointmentToOrderIds[order.appointmentId].push(order.id);
                  }
                });
                
                // Map reports to appointments via order IDs
                Object.keys(appointmentToOrderIds).forEach((aptIdStr) => {
                  const aptId = Number(aptIdStr);
                  const orderIds = appointmentToOrderIds[aptId];
                  const reportsForAppointment = (labReportsData || []).filter((report: any) =>
                    orderIds.includes(report.labOrderId)
                  );
                  if (reportsForAppointment.length > 0) {
                    labReportsMap[aptId] = reportsForAppointment;
                  }
                });
              }
            }
          }
        } catch (e) {
          console.warn('Failed to map lab reports to appointments:', e);
        }
        setLabReportsByAppointment(labReportsMap);

        // Map vitals by appointment
        const vitalsMap: Record<number, any[]> = {};
        (vitalsData || []).forEach((vital: any) => {
          const aptId = vital.appointmentId || vital.appointment_id;
          if (aptId) {
            if (!vitalsMap[aptId]) vitalsMap[aptId] = [];
            vitalsMap[aptId].push(vital);
          }
        });
        setVitalsByAppointment(vitalsMap);

        // Transform API data to match our interface and derive status
        const nowIST = getISTNow();
        const transformedData = data.map((apt: any) => {
          const appointmentDateRaw = apt.appointmentDate || apt.date || '';
          const appointmentTimeRaw = apt.appointmentTime || apt.time || apt.timeSlot || '';
          const startLocal = parseLocalDateTime(appointmentDateRaw, appointmentTimeRaw);
          const startIST = toIST(startLocal);

          const hasPrescription = !!(rxByAppointment[apt.id]);
          const baseStatus = (apt.status || 'pending').toLowerCase();
          const hasTokenOrCheckin = !!(apt.tokenNumber ?? null) || !!apt.checkedInAt;

          // Status shown to patient (never override backend status with "upcoming")
          // - Keep backend status as truth (pending/confirmed/checked-in/in_consultation/completed/cancelled)
          // - Compute "absent" only if time has passed AND appointment was never checked-in/consulted/completed/cancelled
          let displayStatus = baseStatus;
          if (baseStatus === 'cancelled') {
            displayStatus = 'cancelled';
          } else if (hasPrescription || baseStatus === 'completed') {
            displayStatus = 'completed';
          } else if (baseStatus === 'in_consultation') {
            displayStatus = 'in_consultation';
          } else if (baseStatus === 'checked-in' || baseStatus === 'attended' || hasTokenOrCheckin) {
            displayStatus = 'checked-in';
          } else if ((baseStatus === 'pending' || baseStatus === 'confirmed') && startIST && startIST < nowIST) {
            displayStatus = 'absent';
          } else {
            displayStatus = baseStatus;
          }

          return {
            id: apt.id,
            doctorName: apt.doctor?.fullName || apt.doctorName || 'Unknown Doctor',
            doctorSpecialty: apt.doctor?.specialty || apt.doctorSpecialty || 'General',
            hospitalName: apt.hospital?.name || apt.hospitalName || 'Unknown Hospital',
            appointmentDate: appointmentDateRaw,
            appointmentTime: appointmentTimeRaw,
            timeSlot: apt.timeSlot || apt.appointmentTime || '',
            reason: apt.reason || 'Consultation',
            status: baseStatus,
            displayStatus,
            rescheduledAt: apt.rescheduledAt ?? null,
            rescheduledFromDate: apt.rescheduledFromDate ?? null,
            rescheduledFromTimeSlot: apt.rescheduledFromTimeSlot ?? null,
            rescheduleReason: apt.rescheduleReason ?? null,
            type: apt.type || 'online',
            priority: apt.priority || 'normal',
            symptoms: apt.symptoms || '',
            notes: apt.notes || '',
            tokenNumber: apt.tokenNumber ?? null,
            checkedInAt: apt.checkedInAt ?? null,
            createdAt: apt.createdAt || '',
            confirmedAt: apt.confirmedAt,
            completedAt: apt.completedAt,
            cancelledAt: apt.cancelledAt,
            hasPrescription,
          };
        });
        setAppointments(transformedData);
      } else {
        console.error('Failed to load appointments');
        message.error('Failed to load appointments');
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      message.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadRescheduleRequests();
  }, []);

  // Load reschedule requests for patient
  const loadRescheduleRequests = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/appointments/reschedule-requests/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRescheduleRequests(data || []);
      }
    } catch (error) {
      console.error('Error loading reschedule requests:', error);
    }
  };

  // Fetch doctor slots for reschedule request
  const fetchDoctorSlotsForReschedule = async (doctorId: number, date: string) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/appointments/doctor/${doctorId}/date/${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return [];
      const appointments = await response.json();
      const appointmentsList = Array.isArray(appointments) ? appointments : [];
      
      // Get doctor details to get available slots
      const doctorResponse = await fetch(`/api/doctors/${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!doctorResponse.ok) return [];
      const doctor = await doctorResponse.json();
      
      // Get available slots from doctor
      const getDoctorSlots = (doc: any): string[] => {
        if (doc.availableSlots) {
          try {
            const slots = typeof doc.availableSlots === 'string' 
              ? JSON.parse(doc.availableSlots) 
              : doc.availableSlots;
            return Array.isArray(slots) ? slots : [];
          } catch {
            return [];
          }
        }
        return [];
      };
      
      const allSlots = getDoctorSlots(doctor);
      
      // Count bookings per slot
      const bookings: Record<string, number> = {};
      appointmentsList.forEach((apt: any) => {
        const slot = apt.timeSlot || apt.appointmentTime;
        if (slot) {
          const normalizedSlot = slot.trim();
          bookings[normalizedSlot] = (bookings[normalizedSlot] || 0) + 1;
        }
      });
      
      // Filter out past slots and fully booked slots (max 5 per slot)
      const now = dayjs();
      const filteredSlots = allSlots.filter((slot: string) => {
        const slotTime = parseTimeTo24h(slot);
        if (!slotTime) return false;
        const slotDateTime = rescheduleRequestSelectedDate?.hour(slotTime.hours24).minute(slotTime.minutes);
        if (slotDateTime && slotDateTime.isBefore(now)) return false;
        const bookingCount = bookings[slot] || 0;
        return bookingCount < 5; // Max 5 patients per slot
      });
      
      setRescheduleRequestAvailableSlots(filteredSlots);
      setRescheduleRequestSlotBookings(bookings);
      return filteredSlots;
    } catch (error) {
      console.error('Error fetching doctor slots:', error);
      setRescheduleRequestAvailableSlots([]);
      setRescheduleRequestSlotBookings({});
      return [];
    }
  };

  // Handle reschedule request date change
  const handleRescheduleRequestDateChange = async (date: dayjs.Dayjs | null) => {
    setRescheduleRequestSelectedDate(date);
    if (date && appointmentForReschedule) {
      // Extract doctor ID from appointment (we'll need to fetch it)
      const appointment = appointments.find(a => a.id === appointmentForReschedule.id);
      if (appointment) {
        // We need doctor ID - fetch appointment details
        const token = localStorage.getItem('auth-token');
        try {
          const response = await fetch(`/api/appointments/${appointment.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const aptData = await response.json();
            const doctorId = aptData.doctorId || aptData.doctor?.id;
            if (doctorId) {
              const dateStr = date.format('YYYY-MM-DD');
              await fetchDoctorSlotsForReschedule(doctorId, dateStr);
            }
          }
        } catch (error) {
          console.error('Error fetching appointment details:', error);
        }
      }
    } else {
      setRescheduleRequestAvailableSlots([]);
      setRescheduleRequestSlotBookings({});
    }
  };

  // Open reschedule request modal
  const openRescheduleRequestModal = async (appointment: Appointment) => {
    // Check if appointment is eligible for reschedule
    const status = appointment.status?.toLowerCase() || '';
    if (status === 'cancelled' || status === 'completed' || status === 'in_consultation') {
      message.warning('This appointment cannot be rescheduled');
      return;
    }

    // Check if appointment is in the past
    const appointmentDate = appointment.appointmentDate 
      ? (typeof appointment.appointmentDate === 'string' 
          ? dayjs(appointment.appointmentDate) 
          : dayjs(new Date(appointment.appointmentDate)))
      : null;
    
    if (appointmentDate && appointmentDate.isBefore(dayjs())) {
      message.warning('Cannot reschedule past appointments');
      return;
    }

    // Check if there's already a pending reschedule request
    const existingRequest = rescheduleRequests.find(
      (req: any) => req.appointmentId === appointment.id && req.status === 'requested'
    );
    if (existingRequest) {
      message.info('You already have a pending reschedule request for this appointment');
      return;
    }

    setAppointmentForReschedule(appointment);
    rescheduleRequestForm.resetFields();
    setRescheduleRequestSelectedDate(null);
    setRescheduleRequestAvailableSlots([]);
    setRescheduleRequestSlotBookings({});
    setIsRescheduleRequestModalOpen(true);
  };

  // Handle reschedule request submission
  const handleRescheduleRequestSubmit = async (values: any) => {
    if (!appointmentForReschedule) return;
    
    try {
      setIsSubmittingRescheduleRequest(true);
      const token = localStorage.getItem('auth-token');
      const dateStr = values.appointmentDate?.format ? values.appointmentDate.format('YYYY-MM-DD') : dayjs(values.appointmentDate).format('YYYY-MM-DD');
      const timeSlot = values.timeSlot;

      if (!dateStr || !timeSlot) {
        message.error('Please select a date and time slot');
        return;
      }

      const response = await fetch(`/api/appointments/${appointmentForReschedule.id}/reschedule-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newDate: dateStr,
          newTimeSlot: timeSlot,
          reasonNote: values.reasonNote || 'Patient requested reschedule',
        }),
      });

      if (response.ok) {
        message.success('Reschedule request submitted successfully. Receptionist will review and notify you.');
        playNotificationSound('confirmation');
        setIsRescheduleRequestModalOpen(false);
        setAppointmentForReschedule(null);
        rescheduleRequestForm.resetFields();
        await loadRescheduleRequests();
        await loadAppointments();
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to submit reschedule request');
      }
    } catch (error: any) {
      console.error('Error submitting reschedule request:', error);
      message.error(error.message || 'Failed to submit reschedule request');
    } finally {
      setIsSubmittingRescheduleRequest(false);
    }
  };

  // Real-time: server pushes appointment updates (no polling).
  useEffect(() => {
    const unsubscribe = subscribeToAppointmentEvents({
      onEvent: () => loadAppointments(),
    });
    return unsubscribe;
  }, []);

  // Listen for appointment updates from other tabs/windows (e.g., when receptionist confirms)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appointment-updated') {
        loadAppointments();
      }
    };
    
    // Also listen for custom events (same-window updates)
    const handleCustomEvent = () => {
      loadAppointments();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('appointment-updated', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('appointment-updated', handleCustomEvent);
    };
  }, []);

  // Categorize appointments into upcoming and past
  // Logic: Show in "Upcoming" if appointment_slot_end_time >= current_time, else "Past"
  const categorizedAppointments = useMemo(() => {
    const nowIST = getISTNow();
    
    const upcoming: Appointment[] = [];
    const past: Appointment[] = [];
    
    appointments.forEach(appointment => {
      const matchesFilter = filter === 'all' || appointment.status.toLowerCase() === filter.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        appointment.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.reason.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesFilter || !matchesSearch) return;
      
      // Get appointment slot end time
      // Normalize date to YYYY-MM-DD for parsing (slice if full ISO string)
      const rawDate = appointment.appointmentDate || '';
      const appointmentDateRaw = rawDate.includes('T') ? rawDate.slice(0, 10) : rawDate;
      const appointmentTimeRaw = appointment.appointmentTime || appointment.timeSlot || '';
      
      if (!appointmentDateRaw || !appointmentTimeRaw) {
        // No date/time: fall back to status
        const displayStatus = (appointment.displayStatus || appointment.status || '').toLowerCase();
        const isFinishedStatus = displayStatus === 'completed' || displayStatus === 'cancelled' || displayStatus === 'absent';
        if (isFinishedStatus) past.push(appointment);
        else upcoming.push(appointment);
        return;
      }
      
      // Calculate slot end time
      const slotEndTimeLocal = getSlotEndTime(appointmentDateRaw, appointmentTimeRaw);
      if (!slotEndTimeLocal) {
        // Could not parse time: fall back to status
        const displayStatus = (appointment.displayStatus || appointment.status || '').toLowerCase();
        const isFinishedStatus = displayStatus === 'completed' || displayStatus === 'cancelled' || displayStatus === 'absent';
        if (isFinishedStatus) past.push(appointment);
        else upcoming.push(appointment);
        return;
      }
      
      // Convert to IST
      const slotEndTimeIST = toIST(slotEndTimeLocal);
      if (!slotEndTimeIST) {
        // Could not convert to IST: fall back to status
        const displayStatus = (appointment.displayStatus || appointment.status || '').toLowerCase();
        const isFinishedStatus = displayStatus === 'completed' || displayStatus === 'cancelled' || displayStatus === 'absent';
        if (isFinishedStatus) past.push(appointment);
        else upcoming.push(appointment);
        return;
      }
      
      // Categorize based on slot end time: if slot_end_time >= current_time, it's upcoming
      if (slotEndTimeIST.getTime() >= nowIST.getTime()) {
        upcoming.push(appointment);
      } else {
        past.push(appointment);
      }
    });
    
    // Sort upcoming by date (earliest first)
    upcoming.sort((a, b) => {
      const aStart = toIST(parseLocalDateTime(a.appointmentDate, a.appointmentTime || a.timeSlot));
      const bStart = toIST(parseLocalDateTime(b.appointmentDate, b.appointmentTime || b.timeSlot));
      return (aStart?.getTime() ?? 0) - (bStart?.getTime() ?? 0);
    });
    
    // Sort past by date (most recent first)
    past.sort((a, b) => {
      const aStart = toIST(parseLocalDateTime(a.appointmentDate, a.appointmentTime || a.timeSlot));
      const bStart = toIST(parseLocalDateTime(b.appointmentDate, b.appointmentTime || b.timeSlot));
      return (bStart?.getTime() ?? 0) - (aStart?.getTime() ?? 0);
    });
    
    return { upcoming, past };
  }, [appointments, filter, searchTerm]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      const matchesFilter = filter === 'all' || appointment.status.toLowerCase() === filter.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        appointment.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.reason.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [appointments, filter, searchTerm]);

  const stats = useMemo(() => ({
    total: appointments.length,
    upcoming: categorizedAppointments.upcoming.length,
    completed: appointments.filter(a => (a.displayStatus || a.status || '').toLowerCase() === 'completed').length,
    cancelled: appointments.filter(a => (a.displayStatus || a.status || '').toLowerCase() === 'cancelled').length,
  }), [appointments, categorizedAppointments.upcoming.length]);

  // Extract cancellation reason from notes
  const getCancellationReason = (notes: string): string | null => {
    if (!notes) return null;
    const match = notes.match(/Cancellation Reason:\s*(.+?)(?:\n|$)/i);
    return match ? match[1].trim() : null;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'green';
      case 'pending': return 'orange';
      case 'checked-in': return 'blue';
      case 'completed': return 'blue';
      case 'absent': return 'red';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const handleViewPrescription = () => {
    if (!selectedAppointment) return;
    const rx = prescriptionsByAppointment[selectedAppointment.id];
    if (rx) {
      setSelectedPrescription(rx);
      setIsPrescriptionModalOpen(true);
    }
  };

  const renderMedications = (rx: any) => {
    if (!rx?.medications) return null;
    let meds: any[] = [];
    try {
      meds = JSON.parse(rx.medications);
    } catch (e) {
      return <Text>{rx.medications}</Text>;
    }
    if (!Array.isArray(meds)) return <Text>{rx.medications}</Text>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {meds.map((m, idx) => (
          <div key={idx} style={{ padding: 8, background: '#f5f5f5', borderRadius: 8 }}>
            <div><Text strong>Name: </Text>{m.name}</div>
            <div><Text strong>Dosage: </Text>{m.dosage} {m.unit}</div>
            <div><Text strong>Frequency: </Text>{m.frequency}</div>
            <div><Text strong>Timing: </Text>{m.timing}</div>
            <div><Text strong>Duration: </Text>{m.duration}</div>
            {m.instructions && <div><Text strong>Instructions: </Text>{m.instructions}</div>}
          </div>
        ))}
      </div>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'normal': return 'green';
      default: return 'default';
    }
  };

  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsViewModalOpen(true);
  };

  const handleCancelAppointment = async (appointmentId: number, appointment?: Appointment) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        playNotificationSound('cancellation');
        
        // Show appropriate message based on refund info
        if (result.refundInfo) {
          if (result.isConfirmed) {
            // After confirmation: 10% fee, 90% refund
            message.success(
              `Appointment cancelled successfully. A 10% cancellation fee (₹${result.refundInfo.cancellationFee}) has been deducted. ₹${result.refundInfo.refundAmount} will be refunded to your account.`,
              8
            );
          } else {
            // Before confirmation: full refund
            message.success(
              `Appointment cancelled successfully. Full refund of ₹${result.refundInfo.refundAmount} will be processed.`,
              8
            );
          }
        } else {
          message.success('Appointment cancelled successfully');
        }
        
        loadAppointments();
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      message.error('Failed to cancel appointment');
    }
  };

  const columns = [
    {
      title: '#',
      key: 'serial',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <Text type="secondary" style={{ fontWeight: 500 }}>{index + 1}</Text>
      ),
    },
    {
      title: 'Doctor',
      dataIndex: 'doctorName',
      key: 'doctorName',
      render: (text: string, record: Appointment) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.doctorSpecialty}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Hospital',
      dataIndex: 'hospitalName',
      key: 'hospitalName',
    },
    {
      title: 'Date & Time',
      key: 'datetime',
      render: (record: Appointment) => {
        // Format the date properly
        const formattedDate = record.appointmentDate 
          ? (typeof record.appointmentDate === 'string' && record.appointmentDate.includes('T') 
              ? formatDate(record.appointmentDate) 
              : formatDate(new Date(record.appointmentDate)))
          : 'Date unavailable';
        
        return (
          <Space direction="vertical" size={0}>
            <Text>{formattedDate}</Text>
            <Text type="secondary">
              {record.appointmentTime || record.timeSlot ? formatTimeSlot12h(record.appointmentTime || record.timeSlot) : 'Time TBD'}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Token',
      dataIndex: 'tokenDisplay',
      key: 'tokenDisplay',
      width: 80,
      align: 'center' as const,
      render: (tokenDisplay: string | number | null | undefined) => (
        tokenDisplay != null && tokenDisplay !== '' ? <Text strong>{String(tokenDisplay)}</Text> : <Text type="secondary">-</Text>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Appointment) => {
        const effectiveStatus = (record.displayStatus || status || '').toLowerCase();
        const isCancelled = effectiveStatus === 'cancelled';
        const cancellationReason = isCancelled ? getCancellationReason(record.notes) : null;
        
        // Check for reschedule request status
        const rescheduleRequest = rescheduleRequests.find(
          (req: any) => req.appointmentId === record.id
        );
        
        return (
          <Space direction="vertical" size={0}>
            <Tag color={getStatusColor(effectiveStatus)}>
              {effectiveStatus.toUpperCase()}
            </Tag>
            {rescheduleRequest && (
              <Tag 
                color={
                  rescheduleRequest.status === 'requested' ? 'orange' :
                  rescheduleRequest.status === 'approved' ? 'green' :
                  rescheduleRequest.status === 'rejected' ? 'red' : 'default'
                }
                style={{ marginTop: '4px' }}
              >
                Reschedule: {rescheduleRequest.status}
              </Tag>
            )}
            {isCancelled && cancellationReason && (
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '4px', fontStyle: 'italic' }}>
                Reason: {cancellationReason}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {priority || 'Normal'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Appointment) => {
        // Determine if this appointment is already in the past based on slot end time (IST)
        const nowIST = getISTNow();
        const rawDate = record.appointmentDate || '';
        const dateStr = rawDate.includes('T') ? rawDate.slice(0, 10) : rawDate;
        const timeStr = record.appointmentTime || record.timeSlot || '';

        let isPastByTime = false;
        if (dateStr && timeStr) {
          const slotEndLocal = getSlotEndTime(dateStr, timeStr);
          const slotEndIST = toIST(slotEndLocal);
          if (slotEndIST) {
            isPastByTime = slotEndIST.getTime() < nowIST.getTime();
          }
        }

        const canModify =
          !isPastByTime &&
          (record.status === 'pending' || record.status === 'confirmed');

        // For past appointments, show prescription/lab/vitals icons if available
        const hasPrescription = !!prescriptionsByAppointment[record.id];
        const hasLabReports = (labReportsByAppointment[record.id] || []).length > 0;
        const hasVitals = (vitalsByAppointment[record.id] || []).length > 0;

        return (
          <Space>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewAppointment(record)}
            >
              View
            </Button>
            {canModify ? (
              <>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => openRescheduleRequestModal(record)}
                >
                  Reschedule
                </Button>
                <Popconfirm
                  title="Cancel Appointment"
                  description={
                    record.confirmedAt
                      ? "This appointment has been confirmed. A 10% cancellation fee will be deducted, and 90% of the booking amount will be refunded. Are you sure you want to cancel?"
                      : "This appointment has not been confirmed yet. You will receive a full refund. Are you sure you want to cancel?"
                  }
                  onConfirm={() => handleCancelAppointment(record.id, record)}
                  okText="Yes, Cancel"
                  cancelText="No"
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>
                    Cancel
                  </Button>
                </Popconfirm>
              </>
            ) : (
              // Past appointments: show prescription/lab/vitals icons
              <>
                {hasPrescription && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<MedicineBoxOutlined />}
                    onClick={() => {
                      setSelectedAppointment(record);
                      handleViewPrescription();
                    }}
                    title="View Prescription"
                  />
                )}
                {hasLabReports && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<ExperimentOutlined />}
                    onClick={() => {
                      const reports = labReportsByAppointment[record.id];
                      if (reports && reports.length > 0) {
                        setSelectedLabReport(reports[0]); // Show first report, or could show list
                        setIsLabReportModalOpen(true);
                      }
                    }}
                    title={`View Lab Reports (${labReportsByAppointment[record.id].length})`}
                  />
                )}
                {hasVitals && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<HeartOutlined />}
                    onClick={() => {
                      const vitals = vitalsByAppointment[record.id];
                      if (vitals && vitals.length > 0) {
                        setSelectedVitals(vitals[0]); // Show first vital entry, or could show list
                        setIsVitalsModalOpen(true);
                      }
                    }}
                    title={`View Vitals (${vitalsByAppointment[record.id].length})`}
                  />
                )}
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <style>{`
        /* Override medical-container padding for appointments page */
        body:has(.patient-appointments-wrapper) .medical-container {
          padding: 0 !important;
          display: block !important;
          align-items: unset !important;
          justify-content: unset !important;
          background: transparent !important;
        }
        /* Allow scrolling on appointments page */
        body:has(.patient-appointments-wrapper) {
          overflow: auto !important;
          overflow-x: hidden !important;
        }
        html:has(.patient-appointments-wrapper) {
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
      <Layout style={{ minHeight: '100vh', background: '#F3F4F6' }} className="patient-appointments-wrapper">
        {/* Desktop/Tablet Sidebar */}
        {!isMobile && (
          <Sider
            width={80}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100vh',
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
            width={260}
          >
            <PatientSidebar selectedMenuKey="appointments" onMenuClick={() => setMobileDrawerOpen(false)} />
          </Drawer>
        )}

        <Layout
          style={{
            marginLeft: siderWidth,
            minHeight: '100vh',
            background: '#F7FBFF',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
          }}
        >
          {/* TopHeader - Matching Patient Dashboard Design */}
          <TopHeader
            userName={user?.fullName || 'User'}
            userRole="Patient"
            userId={(() => {
              if (user?.id) {
                const year = new Date().getFullYear();
                const idNum = String(user.id).padStart(3, '0');
                return `PAT-${year}-${idNum}`;
              }
              return 'PAT-2024-001';
            })()}
            userInitials={(() => {
              if (user?.fullName) {
                const names = user.fullName.split(' ');
                if (names.length >= 2) {
                  return `${names[0][0]}${names[1][0]}`.toUpperCase();
                }
                return user.fullName.substring(0, 2).toUpperCase();
              }
              return 'UP';
            })()}
            notificationCount={notifications.filter((n: any) => !n.isRead).length}
          />

          <Content
            style={{
              background: '#F7FBFF',
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              minHeight: 0,
              // Responsive padding - reduced to save side space
              padding: isMobile 
                ? '12px 12px 16px'
                : isTablet 
                  ? '12px 16px 20px'
                  : '12px 16px 20px',
              margin: 0,
              width: '100%',
            }}
          >
            {/* Mobile Menu Button */}
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 16 }}>
                <Button
                  type="text"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setMobileDrawerOpen(true)}
                  style={{ fontSize: '18px' }}
                />
              </div>
            )}

            {/* Content */}
            <div style={{ paddingBottom: 24 }}>
              {/* KPI Cards */}
              <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={6}>
                  <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                    <Space>
                      <CalendarOutlined style={{ fontSize: '24px', color: '#1A8FE3' }} />
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Total Appointments</Text>
                        <Text strong style={{ fontSize: '24px', color: '#111827' }}>{stats.total}</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                    <Space>
                      <ClockCircleOutlined style={{ fontSize: '24px', color: '#10B981' }} />
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Upcoming</Text>
                        <Text strong style={{ fontSize: '24px', color: '#111827' }}>{stats.upcoming}</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                    <Space>
                      <CheckCircleOutlined style={{ fontSize: '24px', color: '#F59E0B' }} />
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Completed</Text>
                        <Text strong style={{ fontSize: '24px', color: '#111827' }}>{stats.completed}</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                    <Space>
                      <DeleteOutlined style={{ fontSize: '24px', color: '#EF4444' }} />
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Cancelled</Text>
                        <Text strong style={{ fontSize: '24px', color: '#111827' }}>{stats.cancelled}</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              </Row>

              {/* Search and Filter Bar */}
              <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
                <Row gutter={[16, 16]} align="middle">
                  <Col xs={24} sm={12} md={8}>
                    <Input
                      placeholder="Search appointments..."
                      prefix={<SearchOutlined />}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      size="large"
                      style={{ borderRadius: '8px' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Select
                      value={filter}
                      onChange={setFilter}
                      style={{ width: '100%', borderRadius: '8px' }}
                      suffixIcon={<ArrowRightOutlined style={{ transform: 'rotate(90deg)', color: '#9CA3AF' }} />}
                      size="large"
                    >
                      <Option value="all">All Appointments</Option>
                      <Option value="confirmed">Confirmed</Option>
                      <Option value="pending">Pending</Option>
                      <Option value="completed">Completed</Option>
                      <Option value="cancelled">Cancelled</Option>
                    </Select>
                  </Col>
                  <Col xs={24} sm={24} md={8}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setBookAppointmentModalOpen(true)}
                      size="large"
                      style={{ width: '100%', borderRadius: '8px' }}
                    >
                      + Book New Appointment
                    </Button>
                  </Col>
                </Row>
              </Card>

              {/* Upcoming Appointments Section */}
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ClockCircleOutlined style={{ color: '#10B981', fontSize: '20px' }} />
                    <Title level={4} style={{ margin: 0, color: '#10B981' }}>
                      Upcoming Appointments
                    </Title>
                    <Tag color="green" style={{ marginLeft: '8px' }}>
                      {categorizedAppointments.upcoming.length}
                    </Tag>
                  </div>
                }
                style={{ 
                  borderRadius: '12px',
                  marginBottom: '24px',
                  border: '1px solid #D1FAE5'
                }}
              >
                <Spin spinning={loading}>
                  {categorizedAppointments.upcoming.length > 0 ? (
                    <Table
                      columns={columns}
                      dataSource={categorizedAppointments.upcoming}
                      rowKey="id"
                      loading={loading}
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                          `${range[0]}-${range[1]} of ${total} upcoming appointments`,
                      }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No upcoming appointments"
                          />
                        )
                      }}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No upcoming appointments"
                    />
                  )}
                </Spin>
              </Card>

              {/* Past Appointments Section */}
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircleOutlined style={{ color: '#6B7280', fontSize: '20px' }} />
                    <Title level={4} style={{ margin: 0, color: '#6B7280' }}>
                      Past Appointments
                    </Title>
                    <Tag color="default" style={{ marginLeft: '8px' }}>
                      {categorizedAppointments.past.length}
                    </Tag>
                  </div>
                }
                style={{ 
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB'
                }}
              >
                <Spin spinning={loading}>
                  {categorizedAppointments.past.length > 0 ? (
                    <Table
                      columns={columns}
                      dataSource={categorizedAppointments.past}
                      rowKey="id"
                      loading={loading}
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                          `${range[0]}-${range[1]} of ${total} past appointments`,
                      }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No past appointments"
                          />
                        )
                      }}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No past appointments"
                    />
                  )}
                </Spin>
              </Card>
            </div>
          </Content>
        </Layout>
      </Layout>

      {/* View Appointment Modal */}
      <Modal
        title="Appointment Details"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={[
          selectedAppointment && prescriptionsByAppointment[selectedAppointment.id] && (
            <Button key="view-rx" type="primary" onClick={handleViewPrescription}>
              View Prescription
            </Button>
          ),
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedAppointment && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>Doctor: </Text>
              <Text>{selectedAppointment.doctorName}</Text>
              <Text type="secondary" style={{ marginLeft: '8px' }}>
                ({selectedAppointment.doctorSpecialty})
              </Text>
            </div>
            <div>
              <Text strong>Hospital: </Text>
              <Text>{selectedAppointment.hospitalName}</Text>
            </div>
            <div>
              <Text strong>Date: </Text>
              <Text>
                {dayjs(selectedAppointment.appointmentDate).isValid()
                  ? dayjs(selectedAppointment.appointmentDate).format('DD MMM YYYY')
                  : selectedAppointment.appointmentDate}
              </Text>
            </div>
            <div>
              <Text strong>Time: </Text>
              <Text>{selectedAppointment.appointmentTime || selectedAppointment.timeSlot}</Text>
            </div>
            {(selectedAppointment.rescheduledAt || selectedAppointment.rescheduledFromDate || (selectedAppointment.notes || '').toLowerCase().includes('rescheduled:')) && (
              <div>
                <Text strong>Rescheduled: </Text>
                {selectedAppointment.rescheduledFromDate ? (
                  <Text type="secondary">
                    From {String(selectedAppointment.rescheduledFromDate).slice(0, 10)} {selectedAppointment.rescheduledFromTimeSlot || ''}
                    {selectedAppointment.rescheduleReason ? ` • Reason: ${selectedAppointment.rescheduleReason}` : ''}
                  </Text>
                ) : (
                  <Text type="secondary">See notes for details</Text>
                )}
              </div>
            )}
            <div>
              <Text strong>Reason: </Text>
              <Text>{selectedAppointment.reason}</Text>
            </div>
            <div>
              <Text strong>Status: </Text>
              <Tag color={getStatusColor((selectedAppointment.displayStatus || selectedAppointment.status).toLowerCase())}>
                {(selectedAppointment.displayStatus || selectedAppointment.status).toUpperCase()}
              </Tag>
            </div>
            {selectedAppointment.symptoms && (
              <div>
                <Text strong>Symptoms: </Text>
                <Text>{selectedAppointment.symptoms}</Text>
              </div>
            )}
            {selectedAppointment.notes && (
              <div>
                <Text strong>Notes: </Text>
                <Text>{selectedAppointment.notes}</Text>
              </div>
            )}
            {selectedAppointment.status.toLowerCase() === 'cancelled' && (
              <div>
                <Text strong style={{ color: '#ff4d4f' }}>Cancellation Reason: </Text>
                <Text style={{ color: '#ff4d4f' }}>
                  {getCancellationReason(selectedAppointment.notes) || 'Not specified'}
                </Text>
              </div>
            )}
          </Space>
        )}
      </Modal>

      {/* Reschedule Request Modal */}
      <Modal
        title="Request Appointment Reschedule"
        open={isRescheduleRequestModalOpen}
        onCancel={() => {
          setIsRescheduleRequestModalOpen(false);
          setAppointmentForReschedule(null);
          rescheduleRequestForm.resetFields();
          setRescheduleRequestSelectedDate(null);
          setRescheduleRequestAvailableSlots([]);
          setRescheduleRequestSlotBookings({});
        }}
        footer={null}
        width={600}
      >
        {appointmentForReschedule && (
          <Form
            form={rescheduleRequestForm}
            layout="vertical"
            onFinish={handleRescheduleRequestSubmit}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
              <div>
                <Text strong>Current Appointment:</Text>
                <div style={{ marginTop: 8 }}>
                  <Text>Doctor: {appointmentForReschedule.doctorName}</Text>
                  <br />
                  <Text>Date: {appointmentForReschedule.appointmentDate}</Text>
                  <br />
                  <Text>Time: {appointmentForReschedule.timeSlot || appointmentForReschedule.appointmentTime}</Text>
                </div>
              </div>
            </Space>

            <Form.Item
              name="appointmentDate"
              label="New Appointment Date"
              rules={[{ required: true, message: 'Please select a date' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                disabledDate={(current) => {
                  // Can't select past dates
                  return current && current < dayjs().startOf('day');
                }}
                onChange={(date) => {
                  handleRescheduleRequestDateChange(date);
                  rescheduleRequestForm.setFieldsValue({ timeSlot: undefined });
                }}
                placeholder="Select new date"
              />
            </Form.Item>

            <Form.Item
              name="timeSlot"
              label="New Time Slot"
              rules={[{ required: true, message: 'Please select a time slot' }]}
            >
              <Select
                placeholder="Select time slot"
                disabled={!rescheduleRequestSelectedDate || rescheduleRequestAvailableSlots.length === 0}
                loading={rescheduleRequestAvailableSlots.length === 0 && rescheduleRequestSelectedDate !== null}
              >
                {rescheduleRequestAvailableSlots.map((slot) => {
                  const bookingCount = rescheduleRequestSlotBookings[slot] || 0;
                  const isFullyBooked = bookingCount >= 5;
                  const isAlmostFull = bookingCount >= 3;
                  
                  return (
                    <Select.Option key={slot} value={slot} disabled={isFullyBooked}>
                      <Space>
                        <span>{formatTimeSlot12h(slot)}</span>
                        {isFullyBooked && <Tag color="red">Full</Tag>}
                        {isAlmostFull && !isFullyBooked && <Tag color="orange">Almost Full</Tag>}
                        {!isFullyBooked && !isAlmostFull && <Tag color="green">Available</Tag>}
                      </Space>
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>

            <Form.Item
              name="reasonNote"
              label="Reason for Reschedule (Optional)"
            >
              <Input.TextArea
                rows={3}
                placeholder="Please provide a reason for rescheduling..."
                maxLength={500}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSubmittingRescheduleRequest}
                >
                  Submit Request
                </Button>
                <Button
                  onClick={() => {
                    setIsRescheduleRequestModalOpen(false);
                    setAppointmentForReschedule(null);
                    rescheduleRequestForm.resetFields();
                    setRescheduleRequestSelectedDate(null);
                    setRescheduleRequestAvailableSlots([]);
                    setRescheduleRequestSlotBookings({});
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Prescription Modal */}
      <Modal
        title="Prescription Details"
        open={isPrescriptionModalOpen}
        onCancel={() => setIsPrescriptionModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsPrescriptionModalOpen(false)}>
            Close
          </Button>
        ]}
        width={900}
      >
        {selectedPrescription ? (() => {
          // Parse medications
          let medications: any[] = [];
          try {
            medications = JSON.parse(selectedPrescription.medications);
            if (!Array.isArray(medications)) medications = [];
          } catch {
            medications = [];
          }

          // Parse instructions to extract chief complaints, clinical findings, advice
          let chiefComplaints: string[] = [];
          let clinicalFindings: string[] = [];
          let advice: string[] = [];
          
          try {
            if (selectedPrescription.instructions) {
              const parsed = JSON.parse(selectedPrescription.instructions);
              if (parsed.chiefComplaints) chiefComplaints = parsed.chiefComplaints;
              if (parsed.clinicalFindings) clinicalFindings = parsed.clinicalFindings;
              if (parsed.advice) advice = parsed.advice;
            }
          } catch {
            // If not JSON, treat as plain text advice
            if (selectedPrescription.instructions) {
              advice = [selectedPrescription.instructions];
            }
          }

          return (
            <PrescriptionPreview
              hospitalName={selectedPrescription.hospital?.name}
              hospitalAddress={selectedPrescription.hospital?.address}
              doctorName={selectedPrescription.doctor?.fullName ? `Dr. ${selectedPrescription.doctor.fullName}` : 'Dr. Unknown'}
              doctorQualification="M.S."
              doctorRegNo="MMC 2018"
              patientId={selectedPrescription.patientId}
              patientName={user?.fullName || 'Unknown'}
              patientGender={user?.gender || 'M'}
              patientAge={user?.dateOfBirth 
                ? dayjs().diff(dayjs(user.dateOfBirth), 'year')
                : undefined}
              patientMobile={user?.mobileNumber}
              patientAddress={user?.address}
              weight={selectedPrescription.patient?.weight}
              height={selectedPrescription.patient?.height}
              date={selectedPrescription.createdAt}
              chiefComplaints={chiefComplaints}
              clinicalFindings={clinicalFindings}
              diagnosis={selectedPrescription.diagnosis}
              medications={medications}
              labTests={[]}
              advice={advice}
              followUpDate={selectedPrescription.followUpDate}
            />
          );
        })() : (
          <Text>No prescription found.</Text>
        )}
      </Modal>

      {/* Lab Report Viewer Modal */}
      <LabReportViewerModal
        open={isLabReportModalOpen}
        onCancel={() => {
          setIsLabReportModalOpen(false);
          setSelectedLabReport(null);
        }}
        report={selectedLabReport}
      />

      {/* Vitals Viewer Modal */}
      <Modal
        title="Vitals Record"
        open={isVitalsModalOpen}
        onCancel={() => {
          setIsVitalsModalOpen(false);
          setSelectedVitals(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsVitalsModalOpen(false);
            setSelectedVitals(null);
          }}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedVitals ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>Recorded At: </Text>
              <Text>{dayjs(selectedVitals.recordedAt).format('DD MMM YYYY, hh:mm A')}</Text>
            </div>
            <div>
              <Text strong>Temperature: </Text>
              <Text>{selectedVitals.temperature ? `${selectedVitals.temperature}°${selectedVitals.temperatureUnit || 'C'}` : 'N/A'}</Text>
            </div>
            <div>
              <Text strong>Blood Pressure: </Text>
              <Text>
                {selectedVitals.bpSystolic && selectedVitals.bpDiastolic
                  ? `${selectedVitals.bpSystolic}/${selectedVitals.bpDiastolic} mmHg`
                  : 'N/A'}
              </Text>
            </div>
            <div>
              <Text strong>Pulse: </Text>
              <Text>{selectedVitals.pulse ? `${selectedVitals.pulse} bpm` : 'N/A'}</Text>
            </div>
            <div>
              <Text strong>Respiration Rate: </Text>
              <Text>{selectedVitals.respirationRate ? `${selectedVitals.respirationRate} /min` : 'N/A'}</Text>
            </div>
            <div>
              <Text strong>SpO2: </Text>
              <Text>{selectedVitals.spo2 ? `${selectedVitals.spo2}%` : 'N/A'}</Text>
            </div>
            {selectedVitals.weight && (
              <div>
                <Text strong>Weight: </Text>
                <Text>{selectedVitals.weight} kg</Text>
              </div>
            )}
            {selectedVitals.height && (
              <div>
                <Text strong>Height: </Text>
                <Text>{selectedVitals.height} cm</Text>
              </div>
            )}
            {selectedVitals.bmi && (
              <div>
                <Text strong>BMI: </Text>
                <Text>{selectedVitals.bmi}</Text>
              </div>
            )}
            {selectedVitals.bloodGlucose && (
              <div>
                <Text strong>Blood Glucose: </Text>
                <Text>{selectedVitals.bloodGlucose} mg/dL</Text>
              </div>
            )}
            {selectedVitals.painScale !== null && selectedVitals.painScale !== undefined && (
              <div>
                <Text strong>Pain Scale: </Text>
                <Text>{selectedVitals.painScale}/10</Text>
              </div>
            )}
            {selectedVitals.notes && (
              <div>
                <Text strong>Notes: </Text>
                <Text>{selectedVitals.notes}</Text>
              </div>
            )}
          </Space>
        ) : (
          <Text>No vitals data found.</Text>
        )}
      </Modal>

      <BookAppointmentModal
        open={bookAppointmentModalOpen}
        onCancel={() => setBookAppointmentModalOpen(false)}
        onSuccess={() => {
          setBookAppointmentModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['/api/appointments/my'] });
          queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
        }}
      />
    </>
  );
}
