// server/routes/onboarding.routes.ts
import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import * as onboardingService from "../services/onboarding.service";

const router = Router();

// POST /onboarding/patient/complete
router.post(
  "/patient/complete",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await onboardingService.completePatientOnboarding(
        req.user!.id,
        req.body
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Patient onboarding error:", error);
      res.status(400).json({ 
        message: "Onboarding failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  }
);

// GET /onboarding/patient/status
router.get(
  "/patient/status",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const status = await onboardingService.getPatientOnboardingStatus(req.user!.id);
      res.status(200).json(status);
    } catch (error) {
      console.error("Get onboarding status error:", error);
      res.status(500).json({ message: "Failed to get onboarding status" });
    }
  }
);

export default router;



