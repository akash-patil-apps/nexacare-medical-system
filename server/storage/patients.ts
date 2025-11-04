import { db } from "../db";
import { patients } from "../../shared/schema";
import { InsertPatient } from "../../shared/schema-types";
import { eq } from "drizzle-orm";

// Insert a new patient
export const createPatient = async (patient: InsertPatient) => {
  return await db.insert(patients).values(patient).returning();
};

// Get patient by ID (expects number, not string)
export const getPatientById = async (id: number) => {
  const [patient] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  return patient;
};

// List all patients
export const getAllPatients = async () => {
  return await db.select().from(patients);
};
