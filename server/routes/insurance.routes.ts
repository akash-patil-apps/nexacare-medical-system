// server/routes/insurance.routes.ts
import { Router } from 'express';
import { db } from '../db';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import { hospitals, patients } from '../../shared/schema';
import * as insuranceService from '../services/insurance.service';
import { eq } from 'drizzle-orm';

const router = Router();

router.use(authenticateToken);

// Resolve hospitalId for current user (hospital admin / receptionist / doctor / nurse)
async function resolveHospitalId(user: any): Promise<number | null> {
  if (!user) return null;
  const role = String(user.role || '').toUpperCase();

  if (role === 'HOSPITAL' || role === 'ADMIN') {
    const [hospital] = await db.select().from(hospitals).where(eq(hospitals.userId, user.id)).limit(1);
    return hospital?.id ?? null;
  }

  return null;
}

// ===== Insurance Providers =====

// List providers (hospital/admin)
router.get(
  '/providers',
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await resolveHospitalId(req.user);
      const providers = await insuranceService.getInsuranceProviders({
        hospitalId: hospitalId || undefined,
        isActive: true,
      });
      res.json(providers);
    } catch (err: any) {
      console.error('❌ Get insurance providers error:', err);
      res.status(400).json({ message: err.message || 'Failed to fetch insurance providers' });
    }
  },
);

// Create provider (hospital/admin)
router.post(
  '/providers',
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await resolveHospitalId(req.user);
      const { name, type, contactEmail, contactPhone, address, notes } = req.body || {};

      if (!name) {
        return res.status(400).json({ message: 'name is required' });
      }

      const provider = await insuranceService.createInsuranceProvider({
        hospitalId: hospitalId || null,
        name,
        type: type || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        notes: notes || null,
        isActive: true,
      } as any);

      res.status(201).json(provider);
    } catch (err: any) {
      console.error('❌ Create insurance provider error:', err);
      res.status(400).json({ message: err.message || 'Failed to create insurance provider' });
    }
  },
);

// Update provider (activate/deactivate, edit basic info)
router.patch(
  '/providers/:id',
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { name, type, contactEmail, contactPhone, address, notes, isActive } = req.body || {};

      const provider = await insuranceService.updateInsuranceProvider(Number(id), {
        name,
        type,
        contactEmail,
        contactPhone,
        address,
        notes,
        isActive,
      } as any);

      res.json(provider);
    } catch (err: any) {
      console.error('❌ Update insurance provider error:', err);
      res.status(400).json({ message: err.message || 'Failed to update insurance provider' });
    }
  },
);

// ===== Patient Policies =====

// Get policies for a patient (hospital/admin) by patientId
router.get(
  '/patients/:patientId/policies',
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params;
      const hospitalId = await resolveHospitalId(req.user);

      const policies = await insuranceService.getPatientPolicies({
        patientId: Number(patientId),
        hospitalId: hospitalId || undefined,
      });

      res.json(policies);
    } catch (err: any) {
      console.error('❌ Get patient insurance policies error:', err);
      res.status(400).json({ message: err.message || 'Failed to fetch patient insurance policies' });
    }
  },
);

// Get policies for current patient (role: PATIENT)
router.get(
  '/my/policies',
  authorizeRoles('PATIENT'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Resolve patient id from user
      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.userId, req.user.id))
        .limit(1);

      if (!patient) {
        return res.status(400).json({ message: 'Patient profile not found' });
      }

      const policies = await insuranceService.getPatientPolicies({
        patientId: patient.id,
      });

      res.json(policies);
    } catch (err: any) {
      console.error('❌ Get my insurance policies error:', err);
      res.status(400).json({ message: err.message || 'Failed to fetch insurance policies' });
    }
  },
);

