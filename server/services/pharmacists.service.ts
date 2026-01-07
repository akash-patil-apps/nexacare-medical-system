// server/services/pharmacists.service.ts
import { db } from '../db';
import { pharmacists, users, hospitals } from '../../shared/schema';
import type { InsertPharmacist } from '../../shared/schema';
import { eq, like, and } from 'drizzle-orm';

/**
 * Create a new pharmacist profile.
 */
export const createPharmacist = async (data: Omit<InsertPharmacist, 'id' | 'createdAt'>) => {
  console.log(`💊 Creating pharmacist profile for user: ${data.userId}`);

  const pharmacistData = {
    ...data,
    createdAt: new Date()
  };

  const result = await db.insert(pharmacists).values(pharmacistData).returning();
  console.log(`✅ Pharmacist created: ${result[0]?.id}`);

  return result;
};

/**
 * Get all pharmacists.
 */
export const getAllPharmacists = async () => {
  console.log(`💊 Fetching all pharmacists`);
  const result = await db
    .select()
    .from(pharmacists)
    .where(() => true);

  console.log(`📋 Found ${result.length} pharmacists`);
  return result;
};

/**
 * Get pharmacist by ID with user and hospital info.
 */
export const getPharmacistById = async (pharmacistId: number) => {
  if (
    typeof pharmacistId !== 'number' ||
    Number.isNaN(pharmacistId) ||
    !Number.isFinite(pharmacistId) ||
    !Number.isInteger(pharmacistId) ||
    pharmacistId <= 0
  ) {
    console.warn(`💊 getPharmacistById called with invalid id`, {
      pharmacistId,
      type: typeof pharmacistId,
    });
    return null;
  }

  console.log(`💊 Fetching pharmacist by ID: ${pharmacistId}`);

  const result = await db
    .select({
      pharmacist: pharmacists,
      user: users,
      hospital: hospitals,
    })
    .from(pharmacists)
    .leftJoin(users, eq(pharmacists.userId, users.id))
    .leftJoin(hospitals, eq(pharmacists.hospitalId, hospitals.id))
    .where(eq(pharmacists.id, pharmacistId))
    .limit(1);

  if (result.length === 0) {
    console.log(`❌ Pharmacist not found: ${pharmacistId}`);
    return null;
  }

  console.log(`✅ Pharmacist found: ${result[0].pharmacist.id}`);
  return result[0];
};

/**
 * Get pharmacists by hospital ID.
 */
export const getPharmacistsByHospital = async (hospitalId: number) => {
  if (
    typeof hospitalId !== 'number' ||
    Number.isNaN(hospitalId) ||
    !Number.isFinite(hospitalId) ||
    !Number.isInteger(hospitalId) ||
    hospitalId <= 0
  ) {
    console.warn(`🏥 getPharmacistsByHospital called with invalid hospitalId`, {
      hospitalId,
      type: typeof hospitalId,
    });
    return [];
  }

  console.log(`🏥 Fetching pharmacists for hospital: ${hospitalId}`);

  const result = await db
    .select({
      pharmacist: pharmacists,
      user: users,
    })
    .from(pharmacists)
    .leftJoin(users, eq(pharmacists.userId, users.id))
    .where(eq(pharmacists.hospitalId, hospitalId));

  console.log(`📋 Found ${result.length} pharmacists for hospital ${hospitalId}`);
  return result;
};

/**
 * Update pharmacist profile.
 */
export const updatePharmacistProfile = async (pharmacistId: number, data: Partial<Omit<InsertPharmacist, 'id' | 'userId' | 'createdAt'>>) => {
  console.log(`💊 Updating pharmacist profile: ${pharmacistId}`, data);

  const result = await db
    .update(pharmacists)
    .set(data)
    .where(eq(pharmacists.id, pharmacistId))
    .returning();

  if (result.length === 0) {
    console.log(`❌ Pharmacist not found for update: ${pharmacistId}`);
    return null;
  }

  console.log(`✅ Pharmacist updated: ${result[0].id}`);
  return result[0];
};

/**
 * Search pharmacists by name or specialization.
 */
export const searchPharmacists = async (query: string, hospitalId?: number) => {
  console.log(`🔍 Searching pharmacists: "${query}"`, hospitalId ? `in hospital ${hospitalId}` : '');

  const searchCondition = hospitalId
    ? and(
        like(users.fullName, `%${query}%`),
        eq(pharmacists.hospitalId, hospitalId)
      )
    : like(users.fullName, `%${query}%`);

  const result = await db
    .select({
      pharmacist: pharmacists,
      user: users,
      hospital: hospitals,
    })
    .from(pharmacists)
    .leftJoin(users, eq(pharmacists.userId, users.id))
    .leftJoin(hospitals, eq(pharmacists.hospitalId, hospitals.id))
    .where(searchCondition)
    .limit(20);

  console.log(`📋 Found ${result.length} pharmacists matching "${query}"`);
  return result;
};

/**
 * Get pharmacist by user ID.
 */
export const getPharmacistByUserId = async (userId: number) => {
  console.log(`💊 Fetching pharmacist by user ID: ${userId}`);

  const result = await db
    .select({
      pharmacist: pharmacists,
      user: users,
      hospital: hospitals,
    })
    .from(pharmacists)
    .leftJoin(users, eq(pharmacists.userId, users.id))
    .leftJoin(hospitals, eq(pharmacists.hospitalId, hospitals.id))
    .where(eq(pharmacists.userId, userId))
    .limit(1);

  if (result.length === 0) {
    console.log(`❌ Pharmacist not found for user: ${userId}`);
    return null;
  }

  console.log(`✅ Pharmacist found for user ${userId}: pharmacist ID ${result[0].pharmacist.id}`);
  return result[0];
};

/**
 * Update pharmacist availability status.
 */
export const updatePharmacistAvailability = async (pharmacistId: number, isAvailable: boolean) => {
  console.log(`💊 Updating pharmacist availability: ${pharmacistId} -> ${isAvailable}`);

  const result = await db
    .update(pharmacists)
    .set({ isAvailable })
    .where(eq(pharmacists.id, pharmacistId))
    .returning();

  if (result.length === 0) {
    console.log(`❌ Pharmacist not found for availability update: ${pharmacistId}`);
    return null;
  }

  console.log(`✅ Pharmacist availability updated`);
  return result[0];
};
