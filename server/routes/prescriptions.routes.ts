// server/routes/prescriptions.routes.ts
import { Router } from "express";
import { z } from "zod";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import * as prescriptionService from "../services/prescription.service";
import * as doctorsService from "../services/doctors.service";
import * as patientsService from "../services/patients.service";
import { insertPrescriptionSchema } from "../../shared/schema"; 

const router = Router();

// 1. Issue a new prescription (only doctor)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("DOCTOR"),
  async (req: AuthenticatedRequest, res) => {
    try {
      console.log("📋 Creating prescription - Request body:", JSON.stringify(req.body, null, 2));
      console.log("👨‍⚕️ User ID from token:", req.user!.id);
      
      // Get doctor ID from user ID
      const doctorProfile = await doctorsService.getDoctorByUserId(req.user!.id);
      if (!doctorProfile || !doctorProfile.id) {
        console.error("❌ Doctor profile not found for user ID:", req.user!.id);
        return res.status(404).json({ error: "Doctor profile not found" });
      }
      
      const doctorId = doctorProfile.id;
      console.log("✅ Doctor ID:", doctorId);
      
      // Parse with Zod schema
      const parsed = insertPrescriptionSchema.parse(req.body);
      console.log("✅ Parsed prescription data:", JSON.stringify(parsed, null, 2));
      
      // Ensure required fields are present
      if (!parsed.patientId) {
        return res.status(400).json({ error: "patientId is required" });
      }
      if (!parsed.hospitalId) {
        return res.status(400).json({ error: "hospitalId is required" });
      }
      if (!parsed.diagnosis) {
        return res.status(400).json({ error: "diagnosis is required" });
      }
      if (!parsed.medications) {
        return res.status(400).json({ error: "medications is required" });
      }
      
      // Build final prescription data with doctorId
      const prescriptionData = { ...parsed, doctorId };
      console.log("📤 Final prescription data to insert:", JSON.stringify(prescriptionData, null, 2));
      
      const result = await prescriptionService.issuePrescription(prescriptionData);
      console.log("✅ Prescription created successfully:", result.id);
      res.status(201).json(result);
    } catch (err) {
      console.error("❌ Issue prescription error:", err);
      if (err instanceof z.ZodError) {
        console.error("🔍 Validation errors:", JSON.stringify(err.errors, null, 2));
        res.status(400).json({ 
          error: "Invalid data", 
          details: err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        res.status(400).json({ error: "Invalid data or server error", details: err instanceof Error ? err.message : String(err) });
      }
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
      // Map user -> patient profile
      const patientProfile = await patientsService.getPatientByUserId(req.user!.id);
      if (!patientProfile || !patientProfile.id) {
        console.error("❌ Patient profile not found for user ID:", req.user!.id);
        return res.status(404).json({ error: "Patient profile not found" });
      }
      const prescriptions = await prescriptionService.getPrescriptionsForPatient(patientProfile.id);
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
      const patientProfile = await patientsService.getPatientByUserId(req.user!.id);
      if (!patientProfile || !patientProfile.id) {
        console.error("❌ Patient profile not found for user ID:", req.user!.id);
        return res.status(404).json({ error: "Patient profile not found" });
      }
      const result = await prescriptionService.getPrescriptionsByFilters({
        patientId: patientProfile.id,
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
