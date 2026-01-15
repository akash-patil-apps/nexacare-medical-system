// server/routes/medication.routes.ts
import { Router } from 'express';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import * as medicationAdminService from '../services/medication-administration.service';
import * as medicationOrderService from '../services/medication-order.service';
import { db } from '../db';
import { nurses } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get medication schedule for encounter
router.get('/encounters/:encounterId/schedule', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterId } = req.params;
    const date = req.query.date ? new Date(req.query.date as string) : undefined;
    const schedule = await medicationAdminService.getMedicationSchedule(+encounterId, date);
    res.json(schedule);
  } catch (err: any) {
    console.error('❌ Get medication schedule error:', err);
    res.status(400).json({ message: err.message || 'Failed to fetch medication schedule' });
  }
});

// Mark medication as given
router.post('/administrations', authorizeRoles('NURSE', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { administrationId, doseGiven, routeUsed, notes } = req.body;

    if (!administrationId) {
      return res.status(400).json({ message: 'Administration ID is required' });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get nurse ID from user ID
    const [nurse] = await db
      .select()
      .from(nurses)
      .where(eq(nurses.userId, req.user.id))
      .limit(1);

    if (!nurse) {
      return res.status(404).json({ message: 'Nurse profile not found' });
    }

    const updated = await medicationAdminService.markMedicationAsGiven({
      administrationId: +administrationId,
      administeredByUserId: req.user.id,
      doseGiven,
      routeUsed,
      notes,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('❌ Mark medication as given error:', err);
    res.status(400).json({ message: err.message || 'Failed to mark medication as given' });
  }
});

// Update medication status (held/refused/missed)
router.patch('/administrations/:id', authorizeRoles('NURSE', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status, reason, notes } = req.body;

    if (!status || !['held', 'refused', 'missed'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (held/refused/missed) and reason are required' });
    }

    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const updated = await medicationAdminService.updateMedicationStatus({
      administrationId: +id,
      status: status as 'held' | 'refused' | 'missed',
      reason,
      updatedByUserId: req.user.id,
      notes,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('❌ Update medication status error:', err);
    res.status(400).json({ message: err.message || 'Failed to update medication status' });
  }
});

// Create PRN medication administration
router.post('/prn', authorizeRoles('NURSE', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { medicationOrderId, encounterId, patientId, doseGiven, routeUsed, notes } = req.body;

    if (!medicationOrderId || !encounterId || !patientId || !doseGiven || !routeUsed) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const admin = await medicationAdminService.createPrnAdministration({
      medicationOrderId: +medicationOrderId,
      encounterId: +encounterId,
      patientId: +patientId,
      administeredByUserId: req.user.id,
      doseGiven,
      routeUsed,
      notes,
    });

    res.json(admin);
  } catch (err: any) {
    console.error('❌ Create PRN administration error:', err);
    res.status(400).json({ message: err.message || 'Failed to create PRN administration' });
  }
});

// Get upcoming medication reminders for nurse
router.get('/reminders', authorizeRoles('NURSE', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get nurse ID from user ID
    const [nurse] = await db
      .select()
      .from(nurses)
      .where(eq(nurses.userId, req.user.id))
      .limit(1);

    if (!nurse) {
      return res.status(404).json({ message: 'Nurse profile not found' });
    }

    const hoursAhead = req.query.hoursAhead ? +req.query.hoursAhead : 2;
    const reminders = await medicationAdminService.getUpcomingMedicationReminders(nurse.id, hoursAhead);
    res.json(reminders);
  } catch (err: any) {
    console.error('❌ Get medication reminders error:', err);
    res.status(400).json({ message: err.message || 'Failed to fetch medication reminders' });
  }
});

export default router;




