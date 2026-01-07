// server/routes/pharmacists.routes.ts
import { Router } from 'express';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import * as pharmacistsService from '../services/pharmacists.service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get pharmacist profile (for current user)
router.get('/profile', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const pharmacist = await pharmacistsService.getPharmacistByUserId(req.user.id);

    if (!pharmacist) {
      return res.status(404).json({
        message: 'Pharmacist profile not found. Please complete your registration.',
        needsOnboarding: true
      });
    }

    res.json(pharmacist);
  } catch (err: any) {
    console.error('❌ Get pharmacist profile error:', err);
    res.status(500).json({
      message: 'Failed to fetch pharmacist profile',
      error: err.message
    });
  }
});

// Get all pharmacists (admin only)
router.get('/', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const pharmacists = await pharmacistsService.getAllPharmacists();
    res.json(pharmacists);
  } catch (err: any) {
    console.error('❌ Get all pharmacists error:', err);
    res.status(500).json({ message: 'Failed to fetch pharmacists' });
  }
});

// Get pharmacists by hospital
router.get('/hospital/:hospitalId', async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = +req.params.hospitalId;

    if (!hospitalId || isNaN(hospitalId) || hospitalId <= 0) {
      return res.status(400).json({ message: 'Invalid hospital ID' });
    }

    const pharmacists = await pharmacistsService.getPharmacistsByHospital(hospitalId);
    res.json(pharmacists);
  } catch (err: any) {
    console.error('❌ Get pharmacists by hospital error:', err);
    res.status(500).json({ message: 'Failed to fetch pharmacists' });
  }
});

// Get pharmacist by ID
router.get('/:pharmacistId', async (req: AuthenticatedRequest, res) => {
  try {
    const pharmacistId = +req.params.pharmacistId;

    if (!pharmacistId || isNaN(pharmacistId) || pharmacistId <= 0) {
      return res.status(400).json({ message: 'Invalid pharmacist ID' });
    }

    const pharmacist = await pharmacistsService.getPharmacistById(pharmacistId);

    if (!pharmacist) {
      return res.status(404).json({ message: 'Pharmacist not found' });
    }

    res.json(pharmacist);
  } catch (err: any) {
    console.error('❌ Get pharmacist by ID error:', err);
    res.status(500).json({ message: 'Failed to fetch pharmacist' });
  }
});

// Create pharmacist profile
router.post('/', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const {
      userId,
      hospitalId,
      pharmacyDegree,
      licenseNumber,
      specialization,
      experience,
      shiftType,
      workingHours,
      pharmacyType,
      languages,
      certifications,
      bio,
    } = req.body;

    if (!userId || !hospitalId || !pharmacyDegree || !licenseNumber) {
      return res.status(400).json({
        message: 'Missing required fields: userId, hospitalId, pharmacyDegree, licenseNumber'
      });
    }

    const pharmacist = await pharmacistsService.createPharmacist({
      userId,
      hospitalId,
      pharmacyDegree,
      licenseNumber,
      specialization,
      experience,
      shiftType,
      workingHours,
      pharmacyType,
      languages,
      certifications,
      bio,
    });

    res.status(201).json(pharmacist);
  } catch (err: any) {
    console.error('❌ Create pharmacist error:', err);

    // Handle duplicate license number
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      return res.status(409).json({ message: 'License number already exists' });
    }

    res.status(500).json({
      message: 'Failed to create pharmacist profile',
      error: err.message
    });
  }
});

// Update pharmacist profile
router.patch('/:pharmacistId', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const pharmacistId = +req.params.pharmacistId;

    if (!pharmacistId || isNaN(pharmacistId) || pharmacistId <= 0) {
      return res.status(400).json({ message: 'Invalid pharmacist ID' });
    }

    const updates: any = {};

    // Handle other fields
    const allowedFields = [
      'pharmacyDegree', 'licenseNumber', 'specialization', 'experience',
      'shiftType', 'workingHours', 'pharmacyType', 'languages', 'certifications', 'bio', 'isAvailable'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const pharmacist = await pharmacistsService.updatePharmacistProfile(pharmacistId, updates);

    if (!pharmacist) {
      return res.status(404).json({ message: 'Pharmacist not found' });
    }

    res.json(pharmacist);
  } catch (err: any) {
    console.error('❌ Update pharmacist error:', err);
    res.status(500).json({
      message: 'Failed to update pharmacist profile',
      error: err.message
    });
  }
});

// Update pharmacist availability
router.patch('/:pharmacistId/availability', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const pharmacistId = +req.params.pharmacistId;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ message: 'isAvailable must be a boolean' });
    }

    const pharmacist = await pharmacistsService.updatePharmacistAvailability(pharmacistId, isAvailable);

    if (!pharmacist) {
      return res.status(404).json({ message: 'Pharmacist not found' });
    }

    res.json(pharmacist);
  } catch (err: any) {
    console.error('❌ Update pharmacist availability error:', err);
    res.status(500).json({
      message: 'Failed to update pharmacist availability',
      error: err.message
    });
  }
});

// Search pharmacists
router.get('/search/:query', async (req: AuthenticatedRequest, res) => {
  try {
    const query = req.params.query;
    const { hospitalId } = req.query;


    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const pharmacists = await pharmacistsService.searchPharmacists(
      query,
      hospitalId ? +hospitalId : undefined
    );

    res.json(pharmacists);
  } catch (err: any) {
    console.error('❌ Search pharmacists error:', err);
    res.status(500).json({
      message: 'Failed to search pharmacists',
      error: err.message
    });
  }
});

export default router;
