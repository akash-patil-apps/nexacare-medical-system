import { Router } from 'express';
import * as queueService from '../services/queue.service';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { receptionists, hospitals } from '../../shared/schema';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Check-in to queue
router.post('/check-in', authorizeRoles('RECEPTIONIST', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'appointmentId is required' });
    }

    // Get receptionist/hospital info
    let hospitalId: number;
    if (req.user?.role === 'RECEPTIONIST') {
      const receptionist = await db
        .select()
        .from(receptionists)
        .where(eq(receptionists.userId, req.user.id))
        .limit(1);
      
      if (receptionist.length === 0) {
        return res.status(403).json({ message: 'Receptionist not found' });
      }
      hospitalId = receptionist[0].hospitalId;
    } else if (req.user?.role === 'ADMIN' || req.user?.role === 'HOSPITAL') {
      const hospital = await db
        .select()
        .from(hospitals)
        .where(eq(hospitals.userId, req.user.id))
        .limit(1);
      
      if (hospital.length === 0) {
        return res.status(403).json({ message: 'Hospital not found' });
      }
      hospitalId = hospital[0].id;
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const queueEntry = await queueService.checkInToQueue(appointmentId, {
      userId: req.user?.id || 0,
      hospitalId,
    });

    res.json(queueEntry);
  } catch (err: any) {
    console.error('❌ Check-in to queue error:', err);
    res.status(400).json({
      message: err.message || 'Failed to check-in to queue',
      error: err.toString(),
    });
  }
});

// Get queue for doctor and date (active queue + confirmed/pending not yet checked in)
router.get('/doctor/:doctorId/date/:date', async (req: AuthenticatedRequest, res) => {
  try {
    const { doctorId, date } = req.params;
    const queueDate = date; // YYYY-MM-DD format

    const [queue, notYetCheckedIn] = await Promise.all([
      queueService.getQueueForDoctor(+doctorId, queueDate),
      queueService.getNotYetCheckedInForDoctor(+doctorId, queueDate),
    ]);
    res.json({ queue, notYetCheckedIn });
  } catch (err: any) {
    console.error('❌ Get queue error:', err);
    res.status(400).json({
      message: err.message || 'Failed to get queue',
      error: err.toString(),
    });
  }
});

// Call token
router.patch('/:queueEntryId/call', authorizeRoles('RECEPTIONIST', 'ADMIN', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueEntryId } = req.params;
    const updated = await queueService.callToken(+queueEntryId);
    res.json(updated);
  } catch (err: any) {
    console.error('❌ Call token error:', err);
    res.status(400).json({
      message: err.message || 'Failed to call token',
      error: err.toString(),
    });
  }
});

// Start consultation
router.patch('/:queueEntryId/start', authorizeRoles('DOCTOR', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueEntryId } = req.params;
    const updated = await queueService.startConsultation(+queueEntryId);
    res.json(updated);
  } catch (err: any) {
    console.error('❌ Start consultation error:', err);
    res.status(400).json({
      message: err.message || 'Failed to start consultation',
      error: err.toString(),
    });
  }
});

// Complete consultation
router.patch('/:queueEntryId/complete', authorizeRoles('DOCTOR', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueEntryId } = req.params;
    const updated = await queueService.completeConsultation(+queueEntryId);
    res.json(updated);
  } catch (err: any) {
    console.error('❌ Complete consultation error:', err);
    res.status(400).json({
      message: err.message || 'Failed to complete consultation',
      error: err.toString(),
    });
  }
});

// Mark no-show
router.patch('/:queueEntryId/no-show', authorizeRoles('RECEPTIONIST', 'ADMIN', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueEntryId } = req.params;
    const updated = await queueService.markNoShow(+queueEntryId);
    res.json(updated);
  } catch (err: any) {
    console.error('❌ Mark no-show error:', err);
    res.status(400).json({
      message: err.message || 'Failed to mark no-show',
      error: err.toString(),
    });
  }
});

// Reorder queue
router.patch('/:queueEntryId/reorder', authorizeRoles('RECEPTIONIST', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueEntryId } = req.params;
    const { position } = req.body;

    if (!position || typeof position !== 'number') {
      return res.status(400).json({ message: 'position (number) is required' });
    }

    const updated = await queueService.reorderQueue(+queueEntryId, position);
    res.json(updated);
  } catch (err: any) {
    console.error('❌ Reorder queue error:', err);
    res.status(400).json({
      message: err.message || 'Failed to reorder queue',
      error: err.toString(),
    });
  }
});

// Skip token (return to waiting)
router.patch('/:queueEntryId/skip', authorizeRoles('RECEPTIONIST', 'ADMIN', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueEntryId } = req.params;
    const updated = await queueService.skipToken(+queueEntryId);
    res.json(updated);
  } catch (err: any) {
    console.error('❌ Skip token error:', err);
    res.status(400).json({
      message: err.message || 'Failed to skip token',
      error: err.toString(),
    });
  }
});

export default router;

