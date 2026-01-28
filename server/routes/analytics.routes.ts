// server/routes/analytics.routes.ts
import { Router } from 'express';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import * as analyticsService from '../services/analytics.service';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { hospitals, receptionists, doctors } from '../../shared/schema';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Helper to get hospital ID from user
 */
const getHospitalId = async (req: AuthenticatedRequest): Promise<number> => {
  const user = req.user;
  if (!user) {
    throw new Error('User not authenticated');
  }

  if (user.role?.toUpperCase() === 'HOSPITAL' || user.role?.toUpperCase() === 'ADMIN') {
    const [hospital] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.userId, user.id))
      .limit(1);
    if (hospital) return hospital.id;
  } else if (user.role?.toUpperCase() === 'RECEPTIONIST') {
    const [receptionist] = await db
      .select()
      .from(receptionists)
      .where(eq(receptionists.userId, user.id))
      .limit(1);
    if (receptionist?.hospitalId) return receptionist.hospitalId;
  } else if (user.role?.toUpperCase() === 'DOCTOR') {
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, user.id))
      .limit(1);
    if (doctor?.hospitalId) return doctor.hospitalId;
  }

  throw new Error('Hospital ID not found');
};

/**
 * GET /api/analytics/revenue-trend
 * Get revenue trend analysis
 */
router.get('/revenue-trend', authorizeRoles('HOSPITAL', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const { dateFrom, dateTo, period = 'daily' } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: 'dateFrom and dateTo are required' });
    }

    const trend = await analyticsService.getRevenueTrend({
      hospitalId,
      dateFrom: new Date(dateFrom as string),
      dateTo: new Date(dateTo as string),
      period: period as 'daily' | 'weekly' | 'monthly',
    });

    res.json(trend);
  } catch (err: any) {
    console.error('❌ Get revenue trend error:', err);
    res.status(400).json({
      message: err.message || 'Failed to fetch revenue trend',
      error: err.toString(),
    });
  }
});

/**
 * GET /api/analytics/appointment-trend
 * Get appointment trend analysis
 */
router.get('/appointment-trend', authorizeRoles('HOSPITAL', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const { dateFrom, dateTo, period = 'daily' } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: 'dateFrom and dateTo are required' });
    }

    const trend = await analyticsService.getAppointmentTrend({
      hospitalId,
      dateFrom: new Date(dateFrom as string),
      dateTo: new Date(dateTo as string),
      period: period as 'daily' | 'weekly' | 'monthly',
    });

    res.json(trend);
  } catch (err: any) {
    console.error('❌ Get appointment trend error:', err);
    res.status(400).json({
      message: err.message || 'Failed to fetch appointment trend',
      error: err.toString(),
    });
  }
});

/**
 * GET /api/analytics/performance
 * Get comprehensive performance metrics
 */
router.get('/performance', authorizeRoles('HOSPITAL', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const { dateFrom, dateTo, compareWithPrevious = 'true' } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: 'dateFrom and dateTo are required' });
    }

    const metrics = await analyticsService.getPerformanceMetrics({
      hospitalId,
      dateFrom: new Date(dateFrom as string),
      dateTo: new Date(dateTo as string),
      compareWithPrevious: compareWithPrevious === 'true',
    });

    res.json(metrics);
  } catch (err: any) {
    console.error('❌ Get performance metrics error:', err);
    res.status(400).json({
      message: err.message || 'Failed to fetch performance metrics',
      error: err.toString(),
    });
  }
});

/**
 * GET /api/analytics/department-performance
 * Get department-wise performance
 */
router.get('/department-performance', authorizeRoles('HOSPITAL', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: 'dateFrom and dateTo are required' });
    }

    const performance = await analyticsService.getDepartmentPerformance({
      hospitalId,
      dateFrom: new Date(dateFrom as string),
      dateTo: new Date(dateTo as string),
    });

    res.json(performance);
  } catch (err: any) {
    console.error('❌ Get department performance error:', err);
    res.status(400).json({
      message: err.message || 'Failed to fetch department performance',
      error: err.toString(),
    });
  }
});

export default router;
