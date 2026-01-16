// server/services/ipd-rounds.service.ts
import { db } from "../db";
import {
  clinicalNotes,
  ipdEncounters,
  patients,
  doctors,
  users,
  vitalsChart,
} from "../../shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

/**
 * Create a round/clinical note for IPD patient
 */
export const createRoundNote = async (data: {
  encounterId: number;
  patientId: number;
  hospitalId: number;
  createdByUserId: number;
  noteType: string; // 'round', 'progress', 'admission', 'discharge'
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  chiefComplaint?: string;
  physicalExamination?: string;
  isDraft?: boolean;
}) => {
  try {
    const [note] = await db
      .insert(clinicalNotes)
      .values({
        hospitalId: data.hospitalId,
        patientId: data.patientId,
        encounterId: data.encounterId,
        noteType: data.noteType,
        subjective: data.subjective || null,
        objective: data.objective || null,
        assessment: data.assessment || null,
        plan: data.plan || null,
        chiefComplaint: data.chiefComplaint || null,
        physicalExamination: data.physicalExamination || null,
        createdByUserId: data.createdByUserId,
        isDraft: data.isDraft || false,
        createdAt: new Date(),
      })
      .returning();

    return note;
  } catch (error) {
    console.error("Error creating round note:", error);
    throw error;
  }
};

/**
 * Get rounds/clinical notes for an encounter
 */
export const getEncounterRounds = async (encounterId: number) => {
  try {
    const notes = await db
      .select({
        note: clinicalNotes,
        doctor: doctors,
        doctorUser: users,
      })
      .from(clinicalNotes)
      .leftJoin(doctors, eq(clinicalNotes.createdByUserId, doctors.userId))
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(
        and(
          eq(clinicalNotes.encounterId, encounterId),
          eq(clinicalNotes.noteType, "round")
        )
      )
      .orderBy(desc(clinicalNotes.createdAt));

    return notes.map((n) => ({
      ...n.note,
      doctor: n.doctorUser
        ? {
            id: n.doctor.id,
            fullName: n.doctorUser.fullName,
          }
        : null,
    }));
  } catch (error) {
    console.error("Error fetching encounter rounds:", error);
    throw error;
  }
};

/**
 * Get recent vitals for encounter (for rounds context)
 */
export const getRecentVitals = async (encounterId: number, hours: number = 24) => {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    const vitals = await db
      .select()
      .from(vitalsChart)
      .where(
        and(
          eq(vitalsChart.encounterId, encounterId),
          gte(vitalsChart.recordedAt, cutoffTime)
        )
      )
      .orderBy(desc(vitalsChart.recordedAt))
      .limit(10);

    return vitals;
  } catch (error) {
    console.error("Error fetching recent vitals:", error);
    throw error;
  }
};

/**
 * Sign a clinical note
 */
export const signClinicalNote = async (data: {
  noteId: number;
  signedByUserId: number;
}) => {
  try {
    await db
      .update(clinicalNotes)
      .set({
        signedByUserId: data.signedByUserId,
        signedAt: new Date(),
        isDraft: false,
        updatedAt: new Date(),
      })
      .where(eq(clinicalNotes.id, data.noteId));

    return { success: true };
  } catch (error) {
    console.error("Error signing clinical note:", error);
    throw error;
  }
};
