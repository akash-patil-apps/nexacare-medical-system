import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import * as revenueService from '../services/revenue.service';
import type { AuthenticatedRequest } from '../types';
import { db } from '../db';
import { hospitals } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Helper to get hospital ID from user
async function getHospitalId(req: AuthenticatedRequest): Promise<number | null> {
  if (req.user?.role === 'HOSPITAL' || req.user?.role === 'ADMIN') {
    const hospital = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.userId, req.user.id))
      .limit(1);
    return hospital[0]?.id || null;
  }
  return null;
}

/**
 * Get revenue statistics
 * GET /api/revenue/stats
 */
router.get(
  '/stats',
  authenticateToken,
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      
      if (!hospitalId) {
        return res.status(400).json({ message: 'Hospital ID not found' });
      }

      const stats = await revenueService.getRevenueStats(hospitalId);
      res.json(stats);
    } catch (error: any) {
      console.error('❌ Get revenue stats error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch revenue stats' });
    }
  }
);

/**
 * Get detailed revenue transactions
 * GET /api/revenue/transactions
 */
router.get(
  '/transactions',
  authenticateToken,
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      
      if (!hospitalId) {
        return res.status(400).json({ message: 'Hospital ID not found' });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const paymentMethod = req.query.paymentMethod as string | undefined;
      const source = req.query.source as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const transactions = await revenueService.getRevenueTransactions(hospitalId, {
        startDate,
        endDate,
        paymentMethod,
        source,
        limit,
        offset,
      });

      res.json(transactions);
    } catch (error: any) {
      console.error('❌ Get revenue transactions error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch transactions' });
    }
  }
);

/**
 * Get revenue by source
 * GET /api/revenue/by-source
 */
router.get(
  '/by-source',
  authenticateToken,
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      
      if (!hospitalId) {
        return res.status(400).json({ message: 'Hospital ID not found' });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const bySource = await revenueService.getRevenueBySource(hospitalId, startDate, endDate);
      res.json(bySource);
    } catch (error: any) {
      console.error('❌ Get revenue by source error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch revenue by source' });
    }
  }
);

/**
 * Get revenue by payment method
 * GET /api/revenue/by-method
 */
router.get(
  '/by-method',
  authenticateToken,
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      
      if (!hospitalId) {
        return res.status(400).json({ message: 'Hospital ID not found' });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const byMethod = await revenueService.getRevenueByPaymentMethod(hospitalId, startDate, endDate);
      res.json(byMethod);
    } catch (error: any) {
      console.error('❌ Get revenue by method error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch revenue by method' });
    }
  }
);

export default router;
