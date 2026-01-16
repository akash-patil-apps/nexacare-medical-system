// server/routes/radiology-workflow.routes.ts
import { Router } from "express";
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth";
import * as radiologyWorkflowService from "../services/radiology-workflow.service";
import { db } from "../db";
import { doctors, radiologyTechnicians } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Helper to get hospital ID from user
 */
const getHospitalId = async (req: AuthenticatedRequest): Promise<number> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error("User not authenticated");
  }

  // Check if user is a doctor
  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.userId, userId))
    .limit(1);

  if (doctor) {
    return doctor.hospitalId;
  }

  // Check if user is a radiology technician
  const [tech] = await db
    .select()
    .from(radiologyTechnicians)
    .where(eq(radiologyTechnicians.userId, userId))
    .limit(1);

  if (tech) {
    return tech.hospitalId || 0;
  }

  throw new Error("User is not associated with a hospital");
};

/**
 * Create radiology order
 * POST /api/radiology-workflow/orders
 */
router.post("/orders", async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      patientId,
      doctorId,
      appointmentId,
      encounterId,
      priority,
      clinicalIndication,
      testIds,
    } = req.body;

    if (!patientId || !doctorId || !testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const order = await radiologyWorkflowService.createRadiologyOrder({
      hospitalId,
      patientId,
      doctorId,
      appointmentId,
      encounterId,
      priority,
      clinicalIndication,
      testIds,
      orderedByUserId: userId,
    });

    res.status(201).json(order);
  } catch (error: any) {
    console.error("Error creating radiology order:", error);
    res.status(500).json({ message: error.message || "Failed to create radiology order" });
  }
});

/**
 * Get radiology orders
 * GET /api/radiology-workflow/orders
 */
router.get("/orders", async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);

    const { status, patientId, doctorId, startDate, endDate } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (patientId) filters.patientId = parseInt(patientId as string);
    if (doctorId) filters.doctorId = parseInt(doctorId as string);
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const orders = await radiologyWorkflowService.getRadiologyOrders(hospitalId, filters);

    res.json(orders);
  } catch (error: any) {
    console.error("Error fetching radiology orders:", error);
    res.status(500).json({ message: error.message || "Failed to fetch radiology orders" });
  }
});

/**
 * Get pending orders (for radiology dashboard)
 * GET /api/radiology-workflow/orders/pending
 */
router.get("/orders/pending", async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const orders = await radiologyWorkflowService.getPendingRadiologyOrders(hospitalId);
    res.json(orders);
  } catch (error: any) {
    console.error("Error fetching pending radiology orders:", error);
    res.status(500).json({ message: error.message || "Failed to fetch pending orders" });
  }
});

/**
 * Schedule radiology order
 * POST /api/radiology-workflow/orders/:orderId/schedule
 */
router.post("/orders/:orderId/schedule", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const orderId = parseInt(req.params.orderId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ message: "Missing scheduled date/time" });
    }

    await radiologyWorkflowService.scheduleRadiologyOrder({
      orderId,
      scheduledAt: new Date(scheduledAt),
      performedByUserId: userId,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error scheduling radiology order:", error);
    res.status(500).json({ message: error.message || "Failed to schedule order" });
  }
});

/**
 * Mark order as in progress
 * POST /api/radiology-workflow/orders/:orderId/in-progress
 */
router.post("/orders/:orderId/in-progress", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const orderId = parseInt(req.params.orderId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    await radiologyWorkflowService.markOrderInProgress({
      orderId,
      performedByUserId: userId,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error marking order in progress:", error);
    res.status(500).json({ message: error.message || "Failed to update order" });
  }
});

/**
 * Create radiology report
 * POST /api/radiology-workflow/reports
 */
router.post("/reports", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { radiologyOrderId, findings, impression, notes } = req.body;

    if (!radiologyOrderId || !findings) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const report = await radiologyWorkflowService.createRadiologyReport({
      radiologyOrderId,
      reportedByUserId: userId,
      findings,
      impression,
      notes,
    });

    res.status(201).json(report);
  } catch (error: any) {
    console.error("Error creating radiology report:", error);
    res.status(500).json({ message: error.message || "Failed to create radiology report" });
  }
});

/**
 * Release radiology report
 * POST /api/radiology-workflow/reports/:reportId/release
 */
router.post("/reports/:reportId/release", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const reportId = parseInt(req.params.reportId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(reportId)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    await radiologyWorkflowService.releaseRadiologyReport({
      reportId,
      releasedByUserId: userId,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error releasing radiology report:", error);
    res.status(500).json({ message: error.message || "Failed to release report" });
  }
});

/**
 * Get scheduled orders
 * GET /api/radiology-workflow/orders/scheduled
 */
router.get("/orders/scheduled", async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const orders = await radiologyWorkflowService.getScheduledOrders(hospitalId);
    res.json(orders);
  } catch (error: any) {
    console.error("Error fetching scheduled orders:", error);
    res.status(500).json({ message: error.message || "Failed to fetch scheduled orders" });
  }
});

export default router;
