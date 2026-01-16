// server/services/ipd-orders-extended.service.ts
import { db } from "../db";
import {
  ivFluidOrders,
  dietOrders,
  nursingOrders,
  ipdEncounters,
  patients,
  doctors,
  users,
} from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * Create IV fluid order
 */
export const createIvFluidOrder = async (data: {
  encounterId: number;
  patientId: number;
  orderedByDoctorId: number;
  fluidName: string;
  volume: string;
  rate: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}) => {
  // Verify encounter exists
  const [encounter] = await db
    .select()
    .from(ipdEncounters)
    .where(eq(ipdEncounters.id, data.encounterId))
    .limit(1);

  if (!encounter) {
    throw new Error("IPD encounter not found");
  }

  // Create IV fluid order
  const [order] = await db
    .insert(ivFluidOrders)
    .values({
      encounterId: data.encounterId,
      patientId: data.patientId,
      orderedByDoctorId: data.orderedByDoctorId,
      fluidName: data.fluidName,
      volume: data.volume,
      rate: data.rate,
      startDate: data.startDate,
      endDate: data.endDate || null,
      status: "active",
      notes: data.notes || null,
      createdAt: sql`NOW()`,
    })
    .returning();

  return order;
};

/**
 * Create diet order
 */
export const createDietOrder = async (data: {
  encounterId: number;
  patientId: number;
  orderedByDoctorId: number;
  dietType: string;
  specialInstructions?: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}) => {
  // Verify encounter exists
  const [encounter] = await db
    .select()
    .from(ipdEncounters)
    .where(eq(ipdEncounters.id, data.encounterId))
    .limit(1);

  if (!encounter) {
    throw new Error("IPD encounter not found");
  }

  // Create diet order
  const [order] = await db
    .insert(dietOrders)
    .values({
      encounterId: data.encounterId,
      patientId: data.patientId,
      orderedByDoctorId: data.orderedByDoctorId,
      dietType: data.dietType,
      specialInstructions: data.specialInstructions || null,
      startDate: data.startDate,
      endDate: data.endDate || null,
      status: "active",
      notes: data.notes || null,
      createdAt: sql`NOW()`,
    })
    .returning();

  return order;
};

/**
 * Create nursing order
 */
export const createNursingOrder = async (data: {
  encounterId: number;
  patientId: number;
  orderedByDoctorId: number;
  orderType: string;
  orderDescription: string;
  frequency?: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}) => {
  // Verify encounter exists
  const [encounter] = await db
    .select()
    .from(ipdEncounters)
    .where(eq(ipdEncounters.id, data.encounterId))
    .limit(1);

  if (!encounter) {
    throw new Error("IPD encounter not found");
  }

  // Create nursing order
  const [order] = await db
    .insert(nursingOrders)
    .values({
      encounterId: data.encounterId,
      patientId: data.patientId,
      orderedByDoctorId: data.orderedByDoctorId,
      orderType: data.orderType,
      orderDescription: data.orderDescription,
      frequency: data.frequency || null,
      startDate: data.startDate,
      endDate: data.endDate || null,
      status: "active",
      notes: data.notes || null,
      createdAt: sql`NOW()`,
    })
    .returning();

  return order;
};

/**
 * Get all orders for an encounter (including new order types)
 */
export const getEncounterOrdersExtended = async (encounterId: number) => {
  try {
    // Get IV fluid orders
    const ivOrders = await db
      .select({
        order: ivFluidOrders,
        doctor: doctors,
        doctorUser: users,
      })
      .from(ivFluidOrders)
      .leftJoin(doctors, eq(ivFluidOrders.orderedByDoctorId, doctors.id))
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(ivFluidOrders.encounterId, encounterId))
      .orderBy(desc(ivFluidOrders.createdAt));

    // Get diet orders
    const dietOrdersData = await db
      .select({
        order: dietOrders,
        doctor: doctors,
        doctorUser: users,
      })
      .from(dietOrders)
      .leftJoin(doctors, eq(dietOrders.orderedByDoctorId, doctors.id))
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(dietOrders.encounterId, encounterId))
      .orderBy(desc(dietOrders.createdAt));

    // Get nursing orders
    const nursingOrdersData = await db
      .select({
        order: nursingOrders,
        doctor: doctors,
        doctorUser: users,
      })
      .from(nursingOrders)
      .leftJoin(doctors, eq(nursingOrders.orderedByDoctorId, doctors.id))
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(nursingOrders.encounterId, encounterId))
      .orderBy(desc(nursingOrders.createdAt));

    return {
      ivFluids: ivOrders.map((o) => ({
        ...o.order,
        type: "iv_fluid",
        doctor: o.doctorUser
          ? {
              id: o.doctor.id,
              fullName: o.doctorUser.fullName,
            }
          : null,
      })),
      diets: dietOrdersData.map((o) => ({
        ...o.order,
        type: "diet",
        doctor: o.doctorUser
          ? {
              id: o.doctor.id,
              fullName: o.doctorUser.fullName,
            }
          : null,
      })),
      nursing: nursingOrdersData.map((o) => ({
        ...o.order,
        type: "nursing",
        doctor: o.doctorUser
          ? {
              id: o.doctor.id,
              fullName: o.doctorUser.fullName,
            }
          : null,
      })),
    };
  } catch (error) {
    console.error("Error fetching extended encounter orders:", error);
    throw error;
  }
};

/**
 * Stop an order (IV fluid, diet, or nursing)
 */
export const stopOrder = async (data: {
  orderType: "iv_fluid" | "diet" | "nursing";
  orderId: number;
}) => {
  try {
    let result;
    if (data.orderType === "iv_fluid") {
      [result] = await db
        .update(ivFluidOrders)
        .set({
          status: "stopped",
          endDate: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(ivFluidOrders.id, data.orderId))
        .returning();
    } else if (data.orderType === "diet") {
      [result] = await db
        .update(dietOrders)
        .set({
          status: "stopped",
          endDate: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(dietOrders.id, data.orderId))
        .returning();
    } else if (data.orderType === "nursing") {
      [result] = await db
        .update(nursingOrders)
        .set({
          status: "stopped",
          endDate: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(nursingOrders.id, data.orderId))
        .returning();
    } else {
      throw new Error("Invalid order type");
    }

    return result;
  } catch (error) {
    console.error("Error stopping order:", error);
    throw error;
  }
};
