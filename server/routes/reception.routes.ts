// server/routes/reception.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';
import * as receptionService from '../services/reception.service';

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

export default router;
