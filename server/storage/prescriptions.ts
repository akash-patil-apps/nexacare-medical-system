import { db } from "../db.js";
import { prescriptions } from "../../shared/schema.js";
import { InsertPrescription } from "../../shared/schema-types.js";
import { eq } from "drizzle-orm";

export const createPrescription = async (prescription: InsertPrescription) => {
  return await db.insert(prescriptions).values(prescription).returning();
};

export const getPrescriptionsForPatient = async (patientId: number) => {
  return await db.select().from(prescriptions).where(eq(prescriptions.patientId, patientId));
};

export const getPrescriptionsForAppointment = async (appointmentId: number) => {
  return await db.select().from(prescriptions).where(eq(prescriptions.appointmentId, appointmentId));
};
