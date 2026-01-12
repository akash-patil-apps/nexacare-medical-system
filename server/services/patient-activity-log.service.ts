// server/services/patient-activity-log.service.ts
// Comprehensive activity logging for ALL patient operations
import { db } from '../db';
import { nurseActivityLogs, nurses, users, patients, ipdEncounters, doctors, medicationOrders, medicationAdministrations, vitalsChart, nursingNotes } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export type ActivityActor = {
  userId: number;
  userRole: string;
  userName: string;
  entityId?: number; // doctorId, nurseId, etc.
  entityType?: 'doctor' | 'nurse' | 'receptionist' | 'hospital_admin' | 'patient';
};

export type ActivityLogData = {
  encounterId?: number;
  patientId: number;
  activityType: string; // 'medication', 'vitals', 'note', 'bed_transfer', 'doctor_assignment', 'nurse_assignment', 'prescription', etc.
  activitySubtype?: string; // 'medication_given', 'medication_ordered', 'vitals_recorded', 'bed_changed', etc.
  entityType?: string; // 'medication_order', 'medication_administration', 'vitals_chart', 'nursing_note', etc.
  entityId?: number;
  description: string;
  metadata?: Record<string, any>;
  actor: ActivityActor;
};

/**
 * Log any patient activity with actor information
 */
export const logPatientActivity = async (data: ActivityLogData) => {
  try {
    // If actor is a nurse, use nurse_activity_logs table
    if (data.actor.entityType === 'nurse' && data.actor.entityId) {
      const [log] = await db
        .insert(nurseActivityLogs)
        .values({
          encounterId: data.encounterId || null,
          patientId: data.patientId,
          nurseId: data.actor.entityId,
          activityType: data.activityType,
          activitySubtype: data.activitySubtype || null,
          entityType: data.entityType || null,
          entityId: data.entityId || null,
          description: data.description,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          createdAt: sql`NOW()`,
        })
        .returning();

      return log;
    }

    // For other actors (doctors, receptionists, etc.), we can extend nurse_activity_logs
    // or create a separate table. For now, we'll use nurse_activity_logs with nurseId as null
    // and store actor info in metadata
    const [log] = await db
      .insert(nurseActivityLogs)
      .values({
        encounterId: data.encounterId || null,
        patientId: data.patientId,
        nurseId: data.actor.entityId || 0, // Use 0 for non-nurse actors, store in metadata
        activityType: data.activityType,
        activitySubtype: data.activitySubtype || null,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        description: data.description,
        metadata: JSON.stringify({
          ...data.metadata,
          actor: {
            userId: data.actor.userId,
            userRole: data.actor.userRole,
            userName: data.actor.userName,
            entityType: data.actor.entityType,
            entityId: data.actor.entityId,
          },
        }),
        createdAt: sql`NOW()`,
      })
      .returning();

    return log;
  } catch (error) {
    console.error('Error logging patient activity:', error);
    throw error;
  }
};

/**
 * Get comprehensive activity log for a patient (all operations)
 */
export const getPatientActivityLog = async (patientId: number, limit = 200) => {
  const logs = await db
    .select({
      log: nurseActivityLogs,
      nurse: nurses,
      nurseUser: users,
      encounter: ipdEncounters,
    })
    .from(nurseActivityLogs)
    .leftJoin(nurses, eq(nurseActivityLogs.nurseId, nurses.id))
    .leftJoin(users, eq(nurses.userId, users.id))
    .leftJoin(ipdEncounters, eq(nurseActivityLogs.encounterId, ipdEncounters.id))
    .where(eq(nurseActivityLogs.patientId, patientId))
    .orderBy(desc(nurseActivityLogs.createdAt))
    .limit(limit);

  return logs.map(l => {
    const metadata = l.log.metadata ? JSON.parse(l.log.metadata) : {};
    const actor = metadata.actor || (l.nurse && l.nurseUser ? {
      userId: l.nurseUser.id,
      userRole: l.nurseUser.role,
      userName: l.nurseUser.fullName,
      entityType: 'nurse' as const,
      entityId: l.nurse.id,
    } : null);

    return {
      ...l.log,
      actor,
      encounter: l.encounter,
      metadata: metadata,
    };
  });
};

/**
 * Get activity log for an encounter
 */
export const getEncounterActivityLog = async (encounterId: number, limit = 200) => {
  const logs = await db
    .select({
      log: nurseActivityLogs,
      nurse: nurses,
      nurseUser: users,
      patient: patients,
      patientUser: users,
    })
    .from(nurseActivityLogs)
    .leftJoin(nurses, eq(nurseActivityLogs.nurseId, nurses.id))
    .leftJoin(users, eq(nurses.userId, users.id))
    .leftJoin(patients, eq(nurseActivityLogs.patientId, patients.id))
    .leftJoin(users, eq(patients.userId, users.id))
    .where(eq(nurseActivityLogs.encounterId, encounterId))
    .orderBy(desc(nurseActivityLogs.createdAt))
    .limit(limit);

  return logs.map(l => {
    const metadata = l.log.metadata ? JSON.parse(l.log.metadata) : {};
    const actor = metadata.actor || (l.nurse && l.nurseUser ? {
      userId: l.nurseUser.id,
      userRole: l.nurseUser.role,
      userName: l.nurseUser.fullName,
      entityType: 'nurse' as const,
      entityId: l.nurse.id,
    } : null);

    return {
      ...l.log,
      actor,
      patient: {
        ...l.patient,
        user: l.patientUser,
      },
      metadata: metadata,
    };
  });
};

/**
 * Helper to get actor info from request
 */
export const getActorFromRequest = async (req: any): Promise<ActivityActor | null> => {
  if (!req.user) return null;

  const userId = req.user.id;
  const userRole = req.user.role?.toUpperCase() || '';
  const userName = req.user.fullName || 'Unknown';

  // Get entity ID based on role
  let entityId: number | undefined;
  let entityType: 'doctor' | 'nurse' | 'receptionist' | 'hospital_admin' | 'patient' | undefined;

  if (userRole === 'DOCTOR') {
    const { getDoctorByUserId } = await import('./doctors.service');
    const doctor = await getDoctorByUserId(userId);
    if (doctor) {
      entityId = doctor.id;
      entityType = 'doctor';
    }
  } else if (userRole === 'NURSE') {
    const { getNurseByUserId } = await import('./nurses.service');
    const nurse = await getNurseByUserId(userId);
    if (nurse) {
      entityId = nurse.id;
      entityType = 'nurse';
    }
  } else if (userRole === 'RECEPTIONIST') {
    entityType = 'receptionist';
  } else if (userRole === 'HOSPITAL' || userRole === 'ADMIN') {
    entityType = 'hospital_admin';
  } else if (userRole === 'PATIENT') {
    entityType = 'patient';
  }

  return {
    userId,
    userRole,
    userName,
    entityId,
    entityType,
  };
};

