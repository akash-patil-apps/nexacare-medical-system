// server/routes/hospitals.routes.ts
import { Router } from 'express';
import { createHospital, getAllHospitals, getHospitalStats, getHospitalById, getHospitalStaff, removeStaffMember, type StaffRole } from '../services/hospitals.service';
import { insertHospitalSchema } from '../../shared/schema';
import { approveLab, approveDoctor } from '../services/hospitals.service';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { db } from '../db';
import { hospitals } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import * as hospitalPatientsService from '../services/hospital-patients.service';
import { getPatientInfo } from '../services/reception.service';

const VALID_STAFF_ROLES: StaffRole[] = ['doctor', 'nurse', 'receptionist', 'pharmacist', 'radiology_technician'];


const router = Router();

// GET /hospitals - List all hospitals
router.get('/', async (_req, res) => {
  try {
    const hospitals = await getAllHospitals();
    res.json({ hospitals });
  } catch (err: any) {
    console.error('❌ Fetch hospitals error:', err);
    console.error('Error details:', {
      message: err?.message,
      stack: err?.stack,
      name: err?.name
    });
    res.status(500).json({ 
      message: 'Failed to fetch hospitals',
      error: process.env.NODE_ENV === 'development' ? err?.message : undefined
    });
  }
});

// POST /hospitals - Register a new hospital
router.post('/', async (req, res) => {
  try {
    const data = insertHospitalSchema.parse(req.body) as unknown as Parameters<typeof createHospital>[0];
    const hospital = await createHospital(data);
    res.status(201).json({ hospital });
  } catch (err) {
    console.error('Register hospital error:', err);
    res.status(400).json({ message: 'Invalid data', error: err });
  }
});

// POST /hospitals/register - Alternative registration endpoint
router.post('/register', async (req, res) => {
  try {
    const data = insertHospitalSchema.parse(req.body) as unknown as Parameters<typeof createHospital>[0];
    const hospital = await createHospital(data);
    res.status(201).json({ hospital });
  } catch (err) {
    console.error('Register hospital error:', err);
    res.status(400).json({ message: 'Invalid data', error: err });
  }
});

router.post(
  '/approve/doctor/:id',
  authenticateToken,
  authorizeRoles('HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const approved = await approveDoctor(Number(req.params.id));
      res.json({ success: true, approved });
    } catch (err) {
      console.error('Approve doctor error:', err);
      res.status(500).json({ message: 'Failed to approve doctor' });
    }
  }
);

router.post(
  '/approve/lab/:id',
  authenticateToken,
  authorizeRoles('HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const approved = await approveLab(Number(req.params.id));
      res.json({ success: true, approved });
    } catch (err) {
      console.error('Approve lab error:', err);
      res.status(500).json({ message: 'Failed to approve lab' });
    }
  }
);

// Get current hospital's staff (MUST be before /my route)
router.get(
  '/my/staff',
  authenticateToken,
  authorizeRoles('HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const [hospital] = await db.select().from(hospitals).where(eq(hospitals.userId, userId)).limit(1);
      if (!hospital) {
        return res.status(404).json({ message: 'Hospital not found for this user' });
      }
      const staff = await getHospitalStaff(hospital.id);
      res.json(staff);
    } catch (err: any) {
      console.error('Get hospital staff error:', err);
      res.status(500).json({ message: err?.message || 'Failed to fetch staff' });
    }
  }
);

router.delete(
  '/my/staff/:role/:id',
  authenticateToken,
  authorizeRoles('HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.params.role as StaffRole;
      const id = parseInt(req.params.id, 10);
      if (!VALID_STAFF_ROLES.includes(role) || !Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Invalid role or staff id' });
      }
      const userId = req.user!.id;
      const [hospital] = await db.select().from(hospitals).where(eq(hospitals.userId, userId)).limit(1);
      if (!hospital) {
        return res.status(404).json({ message: 'Hospital not found for this user' });
      }
      const removed = await removeStaffMember(role, id, hospital.id);
      if (!removed) {
        return res.status(404).json({ message: 'Staff member not found or already removed' });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('Remove staff error:', err);
      res.status(500).json({ message: err?.message || 'Failed to remove staff' });
    }
  }
);

