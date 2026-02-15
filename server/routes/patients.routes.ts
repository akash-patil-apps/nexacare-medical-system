// server/routes/patients.routes.ts
import { Router } from "express";
import { z } from "zod";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import * as appointmentsService from "../services/appointments.service";
import * as patientsService from "../services/patients.service";
import { insertPatientSchema } from "../../shared/schema";

const router = Router();
const familyMemberBodySchema = z.object({
  relationship: z.enum(['mother', 'father', 'brother', 'sister', 'spouse', 'son', 'daughter', 'other']),
  mobileNumber: z.string().min(10).max(15),
  otp: z.string().length(6),
  fullName: z.string().min(1).optional(),
  email: z.union([z.string().email(), z.literal('')]).optional().transform((v) => (v === '' ? undefined : v)),
  password: z.string().min(6).optional(),
  dateOfBirth: z.union([z.string(), z.date()]).optional().nullable(),
  gender: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyRelation: z.string().optional().nullable(),
  medicalHistory: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  currentMedications: z.string().optional().nullable(),
  chronicConditions: z.string().optional().nullable(),
  insuranceProvider: z.string().optional().nullable(),
  insuranceNumber: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
});

// Staff (doctor, nurse, admin) can update patient profile - e.g. add missing gender, blood group, weight, height from prescriptions/reports
const staffUpdatePatientSchema = z.object({
  dateOfBirth: z.union([z.string(), z.date()]).optional().nullable(),
  gender: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  height: z.union([z.string(), z.number()]).optional().nullable(),
  weight: z.union([z.string(), z.number()]).optional().nullable(),
  // When DOB is unknown: age as of a reference date; reference date defaults to today if not provided
  ageAtReference: z.number().int().min(0).max(150).optional().nullable(),
  ageReferenceDate: z.union([z.string(), z.date()]).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyRelation: z.string().optional().nullable(),
  medicalHistory: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  currentMedications: z.string().optional().nullable(),
  chronicConditions: z.string().optional().nullable(),
});

// POST /patients/register
router.post("/register", async (req, res) => {
  try {
    const validatedData = insertPatientSchema.parse(req.body) as unknown as Omit<import('../../shared/schema-types').InsertPatient, 'id' | 'createdAt'>;
    const patient = await patientsService.createPatient(validatedData);
    res.status(201).json(patient);
  } catch (err) {
    console.error("Patient registration error:", err);
    res.status(400).json({ message: "Registration failed", error: err });
  }
});

// POST /patients/appointments
router.post(
  "/appointments",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const appointment = await appointmentsService.bookAppointment(req.body, req.user!);
      res.status(201).json(appointment);
    } catch (err) {
      console.error("Book appointment error:", err);
      res.status(500).json({ message: "Failed to book appointment" });
    }
  }
);

// GET /patients/profile-by-id/:patientId - get patient profile by patient ID (for family members)
// This must come before /profile to avoid route conflicts
router.get(
  "/profile-by-id/:patientId",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }
      // Verify the patient is accessible (own or family member)
      const canAct = await patientsService.canActAsPatient(req.user!.id, patientId);
      if (!canAct) {
        return res.status(403).json({ message: "Access denied" });
      }
      const result = await patientsService.getPatientWithUserById(patientId);
      if (!result) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.status(200).json(result);
    } catch (err) {
      console.error("Fetch patient profile by ID error:", err);
      res.status(500).json({ message: "Failed to fetch patient profile" });
    }
  }
);

// PATCH /patients/staff-update/:patientId - doctor, nurse, hospital can add/update patient info (gender, blood group, weight, height, etc.)
router.patch(
  "/staff-update/:patientId",
  authenticateToken,
  authorizeRoles("DOCTOR", "NURSE", "HOSPITAL"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }
      const raw = staffUpdatePatientSchema.parse(req.body);
      const data: Record<string, unknown> = { ...raw };
      if (raw.dateOfBirth != null) {
        const d = raw.dateOfBirth instanceof Date ? raw.dateOfBirth : new Date(String(raw.dateOfBirth));
        data.dateOfBirth = isNaN(d.getTime()) ? null : d;
      }
      if (raw.height != null) data.height = String(raw.height);
      if (raw.weight != null) data.weight = String(raw.weight);
      // Age when DOB unknown: use reference date or default to today
      if (raw.ageAtReference != null) {
        data.ageAtReference = raw.ageAtReference;
        if (raw.ageReferenceDate != null) {
          const refD = raw.ageReferenceDate instanceof Date ? raw.ageReferenceDate : new Date(String(raw.ageReferenceDate));
          data.ageReferenceDate = isNaN(refD.getTime()) ? new Date() : refD;
        } else {
          data.ageReferenceDate = new Date();
        }
      }
      const updated = await patientsService.updatePatientById(patientId, data as any);
      if (!updated) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.status(200).json(updated);
    } catch (err: any) {
      console.error("Staff update patient error:", err);
      res.status(400).json({ message: err?.message || "Update failed", error: err?.errors || err });
    }
  }
);

// GET /patients/profile
router.get(
  "/profile",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const patient = await patientsService.getPatientByUserId(req.user!.id);
      res.status(200).json(patient);
    } catch (err) {
      console.error("Fetch patient profile error:", err);
      res.status(500).json({ message: "Failed to fetch patient profile" });
    }
  }
);

// PUT /patients/profile
router.put(
  "/profile",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertPatientSchema.partial().parse(req.body);
      const updated = await patientsService.updatePatientByUserId(req.user!.id, validatedData);
      res.status(200).json(updated);
    } catch (err) {
      console.error("Update patient profile error:", err);
      res.status(400).json({ message: "Invalid input", error: err });
    }
  }
);

// GET /patients/family-members - list family members for logged-in patient
router.get(
  "/family-members",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const list = await patientsService.getFamilyMembers(req.user!.id);
      res.status(200).json(list);
    } catch (err) {
      console.error("Get family members error:", err);
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  }
);

// POST /patients/family-members - add a family member (create user + patient + link)
router.post(
  "/family-members",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = familyMemberBodySchema.parse(req.body) as Parameters<typeof patientsService.addFamilyMember>[1];
      const result = await patientsService.addFamilyMember(req.user!.id, body);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("Add family member error:", err);
      res.status(400).json({
        message: err?.message || "Failed to add family member",
        error: err?.errors || err,
      });
    }
  }
);

export default router;
