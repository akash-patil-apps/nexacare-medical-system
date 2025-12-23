// server/routes/index.ts
import { Express, Router } from "express";
import { authenticateToken } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";

import authRoutes from "./auth.routes";
import testRoutes from "./test.routes";
import usersRoutes from "./users.routes";
import hospitalsRoutes from "./hospitals.routes";
import doctorsRoutes from "./doctors.routes";
import patientsRoutes from "./patients.routes";
import labsRoutes from "./labs.routes";
import receptionRoutes from "./reception.routes";
import appointmentsRoutes from "./appointments.routes";
import availabilityRoutes from "./availability.routes";
import prescriptionsRoutes from "./prescriptions.routes";
import locationsRoutes from "./locations.routes";
import onboardingRoutes from "./onboarding.routes";
import notificationsRoutes from "./notifications.routes";


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
  app.use("/api/patients", patientsRoutes);
  app.use("/api/labs", labsRoutes);
  app.use("/api/reception", receptionRoutes);
  app.use("/api/appointments", appointmentsRoutes);
  app.use("/api/doctors/availability", availabilityRoutes);
  app.use("/api/locations", locationsRoutes);
  app.use("/api/onboarding", onboardingRoutes);
  app.use("/api/notifications", notificationsRoutes);
  
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
  
  return app;
}