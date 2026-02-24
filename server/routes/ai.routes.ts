import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import { getPatientByUserId } from "../services/patients.service";
import { interpretLabReport, interpretLabReportsCombined } from "../services/lab-interpretation.service";

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

export default router;
