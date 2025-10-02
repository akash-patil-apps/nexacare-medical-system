// server/routes/index.ts
import { Express, Router } from "express";

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


const router = Router();

router.get("/health", (_, res) => {
  res.status(200).json({ status: "ok" });
});

export default router;

export async function registerRoutes(app: Express) {
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
  
  // Add missing endpoints that frontend expects - MUST be before specific route handlers
  app.get("/api/prescriptions/my", async (req, res) => {
    try {
      // Return mock prescriptions for demo
      const mockPrescriptions = [
        {
          id: 1,
          diagnosis: "Hypertension",
          medications: "Lisinopril 10mg daily",
          instructions: "Take with food",
          createdAt: "2024-09-20T10:00:00Z",
          doctorName: "Dr. John Smith"
        }
      ];
      res.json(mockPrescriptions);
    } catch (error) {
      console.error('My prescriptions error:', error);
      res.status(500).json({ message: 'Failed to fetch prescriptions' });
    }
  });
  
  app.use("/api/prescriptions", prescriptionsRoutes);
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Mock stats for now - can be enhanced with real data later
      res.json({
        totalAppointments: 12,
        upcomingAppointments: 3,
        completedAppointments: 9,
        pendingPrescriptions: 2,
        activePrescriptions: 5,
        labReports: 8
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
  
  
  
  app.get("/api/auth/me", async (req, res) => {
    try {
      // Mock user data for demo
      res.json({
        user: {
          id: 1,
          mobileNumber: "9876543211",
          fullName: "Demo User",
          role: "patient"
        }
      });
    } catch (error) {
      console.error('Auth me error:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });
  
  return app;
}