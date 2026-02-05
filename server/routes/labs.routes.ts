// server/routes/labs.routes.ts
import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import { createLabReport as createLabReportRecord, updateLabReportStatus, getLabReportById, updateLabReport, getLabByUserId, createLabRequest } from "../services/lab.service";
import { getLabReportsForLab, getLabReportsForPatient, getLabReportsForDoctor } from "../services/lab.service";
import { NotificationService } from "../services/notification.service";
import { getPatientById } from "../services/patients.service";
import { getDoctorById } from "../services/doctors.service";

const router = Router();

router.post(
  '/reports',
  authenticateToken,
  authorizeRoles('lab'),
  async (req: AuthenticatedRequest, res) => {
    try {
      // Get lab ID from user ID
      const lab = await getLabByUserId(req.user!.id);
      if (!lab) {
        return res.status(404).json({ message: 'Lab not found for this user' });
      }

      const report = req.body; // TODO: Validate via Zod
      const created = await createLabReportRecord({
        ...report,
        labId: lab.id,
      });
      res.status(201).json({ success: true, report: created });
    } catch (err) {
      console.error('Upload lab report error:', err);
      res.status(500).json({ message: 'Failed to upload report' });
    }
  }
);

router.get(
  "/profile",
  authenticateToken,
  authorizeRoles("lab"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lab = await getLabByUserId(req.user!.id);
      if (!lab) {
        return res.status(404).json({ message: 'Lab not found for this user' });
      }
      res.json(lab);
    } catch (err) {
      console.error('Get lab profile error:', err);
      res.status(500).json({ message: 'Failed to fetch lab profile' });
    }
  }
);

router.get(
  "/me/reports",
  authenticateToken,
  authorizeRoles("lab"),
  async (req: AuthenticatedRequest, res) => {
    try {
      // Get lab ID from user ID
      const lab = await getLabByUserId(req.user!.id);
      if (!lab) {
        return res.status(404).json({ message: 'Lab not found for this user' });
      }
      
      const reports = await getLabReportsForLab(lab.id);
      
      res.json(reports);
    } catch (err) {
      console.error("❌ Get lab reports error:", err);
      res.status(500).json({ message: "Failed to fetch lab reports" });
    }
  }
);

router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { getAllLabs } = await import("../services/lab.service");
      const labs = await getAllLabs();
      res.json(labs);
    } catch (err) {
      console.error("Get labs error:", err);
      res.status(500).json({ message: "Failed to fetch labs" });
    }
  }
);

router.get(
  "/patient/reports",
  authenticateToken,
  authorizeRoles("patient"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { getPatientByUserId } = await import("../services/patients.service");
      const patient = await getPatientByUserId(req.user!.id);
      if (!patient?.id) {
        return res.json([]);
      }
      const reports = await getLabReportsForPatient(patient.id);
      res.json(reports);
    } catch (err) {
      console.error("Get patient lab reports error:", err);
      res.status(500).json({ message: "Failed to fetch lab reports" });
    }
  }
);

router.get(
  "/doctor/reports",
  authenticateToken,
  authorizeRoles("doctor"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const doctorId = req.user!.id;
      const reports = await getLabReportsForDoctor(doctorId);
      res.json(reports);
    } catch (err) {
      console.error("Get doctor lab reports error:", err);
      res.status(500).json({ message: "Failed to fetch lab reports" });
    }
  }
);

// Create lab request from doctor or receptionist
router.post(
  "/requests",
  authenticateToken,
  authorizeRoles("doctor", "DOCTOR", "RECEPTIONIST", "receptionist"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const requestData = req.body;
      const userRole = req.user!.role?.toUpperCase();
      
      // For receptionist, we need to get hospital name and include it in notes
      // For doctor, use doctorUserId
      let doctorUserId: number | undefined;
      let hospitalName: string | undefined;
      
      if (userRole === 'RECEPTIONIST') {
        // Receptionist requesting lab test - get hospital name
        const { db } = await import('../db');
        const { receptionists, hospitals } = await import('../../shared/schema');
        const { eq } = await import('drizzle-orm');
        
        const [receptionist] = await db
          .select({ hospitalId: receptionists.hospitalId })
          .from(receptionists)
          .where(eq(receptionists.userId, req.user!.id))
          .limit(1);
        
        if (receptionist?.hospitalId) {
          const [hospital] = await db
            .select({ name: hospitals.name })
            .from(hospitals)
            .where(eq(hospitals.id, receptionist.hospitalId))
            .limit(1);
          
          hospitalName = hospital?.name || 'Hospital';
        }
        
        // For receptionist requests, doctorId should be provided in requestData
        // If not provided, we'll use a default or get from appointment
        if (requestData.doctorId) {
          // Get doctor's userId from doctorId
          const { doctors, users } = await import('../../shared/schema');
          const [doctor] = await db
            .select({ userId: doctors.userId })
            .from(doctors)
            .where(eq(doctors.id, requestData.doctorId))
            .limit(1);
          doctorUserId = doctor?.userId;
        }
      } else {
        // Doctor requesting
        doctorUserId = req.user!.id;
      }
      
      if (!doctorUserId) {
        return res.status(400).json({ message: 'Doctor ID is required for lab request' });
      }
      
      // Add hospital name to notes if it's a receptionist request
      const notesWithSender = hospitalName 
        ? `Requested by: ${hospitalName}${requestData.notes ? ` - ${requestData.notes}` : ''}`
        : requestData.notes;
      
      // Create lab request (pending report)
      const created = await createLabRequest({
        ...requestData,
        doctorUserId,
        notes: notesWithSender,
      });
      
      res.status(201).json({ success: true, request: created[0] });
    } catch (err: any) {
      console.error('Create lab request error:', err);
      res.status(500).json({ message: err.message || 'Failed to create lab request' });
    }
  }
);

