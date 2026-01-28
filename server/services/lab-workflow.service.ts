// server/services/lab-workflow.service.ts
import { db } from "../db";
import {
  labOrders,
  labOrderItems,
  labSamples,
  labResults,
  labReports,
  labTestCatalog,
  patients,
  doctors,
  users,
} from "../../shared/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { logAuditEvent } from "./audit.service";

/**
 * Create lab order
 */
export const createLabOrder = async (data: {
  hospitalId: number;
  patientId: number;
  doctorId: number;
  appointmentId?: number;
  encounterId?: number;
  priority?: string;
  clinicalNotes?: string;
  testIds: number[]; // Array of labTestCatalog IDs
  orderedByUserId: number;
}) => {
  try {
    // Generate order number
    const orderNumber = `LAB-${data.hospitalId}-${Date.now()}`;

    // Create lab order
    const [order] = await db
      .insert(labOrders)
      .values({
        hospitalId: data.hospitalId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        appointmentId: data.appointmentId,
        encounterId: data.encounterId,
        orderNumber,
        priority: data.priority || "routine",
        status: "ordered",
        clinicalNotes: data.clinicalNotes,
        orderedByUserId: data.orderedByUserId,
        createdAt: new Date(),
      })
      .returning();

    // Get test details from catalog
    const tests = await db
      .select()
      .from(labTestCatalog)
      .where(inArray(labTestCatalog.id, data.testIds));

    // Create order items
    const items = await Promise.all(
      tests.map((test) =>
        db
          .insert(labOrderItems)
          .values({
            labOrderId: order.id,
            labTestCatalogId: test.id,
            testName: test.name,
            status: "ordered",
            createdAt: new Date(),
          })
          .returning()
      )
    );

    return { ...order, items };
  } catch (error) {
    console.error("Error creating lab order:", error);
    throw error;
  }
};

/**
 * Get lab orders
 */
