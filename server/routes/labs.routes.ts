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
      console.log(`🔬 GET /api/labs/me/reports - User ID: ${req.user!.id}`);
      
      // Get lab ID from user ID
      const lab = await getLabByUserId(req.user!.id);
      if (!lab) {
        console.log(`❌ Lab not found for user ID: ${req.user!.id}`);
        return res.status(404).json({ message: 'Lab not found for this user' });
      }
      
      console.log(`✅ Found lab ID: ${lab.id} for user ID: ${req.user!.id}`);
      const reports = await getLabReportsForLab(lab.id);
      
      console.log(`📤 Returning ${reports.length} reports to client`);
      if (reports.length > 0) {
        console.log(`📄 Sample report:`, {
          id: reports[0].id,
          patientId: reports[0].patientId,
          patientName: reports[0].patientName,
          testName: reports[0].testName
        });
      }
      
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
      const patientId = req.user!.id;
      const reports = await getLabReportsForPatient(patientId);
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

// Create lab request from doctor
router.post(
  "/requests",
  authenticateToken,
  authorizeRoles("doctor"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const requestData = req.body;
      
      // Get doctor user ID from authenticated user
      const doctorUserId = req.user!.id;
      
      // Create lab request (pending report)
      const created = await createLabRequest({
        ...requestData,
        doctorUserId,
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