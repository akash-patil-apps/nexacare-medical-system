import { Router } from 'express';
import * as ipdService from '../services/ipd.service';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { receptionists, hospitals, doctors, nurses, rooms, beds, ipdEncounters } from '../../shared/schema';
import { logAuditEvent } from '../services/audit.service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Helper to get hospital ID
const getHospitalId = async (user: any): Promise<number> => {
  const userRole = user.role?.toUpperCase();
  
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
    const doctor = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, user.id))
      .limit(1);
    if (doctor.length === 0) {
      throw new Error('Doctor not found');
    }
    if (!doctor[0].hospitalId) {
      throw new Error('Doctor not associated with a hospital');
    }
    return doctor[0].hospitalId;
  } else if (userRole === 'NURSE') {
    const nurse = await db
      .select()
      .from(nurses)
      .where(eq(nurses.userId, user.id))
      .limit(1);
    if (nurse.length === 0) {
      throw new Error('Nurse not found');
    }
    if (!nurse[0].hospitalId) {
      throw new Error('Nurse not associated with a hospital');
    }
    return nurse[0].hospitalId;
  }
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

    // Audit: room created
    try {
      const hospitalId = await getHospitalId(req.user);
      await logAuditEvent({
        hospitalId,
        actorUserId: req.user!.id,
        actorRole: req.user!.role || 'UNKNOWN',
        action: 'ROOM_CREATED',
        entityType: 'room',
        entityId: room.id,
        after: {
          wardId,
          roomNumber,
          roomName,
          category,
          capacity,
          amenities,
        },
        summary: `Room ${roomNumber} created in ward ${wardId}`,
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log room creation audit event:', auditError);
    }

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

    // Audit: room updated (store only after state for now)
    try {
      const hospitalId = await getHospitalId(req.user);
      await logAuditEvent({
        hospitalId,
        actorUserId: req.user!.id,
        actorRole: req.user!.role || 'UNKNOWN',
        action: 'ROOM_UPDATED',
        entityType: 'room',
        entityId: room.id,
        after: {
          wardId: room.wardId,
          roomNumber: room.roomNumber,
          roomName: room.roomName,
          category: room.category,
          capacity: room.capacity,
          amenities: room.amenities,
        },
        summary: `Room ${room.roomNumber} updated`,
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log room update audit event:', auditError);
    }

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

    // Audit: bed created by admin/hospital/receptionist
    try {
      const hospitalId = await getHospitalId(req.user);
      await logAuditEvent({
        hospitalId,
        actorUserId: req.user!.id,
        actorRole: req.user!.role || 'UNKNOWN',
        action: 'BED_CREATED',
        entityType: 'bed',
        entityId: bed.id,
        after: {
          roomId,
          bedNumber,
          bedName,
          bedType,
          equipment,
          notes,
        },
        summary: `Bed ${bedNumber} created in room ${roomId}`,
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log bed creation audit event:', auditError);
    }

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

    // Audit: bed updated (non-status fields)
    try {
      const hospitalId = await getHospitalId(req.user);
      await logAuditEvent({
        hospitalId,
        actorUserId: req.user!.id,
        actorRole: req.user!.role || 'UNKNOWN',
        action: 'BED_UPDATED',
        entityType: 'bed',
        entityId: bed.id,
        after: {
          bedNumber: bed.bedNumber,
          bedName: bed.bedName,
          bedType: bed.bedType,
          equipment: bed.equipment,
          notes: bed.notes,
        },
        summary: `Bed ${bed.bedNumber} updated`,
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log bed update audit event:', auditError);
    }

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

    // Fetch current bed state for 'before'
    const [existingBed] = await db
      .select()
      .from(beds)
      .where(eq(beds.id, +bedId))
      .limit(1);

    const bed = await ipdService.updateBedStatus(+bedId, status, {
      blockedReason,
      blockedUntil: blockedUntil ? new Date(blockedUntil) : undefined,
      lastCleanedAt: lastCleanedAt ? new Date(lastCleanedAt) : undefined,
    });

    // Audit: bed status updated
    try {
      const hospitalId = await getHospitalId(req.user);
      await logAuditEvent({
        hospitalId,
        actorUserId: req.user!.id,
        actorRole: req.user!.role || 'UNKNOWN',
        action: 'BED_STATUS_UPDATED',
        entityType: 'bed',
        entityId: bed.id,
        before: existingBed
          ? {
              status: existingBed.status,
              blockedReason: (existingBed as any).blockedReason,
              blockedUntil: (existingBed as any).blockedUntil,
              lastCleanedAt: (existingBed as any).lastCleanedAt,
            }
          : undefined,
        after: {
          status: bed.status,
          blockedReason: (bed as any).blockedReason,
          blockedUntil: (bed as any).blockedUntil,
          lastCleanedAt: (bed as any).lastCleanedAt,
        },
        summary: `Bed ${bed.bedNumber} status changed to ${bed.status}`,
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log bed status update audit event:', auditError);
    }

    res.json(bed);
  } catch (err: any) {
    console.error('❌ Update bed status error:', err);
    res.status(400).json({ message: err.message || 'Failed to update bed status' });
  }
});

router.patch('/beds/:bedId/clean', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { bedId } = req.params;
    // Fetch current bed state for 'before'
    const [existingBed] = await db
      .select()
      .from(beds)
      .where(eq(beds.id, +bedId))
      .limit(1);

    const bed = await ipdService.markBedCleaned(+bedId);

    // Audit: bed cleaned (status implicitly updated via service)
    try {
      const hospitalId = await getHospitalId(req.user);
      await logAuditEvent({
        hospitalId,
        actorUserId: req.user!.id,
        actorRole: req.user!.role || 'UNKNOWN',
        action: 'BED_STATUS_UPDATED',
        entityType: 'bed',
        entityId: bed.id,
        before: existingBed
          ? {
              status: existingBed.status,
              lastCleanedAt: (existingBed as any).lastCleanedAt,
            }
          : undefined,
        after: {
          status: bed.status,
          lastCleanedAt: (bed as any).lastCleanedAt,
        },
        summary: `Bed ${bed.bedNumber} marked as cleaned`,
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log bed cleaned audit event:', auditError);
    }
    res.json(bed);
  } catch (err: any) {
    console.error('❌ Mark bed cleaned error:', err);
    res.status(400).json({ message: err.message || 'Failed to mark bed as cleaned' });
  }
});

// Get complete bed structure (hierarchical view)
router.get('/structure', authenticateToken, authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      console.error('❌ Get bed structure: No user in request');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const hospitalId = await getHospitalId(req.user);
    
    if (!hospitalId) {
      console.error('❌ Get bed structure: No hospital ID found');
      return res.status(400).json({ message: 'Hospital ID not found. Please ensure you are associated with a hospital.' });
    }
    
    const structure = await ipdService.getBedStructure(hospitalId);
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
router.post('/encounters', authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req.user);
    const { patientId, admittingDoctorId, attendingDoctorId, admissionType, bedId, attendantName, attendantMobile } = req.body;

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
      attendantName: attendantName || null,
      attendantMobile: attendantMobile || null,
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
    console.log('📋 Fetching IPD encounters...');
    const startTime = Date.now();
    
    const hospitalId = await getHospitalId(req.user);
    console.log('🏥 Hospital ID:', hospitalId);
    
    const { patientId, doctorId, status, nurse } = req.query;
    console.log('🔍 Query params:', { patientId, doctorId, status, nurse });

    // If nurse=true and user is a nurse, filter by assigned nurse
    let nurseId: number | undefined;
    if (nurse === 'true' && req.user?.role?.toUpperCase() === 'NURSE') {
      const nurseData = await db
        .select()
        .from(nurses)
        .where(eq(nurses.userId, req.user.id))
        .limit(1);
      
      if (nurseData.length > 0) {
        nurseId = nurseData[0].id;
        console.log('👩‍⚕️ Filtering encounters for nurse ID:', nurseId);
      } else {
        console.log('⚠️ Nurse profile not found for user:', req.user.id);
      }
    }

    const encounters = await ipdService.getIpdEncounters({
      hospitalId,
      patientId: patientId ? +patientId : undefined,
      doctorId: doctorId ? +doctorId : undefined,
      nurseId: nurseId,
      status: status as string | undefined,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Fetched ${encounters.length} encounters in ${duration}ms`);

    res.json(encounters);
  } catch (err: any) {
    console.error('❌ Get encounters error:', err);
    console.error('❌ Error stack:', err.stack);
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
    const { dischargeSummaryText, status, autoGenerateSummary } = req.body;

    // dischargeSummaryText is now optional - will auto-generate if not provided
    const encounter = await ipdService.dischargePatient({
      encounterId: +encounterId,
      dischargeSummaryText: dischargeSummaryText || undefined,
      status: status || 'discharged', // Use provided status or default to 'discharged'
      autoGenerateSummary: autoGenerateSummary !== false, // Default to true if not specified
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

// ===== NURSE ASSIGNMENT ENDPOINTS =====
import * as nurseAssignmentService from '../services/nurse-assignment.service';

// Assign nurse to encounter
router.post('/encounters/:encounterId/assign-nurse', authorizeRoles('DOCTOR', 'ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterId } = req.params;
    const { nurseId, reason, shiftType } = req.body;

    if (!nurseId) {
      return res.status(400).json({ message: 'Nurse ID is required' });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const assignment = await nurseAssignmentService.assignNurseToEncounter({
      encounterId: +encounterId,
      nurseId: +nurseId,
      assignedByUserId: req.user.id,
      reason,
      shiftType,
    });

    res.json(assignment);
  } catch (err: any) {
    console.error('❌ Assign nurse error:', err);
    res.status(400).json({ message: err.message || 'Failed to assign nurse' });
  }
});

// Unassign nurse from encounter
router.post('/encounters/:encounterId/unassign-nurse', authorizeRoles('DOCTOR', 'ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterId } = req.params;
    const { nurseId, reason } = req.body;

    if (!nurseId) {
      return res.status(400).json({ message: 'Nurse ID is required' });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const result = await nurseAssignmentService.unassignNurseFromEncounter({
      encounterId: +encounterId,
      nurseId: +nurseId,
      unassignedByUserId: req.user.id,
      reason,
    });

    res.json(result);
  } catch (err: any) {
    console.error('❌ Unassign nurse error:', err);
    res.status(400).json({ message: err.message || 'Failed to unassign nurse' });
  }
});

// Get assignment history for encounter
router.get('/encounters/:encounterId/assignments', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterId } = req.params;
    const history = await nurseAssignmentService.getEncounterAssignmentHistory(+encounterId);
    res.json(history);
  } catch (err: any) {
    console.error('❌ Get assignment history error:', err);
    res.status(400).json({ message: err.message || 'Failed to fetch assignment history' });
  }
});

// ===== MEDICATION ORDER ENDPOINTS =====
import * as medicationOrderService from '../services/medication-order.service';

// Create medication order
router.post('/encounters/:encounterId/medication-orders', authorizeRoles('DOCTOR', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterId } = req.params;
    const {
      medicationName,
      dosage,
      unit,
      route,
      frequency,
      startDate,
      endDate,
      isPrn,
      prnIndication,
      notes,
    } = req.body;

    if (!medicationName || !dosage || !unit || !route || !frequency || !startDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get encounter to get patientId
    const [encounter] = await db
      .select()
      .from(ipdEncounters)
      .where(eq(ipdEncounters.id, +encounterId))
      .limit(1);

    if (!encounter) {
      return res.status(404).json({ message: 'Encounter not found' });
    }

    // Get doctor ID from user
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, req.user!.id))
      .limit(1);

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const order = await medicationOrderService.createMedicationOrder({
      encounterId: +encounterId,
      patientId: encounter.patientId,
      orderedByDoctorId: doctor.id,
      medicationName,
      dosage,
      unit,
      route,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      isPrn: isPrn || false,
      prnIndication,
      notes,
    });

    // Generate schedule for non-PRN medications
    if (!isPrn) {
      const medicationAdminService = await import('../services/medication-administration.service');
      await medicationAdminService.generateMedicationSchedule(order.id);
    }

    res.json(order);
  } catch (err: any) {
    console.error('❌ Create medication order error:', err);
    res.status(400).json({ message: err.message || 'Failed to create medication order' });
  }
});

// Get medication orders for encounter
router.get('/encounters/:encounterId/medication-orders', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterId } = req.params;
    const includeInactive = req.query.includeInactive === 'true';
    const orders = await medicationOrderService.getMedicationOrdersForEncounter(+encounterId, includeInactive);
    res.json(orders);
  } catch (err: any) {
    console.error('❌ Get medication orders error:', err);
    res.status(400).json({ message: err.message || 'Failed to fetch medication orders' });
  }
});

// Stop medication order
router.patch('/medication-orders/:orderId/stop', authorizeRoles('DOCTOR', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const stopped = await medicationOrderService.stopMedicationOrder(+orderId, reason);
    res.json(stopped);
  } catch (err: any) {
    console.error('❌ Stop medication order error:', err);
    res.status(400).json({ message: err.message || 'Failed to stop medication order' });
  }
});

export default router;

