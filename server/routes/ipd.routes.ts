import { Router } from 'express';
import * as ipdService from '../services/ipd.service';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { receptionists, hospitals, doctors } from '../../shared/schema';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Helper to get hospital ID
const getHospitalId = async (user: any): Promise<number> => {
  const userRole = user.role?.toUpperCase();
  console.log(`🔍 getHospitalId - User role: ${user.role} (normalized: ${userRole}), User ID: ${user.id}`);
  
  if (userRole === 'RECEPTIONIST') {
    const receptionist = await db
      .select()
      .from(receptionists)
      .where(eq(receptionists.userId, user.id))
      .limit(1);
    if (receptionist.length === 0) {
      throw new Error('Receptionist not found');
    }
    return receptionist[0].hospitalId;
  } else if (userRole === 'ADMIN' || userRole === 'HOSPITAL') {
    const hospital = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.userId, user.id))
      .limit(1);
    if (hospital.length === 0) {
      throw new Error('Hospital not found');
    }
    return hospital[0].id;
  } else if (userRole === 'DOCTOR') {
    console.log(`🔍 getHospitalId - Checking DOCTOR role, user ID: ${user.id}`);
    const doctor = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, user.id))
      .limit(1);
    console.log(`🔍 getHospitalId - Doctor query result:`, doctor.length > 0 ? { id: doctor[0].id, hospitalId: doctor[0].hospitalId } : 'not found');
    if (doctor.length === 0) {
      throw new Error('Doctor not found');
    }
    if (!doctor[0].hospitalId) {
      throw new Error('Doctor not associated with a hospital');
    }
    console.log(`✅ getHospitalId - Returning hospital ID: ${doctor[0].hospitalId}`);
    return doctor[0].hospitalId;
  }
  console.log(`❌ getHospitalId - Unauthorized: role=${user.role}, id=${user.id}`);
  throw new Error('Unauthorized');
};

// Floors
router.post('/floors', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req.user);
    const { floorNumber, floorName, description } = req.body;

    if (floorNumber === undefined) {
      return res.status(400).json({ message: 'floorNumber is required' });
    }

    const floor = await ipdService.createFloor({ hospitalId, floorNumber, floorName, description });
    res.json(floor);
  } catch (err: any) {
    console.error('❌ Create floor error:', err);
    res.status(400).json({ message: err.message || 'Failed to create floor' });
  }
});

router.get('/floors', async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req.user);
    const floors = await ipdService.getFloors(hospitalId);
    res.json(floors);
  } catch (err: any) {
    console.error('❌ Get floors error:', err);
    res.status(400).json({ message: err.message || 'Failed to get floors' });
  }
});

// Wards
router.post('/wards', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req.user);
    const { floorId, name, type, genderPolicy, capacity, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'name and type are required' });
    }

    const ward = await ipdService.createWard({ hospitalId, floorId, name, type, genderPolicy, capacity, description });
    res.json(ward);
  } catch (err: any) {
    console.error('❌ Create ward error:', err);
    res.status(400).json({ message: err.message || 'Failed to create ward' });
  }
});

router.get('/wards', async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req.user);
    const { floorId } = req.query;
    const wards = await ipdService.getWards(hospitalId, floorId ? +floorId : undefined);
    res.json(wards);
  } catch (err: any) {
    console.error('❌ Get wards error:', err);
    res.status(400).json({ message: err.message || 'Failed to get wards' });
  }
});

// Rooms
router.post('/rooms', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { wardId, roomNumber, roomName, category, capacity, amenities } = req.body;

    if (!wardId || !roomNumber || !category) {
      return res.status(400).json({ message: 'wardId, roomNumber, and category are required' });
    }

    const room = await ipdService.createRoom({ wardId, roomNumber, roomName, category, capacity, amenities });
    res.json(room);
  } catch (err: any) {
    console.error('❌ Create room error:', err);
    res.status(400).json({ message: err.message || 'Failed to create room' });
  }
});

router.get('/rooms/:wardId', async (req: AuthenticatedRequest, res) => {
  try {
    const { wardId } = req.params;
    const rooms = await ipdService.getRooms(+wardId);
    res.json(rooms);
  } catch (err: any) {
    console.error('❌ Get rooms error:', err);
    res.status(400).json({ message: err.message || 'Failed to get rooms' });
  }
});

