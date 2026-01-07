// server/services/nurses.service.ts
import { db } from '../db';
import { nurses, users, hospitals } from '../../shared/schema';
import type { InsertNurse } from '../../shared/schema';
import { eq, like, and } from 'drizzle-orm';

/**
 * Create a new nurse profile.
 */
export const createNurse = async (data: Omit<InsertNurse, 'id' | 'createdAt'>) => {
  console.log(`👩‍⚕️ Creating nurse profile for ${data.userId}`);

  const nurseData = {
    ...data,
    createdAt: new Date()
  };

  const result = await db.insert(nurses).values(nurseData).returning();
  console.log(`✅ Nurse created: ${result[0]?.id}`);

  return result;
};

/**
 * Get all nurses.
 */
export const getAllNurses = async () => {
  console.log(`👩‍⚕️ Fetching all nurses`);
  const result = await db
    .select()
    .from(nurses)
    .where(() => true);

  console.log(`📋 Found ${result.length} nurses`);
  return result;
};

/**
 * Get nurse by ID with user and hospital info.
 */
export const getNurseById = async (nurseId: number) => {
  if (
    typeof nurseId !== 'number' ||
    Number.isNaN(nurseId) ||
    !Number.isFinite(nurseId) ||
    !Number.isInteger(nurseId) ||
    nurseId <= 0
  ) {
    console.warn(`👩‍⚕️ getNurseById called with invalid id`, {
      nurseId,
      type: typeof nurseId,
    });
    return null;
  }

  console.log(`👩‍⚕️ Fetching nurse by ID: ${nurseId}`);

  const result = await db
    .select({
      nurse: nurses,
      user: users,
      hospital: hospitals,
    })
    .from(nurses)
    .leftJoin(users, eq(nurses.userId, users.id))
    .leftJoin(hospitals, eq(nurses.hospitalId, hospitals.id))
    .where(eq(nurses.id, nurseId))
    .limit(1);

  if (result.length === 0) {
    console.log(`❌ Nurse not found: ${nurseId}`);
    return null;
  }

  console.log(`✅ Nurse found: ${result[0].nurse.id}`);
  return result[0];
};

/**
 * Get nurses by hospital ID.
 */
export const getNursesByHospital = async (hospitalId: number) => {
  if (
    typeof hospitalId !== 'number' ||
    Number.isNaN(hospitalId) ||
    !Number.isFinite(hospitalId) ||
    !Number.isInteger(hospitalId) ||
    hospitalId <= 0
  ) {
    console.warn(`🏥 getNursesByHospital called with invalid hospitalId`, {
      hospitalId,
      type: typeof hospitalId,
    });
    return [];
  }

  console.log(`🏥 Fetching nurses for hospital: ${hospitalId}`);

  const result = await db
    .select({
      nurse: nurses,
      user: users,
    })
    .from(nurses)
    .leftJoin(users, eq(nurses.userId, users.id))
    .where(eq(nurses.hospitalId, hospitalId));

  console.log(`📋 Found ${result.length} nurses for hospital ${hospitalId}`);
  return result;
};

/**
 * Update nurse profile.
 */
export const updateNurseProfile = async (nurseId: number, data: Partial<Omit<InsertNurse, 'id' | 'userId' | 'createdAt'>>) => {
  console.log(`👩‍⚕️ Updating nurse profile: ${nurseId}`, data);

  const result = await db
    .update(nurses)
    .set(data)
    .where(eq(nurses.id, nurseId))
    .returning();

  if (result.length === 0) {
    console.log(`❌ Nurse not found for update: ${nurseId}`);
    return null;
  }

  console.log(`✅ Nurse updated: ${result[0].id}`);
  return result[0];
};

/**
 * Search nurses by name or specialty.
 */
export const searchNurses = async (query: string, hospitalId?: number) => {
  console.log(`🔍 Searching nurses: "${query}"`, hospitalId ? `in hospital ${hospitalId}` : '');

  const searchCondition = hospitalId
    ? and(
        like(users.fullName, `%${query}%`),
        eq(nurses.hospitalId, hospitalId)
      )
    : like(users.fullName, `%${query}%`);

  const result = await db
    .select({
      nurse: nurses,
      user: users,
      hospital: hospitals,
    })
    .from(nurses)
    .leftJoin(users, eq(nurses.userId, users.id))
    .leftJoin(hospitals, eq(nurses.hospitalId, hospitals.id))
    .where(searchCondition)
    .limit(20);

  console.log(`📋 Found ${result.length} nurses matching "${query}"`);
  return result;
};

/**
 * Get nurse by user ID.
 */
export const getNurseByUserId = async (userId: number) => {
  console.log(`👩‍⚕️ Fetching nurse by user ID: ${userId}`);

  const result = await db
    .select({
      nurse: nurses,
      user: users,
      hospital: hospitals,
    })
    .from(nurses)
    .leftJoin(users, eq(nurses.userId, users.id))
    .leftJoin(hospitals, eq(nurses.hospitalId, hospitals.id))
    .where(eq(nurses.userId, userId))
    .limit(1);

  if (result.length === 0) {
    console.log(`❌ Nurse not found for user: ${userId}`);
    return null;
  }

  console.log(`✅ Nurse found for user ${userId}: nurse ID ${result[0].nurse.id}`);
  return result[0];
};

/**
 * Update nurse availability status.
 */
export const updateNurseAvailability = async (nurseId: number, isAvailable: boolean) => {
  console.log(`👩‍⚕️ Updating nurse availability: ${nurseId} -> ${isAvailable}`);

  const result = await db
    .update(nurses)
    .set({ isAvailable })
    .where(eq(nurses.id, nurseId))
    .returning();

  if (result.length === 0) {
    console.log(`❌ Nurse not found for availability update: ${nurseId}`);
    return null;
  }

  console.log(`✅ Nurse availability updated: ${result[0].id}`);
  return result[0];
};
