// server/services/radiology-workflow.service.ts
import { db } from "../db";
import {
  radiologyOrders,
  radiologyOrderItems,
  radiologyReports,
  radiologyTestCatalog,
  patients,
  doctors,
  users,
  radiologyTechnicians,
} from "../../shared/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

/**
 * Create radiology order
 */
export const createRadiologyOrder = async (data: {
  hospitalId: number;
  patientId: number;
  doctorId: number;
  appointmentId?: number;
  encounterId?: number;
  priority?: string;
  clinicalIndication?: string;
  testIds: number[]; // Array of radiologyTestCatalog IDs
  orderedByUserId: number;
}) => {
  try {
    // Generate order number
    const orderNumber = `RAD-${data.hospitalId}-${Date.now()}`;

    // Create radiology order
    const [order] = await db
      .insert(radiologyOrders)
      .values({
        hospitalId: data.hospitalId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        appointmentId: data.appointmentId,
        encounterId: data.encounterId,
        orderNumber,
        priority: data.priority || "routine",
        status: "ordered",
        clinicalIndication: data.clinicalIndication,
        orderedByUserId: data.orderedByUserId,
        createdAt: new Date(),
      })
      .returning();

    // Get test details from catalog
    const tests = await db
      .select()
      .from(radiologyTestCatalog)
      .where(inArray(radiologyTestCatalog.id, data.testIds));

    // Create order items
    const items = await Promise.all(
      tests.map((test) =>
        db
          .insert(radiologyOrderItems)
          .values({
            radiologyOrderId: order.id,
            radiologyTestCatalogId: test.id,
            testName: test.name,
            status: "ordered",
            createdAt: new Date(),
          })
          .returning()
      )
    );

    return { ...order, items };
  } catch (error) {
    console.error("Error creating radiology order:", error);
    throw error;
  }
};

/**
 * Get radiology orders
 */
export const getRadiologyOrders = async (
  hospitalId: number,
  filters?: {
    status?: string;
    patientId?: number;
    doctorId?: number;
    startDate?: Date;
    endDate?: Date;
  }
) => {
  try {
    let query = db
      .select({
        order: radiologyOrders,
        patient: patients,
        doctor: doctors,
        doctorUser: users,
      })
      .from(radiologyOrders)
      .leftJoin(patients, eq(radiologyOrders.patientId, patients.id))
      .leftJoin(doctors, eq(radiologyOrders.doctorId, doctors.id))
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(radiologyOrders.hospitalId, hospitalId));

    if (filters?.status) {
      query = query.where(eq(radiologyOrders.status, filters.status));
    }

    if (filters?.patientId) {
      query = query.where(eq(radiologyOrders.patientId, filters.patientId));
    }

    if (filters?.doctorId) {
      query = query.where(eq(radiologyOrders.doctorId, filters.doctorId));
    }

    const results = await query.orderBy(desc(radiologyOrders.createdAt));

    // Get items for each order
    const withItems = await Promise.all(
      results.map(async (result) => {
        const items = await db
          .select({
            item: radiologyOrderItems,
            test: radiologyTestCatalog,
          })
          .from(radiologyOrderItems)
          .leftJoin(radiologyTestCatalog, eq(radiologyOrderItems.radiologyTestCatalogId, radiologyTestCatalog.id))
          .where(eq(radiologyOrderItems.radiologyOrderId, result.order.id));

        return {
          ...result.order,
          patient: result.patient
            ? {
                id: result.patient.id,
                fullName: result.patient.fullName,
              }
            : null,
          doctor: result.doctorUser
            ? {
                id: result.doctor.id,
                fullName: result.doctorUser.fullName,
              }
            : null,
          items: items.map((i) => ({
            ...i.item,
            test: i.test,
          })),
        };
      })
    );

    return withItems;
  } catch (error) {
    console.error("Error fetching radiology orders:", error);
    throw error;
  }
};

/**
 * Schedule radiology order
 */
export const scheduleRadiologyOrder = async (data: {
  orderId: number;
  scheduledAt: Date;
  performedByUserId: number;
}) => {
  try {
    await db
      .update(radiologyOrders)
      .set({
        scheduledAt: data.scheduledAt,
        performedByUserId: data.performedByUserId,
        status: "scheduled",
        updatedAt: new Date(),
      })
      .where(eq(radiologyOrders.id, data.orderId));

    // Update order items status
    await db
      .update(radiologyOrderItems)
      .set({
        status: "scheduled",
      })
      .where(eq(radiologyOrderItems.radiologyOrderId, data.orderId));

    return { success: true };
  } catch (error) {
    console.error("Error scheduling radiology order:", error);
    throw error;
  }
};

