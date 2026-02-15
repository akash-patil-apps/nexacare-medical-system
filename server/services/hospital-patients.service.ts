/**
 * Hospital patients: only patients who have at least one appointment (or encounter)
 * at this hospital. Used for admin Patients page - privacy: do not expose all
 * onboarded patients, only those who have interacted with the hospital.
 */
import { db } from '../db';
import { appointments, patients, users, doctors, hospitals, prescriptions } from '../../shared/schema';
import { eq, and, desc, sql, or, ilike, like } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

const doctorUser = alias(users, 'doctor_user');

/**
 * Get appointments for the hospital with patient and doctor info, sorted by date desc.
 * Only patients who have at least one appointment at this hospital are included.
 * Optional search filters by patient name, mobile, or patient id.
 */
export async function getEncounteredPatientsAppointments(
  hospitalId: number,
  options: { search?: string; limit?: number } = {}
) {
  const { search, limit = 500 } = options;

  const conditions = [eq(appointments.hospitalId, hospitalId)];
  if (search && search.trim()) {
    const s = search.trim();
    const searchPattern = `%${s}%`;
    const num = Number(s);
    const isNum = Number.isInteger(num) && num > 0;
    conditions.push(
      or(
        ilike(users.fullName, searchPattern),
        like(users.mobileNumber, searchPattern),
        ilike(users.email, searchPattern),
        isNum ? eq(patients.id, num) : sql`1=0`
      )!
    );
  }

  const rows = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      hospitalId: appointments.hospitalId,
      appointmentDate: appointments.appointmentDate,
      appointmentTime: appointments.appointmentTime,
      timeSlot: appointments.timeSlot,
      reason: appointments.reason,
      status: appointments.status,
      type: appointments.type,
      tokenIdentifier: appointments.tokenIdentifier,
      tokenNumber: appointments.tokenNumber,
      checkedInAt: appointments.checkedInAt,
      completedAt: appointments.completedAt,
      createdAt: appointments.createdAt,
      patientName: users.fullName,
      patientMobile: users.mobileNumber,
      patientEmail: users.email,
      doctorName: doctorUser.fullName,
      hospitalName: hospitals.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(users, eq(patients.userId, users.id))
    .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(doctorUser, eq(doctors.userId, doctorUser.id))
    .leftJoin(hospitals, eq(appointments.hospitalId, hospitals.id))
    .where(and(...conditions))
    .orderBy(desc(appointments.appointmentDate))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    doctorName: r.doctorName ?? 'Unknown',
  }));
}

/**
 * Check if a patient has at least one encounter (appointment or prescription) at this hospital.
 */
export async function patientHasEncounterAtHospital(
  patientId: number,
  hospitalId: number
): Promise<boolean> {
  const [apt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.patientId, patientId), eq(appointments.hospitalId, hospitalId)))
    .limit(1);
  if (apt) return true;
  const [rx] = await db
    .select({ id: prescriptions.id })
    .from(prescriptions)
    .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.hospitalId, hospitalId)))
    .limit(1);
  return !!rx;
}
