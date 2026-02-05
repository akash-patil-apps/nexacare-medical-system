import { db } from '../db';
import { opdQueueEntries, appointments, patients, doctors, users } from '../../shared/schema';
import { eq, and, sql, desc, ne, inArray, not } from 'drizzle-orm';
import {
  parseTokenIdentifier,
  slotKeyToMinutes,
  isLateArrival,
  getSlotKeyFromAppointment,
} from './opd-token';

/**
 * Check-in appointment into OPD queue. Uses token_identifier from appointment (assigned at book).
 * Queue order is computed dynamically in getQueueForDoctor (slot + arrival priority).
 */
export const checkInToQueue = async (
  appointmentId: number,
  actor: { userId: number; hospitalId: number }
) => {
  const [apt] = await db.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
  if (!apt) throw new Error('Appointment not found');

  const existing = await db
    .select()
    .from(opdQueueEntries)
    .where(eq(opdQueueEntries.appointmentId, appointmentId))
    .limit(1);
  if (existing.length > 0) return existing[0];

  // Use calendar date (YYYY-MM-DD) so it matches frontend "today" (e.g. IST).
  // Avoid toISOString() which uses UTC and can shift the day.
  const aptDate = apt.appointmentDate instanceof Date ? apt.appointmentDate : new Date(apt.appointmentDate);
  const y = aptDate.getFullYear();
  const m = aptDate.getMonth() + 1;
  const d = aptDate.getDate();
  const queueDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const maxTokenResult = await db
    .select({ maxToken: sql<number>`COALESCE(MAX(${opdQueueEntries.tokenNumber}), 0)` })
    .from(opdQueueEntries)
    .where(and(eq(opdQueueEntries.doctorId, apt.doctorId), eq(opdQueueEntries.queueDate, queueDate)));
  const nextToken = (maxTokenResult[0]?.maxToken ?? 0) + 1;

  const maxPositionResult = await db
    .select({ maxPosition: sql<number>`COALESCE(MAX(${opdQueueEntries.position}), 0)` })
    .from(opdQueueEntries)
    .where(and(eq(opdQueueEntries.doctorId, apt.doctorId), eq(opdQueueEntries.queueDate, queueDate)));
  const nextPosition = (maxPositionResult[0]?.maxPosition ?? 0) + 1;

  const tokenIdentifier = (apt as any).tokenIdentifier ?? null;

  const [queueEntry] = await db
    .insert(opdQueueEntries)
    .values({
      hospitalId: actor.hospitalId,
      doctorId: apt.doctorId,
      appointmentId,
      patientId: apt.patientId,
      queueDate,
      tokenIdentifier,
      tokenNumber: nextToken,
      position: nextPosition,
      status: 'waiting',
      checkedInAt: sql`NOW()`,
      createdAt: sql`NOW()`,
    })
    .returning();

  await db
    .update(appointments)
    .set({ checkedInAt: sql`NOW()`, status: 'checked-in' })
    .where(eq(appointments.id, appointmentId));

  return queueEntry;
};

/**
 * Get queue for doctor and date. Only ACTIVE (checked-in) entries.
 * Order: Layer 1 = slot priority (earlier slot first), Layer 2 = arrival (earlier check-in first).
 * Late arrival (check-in after slot start): slot priority expired, ordered after on-time patients by check-in time.
 */
