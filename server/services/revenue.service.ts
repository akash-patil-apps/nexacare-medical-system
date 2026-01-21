import { db } from '../db';
import { payments, invoices, appointments, invoiceItems, patients, doctors, users } from '../../shared/schema';
import { eq, and, gte, lte, or, desc, sql, inArray } from 'drizzle-orm';

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
    const paymentDate = p.payment.receivedAt || p.payment.createdAt;
    if (!paymentDate) return false;
    return isSameDayIST(new Date(paymentDate), today);
  });
  const dailyRevenue = dailyPayments.reduce((sum, p) => sum + parseFloat(p.payment.amount.toString()), 0);

  // Calculate weekly revenue
  const weeklyPayments = allPayments.filter((p) => {
    if (!p.payment.receivedAt && !p.payment.createdAt) return false;
    const paymentDate = p.payment.receivedAt || p.payment.createdAt;
    if (!paymentDate) return false;
    return new Date(paymentDate) >= weekStart;
  });
  const weeklyRevenue = weeklyPayments.reduce((sum, p) => sum + parseFloat(p.payment.amount.toString()), 0);

  // Calculate monthly revenue
  const monthlyPayments = allPayments.filter((p) => {
    if (!p.payment.receivedAt && !p.payment.createdAt) return false;
    const paymentDate = p.payment.receivedAt || p.payment.createdAt;
    if (!paymentDate) return false;
    return new Date(paymentDate) >= monthStart;
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
    conditions.push(eq(payments.method, filters.paymentMethod));
  }

  // Apply source filter - we'll filter in post-processing for test/pharmacy
  // since they're determined by invoice items
  const sourceFilter = filters?.source && filters.source !== 'all' ? filters.source : null;

  // Build query with all conditions
  // Select only needed appointment fields to avoid issues with missing columns like reference_number
  const query = db
    .select({
      payment: payments,
      invoice: invoices,
      appointment: {
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        hospitalId: appointments.hospitalId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
      },
      // encounter: ipdEncounters, // Removed - invoices table doesn't have encounterId
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .leftJoin(appointments, eq(invoices.appointmentId, appointments.id))
    .where(and(...conditions))
    .orderBy(desc(sql`COALESCE(${payments.receivedAt}, ${payments.createdAt})`));

  // Apply pagination
  let results;
  if (filters?.limit || filters?.offset) {
    if (filters?.limit && filters?.offset) {
      results = await query.limit(filters.limit).offset(filters.offset);
    } else if (filters?.limit) {
      results = await query.limit(filters.limit);
    } else if (filters?.offset) {
      results = await query.offset(filters.offset);
    } else {
      results = await query;
    }
  } else {
    results = await query;
  }

  // Get invoice items for all invoices to determine source
  const invoiceIds = results.map(r => r.invoice?.id).filter(Boolean) as number[];
  const itemsMap = new Map<number, string[]>();
  
  if (invoiceIds.length > 0) {
    const allItems = await db
      .select()
      .from(invoiceItems)
      .where(inArray(invoiceItems.invoiceId, invoiceIds));
    
    allItems.forEach(item => {
      if (!itemsMap.has(item.invoiceId)) {
        itemsMap.set(item.invoiceId, []);
      }
      itemsMap.get(item.invoiceId)!.push(item.type);
    });
  }

  // Helper function to determine source from invoice
  // Note: Appointments are technically part of OPD (Outpatient Department), but we show them separately
  // for better tracking and analytics. OPD here refers to other outpatient services that aren't appointments.
  const determineSource = (r: typeof results[0]): string => {
    // Check if invoice has appointmentId - this is the most reliable way to detect appointments
    if (r.invoice?.appointmentId || r.appointment) return 'appointment';
    // Note: IPD encounters can't be determined from invoices as invoices table doesn't have encounterId
    
    // Check invoice items to determine source
    const items = itemsMap.get(r.invoice?.id || 0) || [];
    if (items.some(type => type.includes('lab_test') || type.includes('lab'))) return 'test';
    if (items.some(type => type.includes('pharmacy') || type.includes('medicine') || type.includes('medication'))) return 'pharmacy';
    if (items.some(type => type.includes('consultation'))) return 'appointment';
    
    // OPD: Other outpatient services (walk-ins, consultations without appointments, etc.)
    return 'opd';
  };

  // Fetch patient and doctor names for appointments
  const patientIds = new Set<number>();
  const doctorIds = new Set<number>();
  results.forEach((r) => {
    if (r.appointment?.patientId) patientIds.add(r.appointment.patientId);
    if (r.appointment?.doctorId) doctorIds.add(r.appointment.doctorId);
    if (r.invoice?.patientId) patientIds.add(r.invoice.patientId);
  });

  // Batch fetch patient names
  const patientNamesMap = new Map<number, string>();
  if (patientIds.size > 0) {
    const patientList = await db
      .select({
        id: patients.id,
        userId: patients.userId,
      })
      .from(patients)
      .where(sql`${patients.id} IN (${sql.join(Array.from(patientIds).map(id => sql`${id}`), sql`, `)})`);
    
    const userIds = patientList.map(p => p.userId).filter(Boolean);
    if (userIds.length > 0) {
      const userList = await db
        .select({
          id: users.id,
          fullName: users.fullName,
        })
        .from(users)
        .where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
      
      const userIdToName = new Map(userList.map(u => [u.id, u.fullName]));
      patientList.forEach(p => {
        if (p.userId && userIdToName.has(p.userId)) {
          patientNamesMap.set(p.id, userIdToName.get(p.userId)!);
        }
      });
    }
  }

  // Batch fetch doctor names
  const doctorNamesMap = new Map<number, string>();
  if (doctorIds.size > 0) {
    const doctorList = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
      })
      .from(doctors)
      .where(sql`${doctors.id} IN (${sql.join(Array.from(doctorIds).map(id => sql`${id}`), sql`, `)})`);
    
    const userIds = doctorList.map(d => d.userId).filter(Boolean);
    if (userIds.length > 0) {
      const userList = await db
        .select({
          id: users.id,
          fullName: users.fullName,
        })
        .from(users)
        .where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
      
      const userIdToName = new Map(userList.map(u => [u.id, u.fullName]));
      doctorList.forEach(d => {
        if (d.userId && userIdToName.has(d.userId)) {
          doctorNamesMap.set(d.id, userIdToName.get(d.userId)!);
        }
      });
    }
  }

  // Format the results and apply source filter if needed
  let formattedResults = results
    .filter((r) => r.payment && r.invoice) // Only include payments with invoices
    .map((r) => {
      const source = determineSource(r);
      const patientId = r.appointment?.patientId || r.invoice?.patientId || null;
      const doctorId = r.appointment?.doctorId || null;
      const patientName = patientId ? patientNamesMap.get(patientId) : null;
      const doctorName = doctorId ? doctorNamesMap.get(doctorId) : null;
      
      // Build enriched notes
      let enrichedNotes = r.payment.notes || '';
      if (patientName || doctorName) {
        const parts: string[] = [];
        if (patientName) parts.push(`Patient: ${patientName}`);
        if (doctorName) parts.push(`Doctor: ${doctorName}`);
        if (enrichedNotes) {
          enrichedNotes = `${enrichedNotes} | ${parts.join(', ')}`;
        } else {
          enrichedNotes = parts.join(', ');
        }
      }
      
      // Generate transaction ID if reference is missing
      // Format: PAY + hospital code + date + time + sequence (using payment ID)
      let transactionId = r.payment.reference;
      if (!transactionId) {
        const paymentDate = r.payment.receivedAt || r.payment.createdAt || new Date();
        const date = new Date(paymentDate);
        const hospitalId = r.invoice?.hospitalId || 0;
        const hospitalCode = String(hospitalId).padStart(4, '0');
        const year = String(date.getFullYear()).slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        const seq = String(r.payment.id).padStart(3, '0');
        transactionId = `PAY${hospitalCode}${year}${month}${day}${hour}${minute}${seq}`;
      }
      
      return {
    id: r.payment.id,
    amount: parseFloat(r.payment.amount.toString()),
        paymentMethod: r.payment.method || 'unknown',
        status: 'completed' as const, // Payments are always completed when recorded
    receivedAt: r.payment.receivedAt || r.payment.createdAt,
    invoiceNumber: r.invoice?.invoiceNumber,
    invoiceId: r.invoice?.id,
        source,
        sourceId: r.appointment?.id || r.invoice?.appointmentId || null,
        patientId,
        notes: enrichedNotes || null,
        transactionId,
      };
    });

  // Apply source filter in post-processing
  if (sourceFilter) {
    if (sourceFilter === 'appointment') {
      formattedResults = formattedResults.filter(r => r.source === 'appointment');
    } else if (sourceFilter === 'ipd') {
      formattedResults = formattedResults.filter(r => r.source === 'ipd');
    } else if (sourceFilter === 'test') {
      formattedResults = formattedResults.filter(r => r.source === 'test');
    } else if (sourceFilter === 'pharmacy') {
      formattedResults = formattedResults.filter(r => r.source === 'pharmacy');
    } else if (sourceFilter === 'opd') {
      formattedResults = formattedResults.filter(r => r.source === 'opd');
    }
  }

  return formattedResults;
};

