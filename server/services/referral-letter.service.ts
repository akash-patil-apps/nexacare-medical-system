/**
 * Referral letter generator – one LLM use case; reuses doctor/patient/encounter data.
 */
import { db } from "../db.js";
import { prescriptions, clinicalNotes } from "../../shared/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { getPatientWithUserById } from "./patients.service.js";
import { getDoctorById } from "./doctors.service.js";
import { complete } from "./llm.service.js";

const SYSTEM_PROMPT = `You are a medical secretary. Given patient demographics, recent clinical summary (diagnoses and medications from records), reason for referral, and optional specialist type or recipient name, write a concise, professional referral letter. Use formal medical letter format: date, recipient (or "To the Specialist" if not named), patient identifier and brief history, reason for referral, relevant findings and current medications, and a request for evaluation. Sign off as "[Referring Doctor Name], [Qualification]". Do not invent data; use only what is provided. Output only the letter text, no meta-commentary.`;

export interface ReferralLetterInput {
  patientId: number;
  reasonForReferral: string;
  specialistType?: string;
  recipientName?: string;
  referringDoctorId: number;
}

export interface ReferralLetterResult {
  letter: string;
}

/**
 * Generate a referral letter for a patient. Loads patient, recent prescriptions and notes, and referring doctor; calls LLM.
 */
export async function generateReferralLetter(input: ReferralLetterInput): Promise<ReferralLetterResult | null> {
  const { patientId, reasonForReferral, specialistType, recipientName, referringDoctorId } = input;
  const reason = (reasonForReferral || "").trim();
  if (!reason) {
    throw new Error("reasonForReferral is required.");
  }

  const [patientWithUser, referringDoctor, recentPrescriptions, recentNotes] = await Promise.all([
    getPatientWithUserById(patientId),
    getDoctorById(referringDoctorId),
    db
      .select({ diagnosis: prescriptions.diagnosis, medications: prescriptions.medications, createdAt: prescriptions.createdAt })
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt))
      .limit(10),
    db
      .select({
        noteType: clinicalNotes.noteType,
        assessment: clinicalNotes.assessment,
        plan: clinicalNotes.plan,
        chiefComplaint: clinicalNotes.chiefComplaint,
        createdAt: clinicalNotes.createdAt,
      })
      .from(clinicalNotes)
      .where(eq(clinicalNotes.patientId, patientId))
      .orderBy(desc(clinicalNotes.createdAt))
      .limit(5),
  ]);

  if (!patientWithUser) {
    throw new Error("Patient not found.");
  }
  if (!referringDoctor) {
    throw new Error("Referring doctor not found.");
  }

  const patient = patientWithUser as any;
  const userName = patient.user?.fullName || "Patient";
  const dob = patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "N/A";
  const gender = patient.gender || "—";
  const allergies = patient.allergies || "None recorded";
  const chronicConditions = patient.chronicConditions || "None recorded";
  const currentMeds = patient.currentMedications || "None recorded";

  const prescriptionSummary = recentPrescriptions
    .map((p) => {
      const meds = typeof p.medications === "string" ? (() => { try { const arr = JSON.parse(p.medications); return Array.isArray(arr) ? arr.map((m: any) => m.name || m.medicineName).filter(Boolean).join(", ") : p.medications; } catch { return p.medications; } })() : "";
      return `- ${p.diagnosis} (${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}): ${meds || "—"}`;
    })
    .join("\n");

  const notesSummary = recentNotes
    .map((n) => {
      const parts = [n.noteType, n.chiefComplaint, n.assessment, n.plan].filter(Boolean);
      return `- ${parts.join("; ")}`;
    })
    .join("\n");

  const doctorName = (referringDoctor as any).user?.fullName ? `Dr. ${(referringDoctor as any).user.fullName}` : "Dr. [Referring Physician]";
  const qualification = (referringDoctor as any).qualification || "MD";

  const userPrompt = `Patient: ${userName}, DOB: ${dob}, Gender: ${gender}
Allergies: ${allergies}
Chronic conditions: ${chronicConditions}
Current medications (from profile): ${currentMeds}

Recent prescriptions (diagnosis and medications):
${prescriptionSummary || "None"}

Recent clinical notes:
${notesSummary || "None"}

Reason for referral: ${reason}
${specialistType ? `Specialist type: ${specialistType}` : ""}
${recipientName ? `Addressed to: ${recipientName}` : ""}

Referring physician: ${doctorName}, ${qualification}

Generate the referral letter.`;

  try {
    const letter = await complete(userPrompt, SYSTEM_PROMPT);
    return { letter: (letter || "").trim() };
  } catch (err) {
    if (String(err).includes("not configured")) {
      return null;
    }
    console.error("Referral letter error:", err);
    throw err;
  }
}
