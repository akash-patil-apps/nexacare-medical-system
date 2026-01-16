import { db } from '../db';
import { payments, invoices, appointments, ipdEncounters } from '../../shared/schema';
import { eq, and, gte, lte, or, desc, sql } from 'drizzle-orm';

// Simple date utilities for IST
function getISTStartOfDay(date: Date): Date {
  const istDate = new Date(date);
  istDate.setUTCHours(5, 30, 0, 0); // IST is UTC+5:30
  return istDate;
}

function isSameDayIST(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * Get revenue statistics for a hospital
 */
export const getRevenueStats = async (hospitalId: number) => {
  const today = getISTStartOfDay(new Date());
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Get all payments for this hospital
  // Payments are linked to invoices, which are linked to appointments or encounters
  const allPayments = await db
    .select({
      payment: payments,
      invoice: invoices,
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(eq(invoices.hospitalId, hospitalId));

  // Calculate daily revenue (today)
  const dailyPayments = allPayments.filter((p) => {
    if (!p.payment.receivedAt && !p.payment.createdAt) return false;
    const paymentDate = new Date(p.payment.receivedAt || p.payment.createdAt);
    return isSameDayIST(paymentDate, today);
  });
  const dailyRevenue = dailyPayments.reduce((sum, p) => sum + parseFloat(p.payment.amount.toString()), 0);

  // Calculate weekly revenue
  const weeklyPayments = allPayments.filter((p) => {
    if (!p.payment.receivedAt && !p.payment.createdAt) return false;
    const paymentDate = new Date(p.payment.receivedAt || p.payment.createdAt);
    return paymentDate >= weekStart;
  });
  const weeklyRevenue = weeklyPayments.reduce((sum, p) => sum + parseFloat(p.payment.amount.toString()), 0);

  // Calculate monthly revenue
  const monthlyPayments = allPayments.filter((p) => {
    if (!p.payment.receivedAt && !p.payment.createdAt) return false;
    const paymentDate = new Date(p.payment.receivedAt || p.payment.createdAt);
    return paymentDate >= monthStart;
  });
  const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + parseFloat(p.payment.amount.toString()), 0);

  // Calculate total revenue (all time)
  const totalRevenue = allPayments.reduce((sum, p) => sum + parseFloat(p.payment.amount.toString()), 0);

  return {
    daily: dailyRevenue,
    weekly: weeklyRevenue,
    monthly: monthlyRevenue,
    total: totalRevenue,
  };
};

/**
 * Get detailed revenue transactions for a hospital
 */
export const getRevenueTransactions = async (
  hospitalId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    paymentMethod?: string;
    source?: string; // 'appointment', 'ipd', 'opd', 'all'
    limit?: number;
    offset?: number;
  }
) => {
  // Build conditions array
  const conditions = [eq(invoices.hospitalId, hospitalId)];

  // Apply date filters
  if (filters?.startDate) {
    conditions.push(gte(sql`COALESCE(${payments.receivedAt}, ${payments.createdAt})`, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(sql`COALESCE(${payments.receivedAt}, ${payments.createdAt})`, filters.endDate));
  }

  // Apply payment method filter
  if (filters?.paymentMethod) {
    conditions.push(eq(payments.paymentMethod, filters.paymentMethod));
  }

  // Apply source filter
  if (filters?.source && filters.source !== 'all') {
    if (filters.source === 'appointment') {
      conditions.push(sql`${invoices.appointmentId} IS NOT NULL`);
    } else if (filters.source === 'ipd') {
      conditions.push(sql`${invoices.encounterId} IS NOT NULL`);
    }
  }

  // Build query with all conditions
  let query = db
    .select({
      payment: payments,
      invoice: invoices,
      appointment: appointments,
      encounter: ipdEncounters,
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .leftJoin(appointments, eq(invoices.appointmentId, appointments.id))
    .leftJoin(ipdEncounters, eq(invoices.encounterId, ipdEncounters.id))
    .where(and(...conditions));

  // Order by date (newest first) - use COALESCE to handle null receivedAt
  query = query.orderBy(desc(sql`COALESCE(${payments.receivedAt}, ${payments.createdAt})`));

  // Apply pagination
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.offset(filters.offset);
  }

  const results = await query;

  // Format the results
  return results.map((r) => ({
    id: r.payment.id,
    amount: parseFloat(r.payment.amount.toString()),
    paymentMethod: r.payment.paymentMethod,
    status: r.payment.status,
    receivedAt: r.payment.receivedAt || r.payment.createdAt,
    invoiceNumber: r.invoice?.invoiceNumber,
    invoiceId: r.invoice?.id,
    source: r.appointment ? 'appointment' : r.encounter ? 'ipd' : 'opd',
    sourceId: r.appointment?.id || r.encounter?.id || null,
    patientId: r.appointment?.patientId || r.encounter?.patientId || null,
    notes: r.payment.notes,
    transactionId: r.payment.transactionId,
  }));
};

/**
 * Get revenue summary by source
 */
export const getRevenueBySource = async (hospitalId: number, startDate?: Date, endDate?: Date) => {
  const allPayments = await db
    .select({
      payment: payments,
      invoice: invoices,
      appointment: appointments,
      encounter: ipdEncounters,
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .leftJoin(appointments, eq(invoices.appointmentId, appointments.id))
    .leftJoin(ipdEncounters, eq(invoices.encounterId, ipdEncounters.id))
    .where(eq(invoices.hospitalId, hospitalId));

  // Filter by date if provided
  let filteredPayments = allPayments;
  if (startDate || endDate) {
    filteredPayments = allPayments.filter((p) => {
      const paymentDate = new Date(p.payment.receivedAt || p.payment.createdAt);
      if (startDate && paymentDate < startDate) return false;
      if (endDate && paymentDate > endDate) return false;
      return true;
    });
  }

  // Group by source
  const bySource = {
    appointment: 0,
    ipd: 0,
    opd: 0,
    total: 0,
  };

  filteredPayments.forEach((p) => {
    const amount = parseFloat(p.payment.amount.toString());
    bySource.total += amount;
    
    if (p.appointment) {
      bySource.appointment += amount;
    } else if (p.encounter) {
      bySource.ipd += amount;
    } else {
      bySource.opd += amount;
    }
  });

  return bySource;
};

/**
 * Get revenue by payment method
 */
export const getRevenueByPaymentMethod = async (hospitalId: number, startDate?: Date, endDate?: Date) => {
  const allPayments = await db
    .select({
      payment: payments,
      invoice: invoices,
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(eq(invoices.hospitalId, hospitalId));

  // Filter by date if provided
  let filteredPayments = allPayments.filter((p) => {
    // Only include payments with valid dates
    return !!(p.payment.receivedAt || p.payment.createdAt);
  });
  
  if (startDate || endDate) {
    filteredPayments = filteredPayments.filter((p) => {
      const paymentDate = new Date(p.payment.receivedAt || p.payment.createdAt);
      if (startDate && paymentDate < startDate) return false;
      if (endDate && paymentDate > endDate) return false;
      return true;
    });
  }

  // Group by payment method
  const byMethod: Record<string, number> = {};

  filteredPayments.forEach((p) => {
    const method = p.payment.paymentMethod || 'unknown';
    const amount = parseFloat(p.payment.amount.toString());
    byMethod[method] = (byMethod[method] || 0) + amount;
  });

  return byMethod;
};