/**
 * Get revenue summary by source
 */
export const getRevenueBySource = async (hospitalId: number, startDate?: Date, endDate?: Date) => {
  // Select only needed appointment fields to avoid issues with missing columns like reference_number
  const allPayments = await db
    .select({
      payment: payments,
      invoice: invoices,
      appointment: {
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        hospitalId: appointments.hospitalId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
      },
      // encounter: ipdEncounters, // Removed - invoices table doesn't have encounterId
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .leftJoin(appointments, eq(invoices.appointmentId, appointments.id))
    .where(eq(invoices.hospitalId, hospitalId));

  // Filter by date if provided
  let filteredPayments = allPayments;
  if (startDate || endDate) {
    filteredPayments = allPayments.filter((p) => {
      const paymentDate = p.payment.receivedAt || p.payment.createdAt;
      if (!paymentDate) return false;
      const date = new Date(paymentDate);
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    });
  }

  // Get invoice items to determine source
  const invoiceIds = filteredPayments.map(p => p.invoice?.id).filter(Boolean) as number[];
  const itemsMap = new Map<number, string[]>();
  
  if (invoiceIds.length > 0) {
    const allItems = await db
      .select()
      .from(invoiceItems)
      .where(inArray(invoiceItems.invoiceId, invoiceIds));
    
    allItems.forEach(item => {
      if (!itemsMap.has(item.invoiceId)) {
        itemsMap.set(item.invoiceId, []);
      }
      itemsMap.get(item.invoiceId)!.push(item.type);
    });
  }

  // Helper function to determine source
  const determineSource = (p: typeof filteredPayments[0]): string => {
    // Check if invoice has appointmentId - this is the most reliable way to detect appointments
    if (p.invoice?.appointmentId || p.appointment) return 'appointment';
    // Note: IPD encounters can't be determined from invoices as invoices table doesn't have encounterId
    
    const items = itemsMap.get(p.invoice?.id || 0) || [];
    if (items.some(type => type.includes('lab_test') || type.includes('lab'))) return 'test';
    if (items.some(type => type.includes('pharmacy') || type.includes('medicine') || type.includes('medication'))) return 'pharmacy';
    if (items.some(type => type.includes('consultation'))) return 'appointment';
    
    return 'opd';
  };

  // Group by source
  const bySource = {
    appointment: 0,
    ipd: 0,
    opd: 0,
    test: 0,
    pharmacy: 0,
    total: 0,
  };

  filteredPayments.forEach((p) => {
    const amount = parseFloat(p.payment.amount.toString());
    bySource.total += amount;
    
    const source = determineSource(p);
    if (source === 'appointment') {
      bySource.appointment += amount;
    } else if (source === 'ipd') {
      bySource.ipd += amount;
    } else if (source === 'test') {
      bySource.test += amount;
    } else if (source === 'pharmacy') {
      bySource.pharmacy += amount;
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
      const paymentDate = p.payment.receivedAt || p.payment.createdAt;
      if (!paymentDate) return false;
      const date = new Date(paymentDate);
      if (startDate && paymentDate < startDate) return false;
      if (endDate && paymentDate > endDate) return false;
      return true;
    });
  }

  // Group by payment method
  const byMethod: Record<string, number> = {};

  filteredPayments.forEach((p) => {
    const method = p.payment.method || 'unknown';
    const amount = parseFloat(p.payment.amount.toString());
    byMethod[method] = (byMethod[method] || 0) + amount;
  });

  return byMethod;
};
