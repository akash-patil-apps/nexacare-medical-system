// server/services/radiology-technicians.service.ts
import { db } from '../db';
import { radiologyTechnicians, users, hospitals } from '../../shared/schema';
import type { InsertRadiologyTechnician } from '../../shared/schema';
import { eq, like, and } from 'drizzle-orm';

/**
 * Create a new radiology technician profile.
 */
export const createRadiologyTechnician = async (data: Omit<InsertRadiologyTechnician, 'id' | 'createdAt'>) => {
  console.log(`🩻 Creating radiology technician profile for user: ${data.userId}`);

  const technicianData = {
    ...data,
    createdAt: new Date()
  };

  const result = await db.insert(radiologyTechnicians).values(technicianData).returning();
  console.log(`✅ Radiology technician created: ${result[0]?.id}`);

  return result;
};

/**
 * Get all radiology technicians.
 */
export const getAllRadiologyTechnicians = async () => {
  console.log(`🩻 Fetching all radiology technicians`);
  const result = await db
    .select()
    .from(radiologyTechnicians)
    .where(() => true);

  console.log(`📋 Found ${result.length} radiology technicians`);
  return result;
};

/**
 * Get radiology technician by ID with user and hospital info.
 */
export const getRadiologyTechnicianById = async (technicianId: number) => {
  if (
    typeof technicianId !== 'number' ||
    Number.isNaN(technicianId) ||
    !Number.isFinite(technicianId) ||
    !Number.isInteger(technicianId) ||
    technicianId <= 0
  ) {
    console.warn(`🩻 getRadiologyTechnicianById called with invalid id`, {
      technicianId,
      type: typeof technicianId,
    });
    return null;
  }

  console.log(`🩻 Fetching radiology technician by ID: ${technicianId}`);

  const result = await db
    .select({
      technician: radiologyTechnicians,
      user: users,
      hospital: hospitals,
    })
    .from(radiologyTechnicians)
    .leftJoin(users, eq(radiologyTechnicians.userId, users.id))
    .leftJoin(hospitals, eq(radiologyTechnicians.hospitalId, hospitals.id))
    .where(eq(radiologyTechnicians.id, technicianId))
    .limit(1);

  if (result.length === 0) {
    console.log(`❌ Radiology technician not found: ${technicianId}`);
    return null;
  }

  console.log(`✅ Radiology technician found: ${result[0].technician.id}`);
  return result[0];
};

/**
 * Get radiology technicians by hospital ID.
 */
export const getRadiologyTechniciansByHospital = async (hospitalId: number) => {
  if (
    typeof hospitalId !== 'number' ||
    Number.isNaN(hospitalId) ||
    !Number.isFinite(hospitalId) ||
    !Number.isInteger(hospitalId) ||
    hospitalId <= 0
  ) {
    console.warn(`🏥 getRadiologyTechniciansByHospital called with invalid hospitalId`, {
      hospitalId,
      type: typeof hospitalId,
    });
    return [];
  }

  console.log(`🏥 Fetching radiology technicians for hospital: ${hospitalId}`);

  const result = await db
    .select({
      technician: radiologyTechnicians,
      user: users,
    })
    .from(radiologyTechnicians)
    .leftJoin(users, eq(radiologyTechnicians.userId, users.id))
    .where(eq(radiologyTechnicians.hospitalId, hospitalId));

  console.log(`📋 Found ${result.length} radiology technicians for hospital ${hospitalId}`);
  return result;
};

/**
 * Update radiology technician profile.
 */
export const updateRadiologyTechnicianProfile = async (technicianId: number, data: Partial<Omit<InsertRadiologyTechnician, 'id' | 'userId' | 'createdAt'>>) => {
  console.log(`🩻 Updating radiology technician profile: ${technicianId}`, data);

  const result = await db
    .update(radiologyTechnicians)
    .set(data)
    .where(eq(radiologyTechnicians.id, technicianId))
    .returning();

  if (result.length === 0) {
    console.log(`❌ Radiology technician not found for update: ${technicianId}`);
    return null;
  }

  console.log(`✅ Radiology technician updated: ${result[0].id}`);
  return result[0];
};

/**
 * Search radiology technicians by name or specialization.
 */
export const searchRadiologyTechnicians = async (query: string, hospitalId?: number) => {
  console.log(`🔍 Searching radiology technicians: "${query}"`, hospitalId ? `in hospital ${hospitalId}` : '');

  const searchCondition = hospitalId
    ? and(
        like(users.fullName, `%${query}%`),
        eq(radiologyTechnicians.hospitalId, hospitalId)
      )
    : like(users.fullName, `%${query}%`);

  const result = await db
    .select({
      technician: radiologyTechnicians,
      user: users,
      hospital: hospitals,
    })
    .from(radiologyTechnicians)
    .leftJoin(users, eq(radiologyTechnicians.userId, users.id))
    .leftJoin(hospitals, eq(radiologyTechnicians.hospitalId, hospitals.id))
    .where(searchCondition)
    .limit(20);

  console.log(`📋 Found ${result.length} radiology technicians matching "${query}"`);
  return result;
};

/**
 * Get radiology technician by user ID.
 */
export const getRadiologyTechnicianByUserId = async (userId: number) => {
  console.log(`🩻 Fetching radiology technician by user ID: ${userId}`);

  const result = await db
    .select({
      technician: radiologyTechnicians,
      user: users,
      hospital: hospitals,
    })
    .from(radiologyTechnicians)
    .leftJoin(users, eq(radiologyTechnicians.userId, users.id))
    .leftJoin(hospitals, eq(radiologyTechnicians.hospitalId, hospitals.id))
    .where(eq(radiologyTechnicians.userId, userId))
    .limit(1);

  if (result.length === 0) {
    console.log(`❌ Radiology technician not found for user: ${userId}`);
    return null;
  }

  console.log(`✅ Radiology technician found for user ${userId}: technician ID ${result[0].technician.id}`);
  return result[0];
};

/**
 * Update radiology technician availability status.
 */
export const updateRadiologyTechnicianAvailability = async (technicianId: number, isAvailable: boolean) => {
  console.log(`🩻 Updating radiology technician availability: ${technicianId} -> ${isAvailable}`);

  const result = await db
    .update(radiologyTechnicians)
    .set({ isAvailable })
    .where(eq(radiologyTechnicians.id, technicianId))
    .returning();

  if (result.length === 0) {
    console.log(`❌ Radiology technician not found for availability update: ${technicianId}`);
    return null;
  }

  console.log(`✅ Radiology technician availability updated`);
  return result[0];
};
