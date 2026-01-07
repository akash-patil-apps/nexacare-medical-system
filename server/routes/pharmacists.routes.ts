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

    console.log(`💊 Fetching pharmacist profile for user: ${req.user.id}`);
    const pharmacist = await pharmacistsService.getPharmacistByUserId(req.user.id);

    if (!pharmacist) {
      console.log(`❌ Pharmacist profile not found for user: ${req.user.id}`);
      return res.status(404).json({
        message: 'Pharmacist profile not found. Please complete your registration.',
        needsOnboarding: true
      });
    }

    console.log(`✅ Pharmacist profile found: ${pharmacist.pharmacist.id}`);
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
    console.log('💊 Fetching all pharmacists');
    const pharmacists = await pharmacistsService.getAllPharmacists();
    console.log(`✅ Returning ${pharmacists.length} pharmacists`);
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
    console.log(`🏥 Fetching pharmacists for hospital: ${hospitalId}`);

    if (!hospitalId || isNaN(hospitalId) || hospitalId <= 0) {
      return res.status(400).json({ message: 'Invalid hospital ID' });
    }

    const pharmacists = await pharmacistsService.getPharmacistsByHospital(hospitalId);
    console.log(`✅ Returning ${pharmacists.length} pharmacists for hospital ${hospitalId}`);
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
    console.log(`💊 Fetching pharmacist by ID: ${pharmacistId}`);

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

    console.log(`💊 Creating pharmacist profile for user: ${userId}`);
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

    console.log(`✅ Pharmacist profile created: ${pharmacist.id}`);
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
    console.log(`💊 Updating pharmacist profile: ${pharmacistId}`);

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

    console.log(`✅ Pharmacist profile updated: ${pharmacistId}`);
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

    console.log(`💊 Updating pharmacist availability: ${pharmacistId} -> ${isAvailable}`);
    const pharmacist = await pharmacistsService.updatePharmacistAvailability(pharmacistId, isAvailable);

    if (!pharmacist) {
      return res.status(404).json({ message: 'Pharmacist not found' });
    }

    console.log(`✅ Pharmacist availability updated`);
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

    console.log(`🔍 Searching pharmacists: "${query}"`, hospitalId ? `in hospital ${hospitalId}` : '');

    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const pharmacists = await pharmacistsService.searchPharmacists(
      query,
      hospitalId ? +hospitalId : undefined
    );

    console.log(`✅ Found ${pharmacists.length} pharmacists matching "${query}"`);
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