export const getLabOrders = async (
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
        order: labOrders,
        patient: patients,
        doctor: doctors,
        doctorUser: users,
      })
      .from(labOrders)
      .leftJoin(patients, eq(labOrders.patientId, patients.id))
      .leftJoin(doctors, eq(labOrders.doctorId, doctors.id))
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(labOrders.hospitalId, hospitalId));

    if (filters?.status) {
      query = query.where(eq(labOrders.status, filters.status));
    }

    if (filters?.patientId) {
      query = query.where(eq(labOrders.patientId, filters.patientId));
    }

    if (filters?.doctorId) {
      query = query.where(eq(labOrders.doctorId, filters.doctorId));
    }

    const results = await query.orderBy(desc(labOrders.createdAt));

    // Get items for each order
    const withItems = await Promise.all(
      results.map(async (result) => {
        const items = await db
          .select({
            item: labOrderItems,
            test: labTestCatalog,
          })
          .from(labOrderItems)
          .leftJoin(labTestCatalog, eq(labOrderItems.labTestCatalogId, labTestCatalog.id))
          .where(eq(labOrderItems.labOrderId, result.order.id));

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
    console.error("Error fetching lab orders:", error);
    throw error;
  }
};

/**
 * Collect sample
 */
export const collectSample = async (data: {
  labOrderItemId: number;
  labOrderId: number;
  sampleType: string;
  collectedByUserId: number;
  notes?: string;
}) => {
  try {
    // Generate sample number
    const sampleNumber = `SAMPLE-${data.labOrderId}-${Date.now()}`;

    // Create sample
    const [sample] = await db
      .insert(labSamples)
      .values({
        labOrderItemId: data.labOrderItemId,
        labOrderId: data.labOrderId,
        sampleNumber,
        sampleType: data.sampleType,
        collectionDate: new Date(),
        collectionTime: new Date(),
        collectedByUserId: data.collectedByUserId,
        status: "collected",
        notes: data.notes,
        createdAt: new Date(),
      })
      .returning();

    // Update order item status
    await db
      .update(labOrderItems)
      .set({
        status: "sample_collected",
        updatedAt: new Date(),
      })
      .where(eq(labOrderItems.id, data.labOrderItemId));

    // Update order status if all items collected
    const remainingItems = await db
      .select()
      .from(labOrderItems)
      .where(
        and(
          eq(labOrderItems.labOrderId, data.labOrderId),
          sql`${labOrderItems.status} != 'sample_collected'`
        )
      );

    if (remainingItems.length === 0) {
      await db
        .update(labOrders)
        .set({
          status: "sample_collected",
          updatedAt: new Date(),
        })
        .where(eq(labOrders.id, data.labOrderId));
    }

    return sample;
  } catch (error) {
    console.error("Error collecting sample:", error);
    throw error;
  }
};

/**
 * Enter test result
 */
export const enterTestResult = async (data: {
  labOrderItemId: number;
  labSampleId?: number;
  testName: string;
  parameterName?: string;
  resultValue: string;
  unit?: string;
  normalRange?: string;
  isAbnormal?: boolean;
  enteredByUserId: number;
  notes?: string;
}) => {
  try {
    const [result] = await db
      .insert(labResults)
      .values({
        labOrderItemId: data.labOrderItemId,
        labSampleId: data.labSampleId,
        testName: data.testName,
        parameterName: data.parameterName,
        resultValue: data.resultValue,
        unit: data.unit,
        normalRange: data.normalRange,
        isAbnormal: data.isAbnormal || false,
        enteredByUserId: data.enteredByUserId,
        status: "entered",
        notes: data.notes,
        createdAt: new Date(),
      })
      .returning();

    // Update order item status
    await db
      .update(labOrderItems)
      .set({
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(labOrderItems.id, data.labOrderItemId));

    return result;
  } catch (error) {
    console.error("Error entering test result:", error);
    throw error;
  }
};

/**
 * Validate test result
 */
export const validateTestResult = async (data: {
  resultId: number;
  validatedByUserId: number;
}) => {
  try {
    await db
      .update(labResults)
      .set({
        validatedByUserId: data.validatedByUserId,
        validatedAt: new Date(),
        status: "validated",
        updatedAt: new Date(),
      })
      .where(eq(labResults.id, data.resultId));

    return { success: true };
  } catch (error) {
    console.error("Error validating test result:", error);
    throw error;
  }
};

/**
 * Release lab report
 */
export const releaseLabReport = async (data: {
  labOrderId: number;
  releasedByUserId: number;
}) => {
  try {
    // Get order with items and results
    const [order] = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.id, data.labOrderId))
      .limit(1);

    if (!order) {
      throw new Error("Lab order not found");
    }

    // Get all results for this order
    const orderItems = await db
      .select()
      .from(labOrderItems)
      .where(eq(labOrderItems.labOrderId, data.labOrderId));

    const allResults: any[] = [];
    for (const item of orderItems) {
      const results = await db
        .select()
        .from(labResults)
        .where(eq(labResults.labOrderItemId, item.id));

      allResults.push(...results);
    }

    // Format results as JSON
    const resultsJson = JSON.stringify(
      allResults.map((r) => ({
        testName: r.testName,
        parameterName: r.parameterName,
        resultValue: r.resultValue,
        unit: r.unit,
        normalRange: r.normalRange,
        isAbnormal: r.isAbnormal,
      }))
    );

    // Get normal ranges
    const normalRanges = allResults
      .map((r) => `${r.parameterName || r.testName}: ${r.normalRange || "N/A"}`)
      .join("; ");

    // Create or update lab report
    const existingReport = await db
      .select()
      .from(labReports)
      .where(eq(labReports.labOrderId, data.labOrderId))
      .limit(1);

    let reportId: number | undefined;

    if (existingReport.length > 0) {
      // Update existing report
      await db
        .update(labReports)
        .set({
          results: resultsJson,
          normalRanges,
          status: "completed",
          releasedByUserId: data.releasedByUserId,
          releasedAt: new Date(),
        })
        .where(eq(labReports.id, existingReport[0].id));
      reportId = existingReport[0].id;
    } else {
      // Create new report
      const [inserted] = await db
        .insert(labReports)
        .values({
          labOrderId: data.labOrderId,
          patientId: order.patientId,
          doctorId: order.doctorId,
          labId: order.hospitalId, // Using hospitalId as labId for now
          testName: orderItems.map((i) => i.testName).join(", "),
          testType: "Laboratory",
          results: resultsJson,
          normalRanges,
          reportDate: new Date(),
          reportUrl: `mock://lab-report-${data.labOrderId}.pdf`, // Mock URL
          status: "completed",
          releasedByUserId: data.releasedByUserId,
          releasedAt: new Date(),
          createdAt: new Date(),
        })
        .returning();
      reportId = inserted.id;
    }

    // Update order and items status
    await db
      .update(labOrders)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(labOrders.id, data.labOrderId));

    await db
      .update(labOrderItems)
      .set({
        status: "completed",
      })
      .where(eq(labOrderItems.labOrderId, data.labOrderId));

    // Best-effort audit log for lab report release
    try {
      await logAuditEvent({
        hospitalId: (order as any).hospitalId || undefined,
        patientId: (order as any).patientId || undefined,
        actorUserId: data.releasedByUserId,
        actorRole: "LAB",
        action: "LAB_REPORT_RELEASED",
        entityType: "lab_report",
        entityId: reportId,
        before: {
          orderStatus: (order as any).status,
        },
        after: {
          orderStatus: "completed",
        },
        summary: `Lab report for order #${data.labOrderId} released`,
      });
    } catch (auditError) {
      console.error("⚠️ Failed to log lab report release audit event:", auditError);
    }

    return { success: true };
  } catch (error) {
    console.error("Error releasing lab report:", error);
    throw error;
  }
};

/**
 * Get pending orders (for lab dashboard)
 */
export const getPendingLabOrders = async (hospitalId: number) => {
  try {
    return await getLabOrders(hospitalId, {
      status: "ordered",
    });
  } catch (error) {
    console.error("Error fetching pending lab orders:", error);
    throw error;
  }
};

/**
 * Get orders for sample collection
 */
export const getOrdersForSampleCollection = async (hospitalId: number) => {
  try {
    return await getLabOrders(hospitalId, {
      status: "ordered",
    });
  } catch (error) {
    console.error("Error fetching orders for sample collection:", error);
    throw error;
  }
};

/**
 * Get orders for result entry
 */
export const getOrdersForResultEntry = async (hospitalId: number) => {
  try {
    return await getLabOrders(hospitalId, {
      status: "sample_collected",
    });
  } catch (error) {
    console.error("Error fetching orders for result entry:", error);
    throw error;
  }
};
