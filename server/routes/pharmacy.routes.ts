// server/routes/pharmacy.routes.ts
import express from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import type { AuthenticatedRequest } from "../middleware/auth";
import * as inventoryService from "../services/pharmacy-inventory.service";
import * as purchaseService from "../services/pharmacy-purchase.service";
import * as dispensingService from "../services/pharmacy-dispensing.service";

const router = express.Router();

// Helper to get hospital ID
const getHospitalId = async (req: AuthenticatedRequest): Promise<number> => {
  const user = req.user;
  if (!user) throw new Error("User not authenticated");

  switch (user.role) {
    case "HOSPITAL":
    case "ADMIN":
      const { hospitals } = await import("../../shared/schema");
      const { db } = await import("../db");
      const { eq } = await import("drizzle-orm");
      const [hospital] = await db
        .select()
        .from(hospitals)
        .where(eq(hospitals.userId, user.id))
        .limit(1);
      if (!hospital) throw new Error("Hospital not found");
      return hospital.id;

    case "PHARMACIST":
      const { pharmacists } = await import("../../shared/schema");
      const { db: db2 } = await import("../db");
      const { eq: eq2 } = await import("drizzle-orm");
      const [pharmacist] = await db2
        .select()
        .from(pharmacists)
        .where(eq2(pharmacists.userId, user.id))
        .limit(1);
      if (!pharmacist) throw new Error("Pharmacist profile not found");
      return pharmacist.hospitalId;

    default:
      throw new Error("Unauthorized role");
  }
};

// ============================================
// INVENTORY ROUTES
// ============================================

// Get inventory
router.get(
  "/inventory",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      const filters: any = {};

      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.lowStock === "true") filters.lowStock = true;
      if (req.query.expired === "true") filters.expired = true;
      if (req.query.medicineCatalogId)
        filters.medicineCatalogId = parseInt(req.query.medicineCatalogId as string);

      const inventory = await inventoryService.getInventory(hospitalId, filters);
      res.json(inventory);
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
      res.status(400).json({ message: error.message || "Failed to fetch inventory" });
    }
  }
);

// Get inventory by ID
router.get(
  "/inventory/:id",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      const inventory = await inventoryService.getInventoryById(
        parseInt(req.params.id),
        hospitalId
      );
      res.json(inventory);
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
      res.status(400).json({ message: error.message || "Failed to fetch inventory" });
    }
  }
);

// Add stock
router.post(
  "/inventory/add-stock",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const result = await inventoryService.addStock({
        hospitalId,
        medicineCatalogId: req.body.medicineCatalogId,
        batchNumber: req.body.batchNumber,
        expiryDate: new Date(req.body.expiryDate),
        quantity: req.body.quantity,
        unit: req.body.unit,
        purchasePrice: req.body.purchasePrice,
        sellingPrice: req.body.sellingPrice,
        mrp: req.body.mrp,
        location: req.body.location,
        reorderLevel: req.body.reorderLevel,
        minStockLevel: req.body.minStockLevel,
        maxStockLevel: req.body.maxStockLevel,
        referenceType: req.body.referenceType,
        referenceId: req.body.referenceId,
        reason: req.body.reason,
        performedByUserId: req.user.id,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error adding stock:", error);
      res.status(400).json({ message: error.message || "Failed to add stock" });
    }
  }
);

// Reduce stock
router.post(
  "/inventory/:id/reduce-stock",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const result = await inventoryService.reduceStock({
        inventoryId: parseInt(req.params.id),
        hospitalId,
        quantity: req.body.quantity,
        movementType: req.body.movementType,
        referenceType: req.body.referenceType,
        referenceId: req.body.referenceId,
        reason: req.body.reason,
        performedByUserId: req.user.id,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error reducing stock:", error);
      res.status(400).json({ message: error.message || "Failed to reduce stock" });
    }
  }
);

