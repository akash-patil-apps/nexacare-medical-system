// server/routes/ipd-workflow.routes.ts
import { Router } from "express";
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth";
import * as ipdOrdersService from "../services/ipd-orders.service";
import * as ipdOrdersExtendedService from "../services/ipd-orders-extended.service";
import * as ipdRoundsService from "../services/ipd-rounds.service";
import * as ipdEmarService from "../services/ipd-emar.service";
import { db } from "../db";
import { doctors, nurses } from "../../shared/schema";
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

  // Check if user is a nurse
  const [nurse] = await db
    .select()
    .from(nurses)
    .where(eq(nurses.userId, userId))
    .limit(1);

  if (nurse) {
    return nurse.hospitalId || 0;
  }

  throw new Error("User is not associated with a hospital");
};

/**
 * Get all orders for an encounter
 * GET /api/ipd-workflow/encounters/:encounterId/orders
 */
router.get("/encounters/:encounterId/orders", async (req: AuthenticatedRequest, res) => {
  try {
    const encounterId = parseInt(req.params.encounterId);

    if (isNaN(encounterId)) {
      return res.status(400).json({ message: "Invalid encounter ID" });
    }

    const orders = await ipdOrdersService.getEncounterOrders(encounterId);
    const extendedOrders = await ipdOrdersExtendedService.getEncounterOrdersExtended(encounterId);
    res.json({
      ...orders,
      ...extendedOrders,
    });
  } catch (error: any) {
    console.error("Error fetching encounter orders:", error);
    res.status(500).json({ message: error.message || "Failed to fetch orders" });
  }
});

/**
 * Get active IPD patients with orders summary
 * GET /api/ipd-workflow/patients/active
 */
router.get("/patients/active", async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const patients = await ipdOrdersService.getActiveIpdPatientsWithOrders(hospitalId);
    res.json(patients);
  } catch (error: any) {
    console.error("Error fetching active IPD patients:", error);
    res.status(500).json({ message: error.message || "Failed to fetch patients" });
  }
});

/**
 * Create a round note
 * POST /api/ipd-workflow/rounds
 */
router.post("/rounds", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const hospitalId = await getHospitalId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      encounterId,
      patientId,
      noteType,
      subjective,
      objective,
      assessment,
      plan,
      chiefComplaint,
      physicalExamination,
      isDraft,
    } = req.body;

    if (!encounterId || !patientId || !noteType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const note = await ipdRoundsService.createRoundNote({
      encounterId,
      patientId,
      hospitalId,
      createdByUserId: userId,
      noteType,
      subjective,
      objective,
      assessment,
      plan,
      chiefComplaint,
      physicalExamination,
      isDraft,
    });

    res.status(201).json(note);
  } catch (error: any) {
    console.error("Error creating round note:", error);
    res.status(500).json({ message: error.message || "Failed to create round note" });
  }
});

/**
 * Get rounds for an encounter
 * GET /api/ipd-workflow/encounters/:encounterId/rounds
 */
router.get("/encounters/:encounterId/rounds", async (req: AuthenticatedRequest, res) => {
  try {
    const encounterId = parseInt(req.params.encounterId);

    if (isNaN(encounterId)) {
      return res.status(400).json({ message: "Invalid encounter ID" });
    }

    const rounds = await ipdRoundsService.getEncounterRounds(encounterId);
    res.json(rounds);
  } catch (error: any) {
    console.error("Error fetching rounds:", error);
    res.status(500).json({ message: error.message || "Failed to fetch rounds" });
  }
});

/**
 * Get recent vitals for encounter
 * GET /api/ipd-workflow/encounters/:encounterId/vitals/recent
 */
router.get("/encounters/:encounterId/vitals/recent", async (req: AuthenticatedRequest, res) => {
  try {
    const encounterId = parseInt(req.params.encounterId);
    const hours = parseInt(req.query.hours as string) || 24;

    if (isNaN(encounterId)) {
      return res.status(400).json({ message: "Invalid encounter ID" });
    }

    const vitals = await ipdRoundsService.getRecentVitals(encounterId, hours);
    res.json(vitals);
  } catch (error: any) {
    console.error("Error fetching recent vitals:", error);
    res.status(500).json({ message: error.message || "Failed to fetch vitals" });
  }
});

/**
 * Sign a clinical note
 * POST /api/ipd-workflow/notes/:noteId/sign
 */
router.post("/notes/:noteId/sign", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const noteId = parseInt(req.params.noteId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(noteId)) {
      return res.status(400).json({ message: "Invalid note ID" });
    }

    await ipdRoundsService.signClinicalNote({
      noteId,
      signedByUserId: userId,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error signing note:", error);
    res.status(500).json({ message: error.message || "Failed to sign note" });
  }
});

/**
 * Get medications due for administration
 * GET /api/ipd-workflow/emar/medications-due
 */
