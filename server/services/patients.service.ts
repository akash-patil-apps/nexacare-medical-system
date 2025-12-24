// server/services/patients.service.ts
import { db } from "../db";
import { patients } from "../../shared/schema";
import { InsertPatient } from "../../shared/schema-types";
import { eq } from "drizzle-orm";

/**
 * Get patient by ID.
 */
export const getPatientById = async (patientId: number) => {
  console.log(`🏥 Fetching patient ${patientId}`);
  const result = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));
  
  return result[0] || null;
};

/**
 * Get patient by user ID.
 */
export const getPatientByUserId = async (userId: number) => {
  console.log(`🏥 Fetching patient by user ID ${userId}`);
  const result = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, userId));

  return result[0] || null;
};

/**
 * Create new patient profile.
 */
export const createPatient = async (data: Omit<InsertPatient, 'id' | 'createdAt'>) => {
  console.log(`🏥 Creating patient profile for user ${data.userId}`);
  
  const patientData = {
    ...data,
    createdAt: new Date()
  };

  const result = await db.insert(patients).values(patientData).returning();
  console.log(`✅ Patient created: ${result[0]?.id}`);
  
  return result;
};

/**
 * Get all patients.
 */
export const getAllPatients = async () => {
  console.log(`🏥 Fetching all patients`);
  const result = await db
    .select()
    .from(patients)
    .where(() => true);
  
  console.log(`📋 Found ${result.length} patients`);
  return result;
};

/**
 * Update patient by user ID.
 */
export const updatePatientByUserId = async (userId: number, data: Partial<InsertPatient>) => {
  console.log(`🏥 Updating patient for user ${userId}`);
  const updateData = {
    ...data,
    updatedAt: new Date()
  };
  
  const result = await db
    .update(patients)
    .set(updateData)
    .where((condition: any) => condition(userId))
    .returning();
  
  console.log(`✅ Patient updated for user ${userId}`);
  return result[0] || null;
};

/**
 * Update patient by ID.
 */
export const updatePatientById = async (patientId: number, data: Partial<InsertPatient>) => {
  console.log(`🏥 Updating patient ${patientId}`);
  const updateData = {
    ...data,
    updatedAt: new Date()
  };
  
  const result = await db
    .update(patients)
    .set(updateData)
    .where((condition: any) => condition(patientId))
    .returning();
  
  console.log(`✅ Patient ${patientId} updated`);
  return result[0] || null;
};

/**
 * Get patients by hospital (via appointments).
 */
export const getPatientsByHospital = async (hospitalId: number) => {
  console.log(`🏥 Fetching patients for hospital ${hospitalId} (via appointments)`);
  const result = await db
    .select()
    .from(patients)
    .where((condition: any) => condition(hospitalId));
  
  console.log(`📋 Found ${result.length} patients for hospital`);
  return result;
};

/**
 * Search patients by name or mobile number.
 */
export const searchPatients = async (query: string) => {
  console.log(`🏥 Searching patients with query: ${query}`);
  const result = await db
    .select()
    .from(patients)
    .where((condition: any) => condition(query));
  
  console.log(`📋 Found ${result.length} patients matching search`);
  return result;
};

/**
 * Get patient statistics.
 */
export const getPatientStats = async (patientId: number) => {
  console.log(`🏥 Fetching stats for patient ${patientId}`);
  
  // This would typically join with appointments table
  const stats = {
    totalAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    totalPrescriptions: 0,
    activePrescriptions: 0,
  };
  
  console.log(`📊 Patient ${patientId} stats:`, stats);
  return stats;
};
