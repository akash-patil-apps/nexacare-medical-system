// server/routes/prescriptions.routes.ts
import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import * as prescriptionService from "../services/prescription.service";
import * as doctorsService from "../services/doctors.service";
import * as patientsService from "../services/patients.service";
import { insertPrescriptionSchema, prescriptions } from "../../shared/schema";
import { db } from "../db";
import { NotificationService } from "../services/localNotification.service";
import * as medicineReminderService from "../services/medicine-reminder.service";
import * as followupReminderService from "../services/followup-reminder.service";
import { logAuditEvent } from "../services/audit.service";

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
      
      // Build final prescription data with doctorId (cast: schema inference can make keys optional)
      const prescriptionData = { ...parsed, doctorId } as Parameters<typeof prescriptionService.issuePrescription>[0];
      
      const result = await prescriptionService.issuePrescription(prescriptionData);

      // Audit: prescription created by doctor
      try {
        const created = Array.isArray(result) ? result[0] : result;
        await logAuditEvent({
          hospitalId: parsed.hospitalId,
          patientId: parsed.patientId,
          actorUserId: req.user!.id,
          actorRole: req.user!.role || 'DOCTOR',
          action: 'PRESCRIPTION_CREATED',
          entityType: 'prescription',
          entityId: created.id,
          after: {
            diagnosis: parsed.diagnosis,
            medications: parsed.medications,
            followUpDate: parsed.followUpDate,
          },
          summary: `Prescription #${created.id} created by doctor ${doctorId}`,
        });
      } catch (auditError) {
        console.error('⚠️ Failed to log prescription audit event:', auditError);
      }
      
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
          
          // Schedule follow-up reminder if follow-up date is set
          if (parsed.followUpDate) {
            try {
              await followupReminderService.scheduleFollowUpReminder(result.id);
              console.log(`✅ Follow-up reminder scheduled for prescription ${result.id}`);
            } catch (followupError) {
              console.error('Failed to schedule follow-up reminder:', followupError);
              // Don't fail the request if reminder scheduling fails
            }
          }
        }
      } catch (notifError) {
        console.error('Failed to send prescription notification:', notifError);
        // Don't fail the request if notification fails
      }

      // Send notification to pharmacists in the same hospital
      try {
        const { getPharmacistsByHospital } = await import('../services/pharmacists.service');
        const hospitalPharmacists = await getPharmacistsByHospital(parsed.hospitalId);
        
        for (const pharmacistData of hospitalPharmacists) {
          if (pharmacistData.user?.id) {
            await NotificationService.createNotification({
              userId: pharmacistData.user.id,
              type: 'prescription',
              title: 'New Prescription Ready for Dispensing',
              message: `A new prescription (ID: ${result.id}) is ready for dispensing.`,
              relatedId: result.id,
              relatedType: 'prescription',
            });
            console.log(`✅ Prescription notification sent to pharmacist ${pharmacistData.user.id}`);
          }
        }
      } catch (pharmacistNotifError) {
        console.error('Failed to send prescription notification to pharmacists:', pharmacistNotifError);
        // Don't fail the request if pharmacist notification fails
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
      const prescriptions = await prescriptionService.getPrescriptionsForPatientWithDetails(patientProfile.id);
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

// 3b. Get medicine reminder schedule for logged-in patient (today + tomorrow), with adherence status
router.get(
  "/patient/reminders",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patientProfile = await patientsService.getPatientByUserId(req.user!.id);
      if (!patientProfile?.id) {
        return res.status(404).json({ error: "Patient profile not found" });
      }
      const reminders = await medicineReminderService.getPatientReminderSchedule(patientProfile.id);
      const adherenceMap = await medicineReminderService.getAdherenceMapForReminders(patientProfile.id, reminders);
      const withAdherence = reminders.map((r) => {
        const key = r.scheduledDate && r.scheduledTime
          ? `${r.prescriptionId}|${r.medicationName}|${r.scheduledDate}|${r.scheduledTime}`
          : null;
        return { ...r, adherence: key ? adherenceMap.get(key) ?? null : null };
      });
      res.json(withAdherence);
    } catch (err) {
      console.error("Patient reminders error:", err);
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  }
);

// 3c. Get patient reminder alarm time settings (morning/noon/afternoon/night)
router.get(
  "/patient/reminder-settings",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patientProfile = await patientsService.getPatientByUserId(req.user!.id);
      if (!patientProfile?.id) {
        return res.status(404).json({ error: "Patient profile not found" });
      }
      const settings = await medicineReminderService.getPatientReminderSettings(patientProfile.id);
      res.json(settings);
    } catch (err) {
      console.error("Patient reminder settings get error:", err);
      res.status(500).json({ error: "Failed to fetch reminder settings" });
    }
  }
);

// 3d. Update patient reminder alarm times (set alarm for morning 8/9am, noon 12/1pm, night 8/9pm, etc.)
router.put(
  "/patient/reminder-settings",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patientProfile = await patientsService.getPatientByUserId(req.user!.id);
      if (!patientProfile?.id) {
        return res.status(404).json({ error: "Patient profile not found" });
      }
      const body = req.body || {};
      const settings = await medicineReminderService.upsertPatientReminderSettings(patientProfile.id, {
        morningTime: body.morningTime,
        noonTime: body.noonTime,
        afternoonTime: body.afternoonTime,
        nightTime: body.nightTime,
      });
      res.json(settings);
    } catch (err) {
      console.error("Patient reminder settings update error:", err);
      res.status(500).json({ error: "Failed to update reminder settings" });
    }
  }
);

