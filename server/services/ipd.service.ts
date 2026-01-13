import { db } from '../db';
import {
  floors,
  wards,
  rooms,
  beds,
  ipdEncounters,
  bedAllocations,
  patients,
  doctors,
  hospitals,
  users,
} from '../../shared/schema';
import { eq, and, sql, isNull, asc, inArray, or } from 'drizzle-orm';
import * as auditService from './audit.service';

/**
 * Create floor
 */
export const createFloor = async (data: {
  hospitalId: number;
  floorNumber: number;
  floorName?: string;
  description?: string;
}) => {
  const [floor] = await db
    .insert(floors)
    .values({
      hospitalId: data.hospitalId,
      floorNumber: data.floorNumber,
      floorName: data.floorName || null,
      description: data.description || null,
      isActive: true,
      createdAt: sql`NOW()`,
    })
    .returning();

  return floor;
};

/**
 * Get floors for hospital
 */
export const getFloors = async (hospitalId: number) => {
  return await db
    .select()
    .from(floors)
    .where(and(eq(floors.hospitalId, hospitalId), eq(floors.isActive, true)))
    .orderBy(asc(floors.floorNumber));
};

/**
 * Create ward
 */
export const createWard = async (data: {
  hospitalId: number;
  floorId?: number;
  name: string;
  type: string;
  genderPolicy?: string;
  capacity?: number;
  description?: string;
}) => {
  const [ward] = await db
    .insert(wards)
    .values({
      hospitalId: data.hospitalId,
      floorId: data.floorId || null,
      name: data.name,
      type: data.type,
      genderPolicy: data.genderPolicy || null,
      capacity: data.capacity || null,
      description: data.description || null,
      isActive: true,
      createdAt: sql`NOW()`,
    })
    .returning();

  return ward;
};

/**
 * Get wards for hospital (with floor info)
 */
export const getWards = async (hospitalId: number, floorId?: number) => {
  const conditions = [eq(wards.hospitalId, hospitalId), eq(wards.isActive, true)];
  if (floorId) {
    conditions.push(eq(wards.floorId, floorId));
  }

  return await db
    .select({
      ward: wards,
      floor: floors,
    })
    .from(wards)
    .leftJoin(floors, eq(wards.floorId, floors.id))
    .where(and(...conditions))
    .orderBy(asc(wards.name));
};

/**
 * Create room
 */
export const createRoom = async (data: {
  wardId: number;
  roomNumber: string;
  roomName?: string;
  category: string;
  capacity?: number;
  amenities?: string;
}) => {
  const [room] = await db
    .insert(rooms)
    .values({
      wardId: data.wardId,
      roomNumber: data.roomNumber,
      roomName: data.roomName || null,
      category: data.category,
      capacity: data.capacity || null,
      amenities: data.amenities || null,
      isActive: true,
      createdAt: sql`NOW()`,
    })
    .returning();

  return room;
};

/**
 * Get rooms for ward
 */
export const getRooms = async (wardId: number) => {
  return await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.wardId, wardId), eq(rooms.isActive, true)));
};

/**
 * Update room details
 */
export const updateRoom = async (
  roomId: number,
  data: {
    wardId?: number;
    roomNumber?: string;
    roomName?: string;
    category?: string;
    capacity?: number;
    amenities?: string;
  }
) => {
  const updateData: any = {
    updatedAt: sql`NOW()`,
  };

  if (data.wardId !== undefined) updateData.wardId = data.wardId;
  if (data.roomNumber !== undefined) updateData.roomNumber = data.roomNumber;
  if (data.roomName !== undefined) updateData.roomName = data.roomName || null;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.capacity !== undefined) updateData.capacity = data.capacity || null;
  if (data.amenities !== undefined) updateData.amenities = data.amenities || null;

  const [updated] = await db
    .update(rooms)
    .set(updateData)
    .where(eq(rooms.id, roomId))
    .returning();

  return updated;
};

/**
 * Create bed
 */
export const createBed = async (data: {
  roomId: number;
  bedNumber: string;
  bedName?: string;
  bedType?: string;
  equipment?: string;
  notes?: string;
}) => {
  const [bed] = await db
    .insert(beds)
    .values({
      roomId: data.roomId,
      bedNumber: data.bedNumber,
      bedName: data.bedName || null,
      bedType: data.bedType || null,
      equipment: data.equipment || null,
      notes: data.notes || null,
      status: 'available',
      createdAt: sql`NOW()`,
    })
    .returning();

  return bed;
};

