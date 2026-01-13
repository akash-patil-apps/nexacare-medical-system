import { db } from '../db';
import {
  invoices,
  invoiceItems,
  payments,
  refunds,
  appointments,
  doctors,
  hospitals,
} from '../../shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import * as auditService from './audit.service';
import { retryDbOperation } from '../utils/db-retry';

/**
 * Generate unique invoice number for hospital
 * Format: HOSP-YYYY-000001
 */
const generateInvoiceNumber = async (hospitalId: number): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `HOSP-${year}-`;
  
  // Get the last invoice number for this hospital and year
  const lastInvoice = await db
    .select()
    .from(invoices)
    .where(sql`${invoices.hospitalId} = ${hospitalId} AND ${invoices.invoiceNumber} LIKE ${prefix + '%'}`)
    .orderBy(desc(invoices.id))
    .limit(1);
  
  let sequence = 1;
  if (lastInvoice.length > 0 && lastInvoice[0].invoiceNumber) {
    const lastNumber = lastInvoice[0].invoiceNumber.split('-').pop();
    if (lastNumber) {
      sequence = parseInt(lastNumber, 10) + 1;
    }
  }
  
  return `${prefix}${sequence.toString().padStart(6, '0')}`;
};

/**
 * Calculate invoice totals
 */
const calculateTotals = (subtotal: number, discountAmount: number, discountType: 'amount' | 'percent' | null, taxAmount: number = 0) => {
  let finalDiscount = discountAmount;
  
  if (discountType === 'percent' && discountAmount > 0) {
    finalDiscount = (subtotal * discountAmount) / 100;
  }
  
  const total = subtotal - finalDiscount + taxAmount;
  return {
    subtotal,
    discountAmount: finalDiscount,
    taxAmount,
    total: Math.max(0, total), // Ensure total is not negative
  };
};

/**
 * Create invoice for appointment
 */
