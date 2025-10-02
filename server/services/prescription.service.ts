// server/services/prescription.service.ts
import { db } from "../db";
import { prescriptions } from "../../shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { InsertPrescription } from "../../shared/schema-types";

// 1. Issue new prescription
export const issuePrescription = async (data: InsertPrescription) => {
  const inserted = await db.insert(prescriptions).values(data).returning();
  return inserted[0];
};

// 2. Get prescriptions for a patient (basic)
export const getPrescriptionsForPatient = async (patientId: number) => {
  return await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.patientId, patientId));
};

// 3. Get filtered prescriptions for a patient by hospital/date range
export const getPrescriptionsByFilters = async ({
  patientId,
  hospitalId,
  from,
  to,
}: {
  patientId: number;
  hospitalId?: number;
  from?: Date;
  to?: Date;
}) => {
  let conditions = [eq(prescriptions.patientId, patientId)];

  if (hospitalId) {
    conditions.push(eq(prescriptions.hospitalId, hospitalId));
  }
  if (from && to) {
    conditions.push(gte(prescriptions.createdAt, from));
    conditions.push(lte(prescriptions.createdAt, to));
  }

  return await db.select().from(prescriptions).where(and(...conditions));
};

// 4. Update prescription (doctor-only)
export const updatePrescription = async (
  doctorId: number,
  prescriptionId: number,
  updates: Partial<Pick<InsertPrescription, "diagnosis" | "medications" | "instructions" | "followUpDate">>
) => {
  return await db
    .update(prescriptions)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.doctorId, doctorId)))
    .returning();
};

// 5. Delete prescription (doctor-only)
export const deletePrescription = async (
  doctorId: number,
  prescriptionId: number
) => {
  return await db
    .delete(prescriptions)
    .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.doctorId, doctorId)))
    .returning();
};

// 6. Get prescriptions for doctor with filters
export const getPrescriptionsForDoctor = async ({
  doctorId,
  search,
  hospitalId,
  from,
  to,
  status,
  limit,
}: {
  doctorId: number;
  search?: string;
  hospitalId?: number;
  from?: Date;
  to?: Date;
  status?: string;
  limit?: number;
}) => {
  let conditions = [eq(prescriptions.doctorId, doctorId)];

  if (hospitalId) {
    conditions.push(eq(prescriptions.hospitalId, hospitalId));
  }
  if (from && to) {
    conditions.push(gte(prescriptions.createdAt, from));
    conditions.push(lte(prescriptions.createdAt, to));
  }
  if (status && status !== 'all') {
    if (status === 'active') {
      conditions.push(eq(prescriptions.isActive, true));
    } else if (status === 'inactive') {
      conditions.push(eq(prescriptions.isActive, false));
    }
  }

  const query = db.select().from(prescriptions).where(and(...conditions));
  
  if (limit) {
    return await query.limit(limit);
  }

  return await query;
};

// 7. Get prescriptions for hospital admin
export const getPrescriptionsForHospital = async ({
  hospitalId,
  search,
  doctorId,
  from,
  to,
  status,
  limit,
}: {
  hospitalId: number;
  search?: string;
  doctorId?: number;
  from?: Date;
  to?: Date;
  status?: string;
  limit?: number;
}) => {
  let conditions = [eq(prescriptions.hospitalId, hospitalId)];

  if (doctorId) {
    conditions.push(eq(prescriptions.doctorId, doctorId));
  }
  if (from && to) {
    conditions.push(gte(prescriptions.createdAt, from));
    conditions.push(lte(prescriptions.createdAt, to));
  }
  if (status && status !== 'all') {
    if (status === 'active') {
      conditions.push(eq(prescriptions.isActive, true));
    } else if (status === 'inactive') {
      conditions.push(eq(prescriptions.isActive, false));
    }
  }

  const query = db.select().from(prescriptions).where(and(...conditions));
  
  if (limit) {
    return await query.limit(limit);
  }

  return await query;
};

// 8. Get prescription by ID with authorization
export const getPrescriptionById = async (
  prescriptionId: number,
  userId: number,
  userRole: string
) => {
  const prescription = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, prescriptionId));

  if (prescription.length === 0) return null;

  const prescriptionData = prescription[0];

  // Authorization logic
  if (userRole === 'DOCTOR' && prescriptionData.doctorId !== userId) {
    return null; // Doctor can only see their own prescriptions
  }
  if (userRole === 'PATIENT' && prescriptionData.patientId !== userId) {
    return null; // Patient can only see their own prescriptions
  }
  // Hospital admin can see all prescriptions in their hospital (handled by hospitalId)

  return prescriptionData;
};

