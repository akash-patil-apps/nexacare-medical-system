// server/routes/index.ts
import { Express, Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";

import authRoutes from "./auth.routes.js";
import testRoutes from "./test.routes.js";
import usersRoutes from "./users.routes.js";
import hospitalsRoutes from "./hospitals.routes.js";
import doctorsRoutes from "./doctors.routes.js";
import nursesRoutes from "./nurses.routes.js";
import pharmacistsRoutes from "./pharmacists.routes.js";
import radiologyTechniciansRoutes from "./radiology-technicians.routes.js";
import patientsRoutes from "./patients.routes.js";
import labsRoutes from "./labs.routes.js";
import receptionRoutes from "./reception.routes.js";
import appointmentsRoutes from "./appointments.routes.js";
import availabilityRoutes from "./availability.routes.js";
import prescriptionsRoutes from "./prescriptions.routes.js";
import locationsRoutes from "./locations.routes.js";
import onboardingRoutes from "./onboarding.routes.js";
import notificationsRoutes from "./notifications.routes.js";
import messagesRoutes from "./messages.routes.js";
import eventsRoutes from "./events.routes.js";
import queueRoutes from "./queue.routes.js";
import ipdRoutes from "./ipd.routes.js";
import billingRoutes from "./billing.routes.js";
import clinicalRoutes from "./clinical.routes.js";
import medicationRoutes from "./medication.routes.js";
import medicinesRoutes from "./medicines.routes.js";
import labTestsRoutes from "./lab-tests.routes.js";
import radiologyTestsRoutes from "./radiology-tests.routes.js";
import pharmacyRoutes from "./pharmacy.routes.js";
import labWorkflowRoutes from "./lab-workflow.routes.js";
import radiologyWorkflowRoutes from "./radiology-workflow.routes.js";
import ipdWorkflowRoutes from "./ipd-workflow.routes.js";
import hospitalChargesRoutes from "./hospital-charges.routes.js";
import revenueRoutes from "./revenue.routes.js";
import cronRoutes from "./cron.routes.js";
import reportingRoutes from "./reporting.routes.js";
import paymentGatewayRoutes from "./payment-gateway.routes.js";
import storageRoutes from "./storage.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import auditRoutes from "./audit.routes.js";
import insuranceRoutes from "./insurance.routes.js";
import presenceRoutes from "./presence.routes.js";


const router = Router();

router.get("/health", (_, res) => {
  res.status(200).json({ status: "ok" });
});

export default router;

export async function registerRoutes(app: Express) {
  app.use("/api", router);  // Mount the health check router
  app.use("/api/test", testRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/hospitals", hospitalsRoutes);
  app.use("/api/doctors", doctorsRoutes);
  app.use("/api/nurses", nursesRoutes);
  app.use("/api/pharmacists", pharmacistsRoutes);
  app.use("/api/radiology-technicians", radiologyTechniciansRoutes);
  app.use("/api/patients", patientsRoutes);
  app.use("/api/labs", labsRoutes);
  app.use("/api/reception", receptionRoutes);
  app.use("/api/appointments", appointmentsRoutes);
  app.use("/api/availability", availabilityRoutes);
  app.use("/api/locations", locationsRoutes);
  app.use("/api/onboarding", onboardingRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/messages", messagesRoutes);
  app.use("/api/events", eventsRoutes);
  app.use("/api/opd-queue", queueRoutes);
  app.use("/api/ipd", ipdRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/clinical", clinicalRoutes);
  app.use("/api/medications", medicationRoutes);
  app.use("/api/medicines", medicinesRoutes);
  app.use("/api/lab-tests", labTestsRoutes);
  app.use("/api/radiology-tests", radiologyTestsRoutes);
  app.use("/api/pharmacy", pharmacyRoutes);
  app.use("/api/lab-workflow", labWorkflowRoutes);
  app.use("/api/radiology-workflow", radiologyWorkflowRoutes);
  app.use("/api/ipd-workflow", ipdWorkflowRoutes);
  app.use("/api/hospital-charges", hospitalChargesRoutes);
  app.use("/api/revenue", revenueRoutes);
  app.use("/api/cron", cronRoutes);
  app.use("/api/reports", reportingRoutes);
  app.use("/api/payments", paymentGatewayRoutes);
  app.use("/api/storage", storageRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/audit", auditRoutes);
  app.use("/api/insurance", insuranceRoutes);
  app.use("/api/presence", presenceRoutes);

  // NOTE: /api/prescriptions/my should use /api/prescriptions/patient for patients
  // The prescriptions router handles all prescription endpoints
  
  app.use("/api/prescriptions", prescriptionsRoutes);
  // NOTE: Dashboard stats are now calculated client-side from real data
  // This endpoint can be removed or enhanced to calculate stats server-side if needed
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Return empty stats - dashboards calculate from real data now
      res.json({
        totalAppointments: 0,
        upcomingAppointments: 0,
        completedAppointments: 0,
        pendingPrescriptions: 0,
        activePrescriptions: 0,
        labReports: 0
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });
  
  
  app.get("/api/lab-reports/my", async (req, res) => {
    try {
      // Return mock lab reports for demo
      const mockReports = [
        {
          id: 1,
          testName: "Blood Test",
          testType: "Complete Blood Count",
          reportDate: "2024-09-20T10:00:00Z",
          status: "completed",
          result: "Normal"
        }
      ];
      res.json(mockReports);
    } catch (error) {
      console.error('My lab reports error:', error);
      res.status(500).json({ message: 'Failed to fetch lab reports' });
    }
  });
  
  
  
  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      res.json({ user });
    } catch (error) {
      console.error('Auth me error:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });

  // NOTE: /api/appointments/my is handled by appointments.routes.ts
  // Do NOT add duplicate route here - it will override the real route handler

  // NOTE: /api/doctors/profile is now handled by doctors.routes.ts
  // The route is defined in doctors.routes.ts before the /:doctorId route to avoid conflicts

  // NOTE: /api/prescriptions/patient and /api/prescriptions/doctor are handled by prescriptions.routes.ts
  // These mock endpoints should be removed - they are overridden by the prescriptions router
  
  // 404 handler for undefined API routes - must be after all route registrations
  app.use("/api/*", (req, res) => {
    res.status(404).json({ 
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      path: req.originalUrl
    });
  });
  
  return app;
}