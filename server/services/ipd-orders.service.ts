// server/services/ipd-orders.service.ts
import { db } from "../db";
import {
  medicationOrders,
  labOrders,
  radiologyOrders,
  ipdEncounters,
  patients,
  doctors,
  users,
} from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Get all orders for an IPD encounter
 */
export const getEncounterOrders = async (encounterId: number) => {
  try {
    // Get medication orders
    const medOrders = await db
      .select({
        order: medicationOrders,
        doctor: doctors,
        doctorUser: users,
      })
      .from(medicationOrders)
      .leftJoin(doctors, eq(medicationOrders.orderedByDoctorId, doctors.id))
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(medicationOrders.encounterId, encounterId))
      .orderBy(desc(medicationOrders.createdAt));

    // Get lab orders
    const labOrdersData = await db
      .select({
        order: labOrders,
        doctor: doctors,
        doctorUser: users,
      })
      .from(labOrders)
      .leftJoin(doctors, eq(labOrders.doctorId, doctors.id))
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(labOrders.encounterId, encounterId))
      .orderBy(desc(labOrders.createdAt));

    // Get radiology orders
    const radOrders = await db
      .select({
        order: radiologyOrders,
        doctor: doctors,
        doctorUser: users,
      })
      .from(radiologyOrders)
      .leftJoin(doctors, eq(radiologyOrders.doctorId, doctors.id))
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(radiologyOrders.encounterId, encounterId))
      .orderBy(desc(radiologyOrders.createdAt));

    return {
      medications: medOrders.map((m) => ({
        ...m.order,
        type: "medication",
        doctor: m.doctorUser
          ? {
              id: m.doctor.id,
              fullName: m.doctorUser.fullName,
            }
          : null,
      })),
      lab: labOrdersData.map((l) => ({
        ...l.order,
        type: "lab",
        doctor: l.doctorUser
          ? {
              id: l.doctor.id,
              fullName: l.doctorUser.fullName,
            }
          : null,
      })),
      radiology: radOrders.map((r) => ({
        ...r.order,
        type: "radiology",
        doctor: r.doctorUser
          ? {
              id: r.doctor.id,
              fullName: r.doctorUser.fullName,
            }
          : null,
      })),
    };
  } catch (error) {
    console.error("Error fetching encounter orders:", error);
    throw error;
  }
};

/**
 * Get all active IPD patients with their orders summary
 */
export const getActiveIpdPatientsWithOrders = async (hospitalId: number) => {
  try {
    const encounters = await db
      .select({
        encounter: ipdEncounters,
        patient: patients,
      })
      .from(ipdEncounters)
      .leftJoin(patients, eq(ipdEncounters.patientId, patients.id))
      .where(
        and(
          eq(ipdEncounters.hospitalId, hospitalId),
          eq(ipdEncounters.status, "admitted")
        )
      )
      .orderBy(desc(ipdEncounters.admittedAt));

    // Get orders summary for each encounter
    const withOrders = await Promise.all(
      encounters.map(async (enc) => {
        const orders = await getEncounterOrders(enc.encounter.id);
        return {
          ...enc.encounter,
          patient: enc.patient,
          ordersSummary: {
            activeMedications: orders.medications.filter(
              (m) => m.status === "active"
            ).length,
            pendingLab: orders.lab.filter((l) => l.status === "ordered").length,
            pendingRadiology: orders.radiology.filter(
              (r) => r.status === "ordered"
            ).length,
          },
        };
      })
    );

    return withOrders;
  } catch (error) {
    console.error("Error fetching active IPD patients:", error);
    throw error;
  }
};