// Get pending lab requests for lab technicians
router.get(
  "/requests/pending",
  authenticateToken,
  authorizeRoles("lab"),
  async (req: AuthenticatedRequest, res) => {
    try {
      // Get lab ID from user ID
      const lab = await getLabByUserId(req.user!.id);
      if (!lab) {
        return res.status(404).json({ message: 'Lab not found for this user' });
      }
      
      // Get all pending reports for this lab
      const reports = await getLabReportsForLab(lab.id);
      const pendingRequests = reports.filter((report: any) => 
        report.status === 'pending' && report.results === 'Pending - Awaiting lab processing'
      );
      
      res.json(pendingRequests);
    } catch (err) {
      console.error("Get pending lab requests error:", err);
      res.status(500).json({ message: "Failed to fetch pending lab requests" });
    }
  }
);

// Update lab report status
router.patch(
  "/reports/:id/status",
  authenticateToken,
  authorizeRoles("lab", "doctor"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const { status } = req.body;

      if (!status || !['pending', 'processing', 'ready', 'completed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be: pending, processing, ready, or completed' });
      }

      const report = await getLabReportById(reportId);
      if (!report) {
        return res.status(404).json({ message: 'Lab report not found' });
      }

      // Lab technicians can update any report from their lab
      if (req.user!.role?.toUpperCase() === 'LAB') {
        const lab = await getLabByUserId(req.user!.id);
        if (!lab) {
          return res.status(404).json({ message: 'Lab not found for this user' });
        }
        if (report.labId !== lab.id) {
          return res.status(403).json({ message: 'Not authorized to update this report' });
        }
      }

      // Doctors can only update their own reports
      if (req.user!.role?.toUpperCase() === 'DOCTOR' && report.doctorId !== req.user!.id) {
        return res.status(403).json({ message: 'Not authorized to update this report' });
      }

      const oldStatus = report.status;
      const updated = await updateLabReportStatus(reportId, status);
      
      // Send notifications when status changes to "ready" or "completed"
      if ((status === 'ready' || status === 'completed') && oldStatus !== status) {
        try {
          // Get patient and doctor user IDs
          const patient = await getPatientById(report.patientId);
          const doctor = report.doctorId ? await getDoctorById(report.doctorId) : null;
          
          // Send notification to patient
          if (patient?.userId) {
            await NotificationService.sendLabReportNotification(
              reportId,
              patient.userId,
              doctor?.userId || 0
            );
          }
          
          // Send notification to doctor if report was requested by doctor
          if (doctor?.userId && report.doctorId) {
            await NotificationService.createNotification({
              userId: doctor.userId,
              type: 'lab_report',
              title: 'Lab Report Ready',
              message: `Lab report for ${report.testName || 'test'} is now ${status}.`,
              relatedId: reportId,
              relatedType: 'lab_report',
            });
          }
        } catch (notifError) {
          console.error('Failed to send lab report notifications:', notifError);
          // Don't fail the request if notifications fail
        }
      }
      
      res.json({ success: true, report: updated[0] });
    } catch (err) {
      console.error("Update lab report status error:", err);
      res.status(500).json({ message: "Failed to update lab report status" });
    }
  }
);

// Update lab report (full update)
router.put(
  "/reports/:id",
  authenticateToken,
  authorizeRoles("lab"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const updateData = req.body;

      const report = await getLabReportById(reportId);
      if (!report) {
        return res.status(404).json({ message: 'Lab report not found' });
      }

      // Get lab ID from user ID for lab technicians
      if (req.user!.role?.toUpperCase() === 'LAB') {
        const lab = await getLabByUserId(req.user!.id);
        if (!lab) {
          return res.status(404).json({ message: 'Lab not found for this user' });
        }
        // Only lab that created the report can update it
        if (report.labId !== lab.id) {
          return res.status(403).json({ message: 'Not authorized to update this report' });
        }
      }

      const oldStatus = report.status;
      const newStatus = updateData.status || oldStatus;
      const updated = await updateLabReport(reportId, updateData);
      
      // Send notifications when status changes to "ready" or "completed"
      if ((newStatus === 'ready' || newStatus === 'completed') && oldStatus !== newStatus) {
        try {
          // Get patient and doctor user IDs
          const patient = await getPatientById(report.patientId);
          const doctor = report.doctorId ? await getDoctorById(report.doctorId) : null;
          
          // Send notification to patient
          if (patient?.userId) {
            await NotificationService.sendLabReportNotification(
              reportId,
              patient.userId,
              doctor?.userId || 0
            );
          }
          
          // Send notification to doctor if report was requested by doctor
          if (doctor?.userId && report.doctorId) {
            await NotificationService.createNotification({
              userId: doctor.userId,
              type: 'lab_report',
              title: 'Lab Report Ready',
              message: `Lab report for ${report.testName || 'test'} is now ${newStatus}.`,
              relatedId: reportId,
              relatedType: 'lab_report',
            });
          }
        } catch (notifError) {
          console.error('Failed to send lab report notifications:', notifError);
          // Don't fail the request if notifications fail
        }
      }
      
      res.json({ success: true, report: updated[0] });
    } catch (err) {
      console.error("Update lab report error:", err);
      res.status(500).json({ message: "Failed to update lab report" });
    }
  }
);

export default router;