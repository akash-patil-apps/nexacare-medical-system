// server/routes/payment-gateway.routes.ts
import { Router } from 'express';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import { paymentGatewayService } from '../services/payment-gateway.service';
import * as billingService from '../services/billing.service';
import { db } from '../db';
import { invoices, patients, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/payments/create-order
 * Create a payment order for an invoice
 */
router.post('/create-order', authorizeRoles('PATIENT', 'ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { invoiceId, amount } = req.body;

    if (!invoiceId || !amount) {
      return res.status(400).json({ message: 'invoiceId and amount are required' });
    }

    // Get invoice details
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Get patient details for payment order
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, invoice.patientId))
      .limit(1);

    let customerName = '';
    let customerEmail = '';
    let customerPhone = '';

    if (patient?.userId) {
      const [patientUser] = await db
        .select({
          fullName: users.fullName,
          email: users.email,
          mobileNumber: users.mobileNumber,
        })
        .from(users)
        .where(eq(users.id, patient.userId))
        .limit(1);

      customerName = patientUser?.fullName || '';
      customerEmail = patientUser?.email || '';
      customerPhone = patientUser?.mobileNumber || '';
    }

    // Create payment order
    const order = await paymentGatewayService.createOrder({
      amount: Math.round(parseFloat(amount) * 100), // Convert to paise
      currency: 'INR',
      receipt: `invoice_${invoiceId}_${Date.now()}`,
      notes: {
        invoice_id: String(invoiceId),
        patient_id: String(invoice.patientId),
        invoice_number: invoice.invoiceNumber || '',
      },
      customerId: patient?.userId,
      customerName,
      customerEmail,
      customerPhone,
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        key: process.env.RAZORPAY_KEY_ID || 'mock_key', // For frontend integration
      },
    });
  } catch (err: any) {
    console.error('❌ Create payment order error:', err);
    res.status(400).json({
      message: err.message || 'Failed to create payment order',
      error: err.toString(),
    });
  }
});

/**
 * POST /api/payments/verify
 * Verify payment after successful payment
 */
router.post('/verify', authorizeRoles('PATIENT', 'ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, paymentId, signature, invoiceId } = req.body;

    if (!orderId || !paymentId || !invoiceId) {
      return res.status(400).json({ message: 'orderId, paymentId, and invoiceId are required' });
    }

    // Verify payment signature
    const isValid = await paymentGatewayService.verifyPayment({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature || 'mock_signature', // Mock mode doesn't need signature
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Get order details
    const order = await paymentGatewayService.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Record payment in billing system
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const paymentResult = await billingService.recordPayment({
      invoiceId: +invoiceId,
      method: 'online',
      amount: order.amount / 100, // Convert from paise to rupees
      reference: paymentId,
      notes: `Online payment via payment gateway. Order ID: ${orderId}`,
      receivedByUserId: req.user.id,
      actorUserId: req.user.id,
      actorRole: req.user.role || 'PATIENT',
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
      receivedAt: new Date(order.created_at * 1000), // Convert from Unix timestamp
    });

    res.json({
      success: true,
      message: 'Payment verified and recorded successfully',
      payment: paymentResult.payment,
      invoice: paymentResult.invoice,
    });
  } catch (err: any) {
    console.error('❌ Verify payment error:', err);
    res.status(400).json({
      message: err.message || 'Failed to verify payment',
      error: err.toString(),
    });
  }
});

/**
 * POST /api/payments/webhook
 * Handle payment webhook from Razorpay (for production)
 */
router.post('/webhook', async (req, res) => {
  try {
    // In mock mode, this endpoint can simulate webhook events
    const { event, payload } = req.body;

    console.log(`\n📡 Payment Webhook Received:`);
    console.log(`🎯 Event: ${event}`);
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
    console.log(`⏰ Received: ${new Date().toLocaleString()}\n`);

    // In production with Razorpay, verify webhook signature here
    // For now, just acknowledge receipt
    res.json({ success: true, message: 'Webhook received' });
  } catch (err: any) {
    console.error('❌ Webhook error:', err);
    res.status(400).json({
      message: err.message || 'Failed to process webhook',
    });
  }
});

/**
 * POST /api/payments/simulate-success
 * Simulate successful payment (for testing/mock mode)
 */
router.post('/simulate-success', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    const result = await paymentGatewayService.simulatePaymentSuccess(orderId);

    res.json({
      success: true,
      message: 'Payment simulated successfully',
      payment: result,
    });
  } catch (err: any) {
    console.error('❌ Simulate payment error:', err);
    res.status(400).json({
      message: err.message || 'Failed to simulate payment',
    });
  }
});

/**
 * GET /api/payments/order/:orderId
 * Get order details
 */
router.get('/order/:orderId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId } = req.params;

    const order = await paymentGatewayService.getOrder(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      success: true,
      order,
    });
  } catch (err: any) {
    console.error('❌ Get order error:', err);
    res.status(400).json({
      message: err.message || 'Failed to get order',
    });
  }
});

export default router;
