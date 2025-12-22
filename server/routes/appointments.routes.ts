// server/routes/appointments.routes.ts
import { Router } from 'express';
import * as appointmentService from '../services/appointments.service';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import { patients, doctors, hospitals, receptionists } from '../../drizzle/schema';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Book new appointment (Patient)
router.post('/', authorizeRoles('PATIENT', 'ADMIN', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log('📅 Booking appointment for user:', user.id, 'Role:', user.role);
    console.log('📅 Appointment data:', req.body);

    // Validate required fields
    const { doctorId, hospitalId, appointmentDate, appointmentTime, timeSlot, reason } = req.body;
    
    if (!doctorId || !hospitalId || !appointmentDate || !appointmentTime || !timeSlot || !reason) {
      const missingFields = [];
      if (!doctorId) missingFields.push('doctorId');
      if (!hospitalId) missingFields.push('hospitalId');
      if (!appointmentDate) missingFields.push('appointmentDate');
      if (!appointmentTime) missingFields.push('appointmentTime');
      if (!timeSlot) missingFields.push('timeSlot');
      if (!reason) missingFields.push('reason');
      
      console.error('❌ Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields: missingFields 
      });
    }

    // Get patient ID from user
    const patient = await db.select().from(patients).where(eq(patients.userId, user.id)).limit(1);
    
    console.log('🔍 Patient lookup result:', patient);
    
    if (patient.length === 0) {
      console.log('❌ No patient record found for user:', user.id);
      return res.status(400).json({ message: 'Patient profile not found. Please contact support.' });
    }

    console.log('✅ Found patient record:', patient[0].id, 'for user:', user.id);

    // Update the appointment data with the correct patient ID
    const appointmentData = {
      ...req.body,
      patientId: patient[0].id
    };
    
    console.log('📤 Final appointment data:', appointmentData);

    const appointment = await appointmentService.bookAppointment(appointmentData, user);
    res.status(201).json(appointment);
  } catch (err) {
    console.error('Book appointment error:', err);
    res.status(400).json({ 
      message: 'Failed to book appointment',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Get appointments by patient ID
router.get('/patient/:patientId', async (req, res) => {
  try {
    const appointments = await appointmentService.getAppointmentsByPatient(+req.params.patientId);
    res.json(appointments);
  } catch (err) {
    console.error('Get patient appointments error:', err);
    res.status(400).json({ message: 'Failed to fetch appointments' });
  }
});

// Get appointments by doctor ID
router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const appointments = await appointmentService.getAppointmentsByDoctor(+req.params.doctorId);
    res.json(appointments);
  } catch (err) {
    console.error('Get doctor appointments error:', err);
    res.status(400).json({ message: 'Failed to fetch appointments' });
  }
});

// Get appointments by doctor ID and date (for slot availability checking)
router.get('/doctor/:doctorId/date/:date', async (req, res) => {
  try {
    const doctorId = +req.params.doctorId;
    const date = req.params.date; // Format: YYYY-MM-DD
    
    const appointments = await appointmentService.getAppointmentsByDoctorAndDate(doctorId, date);
    res.json(appointments);
  } catch (err) {
    console.error('Get doctor appointments by date error:', err);
    res.status(400).json({ message: 'Failed to fetch appointments' });
  }
});

// Get appointments by hospital ID
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const appointments = await appointmentService.getAppointmentsByHospital(+req.params.hospitalId);
    res.json(appointments);
  } catch (err) {
    console.error('Get hospital appointments error:', err);
    res.status(400).json({ message: 'Failed to fetch appointments' });
  }
});