router.patch('/rooms/:roomId', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { roomId } = req.params;
    const { wardId, roomNumber, roomName, category, capacity, amenities } = req.body;

    const room = await ipdService.updateRoom(+roomId, {
      wardId,
      roomNumber,
      roomName,
      category,
      capacity,
      amenities,
    });
    res.json(room);
  } catch (err: any) {
    console.error('❌ Update room error:', err);
    res.status(400).json({ message: err.message || 'Failed to update room' });
  }
});

// Beds
router.post('/beds', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { roomId, bedNumber, bedName, bedType, equipment, notes } = req.body;

    if (!roomId || !bedNumber) {
      return res.status(400).json({ message: 'roomId and bedNumber are required' });
    }

    const bed = await ipdService.createBed({ roomId, bedNumber, bedName, bedType, equipment, notes });
    res.json(bed);
  } catch (err: any) {
    console.error('❌ Create bed error:', err);
    res.status(400).json({ message: err.message || 'Failed to create bed' });
  }
});

router.get('/beds/available', async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req.user);
    const beds = await ipdService.getAvailableBeds(hospitalId);
    res.json(beds);
  } catch (err: any) {
    console.error('❌ Get available beds error:', err);
    res.status(400).json({ message: err.message || 'Failed to get available beds' });
  }
});

router.patch('/beds/:bedId', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { bedId } = req.params;
    const { bedNumber, bedName, bedType, equipment, notes } = req.body;

    const bed = await ipdService.updateBed(+bedId, {
      bedNumber,
      bedName,
      bedType,
      equipment,
      notes,
    });
    res.json(bed);
  } catch (err: any) {
    console.error('❌ Update bed error:', err);
    res.status(400).json({ message: err.message || 'Failed to update bed' });
  }
});

router.patch('/beds/:bedId/status', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { bedId } = req.params;
    const { status, blockedReason, blockedUntil, lastCleanedAt } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    const bed = await ipdService.updateBedStatus(+bedId, status, {
      blockedReason,
      blockedUntil: blockedUntil ? new Date(blockedUntil) : undefined,
      lastCleanedAt: lastCleanedAt ? new Date(lastCleanedAt) : undefined,
    });
    res.json(bed);
  } catch (err: any) {
    console.error('❌ Update bed status error:', err);
    res.status(400).json({ message: err.message || 'Failed to update bed status' });
  }
});

router.patch('/beds/:bedId/clean', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { bedId } = req.params;
    const bed = await ipdService.markBedCleaned(+bedId);
    res.json(bed);
  } catch (err: any) {
    console.error('❌ Mark bed cleaned error:', err);
    res.status(400).json({ message: err.message || 'Failed to mark bed as cleaned' });
  }
});

// Get complete bed structure (hierarchical view)
router.get('/structure', authenticateToken, authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      console.error('❌ Get bed structure: No user in request');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const hospitalId = await getHospitalId(req.user);
    console.log(`🏥 Fetching bed structure for hospital ${hospitalId} (user: ${req.user.id}, role: ${req.user.role})`);
    
    if (!hospitalId) {
      console.error('❌ Get bed structure: No hospital ID found');
      return res.status(400).json({ message: 'Hospital ID not found. Please ensure you are associated with a hospital.' });
    }
    
    const structure = await ipdService.getBedStructure(hospitalId);
    console.log(`✅ Bed structure fetched:`, {
      floors: structure.floors?.length || 0,
      wards: structure.wards?.length || 0,
      rooms: structure.rooms?.length || 0,
      beds: structure.beds?.length || 0,
    });
    res.json(structure);
  } catch (err: any) {
    console.error('❌ Get bed structure error:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(400).json({ 
      message: err.message || 'Failed to get bed structure',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// IPD Encounters
router.post('/encounters', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req.user);
    const { patientId, admittingDoctorId, attendingDoctorId, admissionType, bedId } = req.body;

    if (!patientId || !admissionType || !bedId) {
      return res.status(400).json({ message: 'patientId, admissionType, and bedId are required' });
    }

    const encounter = await ipdService.admitPatient({
      hospitalId,
      patientId,
      admittingDoctorId,
      attendingDoctorId,
      admissionType,
      bedId,
      actorUserId: req.user?.id,
      actorRole: req.user?.role || 'UNKNOWN',
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });

    res.json(encounter);
  } catch (err: any) {
    console.error('❌ Admit patient error:', err);
    res.status(400).json({ message: err.message || 'Failed to admit patient' });
  }
});

