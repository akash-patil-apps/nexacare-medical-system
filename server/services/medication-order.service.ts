// server/services/medication-order.service.ts
import { db } from '../db';
import { medicationOrders, ipdEncounters, doctors, patients } from '../../shared/schema';
import { eq, and, sql, desc, gte, lte, or } from 'drizzle-orm';

/**
 * Create medication order
 */
export const createMedicationOrder = async (data: {
  encounterId: number;
  patientId: number;
  orderedByDoctorId: number;
  medicationName: string;
  dosage: string;
  unit: string;
  route: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  isPrn?: boolean;
  prnIndication?: string;
  notes?: string;
}) => {
  // Verify encounter exists
  const [encounter] = await db
    .select()
    .from(ipdEncounters)
    .where(eq(ipdEncounters.id, data.encounterId))
    .limit(1);

  if (!encounter) {
    throw new Error('IPD encounter not found');
  }

  // Create medication order
  const [order] = await db
    .insert(medicationOrders)
    .values({
      encounterId: data.encounterId,
      patientId: data.patientId,
      orderedByDoctorId: data.orderedByDoctorId,
      medicationName: data.medicationName,
      dosage: data.dosage,
      unit: data.unit,
      route: data.route,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate || null,
      isPrn: data.isPrn || false,
      prnIndication: data.prnIndication || null,
      notes: data.notes || null,
      status: 'active',
      createdAt: sql`NOW()`,
    })
    .returning();

  return order;
};

/**
 * Get medication orders for an encounter
 */
export const getMedicationOrdersForEncounter = async (encounterId: number, includeInactive = false) => {
  const conditions = [eq(medicationOrders.encounterId, encounterId)];
  
  if (!includeInactive) {
    conditions.push(eq(medicationOrders.status, 'active'));
  }

  const orders = await db
    .select({
      order: medicationOrders,
      doctor: doctors,
    })
    .from(medicationOrders)
    .leftJoin(doctors, eq(medicationOrders.orderedByDoctorId, doctors.id))
    .where(and(...conditions))
    .orderBy(desc(medicationOrders.createdAt));

  return orders;
};

/**
 * Stop medication order
 */
export const stopMedicationOrder = async (orderId: number, reason?: string) => {
  const [order] = await db
    .select()
    .from(medicationOrders)
    .where(eq(medicationOrders.id, orderId))
    .limit(1);

  if (!order) {
    throw new Error('Medication order not found');
  }

  if (order.status !== 'active') {
    throw new Error('Medication order is not active');
  }

  const [updated] = await db
    .update(medicationOrders)
    .set({
      status: 'stopped',
      updatedAt: sql`NOW()`,
      notes: reason ? `${order.notes || ''}\nStopped: ${reason}`.trim() : order.notes,
    })
    .where(eq(medicationOrders.id, orderId))
    .returning();

  return updated;
};

/**
 * Get active medication orders for a patient
 */
export const getActiveMedicationOrdersForPatient = async (patientId: number) => {
  const orders = await db
    .select({
      order: medicationOrders,
      doctor: doctors,
    })
    .from(medicationOrders)
    .leftJoin(doctors, eq(medicationOrders.orderedByDoctorId, doctors.id))
    .where(
      and(
        eq(medicationOrders.patientId, patientId),
        eq(medicationOrders.status, 'active'),
        or(
          isNull(medicationOrders.endDate),
          gte(medicationOrders.endDate, sql`NOW()`)
        )
      )
    )
    .orderBy(desc(medicationOrders.createdAt));

  return orders;
};