// Encountered patients: only patients who have at least one appointment at this hospital (for admin Patients page)
router.get(
  '/my/encountered-patients',
  authenticateToken,
  authorizeRoles('HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const [hospital] = await db.select().from(hospitals).where(eq(hospitals.userId, userId)).limit(1);
      if (!hospital) {
        return res.status(404).json({ message: 'Hospital not found for this user' });
      }
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const list = await hospitalPatientsService.getEncounteredPatientsAppointments(hospital.id, { search });
      res.json({ appointments: list });
    } catch (err: any) {
      console.error('Encountered patients error:', err);
      res.status(500).json({ message: err?.message || 'Failed to fetch encountered patients' });
    }
  }
);

// Patient detail (only if patient has at least one encounter at this hospital)
router.get(
  '/my/patients/:patientId',
  authenticateToken,
  authorizeRoles('HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const [hospital] = await db.select().from(hospitals).where(eq(hospitals.userId, userId)).limit(1);
      if (!hospital) {
        return res.status(404).json({ message: 'Hospital not found for this user' });
      }
      const patientId = parseInt(req.params.patientId, 10);
      if (!Number.isInteger(patientId) || patientId <= 0) {
        return res.status(400).json({ message: 'Invalid patient ID' });
      }
      const allowed = await hospitalPatientsService.patientHasEncounterAtHospital(patientId, hospital.id);
      if (!allowed) {
        return res.status(403).json({ message: 'Patient has no encounter at this hospital' });
      }
      const info = await getPatientInfo(patientId);
      if (!info) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      res.json(info);
    } catch (err: any) {
      console.error('Patient detail error:', err);
      res.status(500).json({ message: err?.message || 'Failed to fetch patient details' });
    }
  }
);

// Get current user's hospital (MUST be before /:id route)
router.get(
  '/my',
  authenticateToken,
  authorizeRoles('HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      // Get hospital from user
      const [hospital] = await db
        .select()
        .from(hospitals)
        .where(eq(hospitals.userId, userId))
        .limit(1);
      
      if (!hospital) {
        return res.status(404).json({ message: 'Hospital not found for this user' });
      }
      
      res.json(hospital);
    } catch (err: any) {
      console.error('Get my hospital error:', err);
      res.status(500).json({ message: err.message || 'Failed to fetch hospital' });
    }
  }
);

// Get hospital statistics for dashboard
router.get(
  '/stats',
  authenticateToken,
  authorizeRoles('HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      // Get hospital ID from user
      const [hospital] = await db
        .select({ id: hospitals.id })
        .from(hospitals)
        .where(eq(hospitals.userId, userId))
        .limit(1);
      
      if (!hospital) {
        return res.status(404).json({ message: 'Hospital not found for this user' });
      }
      
      const stats = await getHospitalStats(hospital.id);
      res.json(stats);
    } catch (err: any) {
      console.error('Get hospital stats error:', err);
      res.status(500).json({ message: err.message || 'Failed to fetch hospital statistics' });
    }
  }
);

// Get hospital by ID (must be after /my and /stats routes)
router.get(
  '/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = Number(req.params.id);
      
      // Validate hospitalId is a valid number
      if (isNaN(hospitalId) || hospitalId <= 0) {
        return res.status(400).json({ message: 'Invalid hospital ID' });
      }
      
      const hospital = await getHospitalById(hospitalId);
      if (!hospital) {
        return res.status(404).json({ message: 'Hospital not found' });
      }
      res.json(hospital);
    } catch (err: any) {
      console.error('Get hospital by ID error:', err);
      res.status(500).json({ message: err.message || 'Failed to fetch hospital' });
    }
  }
);

export default router;