import { db } from "../db.js";
import { labReports } from "../../shared/schema.js";
import { InsertLabReport } from "../../shared/schema-types.js";
import { eq } from "drizzle-orm";

export const createLabReport = async (report: InsertLabReport) => {
  return await db.insert(labReports).values(report).returning();
};

export const getLabReportsForPatient = async (patientId: number) => {
  return await db.select().from(labReports).where(eq(labReports.patientId, patientId));
};

export const getLabReportsByLab = async (labId: number) => {
  return await db.select().from(labReports).where(eq(labReports.labId, labId));
};
