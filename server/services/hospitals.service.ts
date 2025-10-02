// server/services/hospitals.service.ts
import { db } from '../db';
import { hospitals } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type { InsertHospital } from '../../shared/schema-types';
import { doctors, labs } from '../../shared/schema';


/**
 * Fetch all hospitals from DB.
 */
export const getAllHospitals = async () => {
  return db.select().from(hospitals);
};

/**
 * Create a new hospital record.
 */
export const createHospital = async (hospital: Omit<InsertHospital, 'id' | 'createdAt'>) => {
  return db.insert(hospitals).values(hospital).returning();
};

/**
 * Verify a hospital's identity.
 */
export const verifyHospital = async (hospitalId: number) => {
  return db.update(hospitals).set({ isVerified: true }).where(eq(hospitals.id, hospitalId)).returning();
};

export const approveDoctor = async (doctorId: number) => {
  return db.update(doctors).set({ approvalStatus: 'approved' }).where(eq(doctors.id, doctorId)).returning();
};

export const approveLab = async (labId: number) => {
  return db.update(labs).set({ approvalStatus: 'approved' }).where(eq(labs.id, labId)).returning();
};