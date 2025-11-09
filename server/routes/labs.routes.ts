// server/routes/labs.routes.ts
import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import { createLabReport as createLabReportRecord } from "../services/lab.service";
import { getLabReportsForLab, getLabReportsForPatient } from "../services/lab.service";

const router = Router();

router.post(
  '/reports',
  authenticateToken,
  authorizeRoles('lab'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const report = req.body; // TODO: Validate via Zod
      const created = await createLabReportRecord({
        ...report,
        labId: req.user!.id,
      });
      res.status(201).json({ success: true, report: created });
    } catch (err) {
      console.error('Upload lab report error:', err);
      res.status(500).json({ message: 'Failed to upload report' });
    }
  }
);

router.get(
  "/me/reports",
  authenticateToken,
  authorizeRoles("lab"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const labId = req.user!.id;
      const reports = await getLabReportsForLab(labId);
      res.json(reports);
    } catch (err) {
      console.error("Get lab reports error:", err);
      res.status(500).json({ message: "Failed to fetch lab reports" });
    }
  }
);

router.get(
  "/patient/reports",
  authenticateToken,
  authorizeRoles("patient"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patientId = req.user!.id;
      const reports = await getLabReportsForPatient(patientId);
      res.json(reports);
    } catch (err) {
      console.error("Get patient lab reports error:", err);
      res.status(500).json({ message: "Failed to fetch lab reports" });
    }
  }
);

export default router;