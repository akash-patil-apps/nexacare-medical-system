import express from 'express';
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from '../middleware/auth';
import * as billingService from '../services/billing.service';
import * as billingPdfService from '../services/billing-pdf.service';

const router = express.Router();

// Helper to get hospital ID from user
const getHospitalId = async (user: any): Promise<number> => {
  const { hospitals, receptionists, doctors, nurses } = await import('../../shared/schema');
  const { db } = await import('../db');
  const { eq } = await import('drizzle-orm');
  
  if (user.role?.toUpperCase() === 'HOSPITAL' || user.role?.toUpperCase() === 'ADMIN') {
    const [hospital] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.userId, user.id))
      .limit(1);
    if (hospital) return hospital.id;
  } else if (user.role?.toUpperCase() === 'RECEPTIONIST') {
    const [receptionist] = await db
      .select()
      .from(receptionists)
      .where(eq(receptionists.userId, user.id))
      .limit(1);
    if (receptionist?.hospitalId) return receptionist.hospitalId;
  } else if (user.role?.toUpperCase() === 'DOCTOR') {
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, user.id))
      .limit(1);
    if (doctor?.hospitalId) return doctor.hospitalId;
  } else if (user.role?.toUpperCase() === 'NURSE') {
    const [nurse] = await db
      .select()
      .from(nurses)
      .where(eq(nurses.userId, user.id))
      .limit(1);
    if (nurse?.hospitalId) return nurse.hospitalId;
  }
  throw new Error('Hospital ID not found');
};

// Create invoice for appointment
router.post('/opd/invoices', authenticateToken, authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req.user);
    const { appointmentId, patientId, items, discountAmount, discountType, discountReason, taxAmount } = req.body;
    
    // If patientId is provided but no appointmentId, create lab test invoice
    if (patientId && !appointmentId) {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'items are required for lab test invoices' });
      }
      
      const invoice = await billingService.createLabTestInvoice({
        hospitalId,
        patientId,
        items,
        discountAmount,
        discountType,
        discountReason,
        taxAmount,
        actorUserId: req.user?.id,
        actorRole: req.user?.role || 'UNKNOWN',
        ipAddress: req.ip || req.socket.remoteAddress || undefined,
        userAgent: req.get('user-agent') || undefined,
      });
      
      return res.json(invoice);
    }
    
    // Otherwise, create appointment invoice (existing logic)
    if (!appointmentId) {
      return res.status(400).json({ message: 'appointmentId or patientId is required' });
    }
    
    // Get patientId from appointment
    const { appointments } = await import('../../shared/schema');
    const { db } = await import('../db');
    const { eq } = await import('drizzle-orm');
    
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    const invoice = await billingService.createInvoice({
      hospitalId,
      patientId: appointment.patientId,
      appointmentId,
      items,
      discountAmount,
      discountType,
      discountReason,
      taxAmount,
      actorUserId: req.user?.id,
      actorRole: req.user?.role || 'UNKNOWN',
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });
    
    res.json(invoice);
  } catch (err: any) {
    console.error('❌ Create invoice error:', err);
    
    // Better error handling
    if (err.message?.includes('Hospital ID not found')) {
      return res.status(403).json({ message: 'You are not authorized to create invoices. Hospital ID not found for your account.' });
    }
    if (err.message?.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    
    const statusCode = err.message?.includes('authorized') || err.message?.includes('permission') ? 403 : 400;
    res.status(statusCode).json({ message: err.message || 'Failed to create invoice' });
  }
});

// Get invoice by ID
router.get('/opd/invoices/:invoiceId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await billingService.getInvoiceById(+invoiceId);
    res.json(invoice);
  } catch (err: any) {
    console.error('❌ Get invoice error:', err);
    
    // Check for network/database connection errors
    const errorCode = err?.code || err?.cause?.code || '';
    const isNetworkError = ['ENETDOWN', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND'].some(
      code => errorCode.includes(code)
    );
    
    if (isNetworkError) {
      return res.status(503).json({ 
        message: 'Database connection issue. Please try again in a moment.',
        error: 'NETWORK_ERROR',
        retryable: true
      });
    }
    
    // Check if it's a "not found" error
    if (err.message?.includes('not found') || err.message?.includes('Invoice not found')) {
      return res.status(404).json({ message: err.message || 'Invoice not found' });
    }
    
    res.status(400).json({ message: err.message || 'Failed to get invoice' });
  }
});

