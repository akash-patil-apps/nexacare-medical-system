import { db } from '../db';
import { opdQueueEntries, appointments, patients, doctors } from '../../shared/schema';
import { eq, and, sql, desc, ne } from 'drizzle-orm';

/**
 * Check-in appointment and assign token number
 */
export const checkInToQueue = async (
  appointmentId: number,
  actor: { userId: number; hospitalId: number }
) => {
  const appointment = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (appointment.length === 0) {
    throw new Error('Appointment not found');
  }

  const apt = appointment[0];

  // Check if already in queue
  const existing = await db
    .select()
    .from(opdQueueEntries)
    .where(eq(opdQueueEntries.appointmentId, appointmentId))
    .limit(1);

  if (existing.length > 0) {
    throw new Error('Appointment already in queue');
  }

  // Get queue date (IST) - format as YYYY-MM-DD
  const appointmentDate = apt.appointmentDate instanceof Date 
    ? apt.appointmentDate 
    : new Date(apt.appointmentDate);
  const queueDate = appointmentDate.toISOString().slice(0, 10);

  // Get max token for this doctor/date
  const maxTokenResult = await db
    .select({
      maxToken: sql<number>`COALESCE(MAX(${opdQueueEntries.tokenNumber}), 0)`,
    })
    .from(opdQueueEntries)
    .where(
      and(
        eq(opdQueueEntries.doctorId, apt.doctorId),
        eq(opdQueueEntries.queueDate, queueDate),
      ),
    );

  const maxToken = maxTokenResult[0]?.maxToken ?? 0;
  const nextToken = maxToken + 1;

  // Get max position
  const maxPositionResult = await db
    .select({
      maxPosition: sql<number>`COALESCE(MAX(${opdQueueEntries.position}), 0)`,
    })
    .from(opdQueueEntries)
    .where(
      and(
        eq(opdQueueEntries.doctorId, apt.doctorId),
        eq(opdQueueEntries.queueDate, queueDate),
      ),
    );

  const maxPosition = maxPositionResult[0]?.maxPosition ?? 0;
  const nextPosition = maxPosition + 1;

  // Create queue entry
  const [queueEntry] = await db
    .insert(opdQueueEntries)
    .values({
      hospitalId: actor.hospitalId,
      doctorId: apt.doctorId,
      appointmentId: appointmentId,
      patientId: apt.patientId,
      queueDate: queueDate,
      tokenNumber: nextToken,
      position: nextPosition,
      status: 'waiting',
      checkedInAt: sql`NOW()`,
      createdAt: sql`NOW()`,
    })
    .returning();

  // Update appointment
  await db
    .update(appointments)
    .set({
      tokenNumber: nextToken,
      checkedInAt: sql`NOW()`,
      status: 'checked-in',
    })
    .where(eq(appointments.id, appointmentId));

  return queueEntry;
};

/**
 * Get queue for doctor and date
 */
export const getQueueForDoctor = async (
  doctorId: number,
  queueDate: string, // YYYY-MM-DD
) => {
  const entries = await db
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
    )
    .orderBy(opdQueueEntries.position);

  return entries;
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