// Get my appointments (for current user) - MUST be before /:appointmentId route
router.get('/my', authorizeRoles('PATIENT', 'DOCTOR', 'RECEPTIONIST', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log(`📋 Fetching appointments for user: ${user.id}, Role: ${user.role}, Name: ${user.fullName}`);

    let appointments: any[] = [];
    
    // Get appointments based on user role
    if (user.role === 'PATIENT') {
      // Get patient ID from user
      const patient = await db.select().from(patients).where(eq(patients.userId, user.id)).limit(1);
      if (patient.length > 0) {
        console.log(`✅ Found patient ID: ${patient[0].id} for user ${user.id}`);
        appointments = await appointmentService.getAppointmentsByPatient(patient[0].id);
      } else {
        console.log(`⚠️ No patient record found for user ${user.id}`);
      }
    } else if (user.role === 'DOCTOR') {
      // Get doctor ID from user
      console.log(`🔍 Looking for doctor record with userId: ${user.id}, user name: ${user.fullName}`);
      const doctor = await db.select().from(doctors).where(eq(doctors.userId, user.id)).limit(1);
      if (doctor.length > 0) {
        console.log(`✅ Found doctor ID: ${doctor[0].id} for user ${user.id} (${user.fullName})`);
        console.log(`📋 Calling getAppointmentsByDoctor(${doctor[0].id})...`);
        appointments = await appointmentService.getAppointmentsByDoctor(doctor[0].id);
        console.log(`📋 Returning ${appointments.length} appointments for doctor ${doctor[0].id}`);
        if (appointments.length > 0) {
          console.log(`📋 Sample appointment:`, {
            id: appointments[0].id,
            patient: appointments[0].patientName,
            status: appointments[0].status,
            date: appointments[0].appointmentDate
          });
        }
      } else {
        console.log(`⚠️ No doctor record found for user ${user.id} (${user.fullName})`);
        console.log(`🔍 Checking all doctors in database...`);
        const allDoctors = await db.select().from(doctors).limit(10);
        console.log(`📋 Found ${allDoctors.length} doctors in database`);
        allDoctors.forEach(d => {
          console.log(`  - Doctor ID: ${d.id}, User ID: ${d.userId}`);
        });
      }
    } else if (user.role === 'RECEPTIONIST') {
      // Get receptionist's hospital ID
      const receptionist = await db.select().from(receptionists).where(eq(receptionists.userId, user.id)).limit(1);
      if (receptionist.length > 0) {
        console.log(`📋 Receptionist ${user.fullName} (ID: ${user.id}) is associated with hospital ${receptionist[0].hospitalId}`);
        appointments = await appointmentService.getAppointmentsByHospital(receptionist[0].hospitalId);
        console.log(`✅ Returning ${appointments.length} appointments for receptionist`);
      } else {
        console.log(`⚠️ No receptionist record found for user ${user.id}`);
      }
    } else if (user.role === 'HOSPITAL') {
      // Get hospital ID from user (hospital admin is linked to hospital)
      const hospital = await db.select().from(hospitals).where(eq(hospitals.userId, user.id)).limit(1);
      if (hospital.length > 0) {
        console.log(`✅ Found hospital ID: ${hospital[0].id} for user ${user.id}`);
        appointments = await appointmentService.getAppointmentsByHospital(hospital[0].id);
      } else {
        console.log(`⚠️ No hospital record found for user ${user.id}`);
      }
    }

    console.log(`📋 Total appointments to return: ${appointments.length}`);
    res.json(appointments);
  } catch (err) {
    console.error('❌ Get my appointments error:', err);
    res.status(400).json({ message: 'Failed to fetch appointments', error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Get appointment by ID
router.get('/:appointmentId', async (req: AuthenticatedRequest, res) => {
  try {
    const appointment = await appointmentService.getAppointmentById(+req.params.appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.json(appointment);
  } catch (err) {
    console.error('Get appointment error:', err);
    res.status(400).json({ message: 'Failed to fetch appointment' });
  }
});

// Update appointment status
router.patch('/:appointmentId/status', async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.body;
    const appointment = await appointmentService.updateAppointmentStatus(
      +req.params.appointmentId, 
      status, 
      req.user?.id
    );
    res.json(appointment);
  } catch (err) {
    console.error('Update appointment status error:', err);
    res.status(400).json({ message: 'Failed to update appointment status' });
  }
});

// Cancel appointment
router.patch('/:appointmentId/cancel', async (req: AuthenticatedRequest, res) => {
  try {
    const appointment = await appointmentService.cancelAppointment(
      +req.params.appointmentId, 
      req.user?.id || 1
    );
    res.json(appointment);
  } catch (err) {
    console.error('Cancel appointment error:', err);
    res.status(400).json({ message: 'Failed to cancel appointment' });
  }
});

// Confirm appointment
router.patch('/:appointmentId/confirm', async (req: AuthenticatedRequest, res) => {
  try {
    const appointment = await appointmentService.confirmAppointment(
      +req.params.appointmentId, 
      req.user?.id || 1
    );
    res.json(appointment);
  } catch (err) {
    console.error('Confirm appointment error:', err);
    res.status(400).json({ message: 'Failed to confirm appointment' });
  }
});

// Complete appointment
router.patch('/:appointmentId/complete', async (req: AuthenticatedRequest, res) => {
  try {
    const appointment = await appointmentService.completeAppointment(
      +req.params.appointmentId, 
      req.user?.id || 1
    );
    res.json(appointment);
  } catch (err) {
    console.error('Complete appointment error:', err);
    res.status(400).json({ message: 'Failed to complete appointment' });
  }
});

// Confirm appointment (for receptionist) - Approves pending appointments
router.patch('/:appointmentId/confirm', authorizeRoles('RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`📋 Confirm appointment request for appointment ${req.params.appointmentId} by receptionist ${req.user?.id}`);
    
    // Get receptionist ID from user
    const receptionist = await db.select().from(receptionists).where(eq(receptionists.userId, req.user?.id || 0)).limit(1);
    if (receptionist.length === 0) {
      console.error(`❌ Receptionist not found for user ${req.user?.id}`);
      return res.status(403).json({ message: 'Receptionist not found' });
    }
    
    console.log(`✅ Found receptionist ID: ${receptionist[0].id}`);
    
    const appointment = await appointmentService.confirmAppointmentByReceptionist(
      +req.params.appointmentId,
      receptionist[0].id
    );
    
    console.log(`✅ Appointment confirmed successfully. Returning appointment:`, {
      id: appointment.id,
      status: appointment.status,
      receptionistId: appointment.receptionistId
    });
    
    res.json(appointment);
  } catch (err: any) {
    console.error('❌ Confirm appointment error:', err);
    res.status(400).json({ 
      message: err.message || 'Failed to confirm appointment',
      error: err.toString()
    });
  }
});

// Check-in appointment (for receptionist) - Records when patient physically arrives
router.patch('/:appointmentId/check-in', authorizeRoles('RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`📋 Check-in request for appointment ${req.params.appointmentId} by receptionist ${req.user?.id}`);
    
    // Get receptionist ID from user
    const receptionist = await db.select().from(receptionists).where(eq(receptionists.userId, req.user?.id || 0)).limit(1);
    if (receptionist.length === 0) {
      console.error(`❌ Receptionist not found for user ${req.user?.id}`);
      return res.status(403).json({ message: 'Receptionist not found' });
    }
    
    console.log(`✅ Found receptionist ID: ${receptionist[0].id}`);
    
    const appointment = await appointmentService.checkInAppointment(
      +req.params.appointmentId,
      receptionist[0].id
    );
    
    console.log(`✅ Patient checked in successfully. Returning appointment:`, {
      id: appointment.id,
      status: appointment.status,
      receptionistId: appointment.receptionistId
    });
    
    res.json(appointment);
  } catch (err: any) {
    console.error('❌ Check-in appointment error:', err);
    res.status(400).json({ 
      message: err.message || 'Failed to check in appointment',
      error: err.toString()
    });
  }
});

// Get appointments by status
router.get('/status/:status', async (req, res) => {
  try {
    const appointments = await appointmentService.getAppointmentsByStatus(req.params.status);
    res.json(appointments);
  } catch (err) {
    console.error('Get appointments by status error:', err);
    res.status(400).json({ message: 'Failed to fetch appointments' });
  }
});

// Get appointments by date range
router.get('/date-range/:startDate/:endDate', async (req, res) => {
  try {
    const startDate = new Date(req.params.startDate);
    const endDate = new Date(req.params.endDate);
    const appointments = await appointmentService.getAppointmentsByDateRange(startDate, endDate);
    res.json(appointments);
  } catch (err) {
    console.error('Get appointments by date range error:', err);
    res.status(400).json({ message: 'Failed to fetch appointments' });
  }
});

export default router;
