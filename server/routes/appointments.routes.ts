// server/routes/appointments.routes.ts
import { Router } from 'express';
import * as appointmentService from '../services/appointments.service';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import { patients, doctors } from '../../drizzle/schema';

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
    res.status(400).json({ message: 'Failed to book appointment' });
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
router.get('/my', authorizeRoles('PATIENT', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let appointments: any[] = [];
    
    // Get appointments based on user role
    if (user.role === 'PATIENT') {
      // Get patient ID from user
      const patient = await db.select().from(patients).where(eq(patients.userId, user.id)).limit(1);
      if (patient.length > 0) {
        appointments = await appointmentService.getAppointmentsByPatient(patient[0].id);
      }
    } else if (user.role === 'DOCTOR') {
      // Get doctor ID from user
      const doctor = await db.select().from(doctors).where(eq(doctors.userId, user.id)).limit(1);
      if (doctor.length > 0) {
        appointments = await appointmentService.getAppointmentsByDoctor(doctor[0].id);
      }
    }

    res.json(appointments);
  } catch (err) {
    console.error('Get my appointments error:', err);
    res.status(400).json({ message: 'Failed to fetch appointments' });
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