/**
 * Mark order as in progress
 */
export const markOrderInProgress = async (data: {
  orderId: number;
  performedByUserId: number;
}) => {
  try {
    await db
      .update(radiologyOrders)
      .set({
        performedByUserId: data.performedByUserId,
        performedAt: new Date(),
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(radiologyOrders.id, data.orderId));

    // Update order items status
    await db
      .update(radiologyOrderItems)
      .set({
        status: "in_progress",
      })
      .where(eq(radiologyOrderItems.radiologyOrderId, data.orderId));

    return { success: true };
  } catch (error) {
    console.error("Error marking order in progress:", error);
    throw error;
  }
};

/**
 * Create radiology report
 */
export const createRadiologyReport = async (data: {
  radiologyOrderId: number;
  reportedByUserId: number;
  findings: string;
  impression?: string;
  notes?: string;
}) => {
  try {
    // Get order details
    const [order] = await db
      .select()
      .from(radiologyOrders)
      .where(eq(radiologyOrders.id, data.radiologyOrderId))
      .limit(1);

    if (!order) {
      throw new Error("Radiology order not found");
    }

    // Get order items
    const orderItems = await db
      .select()
      .from(radiologyOrderItems)
      .where(eq(radiologyOrderItems.radiologyOrderId, data.radiologyOrderId));

    // Get radiology technician
    const [tech] = await db
      .select()
      .from(radiologyTechnicians)
      .where(eq(radiologyTechnicians.userId, data.reportedByUserId))
      .limit(1);

    // Create report
    const [report] = await db
      .insert(radiologyReports)
      .values({
        radiologyOrderId: data.radiologyOrderId,
        patientId: order.patientId,
        doctorId: order.doctorId,
        radiologyTechnicianId: tech?.id,
        testName: orderItems.map((i) => i.testName).join(", "),
        testType: orderItems[0]?.testName || "Radiology",
        findings: data.findings,
        impression: data.impression,
        reportDate: new Date(),
        reportUrl: `mock://radiology-report-${data.radiologyOrderId}.pdf`, // Mock URL
        imageUrls: JSON.stringify([`mock://image-1-${data.radiologyOrderId}.jpg`, `mock://image-2-${data.radiologyOrderId}.jpg`]), // Mock image URLs
        status: "completed",
        reportedByUserId: data.reportedByUserId,
        reportedAt: new Date(),
        notes: data.notes,
        createdAt: new Date(),
      })
      .returning();

    // Update order and items status
    await db
      .update(radiologyOrders)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(radiologyOrders.id, data.radiologyOrderId));

    await db
      .update(radiologyOrderItems)
      .set({
        status: "completed",
      })
      .where(eq(radiologyOrderItems.radiologyOrderId, data.radiologyOrderId));

    return report;
  } catch (error) {
    console.error("Error creating radiology report:", error);
    throw error;
  }
};

/**
 * Release radiology report
 */
export const releaseRadiologyReport = async (data: {
  reportId: number;
  releasedByUserId: number;
}) => {
  try {
    await db
      .update(radiologyReports)
      .set({
        status: "released",
        releasedByUserId: data.releasedByUserId,
        releasedAt: new Date(),
      })
      .where(eq(radiologyReports.id, data.reportId));

    return { success: true };
  } catch (error) {
    console.error("Error releasing radiology report:", error);
    throw error;
  }
};

/**
 * Get pending orders (for radiology dashboard)
 */
export const getPendingRadiologyOrders = async (hospitalId: number) => {
  try {
    return await getRadiologyOrders(hospitalId, {
      status: "ordered",
    });
  } catch (error) {
    console.error("Error fetching pending radiology orders:", error);
    throw error;
  }
};

/**
 * Get scheduled orders
 */
export const getScheduledOrders = async (hospitalId: number) => {
  try {
    return await getRadiologyOrders(hospitalId, {
      status: "scheduled",
    });
  } catch (error) {
    console.error("Error fetching scheduled orders:", error);
    throw error;
  }
};
