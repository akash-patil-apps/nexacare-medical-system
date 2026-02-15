// server/services/reporting.service.ts
import { db } from '../db';
import {
  appointments,
  labOrders,
  labReports,
  invoices,
  payments,
  ipdEncounters,
  opdQueueEntries,
  bedAllocations,
} from '../../shared/schema';
import { eq, and, gte, lte, sql, desc, count } from 'drizzle-orm';

/**
 * Get OPD operations report
 */
export const getOpdReport = async (filters: {
  hospitalId: number;
  dateFrom?: Date;
  dateTo?: Date;
  doctorId?: number;
}) => {
  const { hospitalId, dateFrom, dateTo, doctorId } = filters;

  let query = db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      appointmentDate: appointments.appointmentDate,
      status: appointments.status,
      type: appointments.type,
      createdAt: appointments.createdAt,
      checkedInAt: appointments.checkedInAt,
      completedAt: appointments.completedAt,
    })
    .from(appointments)
    .where(eq(appointments.hospitalId, hospitalId));

  const conditions = [eq(appointments.hospitalId, hospitalId)];

  if (dateFrom) {
    conditions.push(gte(sql`DATE(${appointments.appointmentDate})`, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(sql`DATE(${appointments.appointmentDate})`, dateTo));
  }
  if (doctorId) {
    conditions.push(eq(appointments.doctorId, doctorId));
  }

  query = (query as any).where(and(...conditions));

  const allAppointments = await query.orderBy(desc(appointments.appointmentDate));

  // Calculate statistics
  // No-show calculation (confirmed but never checked in and appointment time passed)
  const now = new Date();
  const noShows = allAppointments.filter((a: any) => {
    const status = (a.status || '').toLowerCase();
    const isConfirmed = status === 'confirmed' || status === 'pending';
    const neverCheckedIn = !a.checkedInAt;
    const appointmentDate = a.appointmentDate instanceof Date ? a.appointmentDate : new Date(a.appointmentDate);
    const isPast = appointmentDate < now;
    return isConfirmed && neverCheckedIn && isPast;
  });

  const stats = {
    total: allAppointments.length,
    pending: allAppointments.filter((a: any) => a.status === 'pending').length,
    confirmed: allAppointments.filter((a: any) => a.status === 'confirmed').length,
    checkedIn: allAppointments.filter((a: any) => a.status === 'checked-in' || a.status === 'attended').length,
    completed: allAppointments.filter((a: any) => a.status === 'completed').length,
    cancelled: allAppointments.filter((a: any) => a.status === 'cancelled').length,
    walkIn: allAppointments.filter((a: any) => a.type === 'walk-in').length,
    online: allAppointments.filter((a: any) => a.type === 'online' || a.type === 'consultation').length,
    noShow: noShows.length,
  };

  // Doctor-wise load
  const doctorLoad: Record<number, number> = {};
  allAppointments.forEach((apt: any) => {
    if (apt.doctorId) {
      doctorLoad[apt.doctorId] = (doctorLoad[apt.doctorId] || 0) + 1;
    }
  });

  return {
    appointments: allAppointments,
    statistics: stats,
    doctorLoad,
  };
};

/**
 * Get Lab report (TAT, orders by status, etc.)
 */
