// server/routes/doctors.routes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';
import * as doctorsService from '../services/doctors.service';

const router = Router();

// Get available doctors
router.get('/available', async (_req, res) => {
  try {
    const availableDoctors = await doctorsService.getAvailableDoctors();
    res.json(availableDoctors);
  } catch (err) {
    console.error('Get available doctors error:', err);
    res.status(500).json({ message: 'Failed to fetch available doctors' });
  }
});

// Get doctors by hospital
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const hospitalId = +req.params.hospitalId;
    
    if (!hospitalId || isNaN(hospitalId) || hospitalId <= 0) {
      console.error(`❌ Invalid hospitalId in route: ${req.params.hospitalId}`);
      return res.status(400).json({ message: 'Invalid hospital ID' });
    }
    
    const doctors = await doctorsService.getDoctorsByHospital(hospitalId);
    res.json(doctors);
  } catch (err: any) {
    console.error('❌ Get doctors by hospital error:', err);
    console.error('❌ Error stack:', err?.stack);
    res.status(500).json({ 
      message: 'Failed to fetch doctors',
      error: err?.message || 'Unknown error'
    });
  }
});

// Get doctors by specialty
router.get('/specialty/:specialty', async (req, res) => {
  try {
    const doctors = await doctorsService.getDoctorsBySpecialty(req.params.specialty);
    res.json(doctors);
  } catch (err) {
    console.error('Get doctors by specialty error:', err);
    res.status(500).json({ message: 'Failed to fetch doctors' });
  }
});

// Get doctor profile (MUST be before /:doctorId route to avoid route conflict)
// This route must come before any routes with /:doctorId parameter
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const doctorProfile = await doctorsService.getDoctorByUserId(user.id);
    
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    res.json(doctorProfile);
  } catch (error: any) {
    console.error('❌ Doctor profile error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch doctor profile' });
  }
});

// Search doctors
router.get('/search/:query', async (req, res) => {
  try {
    const doctors = await doctorsService.searchDoctors(req.params.query);
    res.json(doctors);
  } catch (err) {
    console.error('Search doctors error:', err);
    res.status(500).json({ message: 'Failed to search doctors' });
  }
});

// Get all doctors
router.get('/', async (_req, res) => {
  try {
    const doctors = await doctorsService.getAllDoctors();
    res.json(doctors);
  } catch (err) {
    console.error('Get all doctors error:', err);
    res.status(500).json({ message: 'Failed to fetch doctors' });
  }
});

// Create new doctor
router.post('/', async (req, res) => {
  try {
    const doctor = await doctorsService.createDoctor(req.body);
    res.status(201).json(doctor);
  } catch (err) {
    console.error('Create doctor error:', err);
    res.status(400).json({ message: 'Failed to create doctor' });
  }
});

// POST /doctors/register - Alternative registration endpoint
router.post('/register', async (req, res) => {
  try {
    const doctor = await doctorsService.createDoctor(req.body);
    res.status(201).json(doctor);
  } catch (err) {
    console.error('Register doctor error:', err);
    res.status(400).json({ message: 'Failed to register doctor' });
  }
});

// Update doctor profile
router.patch('/:doctorId', async (req, res) => {
  try {
    const doctorId = Number(req.params.doctorId);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ message: 'Invalid doctor id' });
    }

    const doctor = await doctorsService.updateDoctorProfile(doctorId, req.body);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json(doctor);
  } catch (err) {
    console.error('Update doctor error:', err);
    res.status(400).json({ message: 'Failed to update doctor' });
  }
});

// Verify doctor
router.patch('/:doctorId/verify', async (req, res) => {
  try {
    const doctorId = Number(req.params.doctorId);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ message: 'Invalid doctor id' });
    }

    const doctor = await doctorsService.verifyDoctor(doctorId);
    if (!doctor || doctor.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json(doctor);
  } catch (err) {
    console.error('Verify doctor error:', err);
    res.status(400).json({ message: 'Failed to verify doctor' });
  }
});

// Update doctor availability
router.patch('/:doctorId/availability', async (req, res) => {
  try {
    const doctorId = Number(req.params.doctorId);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ message: 'Invalid doctor id' });
    }

    const { isAvailable } = req.body;
    const doctor = await doctorsService.updateDoctorAvailability(doctorId, isAvailable);
    if (!doctor || doctor.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json(doctor);
  } catch (err) {
    console.error('Update doctor availability error:', err);
    res.status(400).json({ message: 'Failed to update doctor availability' });
  }
});

// Get doctor appointments
router.get('/:doctorId/appointments', async (req, res) => {
  try {
    const doctorId = Number(req.params.doctorId);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ message: 'Invalid doctor id' });
    }

    const appointments = await doctorsService.getDoctorAppointments(doctorId);
    res.json(appointments);
  } catch (err) {
    console.error('Get doctor appointments error:', err);
    res.status(500).json({ message: 'Failed to fetch doctor appointments' });
  }
});

// Get doctor statistics
router.get('/:doctorId/stats', async (req, res) => {
  try {
    const doctorId = Number(req.params.doctorId);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ message: 'Invalid doctor id' });
    }

    const stats = await doctorsService.getDoctorStats(doctorId);
    res.json(stats);
  } catch (err) {
    console.error('Get doctor stats error:', err);
    res.status(500).json({ message: 'Failed to fetch doctor statistics' });
  }
});

// Get doctor by ID (MUST be last route - catch-all for numeric IDs only)
router.get('/:doctorId', async (req, res) => {
  // Explicitly skip known routes that should be handled elsewhere
  const knownRoutes = ['profile', 'available', 'search', 'register', 'specialty', 'hospital'];
  if (knownRoutes.includes(req.params.doctorId)) {
    console.warn(`[doctors.routes] Route /${req.params.doctorId} should be handled by a specific route, not /:doctorId`);
    return res.status(404).json({ message: 'Route not found' });
  }
  
  try {
    const doctorId = Number(req.params.doctorId);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      console.warn(`[doctors.routes] Invalid doctor id param received`, {
        raw: req.params.doctorId,
        parsed: doctorId,
        path: req.originalUrl,
      });
      return res.status(400).json({ message: 'Invalid doctor id' });
    }

    const doctor = await doctorsService.getDoctorById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json(doctor);
  } catch (err: any) {
    console.error('❌ Get doctor error:', err);
    console.error('❌ Error message:', err?.message);
    console.error('❌ Error stack:', err?.stack);
    res.status(500).json({ 
      message: 'Failed to fetch doctor',
      error: err?.message || 'Unknown error'
    });
  }
});

export default router;