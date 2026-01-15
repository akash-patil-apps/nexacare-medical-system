// server/services/nurse-assignment.service.ts
import { db } from '../db';
import { ipdEncounters, nurseAssignments, nurses, users, patients } from '../../shared/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';

/**
 * Assign nurse to IPD encounter
 */
export const assignNurseToEncounter = async (data: {
  encounterId: number;
  nurseId: number;
  assignedByUserId: number;
  reason?: string;
  shiftType?: string;
}) => {
  // Verify encounter exists
  const [encounter] = await db
    .select()
    .from(ipdEncounters)
    .where(eq(ipdEncounters.id, data.encounterId))
    .limit(1);

  if (!encounter) {
    throw new Error('IPD encounter not found');
  }

  // Verify nurse exists
  const [nurse] = await db
    .select()
    .from(nurses)
    .where(eq(nurses.id, data.nurseId))
    .limit(1);

  if (!nurse) {
    throw new Error('Nurse not found');
  }

  // Check if already assigned (unassign previous if exists)
  const existingAssignment = await db
    .select()
    .from(nurseAssignments)
    .where(
      and(
        eq(nurseAssignments.encounterId, data.encounterId),
        eq(nurseAssignments.nurseId, data.nurseId),
        isNull(nurseAssignments.unassignedAt)
      )
    )
    .limit(1);

  if (existingAssignment.length > 0) {
    throw new Error('Nurse is already assigned to this patient');
  }

  // Update encounter with primary assigned nurse
  await db
    .update(ipdEncounters)
    .set({
      assignedNurseId: data.nurseId,
      assignedAt: sql`NOW()`,
      assignedByUserId: data.assignedByUserId,
      updatedAt: sql`NOW()`,
    })
    .where(eq(ipdEncounters.id, data.encounterId));

  // Create assignment record
  const [assignment] = await db
    .insert(nurseAssignments)
    .values({
      encounterId: data.encounterId,
      patientId: encounter.patientId,
      nurseId: data.nurseId,
      assignedByUserId: data.assignedByUserId,
      reason: data.reason || null,
      shiftType: data.shiftType || null,
      assignedAt: sql`NOW()`,
    })
    .returning();

  return assignment;
};

/**
 * Unassign nurse from encounter
 */
export const unassignNurseFromEncounter = async (data: {
  encounterId: number;
  nurseId: number;
  unassignedByUserId: number;
  reason?: string;
}) => {
  // Find active assignment
  const [assignment] = await db
    .select()
    .from(nurseAssignments)
    .where(
      and(
        eq(nurseAssignments.encounterId, data.encounterId),
        eq(nurseAssignments.nurseId, data.nurseId),
        isNull(nurseAssignments.unassignedAt)
      )
    )
    .limit(1);

  if (!assignment) {
    throw new Error('Active assignment not found');
  }

  // Update assignment
  await db
    .update(nurseAssignments)
    .set({
      unassignedAt: sql`NOW()`,
      unassignedByUserId: data.unassignedByUserId,
      reason: data.reason || null,
    })
    .where(eq(nurseAssignments.id, assignment.id));

  // If this was the primary assigned nurse, clear from encounter
  const [encounter] = await db
    .select()
    .from(ipdEncounters)
    .where(eq(ipdEncounters.id, data.encounterId))
    .limit(1);

  if (encounter?.assignedNurseId === data.nurseId) {
    await db
      .update(ipdEncounters)
      .set({
        assignedNurseId: null,
        assignedAt: null,
        assignedByUserId: null,
        updatedAt: sql`NOW()`,
      })
      .where(eq(ipdEncounters.id, data.encounterId));
  }

  return { success: true };
};

/**
 * Get assigned patients for a nurse
 */
export const getAssignedPatients = async (nurseId: number) => {
  // Get encounters where nurse is assigned
  const assignments = await db
    .select({
      assignment: nurseAssignments,
      encounter: ipdEncounters,
      patient: patients,
      patientUser: users,
    })
    .from(nurseAssignments)
    .innerJoin(ipdEncounters, eq(nurseAssignments.encounterId, ipdEncounters.id))
    .innerJoin(patients, eq(ipdEncounters.patientId, patients.id))
    .innerJoin(users, eq(patients.userId, users.id))
    .where(
      and(
        eq(nurseAssignments.nurseId, nurseId),
        isNull(nurseAssignments.unassignedAt),
        eq(ipdEncounters.status, 'admitted')
      )
    )
    .orderBy(desc(nurseAssignments.assignedAt));

  return assignments.map(a => ({
    ...a.encounter,
    patient: {
      ...a.patient,
      user: a.patientUser,
    },
    assignment: a.assignment,
  }));
};

/**
 * Get assignment history for an encounter
 */
export const getEncounterAssignmentHistory = async (encounterId: number) => {
  const assignments = await db
    .select({
      assignment: nurseAssignments,
      nurse: nurses,
      nurseUser: users,
      assignedBy: users,
    })
    .from(nurseAssignments)
    .innerJoin(nurses, eq(nurseAssignments.nurseId, nurses.id))
    .innerJoin(users, eq(nurses.userId, users.id))
    .leftJoin(users, eq(nurseAssignments.assignedByUserId, users.id))
    .where(eq(nurseAssignments.encounterId, encounterId))
    .orderBy(desc(nurseAssignments.assignedAt));

  return assignments;
};




