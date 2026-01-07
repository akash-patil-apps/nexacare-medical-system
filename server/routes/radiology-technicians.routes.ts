// server/routes/radiology-technicians.routes.ts
import { Router } from 'express';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import * as radiologyTechniciansService from '../services/radiology-technicians.service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get radiology technician profile (for current user)
router.get('/profile', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log(`🩻 Fetching radiology technician profile for user: ${req.user.id}`);
    const technician = await radiologyTechniciansService.getRadiologyTechnicianByUserId(req.user.id);

    if (!technician) {
      console.log(`❌ Radiology technician profile not found for user: ${req.user.id}`);
      return res.status(404).json({
        message: 'Radiology technician profile not found. Please complete your registration.',
        needsOnboarding: true
      });
    }

    console.log(`✅ Radiology technician profile found: ${technician.technician.id}`);
    res.json(technician);
  } catch (err: any) {
    console.error('❌ Get radiology technician profile error:', err);
    res.status(500).json({
      message: 'Failed to fetch radiology technician profile',
      error: err.message
    });
  }
});

// Get all radiology technicians (admin only)
router.get('/', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    console.log('🩻 Fetching all radiology technicians');
    const technicians = await radiologyTechniciansService.getAllRadiologyTechnicians();
    console.log(`✅ Returning ${technicians.length} radiology technicians`);
    res.json(technicians);
  } catch (err: any) {
    console.error('❌ Get all radiology technicians error:', err);
    res.status(500).json({ message: 'Failed to fetch radiology technicians' });
  }
});

// Get radiology technicians by hospital
router.get('/hospital/:hospitalId', async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = +req.params.hospitalId;
    console.log(`🏥 Fetching radiology technicians for hospital: ${hospitalId}`);

    if (!hospitalId || isNaN(hospitalId) || hospitalId <= 0) {
      return res.status(400).json({ message: 'Invalid hospital ID' });
    }

    const technicians = await radiologyTechniciansService.getRadiologyTechniciansByHospital(hospitalId);
    console.log(`✅ Returning ${technicians.length} radiology technicians for hospital ${hospitalId}`);
    res.json(technicians);
  } catch (err: any) {
    console.error('❌ Get radiology technicians by hospital error:', err);
    res.status(500).json({ message: 'Failed to fetch radiology technicians' });
  }
});

// Get radiology technician by ID
router.get('/:technicianId', async (req: AuthenticatedRequest, res) => {
  try {
    const technicianId = +req.params.technicianId;
    console.log(`🩻 Fetching radiology technician by ID: ${technicianId}`);

    if (!technicianId || isNaN(technicianId) || technicianId <= 0) {
      return res.status(400).json({ message: 'Invalid technician ID' });
    }

    const technician = await radiologyTechniciansService.getRadiologyTechnicianById(technicianId);

    if (!technician) {
      return res.status(404).json({ message: 'Radiology technician not found' });
    }

    res.json(technician);
  } catch (err: any) {
    console.error('❌ Get radiology technician by ID error:', err);
    res.status(500).json({ message: 'Failed to fetch radiology technician' });
  }
});

// Create radiology technician profile
router.post('/', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const {
      userId,
      hospitalId,
      radiologyDegree,
      licenseNumber,
      specialization,
      experience,
      shiftType,
      workingHours,
      modalities,
      languages,
      certifications,
      bio,
    } = req.body;

    if (!userId || !hospitalId || !radiologyDegree || !licenseNumber) {
      return res.status(400).json({
        message: 'Missing required fields: userId, hospitalId, radiologyDegree, licenseNumber'
      });
    }

    console.log(`🩻 Creating radiology technician profile for user: ${userId}`);
    const technician = await radiologyTechniciansService.createRadiologyTechnician({
      userId,
      hospitalId,
      radiologyDegree,
      licenseNumber,
      specialization,
      experience,
      shiftType,
      workingHours,
      modalities,
      languages,
      certifications,
      bio,
    });

    console.log(`✅ Radiology technician profile created: ${technician.id}`);
    res.status(201).json(technician);
  } catch (err: any) {
    console.error('❌ Create radiology technician error:', err);

    // Handle duplicate license number
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      return res.status(409).json({ message: 'License number already exists' });
    }

    res.status(500).json({
      message: 'Failed to create radiology technician profile',
      error: err.message
    });
  }
});

// Update radiology technician profile
router.patch('/:technicianId', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const technicianId = +req.params.technicianId;
    console.log(`🩻 Updating radiology technician profile: ${technicianId}`);

    if (!technicianId || isNaN(technicianId) || technicianId <= 0) {
      return res.status(400).json({ message: 'Invalid technician ID' });
    }

    const updates: any = {};

    // Handle other fields
    const allowedFields = [
      'radiologyDegree', 'licenseNumber', 'specialization', 'experience',
      'shiftType', 'workingHours', 'modalities', 'languages', 'certifications', 'bio', 'isAvailable'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const technician = await radiologyTechniciansService.updateRadiologyTechnicianProfile(technicianId, updates);

    if (!technician) {
      return res.status(404).json({ message: 'Radiology technician not found' });
    }

    console.log(`✅ Radiology technician profile updated: ${technicianId}`);
    res.json(technician);
  } catch (err: any) {
    console.error('❌ Update radiology technician error:', err);
    res.status(500).json({
      message: 'Failed to update radiology technician profile',
      error: err.message
    });
  }
});

// Update radiology technician availability
router.patch('/:technicianId/availability', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const technicianId = +req.params.technicianId;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ message: 'isAvailable must be a boolean' });
    }

    console.log(`🩻 Updating radiology technician availability: ${technicianId} -> ${isAvailable}`);
    const technician = await radiologyTechniciansService.updateRadiologyTechnicianAvailability(technicianId, isAvailable);

    if (!technician) {
      return res.status(404).json({ message: 'Radiology technician not found' });
    }

    console.log(`✅ Radiology technician availability updated`);
    res.json(technician);
  } catch (err: any) {
    console.error('❌ Update radiology technician availability error:', err);
    res.status(500).json({
      message: 'Failed to update radiology technician availability',
      error: err.message
    });
  }
});

// Search radiology technicians
router.get('/search/:query', async (req: AuthenticatedRequest, res) => {
  try {
    const query = req.params.query;
    const { hospitalId } = req.query;

    console.log(`🔍 Searching radiology technicians: "${query}"`, hospitalId ? `in hospital ${hospitalId}` : '');

    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const technicians = await radiologyTechniciansService.searchRadiologyTechnicians(
      query,
      hospitalId ? +hospitalId : undefined
    );

    console.log(`✅ Found ${technicians.length} radiology technicians matching "${query}"`);
    res.json(technicians);
  } catch (err: any) {
    console.error('❌ Search radiology technicians error:', err);
    res.status(500).json({
      message: 'Failed to search radiology technicians',
      error: err.message
    });
  }
});

export default router;
