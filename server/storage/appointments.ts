// server/storage/appointments.ts
import { db } from '../db';
import { appointments } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type { InsertAppointment } from '../../shared/schema-types';

/**
 * Insert a new appointment record into the DB.
 */
export const createAppointment = (appt: Omit<InsertAppointment, 'id' | 'createdAt' | 'status'>) => {
  return db.insert(appointments).values(appt).returning();
};

/**
 * Get a single appointment by ID.
 */
export const getAppointmentById = (id: number) => {
  return db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
};

/**
 * Get all appointments for a doctor.
 */
export const getAppointmentsForDoctor = (doctorId: number) => {
  return db.select().from(appointments).where(eq(appointments.doctorId, doctorId));
};

/**
 * Get all appointments for a patient.
 */
export const getAppointmentsForPatient = (patientId: number) => {
  return db.select().from(appointments).where(eq(appointments.patientId, patientId));
};