// Get stock movements
router.get(
  "/inventory/movements",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      const filters: any = {};

      if (req.query.inventoryId)
        filters.inventoryId = parseInt(req.query.inventoryId as string);
      if (req.query.movementType) filters.movementType = req.query.movementType as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

      const movements = await inventoryService.getStockMovements(hospitalId, filters);
      res.json(movements);
    } catch (error: any) {
      console.error("Error fetching stock movements:", error);
      res.status(400).json({ message: error.message || "Failed to fetch stock movements" });
    }
  }
);

// Get low stock alerts
router.get(
  "/inventory/alerts/low-stock",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      const alerts = await inventoryService.getLowStockAlerts(hospitalId);
      res.json(alerts);
    } catch (error: any) {
      console.error("Error fetching low stock alerts:", error);
      res.status(400).json({ message: error.message || "Failed to fetch alerts" });
    }
  }
);

// Get expiry alerts
router.get(
  "/inventory/alerts/expiry",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      const alerts = await inventoryService.getExpiryAlerts(hospitalId);
      res.json(alerts);
    } catch (error: any) {
      console.error("Error fetching expiry alerts:", error);
      res.status(400).json({ message: error.message || "Failed to fetch alerts" });
    }
  }
);

// ============================================
// SUPPLIERS ROUTES
// ============================================

// Get suppliers
router.get(
  "/suppliers",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      const suppliers = await purchaseService.getSuppliers(hospitalId);
      res.json(suppliers);
    } catch (error: any) {
      console.error("Error fetching suppliers:", error);
      res.status(400).json({ message: error.message || "Failed to fetch suppliers" });
    }
  }
);

// Create supplier
router.post(
  "/suppliers",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      const supplier = await purchaseService.createSupplier({
        hospitalId,
        ...req.body,
      });
      res.json(supplier);
    } catch (error: any) {
      console.error("Error creating supplier:", error);
      res.status(400).json({ message: error.message || "Failed to create supplier" });
    }
  }
);

// ============================================
// PURCHASE ORDERS ROUTES
// ============================================

// Get purchase orders
router.get(
  "/purchase-orders",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.supplierId)
        filters.supplierId = parseInt(req.query.supplierId as string);

      const pos = await purchaseService.getPurchaseOrders(hospitalId, filters);
      res.json(pos);
    } catch (error: any) {
      console.error("Error fetching purchase orders:", error);
      res.status(400).json({ message: error.message || "Failed to fetch purchase orders" });
    }
  }
);

// Create purchase order
router.post(
  "/purchase-orders",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Generate PO number
      const poNumber = `PO-${hospitalId}-${Date.now()}`;

      const po = await purchaseService.createPurchaseOrder({
        hospitalId,
        supplierId: req.body.supplierId,
        poNumber,
        orderDate: req.body.orderDate ? new Date(req.body.orderDate) : undefined,
        expectedDeliveryDate: req.body.expectedDeliveryDate
          ? new Date(req.body.expectedDeliveryDate)
          : undefined,
        items: req.body.items,
        notes: req.body.notes,
        createdByUserId: req.user.id,
      });

      res.json(po);
    } catch (error: any) {
      console.error("Error creating purchase order:", error);
      res.status(400).json({ message: error.message || "Failed to create purchase order" });
    }
  }
);

// Receive purchase order
router.post(
  "/purchase-orders/:id/receive",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const result = await purchaseService.receivePurchaseOrder({
        purchaseOrderId: parseInt(req.params.id),
        hospitalId,
        receivedByUserId: req.user.id,
        items: req.body.items,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error receiving purchase order:", error);
      res.status(400).json({ message: error.message || "Failed to receive purchase order" });
    }
  }
);

// ============================================
// DISPENSING ROUTES
// ============================================

// Get pending prescriptions
router.get(
  "/dispensing/pending",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      const prescriptions = await dispensingService.getPendingPrescriptions(hospitalId);
      res.json(prescriptions);
    } catch (error: any) {
      console.error("Error fetching pending prescriptions:", error);
      res.status(400).json({ message: error.message || "Failed to fetch pending prescriptions" });
    }
  }
);

