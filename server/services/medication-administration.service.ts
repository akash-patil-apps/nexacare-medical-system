// server/services/medication-administration.service.ts
import { db } from '../db';
import { medicationAdministrations, medicationOrders, ipdEncounters, nurses } from '../../shared/schema';
import { eq, and, sql, desc, gte, lte, between } from 'drizzle-orm';
import * as nurseActivityService from './nurse-activity.service';

/**
 * Generate medication schedule from order
 * This creates scheduled administrations based on frequency
 */
export const generateMedicationSchedule = async (orderId: number) => {
  const [order] = await db
    .select()
    .from(medicationOrders)
    .where(eq(medicationOrders.id, orderId))
    .limit(1);

  if (!order) {
    throw new Error('Medication order not found');
  }

  if (order.isPrn) {
    // PRN medications don't have automatic schedule
    return [];
  }

  // Parse frequency and generate schedule
  const schedule = parseFrequencyToSchedule(
    order.frequency,
    order.startDate,
    order.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days if no end date
  );

  // Create administration records
  const administrations = await Promise.all(
    schedule.map(scheduledTime =>
      db.insert(medicationAdministrations).values({
        medicationOrderId: orderId,
        encounterId: order.encounterId,
        patientId: order.patientId,
        scheduledAt: scheduledTime,
        status: 'scheduled',
        createdAt: sql`NOW()`,
      }).returning()
    )
  );

  return administrations.flat();
};

/**
 * Parse frequency string to schedule times
 */