// Get invoices with filters
router.get('/opd/invoices', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req.user);
    const { patientId, appointmentId, status, dateFrom, dateTo } = req.query;
    
    const invoices = await billingService.getInvoices({
      hospitalId,
      patientId: patientId ? +patientId : undefined,
      appointmentId: appointmentId ? +appointmentId : undefined,
      status: status as string | undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });
    
    res.json(invoices);
  } catch (err: any) {
    console.error('❌ Get invoices error:', err);
    
    // Check for network/database connection errors
    const errorCode = err?.code || err?.cause?.code || '';
    const isNetworkError = ['ENETDOWN', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND'].some(
      code => errorCode.includes(code)
    );
    
    if (isNetworkError) {
      return res.status(503).json({ 
        message: 'Database connection issue. Please try again in a moment.',
        error: 'NETWORK_ERROR',
        retryable: true
      });
    }
    
    res.status(400).json({ message: err.message || 'Failed to get invoices' });
  }
});

// Issue invoice (change status from draft to issued)
router.patch('/opd/invoices/:invoiceId/issue', authenticateToken, authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await billingService.issueInvoice(
      +invoiceId,
      req.user?.id,
      req.user?.role || 'UNKNOWN'
    );
    res.json(invoice);
  } catch (err: any) {
    console.error('❌ Issue invoice error:', err);
    res.status(400).json({ message: err.message || 'Failed to issue invoice' });
  }
});

// Record payment
router.post('/opd/invoices/:invoiceId/payments', authenticateToken, authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { invoiceId } = req.params;
    const { method, amount, reference, notes, receivedAt } = req.body;
    
    if (!method || !amount) {
      return res.status(400).json({ message: 'method and amount are required' });
    }
    
    if (!['cash', 'card', 'upi', 'online', 'gpay', 'phonepe'].includes(method)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }
    
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const result = await billingService.recordPayment({
      invoiceId: +invoiceId,
      method,
      amount: parseFloat(amount),
      reference,
      notes,
      receivedByUserId: req.user.id,
      actorUserId: req.user.id,
      actorRole: req.user.role || 'UNKNOWN',
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
      receivedAt: receivedAt ? new Date(receivedAt) : undefined, // Use provided date for online payments, undefined for counter payments
    });
    
    res.json(result);
  } catch (err: any) {
    console.error('❌ Record payment error:', err);
    res.status(400).json({ message: err.message || 'Failed to record payment' });
  }
});

// Process refund
router.post('/opd/invoices/:invoiceId/refund', authenticateToken, authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { invoiceId } = req.params;
    const { amount, reason } = req.body;
    
    if (!amount || !reason) {
      return res.status(400).json({ message: 'amount and reason are required' });
    }
    
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const result = await billingService.processRefund({
      invoiceId: +invoiceId,
      amount: parseFloat(amount),
      reason,
      processedByUserId: req.user.id,
      actorUserId: req.user.id,
      actorRole: req.user.role || 'UNKNOWN',
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
    });
    
    res.json(result);
  } catch (err: any) {
    console.error('❌ Process refund error:', err);
    res.status(400).json({ message: err.message || 'Failed to process refund' });
  }
});

// Patient: Get my invoices
router.get('/my/invoices', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Get patient ID from user
    const { patients } = await import('../../shared/schema');
    const { db } = await import('../db');
    const { eq } = await import('drizzle-orm');
    
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, req.user.id))
      .limit(1);
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    const invoiceList = await billingService.getInvoices({
      patientId: patient.id,
    });
    
    res.json(invoiceList);
  } catch (err: any) {
    console.error('❌ Get my invoices error:', err);
    res.status(400).json({ message: err.message || 'Failed to get invoices' });
  }
});

// Generate invoice PDF
router.get('/opd/invoices/:invoiceId/pdf', authenticateToken, authorizeRoles('ADMIN', 'HOSPITAL', 'RECEPTIONIST', 'DOCTOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const { invoiceId } = req.params;
    const pdfBuffer = await billingPdfService.generateInvoicePDF(+invoiceId);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('❌ Generate PDF error:', err);
    res.status(400).json({ message: err.message || 'Failed to generate PDF' });
  }
});

export default router;