// Create dispensation
router.post(
  "/dispensing",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const dispensation = await dispensingService.createDispensation({
        hospitalId,
        prescriptionId: req.body.prescriptionId || null, // Optional for non-consulting patients
        patientId: req.body.patientId,
        encounterId: req.body.encounterId,
        appointmentId: req.body.appointmentId,
        items: req.body.items.map((item: any) => ({
          prescriptionItemId: item.prescriptionItemId || null,
          inventoryId: item.inventoryId,
          quantity: item.quantity,
          medicineName: item.medicineName || null,
        })),
        dispensedByUserId: req.user.id,
      });

      res.json(dispensation);
    } catch (error: any) {
      console.error("Error creating dispensation:", error);
      res.status(400).json({ message: error.message || "Failed to create dispensation" });
    }
  }
);

// Create dispensation for non-consulting patient (without prescription)
router.post(
  "/dispensing/non-consulting",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { patientName, mobileNumber, items } = req.body;

      if (!patientName || !mobileNumber) {
        return res.status(400).json({ message: "Patient name and mobile number are required" });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one medicine item is required" });
      }

      // Create or find patient record for non-consulting patient
      const { db } = await import("../db");
      const { users, patients, dispensations } = await import("../../shared/schema");
      const { eq, ilike } = await import("drizzle-orm");
      const { hashPassword } = await import("../services/auth.service");

      // Check if user exists with this mobile number
      const trimmedMobile = mobileNumber.trim().replace(/\D/g, '');
      let [existingUser] = await db
        .select()
        .from(users)
        .where(ilike(users.mobileNumber, `%${trimmedMobile}%`))
        .limit(1);

      // If user doesn't exist, create a minimal user and patient record
      if (!existingUser) {
        const generatedEmail = `${trimmedMobile}@nonconsulting.nexacare.local`;
        const passwordToHash = `NonConsulting@${trimmedMobile.slice(-4)}`;
        const hashedPassword = await hashPassword(passwordToHash);

        [existingUser] = await db
          .insert(users)
          .values({
            fullName: patientName,
            mobileNumber: trimmedMobile,
            email: generatedEmail,
            password: hashedPassword,
            role: 'patient',
            isVerified: true,
          })
          .returning();
      }

      // Check if patient profile exists
      let [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.userId, existingUser.id))
        .limit(1);

      if (!patient) {
        [patient] = await db
          .insert(patients)
          .values({
            userId: existingUser.id,
            emergencyContact: trimmedMobile,
            emergencyContactName: patientName,
            emergencyRelation: 'Self',
            createdAt: new Date(),
          })
          .returning();
      }

      // Create dispensation without prescriptionId
      const dispensation = await dispensingService.createDispensation({
        hospitalId,
        prescriptionId: null, // No prescription for non-consulting patients
        patientId: patient.id,
        items: items.map((item: any) => ({
          prescriptionItemId: null,
          inventoryId: item.inventoryId,
          quantity: item.quantity,
          medicineName: item.medicineName || null,
        })),
        dispensedByUserId: req.user.id,
      });

      // Add note about non-consulting patient
      await db
        .update(dispensations)
        .set({
          notes: `Non-consulting patient: ${patientName} (${mobileNumber})`,
        })
        .where(eq(dispensations.id, dispensation.id));

      res.json(dispensation);
    } catch (error: any) {
      console.error("Error creating non-consulting dispensation:", error);
      res.status(400).json({ message: error.message || "Failed to create dispensation" });
    }
  }
);

// Get dispensations
router.get(
  "/dispensing",
  authenticateToken,
  authorizeRoles("PHARMACIST", "HOSPITAL", "ADMIN"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalId(req);
      const filters: any = {};
      if (req.query.patientId) filters.patientId = parseInt(req.query.patientId as string);
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

      const dispensations = await dispensingService.getDispensations(hospitalId, filters);
      res.json(dispensations);
    } catch (error: any) {
      console.error("Error fetching dispensations:", error);
      res.status(400).json({ message: error.message || "Failed to fetch dispensations" });
    }
  }
);

export default router;
