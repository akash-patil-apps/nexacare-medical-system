/**
 * Discharge summary generator – one LLM use case with richer context; needs IPD aggregation.
 */
import { db } from "../db.js";
import {
  ipdEncounters,
  clinicalNotes,
  vitalsChart,
  medicationOrders,
  nursingNotes,
  dietOrders,
  labOrders,
  labReports,
} from "../../shared/schema.js";
import { eq, desc, inArray } from "drizzle-orm";
import { getPatientWithUserById } from "./patients.service.js";
import { getDoctorById } from "./doctors.service.js";
import { complete } from "./llm.service.js";

const SYSTEM_PROMPT = `You are a medical documentation assistant. Given structured data from an IPD (inpatient) encounter—admission details, clinical notes, vitals summary, medications, lab results, nursing notes, and diet—produce a concise, professional discharge summary. Include: (1) Admission reason and date, (2) Brief hospital course and key findings, (3) Procedures or treatments if mentioned, (4) Discharge medications with dose and frequency, (5) Diet and activity advice if provided, (6) Follow-up instructions. Use clear headings and plain language. Do not invent data; use only what is provided. Output only the discharge summary text.`;

export interface DischargeSummaryResult {
  summary: string;
}

/**
 * Generate discharge summary for an IPD encounter. Aggregates encounter, clinical notes, vitals, medications, labs, nursing notes, diet; calls LLM.
 */
export async function generateDischargeSummary(encounterId: number): Promise<DischargeSummaryResult | null> {
  const [encounter] = await db
    .select()
    .from(ipdEncounters)
    .where(eq(ipdEncounters.id, encounterId))
    .limit(1);

  if (!encounter) {
    throw new Error("Encounter not found.");
  }

  const patientId = encounter.patientId;
  const [patientWithUser, admittingDoctor, attendingDoctor, notes, vitals, medOrders, nursing, diet, ordersWithReports] =
    await Promise.all([
      getPatientWithUserById(patientId),
      encounter.admittingDoctorId ? getDoctorById(encounter.admittingDoctorId) : Promise.resolve(null),
      encounter.attendingDoctorId ? getDoctorById(encounter.attendingDoctorId) : Promise.resolve(null),
      db
        .select()
        .from(clinicalNotes)
        .where(eq(clinicalNotes.encounterId, encounterId))
        .orderBy(desc(clinicalNotes.createdAt)),
      db
        .select()
        .from(vitalsChart)
        .where(eq(vitalsChart.encounterId, encounterId))
        .orderBy(desc(vitalsChart.recordedAt))
        .limit(30),
      db
        .select()
        .from(medicationOrders)
        .where(eq(medicationOrders.encounterId, encounterId))
        .orderBy(desc(medicationOrders.createdAt)),
      db
        .select()
        .from(nursingNotes)
        .where(eq(nursingNotes.encounterId, encounterId))
        .orderBy(desc(nursingNotes.createdAt))
        .limit(20),
      db
        .select()
        .from(dietOrders)
        .where(eq(dietOrders.encounterId, encounterId))
        .orderBy(desc(dietOrders.createdAt)),
      db
        .select()
        .from(labOrders)
        .where(eq(labOrders.encounterId, encounterId)),
    ]);

  const patient = patientWithUser as any;
  const patientName = patient?.user?.fullName || "Patient";
  const admName = admittingDoctor && (admittingDoctor as any).user?.fullName ? `Dr. ${(admittingDoctor as any).user.fullName}` : "—";
  const attName = attendingDoctor && (attendingDoctor as any).user?.fullName ? `Dr. ${(attendingDoctor as any).user.fullName}` : "—";

  const admittedAt = encounter.admittedAt ? new Date(encounter.admittedAt).toLocaleString() : "—";
  const dischargedAt = encounter.dischargedAt ? new Date(encounter.dischargedAt).toLocaleString() : "Not yet discharged";
  const status = encounter.status || "admitted";

  const notesText = (notes as any[])
    .map((n) => {
      const parts = [
        n.noteType,
        n.chiefComplaint,
        n.historyOfPresentIllness,
        n.subjective,
        n.objective,
        n.assessment,
        n.admissionDiagnosis,
        n.plan,
      ].filter(Boolean);
      return `[${n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}] ${parts.join("; ")}`;
    })
    .join("\n");

  const vitalsText = (vitals as any[])
    .slice(0, 15)
    .map((v) => {
      const t = v.recordedAt ?? v.createdAt;
      const date = t ? new Date(t).toLocaleDateString() : "";
      const bp = v.bpSystolic != null && v.bpDiastolic != null ? `${v.bpSystolic}/${v.bpDiastolic}` : "";
      const parts = [date, bp && `BP ${bp}`, v.pulse != null && `Pulse ${v.pulse}`, v.temperature != null && `Temp ${v.temperature}`, v.spo2 != null && `SpO2 ${v.spo2}%`].filter(Boolean);
      return parts.join(", ");
    })
    .join("\n");

  const medsText = (medOrders as any[])
    .map((m) => `${m.medicationName} ${m.dosage} ${m.unit} ${m.route} ${m.frequency}${m.isPrn ? " PRN" : ""}`)
    .join("\n");

  const nursingText = (nursing as any[])
    .map((n) => {
      const parts = [n.noteType, n.nursingAssessment, n.carePlan, n.interventions, n.handoverNotes, n.notes].filter(Boolean);
      return `[${n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}] ${parts.join("; ")}`;
    })
    .join("\n");

  const dietText = (diet as any[])
    .map((d) => `${d.dietType}${d.specialInstructions ? ` (${d.specialInstructions})` : ""}`)
    .join("\n");

  let labText = "";
  if (Array.isArray(ordersWithReports) && ordersWithReports.length > 0) {
    const orderIds = ordersWithReports.map((o: any) => o.id).filter(Boolean);
    if (orderIds.length > 0) {
      const reports = await db
        .select({ testName: labReports.testName, results: labReports.results, reportDate: labReports.reportDate })
        .from(labReports)
        .where(inArray(labReports.labOrderId, orderIds));
      labText = (reports as any[])
        .map((r) => `${r.testName} (${r.reportDate ? new Date(r.reportDate).toLocaleDateString() : ""}): ${(r.results || "").toString().slice(0, 200)}`)
        .join("\n");
    }
  }

  const userPrompt = `IPD Encounter ID: ${encounterId}
Patient: ${patientName} (ID ${patientId})
Status: ${status}
Admitted: ${admittedAt}
Discharged: ${dischargedAt}
Admitting Doctor: ${admName}
Attending Doctor: ${attName}
Admission Type: ${encounter.admissionType || "—"}

--- Clinical Notes ---
${notesText || "None"}

--- Vitals (recent) ---
${vitalsText || "None"}

--- Medication Orders ---
${medsText || "None"}

--- Diet Orders ---
${dietText || "None"}

--- Nursing Notes ---
${nursingText || "None"}

--- Lab Results (summary) ---
${labText || "None"}

Generate the discharge summary.`;

  try {
    const summary = await complete(userPrompt, SYSTEM_PROMPT);
    return { summary: (summary || "").trim() };
  } catch (err) {
    if (String(err).includes("not configured")) {
      return null;
    }
    console.error("Discharge summary error:", err);
    throw err;
  }
}
