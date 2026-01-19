// server/routes/prescriptions.routes.ts
import { Router } from "express";
import { z } from "zod";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import * as prescriptionService from "../services/prescription.service";
import * as doctorsService from "../services/doctors.service";
import * as patientsService from "../services/patients.service";
import { insertPrescriptionSchema } from "../../shared/schema";
import { NotificationService } from "../services/localNotification.service";
import * as medicineReminderService from "../services/medicine-reminder.service"; 

const router = Router();

// 1. Issue a new prescription (only doctor)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("DOCTOR"),
  async (req: AuthenticatedRequest, res) => {
    try {
      
      // Get doctor ID from user ID
      const doctorProfile = await doctorsService.getDoctorByUserId(req.user!.id);
      if (!doctorProfile || !doctorProfile.id) {
        console.error("❌ Doctor profile not found for user ID:", req.user!.id);
        return res.status(404).json({ error: "Doctor profile not found" });
      }
      
      const doctorId = doctorProfile.id;
      
      // Parse with Zod schema
      const parsed = insertPrescriptionSchema.parse(req.body);
      
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
      
      const result = await prescriptionService.issuePrescription(prescriptionData);
      
      // Send notification to patient
      try {
        const patient = await patientsService.getPatientById(parsed.patientId);
        if (patient?.userId) {
          await NotificationService.sendPrescriptionNotification(
            result.id,
            patient.userId,
            doctorId
          );
          console.log(`✅ Prescription notification sent to patient ${patient.userId}`);
          
          // Schedule medicine reminders
          try {
            await medicineReminderService.scheduleMedicineReminders(result.id);
            console.log(`✅ Medicine reminders scheduled for prescription ${result.id}`);
          } catch (reminderError) {
            console.error('Failed to schedule medicine reminders:', reminderError);
            // Don't fail the request if reminder scheduling fails
          }
        }
      } catch (notifError) {
        console.error('Failed to send prescription notification:', notifError);
        // Don't fail the request if notification fails
      }
      
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

// 4. Update prescription by doctor (with edit window guard)
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("DOCTOR"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const doctorProfile = await doctorsService.getDoctorByUserId(req.user!.id);
      if (!doctorProfile) return res.status(404).json({ error: "Doctor profile not found" });
      const prescriptionId = Number(req.params.id);
      const updated = await prescriptionService.updatePrescription(
        doctorProfile.id,
        prescriptionId,
        req.body
      );
      if (!updated) return res.status(404).json({ message: "Prescription not found or unauthorized" });
      res.json(updated);
    } catch (err: any) {
      console.error("Update prescription error:", err);
      res.status(500).json({ error: err.message || "Failed to update" });
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
      // Get doctor ID from user ID (prescriptions.doctorId references doctors.id, not users.id)
      const doctorProfile = await doctorsService.getDoctorByUserId(req.user!.id);
      if (!doctorProfile || !doctorProfile.id) {
        console.error("❌ Doctor profile not found for user ID:", req.user!.id);
        return res.status(404).json({ error: "Doctor profile not found" });
      }
      
      const doctorId = doctorProfile.id;
      
      const { search, hospitalId, from, to, status, limit } = req.query;
      const prescriptions = await prescriptionService.getPrescriptionsForDoctor({
        doctorId: doctorId, // Use doctor table ID, not user ID
        search: search as string,
        hospitalId: hospitalId ? Number(hospitalId) : undefined,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        status: status as string,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(prescriptions);
    } catch (err) {
      console.error("❌ Fetch doctor prescriptions failed:", err);
      res.status(500).json({ error: "Failed to fetch prescriptions" });
    }
  }
);

// 7. Extend prescription edit window (doctor only)
router.post(
  "/:id/extend",
  authenticateToken,
  authorizeRoles("DOCTOR"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const doctorProfile = await doctorsService.getDoctorByUserId(req.user!.id);
      if (!doctorProfile) return res.status(404).json({ error: "Doctor profile not found" });
      const prescriptionId = Number(req.params.id);
      const extended = await prescriptionService.extendPrescription(prescriptionId, doctorProfile.id);
      res.json(extended);
    } catch (err: any) {
      console.error("Extend prescription error:", err);
      res.status(500).json({ error: err.message || "Failed to extend" });
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
      if (isNaN(prescriptionId)) {
        return res.status(400).json({ message: "Invalid prescription ID" });
      }
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
