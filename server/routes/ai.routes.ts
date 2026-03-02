import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types.js";
import { getPatientByUserId } from "../services/patients.service.js";
import { interpretLabReport, interpretLabReportsCombined } from "../services/lab-interpretation.service.js";
import { parseBookingQuery } from "../services/booking-search.service.js";
import { checkPrescriptionSafety } from "../services/prescription-check.service.js";
import { getPatientEducation } from "../services/patient-education.service.js";
import { generateReferralLetter } from "../services/referral-letter.service.js";
import { getDoctorByUserId } from "../services/doctors.service.js";
import { generateDischargeSummary } from "../services/discharge-summary.service.js";

const router = Router();

/**
 * POST /api/ai/lab-interpretation
 * Body: { reportId: number }
 * Returns: { interpretation: string }
 * Only the patient who owns the report can call this.
 */
router.post(
  "/lab-interpretation",
  authenticateToken,
  authorizeRoles("patient"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patient = await getPatientByUserId(req.user!.id);
      if (!patient?.id) {
        return res.status(403).json({ message: "Patient profile not found." });
      }
      const reportId = typeof req.body?.reportId === "number" ? req.body.reportId : Number(req.body?.reportId);
      if (!Number.isInteger(reportId) || reportId <= 0) {
        return res.status(400).json({ message: "Valid reportId is required." });
      }
      const { interpretation } = await interpretLabReport(reportId, patient.id);
      res.json({ interpretation });
    } catch (err: any) {
      if (err.message?.includes("not found") || err.message?.includes("access denied")) {
        return res.status(404).json({ message: "Lab report not found or access denied." });
      }
      if (err.message?.includes("not configured")) {
        return res.status(503).json({ message: "Explanation service is temporarily unavailable." });
      }
      console.error("Lab interpretation error:", err);
      res.status(500).json({ message: "Explanation could not be generated. Please try again or ask your doctor." });
    }
  }
);

/**
 * POST /api/ai/lab-interpretation-combined
 * Body: { reportIds: number[] } (1–20 report IDs)
 * Returns: { interpretation: string }
 * Only the patient who owns all reports can call this.
 */
router.post(
  "/lab-interpretation-combined",
  authenticateToken,
  authorizeRoles("patient"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patient = await getPatientByUserId(req.user!.id);
      if (!patient?.id) {
        return res.status(403).json({ message: "Patient profile not found." });
      }
      const raw = req.body?.reportIds;
      const reportIds = Array.isArray(raw)
        ? raw.map((id: unknown) => (typeof id === "number" ? id : Number(id))).filter((n) => Number.isInteger(n) && n > 0)
        : [];
      if (reportIds.length === 0 || reportIds.length > 20) {
        return res.status(400).json({ message: "Between 1 and 20 valid report IDs are required." });
      }
      const { interpretation } = await interpretLabReportsCombined(reportIds, patient.id);
      res.json({ interpretation });
    } catch (err: any) {
      if (err.message?.includes("not found") || err.message?.includes("access denied")) {
        return res.status(404).json({ message: "One or more lab reports not found or access denied." });
      }
      if (err.message?.includes("not configured")) {
        return res.status(503).json({ message: "Explanation service is temporarily unavailable." });
      }
      console.error("Lab interpretation combined error:", err);
      res.status(500).json({ message: "Explanation could not be generated. Please try again or ask your doctor." });
    }
  }
);

/**
 * POST /api/ai/prescription-check
 * Body: { patientAllergies?: string, currentMedications: string[], newMedicine: string }
 * Returns: { allergyWarning: string | null, interactionWarning: string | null }
 * Doctor-only. AI check for allergy and drug–drug interaction.
 */
router.post(
  "/prescription-check",
  authenticateToken,
  authorizeRoles("doctor"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body || {};
      const patientAllergies = typeof body.patientAllergies === "string" ? body.patientAllergies : null;
      const currentMedications = Array.isArray(body.currentMedications)
        ? body.currentMedications.map((m: unknown) => String(m))
        : [];
      const newMedicine = typeof body.newMedicine === "string" ? body.newMedicine.trim() : "";
      if (!newMedicine) {
        return res.status(400).json({ message: "newMedicine is required." });
      }
      const result = await checkPrescriptionSafety(patientAllergies, currentMedications, newMedicine);
      if (!result) {
        return res.json({ allergyWarning: null, interactionWarning: null });
      }
      res.json(result);
    } catch (err: any) {
      console.error("Prescription check error:", err);
      res.status(500).json({ allergyWarning: null, interactionWarning: null });
    }
  }
);

