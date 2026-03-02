/**
 * Patient education / condition explainer – plain-language explanation of a diagnosis (and optional medications).
 * Reuses auth and patient context; one LLM use case.
 */
import { complete } from "./llm.service.js";

const SYSTEM_PROMPT = `You are a patient education assistant. Given a diagnosis (and optionally a list of medications), provide a brief, plain-language explanation suitable for the patient. Use simple words, short sentences, and avoid jargon. Do not diagnose or recommend treatments; only explain what the condition typically means and how the medications (if provided) may relate. Keep the response to 2–4 short paragraphs. Do not include disclaimers like "consult your doctor" unless necessary. Output only the explanation text, no headings or labels.`;

export interface PatientEducationInput {
  diagnosis: string;
  medications?: string[];
  language?: string;
}

export interface PatientEducationResult {
  explanation: string;
}

/**
 * Generate a patient-friendly explanation for a diagnosis (and optional medications).
 * Returns null if LLM is not configured.
 */
export async function getPatientEducation(input: PatientEducationInput): Promise<PatientEducationResult | null> {
  const diagnosis = (input.diagnosis || "").trim();
  if (!diagnosis) {
    throw new Error("diagnosis is required.");
  }
  const meds = Array.isArray(input.medications) ? input.medications.filter(Boolean).join(", ") : "";
  const lang = (input.language || "English").trim();

  const userPrompt = meds
    ? `Diagnosis: ${diagnosis}\nCurrent medications for this condition: ${meds}\nExplain in ${lang} in plain language for the patient.`
    : `Diagnosis: ${diagnosis}\nExplain in ${lang} in plain language for the patient.`;

  try {
    const explanation = await complete(userPrompt, SYSTEM_PROMPT);
    return { explanation: (explanation || "").trim() };
  } catch (err) {
    if (String(err).includes("not configured")) {
      return null;
    }
    console.error("Patient education error:", err);
    throw err;
  }
}
