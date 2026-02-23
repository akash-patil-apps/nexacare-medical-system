// server/services/prescriptions.service.ts
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { prescriptions } from '../../shared/schema';
import type { InsertPrescription } from '../../shared/schema-types';

/** Parse medication duration string to days (e.g. "5 days" -> 5, "1 week" -> 7, "2 (Tot: 0 Tab)" -> 2) */
function parseDurationToDays(durationStr: string): number {
  if (!durationStr || typeof durationStr !== 'string') return 7;
  const s = durationStr.toLowerCase().trim();
  if (s.includes('week')) return (parseInt(s, 10) || 1) * 7;
  if (s.includes('month')) return (parseInt(s, 10) || 1) * 30;
  if (s.includes('day')) return parseInt(s, 10) || 7;
  // Leading number as days (e.g. "2", "2 (Tot: 0 Tab)", "3 weeks")
  const leadingNum = parseInt(s, 10);
  if (!Number.isNaN(leadingNum) && leadingNum > 0) return leadingNum;
  return 7;
}

const buildAndCondition = (conditions: any[]) => {
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
};

export const issuePrescription = async (data: InsertPrescription) => {
  const payload = { ...data, createdAt: new Date() };
  return db.insert(prescriptions).values(payload).returning();
};

export const createPrescription = issuePrescription;

export const getPrescriptionsByPatient = async (patientId: number) => {
  return db.select().from(prescriptions).where(eq(prescriptions.patientId, patientId));
};

export const getPrescriptionsByDoctor = async (doctorId: number) => {
  return db.select().from(prescriptions).where(eq(prescriptions.doctorId, doctorId));
};

export const getPrescriptionsByHospital = async (hospitalId: number) => {
  return db.select().from(prescriptions).where(eq(prescriptions.hospitalId, hospitalId));
};

export const deactivatePrescription = async (prescriptionId: number) => {
  const result = await db
    .update(prescriptions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(prescriptions.id, prescriptionId))
    .returning();
  return result[0];
};

export const getActivePrescriptionsByPatient = async (patientId: number) => {
  return db
    .select()
    .from(prescriptions)
    .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.isActive, true)));
};

export const getPrescriptionsByAppointment = async (appointmentId: number) => {
  return db.select().from(prescriptions).where(eq(prescriptions.appointmentId, appointmentId));
};

export const getPrescriptionsNeedingFollowUp = async (date: Date) => {
  return db
    .select()
    .from(prescriptions)
    .where(and(eq(prescriptions.isActive, true), lte(prescriptions.followUpDate, date)));
};

export const getPrescriptionsForPatient = async (patientId: number) => {
  return getPrescriptionsByPatient(patientId);
};

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
  const conditions = [eq(prescriptions.patientId, patientId)];
  if (hospitalId) conditions.push(eq(prescriptions.hospitalId, hospitalId));
  if (from && to) {
    conditions.push(gte(prescriptions.createdAt, from));
    conditions.push(lte(prescriptions.createdAt, to));
  }
  return db.select().from(prescriptions).where(buildAndCondition(conditions));
};

export const updatePrescription = async (
  doctorId: number,
  prescriptionId: number,
  data: Partial<InsertPrescription>
) => {
  const result = await db
    .update(prescriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(buildAndCondition([eq(prescriptions.id, prescriptionId), eq(prescriptions.doctorId, doctorId)]))
    .returning();
  return result[0] ?? null;
};

export const deletePrescription = async (doctorId: number, prescriptionId: number) => {
  return db
    .update(prescriptions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(buildAndCondition([eq(prescriptions.id, prescriptionId), eq(prescriptions.doctorId, doctorId)]))
    .returning();
};

export const getPrescriptionsForDoctor = async ({
  doctorId,
  hospitalId,
  from,
  to,
  status,
  limit,
}: {
  doctorId: number;
  hospitalId?: number;
  from?: Date;
  to?: Date;
  status?: string;
  limit?: number;
}) => {
  const conditions = [eq(prescriptions.doctorId, doctorId)];
  if (hospitalId) conditions.push(eq(prescriptions.hospitalId, hospitalId));
  if (from && to) {
    conditions.push(gte(prescriptions.createdAt, from));
    conditions.push(lte(prescriptions.createdAt, to));
  }
  if (status && status !== 'all') {
    conditions.push(eq(prescriptions.isActive, status === 'active'));
  }
  let query = db.select().from(prescriptions).where(buildAndCondition(conditions));
  if (limit) query = query.limit(limit) as typeof query;
  return query;
};

export const getPrescriptionsForHospital = async ({
  hospitalId,
  doctorId,
  from,
  to,
  status,
  limit,
}: {
  hospitalId: number;
  doctorId?: number;
  from?: Date;
  to?: Date;
  status?: string;
  limit?: number;
}) => {
  const conditions = [eq(prescriptions.hospitalId, hospitalId)];
  if (doctorId) conditions.push(eq(prescriptions.doctorId, doctorId));
  if (from && to) {
    conditions.push(gte(prescriptions.createdAt, from));
    conditions.push(lte(prescriptions.createdAt, to));
  }
  if (status && status !== 'all') {
    conditions.push(eq(prescriptions.isActive, status === 'active'));
  }
  let query = db.select().from(prescriptions).where(buildAndCondition(conditions));
  if (limit) query = query.limit(limit) as typeof query;
  return query;
};

export const getPrescriptionById = async (prescriptionId: number, userId: number, userRole: string) => {
  const result = await db.select().from(prescriptions).where(eq(prescriptions.id, prescriptionId));
  if (result.length === 0) return null;

  const prescription = result[0];
  if (userRole === 'DOCTOR' && prescription.doctorId !== userId) return null;
  if (userRole === 'PATIENT' && prescription.patientId !== userId) return null;
  return prescription;
};

/**
 * Deactivate prescriptions whose medication duration has ended (duration-based auto deactivation).
 * Called by scheduler (e.g. daily). Prescription end date = createdAt + max duration across all medications.
 */
export async function deactivatePrescriptionsPastDuration(): Promise<number> {
  const active = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.isActive, true));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let deactivated = 0;
  for (const rx of active) {
    let maxDays = 0;
    try {
      const meds = typeof rx.medications === 'string' ? JSON.parse(rx.medications) : rx.medications;
      if (Array.isArray(meds)) {
        for (const m of meds) {
          const d = parseDurationToDays(m.duration ?? '');
          if (d > maxDays) maxDays = d;
        }
      }
    } catch {
      continue;
    }
    if (maxDays === 0) continue;
    const start = rx.createdAt ? new Date(rx.createdAt) : new Date();
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + maxDays);
    endDate.setHours(0, 0, 0, 0);
    if (endDate < today) {
      await deactivatePrescription(rx.id);
      deactivated += 1;
    }
  }
  return deactivated;
}

