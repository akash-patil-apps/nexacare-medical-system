/**
 * Lab result AI interpretation: aggregates patient + visit context and calls LLM
 * to produce a plain-language explanation with disclaimer.
 */
import { db } from "../db";
import { labReports, labOrders, patients } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { getLabReportById } from "./lab.service";
import { getPatientById } from "./patients.service";
import { getPrescriptionsByAppointment } from "./prescriptions.service";
import { getVitalsForPatient, getClinicalNotes } from "./clinical.service";
import { complete } from "./llm.service";

export interface InterpretationContext {
  patient: {
    age: number | null;
    gender: string | null;
    medicalHistory: string | null;
    allergies: string | null;
    currentMedications: string | null;
    chronicConditions: string | null;
  };
  diagnosis: string | null;
  prescriptionSummary: string | null;
  vitalsSummary: string | null;
  clinicalNotesSummary: string | null;
  labReport: {
    testName: string;
    testType: string;
    results: string;
    normalRanges: string | null;
    notes: string | null;
  };
}

function computeAge(p: { dateOfBirth?: Date | null; ageAtReference?: number | null; ageReferenceDate?: Date | null }): number | null {
  if (p.dateOfBirth) {
    const today = new Date();
    const dob = new Date(p.dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 0 ? age : null;
  }
  if (p.ageAtReference != null && p.ageReferenceDate) {
    const ref = new Date(p.ageReferenceDate);
    const today = new Date();
    let age = p.ageAtReference + (today.getFullYear() - ref.getFullYear());
    const m = today.getMonth() - ref.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < ref.getDate())) age--;
    return age >= 0 ? age : p.ageAtReference;
  }
  return null;
}

/**
 * Load report and all context (patient, visit prescription/vitals/notes) for interpretation.
 * Returns null if report not found or not owned by the given patient.
 */
export async function getInterpretationContext(
  reportId: number,
  patientId: number
): Promise<InterpretationContext | null> {
  const report = await getLabReportById(reportId);
  if (!report || report.patientId !== patientId) return null;

  const patient = await getPatientById(patientId);
  if (!patient) return null;

  const age = computeAge(patient);
  let diagnosis: string | null = null;
  let prescriptionSummary: string | null = null;
  let vitalsSummary: string | null = null;
  let clinicalNotesSummary: string | null = null;
  let appointmentId: number | null = null;

  if (report.labOrderId) {
    const [order] = await db
      .select({ appointmentId: labOrders.appointmentId })
      .from(labOrders)
      .where(eq(labOrders.id, report.labOrderId))
      .limit(1);
    appointmentId = order?.appointmentId ?? null;
  }

  if (appointmentId) {
    const [prescriptionsForVisit, vitals, notes] = await Promise.all([
      getPrescriptionsByAppointment(appointmentId),
      getVitalsForPatient({ patientId, appointmentId }),
      getClinicalNotes({ patientId, appointmentId }),
    ]);

    if (prescriptionsForVisit.length > 0) {
      const rx = prescriptionsForVisit[0];
      diagnosis = rx.diagnosis ?? null;
      try {
        const meds = typeof rx.medications === "string" ? JSON.parse(rx.medications) : rx.medications;
        const list = Array.isArray(meds)
          ? meds.map((m: any) => (typeof m === "string" ? m : m.name || m.medicineName || JSON.stringify(m))).join(", ")
          : String(rx.medications);
        prescriptionSummary = `Medications: ${list}. ${rx.instructions || ""}`.trim();
      } catch {
        prescriptionSummary = `Diagnosis: ${rx.diagnosis}. Instructions: ${rx.instructions || "None"}`.trim();
      }
    }
    if (vitals.length > 0) {
      const v = vitals[0];
      const parts: string[] = [];
      if (v.bpSystolic != null && v.bpDiastolic != null) parts.push(`BP ${v.bpSystolic}/${v.bpDiastolic}`);
      if (v.pulse != null) parts.push(`Pulse ${v.pulse}`);
      if (v.temperature != null) parts.push(`Temp ${v.temperature}°C`);
      if (v.weight != null) parts.push(`Weight ${v.weight} kg`);
      if (v.height != null) parts.push(`Height ${v.height} cm`);
      if (v.bloodGlucose != null) parts.push(`Glucose ${v.bloodGlucose}`);
      if (v.spo2 != null) parts.push(`SpO2 ${v.spo2}%`);
      vitalsSummary = parts.length > 0 ? parts.join("; ") : null;
    }
    if (notes.length > 0) {
      const n = notes[0];
      const parts: string[] = [];
      if (n.assessment) parts.push(`Assessment: ${n.assessment}`);
      if (n.chiefComplaint) parts.push(`Chief complaint: ${n.chiefComplaint}`);
      if (n.plan) parts.push(`Plan: ${n.plan}`);
      clinicalNotesSummary = parts.length > 0 ? parts.join(". ") : null;
    }
  }

  return {
    patient: {
      age,
      gender: patient.gender ?? null,
      medicalHistory: patient.medicalHistory ?? null,
      allergies: patient.allergies ?? null,
      currentMedications: patient.currentMedications ?? null,
      chronicConditions: patient.chronicConditions ?? null,
    },
    diagnosis,
    prescriptionSummary,
    vitalsSummary,
    clinicalNotesSummary,
    labReport: {
      testName: report.testName,
      testType: report.testType,
      results: report.results,
      normalRanges: report.normalRanges ?? null,
      notes: report.notes ?? null,
    },
  };
}