/**
 * Get beds for room
 */
export const getBeds = async (roomId: number) => {
  return await db.select().from(beds).where(eq(beds.roomId, roomId));
};

/**
 * Get available beds for hospital (with full hierarchy)
 */
export const getAvailableBeds = async (hospitalId: number) => {
  // Get beds that are available OR cleaning (cleaning beds should be available for new patients)
  // Also check that there's no active allocation (toAt is null)
  const availableBeds = await db
    .select({
      bed: beds,
      room: rooms,
      ward: wards,
      floor: floors,
    })
    .from(beds)
    .leftJoin(rooms, eq(beds.roomId, rooms.id))
    .leftJoin(wards, eq(rooms.wardId, wards.id))
    .leftJoin(floors, eq(wards.floorId, floors.id))
    .leftJoin(bedAllocations, and(
      eq(bedAllocations.bedId, beds.id),
      isNull(bedAllocations.toAt) // Only active allocations
    ))
    .where(
      and(
        eq(wards.hospitalId, hospitalId),
        sql`${beds.status} IN ('available', 'cleaning')`, // Include both available and cleaning beds
        isNull(bedAllocations.id), // No active allocation
        eq(rooms.isActive, true),
        eq(wards.isActive, true),
      ),
    )
    .orderBy(asc(floors.floorNumber), asc(wards.name), asc(rooms.roomNumber), asc(beds.bedNumber));

  return availableBeds;
};

/**
 * Get complete bed structure for hospital (hierarchical view)
 */
export const getBedStructure = async (hospitalId: number) => {
  
  // Get all floors
  const floorsList = await getFloors(hospitalId);
  
  // Get all wards (with floor info)
  const wardsListRaw = await getWards(hospitalId);
  
  // Flatten wards structure
  const wardsList = wardsListRaw.map((row: any) => {
    if (!row.ward) {
      console.warn('⚠️ Ward row missing ward data:', row);
      return null;
    }
    return {
      ...row.ward,
      floorId: row.ward.floorId || row.floor?.id || null,
      floor: row.floor || null,
    };
  }).filter((w: any) => w !== null);
  
  // Get all rooms - flatten the nested structure
  const roomsListRaw = await db
    .select({
      room: rooms,
      ward: wards,
    })
    .from(rooms)
    .leftJoin(wards, eq(rooms.wardId, wards.id))
    .where(and(eq(wards.hospitalId, hospitalId), eq(rooms.isActive, true)))
    .orderBy(asc(rooms.roomNumber));
  
  // Flatten rooms structure
  const roomsList = roomsListRaw.map((row: any) => {
    if (!row.room) {
      console.warn('⚠️ Room row missing room data:', row);
      return null;
    }
    return {
      ...row.room,
      wardId: row.ward?.id || row.room.wardId || null,
    };
  }).filter((r: any) => r !== null);
  
  // Get all beds with occupancy info
  // First get all rooms for this hospital, then get beds for those rooms
  const hospitalRoomIds = await db
    .select({ id: rooms.id })
    .from(rooms)
    .leftJoin(wards, eq(rooms.wardId, wards.id))
    .where(and(
      eq(wards.hospitalId, hospitalId),
      eq(rooms.isActive, true)
    ));
  
  const roomIdList = hospitalRoomIds.map((r: any) => r.id);
  
  const bedsListRaw = roomIdList.length > 0 ? await db
    .select({
      bed: beds,
      room: rooms,
      ward: wards,
      floor: floors,
      currentAllocation: bedAllocations,
      currentEncounter: ipdEncounters,
      currentPatient: patients,
    })
    .from(beds)
    .leftJoin(rooms, eq(beds.roomId, rooms.id))
    .leftJoin(wards, eq(rooms.wardId, wards.id))
    .leftJoin(floors, eq(wards.floorId, floors.id))
    .leftJoin(bedAllocations, and(
      eq(bedAllocations.bedId, beds.id),
      isNull(bedAllocations.toAt)
    ))
    .leftJoin(ipdEncounters, eq(bedAllocations.encounterId, ipdEncounters.id))
    .leftJoin(patients, eq(ipdEncounters.patientId, patients.id))
    .where(inArray(beds.roomId, roomIdList))
    .orderBy(asc(floors.floorNumber), asc(wards.name), asc(rooms.roomNumber), asc(beds.bedNumber)) : [];

  // Flatten beds structure and determine status
  const bedsList = bedsListRaw.map((row: any) => {
    if (!row.bed) {
      console.warn('⚠️ Bed row missing bed data:', row);
      return null;
    }
    
    const bed = row.bed;
    const isOccupied = !!row.currentAllocation;
    
    // Determine bed status
    // Priority: occupied > blocked > cleaning > available
    // If there's an active allocation, bed is occupied regardless of bed.status
    // If no active allocation, use bed.status but ensure it's not showing as occupied
    let status = bed.status || 'available';
    
    // Log bed status determination for debugging
    if (bedsListRaw.length <= 3 || bedsListRaw.indexOf(row) < 3) {
    }
    
    if (isOccupied) {
      // Active allocation exists - bed is definitely occupied
      status = 'occupied';
    } else {
      // No active allocation - bed should not be occupied
      // Priority: blocked > available (cleaning beds should be available for new patients if no allocation)
      if (bed.status === 'blocked') {
        // Keep blocked status
        status = 'blocked';
      } else if (bed.status === 'occupied') {
        // Bed status says occupied but no active allocation - fix inconsistency
        status = 'available';
      } else {
        // If no active allocation, bed should be available (even if status says 'cleaning')
        // Cleaning is a temporary state - if there's no active allocation, the bed is available for new patients
        status = 'available';
        if (bed.status && bed.status !== 'available' && bed.status !== 'blocked') {
        }
      }
    }
    
    return {
      ...bed,
      roomId: bed.roomId || null,
      status,
      currentPatient: row.currentPatient ? {
        id: row.currentPatient.id,
        user: row.currentPatient.userId ? {
          fullName: row.currentPatient.userId, // Will need to fetch separately if needed
        } : null,
      } : null,
    };
  }).filter((b: any) => b !== null);
  

  const structure = {
    floors: floorsList,
    wards: wardsList,
    rooms: roomsList,
    beds: bedsList,
  };
  
  return structure;
};

