import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import * as chargesService from '../services/hospital-charges.service';
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
 * Get all charges for a hospital
 * GET /api/hospital-charges
 */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST', 'DOCTOR'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      
      if (!hospitalId) {
        return res.status(400).json({ message: 'Hospital ID not found' });
      }

      const charges = await chargesService.getHospitalCharges(hospitalId, {
        chargeType: req.query.chargeType as string | undefined,
        chargeCategory: req.query.chargeCategory as string | undefined,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      });

      res.json(charges);
    } catch (error: any) {
      console.error('❌ Get hospital charges error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch charges' });
    }
  }
);

/**
 * Get bed type pricing for a hospital
 * GET /api/hospital-charges/bed-pricing
 */
router.get(
  '/bed-pricing',
  authenticateToken,
  authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST', 'DOCTOR'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      
      if (!hospitalId) {
        return res.status(400).json({ message: 'Hospital ID not found' });
      }

      const pricing = await chargesService.getBedTypePricing(hospitalId);
      res.json(pricing);
    } catch (error: any) {
      console.error('❌ Get bed pricing error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch bed pricing' });
    }
  }
);

/**
 * Get all charges for an IPD encounter
 * GET /api/hospital-charges/encounter/:encounterId
 */
router.get(
  '/encounter/:encounterId',
  authenticateToken,
  authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { encounterId } = req.params;
      
      if (!encounterId || isNaN(+encounterId)) {
        return res.status(400).json({ message: 'Invalid encounter ID' });
      }

      const charges = await chargesService.getEncounterCharges(+encounterId);
      res.json(charges);
    } catch (error: any) {
      console.error('❌ Get encounter charges error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch encounter charges' });
    }
  }
);

export default router;
