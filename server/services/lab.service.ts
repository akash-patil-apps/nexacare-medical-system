import { db } from '../db';
import { labs, labReports } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { InsertLabReport } from '../../shared/schema-types';

export const getAllLabs = async () => {
  return db.select().from(labs);
};

export const verifyLab = async (labId: number) => {
  return db.update(labs).set({ isActive: true }).where(eq(labs.id, labId)).returning();
};

export const createLabReport = async (data: Omit<InsertLabReport, 'id' | 'createdAt'>) => {
  return db.insert(labReports).values(data).returning();
};

export const getLabReportsForLab = async (labId: number) => {
  return db.select().from(labReports).where(eq(labReports.labId, labId));
};

export const getLabReportsForPatient = async (patientId: number) => {
  return db.select().from(labReports).where(eq(labReports.patientId, patientId));
};
