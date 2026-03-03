/**
 * Builds a text context block of the patient's health data for RAG-style chatbot (PDF §9.1).
 * Used to ground AI responses in the patient's own records.
 */
import { getPatientById } from "./patients.service.js";
import { getPrescriptionsByPatient } from "./prescriptions.service.js";
import { getLabReportsForPatient } from "./lab.service.js";
import { getAppointmentsByPatient } from "./appointments.service.js";

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  const x = new Date(d);
  return x.toISOString().slice(0, 10);
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

export async function getPatientContextForChat(patientId: number): Promise<string> {
  const [patient, prescriptions, labReports, appointments] = await Promise.all([
    getPatientById(patientId),
    getPrescriptionsByPatient(patientId).then((rows) => rows.slice(0, 15)),
    getLabReportsForPatient(patientId).then((rows) => rows.slice(0, 20)),
    getAppointmentsByPatient(patientId),
  ]);

  if (!patient) return "";

  const age = computeAge(patient);
  const sections: string[] = [];

  // Profile
  sections.push("## Patient profile");
  sections.push(`Age: ${age ?? "not recorded"}`);
  if (patient.gender) sections.push(`Gender: ${patient.gender}`);
  if (patient.bloodGroup) sections.push(`Blood group: ${patient.bloodGroup}`);
  if (patient.allergies) sections.push(`Allergies: ${patient.allergies}`);
  if (patient.currentMedications) sections.push(`Current medications (from profile): ${patient.currentMedications}`);
  if (patient.chronicConditions) sections.push(`Chronic conditions: ${patient.chronicConditions}`);
  if (patient.medicalHistory) sections.push(`Medical history: ${patient.medicalHistory}`);

  // Recent prescriptions
  if (prescriptions.length > 0) {
    sections.push("\n## Recent prescriptions");
    for (const rx of prescriptions) {
      const meds = typeof rx.medications === "string" ? rx.medications : JSON.stringify(rx.medications ?? "");
      const inst = rx.instructions || "";
      sections.push(`- Date: ${formatDate(rx.createdAt)}. Diagnosis: ${rx.diagnosis ?? "—"}. Medications: ${meds}. Instructions: ${inst}`);
    }
  }

  // Recent lab reports (summary)
  if (labReports.length > 0) {
    sections.push("\n## Recent lab reports (summary)");
    for (const r of labReports.slice(0, 15)) {
      sections.push(`- ${formatDate(r.reportDate)}: ${r.testName ?? "Lab"} — ${(r.results || "").slice(0, 200)}${(r.results?.length ?? 0) > 200 ? "…" : ""}`);
    }
  }

  // Appointments: upcoming and recent
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appointments.filter((a: any) => a.appointmentDate && String(a.appointmentDate).slice(0, 10) >= today).slice(0, 10);
  const past = appointments.filter((a: any) => a.appointmentDate && String(a.appointmentDate).slice(0, 10) < today).slice(0, 5);

  if (upcoming.length > 0) {
    sections.push("\n## Upcoming appointments");
    for (const a of upcoming) {
      sections.push(`- ${formatDate(a.appointmentDate)} ${a.appointmentTime || a.timeSlot || ""}: ${a.doctorName ?? "Doctor"} at ${a.hospitalName ?? "Hospital"} (${a.reason ?? a.status ?? ""})`);
    }
  }
  if (past.length > 0) {
    sections.push("\n## Recent past appointments");
    for (const a of past) {
      sections.push(`- ${formatDate(a.appointmentDate)}: ${a.doctorName ?? "Doctor"} — ${a.reason ?? a.status ?? ""}`);
    }
  }

  return sections.join("\n").trim() || "No additional patient data on file.";
}