/**
 * POST /api/ai/patient-education
 * Body: { diagnosis: string, medications?: string[], language?: string }
 * Returns: { explanation: string }
 * Patient or doctor. Plain-language explanation of condition (and optional meds).
 */
router.post(
  "/patient-education",
  authenticateToken,
  authorizeRoles("patient", "doctor"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body || {};
      const diagnosis = typeof body.diagnosis === "string" ? body.diagnosis.trim() : "";
      if (!diagnosis) {
        return res.status(400).json({ message: "diagnosis is required." });
      }
      const medications = Array.isArray(body.medications) ? body.medications.map((m: unknown) => String(m)) : undefined;
      const language = typeof body.language === "string" ? body.language.trim() : undefined;
      const result = await getPatientEducation({ diagnosis, medications, language });
      if (!result) {
        return res.status(503).json({ message: "Explanation service is temporarily unavailable." });
      }
      res.json(result);
    } catch (err: any) {
      if (err.message?.includes("not configured")) {
        return res.status(503).json({ message: "Explanation service is temporarily unavailable." });
      }
      console.error("Patient education error:", err);
      res.status(500).json({ message: "Explanation could not be generated. Please try again." });
    }
  }
);

/**
 * POST /api/ai/referral-letter
 * Body: { patientId: number, reasonForReferral: string, specialistType?: string, recipientName?: string }
 * Returns: { letter: string }
 * Doctor-only. Generates referral letter using patient and encounter data.
 */
router.post(
  "/referral-letter",
  authenticateToken,
  authorizeRoles("doctor"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body || {};
      const patientId = typeof body.patientId === "number" ? body.patientId : Number(body.patientId);
      if (!Number.isInteger(patientId) || patientId <= 0) {
        return res.status(400).json({ message: "Valid patientId is required." });
      }
      const reasonForReferral = typeof body.reasonForReferral === "string" ? body.reasonForReferral.trim() : "";
      if (!reasonForReferral) {
        return res.status(400).json({ message: "reasonForReferral is required." });
      }
      const specialistType = typeof body.specialistType === "string" ? body.specialistType.trim() : undefined;
      const recipientName = typeof body.recipientName === "string" ? body.recipientName.trim() : undefined;

      const doctor = await getDoctorByUserId(req.user!.id);
      if (!doctor?.id) {
        return res.status(403).json({ message: "Doctor profile not found." });
      }

      const result = await generateReferralLetter({
        patientId,
        reasonForReferral,
        specialistType,
        recipientName,
        referringDoctorId: doctor.id,
      });
      if (!result) {
        return res.status(503).json({ message: "Referral letter service is temporarily unavailable." });
      }
      res.json(result);
    } catch (err: any) {
      if (err.message?.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err.message?.includes("not configured")) {
        return res.status(503).json({ message: "Referral letter service is temporarily unavailable." });
      }
      console.error("Referral letter error:", err);
      res.status(500).json({ message: "Referral letter could not be generated. Please try again." });
    }
  }
);

/**
 * POST /api/ai/discharge-summary
 * Body: { encounterId: number }
 * Returns: { summary: string }
 * Doctor-only. Generates discharge summary from IPD encounter data.
 */
router.post(
  "/discharge-summary",
  authenticateToken,
  authorizeRoles("doctor"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body || {};
      const encounterId = typeof body.encounterId === "number" ? body.encounterId : Number(body.encounterId);
      if (!Number.isInteger(encounterId) || encounterId <= 0) {
        return res.status(400).json({ message: "Valid encounterId is required." });
      }
      const result = await generateDischargeSummary(encounterId);
      if (!result) {
        return res.status(503).json({ message: "Discharge summary service is temporarily unavailable." });
      }
      res.json(result);
    } catch (err: any) {
      if (err.message?.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      if (err.message?.includes("not configured")) {
        return res.status(503).json({ message: "Discharge summary service is temporarily unavailable." });
      }
      console.error("Discharge summary error:", err);
      res.status(500).json({ message: "Discharge summary could not be generated. Please try again." });
    }
  }
);

/**
 * POST /api/ai/booking-search
 * Body: { query: string }
 * Returns: { city: string | null, specialty: string | null, searchTerm: string | null }
 * Public (no auth) for book-appointment page. Parses natural language e.g. "cardiologist in Mumbai".
 */
router.post("/booking-search", async (req, res) => {
  try {
    const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
    if (!query) {
      return res.status(400).json({ message: "Query is required." });
    }
    const result = await parseBookingQuery(query);
    res.json(result);
  } catch (err: any) {
    console.error("Booking search error:", err);
    res.status(500).json({ message: "Search could not be processed. Try using the filters below." });
  }
});

export default router;
