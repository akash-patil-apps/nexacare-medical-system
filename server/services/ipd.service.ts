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
} from '../../shared/schema';
import { eq, and, sql, isNull, asc, inArray } from 'drizzle-orm';

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
    .where(
      and(
        eq(wards.hospitalId, hospitalId),
        eq(beds.status, 'available'),
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
  console.log(`🏥 Getting bed structure for hospital ${hospitalId}`);
  
  // Get all floors
  const floorsList = await getFloors(hospitalId);
  console.log(`📊 Found ${floorsList.length} floors`);
  
  // Get all wards (with floor info)
  const wardsList = await getWards(hospitalId);
  console.log(`📊 Found ${wardsList.length} wards`);
  
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
  console.log(`📊 Found ${roomsList.length} rooms`);
  
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
  console.log(`📊 Found ${roomIdList.length} rooms for hospital ${hospitalId}`);
  
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
    let status = bed.status || 'available';
    if (isOccupied) {
      status = 'occupied';
    } else if (bed.status === 'blocked') {
      status = 'blocked';
    } else if (bed.status === 'cleaning') {
      status = 'cleaning';
    } else {
      status = 'available';
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
  
  console.log(`📊 Found ${bedsList.length} beds`);
  if (bedsList.length > 0) {
    console.log('📊 Sample bed:', {
      id: bedsList[0].id,
      roomId: bedsList[0].roomId,
      status: bedsList[0].status,
      bedNumber: bedsList[0].bedNumber,
    });
  }

  const structure = {
    floors: floorsList,
    wards: wardsList,
    rooms: roomsList,
    beds: bedsList,
  };
  
  console.log(`✅ Bed structure prepared:`, {
    floors: structure.floors.length,
    wards: structure.wards.length,
    rooms: structure.rooms.length,
    beds: structure.beds.length,
  });
  
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
}) => {
  // Check bed availability
  const bed = await db.select().from(beds).where(eq(beds.id, data.bedId)).limit(1);

  if (bed.length === 0) {
    throw new Error('Bed not found');
  }

  if (bed[0].status !== 'available') {
    throw new Error('Bed is not available');
  }

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

  return encounter;
};

/**
 * Get IPD encounters
 */
export const getIpdEncounters = async (filters: {
  hospitalId?: number;
  patientId?: number;
  doctorId?: number;
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
    conditions.push(
      sql`(${ipdEncounters.admittingDoctorId} = ${filters.doctorId} OR ${ipdEncounters.attendingDoctorId} = ${filters.doctorId})`,
    );
  }
  if (filters.status) {
    conditions.push(eq(ipdEncounters.status, filters.status));
  }

  const encounters = await db
    .select({
      encounter: ipdEncounters,
      patient: patients,
      hospital: hospitals,
    })
    .from(ipdEncounters)
    .leftJoin(patients, eq(ipdEncounters.patientId, patients.id))
    .leftJoin(hospitals, eq(ipdEncounters.hospitalId, hospitals.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  // Enrich with doctor info separately
  const enrichedEncounters = await Promise.all(
    encounters.map(async (enc) => {
      const admittingDoctor = enc.encounter.admittingDoctorId
        ? await db.select().from(doctors).where(eq(doctors.id, enc.encounter.admittingDoctorId)).limit(1)
        : [];
      const attendingDoctor = enc.encounter.attendingDoctorId
        ? await db.select().from(doctors).where(eq(doctors.id, enc.encounter.attendingDoctorId)).limit(1)
        : [];
      return {
        ...enc,
        admittingDoctor: admittingDoctor[0] || null,
        attendingDoctor: attendingDoctor[0] || null,
      };
    }),
  );

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
      hospital: hospitals,
    })
    .from(ipdEncounters)
    .leftJoin(patients, eq(ipdEncounters.patientId, patients.id))
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

  const enrichedEncounter = {
    ...enc,
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

  return {
    ...enrichedEncounter,
    currentBed: currentAllocation[0] || null,
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
}) => {
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


  return await getIpdEncounterById(data.encounterId);
};

/**
 * Discharge patient
 */
export const dischargePatient = async (data: {
  encounterId: number;
  dischargeSummaryText: string;
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

  // Get current bed allocation
  const currentAllocation = await db
    .select()
    .from(bedAllocations)
    .where(and(eq(bedAllocations.encounterId, data.encounterId), isNull(bedAllocations.toAt)))
    .limit(1);

  // Close bed allocation
  if (currentAllocation.length > 0) {
    await db
      .update(bedAllocations)
      .set({ toAt: sql`NOW()` })
      .where(eq(bedAllocations.id, currentAllocation[0].id));

    // Release bed
    await db
      .update(beds)
      .set({ status: 'cleaning', updatedAt: sql`NOW()` })
      .where(eq(beds.id, currentAllocation[0].bedId));
  }

  // Update encounter
  const [updated] = await db
    .update(ipdEncounters)
    .set({
      status: 'discharged',
      dischargedAt: sql`NOW()`,
      dischargeSummaryText: data.dischargeSummaryText,
      updatedAt: sql`NOW()`,
    })
    .where(eq(ipdEncounters.id, data.encounterId))
    .returning();

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