function parseFrequencyToSchedule(frequency: string, startDate: Date, endDate: Date): Date[] {
  const schedule: Date[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  // Common frequency patterns
  const frequencyMap: Record<string, number> = {
    'QID': 6, // Every 6 hours (4 times daily)
    'TID': 8, // Every 8 hours (3 times daily)
    'BID': 12, // Every 12 hours (2 times daily)
    'QD': 24, // Once daily
    'QOD': 48, // Every other day
  };

  // Parse Q8H, Q12H, etc.
  const qMatch = frequency.match(/Q(\d+)H/i);
  if (qMatch) {
    const hours = parseInt(qMatch[1]);
    while (current <= end) {
      schedule.push(new Date(current));
      current.setHours(current.getHours() + hours);
    }
    return schedule;
  }

  // Handle standard frequencies
  const hours = frequencyMap[frequency.toUpperCase()];
  if (hours) {
    // Set initial times based on frequency
    const initialTimes: number[] = [];
    if (frequency.toUpperCase() === 'QID') {
      initialTimes.push(8, 14, 20, 2); // 8 AM, 2 PM, 8 PM, 2 AM
    } else if (frequency.toUpperCase() === 'TID') {
      initialTimes.push(8, 14, 20); // 8 AM, 2 PM, 8 PM
    } else if (frequency.toUpperCase() === 'BID') {
      initialTimes.push(8, 20); // 8 AM, 8 PM
    } else if (frequency.toUpperCase() === 'QD') {
      initialTimes.push(8); // 8 AM
    }

    // Generate schedule for each day
    while (current <= end) {
      for (const hour of initialTimes) {
        const scheduledTime = new Date(current);
        scheduledTime.setHours(hour, 0, 0, 0);
        if (scheduledTime >= start && scheduledTime <= end) {
          schedule.push(new Date(scheduledTime));
        }
      }
      current.setDate(current.getDate() + 1);
    }
  } else {
    // Default: once daily at 8 AM
    while (current <= end) {
      const scheduledTime = new Date(current);
      scheduledTime.setHours(8, 0, 0, 0);
      if (scheduledTime >= start && scheduledTime <= end) {
        schedule.push(new Date(scheduledTime));
      }
      current.setDate(current.getDate() + 1);
    }
  }

  return schedule.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Mark medication as given
 */
export const markMedicationAsGiven = async (data: {
  administrationId: number;
  administeredByUserId: number;
  doseGiven?: string;
  routeUsed?: string;
  notes?: string;
}) => {
  const [admin] = await db
    .select()
    .from(medicationAdministrations)
    .where(eq(medicationAdministrations.id, data.administrationId))
    .limit(1);

  if (!admin) {
    throw new Error('Medication administration record not found');
  }

  if (admin.status !== 'scheduled') {
    throw new Error('Medication can only be marked as given if status is scheduled');
  }

  // Get order details for activity log
  const [order] = await db
    .select()
    .from(medicationOrders)
    .where(eq(medicationOrders.id, admin.medicationOrderId))
    .limit(1);

  const [updated] = await db
    .update(medicationAdministrations)
    .set({
      status: 'given',
      administeredAt: sql`NOW()`,
      administeredByUserId: data.administeredByUserId,
      doseGiven: data.doseGiven || null,
      routeUsed: data.routeUsed || null,
      notes: data.notes || null,
      updatedAt: sql`NOW()`,
    })
    .where(eq(medicationAdministrations.id, data.administrationId))
    .returning();

  // Log activity - need to get nurse ID from user ID
  if (order) {
    const { db } = await import('../db');
    const { nurses } = await import('../../shared/schema');
    const [nurse] = await db
      .select()
      .from(nurses)
      .where(eq(nurses.userId, data.administeredByUserId))
      .limit(1);

    if (nurse) {
      await nurseActivityService.logNurseActivity({
        encounterId: admin.encounterId,
        patientId: admin.patientId,
        nurseId: nurse.id,
        activityType: 'medication',
        activitySubtype: 'medication_given',
        entityType: 'medication_administration',
        entityId: updated.id,
        description: `Administered ${order.medicationName} ${data.doseGiven || order.dosage}${order.unit} via ${data.routeUsed || order.route}`,
        metadata: JSON.stringify({
          medication: order.medicationName,
          dose: data.doseGiven || order.dosage,
          unit: order.unit,
          route: data.routeUsed || order.route,
          scheduledTime: admin.scheduledAt,
          administeredTime: updated.administeredAt,
        }),
      });
    }
  }

  return updated;
};

/**
 * Update medication administration status (held/refused/missed)
 */
export const updateMedicationStatus = async (data: {
  administrationId: number;
  status: 'held' | 'refused' | 'missed';
  reason: string;
  updatedByUserId: number;
  notes?: string;
}) => {
  const [admin] = await db
    .select()
    .from(medicationAdministrations)
    .where(eq(medicationAdministrations.id, data.administrationId))
    .limit(1);

  if (!admin) {
    throw new Error('Medication administration record not found');
  }

  // Get order details
  const [order] = await db
    .select()
    .from(medicationOrders)
    .where(eq(medicationOrders.id, admin.medicationOrderId))
    .limit(1);

  const [updated] = await db
    .update(medicationAdministrations)
    .set({
      status: data.status,
      reason: data.reason,
      notes: data.notes || null,
      updatedAt: sql`NOW()`,
    })
    .where(eq(medicationAdministrations.id, data.administrationId))
    .returning();

  // Log activity - need to get nurse ID from user ID
  if (order) {
    const { db } = await import('../db');
    const { nurses } = await import('../../shared/schema');
    const [nurse] = await db
      .select()
      .from(nurses)
      .where(eq(nurses.userId, data.updatedByUserId))
      .limit(1);

    if (nurse) {
      await nurseActivityService.logNurseActivity({
        encounterId: admin.encounterId,
        patientId: admin.patientId,
        nurseId: nurse.id,
        activityType: 'medication',
        activitySubtype: `medication_${data.status}`,
        entityType: 'medication_administration',
        entityId: updated.id,
        description: `${data.status.charAt(0).toUpperCase() + data.status.slice(1)} ${order.medicationName} - ${data.reason}`,
        metadata: JSON.stringify({
          medication: order.medicationName,
          status: data.status,
          reason: data.reason,
          scheduledTime: admin.scheduledAt,
        }),
      });
    }
  }

  return updated;
};

/**
 * Get medication schedule for encounter
 */
export const getMedicationSchedule = async (encounterId: number, date?: Date) => {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const schedule = await db
    .select({
      administration: medicationAdministrations,
      order: medicationOrders,
    })
    .from(medicationAdministrations)
    .innerJoin(medicationOrders, eq(medicationAdministrations.medicationOrderId, medicationOrders.id))
    .where(
      and(
        eq(medicationAdministrations.encounterId, encounterId),
        gte(medicationAdministrations.scheduledAt, startOfDay),
        lte(medicationAdministrations.scheduledAt, endOfDay)
      )
    )
    .orderBy(medicationAdministrations.scheduledAt);

  return schedule;
};

/**
 * Get upcoming medication reminders for a nurse
 */
export const getUpcomingMedicationReminders = async (nurseId: number, hoursAhead = 2) => {
  const now = new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  // Get encounters assigned to this nurse
  const reminders = await db
    .select({
      administration: medicationAdministrations,
      order: medicationOrders,
      encounter: ipdEncounters,
    })
    .from(medicationAdministrations)
    .innerJoin(medicationOrders, eq(medicationAdministrations.medicationOrderId, medicationOrders.id))
    .innerJoin(ipdEncounters, eq(medicationAdministrations.encounterId, ipdEncounters.id))
    .where(
      and(
        eq(ipdEncounters.assignedNurseId, nurseId),
        eq(medicationAdministrations.status, 'scheduled'),
        gte(medicationAdministrations.scheduledAt, now),
        lte(medicationAdministrations.scheduledAt, future)
      )
    )
    .orderBy(medicationAdministrations.scheduledAt);

  return reminders;
};

/**
 * Create PRN medication administration
 */
export const createPrnAdministration = async (data: {
  medicationOrderId: number;
  encounterId: number;
  patientId: number;
  administeredByUserId: number;
  doseGiven: string;
  routeUsed: string;
  notes?: string;
}) => {
  const [order] = await db
    .select()
    .from(medicationOrders)
    .where(eq(medicationOrders.id, data.medicationOrderId))
    .limit(1);

  if (!order) {
    throw new Error('Medication order not found');
  }

  if (!order.isPrn) {
    throw new Error('This medication is not PRN');
  }

  const [admin] = await db
    .insert(medicationAdministrations)
    .values({
      medicationOrderId: data.medicationOrderId,
      encounterId: data.encounterId,
      patientId: data.patientId,
      scheduledAt: sql`NOW()`,
      administeredAt: sql`NOW()`,
      administeredByUserId: data.administeredByUserId,
      status: 'given',
      doseGiven: data.doseGiven,
      routeUsed: data.routeUsed,
      notes: data.notes || null,
      createdAt: sql`NOW()`,
    })
    .returning();

  // Log activity - need to get nurse ID from user ID
  const { db } = await import('../db');
  const { nurses } = await import('../../shared/schema');
  const [nurse] = await db
    .select()
    .from(nurses)
    .where(eq(nurses.userId, data.administeredByUserId))
    .limit(1);

  if (nurse) {
    await nurseActivityService.logNurseActivity({
      encounterId: data.encounterId,
      patientId: data.patientId,
      nurseId: nurse.id,
      activityType: 'medication',
      activitySubtype: 'medication_given_prn',
      entityType: 'medication_administration',
      entityId: admin.id,
      description: `Administered PRN ${order.medicationName} ${data.doseGiven}${order.unit} via ${data.routeUsed}`,
      metadata: JSON.stringify({
        medication: order.medicationName,
        dose: data.doseGiven,
        route: data.routeUsed,
        isPrn: true,
        prnIndication: order.prnIndication,
      }),
    });
  }

  return admin;
};