router.get('/encounters', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req.user);
    const { patientId, doctorId, status } = req.query;
    console.log('📋 Fetching IPD encounters:', { hospitalId, patientId, doctorId, status });

    const encounters = await ipdService.getIpdEncounters({
      hospitalId,
      patientId: patientId ? +patientId : undefined,
      doctorId: doctorId ? +doctorId : undefined,
      status: status as string | undefined,
    });

    console.log(`✅ Returning ${encounters.length} encounters`);
    if (encounters.length > 0) {
      console.log('Sample encounter patient data:', {
        encounterId: encounters[0].id,
        patient: encounters[0].patient,
        patientUser: encounters[0].patient?.user,
      });
    }

    res.json(encounters);
  } catch (err: any) {
    console.error('❌ Get encounters error:', err);
    res.status(400).json({ message: err.message || 'Failed to get encounters' });
  }
});

router.get('/encounters/:encounterId', async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterId } = req.params;
    const encounter = await ipdService.getIpdEncounterById(+encounterId);
    res.json(encounter);
  } catch (err: any) {
    console.error('❌ Get encounter error:', err);
    res.status(400).json({ message: err.message || 'Failed to get encounter' });
  }
});

router.patch('/encounters/:encounterId/transfer', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterId } = req.params;
    const { newBedId, reason } = req.body;

    if (!newBedId) {
      return res.status(400).json({ message: 'newBedId is required' });
    }

    const encounter = await ipdService.transferPatient({
      encounterId: +encounterId,
      newBedId,
      reason,
      transferredBy: req.user?.id,
      actorUserId: req.user?.id,
      actorRole: req.user?.role || 'UNKNOWN',
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });

    res.json(encounter);
  } catch (err: any) {
    console.error('❌ Transfer patient error:', err);
    res.status(400).json({ message: err.message || 'Failed to transfer patient' });
  }
});

router.patch('/encounters/:encounterId/transfer-doctor', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterId } = req.params;
    const { newAttendingDoctorId, reason } = req.body;

    if (!newAttendingDoctorId) {
      return res.status(400).json({ message: 'newAttendingDoctorId is required' });
    }

    const encounter = await ipdService.transferPatientToDoctor({
      encounterId: +encounterId,
      newAttendingDoctorId: +newAttendingDoctorId,
      reason,
      actorUserId: req.user?.id,
      actorRole: req.user?.role || 'UNKNOWN',
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });

    res.json(encounter);
  } catch (err: any) {
    console.error('❌ Transfer patient to doctor error:', err);
    res.status(400).json({ message: err.message || 'Failed to transfer patient to doctor' });
  }
});

router.patch('/encounters/:encounterId/discharge', authorizeRoles('ADMIN', 'HOSPITAL', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterId } = req.params;
    const { dischargeSummaryText, status } = req.body;

    if (!dischargeSummaryText) {
      return res.status(400).json({ message: 'dischargeSummaryText is required' });
    }

    const encounter = await ipdService.dischargePatient({
      encounterId: +encounterId,
      dischargeSummaryText,
      status: status || 'discharged', // Use provided status or default to 'discharged'
      actorUserId: req.user?.id,
      actorRole: req.user?.role || 'UNKNOWN',
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });

    res.json(encounter);
  } catch (err: any) {
    console.error('❌ Discharge patient error:', err);
    res.status(400).json({ message: err.message || 'Failed to discharge patient' });
  }
});

// Delete endpoints
router.delete('/floors/:floorId', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const { floorId } = req.params;
    const deleted = await ipdService.deleteFloor(+floorId);
    res.json(deleted);
  } catch (err: any) {
    console.error('❌ Delete floor error:', err);
    res.status(400).json({ message: err.message || 'Failed to delete floor' });
  }
});

router.delete('/wards/:wardId', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const { wardId } = req.params;
    const deleted = await ipdService.deleteWard(+wardId);
    res.json(deleted);
  } catch (err: any) {
    console.error('❌ Delete ward error:', err);
    res.status(400).json({ message: err.message || 'Failed to delete ward' });
  }
});

router.delete('/rooms/:roomId', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const { roomId } = req.params;
    const deleted = await ipdService.deleteRoom(+roomId);
    res.json(deleted);
  } catch (err: any) {
    console.error('❌ Delete room error:', err);
    res.status(400).json({ message: err.message || 'Failed to delete room' });
  }
});

router.delete('/beds/:bedId', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const { bedId } = req.params;
    const deleted = await ipdService.deleteBed(+bedId);
    res.json(deleted);
  } catch (err: any) {
    console.error('❌ Delete bed error:', err);
    res.status(400).json({ message: err.message || 'Failed to delete bed' });
  }
});

export default router;

