// server/services/pharmacy-dispensing.service.ts
import { db } from "../db";
import { dispensations, dispensationItems, prescriptions, patients, doctors, users } from "../../shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { reduceStock } from "./pharmacy-inventory.service";

/**
 * Get pending prescriptions for dispensing
 */
export const getPendingPrescriptions = async (hospitalId: number) => {
  try {
    // Get prescriptions that haven't been dispensed, with patient and doctor info
    const pending = await db
      .select({
        prescription: prescriptions,
        patient: patients,
        doctor: doctors,
        doctorUser: users,
      })
      .from(prescriptions)
      .leftJoin(patients, eq(prescriptions.patientId, patients.id))
      .leftJoin(doctors, eq(prescriptions.doctorId, doctors.id))
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(
        and(
          eq(prescriptions.hospitalId, hospitalId),
          sql`NOT EXISTS (
            SELECT 1 FROM ${dispensations} 
            WHERE ${dispensations.prescriptionId} = ${prescriptions.id}
            AND ${dispensations.status} IN ('dispensed', 'partial')
          )`
        )
      )
      .orderBy(desc(prescriptions.createdAt));

    // Parse medications from JSON for each prescription
    const withItems = pending.map((p) => {
      let medications: any[] = [];
      try {
        medications = JSON.parse(p.prescription.medications || '[]');
      } catch (e) {
        console.error('Error parsing medications:', e);
      }

      return {
        ...p.prescription,
        patient: p.patient ? {
          id: p.patient.id,
          fullName: p.patient.fullName,
        } : null,
        doctor: p.doctorUser ? {
          id: p.doctor.id,
          fullName: p.doctorUser.fullName,
        } : null,
        items: medications, // Use parsed medications as items
      };
    });

    return withItems;
  } catch (error) {
    console.error("Error fetching pending prescriptions:", error);
    throw error;
  }
};

/**
 * Create dispensation
 */
export const createDispensation = async (data: {
  hospitalId: number;
  prescriptionId: number;
  patientId: number;
  encounterId?: number;
  appointmentId?: number;
  items: Array<{
    prescriptionItemId: number;
    inventoryId: number;
    quantity: number;
  }>;
  dispensedByUserId: number;
}) => {
  try {
    // Create dispensation
    const [dispensation] = await db
      .insert(dispensations)
      .values({
        hospitalId: data.hospitalId,
        prescriptionId: data.prescriptionId,
        patientId: data.patientId,
        encounterId: data.encounterId,
        appointmentId: data.appointmentId,
        dispensationType: data.encounterId ? "ipd" : "opd",
        status: "pending",
        dispensedByUserId: data.dispensedByUserId,
        createdAt: new Date(),
      })
      .returning();

    let totalAmount = 0;

    // Get prescription to extract medicine names
    const [prescription] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, data.prescriptionId))
      .limit(1);

    if (!prescription) {
      throw new Error("Prescription not found");
    }

    // Parse medications JSON
    let prescriptionMedications: Array<{ medicineName: string; unit: string }> = [];
    try {
      prescriptionMedications = JSON.parse(prescription.medications || "[]");
    } catch (e) {
      console.error("Error parsing prescription medications:", e);
    }

    // Create dispensation items and reduce stock
    for (const item of data.items) {
      // Get inventory item
      const { getInventoryById } = await import("./pharmacy-inventory.service");
      const inventory = await getInventoryById(item.inventoryId, data.hospitalId);

      // Find matching prescription medication (if available)
      const prescriptionMed = prescriptionMedications.find(
        (m, idx) => idx === item.prescriptionItemId || m.medicineName === inventory.medicine?.name
      );

      // Calculate price
      const unitPrice = inventory.sellingPrice
        ? parseFloat(inventory.sellingPrice)
        : inventory.mrp
        ? parseFloat(inventory.mrp)
        : 0;
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      // Create dispensation item
      await db.insert(dispensationItems).values({
        dispensationId: dispensation.id,
        prescriptionItemId: item.prescriptionItemId || null,
        inventoryId: item.inventoryId,
        medicineName: prescriptionMed?.medicineName || inventory.medicine?.name || "Unknown",
        quantity: item.quantity,
        unit: prescriptionMed?.unit || inventory.unit,
        batchNumber: inventory.batchNumber,
        expiryDate: inventory.expiryDate,
        unitPrice: String(unitPrice),
        totalPrice: String(itemTotal),
        createdAt: new Date(),
      });

      // Reduce stock
      await reduceStock({
        inventoryId: item.inventoryId,
        hospitalId: data.hospitalId,
        quantity: item.quantity,
        movementType: "sale",
        referenceType: "dispensation",
        referenceId: dispensation.id,
        reason: "Medicine dispensed",
        performedByUserId: data.dispensedByUserId,
      });
    }

    // Update dispensation with total amount
    await db
      .update(dispensations)
      .set({
        totalAmount: String(totalAmount),
        status: "dispensed",
        dispensedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(dispensations.id, dispensation.id));

    return { ...dispensation, totalAmount };
  } catch (error) {
    console.error("Error creating dispensation:", error);
    throw error;
  }
};

/**
 * Get dispensations
 */
export const getDispensations = async (hospitalId: number, filters?: {
  patientId?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) => {
  try {
    let query = db
      .select()
      .from(dispensations)
      .where(eq(dispensations.hospitalId, hospitalId));

    if (filters?.patientId) {
      query = query.where(eq(dispensations.patientId, filters.patientId));
    }

    if (filters?.status) {
      query = query.where(eq(dispensations.status, filters.status));
    }

    const results = await query.orderBy(desc(dispensations.createdAt));

    // Get items for each dispensation
    const withItems = await Promise.all(
      results.map(async (disp) => {
        const items = await db
          .select()
          .from(dispensationItems)
          .where(eq(dispensationItems.dispensationId, disp.id));

        return {
          ...disp,
          items,
        };
      })
    );

    return withItems;
  } catch (error) {
    console.error("Error fetching dispensations:", error);
    throw error;
  }
};
