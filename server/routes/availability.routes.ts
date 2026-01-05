import { Router } from 'express';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import * as availabilityService from '../services/availability.service';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { receptionists, hospitals, doctors } from '../../shared/schema';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Helper to get hospital ID
const getHospitalId = async (user: any): Promise<number> => {
  if (user.role === 'RECEPTIONIST') {
    const receptionist = await db
      .select()
      .from(receptionists)
      .where(eq(receptionists.userId, user.id))
      .limit(1);
    if (receptionist.length === 0) {
      throw new Error('Receptionist not found');
    }
    return receptionist[0].hospitalId;
  } else if (user.role === 'ADMIN' || user.role === 'HOSPITAL') {
    const hospital = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.userId, user.id))
      .limit(1);
    if (hospital.length === 0) {
      throw new Error('Hospital not found');
    }
    return hospital[0].id;
  } else if (user.role === 'DOCTOR') {
    const doctor = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, user.id))
      .limit(1);
    if (doctor.length === 0) {
      throw new Error('Doctor not found');
    }
    if (!doctor[0].hospitalId) {
      throw new Error('Doctor not associated with a hospital');
    }
    return doctor[0].hospitalId;
  }
  throw new Error('Unauthorized');
};

// Get doctor availability rules
router.get('/doctor/:doctorId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { doctorId } = req.params;
    const rules = await availabilityService.getDoctorAvailabilityRules(+doctorId);
    res.json(rules);
  } catch (err: any) {
    console.error('❌ Get availability rules error:', err);
    res.status(400).json({ message: err.message || 'Failed to get availability rules' });
  }
});

// Create or update availability rule
router.post('/doctor/:doctorId/rules', authorizeRoles('ADMIN', 'HOSPITAL', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const { doctorId } = req.params;
    const { dayOfWeek, startTime, endTime, slotDurationMinutes, maxPatientsPerSlot, isActive } = req.body;
    
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ message: 'dayOfWeek, startTime, and endTime are required' });
    }

    const hospitalId = await getHospitalId(req.user);
    
    const rule = await availabilityService.upsertAvailabilityRule({
      doctorId: +doctorId,
      hospitalId,
      dayOfWeek: +dayOfWeek,
      startTime,
      endTime,
      slotDurationMinutes,
      maxPatientsPerSlot,
      isActive,
    });

    res.json(rule);
  } catch (err: any) {
    console.error('❌ Upsert availability rule error:', err);
    res.status(400).json({ message: err.message || 'Failed to save availability rule' });
  }
});

// Get doctor availability exceptions
router.get('/doctor/:doctorId/exceptions', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { doctorId } = req.params;
    const { dateFrom, dateTo } = req.query;
    
    const exceptions = await availabilityService.getDoctorAvailabilityExceptions(
      +doctorId,
      dateFrom as string | undefined,
      dateTo as string | undefined
    );
    
    res.json(exceptions);
  } catch (err: any) {
    console.error('❌ Get availability exceptions error:', err);
    res.status(400).json({ message: err.message || 'Failed to get availability exceptions' });
  }
});

// Create availability exception
router.post('/doctor/:doctorId/exceptions', authorizeRoles('ADMIN', 'HOSPITAL', 'DOCTOR', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { doctorId } = req.params;
    const { date, type, startTime, endTime, reason } = req.body;
    
    if (!date || !type) {
      return res.status(400).json({ message: 'date and type are required' });
    }

    if (!['leave', 'override_hours', 'blocked'].includes(type)) {
      return res.status(400).json({ message: 'type must be leave, override_hours, or blocked' });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const hospitalId = await getHospitalId(req.user);
    
    const exception = await availabilityService.createAvailabilityException({
      doctorId: +doctorId,
      hospitalId,
      date,
      type,
      startTime,
      endTime,
      reason,
      createdByUserId: req.user.id,
    });

    // Get impacted appointments
    const impactedAppointments = await availabilityService.getImpactedAppointments(
      +doctorId,
      date,
      type,
      startTime,
      endTime
    );

    res.json({
      exception,
      impactedAppointments: impactedAppointments.length,
      appointments: impactedAppointments,
    });
  } catch (err: any) {
    console.error('❌ Create availability exception error:', err);
    res.status(400).json({ message: err.message || 'Failed to create availability exception' });
  }
});

// Delete availability exception
router.delete('/exceptions/:exceptionId', authorizeRoles('ADMIN', 'HOSPITAL', 'DOCTOR', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { exceptionId } = req.params;
    const deleted = await availabilityService.deleteAvailabilityException(+exceptionId);
    res.json(deleted);
  } catch (err: any) {
    console.error('❌ Delete availability exception error:', err);
    res.status(400).json({ message: err.message || 'Failed to delete availability exception' });
  }
});

// Get available slots for a doctor on a specific date
router.get('/doctor/:doctorId/slots/:date', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { doctorId, date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    const slots = await availabilityService.getAvailableSlots(+doctorId, date);
    res.json({ slots, date });
  } catch (err: any) {
    console.error('❌ Get available slots error:', err);
    res.status(400).json({ message: err.message || 'Failed to get available slots' });
  }
});

export default router;