// 3e. Record medicine adherence (taken or skipped) for a reminder slot
router.post(
  "/patient/adherence",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patientProfile = await patientsService.getPatientByUserId(req.user!.id);
      if (!patientProfile?.id) {
        return res.status(404).json({ error: "Patient profile not found" });
      }
      const { prescriptionId, medicationName, scheduledDate, scheduledTime, status } = req.body || {};
      if (!prescriptionId || !medicationName || !scheduledDate || !scheduledTime || !status) {
        return res.status(400).json({
          error: "prescriptionId, medicationName, scheduledDate (YYYY-MM-DD), scheduledTime (HH:mm), and status (taken|skipped) are required",
        });
      }
      if (status !== "taken" && status !== "skipped") {
        return res.status(400).json({ error: "status must be 'taken' or 'skipped'" });
      }
      const record = await medicineReminderService.recordAdherence(patientProfile.id, {
        prescriptionId: Number(prescriptionId),
        medicationName: String(medicationName),
        scheduledDate: String(scheduledDate),
        scheduledTime: String(scheduledTime),
        status,
      });
      res.json(record);
    } catch (err) {
      console.error("Patient adherence record error:", err);
      res.status(500).json({ error: "Failed to record adherence" });
    }
  }
);

// 3f. Get adherence history for patient (optional from, to query params)
router.get(
  "/patient/adherence",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patientProfile = await patientsService.getPatientByUserId(req.user!.id);
      if (!patientProfile?.id) {
        return res.status(404).json({ error: "Patient profile not found" });
      }
      const { from, to } = req.query;
      const records = await medicineReminderService.getAdherenceForPatient(
        patientProfile.id,
        from as string | undefined,
        to as string | undefined
      );
      res.json(records);
    } catch (err) {
      console.error("Patient adherence get error:", err);
      res.status(500).json({ error: "Failed to fetch adherence" });
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
      
      // Schedule follow-up reminder if follow-up date is set
      if (req.body.followUpDate) {
        try {
          await followupReminderService.scheduleFollowUpReminder(prescriptionId);
          console.log(`✅ Follow-up reminder scheduled for prescription ${prescriptionId}`);
        } catch (followupError) {
          console.error('Failed to schedule follow-up reminder:', followupError);
          // Don't fail the request if reminder scheduling fails
        }
      }
      
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

// 8. Request refill (patient only)
router.post(
  "/refill-request",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patientProfile = await patientsService.getPatientByUserId(req.user!.id);
      if (!patientProfile?.id) {
        return res.status(404).json({ error: "Patient profile not found" });
      }
      const { prescriptionId, notes } = req.body as { prescriptionId: number; notes?: string };
      if (!prescriptionId || typeof prescriptionId !== "number") {
        return res.status(400).json({ error: "prescriptionId is required" });
      }
      const [rx] = await db.select().from(prescriptions).where(eq(prescriptions.id, prescriptionId));
      if (!rx) {
        return res.status(404).json({ error: "Prescription not found" });
      }
      if (rx.patientId !== patientProfile.id) {
        return res.status(403).json({ error: "This prescription does not belong to you" });
      }
      const hospitalId = rx.hospitalId;
      if (hospitalId) {
        try {
          const { getPharmacistsByHospital } = await import("../services/pharmacists.service");
          const hospitalPharmacists = await getPharmacistsByHospital(hospitalId);
          const patientName = req.user!.fullName || "Patient";
          const message = notes
            ? `Refill requested for prescription #${prescriptionId} by ${patientName}. Notes: ${notes}`
            : `Refill requested for prescription #${prescriptionId} by ${patientName}.`;
          for (const pharmacistData of hospitalPharmacists) {
            if (pharmacistData.user?.id) {
              await NotificationService.createNotification({
                userId: pharmacistData.user.id,
                type: "refill_request",
                title: "Prescription Refill Requested",
                message,
                relatedId: prescriptionId,
                relatedType: "prescription",
              });
            }
          }
        } catch (e) {
          console.error("Refill request: notify pharmacists failed", e);
        }
      }
      try {
        const patient = await patientsService.getPatientById(rx.patientId);
        if (patient?.userId) {
          await NotificationService.createNotification({
            userId: patient.userId,
            type: "refill_request",
            title: "Refill Request Submitted",
            message: "Your refill request has been submitted. The pharmacy will process it shortly.",
            relatedId: prescriptionId,
            relatedType: "prescription",
          });
        }
      } catch (e) {
        console.error("Refill request: notify patient failed", e);
      }
      res.status(200).json({ success: true, message: "Refill request submitted" });
    } catch (err) {
      console.error("Refill request error:", err);
      res.status(500).json({ error: "Failed to submit refill request" });
    }
  }
);

// 9. Get prescription by ID (for viewing details)
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
