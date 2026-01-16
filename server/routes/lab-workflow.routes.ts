// server/routes/lab-workflow.routes.ts
import { Router } from "express";
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth";
import * as labWorkflowService from "../services/lab-workflow.service";
import { db } from "../db";
import { doctors, nurses, labs } from "../../shared/schema";
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

  // Check if user is a lab technician
  const [lab] = await db
    .select()
    .from(labs)
    .where(eq(labs.userId, userId))
    .limit(1);

  if (lab) {
    return lab.hospitalId || 0; // Labs might not have hospitalId
  }

  throw new Error("User is not associated with a hospital");
};

/**
 * Create lab order
 * POST /api/lab-workflow/orders
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
      clinicalNotes,
      testIds,
    } = req.body;

    if (!patientId || !doctorId || !testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const order = await labWorkflowService.createLabOrder({
      hospitalId,
      patientId,
      doctorId,
      appointmentId,
      encounterId,
      priority,
      clinicalNotes,
      testIds,
      orderedByUserId: userId,
    });

    res.status(201).json(order);
  } catch (error: any) {
    console.error("Error creating lab order:", error);
    res.status(500).json({ message: error.message || "Failed to create lab order" });
  }
});

/**
 * Get lab orders
 * GET /api/lab-workflow/orders
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

    const orders = await labWorkflowService.getLabOrders(hospitalId, filters);

    res.json(orders);
  } catch (error: any) {
    console.error("Error fetching lab orders:", error);
    res.status(500).json({ message: error.message || "Failed to fetch lab orders" });
  }
});

/**
 * Get pending orders (for lab dashboard)
 * GET /api/lab-workflow/orders/pending
 */
router.get("/orders/pending", async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const orders = await labWorkflowService.getPendingLabOrders(hospitalId);
    res.json(orders);
  } catch (error: any) {
    console.error("Error fetching pending lab orders:", error);
    res.status(500).json({ message: error.message || "Failed to fetch pending orders" });
  }
});

/**
 * Collect sample
 * POST /api/lab-workflow/samples/collect
 */
router.post("/samples/collect", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { labOrderItemId, labOrderId, sampleType, notes } = req.body;

    if (!labOrderItemId || !labOrderId || !sampleType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const sample = await labWorkflowService.collectSample({
      labOrderItemId,
      labOrderId,
      sampleType,
      collectedByUserId: userId,
      notes,
    });

    res.status(201).json(sample);
  } catch (error: any) {
    console.error("Error collecting sample:", error);
    res.status(500).json({ message: error.message || "Failed to collect sample" });
  }
});

/**
 * Enter test result
 * POST /api/lab-workflow/results
 */
router.post("/results", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      labOrderItemId,
      labSampleId,
      testName,
      parameterName,
      resultValue,
      unit,
      normalRange,
      isAbnormal,
      notes,
    } = req.body;

    if (!labOrderItemId || !testName || !resultValue) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await labWorkflowService.enterTestResult({
      labOrderItemId,
      labSampleId,
      testName,
      parameterName,
      resultValue,
      unit,
      normalRange,
      isAbnormal,
      enteredByUserId: userId,
      notes,
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error entering test result:", error);
    res.status(500).json({ message: error.message || "Failed to enter test result" });
  }
});

/**
 * Validate test result
 * POST /api/lab-workflow/results/:resultId/validate
 */
router.post("/results/:resultId/validate", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const resultId = parseInt(req.params.resultId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(resultId)) {
      return res.status(400).json({ message: "Invalid result ID" });
    }

    await labWorkflowService.validateTestResult({
      resultId,
      validatedByUserId: userId,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error validating test result:", error);
    res.status(500).json({ message: error.message || "Failed to validate test result" });
  }
});

/**
 * Release lab report
 * POST /api/lab-workflow/reports/release
 */
router.post("/reports/release", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { labOrderId } = req.body;

    if (!labOrderId) {
      return res.status(400).json({ message: "Missing lab order ID" });
    }

    await labWorkflowService.releaseLabReport({
      labOrderId,
      releasedByUserId: userId,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error releasing lab report:", error);
    res.status(500).json({ message: error.message || "Failed to release lab report" });
  }
});

/**
 * Get orders for sample collection
 * GET /api/lab-workflow/orders/for-collection
 */
router.get("/orders/for-collection", async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const orders = await labWorkflowService.getOrdersForSampleCollection(hospitalId);
    res.json(orders);
  } catch (error: any) {
    console.error("Error fetching orders for collection:", error);
    res.status(500).json({ message: error.message || "Failed to fetch orders" });
  }
});

/**
 * Get orders for result entry
 * GET /api/lab-workflow/orders/for-result-entry
 */
router.get("/orders/for-result-entry", async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const orders = await labWorkflowService.getOrdersForResultEntry(hospitalId);
    res.json(orders);
  } catch (error: any) {
    console.error("Error fetching orders for result entry:", error);
    res.status(500).json({ message: error.message || "Failed to fetch orders" });
  }
});

export default router;
