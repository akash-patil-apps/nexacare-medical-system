/**
 * Natural language parsing for book-appointment: "cardiologist near Andheri" → { city, specialty, searchTerm }.
 */
import { getAllHospitals } from "./hospitals.service.js";
import * as doctorsService from "./doctors.service.js";
import { complete } from "./llm.service.js";

export interface BookingSearchResult {
  city: string | null;
  specialty: string | null;
  searchTerm: string | null;
}

/**
 * Get unique cities from hospitals and unique specialties from doctors (and hospital departments).
 */
export async function getBookingSearchOptions(): Promise<{ cities: string[]; specialties: string[] }> {
  const [hospitals, doctors] = await Promise.all([
    getAllHospitals(),
    doctorsService.getAllDoctors(),
  ]);

  const cities = [...new Set(hospitals.map((h) => (h.city || "").trim()).filter(Boolean))].sort();

  const specialtiesFromDoctors = new Set<string>(
    doctors.map((d) => (d.specialty || "").trim()).filter(Boolean)
  );
  hospitals.forEach((h) => {
    try {
      const depts =
        typeof h.departments === "string" ? JSON.parse(h.departments) : h.departments;
      if (Array.isArray(depts)) {
        depts.forEach((d: string) => specialtiesFromDoctors.add(String(d).trim()));
      }
    } catch {
      // ignore
    }
  });
  const specialties = [...specialtiesFromDoctors].sort();

  return { cities, specialties };
}

const SYSTEM_PROMPT = `You are a search parser for a hospital appointment booking system. The user will type a natural language query (e.g. "cardiologist in Mumbai", "pediatrician for fever", "doctor near Andheri"). Your job is to extract:
1. city - must be exactly one of the provided list of cities, or null if not mentioned/unclear.
2. specialty - must be exactly one of the provided list of specialties (match the user's intent: e.g. "cardio" → Cardiology, "pediatrician" → Pediatrics), or null if not mentioned.
3. searchTerm - any remaining keywords for a text search (e.g. "fever", "checkup"), or null.

Respond with ONLY a JSON object, no markdown, no explanation. Format: {"city": "CityName or null", "specialty": "SpecialtyName or null", "searchTerm": "keywords or null"}`;

/**
 * Parse a natural language booking query into structured filters.
 * Uses LLM; falls back to empty result if LLM is not configured.
 */
export async function parseBookingQuery(query: string): Promise<BookingSearchResult> {
  const q = (query || "").trim();
  if (!q) {
    return { city: null, specialty: null, searchTerm: null };
  }

  const { cities, specialties } = await getBookingSearchOptions();
  if (cities.length === 0 && specialties.length === 0) {
    return { city: null, specialty: null, searchTerm: q };
  }

  const userPrompt = `Available cities: ${cities.join(", ") || "none"}.
Available specialties: ${specialties.join(", ") || "none"}.

User query: "${q}"

Return JSON only: {"city": "<one of the cities or null>", "specialty": "<one of the specialties or null>", "searchTerm": "<extra keywords or null>"}`;

  try {
    const raw = await complete(userPrompt, SYSTEM_PROMPT);
    const jsonStr = raw.replace(/```json?\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(jsonStr) as { city?: string | null; specialty?: string | null; searchTerm?: string | null };

    const matchFromList = (value: string | null | undefined, list: string[]): string | null => {
      if (!value || list.length === 0) return null;
      const v = String(value).trim().toLowerCase();
      const found = list.find((c) => c.trim().toLowerCase() === v);
      return found != null ? found : null;
    };
    const city = matchFromList(parsed.city, cities);
    const specialty = matchFromList(parsed.specialty, specialties);
    const searchTerm =
      typeof parsed.searchTerm === "string" && parsed.searchTerm.trim()
        ? parsed.searchTerm.trim()
        : null;

    return { city, specialty, searchTerm };
  } catch (err) {
    if (String(err).includes("not configured")) {
      return { city: null, specialty: null, searchTerm: q };
    }
    console.error("Booking search parse error:", err);
    return { city: null, specialty: null, searchTerm: q };
  }
}