// Create policy for patient (hospital/admin)
router.post(
  '/patients/:patientId/policies',
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params;
      const {
        insuranceProviderId,
        policyNumber,
        policyType,
        coverageType,
        sumInsured,
        validFrom,
        validTo,
        isPrimary,
      } = req.body || {};

      if (!insuranceProviderId || !policyNumber) {
        return res
          .status(400)
          .json({ message: 'insuranceProviderId and policyNumber are required' });
      }

      const hospitalId = await resolveHospitalId(req.user);

      const policy = await insuranceService.createPatientPolicy({
        patientId: Number(patientId),
        hospitalId: hospitalId || null,
        insuranceProviderId: Number(insuranceProviderId),
        policyNumber,
        policyType: policyType || null,
        coverageType: coverageType || null,
        sumInsured: sumInsured != null ? String(sumInsured) as any : null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        isPrimary: !!isPrimary,
        createdAt: new Date(),
      } as any);

      res.status(201).json(policy);
    } catch (err: any) {
      console.error('❌ Create patient insurance policy error:', err);
      res.status(400).json({ message: err.message || 'Failed to create insurance policy' });
    }
  },
);

// ===== Preauths =====

router.post(
  '/preauths',
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { encounterId, patientId, insurancePolicyId, estimatedAmount, referenceNumber, remarks } =
        req.body || {};

      if (!encounterId || !patientId) {
        return res.status(400).json({ message: 'encounterId and patientId are required' });
      }

      const hospitalId = await resolveHospitalId(req.user);
      if (!hospitalId) {
        return res.status(400).json({ message: 'Hospital not found' });
      }

      const preauth = await insuranceService.createInsurancePreauth({
        encounterId: Number(encounterId),
        hospitalId,
        patientId: Number(patientId),
        insurancePolicyId: insurancePolicyId ? Number(insurancePolicyId) : undefined,
        estimatedAmount,
        referenceNumber,
        remarks,
      });

      res.status(201).json(preauth);
    } catch (err: any) {
      console.error('❌ Create insurance preauth error:', err);
      res.status(400).json({ message: err.message || 'Failed to create insurance preauth' });
    }
  },
);

router.patch(
  '/preauths/:id/status',
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { status, approvedAmount, remarks } = req.body || {};

      if (!status) {
        return res.status(400).json({ message: 'status is required' });
      }

      const preauth = await insuranceService.updateInsurancePreauthStatus(Number(id), {
        status,
        approvedAmount,
        remarks,
      });

      res.json(preauth);
    } catch (err: any) {
      console.error('❌ Update insurance preauth status error:', err);
      res.status(400).json({ message: err.message || 'Failed to update preauth status' });
    }
  },
);

// ===== Claims =====

router.post(
  '/claims',
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { encounterId, patientId, insurancePolicyId, claimNumber, submittedAmount } = req.body || {};

      if (!patientId) {
        return res.status(400).json({ message: 'patientId is required' });
      }

      const hospitalId = await resolveHospitalId(req.user);
      if (!hospitalId) {
        return res.status(400).json({ message: 'Hospital not found' });
      }

      const claim = await insuranceService.createInsuranceClaim({
        encounterId: encounterId ? Number(encounterId) : undefined,
        hospitalId,
        patientId: Number(patientId),
        insurancePolicyId: insurancePolicyId ? Number(insurancePolicyId) : undefined,
        claimNumber,
        submittedAmount,
      });

      res.status(201).json(claim);
    } catch (err: any) {
      console.error('❌ Create insurance claim error:', err);
      res.status(400).json({ message: err.message || 'Failed to create insurance claim' });
    }
  },
);

router.patch(
  '/claims/:id',
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { status, approvedAmount, rejectionReason, paidAt } = req.body || {};

      const claim = await insuranceService.updateInsuranceClaim(Number(id), {
        status,
        approvedAmount,
        rejectionReason,
        paidAt: paidAt ? new Date(paidAt) : undefined,
      });

      res.json(claim);
    } catch (err: any) {
      console.error('❌ Update insurance claim error:', err);
      res.status(400).json({ message: err.message || 'Failed to update insurance claim' });
    }
  },
);

export default router;

