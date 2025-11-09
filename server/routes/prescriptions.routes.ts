// server/routes/prescriptions.routes.ts
import { Router } from "express";
import { z } from "zod";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import * as prescriptionService from "../services/prescription.service";
import { insertPrescriptionSchema } from "../../shared/schema"; 

const router = Router();

// 1. Issue a new prescription (only doctor)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("DOCTOR"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const doctorId = req.user!.id;
      const parsed = insertPrescriptionSchema.parse(req.body);
      const result = await prescriptionService.issuePrescription({ ...parsed, doctorId });
      res.status(201).json(result);
    } catch (err) {
      console.error("Issue prescription error:", err);
      res.status(400).json({ error: "Invalid data or server error" });
    }
  }
);

// 2. Get prescriptions for logged-in patient
router.get(
  "/patient",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const prescriptions = await prescriptionService.getPrescriptionsForPatient(req.user!.id);
      res.json(prescriptions);
    } catch (err) {
      console.error("Fetch patient prescriptions failed:", err);
      res.status(500).json({ error: "Failed to fetch prescriptions" });
    }
  }
);

// 3. Get filtered prescriptions (hospital, date) for patient
router.get(
  "/patient/filters",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { hospitalId, from, to } = req.query;
      const result = await prescriptionService.getPrescriptionsByFilters({
        patientId: req.user!.id,
        hospitalId: hospitalId ? Number(hospitalId) : undefined,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
      });
      res.json(result);
    } catch (err) {
      console.error("Filtered prescriptions error:", err);
      res.status(500).json({ error: "Filter failed" });
    }
  }
);

// 4. Update prescription by doctor
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("DOCTOR"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const prescriptionId = Number(req.params.id);
      const updated = await prescriptionService.updatePrescription(
        req.user!.id,
        prescriptionId,
        req.body
      );
      if (!updated) return res.status(404).json({ message: "Prescription not found or unauthorized" });
      res.json(updated);
    } catch (err) {
      console.error("Update prescription error:", err);
      res.status(500).json({ error: "Failed to update" });
    }
  }
);

// 5. Delete prescription by doctor
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("DOCTOR"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const prescriptionId = Number(req.params.id);
      const deleted = await prescriptionService.deletePrescription(req.user!.id, prescriptionId);
      if (deleted.length === 0) {
        return res.status(404).json({ message: "Prescription not found or unauthorized" });
      }
      res.json({ message: "Prescription deleted" });
    } catch (err) {
      console.error("Delete prescription error:", err);
      res.status(500).json({ error: "Failed to delete" });
    }
  }
);

// 6. Get prescriptions for logged-in doctor
router.get(
  "/doctor",
  authenticateToken,
  authorizeRoles("DOCTOR"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { search, hospitalId, from, to, status, limit } = req.query;
      const prescriptions = await prescriptionService.getPrescriptionsForDoctor({
        doctorId: req.user!.id,
        search: search as string,
        hospitalId: hospitalId ? Number(hospitalId) : undefined,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        status: status as string,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(prescriptions);
    } catch (err) {
      console.error("Fetch doctor prescriptions failed:", err);
      res.status(500).json({ error: "Failed to fetch prescriptions" });
    }
  }
);

// 7. Get prescriptions for hospital admin
router.get(
  "/hospital",
  authenticateToken,
  authorizeRoles("HOSPITAL"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { search, doctorId, from, to, status, limit } = req.query;
      const prescriptions = await prescriptionService.getPrescriptionsForHospital({
        hospitalId: req.user!.id,
        search: search as string,
        doctorId: doctorId ? Number(doctorId) : undefined,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        status: status as string,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(prescriptions);
    } catch (err) {
      console.error("Fetch hospital prescriptions failed:", err);
      res.status(500).json({ error: "Failed to fetch prescriptions" });
    }
  }
);

// 8. Get prescription by ID (for viewing details)
router.get(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const prescriptionId = Number(req.params.id);
      const prescription = await prescriptionService.getPrescriptionById(prescriptionId, req.user!.id, req.user!.role);
      if (!prescription) {
        return res.status(404).json({ message: "Prescription not found or unauthorized" });
      }
      res.json(prescription);
    } catch (err) {
      console.error("Fetch prescription error:", err);
      res.status(500).json({ error: "Failed to fetch prescription" });
    }
  }
);

export default router;
