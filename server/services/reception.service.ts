// server/services/reception.service.ts
import { db } from '../db';
import { receptionists, appointments } from '../../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { InsertReceptionist } from '../../shared/schema-types';
import { createNotification } from './notifications.service';

/**
 * Add a new receptionist to a hospital.
 */
export const addReceptionist = async (data: InsertReceptionist) => {
  return db.insert(receptionists).values(data).returning();
};

/**
 * Get all receptionists for a given hospital.
 */
export const getReceptionistsByHospital = async (hospitalId: number) => {
  return db.select().from(receptionists).where(eq(receptionists.hospitalId, hospitalId));
};

/**
 * Get walk-in appointments that have not yet been confirmed.
 * (Assumes 'walk-in' type, pending status, and null receptionist)
 */
export const getWalkInAppointments = async (receptionistUserId: number) => {
  const [rec] = await db
    .select()
    .from(receptionists)
    .where(eq(receptionists.userId, receptionistUserId))
    .limit(1);

  if (!rec) return [];

  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.hospitalId, rec.hospitalId),
        eq(appointments.type, 'walk-in'),
        eq(appointments.status, 'pending'),
        isNull(appointments.receptionistId)
      )
    );
};

/**
 * Confirm an appointment and notify doctor + patient.
 */
export const confirmAppointment = async (appointmentId: number, receptionistId: number) => {
  const [updated] = await db
    .update(appointments)
    .set({
      status: 'confirmed',
      receptionistId,
      confirmedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning();

  if (!updated) throw new Error('Appointment not found');

  const { patientId, doctorId } = updated;

  await Promise.all([
    createNotification({
      userId: patientId,
      type: 'appointment_confirmed',
      title: 'Appointment Confirmed',
      message: `Your appointment has been confirmed.`,
    }),
    createNotification({
      userId: doctorId,
      type: 'appointment_confirmed',
      title: 'New Patient Assigned',
      message: `A patient appointment has been confirmed.`,
    }),
  ]);

  return updated;
};