/**
 * Admit patient (create IPD encounter)
 */
export const admitPatient = async (data: {
  hospitalId: number;
  patientId: number;
  admittingDoctorId?: number;
  attendingDoctorId?: number;
  admissionType: string;
  bedId: number;
  actorUserId?: number;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  // Check bed availability
  const bed = await db.select().from(beds).where(eq(beds.id, data.bedId)).limit(1);

  if (bed.length === 0) {
    throw new Error('Bed not found');
  }

  if (bed[0].status !== 'available') {
    throw new Error('Bed is not available');
  }

  const beforeState = {
    bedStatus: bed[0].status,
    bedId: data.bedId,
  };

  // Create encounter
  const [encounter] = await db
    .insert(ipdEncounters)
    .values({
      hospitalId: data.hospitalId,
      patientId: data.patientId,
      admittingDoctorId: data.admittingDoctorId || null,
      attendingDoctorId: data.attendingDoctorId || null,
      admissionType: data.admissionType,
      status: 'admitted',
      admittedAt: sql`NOW()`,
      createdAt: sql`NOW()`,
    })
    .returning();

  // Allocate bed
  await db.insert(bedAllocations).values({
    encounterId: encounter.id,
    bedId: data.bedId,
    fromAt: sql`NOW()`,
    reason: 'Initial admission',
    createdAt: sql`NOW()`,
  });

  // Update bed status
  await db.update(beds).set({ status: 'occupied', updatedAt: sql`NOW()` }).where(eq(beds.id, data.bedId));

  const afterState = {
    encounterId: encounter.id,
    status: 'admitted',
    bedId: data.bedId,
    bedStatus: 'occupied',
    admissionType: data.admissionType,
  };

  // Log audit event
  if (data.actorUserId && data.actorRole) {
    await auditService.logPatientAudit({
      hospitalId: data.hospitalId,
      patientId: data.patientId,
      actorUserId: data.actorUserId,
      actorRole: data.actorRole,
      action: 'admit',
      entityType: 'ipd_encounter',
      entityId: encounter.id,
      before: beforeState,
      after: afterState,
      message: `Patient admitted to IPD. Bed ${data.bedId} allocated. Admission type: ${data.admissionType}`,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  return encounter;
};

/**
 * Get IPD encounters
 */
export const getIpdEncounters = async (filters: {
  hospitalId?: number;
  patientId?: number;
  doctorId?: number;
  nurseId?: number;
  status?: string;
}) => {
  const conditions = [];
  if (filters.hospitalId) {
    conditions.push(eq(ipdEncounters.hospitalId, filters.hospitalId));
  }
  if (filters.patientId) {
    conditions.push(eq(ipdEncounters.patientId, filters.patientId));
  }
  if (filters.doctorId) {
    // Filter by doctor ID - check both admitting and attending doctor
    // Also ensure we convert to number for proper comparison
    const doctorIdNum = typeof filters.doctorId === 'string' ? parseInt(filters.doctorId, 10) : filters.doctorId;
    
    // Use or() from drizzle-orm for proper type-safe filtering
    // Wrap in a check to ensure it's not undefined
    const doctorCondition = or(
      eq(ipdEncounters.admittingDoctorId, doctorIdNum),
      eq(ipdEncounters.attendingDoctorId, doctorIdNum)
    );
    
    if (doctorCondition) {
      conditions.push(doctorCondition);
    }
    console.log(`🔍 Filtering encounters by doctorId: ${doctorIdNum} (type: ${typeof doctorIdNum})`);
  }
  if (filters.status) {
    conditions.push(eq(ipdEncounters.status, filters.status));
  }
  if (filters.nurseId) {
    conditions.push(eq(ipdEncounters.assignedNurseId, filters.nurseId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  console.log(`🔍 Fetching IPD encounters with ${conditions.length} conditions`);

  const encounters = await db
    .select({
      encounter: ipdEncounters,
      patient: patients,
      patientUser: users,
      hospital: hospitals,
    })
    .from(ipdEncounters)
    .leftJoin(patients, eq(ipdEncounters.patientId, patients.id))
    .leftJoin(users, eq(patients.userId, users.id))
    .leftJoin(hospitals, eq(ipdEncounters.hospitalId, hospitals.id))
    .where(whereClause);
  
  console.log(`📋 Found ${encounters.length} raw encounters from database`);
  

  // Batch fetch all unique doctor IDs
  const allDoctorIds = new Set<number>();
  encounters.forEach(enc => {
    if (enc.encounter.admittingDoctorId) allDoctorIds.add(enc.encounter.admittingDoctorId);
    if (enc.encounter.attendingDoctorId) allDoctorIds.add(enc.encounter.attendingDoctorId);
  });
  
  // Fetch all doctors with user info in one query
  const allDoctors = allDoctorIds.size > 0
    ? await db
        .select({
          doctor: doctors,
          user: users,
        })
        .from(doctors)
        .leftJoin(users, eq(doctors.userId, users.id))
        .where(inArray(doctors.id, Array.from(allDoctorIds)))
    : [];
  
  // Create a map for quick lookup
  const doctorMap = new Map<number, { doctor: any; user: any }>();
  allDoctors.forEach(d => {
    doctorMap.set(d.doctor.id, d);
  });
  
  // Batch fetch all bed allocations
  const encounterIds = encounters.map(enc => enc.encounter.id);
  const allBedAllocations = encounterIds.length > 0
    ? await db
        .select({
          allocation: bedAllocations,
          bed: beds,
        })
        .from(bedAllocations)
        .leftJoin(beds, eq(bedAllocations.bedId, beds.id))
        .where(and(
          inArray(bedAllocations.encounterId, encounterIds),
          isNull(bedAllocations.toAt)
        ))
    : [];
  
  // Create a map for quick lookup
  const bedMap = new Map<number, any>();
  allBedAllocations.forEach(alloc => {
    if (alloc.allocation.encounterId) {
      bedMap.set(alloc.allocation.encounterId, alloc.bed);
    }
  });

  // Enrich with doctor info and current bed separately
  const enrichedEncounters = encounters.map((enc) => {
      // Get admitting doctor from map
      const admittingDoctorData = enc.encounter.admittingDoctorId
        ? doctorMap.get(enc.encounter.admittingDoctorId)
        : null;
      
      // Get attending doctor from map
      const attendingDoctorData = enc.encounter.attendingDoctorId
        ? doctorMap.get(enc.encounter.attendingDoctorId)
        : null;
      
      // Get current bed from map (already fetched in batch)
      const currentBed = bedMap.get(enc.encounter.id) || null;
      
      // Enrich patient with user info
      const enrichedPatient = enc.patient ? {
        ...enc.patient,
        user: enc.patientUser ? {
          id: enc.patientUser.id,
          fullName: enc.patientUser.fullName,
          mobileNumber: enc.patientUser.mobileNumber,
          email: enc.patientUser.email,
        } : null,
      } : null;
      
      const logData = {
        encounterId: enc.encounter.id,
        patientId: enc.patient?.id,
        patientUserId: enc.patient?.userId,
        admittingDoctorId: enc.encounter.admittingDoctorId,
        attendingDoctorId: enc.encounter.attendingDoctorId,
        status: enc.encounter.status,
        patientName: enc.patientUser?.fullName || 'Unknown',
        admittingDoctorName: admittingDoctorData?.user?.fullName || 'N/A',
        attendingDoctorName: attendingDoctorData?.user?.fullName || 'N/A',
      };
      
      // Check if this encounter matches the doctor filter
      if (filters.doctorId) {
        const doctorIdNum = typeof filters.doctorId === 'string' ? parseInt(filters.doctorId, 10) : filters.doctorId;
        const matchesAdmitting = enc.encounter.admittingDoctorId === doctorIdNum;
        const matchesAttending = enc.encounter.attendingDoctorId === doctorIdNum;
      }
      
      // Format doctor objects with user info
      const formattedAdmittingDoctor = admittingDoctorData ? {
        id: admittingDoctorData.doctor.id,
        fullName: admittingDoctorData.user?.fullName || null,
        userId: admittingDoctorData.doctor.userId,
      } : null;
      
      const formattedAttendingDoctor = attendingDoctorData ? {
        id: attendingDoctorData.doctor.id,
        fullName: attendingDoctorData.user?.fullName || null,
        userId: attendingDoctorData.doctor.userId,
      } : null;
      
      return {
        ...enc.encounter,
        patient: enrichedPatient,
        hospital: enc.hospital,
        admittingDoctor: formattedAdmittingDoctor,
        attendingDoctor: formattedAttendingDoctor,
        currentBed: currentBed,
        currentBedId: currentBed?.id || null,
      };
    });

  return enrichedEncounters;
};

/**
 * Get IPD encounter by ID with bed info
 */
export const getIpdEncounterById = async (encounterId: number) => {
  const encounter = await db
    .select({
      encounter: ipdEncounters,
      patient: patients,
      patientUser: users,
      hospital: hospitals,
    })
    .from(ipdEncounters)
    .leftJoin(patients, eq(ipdEncounters.patientId, patients.id))
    .leftJoin(users, eq(patients.userId, users.id))
    .leftJoin(hospitals, eq(ipdEncounters.hospitalId, hospitals.id))
    .where(eq(ipdEncounters.id, encounterId))
    .limit(1);

  if (encounter.length === 0) {
    throw new Error('Encounter not found');
  }

  // Get doctor info separately
  const enc = encounter[0];
  const admittingDoctor = enc.encounter.admittingDoctorId
    ? await db.select().from(doctors).where(eq(doctors.id, enc.encounter.admittingDoctorId)).limit(1)
    : [];
  const attendingDoctor = enc.encounter.attendingDoctorId
    ? await db.select().from(doctors).where(eq(doctors.id, enc.encounter.attendingDoctorId)).limit(1)
    : [];

  // Enrich patient with user info
  const enrichedPatient = enc.patient ? {
    ...enc.patient,
    user: enc.patientUser ? {
      id: enc.patientUser.id,
      fullName: enc.patientUser.fullName,
      mobileNumber: enc.patientUser.mobileNumber,
      email: enc.patientUser.email,
    } : null,
  } : null;

  const enrichedEncounter = {
    ...enc,
    patient: enrichedPatient,
    admittingDoctor: admittingDoctor[0] || null,
    attendingDoctor: attendingDoctor[0] || null,
  };

  // Get current bed allocation
  const currentAllocation = await db
    .select({
      allocation: bedAllocations,
      bed: beds,
      room: rooms,
      ward: wards,
    })
    .from(bedAllocations)
    .leftJoin(beds, eq(bedAllocations.bedId, beds.id))
    .leftJoin(rooms, eq(beds.roomId, rooms.id))
    .leftJoin(wards, eq(rooms.wardId, wards.id))
    .where(and(eq(bedAllocations.encounterId, encounterId), isNull(bedAllocations.toAt)))
    .limit(1);

  // Flatten the current bed structure
  const currentBedData = currentAllocation[0]?.bed || null;
  
  return {
    ...enrichedEncounter.encounter,
    patient: enrichedEncounter.patient,
    hospital: enrichedEncounter.hospital,
    admittingDoctor: enrichedEncounter.admittingDoctor,
    attendingDoctor: enrichedEncounter.attendingDoctor,
    currentBed: currentBedData,
    currentBedId: currentBedData?.id || null,
  };
};

/**
 * Transfer patient to new bed
 */
export const transferPatient = async (data: {
  encounterId: number;
  newBedId: number;
  reason?: string;
  transferredBy?: number;
  actorUserId?: number;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  // Get encounter to access patientId and hospitalId
  const encounter = await db.select().from(ipdEncounters).where(eq(ipdEncounters.id, data.encounterId)).limit(1);
  if (encounter.length === 0) {
    throw new Error('Encounter not found');
  }
  const enc = encounter[0];

  // Get current allocation
  const currentAllocation = await db
    .select()
    .from(bedAllocations)
    .where(and(eq(bedAllocations.encounterId, data.encounterId), isNull(bedAllocations.toAt)))
    .limit(1);

  if (currentAllocation.length === 0) {
    throw new Error('No active bed allocation found');
  }

  // Check new bed availability
  const newBed = await db.select().from(beds).where(eq(beds.id, data.newBedId)).limit(1);

  if (newBed.length === 0) {
    throw new Error('New bed not found');
  }

  if (newBed[0].status !== 'available') {
    throw new Error('New bed is not available');
  }

  const beforeState = {
    encounterId: data.encounterId,
    status: enc.status,
    currentBedId: currentAllocation[0].bedId,
    currentBedStatus: 'occupied',
    newBedId: data.newBedId,
    newBedStatus: newBed[0].status,
  };

  // Close current allocation
  await db
    .update(bedAllocations)
    .set({ toAt: sql`NOW()` })
    .where(eq(bedAllocations.id, currentAllocation[0].id));

  // Create new allocation
  await db.insert(bedAllocations).values({
    encounterId: data.encounterId,
    bedId: data.newBedId,
    fromAt: sql`NOW()`,
    reason: data.reason || 'Transfer',
    transferredBy: data.transferredBy || null,
    createdAt: sql`NOW()`,
  });

  // Update bed statuses
  await db.update(beds).set({ status: 'cleaning', updatedAt: sql`NOW()` }).where(eq(beds.id, currentAllocation[0].bedId));
  await db.update(beds).set({ status: 'occupied', updatedAt: sql`NOW()` }).where(eq(beds.id, data.newBedId));

  // Update encounter status
  await db
    .update(ipdEncounters)
    .set({ status: 'transferred', updatedAt: sql`NOW()` })
    .where(eq(ipdEncounters.id, data.encounterId));

  const afterState = {
    encounterId: data.encounterId,
    status: 'transferred',
    previousBedId: currentAllocation[0].bedId,
    previousBedStatus: 'cleaning',
    newBedId: data.newBedId,
    newBedStatus: 'occupied',
  };

  // Log audit event
  if (data.actorUserId && data.actorRole) {
    await auditService.logPatientAudit({
      hospitalId: enc.hospitalId,
      patientId: enc.patientId,
      actorUserId: data.actorUserId,
      actorRole: data.actorRole,
      action: 'transfer',
      entityType: 'ipd_encounter',
      entityId: data.encounterId,
      before: beforeState,
      after: afterState,
      message: `Patient transferred from bed ${currentAllocation[0].bedId} to bed ${data.newBedId}. Reason: ${data.reason || 'Transfer'}`,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  return await getIpdEncounterById(data.encounterId);
};

/**
 * Transfer patient to another doctor
 */
export const transferPatientToDoctor = async (data: {
  encounterId: number;
  newAttendingDoctorId: number;
  reason?: string;
  actorUserId?: number;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  // Get encounter
  const encounter = await db.select().from(ipdEncounters).where(eq(ipdEncounters.id, data.encounterId)).limit(1);
  if (encounter.length === 0) {
    throw new Error('Encounter not found');
  }
  const enc = encounter[0];

  // Verify new doctor exists
  const newDoctor = await db.select().from(doctors).where(eq(doctors.id, data.newAttendingDoctorId)).limit(1);
  if (newDoctor.length === 0) {
    throw new Error('New attending doctor not found');
  }

  const beforeState = {
    encounterId: data.encounterId,
    attendingDoctorId: enc.attendingDoctorId,
  };

  // Update attending doctor
  await db
    .update(ipdEncounters)
    .set({ 
      attendingDoctorId: data.newAttendingDoctorId,
      updatedAt: sql`NOW()`,
    })
    .where(eq(ipdEncounters.id, data.encounterId));

  const afterState = {
    encounterId: data.encounterId,
    attendingDoctorId: data.newAttendingDoctorId,
  };

  // Log audit event
  if (data.actorUserId && data.actorRole) {
    await auditService.logPatientAudit({
      hospitalId: enc.hospitalId,
      patientId: enc.patientId,
      actorUserId: data.actorUserId,
      actorRole: data.actorRole,
      action: 'transfer_doctor',
      entityType: 'ipd_encounter',
      entityId: data.encounterId,
      before: beforeState,
      after: afterState,
      message: `Patient transferred to doctor ${data.newAttendingDoctorId}. Reason: ${data.reason || 'Doctor transfer'}`,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  return await getIpdEncounterById(data.encounterId);
};

/**
 * Discharge patient
 */
export const dischargePatient = async (data: {
  encounterId: number;
  dischargeSummaryText: string;
  status?: string; // Allow custom discharge status (discharged, LAMA, transfer, death, absconded)
  actorUserId?: number;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  // Get encounter
  const encounter = await db
    .select()
    .from(ipdEncounters)
    .where(eq(ipdEncounters.id, data.encounterId))
    .limit(1);

  if (encounter.length === 0) {
    throw new Error('Encounter not found');
  }

  const enc = encounter[0];

  // Get current bed allocation
  const currentAllocation = await db
    .select()
    .from(bedAllocations)
    .where(and(eq(bedAllocations.encounterId, data.encounterId), isNull(bedAllocations.toAt)))
    .limit(1);

  const beforeState = {
    encounterId: data.encounterId,
    status: enc.status,
    bedId: currentAllocation.length > 0 ? currentAllocation[0].bedId : null,
    bedStatus: currentAllocation.length > 0 ? 'occupied' : null,
  };

  // Close bed allocation
  if (currentAllocation.length > 0) {
    const bedId = currentAllocation[0].bedId;
    console.log(`🛏️ Discharging patient - closing bed allocation for bed ${bedId}`);
    
    // Get current bed status before update
    const [currentBed] = await db
      .select()
      .from(beds)
      .where(eq(beds.id, bedId))
      .limit(1);
    const previousStatus = currentBed?.status || 'unknown';
    
    // Close the bed allocation
    await db
      .update(bedAllocations)
      .set({ toAt: sql`NOW()` })
      .where(eq(bedAllocations.id, currentAllocation[0].id));

    // Release bed - set to available immediately (cleaning can be handled separately if needed)
    const [updatedBed] = await db
      .update(beds)
      .set({ status: 'available', updatedAt: sql`NOW()` })
      .where(eq(beds.id, bedId))
      .returning();
  } else {
  }

  // Update encounter - use provided status or default to 'discharged'
  const dischargeStatus = data.status || 'discharged';
  const [updated] = await db
    .update(ipdEncounters)
    .set({
      status: dischargeStatus,
      dischargedAt: sql`NOW()`,
      dischargeSummaryText: data.dischargeSummaryText,
      updatedAt: sql`NOW()`,
    })
    .where(eq(ipdEncounters.id, data.encounterId))
    .returning();

  const afterState = {
    encounterId: data.encounterId,
    status: dischargeStatus,
    bedId: currentAllocation.length > 0 ? currentAllocation[0].bedId : null,
    bedStatus: currentAllocation.length > 0 ? 'available' : null,
    dischargedAt: new Date().toISOString(),
  };

  // Log audit event
  if (data.actorUserId && data.actorRole) {
    await auditService.logPatientAudit({
      hospitalId: enc.hospitalId,
      patientId: enc.patientId,
      actorUserId: data.actorUserId,
      actorRole: data.actorRole,
      action: 'discharge',
      entityType: 'ipd_encounter',
      entityId: data.encounterId,
      before: beforeState,
      after: afterState,
      message: `Patient discharged. Status: ${dischargeStatus}. Bed ${currentAllocation.length > 0 ? currentAllocation[0].bedId : 'N/A'} released.`,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  return updated;
};

/**
 * Delete floor (soft delete - sets isActive to false)
 */
export const deleteFloor = async (floorId: number) => {
  // Check if floor has active wards
  const activeWards = await db
    .select()
    .from(wards)
    .where(and(eq(wards.floorId, floorId), eq(wards.isActive, true)))
    .limit(1);

  if (activeWards.length > 0) {
    throw new Error('Cannot delete floor with active wards. Please delete or move wards first.');
  }

  const [deleted] = await db
    .update(floors)
    .set({ isActive: false, updatedAt: sql`NOW()` })
    .where(eq(floors.id, floorId))
    .returning();

  return deleted;
};

/**
 * Delete ward (soft delete - sets isActive to false)
 */
export const deleteWard = async (wardId: number) => {
  // Check if ward has active rooms
  const activeRooms = await db
    .select()
    .from(rooms)
    .leftJoin(wards, eq(rooms.wardId, wards.id))
    .where(and(eq(rooms.wardId, wardId), eq(rooms.isActive, true)))
    .limit(1);

  if (activeRooms.length > 0) {
    throw new Error('Cannot delete ward with active rooms. Please delete or move rooms first.');
  }

  const [deleted] = await db
    .update(wards)
    .set({ isActive: false, updatedAt: sql`NOW()` })
    .where(eq(wards.id, wardId))
    .returning();

  return deleted;
};

/**
 * Delete room (soft delete - sets isActive to false)
 */
export const deleteRoom = async (roomId: number) => {
  // Check if room has beds
  const roomBeds = await db
    .select()
    .from(beds)
    .where(eq(beds.roomId, roomId))
    .limit(1);

  if (roomBeds.length > 0) {
    throw new Error('Cannot delete room with beds. Please delete or move beds first.');
  }

  const [deleted] = await db
    .update(rooms)
    .set({ isActive: false, updatedAt: sql`NOW()` })
    .where(eq(rooms.id, roomId))
    .returning();

  return deleted;
};

/**
 * Delete bed
 */
export const deleteBed = async (bedId: number) => {
  // Check if bed is occupied
  const activeAllocation = await db
    .select()
    .from(bedAllocations)
    .where(and(eq(bedAllocations.bedId, bedId), isNull(bedAllocations.toAt)))
    .limit(1);

  if (activeAllocation.length > 0) {
    throw new Error('Cannot delete bed that is currently occupied. Please discharge or transfer patient first.');
  }

  await db.delete(beds).where(eq(beds.id, bedId));
  return { id: bedId };
};

/**
 * Update bed details
 */
export const updateBed = async (
  bedId: number,
  data: {
    bedNumber?: string;
    bedName?: string;
    bedType?: string;
    equipment?: string;
    notes?: string;
  }
) => {
  const updateData: any = {
    updatedAt: sql`NOW()`,
  };

  if (data.bedNumber !== undefined) updateData.bedNumber = data.bedNumber;
  if (data.bedName !== undefined) updateData.bedName = data.bedName || null;
  if (data.bedType !== undefined) updateData.bedType = data.bedType || null;
  if (data.equipment !== undefined) updateData.equipment = data.equipment || null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;

  const [updated] = await db
    .update(beds)
    .set(updateData)
    .where(eq(beds.id, bedId))
    .returning();

  return updated;
};

/**
 * Update bed status
 */
export const updateBedStatus = async (
  bedId: number,
  status: string,
  options?: {
    blockedReason?: string;
    blockedUntil?: Date;
    lastCleanedAt?: Date;
  }
) => {
  const updateData: any = {
    status,
    updatedAt: sql`NOW()`,
  };

  if (status === 'blocked' && options?.blockedReason) {
    updateData.blockedReason = options.blockedReason;
    updateData.blockedUntil = options.blockedUntil || null;
  }

  if (status === 'available' && options?.lastCleanedAt) {
    updateData.lastCleanedAt = options.lastCleanedAt;
    updateData.blockedReason = null;
    updateData.blockedUntil = null;
  }

  const [updated] = await db
    .update(beds)
    .set(updateData)
    .where(eq(beds.id, bedId))
    .returning();

  return updated;
};

/**
 * Mark bed as cleaned (available)
 */
export const markBedCleaned = async (bedId: number) => {
  return await updateBedStatus(bedId, 'available', {
    lastCleanedAt: new Date(),
  });
};

