// server/routes/reception.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';
import * as receptionService from '../services/reception.service';
import { getReceptionistContext, getReceptionistByUserId } from '../services/reception.service';
import { getRecommendedLabTestsForPatient, confirmLabRecommendation } from '../services/lab.service';

const router = Router();

/**
 * Get walk-in appointments.
 */
router.get(
  '/walkins',
  authenticateToken,
  authorizeRoles('receptionist'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const receptionistId = req.user!.id;
      const walkins = await receptionService.getWalkInAppointments(receptionistId);
      res.json(walkins);
    } catch (err) {
      console.error('Get walk-ins error:', err);
      res.status(500).json({ message: 'Failed to fetch walk-ins' });
    }
  }
);

/**
 * Search patients by name or mobile.
 */
router.get(
  '/patients/search',
  authenticateToken,
  authorizeRoles('receptionist'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const query = String(req.query.q || req.query.query || '').trim();
      if (!query) {
        return res.json([]);
      }
      const receptionistId = req.user!.id;
      const results = await receptionService.searchPatientsForReceptionist(receptionistId, query);
      res.json(results);
    } catch (err) {
      console.error('Search patients error:', err);
      res.status(500).json({ message: 'Failed to search patients' });
    }
  }
);

/**
 * Lookup user/patient by mobile number for walk-in registration.
 */
router.get(
  '/patients/lookup',
  authenticateToken,
  authorizeRoles('receptionist'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const mobileNumber = String(req.query.mobile || '').trim();
      
      if (!mobileNumber) {
        return res.status(400).json({ message: 'Mobile number is required' });
      }

      // Validate mobile number format
      if (mobileNumber.length < 10 || mobileNumber.length > 15) {
        return res.status(400).json({ message: 'Invalid mobile number length' });
      }

      const result = await receptionService.lookupUserByMobile(mobileNumber);
      res.json(result);
    } catch (err: any) {
      console.error('❌ Lookup user error:', err);
      console.error('Error stack:', err.stack);
      const errorMessage = err.message || 'Failed to lookup user';
      res.status(500).json({ 
        message: errorMessage,
        detail: err?.message,
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
      });
    }
  }
);

/**
 * Get receptionist profile (including hospitalId and hospitalName)
 * Similar to /api/doctors/profile - returns full receptionist profile with hospital name
 */
router.get(
  '/profile',
  authenticateToken,
  authorizeRoles('receptionist'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const receptionistProfile = await getReceptionistByUserId(user.id);
      
      if (!receptionistProfile) {
        return res.status(404).json({ message: 'Receptionist profile not found' });
      }
      
      res.json(receptionistProfile);
    } catch (err: any) {
      console.error('❌ Receptionist profile error:', err);
      res.status(500).json({ message: err.message || 'Failed to fetch receptionist profile' });
    }
  }
);

/**
 * Get doctors for the receptionist's hospital.
 */
router.get(
  '/doctors',
  authenticateToken,
  authorizeRoles('receptionist'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const receptionistId = req.user!.id;
      const doctors = await receptionService.getHospitalDoctorsForReceptionist(receptionistId);
      res.json(doctors);
    } catch (err) {
      console.error('Get reception doctors error:', err);
      res.status(500).json({ message: 'Failed to fetch doctors' });
    }
  }
);

const walkInSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  mobileNumber: z.string().min(10, 'Mobile number is required'),
  email: z.string().email().optional(),
  reason: z.string().min(2).optional(),
  doctorId: z.number().int(),
  priority: z.string().optional(),
  notes: z.string().optional().nullable(),
  appointmentDate: z.string().optional(),
  startTime: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
});

/**
 * Register a walk-in patient.
 */
router.post(
  '/walkins',
  authenticateToken,
  authorizeRoles('receptionist'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const payload = walkInSchema.parse(req.body);
      const receptionistId = req.user!.id;
      const walkin = await receptionService.registerWalkInPatient(receptionistId, payload);
      res.status(201).json(walkin);
    } catch (err) {
      console.error('Register walk-in error:', err);
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid input', errors: err.errors });
      } else {
        res.status(500).json({ message: 'Failed to register walk-in' });
      }
    }
  }
);

/**
 * Confirm a patient appointment.
 */
router.post(
  '/appointments/:id/confirm',
  authenticateToken,
  authorizeRoles('receptionist'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const appointmentId = Number(req.params.id);
      const receptionistId = req.user!.id;
      const result = await receptionService.confirmAppointment(appointmentId, receptionistId);
      res.json(result);
    } catch (err) {
      console.error('Confirm appointment error:', err);
      res.status(500).json({ message: 'Failed to confirm appointment' });
    }
  }
);

/**
 * Get comprehensive patient information by patientId.
 */
router.get(
  '/patients/:patientId/info',
  authenticateToken,
  authorizeRoles('RECEPTIONIST', 'receptionist', 'DOCTOR', 'doctor', 'HOSPITAL', 'ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patientId = Number(req.params.patientId);
      const patientInfo = await receptionService.getPatientInfo(patientId);
      if (!patientInfo) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      res.json(patientInfo);
    } catch (err) {
      console.error('Get patient info error:', err);
      res.status(500).json({ message: 'Failed to fetch patient information' });
    }
  }
);

/**
 * Get recommended lab tests for a patient (doctor recommendations awaiting confirmation)
 */
router.get(
  '/patients/:patientId/lab-recommendations',
  authenticateToken,
  authorizeRoles('receptionist'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patientId = Number(req.params.patientId);
      const recommendations = await getRecommendedLabTestsForPatient(patientId);
      res.json(recommendations);
    } catch (err) {
      console.error('Get lab recommendations error:', err);
      res.status(500).json({ message: 'Failed to fetch lab recommendations' });
    }
  }
);

/**
 * Confirm recommended lab test - receptionist confirms with patient and sends to lab
 */
router.post(
  '/lab-recommendations/:reportId/confirm',
  authenticateToken,
  authorizeRoles('receptionist'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const reportId = Number(req.params.reportId);
      const confirmed = await confirmLabRecommendation(reportId);
      res.json({ success: true, report: confirmed[0] });
    } catch (err: any) {
      console.error('Confirm lab recommendation error:', err);
      res.status(500).json({ message: err.message || 'Failed to confirm lab recommendation' });
    }
  }
);

export default router;
