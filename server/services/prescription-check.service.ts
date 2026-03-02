/**
 * AI-assisted prescription safety: allergy and drug–drug interaction checks.
 */
import { complete } from "./llm.service.js";

export interface PrescriptionCheckResult {
  allergyWarning: string | null;
  interactionWarning: string | null;
}

const SYSTEM_PROMPT = `You are a clinical decision support assistant. Given patient allergies, current medications, and a new medicine to add, respond with ONLY a JSON object (no markdown):
{ "allergyWarning": "brief warning if the new medicine may be contraindicated by patient allergies, or null", "interactionWarning": "brief warning if the new medicine may interact with current medications, or null" }
If no concern, use null for that field. Be concise (one short sentence per warning). Do not diagnose or recommend; only flag possible risks.`;

/**
 * Check for allergy and drug–drug interaction concerns. Returns null if LLM not configured.
 */
export async function checkPrescriptionSafety(
  patientAllergies: string | null,
  currentMedications: string[],
  newMedicine: string
): Promise<PrescriptionCheckResult | null> {
  const allergies = (patientAllergies || "").trim();
  const current = currentMedications.filter(Boolean).join(", ") || "None";
  const newMed = (newMedicine || "").trim();
  if (!newMed) {
    return { allergyWarning: null, interactionWarning: null };
  }

  const userPrompt = `Patient allergies: ${allergies || "None recorded"}
Current medications in this prescription: ${current}
New medicine to add: ${newMed}

Return JSON only: { "allergyWarning": "<one sentence or null>", "interactionWarning": "<one sentence or null>" }`;

  try {
    const raw = await complete(userPrompt, SYSTEM_PROMPT);
    const jsonStr = raw.replace(/```json?\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(jsonStr) as { allergyWarning?: string | null; interactionWarning?: string | null };
    return {
      allergyWarning: parsed.allergyWarning && String(parsed.allergyWarning).trim() ? String(parsed.allergyWarning).trim() : null,
      interactionWarning: parsed.interactionWarning && String(parsed.interactionWarning).trim() ? String(parsed.interactionWarning).trim() : null,
    };
  } catch (err) {
    if (String(err).includes("not configured")) {
      return null;
    }
    console.error("Prescription check error:", err);
    return null;
  }
}