router.get("/emar/medications-due", async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const userId = req.user?.id;

    const { encounterId, nurseId, date } = req.query;

    // Get nurse ID if user is a nurse
    let actualNurseId = nurseId ? parseInt(nurseId as string) : undefined;
    if (!actualNurseId && userId) {
      const [nurse] = await db
        .select()
        .from(nurses)
        .where(eq(nurses.userId, userId))
        .limit(1);
      if (nurse) {
        actualNurseId = nurse.id;
      }
    }

    const medications = await ipdEmarService.getMedicationsDue({
      encounterId: encounterId ? parseInt(encounterId as string) : undefined,
      nurseId: actualNurseId,
      hospitalId,
      date: date ? new Date(date as string) : undefined,
    });

    res.json(medications);
  } catch (error: any) {
    console.error("Error fetching medications due:", error);
    res.status(500).json({ message: error.message || "Failed to fetch medications due" });
  }
});

/**
 * Record medication administration
 * POST /api/ipd-workflow/emar/administrations
 */
router.post("/emar/administrations", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      medicationOrderId,
      encounterId,
      patientId,
      administeredAt,
      doseGiven,
      route,
      notes,
      reasonForOmission,
    } = req.body;

    if (!medicationOrderId || !encounterId || !patientId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const admin = await ipdEmarService.recordMedicationAdministration({
      medicationOrderId,
      encounterId,
      patientId,
      administeredByUserId: userId,
      administeredAt: administeredAt ? new Date(administeredAt) : new Date(),
      doseGiven,
      route,
      notes,
      reasonForOmission,
    });

    res.status(201).json(admin);
  } catch (error: any) {
    console.error("Error recording medication administration:", error);
    res.status(500).json({ message: error.message || "Failed to record administration" });
  }
});

/**
 * Get medication administration history
 * GET /api/ipd-workflow/emar/history
 */
router.get("/emar/history", async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterId, medicationOrderId, patientId, startDate, endDate } = req.query;

    const history = await ipdEmarService.getMedicationHistory({
      encounterId: encounterId ? parseInt(encounterId as string) : undefined,
      medicationOrderId: medicationOrderId ? parseInt(medicationOrderId as string) : undefined,
      patientId: patientId ? parseInt(patientId as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json(history);
  } catch (error: any) {
    console.error("Error fetching medication history:", error);
    res.status(500).json({ message: error.message || "Failed to fetch history" });
  }
});

/**
 * Create IV fluid order
 * POST /api/ipd-workflow/orders/iv-fluid
 */
router.post("/orders/iv-fluid", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get doctor ID from user
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (!doctor) {
      return res.status(403).json({ message: "User is not a doctor" });
    }

    const order = await ipdOrdersExtendedService.createIvFluidOrder({
      encounterId: req.body.encounterId,
      patientId: req.body.patientId,
      orderedByDoctorId: doctor.id,
      fluidName: req.body.fluidName,
      volume: req.body.volume,
      rate: req.body.rate,
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      notes: req.body.notes,
    });

    res.status(201).json(order);
  } catch (error: any) {
    console.error("Error creating IV fluid order:", error);
    res.status(500).json({ message: error.message || "Failed to create IV fluid order" });
  }
});

/**
 * Create diet order
 * POST /api/ipd-workflow/orders/diet
 */
router.post("/orders/diet", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get doctor ID from user
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (!doctor) {
      return res.status(403).json({ message: "User is not a doctor" });
    }

    const order = await ipdOrdersExtendedService.createDietOrder({
      encounterId: req.body.encounterId,
      patientId: req.body.patientId,
      orderedByDoctorId: doctor.id,
      dietType: req.body.dietType,
      specialInstructions: req.body.specialInstructions,
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      notes: req.body.notes,
    });

    res.status(201).json(order);
  } catch (error: any) {
    console.error("Error creating diet order:", error);
    res.status(500).json({ message: error.message || "Failed to create diet order" });
  }
});

/**
 * Create nursing order
 * POST /api/ipd-workflow/orders/nursing
 */
router.post("/orders/nursing", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get doctor ID from user
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (!doctor) {
      return res.status(403).json({ message: "User is not a doctor" });
    }

    const order = await ipdOrdersExtendedService.createNursingOrder({
      encounterId: req.body.encounterId,
      patientId: req.body.patientId,
      orderedByDoctorId: doctor.id,
      orderType: req.body.orderType,
      orderDescription: req.body.orderDescription,
      frequency: req.body.frequency,
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      notes: req.body.notes,
    });

    res.status(201).json(order);
  } catch (error: any) {
    console.error("Error creating nursing order:", error);
    res.status(500).json({ message: error.message || "Failed to create nursing order" });
  }
});

/**
 * Stop an order (IV fluid, diet, or nursing)
 * POST /api/ipd-workflow/orders/:orderType/:orderId/stop
 */
router.post("/orders/:orderType/:orderId/stop", async (req: AuthenticatedRequest, res) => {
  try {
    const orderType = req.params.orderType as "iv_fluid" | "diet" | "nursing";
    const orderId = parseInt(req.params.orderId);

    if (!["iv_fluid", "diet", "nursing"].includes(orderType)) {
      return res.status(400).json({ message: "Invalid order type" });
    }

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const result = await ipdOrdersExtendedService.stopOrder({
      orderType,
      orderId,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error stopping order:", error);
    res.status(500).json({ message: error.message || "Failed to stop order" });
  }
});

export default router;