export const getQueueForDoctor = async (
  doctorId: number,
  queueDate: string // YYYY-MM-DD
) => {
  const rows = await db
    .select({
      queue: opdQueueEntries,
      appointment: appointments,
      patient: patients,
      doctor: doctors,
    })
    .from(opdQueueEntries)
    .leftJoin(appointments, eq(opdQueueEntries.appointmentId, appointments.id))
    .leftJoin(patients, eq(opdQueueEntries.patientId, patients.id))
    .leftJoin(doctors, eq(opdQueueEntries.doctorId, doctors.id))
    .where(
      and(
        eq(opdQueueEntries.doctorId, doctorId),
        eq(opdQueueEntries.queueDate, queueDate),
      ),
    );

  const parsed = rows.map((row) => {
    const tokenId = (row.queue as any).tokenIdentifier;
    const slotKey = tokenId
      ? parseTokenIdentifier(tokenId)?.slotKey ?? null
      : row.appointment
        ? getSlotKeyFromAppointment(
            (row.appointment as any).appointmentTime,
            (row.appointment as any).timeSlot,
          )
        : null;
    const slotMinutes = slotKey ? slotKeyToMinutes(slotKey) : 0;
    const checkedInAt = (row.queue as any).checkedInAt;
    const late = slotKey ? isLateArrival(slotKey, queueDate, checkedInAt) : false;
    return { row, slotKey, slotMinutes, checkedInAt, late };
  });

  parsed.sort((a, b) => {
    if (a.late !== b.late) return a.late ? 1 : -1;
    if (a.slotMinutes !== b.slotMinutes) return a.slotMinutes - b.slotMinutes;
    const tA = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0;
    const tB = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0;
    return tA - tB;
  });

  return parsed.map((p) => p.row);
};

/**
 * Get today's confirmed/pending appointments for a doctor that are not yet in the queue.
 * Lets receptionist see e.g. "Ravi Singh - Confirmed" and check them in from the queue view.
 */