function formatContextForPrompt(ctx: InterpretationContext): string {
  const lines: string[] = [];

  lines.push("## Patient");
  lines.push(`Age: ${ctx.patient.age ?? "not specified"}; Sex: ${ctx.patient.gender ?? "not specified"}`);
  if (ctx.patient.medicalHistory) lines.push(`Medical history: ${ctx.patient.medicalHistory}`);
  if (ctx.patient.allergies) lines.push(`Allergies: ${ctx.patient.allergies}`);
  if (ctx.patient.currentMedications) lines.push(`Current medications: ${ctx.patient.currentMedications}`);
  if (ctx.patient.chronicConditions) lines.push(`Chronic conditions: ${ctx.patient.chronicConditions}`);

  if (ctx.diagnosis) lines.push("\n## Doctor's diagnosis (this visit)\n" + ctx.diagnosis);
  if (ctx.prescriptionSummary) lines.push("\n## Prescription (this visit)\n" + ctx.prescriptionSummary);
  if (ctx.vitalsSummary) lines.push("\n## Vitals (this visit)\n" + ctx.vitalsSummary);
  if (ctx.clinicalNotesSummary) lines.push("\n## Clinical notes (this visit)\n" + ctx.clinicalNotesSummary);

  lines.push("\n## Lab report");
  lines.push(`Test: ${ctx.labReport.testName} (${ctx.labReport.testType})`);
  lines.push("Results:\n" + ctx.labReport.results);
  if (ctx.labReport.normalRanges) lines.push("Normal ranges:\n" + ctx.labReport.normalRanges);
  if (ctx.labReport.notes) lines.push("Lab notes: " + ctx.labReport.notes);

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are a medical information assistant that explains lab results in simple, plain language for patients. Use only the context provided. Do not make a final diagnosis or recommend specific treatments. Your answer must:
1. In 2-4 short sentences, summarize what the results show (e.g. within normal range, above, or below, where applicable).
2. Briefly say what this might mean in the context of the patient's visit, diagnosis, or medications when relevant.
3. Always end with this exact disclaimer: "This is for information only and is not medical advice. Please discuss your results with your doctor."`;

const SYSTEM_PROMPT_COMBINED = `You are a medical information assistant that explains lab results in simple, plain language for patients. The patient has multiple lab tests; explain them together. Use only the context provided. Do not make a final diagnosis or recommend specific treatments. Your answer must:
1. For each test, briefly say what the results show (e.g. within normal range, above, or below, where applicable).
2. If the tests relate to each other (e.g. blood glucose and CBC), mention how they fit together when relevant.
3. Give one overall takeaway in 1-2 sentences if helpful.
4. Always end with this exact disclaimer: "This is for information only and is not medical advice. Please discuss your results with your doctor."`;

/**
 * Produce an AI interpretation for the given lab report (patient must own the report).
 */
export async function interpretLabReport(reportId: number, patientId: number): Promise<{ interpretation: string }> {
  const context = await getInterpretationContext(reportId, patientId);
  if (!context) {
    throw new Error("Lab report not found or access denied.");
  }

  const userPrompt = `Using only the following information, provide a short, clear explanation of these lab results for the patient.\n\n${formatContextForPrompt(context)}`;

  const interpretation = await complete(userPrompt, SYSTEM_PROMPT);
  return { interpretation: interpretation.trim() };
}

function formatContextForCombinedPrompt(patientBlock: string, reportBlocks: string[]): string {
  const lines: string[] = [patientBlock];
  reportBlocks.forEach((block, i) => {
    lines.push(`\n## Lab report ${reportBlocks.length > 1 ? i + 1 : ""}`);
    lines.push(block.trim());
  });
  return lines.join("\n");
}

