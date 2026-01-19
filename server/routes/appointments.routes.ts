// server/routes/appointments.routes.ts
import { Router } from 'express';
import * as appointmentService from '../services/appointments.service';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import { patients, doctors, hospitals, receptionists } from '../../shared/schema';

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

    // Get patient ID - for receptionists, use patientId from body if provided
    let patientId: number;
    if (user.role === 'RECEPTIONIST' && req.body.patientId) {
      // Receptionist booking for a specific patient
      patientId = req.body.patientId;
      // Verify patient exists
      const [patient] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
      if (!patient) {
        return res.status(400).json({ message: 'Patient not found' });
      }
    } else {
      // For patients, use their own patient profile
      const patient = await db.select().from(patients).where(eq(patients.userId, user.id)).limit(1);
      
      
      if (patient.length === 0) {
        return res.status(400).json({ message: 'Patient profile not found. Please contact support.' });
      }

      patientId = patient[0].id;
    }

    // Update the appointment data with the correct patient ID
    const appointmentData = {
      ...req.body,
      patientId
    };
    

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


    let appointments: any[] = [];
    
    // Get appointments based on user role
    if (user.role === 'PATIENT') {
      // Get patient ID from user
      const patient = await db.select().from(patients).where(eq(patients.userId, user.id)).limit(1);
      if (patient.length > 0) {
        appointments = await appointmentService.getAppointmentsByPatient(patient[0].id);
      } else {
      }
    } else if (user.role === 'DOCTOR') {
      // Get doctor ID from user
      const doctor = await db.select().from(doctors).where(eq(doctors.userId, user.id)).limit(1);
      if (doctor.length > 0) {
        appointments = await appointmentService.getAppointmentsByDoctor(doctor[0].id);
      } else {
      }
    } else if (user.role === 'RECEPTIONIST') {
      // Get receptionist's hospital ID
      const receptionist = await db.select().from(receptionists).where(eq(receptionists.userId, user.id)).limit(1);
      if (receptionist.length > 0) {
        appointments = await appointmentService.getAppointmentsByHospital(receptionist[0].hospitalId);
      } else {
      }
    } else if (user.role === 'HOSPITAL') {
      // Get hospital ID from user (hospital admin is linked to hospital)
      const hospital = await db.select().from(hospitals).where(eq(hospitals.userId, user.id)).limit(1);
      if (hospital.length > 0) {
        appointments = await appointmentService.getAppointmentsByHospital(hospital[0].id);
      } else {
      }
    }

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

// Update appointment (general update endpoint for notes, payment status, etc.)
router.patch('/:appointmentId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { appointmentId } = req.params;
    const updateData = req.body;
    
    const { db } = await import('../db');
    const { appointments } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    const { sql } = await import('drizzle-orm');
    
    // Build update object (only allow certain fields for security)
    const allowedFields: any = {};
    
    // Handle notes update - if notes are provided, use them directly
    if (updateData.notes !== undefined) {
      const existing = await db.select().from(appointments).where(eq(appointments.id, +appointmentId)).limit(1);
      const existingNotes = existing[0]?.notes || '';
      
      // If notes already contain payment info, don't duplicate
      if (updateData.notes.includes('Payment:') || updateData.notes.includes('Payment Status:')) {
        allowedFields.notes = updateData.notes;
      } else if (existingNotes && !existingNotes.includes('Payment:')) {
        // Append to existing notes if they don't already have payment info
        allowedFields.notes = existingNotes + (existingNotes ? '\n' : '') + updateData.notes;
      } else {
        allowedFields.notes = updateData.notes;
      }
    }
    
    // Handle paymentStatus separately (for backward compatibility)
    if (updateData.paymentStatus !== undefined) {
      const existing = await db.select().from(appointments).where(eq(appointments.id, +appointmentId)).limit(1);
      const existingNotes = existing[0]?.notes || '';
      
      // Only add payment status if notes don't already have payment info
      if (!existingNotes || (!existingNotes.includes('Payment:') && !existingNotes.includes('Payment Status:'))) {
        allowedFields.notes = existingNotes 
          ? `${existingNotes}\nPayment Status: ${updateData.paymentStatus}`
          : `Payment Status: ${updateData.paymentStatus}`;
      }
    }
    
    if (Object.keys(allowedFields).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    
    allowedFields.updatedAt = sql`NOW()`;
    
    const [updated] = await db
      .update(appointments)
      .set(allowedFields)
      .where(eq(appointments.id, +appointmentId))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.json(updated);
  } catch (err: any) {
    console.error('Update appointment error:', err);
    res.status(400).json({ message: err.message || 'Failed to update appointment' });
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
    const { cancellationReason } = req.body;
    const appointment = await appointmentService.cancelAppointment(
      +req.params.appointmentId, 
      req.user?.id || 1,
      cancellationReason
    );
    res.json(appointment);
  } catch (err: any) {
    console.error('Cancel appointment error:', err);
    const errorMessage = err?.message || 'Failed to cancel appointment';
    res.status(400).json({ message: errorMessage });
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
    
    // Get receptionist ID from user
    const receptionist = await db.select().from(receptionists).where(eq(receptionists.userId, req.user?.id || 0)).limit(1);
    if (receptionist.length === 0) {
      console.error(`❌ Receptionist not found for user ${req.user?.id}`);
      return res.status(403).json({ message: 'Receptionist not found' });
    }
    
    const appointment = await appointmentService.confirmAppointmentByReceptionist(
      +req.params.appointmentId,
      receptionist[0].id
    );
    
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
    // Get receptionist ID from user
    const receptionist = await db.select().from(receptionists).where(eq(receptionists.userId, req.user?.id || 0)).limit(1);
    if (receptionist.length === 0) {
      return res.status(403).json({ message: 'Receptionist not found' });
    }
    
    const appointment = await appointmentService.checkInAppointment(
      +req.params.appointmentId,
      receptionist[0].id
    );
    
    res.json(appointment);
  } catch (err: any) {
    console.error('❌ Check-in appointment error:', err);
    res.status(400).json({ 
      message: err.message || 'Failed to check in appointment',
      error: err.toString()
    });
  }
});

// Reschedule appointment (for receptionist)
router.patch('/:appointmentId/reschedule', authorizeRoles('RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { appointmentDate, appointmentTime, timeSlot, rescheduleReason } = req.body || {};
    if (!appointmentDate || !appointmentTime || !timeSlot || !rescheduleReason) {
      return res.status(400).json({ message: 'Missing required fields for reschedule' });
    }

    // Get receptionist ID from user
    const receptionist = await db
      .select()
      .from(receptionists)
      .where(eq(receptionists.userId, req.user?.id || 0))
      .limit(1);
    if (receptionist.length === 0) {
      return res.status(403).json({ message: 'Receptionist not found' });
    }

    const appointment = await appointmentService.rescheduleAppointment(
      +req.params.appointmentId,
      { appointmentDate, appointmentTime, timeSlot, rescheduleReason },
      { userId: req.user?.id || 0, receptionistId: receptionist[0].id },
    );
    res.json(appointment);
  } catch (err: any) {
    console.error('❌ Reschedule appointment error:', err);
    res.status(400).json({
      message: err.message || 'Failed to reschedule appointment',
      error: err.toString(),
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
