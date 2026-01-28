// server/services/insurance.service.ts
import { db } from '../db';
import {
  insuranceProviders,
  patientInsurancePolicies,
  type InsertInsuranceProvider,
  type InsertPatientInsurancePolicy,
  insurancePreauths,
  insuranceClaims,
} from '../../shared/schema';
import { and, eq } from 'drizzle-orm';

export const createInsuranceProvider = async (
  data: Omit<InsertInsuranceProvider, 'id' | 'createdAt'>,
) => {
  const [provider] = await db
    .insert(insuranceProviders)
    .values({
      ...data,
    })
    .returning();

  return provider;
};

export const getInsuranceProviders = async (filters: {
  hospitalId?: number;
  isActive?: boolean;
}) => {
  const conditions = [];
  if (filters.hospitalId) {
    conditions.push(eq(insuranceProviders.hospitalId, filters.hospitalId));
  }
  if (typeof filters.isActive === 'boolean') {
    conditions.push(eq(insuranceProviders.isActive, filters.isActive));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  return db.select().from(insuranceProviders).where(where);
};

export const updateInsuranceProvider = async (
  id: number,
  data: Partial<Omit<InsertInsuranceProvider, 'id' | 'createdAt'>>,
) => {
  const [provider] = await db
    .update(insuranceProviders)
    .set(data)
    .where(eq(insuranceProviders.id, id))
    .returning();

  return provider;
};

export const createPatientPolicy = async (
  data: Omit<InsertPatientInsurancePolicy, 'id' | 'createdAt'>,
) => {
  const [policy] = await db
    .insert(patientInsurancePolicies)
    .values({
      ...data,
    })
    .returning();

  return policy;
};

export const getPatientPolicies = async (filters: {
  patientId: number;
  hospitalId?: number;
}) => {
  const conditions = [eq(patientInsurancePolicies.patientId, filters.patientId)];
  if (filters.hospitalId) {
    conditions.push(eq(patientInsurancePolicies.hospitalId, filters.hospitalId));
  }

  const where = and(...conditions);

  return db.select().from(patientInsurancePolicies).where(where);
};

export const createInsurancePreauth = async (data: {
  encounterId: number;
  hospitalId: number;
  patientId: number;
  insurancePolicyId?: number;
  estimatedAmount?: number;
  referenceNumber?: string;
  remarks?: string;
}) => {
  const [preauth] = await db
    .insert(insurancePreauths)
    .values({
      encounterId: data.encounterId,
      hospitalId: data.hospitalId,
      patientId: data.patientId,
      insurancePolicyId: data.insurancePolicyId,
      estimatedAmount: data.estimatedAmount != null ? String(data.estimatedAmount) as any : null,
      referenceNumber: data.referenceNumber || null,
      remarks: data.remarks || null,
    })
    .returning();

  return preauth;
};

export const updateInsurancePreauthStatus = async (id: number, data: {
  status: string;
  approvedAmount?: number;
  remarks?: string;
}) => {
  const [updated] = await db
    .update(insurancePreauths)
    .set({
      status: data.status,
      approvedAmount: data.approvedAmount != null ? String(data.approvedAmount) as any : null,
      remarks: data.remarks || null,
    })
    .where(eq(insurancePreauths.id, id))
    .returning();

  return updated;
};

export const createInsuranceClaim = async (data: {
  encounterId?: number;
  hospitalId: number;
  patientId: number;
  insurancePolicyId?: number;
  claimNumber?: string;
  submittedAmount?: number;
}) => {
  const [claim] = await db
    .insert(insuranceClaims)
    .values({
      encounterId: data.encounterId || null,
      hospitalId: data.hospitalId,
      patientId: data.patientId,
      insurancePolicyId: data.insurancePolicyId,
      claimNumber: data.claimNumber || null,
      submittedAmount: data.submittedAmount != null ? String(data.submittedAmount) as any : null,
    })
    .returning();

  return claim;
};

export const updateInsuranceClaim = async (
  id: number,
  data: {
    status?: string;
    approvedAmount?: number;
    rejectionReason?: string;
    paidAt?: Date | null;
  },
) => {
  const updateData: any = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.approvedAmount !== undefined) {
    updateData.approvedAmount = data.approvedAmount != null ? String(data.approvedAmount) : null;
  }
  if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason || null;
  if (data.paidAt !== undefined) updateData.paidAt = data.paidAt;

  const [claim] = await db
    .update(insuranceClaims)
    .set(updateData)
    .where(eq(insuranceClaims.id, id))
    .returning();

  return claim;
};