/**
 * Produce a single combined AI interpretation for multiple lab reports (patient must own all).
 */
export async function interpretLabReportsCombined(
  reportIds: number[],
  patientId: number
): Promise<{ interpretation: string }> {
  if (!reportIds.length || reportIds.length > 20) {
    throw new Error("Between 1 and 20 report IDs are required.");
  }

  const contexts: InterpretationContext[] = [];
  for (const reportId of reportIds) {
    const ctx = await getInterpretationContext(reportId, patientId);
    if (!ctx) throw new Error("Lab report not found or access denied.");
    contexts.push(ctx);
  }

  const patient = contexts[0].patient;
  const patientBlock = [
    "## Patient",
    `Age: ${patient.age ?? "not specified"}; Sex: ${patient.gender ?? "not specified"}`,
    patient.medicalHistory ? `Medical history: ${patient.medicalHistory}` : "",
    patient.allergies ? `Allergies: ${patient.allergies}` : "",
    patient.currentMedications ? `Current medications: ${patient.currentMedications}` : "",
    patient.chronicConditions ? `Chronic conditions: ${patient.chronicConditions}` : "",
    contexts[0].diagnosis ? `\n## Doctor's diagnosis (this visit)\n${contexts[0].diagnosis}` : "",
    contexts[0].prescriptionSummary ? `\n## Prescription (this visit)\n${contexts[0].prescriptionSummary}` : "",
    contexts[0].vitalsSummary ? `\n## Vitals (this visit)\n${contexts[0].vitalsSummary}` : "",
    contexts[0].clinicalNotesSummary ? `\n## Clinical notes (this visit)\n${contexts[0].clinicalNotesSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const reportBlocks = contexts.map((ctx) => {
    const parts: string[] = [
      `Test: ${ctx.labReport.testName} (${ctx.labReport.testType})`,
      "Results:\n" + ctx.labReport.results,
      ctx.labReport.normalRanges ? "Normal ranges:\n" + ctx.labReport.normalRanges : "",
      ctx.labReport.notes ? "Lab notes: " + ctx.labReport.notes : "",
    ].filter(Boolean);
    return parts.join("\n");
  });

  const userPrompt = `Using only the following information, provide a single combined explanation of these ${contexts.length} lab result(s) for the patient.\n\n${formatContextForCombinedPrompt(patientBlock, reportBlocks)}`;

  const interpretation = await complete(userPrompt, SYSTEM_PROMPT_COMBINED);
  return { interpretation: interpretation.trim() };
}
