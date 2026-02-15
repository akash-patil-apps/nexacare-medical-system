// server/services/ipd-emar.service.ts
import { db } from "../db";
import {
  medicationOrders,
  medicationAdministrations,
  ipdEncounters,
  patients,
  doctors,
  nurses,
  users,
} from "../../shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

/**
 * Get medications due for administration
 */
export const getMedicationsDue = async (data: {
  encounterId?: number;
  nurseId?: number;
  hospitalId: number;
  date?: Date;
}) => {
  try {
    const targetDate = data.date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    let query = db
      .select({
        order: medicationOrders,
        encounter: ipdEncounters,
        patient: patients,
        doctor: doctors,
        doctorUser: users,
      })
      .from(medicationOrders)
      .leftJoin(ipdEncounters, eq(medicationOrders.encounterId, ipdEncounters.id))
      .leftJoin(patients, eq(medicationOrders.patientId, patients.id))
      .leftJoin(doctors, eq(medicationOrders.orderedByDoctorId, doctors.id))
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(
        and(
          eq(ipdEncounters.hospitalId, data.hospitalId),
          eq(medicationOrders.status, "active"),
          gte(medicationOrders.startDate, startOfDay),
          sql`${medicationOrders.endDate} IS NULL OR ${medicationOrders.endDate} >= ${startOfDay}`
        )
      );

    if (data.encounterId) {
      query = (query as any).where(eq(medicationOrders.encounterId, data.encounterId));
    }

    if (data.nurseId) {
      // Filter by nurse's assigned encounters
      query = (query as any).where(eq(ipdEncounters.assignedNurseId, data.nurseId));
    }

    const orders = await query.orderBy(desc(medicationOrders.createdAt));

    // Get administrations for today to check what's already given
    const administrations = await db
      .select()
      .from(medicationAdministrations)
      .where(
        and(
          gte(medicationAdministrations.administeredAt, startOfDay),
          lte(medicationAdministrations.administeredAt, endOfDay)
        )
      );

    // Map orders with administration status
    const withStatus = orders.map((order) => {
      const todayAdmins = administrations.filter(
        (a) => a.medicationOrderId === order.order.id
      );

      // Calculate if due based on frequency
      const isDue = calculateIfDue(order.order, todayAdmins, targetDate);

      return {
        ...order.order,
        encounter: order.encounter,
        patient: order.patient
          ? {
              id: order.patient.id,
              fullName: (order.patient as { fullName?: string }).fullName ?? (order as { patientUser?: { fullName?: string } }).patientUser?.fullName ?? 'Patient',
            }
          : null,
        doctor: order.doctorUser
          ? {
              id: order.doctor.id,
              fullName: order.doctorUser.fullName,
            }
          : null,
        isDue,
        administrationsToday: todayAdmins,
        lastAdministered: todayAdmins.length > 0 ? todayAdmins[0] : null,
      };
    });

    return withStatus;
  } catch (error) {
    console.error("Error fetching medications due:", error);
    throw error;
  }
};

/**
 * Calculate if medication is due based on frequency
 */
const calculateIfDue = (
  order: any,
  todayAdmins: any[],
  targetDate: Date
): boolean => {
  const frequency = order.frequency?.toUpperCase() || "";
  const hour = targetDate.getHours();

  // Simple frequency mapping (can be enhanced)
  const expectedTimes: { [key: string]: number[] } = {
    QID: [8, 14, 20, 2], // 4 times a day
    TID: [8, 14, 20], // 3 times a day
    BID: [8, 20], // 2 times a day
    Q8H: [8, 16, 0], // Every 8 hours
    Q12H: [8, 20], // Every 12 hours
    QD: [8], // Once daily
    QOD: [8], // Every other day
  };

  const times = expectedTimes[frequency] || [8];
  const currentTimeSlot = times.find((t) => hour >= t && hour < t + 4) || times[0];

  // Check if already administered in this time slot
  const adminInSlot = todayAdmins.find((a) => {
    const adminHour = new Date(a.administeredAt).getHours();
    return adminHour >= currentTimeSlot && adminHour < currentTimeSlot + 4;
  });

  return !adminInSlot;
};

/**
 * Record medication administration
 */
export const recordMedicationAdministration = async (data: {
  medicationOrderId: number;
  encounterId: number;
  patientId: number;
  administeredByUserId: number;
  administeredAt: Date;
  doseGiven?: string;
  route?: string;
  notes?: string;
  reasonForOmission?: string; // If not given
}) => {
  try {
    // Verify order exists and is active
    const [order] = await db
      .select()
      .from(medicationOrders)
      .where(eq(medicationOrders.id, data.medicationOrderId))
      .limit(1);

    if (!order) {
      throw new Error("Medication order not found");
    }

    if (order.status !== "active") {
      throw new Error("Medication order is not active");
    }

    // Create administration record
    const [admin] = await db
      .insert(medicationAdministrations)
      .values({
        medicationOrderId: data.medicationOrderId,
        encounterId: data.encounterId,
        patientId: data.patientId,
        scheduledAt: data.administeredAt,
        administeredAt: data.administeredAt,
        administeredByUserId: data.administeredByUserId,
        doseGiven: data.doseGiven || order.dosage,
        routeUsed: data.route || order.route,
        status: data.reasonForOmission ? "missed" : "given",
        reason: data.reasonForOmission || null,
        notes: data.notes || null,
        createdAt: new Date(),
      })
      .returning();

    return admin;
  } catch (error) {
    console.error("Error recording medication administration:", error);
    throw error;
  }
};

/**
 * Get medication administration history
 */
export const getMedicationHistory = async (data: {
  encounterId?: number;
  medicationOrderId?: number;
  patientId?: number;
  startDate?: Date;
  endDate?: Date;
}) => {
  try {
    let query = db
      .select({
        admin: medicationAdministrations,
        order: medicationOrders,
        patient: patients,
      })
      .from(medicationAdministrations)
      .leftJoin(
        medicationOrders,
        eq(medicationAdministrations.medicationOrderId, medicationOrders.id)
      )
      .leftJoin(
        patients,
        eq(medicationAdministrations.patientId, patients.id)
      );

    const conditions = [];

    if (data.encounterId) {
      conditions.push(eq(medicationAdministrations.encounterId, data.encounterId));
    }

    if (data.medicationOrderId) {
      conditions.push(
        eq(medicationAdministrations.medicationOrderId, data.medicationOrderId)
      );
    }

    if (data.patientId) {
      conditions.push(eq(medicationAdministrations.patientId, data.patientId));
    }

    if (data.startDate) {
      conditions.push(gte(medicationAdministrations.administeredAt, data.startDate));
    }

    if (data.endDate) {
      conditions.push(lte(medicationAdministrations.administeredAt, data.endDate));
    }

    if (conditions.length > 0) {
      query = (query as any).where(and(...conditions));
    }

    const results = await query.orderBy(desc(medicationAdministrations.administeredAt));

    return results.map((r) => ({
      ...r.admin,
      order: r.order,
      patient: r.patient,
    }));
  } catch (error) {
    console.error("Error fetching medication history:", error);
    throw error;
  }
};
