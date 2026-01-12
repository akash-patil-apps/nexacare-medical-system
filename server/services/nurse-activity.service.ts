// server/services/nurse-activity.service.ts
import { db } from '../db';
import { nurseActivityLogs, nurses, users, patients, ipdEncounters } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Log nurse activity
 */
export const logNurseActivity = async (data: {
  encounterId: number;
  patientId: number;
  nurseId: number; // This should be the nurse ID, not user ID
  activityType: string;
  activitySubtype?: string;
  entityType?: string;
  entityId?: number;
  description: string;
  metadata?: string;
}) => {
  // Verify nurse exists
  const [nurse] = await db
    .select()
    .from(nurses)
    .where(eq(nurses.id, data.nurseId))
    .limit(1);

  if (!nurse) {
    throw new Error('Nurse not found');
  }

  const [log] = await db
    .insert(nurseActivityLogs)
    .values({
      encounterId: data.encounterId,
      patientId: data.patientId,
      nurseId: data.nurseId,
      activityType: data.activityType,
      activitySubtype: data.activitySubtype || null,
      entityType: data.entityType || null,
      entityId: data.entityId || null,
      description: data.description,
      metadata: data.metadata || null,
      createdAt: sql`NOW()`,
    })
    .returning();

  return log;
};

/**
 * Get activity log for an encounter
 */
export const getEncounterActivityLog = async (encounterId: number, limit = 100) => {
  const logs = await db
    .select({
      log: nurseActivityLogs,
      nurse: nurses,
      nurseUser: users,
      patient: patients,
      patientUser: users,
    })
    .from(nurseActivityLogs)
    .innerJoin(nurses, eq(nurseActivityLogs.nurseId, nurses.id))
    .innerJoin(users, eq(nurses.userId, users.id))
    .innerJoin(patients, eq(nurseActivityLogs.patientId, patients.id))
    .leftJoin(users, eq(patients.userId, users.id))
    .where(eq(nurseActivityLogs.encounterId, encounterId))
    .orderBy(desc(nurseActivityLogs.createdAt))
    .limit(limit);

  return logs.map(l => ({
    ...l.log,
    nurse: {
      ...l.nurse,
      user: l.nurseUser,
    },
    patient: {
      ...l.patient,
      user: l.patientUser,
    },
  }));
};

/**
 * Get activity log for a patient (across all encounters)
 */
export const getPatientActivityLog = async (patientId: number, limit = 100) => {
  const logs = await db
    .select({
      log: nurseActivityLogs,
      nurse: nurses,
      nurseUser: users,
      encounter: ipdEncounters,
    })
    .from(nurseActivityLogs)
    .innerJoin(nurses, eq(nurseActivityLogs.nurseId, nurses.id))
    .innerJoin(users, eq(nurses.userId, users.id))
    .leftJoin(ipdEncounters, eq(nurseActivityLogs.encounterId, ipdEncounters.id))
    .where(eq(nurseActivityLogs.patientId, patientId))
    .orderBy(desc(nurseActivityLogs.createdAt))
    .limit(limit);

  return logs;
};

/**
 * Get activity log for a nurse
 */
export const getNurseActivityLog = async (nurseId: number, limit = 100) => {
  const logs = await db
    .select({
      log: nurseActivityLogs,
      patient: patients,
      patientUser: users,
      encounter: ipdEncounters,
    })
    .from(nurseActivityLogs)
    .innerJoin(patients, eq(nurseActivityLogs.patientId, patients.id))
    .leftJoin(users, eq(patients.userId, users.id))
    .leftJoin(ipdEncounters, eq(nurseActivityLogs.encounterId, ipdEncounters.id))
    .where(eq(nurseActivityLogs.nurseId, nurseId))
    .orderBy(desc(nurseActivityLogs.createdAt))
    .limit(limit);

  return logs;
};