export const getLabReport = async (filters: {
  hospitalId: number;
  dateFrom?: Date;
  dateTo?: Date;
}) => {
  const { hospitalId, dateFrom, dateTo } = filters;

  let query = db
    .select()
    .from(labOrders)
    .where(eq(labOrders.hospitalId, hospitalId));

  const conditions = [eq(labOrders.hospitalId, hospitalId)];

  if (dateFrom) {
    conditions.push(gte(sql`DATE(${labOrders.createdAt})`, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(sql`DATE(${labOrders.createdAt})`, dateTo));
  }

  query = (query as any).where(and(...conditions));

  const allOrders = await query.orderBy(desc(labOrders.createdAt));

  // Calculate statistics
  const stats = {
    total: allOrders.length,
    ordered: allOrders.filter((o: any) => o.status === 'ordered').length,
    sampleCollected: allOrders.filter((o: any) => o.status === 'sample_collected').length,
    processing: allOrders.filter((o: any) => o.status === 'processing').length,
    completed: allOrders.filter((o: any) => o.status === 'completed').length,
    released: allOrders.filter((o: any) => o.status === 'released').length,
  };

  // Calculate TAT (Turnaround Time) for completed orders
  const completedOrders = allOrders.filter((o: any) => 
    o.status === 'completed' || o.status === 'released'
  );

  const tatData = completedOrders.map((order: any) => {
    const orderedAt = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
    const releasedAt = order.releasedAt 
      ? (order.releasedAt instanceof Date ? order.releasedAt : new Date(order.releasedAt))
      : new Date();
    const tatHours = (releasedAt.getTime() - orderedAt.getTime()) / (1000 * 60 * 60);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tatHours,
      orderedAt,
      releasedAt,
    };
  });

  const avgTat = tatData.length > 0
    ? tatData.reduce((sum, d) => sum + d.tatHours, 0) / tatData.length
    : 0;

  // Pending queue aging (how long orders have been pending)
  const pendingOrders = allOrders.filter((o: any) => 
    o.status === 'ordered' || o.status === 'sample_collected' || o.status === 'processing'
  );

  const agingData = pendingOrders.map((order: any) => {
    const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
    const now = new Date();
    const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      ageHours,
      createdAt,
    };
  });

  return {
    orders: allOrders,
    statistics: stats,
    tat: {
      average: avgTat,
      details: tatData,
    },
    pendingAging: agingData,
  };
};

/**
 * Get Finance report (OPD)
 */
