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

// POST /onboarding/nurse/complete
router.post(
  "/nurse/complete",
  authenticateToken,
  authorizeRoles("NURSE"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await onboardingService.completeNurseOnboarding(
        req.user!.id,
        req.body
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Nurse onboarding error:", error);
      res.status(400).json({
        message: "Onboarding failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

// GET /onboarding/nurse/status
router.get(
  "/nurse/status",
  authenticateToken,
  authorizeRoles("NURSE"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const status = await onboardingService.getNurseOnboardingStatus(req.user!.id);
      res.status(200).json(status);
    } catch (error) {
      console.error("Get nurse onboarding status error:", error);
      res.status(500).json({ message: "Failed to get onboarding status" });
    }
  }
);

// POST /onboarding/pharmacist/complete
router.post(
  "/pharmacist/complete",
  authenticateToken,
  authorizeRoles("PHARMACIST"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await onboardingService.completePharmacistOnboarding(
        req.user!.id,
        req.body
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Pharmacist onboarding error:", error);
      res.status(400).json({
        message: "Onboarding failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

// GET /onboarding/pharmacist/status
router.get(
  "/pharmacist/status",
  authenticateToken,
  authorizeRoles("PHARMACIST"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const status = await onboardingService.getPharmacistOnboardingStatus(req.user!.id);
      res.status(200).json(status);
    } catch (error) {
      console.error("Get pharmacist onboarding status error:", error);
      res.status(500).json({ message: "Failed to get onboarding status" });
    }
  }
);

// POST /onboarding/radiology-technician/complete
router.post(
  "/radiology-technician/complete",
  authenticateToken,
  authorizeRoles("RADIOLOGY_TECHNICIAN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await onboardingService.completeRadiologyTechnicianOnboarding(
        req.user!.id,
        req.body
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Radiology technician onboarding error:", error);
      res.status(400).json({
        message: "Onboarding failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

// GET /onboarding/radiology-technician/status
router.get(
  "/radiology-technician/status",
  authenticateToken,
  authorizeRoles("RADIOLOGY_TECHNICIAN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const status = await onboardingService.getRadiologyTechnicianOnboardingStatus(req.user!.id);
      res.status(200).json(status);
    } catch (error) {
      console.error("Get radiology technician onboarding status error:", error);
      res.status(500).json({ message: "Failed to get onboarding status" });
    }
  }
);

// POST /onboarding/hospital/complete
router.post(
  "/hospital/complete",
  authenticateToken,
  authorizeRoles("HOSPITAL"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await onboardingService.completeHospitalOnboarding(
        req.user!.id,
        req.body
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Hospital onboarding error:", error);
      res.status(400).json({
        message: "Onboarding failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// GET /onboarding/hospital/status
router.get(
  "/hospital/status",
  authenticateToken,
  authorizeRoles("HOSPITAL"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const status = await onboardingService.getHospitalOnboardingStatus(req.user!.id);
      res.status(200).json(status);
    } catch (error) {
      console.error("Get hospital onboarding status error:", error);
      res.status(500).json({ message: "Failed to get onboarding status" });
    }
  }
);

// POST /onboarding/doctor/complete
router.post(
  "/doctor/complete",
  authenticateToken,
  authorizeRoles("DOCTOR"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await onboardingService.completeDoctorOnboarding(
        req.user!.id,
        req.body
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Doctor onboarding error:", error);
      res.status(400).json({
        message: "Onboarding failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

// GET /onboarding/doctor/status
router.get(
  "/doctor/status",
  authenticateToken,
  authorizeRoles("DOCTOR"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const status = await onboardingService.getDoctorOnboardingStatus(req.user!.id);
      res.status(200).json(status);
    } catch (error) {
      console.error("Get doctor onboarding status error:", error);
      res.status(500).json({ message: "Failed to get onboarding status" });
    }
  }
);

// POST /onboarding/receptionist/complete
router.post(
  "/receptionist/complete",
  authenticateToken,
  authorizeRoles("RECEPTIONIST"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await onboardingService.completeReceptionistOnboarding(
        req.user!.id,
        req.body
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Receptionist onboarding error:", error);
      res.status(400).json({
        message: "Onboarding failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

// GET /onboarding/receptionist/status
router.get(
  "/receptionist/status",
  authenticateToken,
  authorizeRoles("RECEPTIONIST"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const status = await onboardingService.getReceptionistOnboardingStatus(req.user!.id);
      res.status(200).json(status);
    } catch (error) {
      console.error("Get receptionist onboarding status error:", error);
      res.status(500).json({ message: "Failed to get onboarding status" });
    }
  }
);

// POST /onboarding/lab/complete
router.post(
  "/lab/complete",
  authenticateToken,
  authorizeRoles("LAB"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await onboardingService.completeLabOnboarding(
        req.user!.id,
        req.body
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Lab onboarding error:", error);
      res.status(400).json({
        message: "Onboarding failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

// GET /onboarding/lab/status
router.get(
  "/lab/status",
  authenticateToken,
  authorizeRoles("LAB"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const status = await onboardingService.getLabOnboardingStatus(req.user!.id);
      res.status(200).json(status);
    } catch (error) {
      console.error("Get lab onboarding status error:", error);
      res.status(500).json({ message: "Failed to get onboarding status" });
    }
  }
);

export default router;