export const createInvoice = async (data: {
  hospitalId: number;
  patientId: number;
  appointmentId: number;
  items?: Array<{
    type: 'consultation_fee' | 'registration_fee';
    description: string;
    quantity?: number;
    unitPrice: number;
  }>;
  discountAmount?: number;
  discountType?: 'amount' | 'percent';
  discountReason?: string;
  taxAmount?: number;
  actorUserId?: number;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  // Get appointment and doctor details
  const appointment = await db
    .select({
      appointment: appointments,
      doctor: doctors,
    })
    .from(appointments)
    .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(eq(appointments.id, data.appointmentId))
    .limit(1);
  
  if (appointment.length === 0) {
    throw new Error('Appointment not found');
  }
  
  const apt = appointment[0];
  
  // Check if invoice already exists for this appointment
  const existingInvoice = await db
    .select()
    .from(invoices)
    .where(eq(invoices.appointmentId, data.appointmentId))
    .limit(1);
  
  if (existingInvoice.length > 0) {
    throw new Error('Invoice already exists for this appointment');
  }
  
  // Build invoice items
  const invoiceItemsData = data.items || [];
  
  // If no items provided, add consultation fee from doctor
  if (invoiceItemsData.length === 0) {
    const consultationFee = apt.doctor?.consultationFee 
      ? parseFloat(apt.doctor.consultationFee.toString())
      : 500; // Default fee if not set
    
    invoiceItemsData.push({
      type: 'consultation_fee',
      description: `Consultation fee - ${apt.doctor?.specialty || 'General'}`,
      quantity: 1,
      unitPrice: consultationFee,
    });
  }
  
  // Calculate subtotal
  const subtotal = invoiceItemsData.reduce((sum, item) => {
    return sum + (item.unitPrice * (item.quantity || 1));
  }, 0);
  
  // Calculate totals
  const totals = calculateTotals(
    subtotal,
    data.discountAmount || 0,
    data.discountType || null,
    data.taxAmount || 0
  );
  
  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(data.hospitalId);
  
  // Create invoice
  const [invoice] = await db
    .insert(invoices)
    .values({
      hospitalId: data.hospitalId,
      patientId: data.patientId,
      appointmentId: data.appointmentId,
      invoiceNumber,
      status: 'draft',
      subtotal: totals.subtotal.toString(),
      discountAmount: totals.discountAmount.toString(),
      discountType: data.discountType || null,
      discountReason: data.discountReason || null,
      taxAmount: totals.taxAmount.toString(),
      total: totals.total.toString(),
      paidAmount: '0',
      balanceAmount: totals.total.toString(),
      currency: 'INR',
      createdAt: sql`NOW()`,
    })
    .returning();
  
  // Create invoice items
  const items = await Promise.all(
    invoiceItemsData.map(item =>
      db.insert(invoiceItems).values({
        invoiceId: invoice.id,
        type: item.type,
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice.toString(),
        amount: (item.unitPrice * (item.quantity || 1)).toString(),
        createdAt: sql`NOW()`,
      }).returning()
    )
  );
  
  // Log audit event
  if (data.actorUserId && data.actorRole) {
    await auditService.logPatientAudit({
      hospitalId: data.hospitalId,
      patientId: data.patientId,
      actorUserId: data.actorUserId,
      actorRole: data.actorRole,
      action: 'create_invoice',
      entityType: 'invoice',
      entityId: invoice.id,
      before: null,
      after: {
        invoiceId: invoice.id,
        invoiceNumber,
        appointmentId: data.appointmentId,
        total: totals.total,
        status: 'draft',
      },
      message: `Invoice ${invoiceNumber} created for appointment ${data.appointmentId}. Total: ₹${totals.total}`,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }
  
  return {
    ...invoice,
    items: items.map(i => i[0]),
  };
};

/**
 * Issue invoice (change status from draft to issued)
 */
export const issueInvoice = async (invoiceId: number, actorUserId?: number, actorRole?: string) => {
  const [invoice] = await db
    .update(invoices)
    .set({
      status: 'issued',
      issuedAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(invoices.id, invoiceId))
    .returning();
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  // Log audit event
  if (actorUserId && actorRole) {
    await auditService.logPatientAudit({
      hospitalId: invoice.hospitalId || undefined,
      patientId: invoice.patientId,
      actorUserId,
      actorRole,
      action: 'issue_invoice',
      entityType: 'invoice',
      entityId: invoiceId,
      before: { status: 'draft' },
      after: { status: 'issued' },
      message: `Invoice ${invoice.invoiceNumber} issued`,
      ipAddress: undefined,
      userAgent: undefined,
    });
  }
  
  return invoice;
};

/**
 * Record payment
 */
export const recordPayment = async (data: {
  invoiceId: number;
  method: 'cash' | 'card' | 'upi' | 'online';
  amount: number;
  reference?: string;
  notes?: string;
  receivedByUserId: number;
  actorUserId?: number;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  receivedAt?: Date | string; // Optional: for online payments, use actual payment date
}) => {
  // Get invoice
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, data.invoiceId))
    .limit(1);
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  if (invoice.status === 'void') {
    throw new Error('Cannot record payment for void invoice');
  }
  
  const currentPaidAmount = parseFloat(invoice.paidAmount || '0');
  const total = parseFloat(invoice.total || '0');
  const newPaidAmount = currentPaidAmount + data.amount;
  const balanceAmount = total - newPaidAmount;
  
  // Determine new status
  let newStatus = invoice.status;
  if (newPaidAmount >= total) {
    newStatus = 'paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'partially_paid';
  }
  
  // Determine payment date: use provided date for online payments, otherwise use current time
  let paymentDate: Date;
  if (data.receivedAt) {
    paymentDate = typeof data.receivedAt === 'string' ? new Date(data.receivedAt) : data.receivedAt;
  } else {
    paymentDate = new Date(); // For counter payments, use current time
  }
  
  // Create payment record
  const [payment] = await db
    .insert(payments)
    .values({
      invoiceId: data.invoiceId,
      method: data.method,
      amount: data.amount.toString(),
      reference: data.reference || null,
      receivedByUserId: data.receivedByUserId,
      receivedAt: paymentDate,
      notes: data.notes || null,
      createdAt: sql`NOW()`,
    })
    .returning();
  
  // Update invoice
  const [updatedInvoice] = await db
    .update(invoices)
    .set({
      paidAmount: newPaidAmount.toString(),
      balanceAmount: balanceAmount.toString(),
      status: newStatus,
      updatedAt: sql`NOW()`,
    })
    .where(eq(invoices.id, data.invoiceId))
    .returning();
  
  // Log audit event
  if (data.actorUserId && data.actorRole) {
    await auditService.logPatientAudit({
      hospitalId: invoice.hospitalId || undefined,
      patientId: invoice.patientId,
      actorUserId: data.actorUserId,
      actorRole: data.actorRole,
      action: 'record_payment',
      entityType: 'payment',
      entityId: payment.id,
      before: {
        invoiceId: data.invoiceId,
        paidAmount: currentPaidAmount,
        status: invoice.status,
      },
      after: {
        invoiceId: data.invoiceId,
        paidAmount: newPaidAmount,
        status: newStatus,
        paymentMethod: data.method,
        paymentAmount: data.amount,
      },
      message: `Payment of ₹${data.amount} recorded via ${data.method} for invoice ${invoice.invoiceNumber}`,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }
  
  return {
    payment,
    invoice: updatedInvoice,
  };
};

/**
 * Get invoice by ID with items and payments
 */
export const getInvoiceById = async (invoiceId: number) => {
  // Retry database operation with exponential backoff for transient network errors
  const [invoice] = await retryDbOperation(
    async () => {
      return await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);
    },
    {
      maxRetries: 3,
      initialDelay: 200,
      maxDelay: 2000,
    }
  );
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  const items = await retryDbOperation(
    async () => {
      return await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceId));
    },
    {
      maxRetries: 3,
      initialDelay: 200,
      maxDelay: 2000,
    }
  );
  
  const paymentRecords = await retryDbOperation(
    async () => {
      return await db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, invoiceId))
        .orderBy(desc(payments.receivedAt));
    },
    {
      maxRetries: 3,
      initialDelay: 200,
      maxDelay: 2000,
    }
  );
  
  return {
    ...invoice,
    items,
    payments: paymentRecords,
  };
};