export const getFinanceReport = async (filters: {
  hospitalId: number;
  dateFrom?: Date;
  dateTo?: Date;
}) => {
  const { hospitalId, dateFrom, dateTo } = filters;

  let query = db
    .select()
    .from(invoices)
    .where(eq(invoices.hospitalId, hospitalId));

  const conditions = [eq(invoices.hospitalId, hospitalId)];

  if (dateFrom) {
    conditions.push(gte(sql`DATE(${invoices.createdAt})`, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(sql`DATE(${invoices.createdAt})`, dateTo));
  }

  query = (query as any).where(and(...conditions));

  const allInvoices = await query.orderBy(desc(invoices.createdAt));

  // Get payments for these invoices
  const invoiceIds = allInvoices.map((inv: any) => inv.id);
  const allPayments = invoiceIds.length > 0
    ? await db
        .select()
        .from(payments)
        .where(sql`${payments.invoiceId} IN (${sql.join(invoiceIds.map(id => sql`${id}`), sql`, `)})`)
    : [];

  // Calculate statistics
  const totalBilled = allInvoices.reduce((sum, inv: any) => {
    return sum + parseFloat(inv.total || '0');
  }, 0);

  const totalPaid = allPayments.reduce((sum, pay: any) => {
    return sum + parseFloat(pay.amount || '0');
  }, 0);

  const totalDiscount = allInvoices.reduce((sum, inv: any) => {
    return sum + parseFloat(inv.discountAmount || '0');
  }, 0);

  const outstandingBalance = allInvoices.reduce((sum, inv: any) => {
    return sum + parseFloat(inv.balanceAmount || '0');
  }, 0);

  // Daily collections
  const dailyCollections: Record<string, number> = {};
  allPayments.forEach((pay: any) => {
    const date = pay.receivedAt instanceof Date 
      ? pay.receivedAt.toISOString().slice(0, 10)
      : new Date(pay.receivedAt).toISOString().slice(0, 10);
    dailyCollections[date] = (dailyCollections[date] || 0) + parseFloat(pay.amount || '0');
  });

  // Discounts by user
  const discountsByUser: Record<number, number> = {};
  allInvoices.forEach((inv: any) => {
    const discount = parseFloat(inv.discountAmount || '0');
    if (discount > 0 && inv.createdBy) {
      discountsByUser[inv.createdBy] = (discountsByUser[inv.createdBy] || 0) + discount;
    }
  });

  return {
    invoices: allInvoices,
    payments: allPayments,
    statistics: {
      totalBilled,
      totalPaid,
      totalDiscount,
      outstandingBalance,
      invoiceCount: allInvoices.length,
      paidInvoiceCount: allInvoices.filter((inv: any) => inv.status === 'paid').length,
      partiallyPaidCount: allInvoices.filter((inv: any) => inv.status === 'partially_paid').length,
      unpaidCount: allInvoices.filter((inv: any) => inv.status === 'issued' || inv.status === 'draft').length,
    },
    dailyCollections,
    discountsByUser,
  };
};

/**
 * Get IPD census report
 */
export const getIpdCensusReport = async (filters: {
  hospitalId: number;
  date?: Date;
}) => {
  const { hospitalId, date } = filters;

  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().slice(0, 10);

  // Get all IPD encounters
  const allEncounters = await db
    .select()
    .from(ipdEncounters)
    .where(eq(ipdEncounters.hospitalId, hospitalId))
    .orderBy(desc(ipdEncounters.admittedAt));

  // Filter encounters active on target date
  const activeOnDate = allEncounters.filter((enc: any) => {
    const admittedAt = enc.admittedAt instanceof Date ? enc.admittedAt : new Date(enc.admittedAt);
    const dischargedAt = enc.dischargedAt 
      ? (enc.dischargedAt instanceof Date ? enc.dischargedAt : new Date(enc.dischargedAt))
      : null;
    
    const admittedDate = admittedAt.toISOString().slice(0, 10);
    const dischargedDate = dischargedAt ? dischargedAt.toISOString().slice(0, 10) : null;
    
    // Active if admitted on or before target date and (not discharged or discharged after target date)
    return admittedDate <= dateStr && (!dischargedDate || dischargedDate >= dateStr);
  });

  // Get bed allocations for active encounters
  const encounterIds = activeOnDate.map((e: any) => e.id);
  const allocationsList = encounterIds.length > 0
    ? await db
        .select()
        .from(bedAllocations)
        .where(sql`${bedAllocations.encounterId} IN (${sql.join(encounterIds.map(id => sql`${id}`), sql`, `)})`)
    : [];

  // Group by ward/category (we'll need to join with beds/wards)
  const bedOccupancy: Record<string, number> = {};
  allocationsList.forEach((alloc: any) => {
    // This would need to join with beds/wards to get category
    // For now, just count by bed
    bedOccupancy[alloc.bedId] = (bedOccupancy[alloc.bedId] || 0) + 1;
  });

  // Admissions/discharges on target date
  const admissionsOnDate = allEncounters.filter((enc: any) => {
    const admittedAt = enc.admittedAt instanceof Date ? enc.admittedAt : new Date(enc.admittedAt);
    return admittedAt.toISOString().slice(0, 10) === dateStr;
  });

  const dischargesOnDate = allEncounters.filter((enc: any) => {
    if (!enc.dischargedAt) return false;
    const dischargedAt = enc.dischargedAt instanceof Date ? enc.dischargedAt : new Date(enc.dischargedAt);
    return dischargedAt.toISOString().slice(0, 10) === dateStr;
  });

  return {
    activeEncounters: activeOnDate,
    statistics: {
      totalActive: activeOnDate.length,
      admissionsOnDate: admissionsOnDate.length,
      dischargesOnDate: dischargesOnDate.length,
      bedOccupancy,
    },
    admissions: admissionsOnDate,
    discharges: dischargesOnDate,
  };
};

/**
 * Export report to CSV format
 */
export const exportReportToCsv = (data: any[], headers: string[]): string => {
  const csvRows: string[] = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  data.forEach((row: any) => {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
};
