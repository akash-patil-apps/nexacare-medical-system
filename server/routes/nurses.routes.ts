// server/routes/nurses.routes.ts
import { Router } from 'express';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import * as nursesService from '../services/nurses.service';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users } from '../../shared/schema';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get nurse profile (for current user)
router.get('/profile', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log(`👩‍⚕️ Fetching nurse profile for user: ${req.user.id}`);
    const nurse = await nursesService.getNurseByUserId(req.user.id);

    if (!nurse) {
      console.log(`❌ Nurse profile not found for user: ${req.user.id}`);
      return res.status(404).json({
        message: 'Nurse profile not found. Please complete your registration.',
        needsOnboarding: true
      });
    }

    console.log(`✅ Nurse profile found: ${nurse.nurse.id}`);
    res.json(nurse);
  } catch (err: any) {
    console.error('❌ Get nurse profile error:', err);
    res.status(500).json({
      message: 'Failed to fetch nurse profile',
      error: err.message
    });
  }
});

// Get all nurses (admin only)
router.get('/', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('👩‍⚕️ Fetching all nurses');
    const nurses = await nursesService.getAllNurses();
    console.log(`✅ Returning ${nurses.length} nurses`);
    res.json(nurses);
  } catch (err: any) {
    console.error('❌ Get all nurses error:', err);
    res.status(500).json({ message: 'Failed to fetch nurses' });
  }
});

// Get nurses by hospital
router.get('/hospital/:hospitalId', async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = +req.params.hospitalId;
    console.log(`🏥 Fetching nurses for hospital: ${hospitalId}`);

    if (!hospitalId || isNaN(hospitalId) || hospitalId <= 0) {
      return res.status(400).json({ message: 'Invalid hospital ID' });
    }

    const nurses = await nursesService.getNursesByHospital(hospitalId);
    console.log(`✅ Returning ${nurses.length} nurses for hospital ${hospitalId}`);
    res.json(nurses);
  } catch (err: any) {
    console.error('❌ Get nurses by hospital error:', err);
    res.status(500).json({ message: 'Failed to fetch nurses' });
  }
});

// Get nurse by ID
router.get('/:nurseId', async (req: AuthenticatedRequest, res) => {
  try {
    const nurseId = +req.params.nurseId;
    console.log(`👩‍⚕️ Fetching nurse by ID: ${nurseId}`);

    if (!nurseId || isNaN(nurseId) || nurseId <= 0) {
      return res.status(400).json({ message: 'Invalid nurse ID' });
    }

    const nurse = await nursesService.getNurseById(nurseId);

    if (!nurse) {
      return res.status(404).json({ message: 'Nurse not found' });
    }

    res.json(nurse);
  } catch (err: any) {
    console.error('❌ Get nurse by ID error:', err);
    res.status(500).json({ message: 'Failed to fetch nurse' });
  }
});

// Create nurse profile
router.post('/', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const {
      userId,
      hospitalId,
      nursingDegree,
      licenseNumber,
      specialization,
      experience,
      shiftType,
      workingHours,
      wardPreferences,
      skills,
      languages,
      certifications,
      bio,
    } = req.body;

    if (!userId || !hospitalId || !nursingDegree || !licenseNumber) {
      return res.status(400).json({
        message: 'Missing required fields: userId, hospitalId, nursingDegree, licenseNumber'
      });
    }

    console.log(`👩‍⚕️ Creating nurse profile for user: ${userId}`);
    const nurse = await nursesService.createNurse({
      userId,
      hospitalId,
      nursingDegree,
      licenseNumber,
      specialization,
      experience,
      shiftType,
      workingHours,
      wardPreferences: wardPreferences ? JSON.stringify(wardPreferences) : null,
      skills: skills ? JSON.stringify(skills) : null,
      languages,
      certifications,
      bio,
    });

    console.log(`✅ Nurse profile created: ${nurse.id}`);
    res.status(201).json(nurse);
  } catch (err: any) {
    console.error('❌ Create nurse error:', err);

    // Handle duplicate license number
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      return res.status(409).json({ message: 'License number already exists' });
    }

    res.status(500).json({
      message: 'Failed to create nurse profile',
      error: err.message
    });
  }
});

// Update nurse profile
router.patch('/:nurseId', authorizeRoles('ADMIN', 'HOSPITAL', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const nurseId = +req.params.nurseId;
    console.log(`👩‍⚕️ Updating nurse profile: ${nurseId}`);

    if (!nurseId || isNaN(nurseId) || nurseId <= 0) {
      return res.status(400).json({ message: 'Invalid nurse ID' });
    }

    const updates: any = {};

    // Handle JSON fields
    if (req.body.wardPreferences) {
      updates.wardPreferences = JSON.stringify(req.body.wardPreferences);
    }
    if (req.body.skills) {
      updates.skills = JSON.stringify(req.body.skills);
    }

    // Handle other fields
    const allowedFields = [
      'nursingDegree', 'licenseNumber', 'specialization', 'experience',
      'shiftType', 'workingHours', 'languages', 'certifications', 'bio', 'isAvailable'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const nurse = await nursesService.updateNurseProfile(nurseId, updates);

    if (!nurse) {
      return res.status(404).json({ message: 'Nurse not found' });
    }

    console.log(`✅ Nurse profile updated: ${nurseId}`);
    res.json(nurse);
  } catch (err: any) {
    console.error('❌ Update nurse error:', err);
    res.status(500).json({
      message: 'Failed to update nurse profile',
      error: err.message
    });
  }
});

// Update nurse availability
router.patch('/:nurseId/availability', authorizeRoles('ADMIN', 'HOSPITAL', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const nurseId = +req.params.nurseId;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ message: 'isAvailable must be a boolean' });
    }

    console.log(`👩‍⚕️ Updating nurse availability: ${nurseId} -> ${isAvailable}`);
    const nurse = await nursesService.updateNurseAvailability(nurseId, isAvailable);

    if (!nurse) {
      return res.status(404).json({ message: 'Nurse not found' });
    }

    console.log(`✅ Nurse availability updated`);
    res.json(nurse);
  } catch (err: any) {
    console.error('❌ Update nurse availability error:', err);
    res.status(500).json({
      message: 'Failed to update nurse availability',
      error: err.message
    });
  }
});

// Search nurses
router.get('/search/:query', async (req: AuthenticatedRequest, res) => {
  try {
    const query = req.params.query;
    const { hospitalId } = req.query;

    console.log(`🔍 Searching nurses: "${query}"`, hospitalId ? `in hospital ${hospitalId}` : '');

    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const nurses = await nursesService.searchNurses(
      query,
      hospitalId ? +hospitalId : undefined
    );

    console.log(`✅ Found ${nurses.length} nurses matching "${query}"`);
    res.json(nurses);
  } catch (err: any) {
    console.error('❌ Search nurses error:', err);
    res.status(500).json({
      message: 'Failed to search nurses',
      error: err.message
    });
  }
});

export default router;