/**
 * Get invoices with filters
 */
export const getInvoices = async (filters: {
  hospitalId?: number;
  patientId?: number;
  appointmentId?: number;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) => {
  const conditions = [];
  
  if (filters.hospitalId) {
    conditions.push(eq(invoices.hospitalId, filters.hospitalId));
  }
  if (filters.patientId) {
    conditions.push(eq(invoices.patientId, filters.patientId));
  }
  if (filters.appointmentId) {
    conditions.push(eq(invoices.appointmentId, filters.appointmentId));
  }
  if (filters.status) {
    conditions.push(eq(invoices.status, filters.status));
  }
  if (filters.dateFrom) {
    conditions.push(sql`${invoices.createdAt} >= ${filters.dateFrom}`);
  }
  if (filters.dateTo) {
    conditions.push(sql`${invoices.createdAt} <= ${filters.dateTo}`);
  }
  
  // Retry database operation with exponential backoff for transient network errors
  const invoiceList = await retryDbOperation(
    async () => {
      return await db
        .select()
        .from(invoices)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(invoices.createdAt));
    },
    {
      maxRetries: 3,
      initialDelay: 200,
      maxDelay: 2000,
    }
  );
  
  return invoiceList;
};

/**
 * Process refund
 */
export const processRefund = async (data: {
  invoiceId: number;
  amount: number;
  reason: string;
  processedByUserId: number;
  actorUserId?: number;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  // Get invoice
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, data.invoiceId))
    .limit(1);
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  const paidAmount = parseFloat(invoice.paidAmount || '0');
  if (paidAmount === 0) {
    throw new Error('Cannot refund unpaid invoice');
  }
  
  if (data.amount > paidAmount) {
    throw new Error('Refund amount cannot exceed paid amount');
  }
  
  // Create refund record
  const [refund] = await db
    .insert(refunds)
    .values({
      invoiceId: data.invoiceId,
      amount: data.amount.toString(),
      reason: data.reason,
      processedByUserId: data.processedByUserId,
      processedAt: sql`NOW()`,
      createdAt: sql`NOW()`,
    })
    .returning();
  
  // Update invoice
  const newPaidAmount = paidAmount - data.amount;
  const newBalanceAmount = parseFloat(invoice.total || '0') - newPaidAmount;
  
  const [updatedInvoice] = await db
    .update(invoices)
    .set({
      paidAmount: newPaidAmount.toString(),
      balanceAmount: newBalanceAmount.toString(),
      status: newPaidAmount === 0 ? 'refunded' : 'partially_paid',
      updatedAt: sql`NOW()`,
    })
    .where(eq(invoices.id, data.invoiceId))
    .returning();
  
  // Log audit event
  if (data.actorUserId && data.actorRole) {
    await auditService.logPatientAudit({
      hospitalId: invoice.hospitalId || undefined,
      patientId: invoice.patientId,
      actorUserId: data.actorUserId,
      actorRole: data.actorRole,
      action: 'process_refund',
      entityType: 'refund',
      entityId: refund.id,
      before: {
        invoiceId: data.invoiceId,
        paidAmount,
        status: invoice.status,
      },
      after: {
        invoiceId: data.invoiceId,
        paidAmount: newPaidAmount,
        status: updatedInvoice.status,
        refundAmount: data.amount,
      },
      message: `Refund of ₹${data.amount} processed for invoice ${invoice.invoiceNumber}. Reason: ${data.reason}`,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }
  
  return {
    refund,
    invoice: updatedInvoice,
  };
};