export const getNotYetCheckedInForDoctor = async (
  doctorId: number,
  queueDate: string // YYYY-MM-DD
) => {
  const inQueue = await db
    .select({ appointmentId: opdQueueEntries.appointmentId })
    .from(opdQueueEntries)
    .where(
      and(
        eq(opdQueueEntries.doctorId, doctorId),
        eq(opdQueueEntries.queueDate, queueDate),
      ),
    );
  const inQueueIds = inQueue.map((r) => r.appointmentId).filter((id): id is number => id != null);

  const conditions = [
    eq(appointments.doctorId, doctorId),
    sql`DATE(${appointments.appointmentDate}) = ${sql.raw(`'${queueDate}'::date`)}`,
    inArray(appointments.status, ['confirmed', 'pending']),
  ];
  if (inQueueIds.length > 0) {
    conditions.push(not(inArray(appointments.id, inQueueIds)));
  }

  const rows = await db
    .select({
      appointment: appointments,
      patient: patients,
      patientName: users.fullName,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(users, eq(patients.userId, users.id))
    .where(and(...conditions))
    .orderBy(appointments.appointmentTime);

  return rows.map((r) => ({
    appointment: r.appointment,
    patient: r.patient,
    patientName: r.patientName ?? 'Patient',
  }));
};

/**
 * Call a token (mark as called)
 */
export const callToken = async (queueEntryId: number) => {
  const [updated] = await db
    .update(opdQueueEntries)
    .set({
      status: 'called',
      calledAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(opdQueueEntries.id, queueEntryId))
    .returning();

  return updated;
};

/**
 * Start consultation
 */
export const startConsultation = async (queueEntryId: number) => {
  const queueEntry = await db
    .select()
    .from(opdQueueEntries)
    .where(eq(opdQueueEntries.id, queueEntryId))
    .limit(1);

  if (queueEntry.length === 0) {
    throw new Error('Queue entry not found');
  }

  const [updated] = await db
    .update(opdQueueEntries)
    .set({
      status: 'in_consultation',
      consultationStartedAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(opdQueueEntries.id, queueEntryId))
    .returning();

  // Update appointment status
  if (queueEntry[0].appointmentId) {
    await db
      .update(appointments)
      .set({ status: 'in_consultation' })
      .where(eq(appointments.id, queueEntry[0].appointmentId));
  }

  return updated;
};

/**
 * Complete consultation
 */
export const completeConsultation = async (queueEntryId: number) => {
  const queueEntry = await db
    .select()
    .from(opdQueueEntries)
    .where(eq(opdQueueEntries.id, queueEntryId))
    .limit(1);

  if (queueEntry.length === 0) {
    throw new Error('Queue entry not found');
  }

  const [updated] = await db
    .update(opdQueueEntries)
    .set({
      status: 'completed',
      completedAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(opdQueueEntries.id, queueEntryId))
    .returning();

  // Update appointment status
  if (queueEntry[0].appointmentId) {
    await db
      .update(appointments)
      .set({ status: 'completed', completedAt: sql`NOW()` })
      .where(eq(appointments.id, queueEntry[0].appointmentId));
  }

  return updated;
};

/**
 * Mark as no-show
 */
export const markNoShow = async (queueEntryId: number) => {
  const [updated] = await db
    .update(opdQueueEntries)
    .set({
      status: 'no_show',
      updatedAt: sql`NOW()`,
    })
    .where(eq(opdQueueEntries.id, queueEntryId))
    .returning();

  return updated;
};

/**
 * Reorder queue entry
 */
export const reorderQueue = async (
  queueEntryId: number,
  newPosition: number,
) => {
  const queueEntry = await db
    .select()
    .from(opdQueueEntries)
    .where(eq(opdQueueEntries.id, queueEntryId))
    .limit(1);

  if (queueEntry.length === 0) {
    throw new Error('Queue entry not found');
  }

  const entry = queueEntry[0];

  // Get all entries for this doctor/date (all statuses for reordering)
  const allEntries = await db
    .select()
    .from(opdQueueEntries)
    .where(
      and(
        eq(opdQueueEntries.doctorId, entry.doctorId),
        eq(opdQueueEntries.queueDate, entry.queueDate),
      ),
    )
    .orderBy(opdQueueEntries.position);

  // Validate new position
  if (newPosition < 1 || newPosition > allEntries.length) {
    throw new Error('Invalid position');
  }

  // Reorder positions
  const oldPosition = entry.position;
  if (newPosition === oldPosition) {
    return entry;
  }

  // Simple reorder: shift entries between old and new position
  if (newPosition < oldPosition) {
    // Moving up: shift entries down (increase position)
    await db
      .update(opdQueueEntries)
      .set({
        position: sql`${opdQueueEntries.position} + 1`,
        updatedAt: sql`NOW()`,
      })
      .where(
        and(
          eq(opdQueueEntries.doctorId, entry.doctorId),
          eq(opdQueueEntries.queueDate, entry.queueDate),
          sql`${opdQueueEntries.position} >= ${newPosition}`,
          sql`${opdQueueEntries.position} < ${oldPosition}`,
          ne(opdQueueEntries.id, queueEntryId),
        ),
      );
  } else {
    // Moving down: shift entries up (decrease position)
    await db
      .update(opdQueueEntries)
      .set({
        position: sql`${opdQueueEntries.position} - 1`,
        updatedAt: sql`NOW()`,
      })
      .where(
        and(
          eq(opdQueueEntries.doctorId, entry.doctorId),
          eq(opdQueueEntries.queueDate, entry.queueDate),
          sql`${opdQueueEntries.position} > ${oldPosition}`,
          sql`${opdQueueEntries.position} <= ${newPosition}`,
          ne(opdQueueEntries.id, queueEntryId),
        ),
      );
  }

  // Update this entry's position
  const [updated] = await db
    .update(opdQueueEntries)
    .set({
      position: newPosition,
      updatedAt: sql`NOW()`,
    })
    .where(eq(opdQueueEntries.id, queueEntryId))
    .returning();

  return updated;
};

/**
 * Skip token (return to waiting)
 */
export const skipToken = async (queueEntryId: number) => {
  const queueEntry = await db
    .select()
    .from(opdQueueEntries)
    .where(eq(opdQueueEntries.id, queueEntryId))
    .limit(1);

  if (queueEntry.length === 0) {
    throw new Error('Queue entry not found');
  }

  const entry = queueEntry[0];

  // Get max position
  const maxPositionResult = await db
    .select({
      maxPosition: sql<number>`COALESCE(MAX(${opdQueueEntries.position}), 0)`,
    })
    .from(opdQueueEntries)
    .where(
      and(
        eq(opdQueueEntries.doctorId, entry.doctorId),
        eq(opdQueueEntries.queueDate, entry.queueDate),
      ),
    );

  const maxPosition = maxPositionResult[0]?.maxPosition ?? 0;

  const [updated] = await db
    .update(opdQueueEntries)
    .set({
      status: 'waiting',
      position: maxPosition + 1,
      updatedAt: sql`NOW()`,
    })
    .where(eq(opdQueueEntries.id, queueEntryId))
    .returning();

  return updated;
};

