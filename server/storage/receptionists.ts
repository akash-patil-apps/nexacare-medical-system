// server/storage/receptionists.ts
import { db } from '../db';
import { receptionists } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type { InsertReceptionist } from '../../shared/schema-types';

export const createReceptionist = (rec: InsertReceptionist) => {
  return db.insert(receptionists).values(rec).returning();
};

export const getReceptionistById = (id: number) => {
  return db.select().from(receptionists).where(eq(receptionists.id, id)).limit(1);
};

export const getReceptionistsByHospital = (hospitalId: number) => {
  return db.select().from(receptionists).where(eq(receptionists.hospitalId, hospitalId));
};
