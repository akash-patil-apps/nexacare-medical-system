// server/services/patient-transactions.service.ts
import { db } from '../db';
import { invoices, payments, invoiceItems, appointments, ipdEncounters } from '../../shared/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

/**
 * Get all transactions (invoices and payments) for a patient
 * This is used for generating discharge summaries and transaction logs
 */
export const getPatientTransactions = async (patientId: number, filters?: {
  startDate?: Date;
  endDate?: Date;
  includeAppointments?: boolean;
  includeIPD?: boolean;
}) => {
  const conditions = [or(
    eq(invoices.patientId, patientId),
    sql`EXISTS (SELECT 1 FROM appointments WHERE appointments.id = ${invoices.appointmentId} AND appointments.patient_id = ${patientId})`,
    sql`EXISTS (SELECT 1 FROM ipd_encounters WHERE ipd_encounters.id = ${invoices.encounter_id} AND ipd_encounters.patient_id = ${patientId})`
  )];

  // Apply date filters
  if (filters?.startDate) {
    conditions.push(sql`${invoices.createdAt} >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    conditions.push(sql`${invoices.createdAt} <= ${filters.endDate}`);
  }

  // Get all invoices for this patient
  const patientInvoices = await db
    .select({
      invoice: invoices,
      appointment: appointments,
      encounter: ipdEncounters,
    })
    .from(invoices)
    .leftJoin(appointments, eq(invoices.appointmentId, appointments.id))
    .leftJoin(ipdEncounters, eq(invoices.encounterId, ipdEncounters.id))
    .where(and(...conditions))
    .orderBy(desc(invoices.createdAt));

  // Get all payments for these invoices
  const invoiceIds = patientInvoices.map(inv => inv.invoice.id);
  const allPayments = invoiceIds.length > 0 ? await db
    .select()
    .from(payments)
    .where(sql`${payments.invoiceId} IN (${sql.join(invoiceIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(desc(payments.createdAt)) : [];

  // Get all invoice items
  const allItems = invoiceIds.length > 0 ? await db
    .select()
    .from(invoiceItems)
    .where(sql`${invoiceItems.invoiceId} IN (${sql.join(invoiceIds.map(id => sql`${id}`), sql`, `)})`) : [];

  // Group payments and items by invoice
  const paymentsByInvoice: Record<number, typeof allPayments> = {};
  const itemsByInvoice: Record<number, typeof allItems> = {};

  allPayments.forEach(payment => {
    if (!paymentsByInvoice[payment.invoiceId]) {
      paymentsByInvoice[payment.invoiceId] = [];
    }
    paymentsByInvoice[payment.invoiceId].push(payment);
  });

  allItems.forEach(item => {
    if (!itemsByInvoice[item.invoiceId]) {
      itemsByInvoice[item.invoiceId] = [];
    }
    itemsByInvoice[item.invoiceId].push(item);
  });

  // Format the response
  return patientInvoices.map(inv => ({
    invoice: inv.invoice,
    appointment: inv.appointment,
    encounter: inv.encounter,
    items: itemsByInvoice[inv.invoice.id] || [],
    payments: paymentsByInvoice[inv.invoice.id] || [],
  }));
};

/**
 * Get transaction summary for a patient (total billed, paid, balance)
 */
export const getPatientTransactionSummary = async (patientId: number) => {
  const transactions = await getPatientTransactions(patientId);

  let totalBilled = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  transactions.forEach(txn => {
    const invoice = txn.invoice;
    totalBilled += parseFloat(invoice.total || '0');
    totalPaid += parseFloat(invoice.paidAmount || '0');
    totalBalance += parseFloat(invoice.balanceAmount || '0');
  });

  return {
    totalBilled,
    totalPaid,
    totalBalance,
    transactionCount: transactions.length,
    invoices: transactions.map(t => ({
      id: t.invoice.id,
      invoiceNumber: t.invoice.invoiceNumber,
      total: parseFloat(t.invoice.total || '0'),
      paid: parseFloat(t.invoice.paidAmount || '0'),
      balance: parseFloat(t.invoice.balanceAmount || '0'),
      status: t.invoice.status,
      createdAt: t.invoice.createdAt,
      appointmentId: t.appointment?.id,
      encounterId: t.encounter?.id,
    })),
  };
};
