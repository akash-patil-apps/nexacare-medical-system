// server/services/prescription.service.ts
import { db } from "../db";
import { prescriptions, prescriptionAudits, doctors, users, hospitals } from "../../shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { InsertPrescription } from "../../shared/schema-types";

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const nowUtc = () => new Date();

const ensureEditable = (prescription: any) => {
  const createdAt = prescription.createdAt ? new Date(prescription.createdAt) : nowUtc();
  const editableUntil = prescription.editableUntil ? new Date(prescription.editableUntil) : addDays(createdAt, 7);
  const now = nowUtc();
  if (now > editableUntil) {
    throw new Error('Edit window expired. Please extend the prescription to edit.');
  }
  return editableUntil;
};

const createAudit = async (prescriptionId: number, doctorId: number, action: string, message: string) => {
  await db.insert(prescriptionAudits).values({
    prescriptionId,
    doctorId,
    action,
    message,
    createdAt: nowUtc(),
  });
};

// 1. Issue new prescription
export const issuePrescription = async (data: InsertPrescription) => {
  const base = { ...data };
  const createdAt = base.createdAt ? new Date(base.createdAt as any) : nowUtc();
  base.editableUntil = base.editableUntil ? base.editableUntil : addDays(createdAt, 7);
  const inserted = await db.insert(prescriptions).values(base).returning();
  const row = inserted[0];
  await createAudit(row.id, row.doctorId, 'created', `Created prescription. Editable until ${row.editableUntil?.toISOString?.() || row.editableUntil}`);
  return row;
};

// 2. Get prescriptions for a patient (basic)
export const getPrescriptionsForPatient = async (patientId: number) => {
  return await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.patientId, patientId));
};

// 2b. Get prescriptions for a patient with doctor (fullName) and hospital (name, address) for display
export const getPrescriptionsForPatientWithDetails = async (patientId: number) => {
  const rows = await db
    .select({
      prescription: prescriptions,
      doctorFullName: users.fullName,
      hospitalName: hospitals.name,
      hospitalAddress: hospitals.address,
    })
    .from(prescriptions)
    .leftJoin(doctors, eq(prescriptions.doctorId, doctors.id))
    .leftJoin(users, eq(doctors.userId, users.id))
    .leftJoin(hospitals, eq(prescriptions.hospitalId, hospitals.id))
    .where(eq(prescriptions.patientId, patientId));

  return rows.map((r) => ({
    ...r.prescription,
    doctor: { fullName: r.doctorFullName ?? undefined },
    hospital: r.hospitalName != null ? { name: r.hospitalName, address: r.hospitalAddress ?? undefined } : undefined,
  }));
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
  const existing = await db
    .select()
    .from(prescriptions)
    .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.doctorId, doctorId)));
  if (existing.length === 0) {
    throw new Error('Prescription not found or not authorized');
  }
  ensureEditable(existing[0]);

  const before = existing[0];
  const [updated] = await db
    .update(prescriptions)
    .set({ ...updates, updatedAt: nowUtc(), editableUntil: before.editableUntil || addDays(new Date(before.createdAt ?? nowUtc()), 7) })
    .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.doctorId, doctorId)))
    .returning();

  await createAudit(
    prescriptionId,
    doctorId,
    'updated',
    `Updated prescription. Diagnosis: '${before.diagnosis}' -> '${updated.diagnosis}'. Medications changed: ${before.medications !== updated.medications}`
  );

  return updated;
};

// 5. Delete prescription (doctor-only)
export const deletePrescription = async (
  doctorId: number,
  prescriptionId: number
) => {
  const deleted = await db
    .delete(prescriptions)
    .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.doctorId, doctorId)))
    .returning();
  if (deleted[0]) {
    await createAudit(prescriptionId, doctorId, 'deleted', 'Deleted prescription');
  }
  return deleted;
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

// 9. Extend prescription edit window
export const extendPrescription = async (prescriptionId: number, doctorId: number) => {
  const existing = await db
    .select()
    .from(prescriptions)
    .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.doctorId, doctorId)));
  if (existing.length === 0) throw new Error('Prescription not found or not authorized');

  const row = existing[0];
  const createdAt = row.createdAt ? new Date(row.createdAt) : nowUtc();
  const currentEditable = row.editableUntil ? new Date(row.editableUntil) : addDays(createdAt, 7);
  const base = currentEditable > nowUtc() ? currentEditable : nowUtc();
  const newEditable = addDays(base, 7); // extend by 7 days

  const [updated] = await db
    .update(prescriptions)
    .set({ editableUntil: newEditable, updatedAt: nowUtc() })
    .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.doctorId, doctorId)))
    .returning();

  await createAudit(prescriptionId, doctorId, 'extended', `Extended edit window to ${newEditable.toISOString()}`);
  return updated;
};

