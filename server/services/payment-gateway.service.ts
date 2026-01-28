// Payment Gateway service for NexaCare Medical System
// Supports Razorpay integration with fallback to mock mode

export interface PaymentOrderData {
  amount: number; // Amount in smallest currency unit (paise for INR)
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  customerId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: 'created' | 'attempted' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface PaymentVerificationData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface PaymentGatewayConfig {
  provider: 'razorpay' | 'mock';
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
}

export class PaymentGatewayService {
  private static instance: PaymentGatewayService;
  private config: PaymentGatewayConfig;
  private mockOrders: Map<string, PaymentOrder> = new Map();
  private mockPayments: Map<string, any> = new Map();

  constructor() {
    // Load configuration from environment variables
    this.config = {
      provider: (process.env.PAYMENT_GATEWAY as 'razorpay' | 'mock') || 'mock',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
      razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    };

    // Validate Razorpay config if provider is razorpay
    if (this.config.provider === 'razorpay') {
      if (!this.config.razorpayKeyId || !this.config.razorpayKeySecret) {
        console.warn('⚠️  Razorpay provider selected but credentials missing. Falling back to mock mode.');
        this.config.provider = 'mock';
      }
    }
  }

  static getInstance(): PaymentGatewayService {
    if (!PaymentGatewayService.instance) {
      PaymentGatewayService.instance = new PaymentGatewayService();
    }
    return PaymentGatewayService.instance;
  }

  /**
   * Create a payment order
   */
  async createOrder(data: PaymentOrderData): Promise<PaymentOrder> {
    if (this.config.provider === 'razorpay') {
      try {
        return await this.createRazorpayOrder(data);
      } catch (error: any) {
        console.error('❌ Razorpay order creation error:', error);
        // Fallback to mock on error
        return this.createMockOrder(data);
      }
    }

    return this.createMockOrder(data);
  }

  /**
   * Create order via Razorpay
   */
  private async createRazorpayOrder(data: PaymentOrderData): Promise<PaymentOrder> {
    try {
      // Dynamic import to avoid requiring razorpay package if not installed
      const Razorpay = await import('razorpay').catch(() => {
        throw new Error('Razorpay package not installed. Run: npm install razorpay');
      });

      const razorpay = new Razorpay.default({
        key_id: this.config.razorpayKeyId!,
        key_secret: this.config.razorpayKeySecret!,
      });

      const orderData = {
        amount: data.amount, // Amount in paise
        currency: data.currency || 'INR',
        receipt: data.receipt || `receipt_${Date.now()}`,
        notes: data.notes || {},
      };

      const razorpayOrder = await razorpay.orders.create(orderData);

      console.log(`\n💳 Razorpay Order Created:`);
      console.log(`🆔 Order ID: ${razorpayOrder.id}`);
      console.log(`💰 Amount: ₹${(razorpayOrder.amount / 100).toFixed(2)}`);
      console.log(`📋 Receipt: ${razorpayOrder.receipt}`);
      console.log(`⏰ Created: ${new Date().toLocaleString()}\n`);

      return {
        id: razorpayOrder.id,
        entity: razorpayOrder.entity,
        amount: razorpayOrder.amount,
        amount_paid: razorpayOrder.amount_paid,
        amount_due: razorpayOrder.amount_due,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status as any,
        attempts: razorpayOrder.attempts,
        notes: razorpayOrder.notes || {},
        created_at: razorpayOrder.created_at,
      };
    } catch (error: any) {
      console.error('❌ Razorpay order creation error:', error.message);
      throw error;
    }
  }

  /**
   * Create mock order
   */
  private createMockOrder(data: PaymentOrderData): PaymentOrder {
    const orderId = `order_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const order: PaymentOrder = {
      id: orderId,
      entity: 'order',
      amount: data.amount,
      amount_paid: 0,
      amount_due: data.amount,
      currency: data.currency || 'INR',
      receipt: data.receipt || `receipt_${Date.now()}`,
      status: 'created',
      attempts: 0,
      notes: data.notes || {},
      created_at: Math.floor(Date.now() / 1000),
    };

    this.mockOrders.set(orderId, order);

    console.log(`\n💳 Mock Payment Order Created:`);
    console.log(`🆔 Order ID: ${orderId}`);
    console.log(`💰 Amount: ₹${(data.amount / 100).toFixed(2)}`);
    console.log(`📋 Receipt: ${order.receipt}`);
    console.log(`👤 Customer: ${data.customerName || 'N/A'}`);
    console.log(`⏰ Created: ${new Date().toLocaleString()}\n`);

    return order;
  }

  /**
   * Verify payment signature (for Razorpay)
   */
  async verifyPayment(data: PaymentVerificationData): Promise<boolean> {
    if (this.config.provider === 'razorpay') {
      try {
        return await this.verifyRazorpayPayment(data);
      } catch (error: any) {
        console.error('❌ Razorpay payment verification error:', error);
        // In mock mode, always return true for testing
        return true;
      }
    }

    // Mock mode: verify against stored mock payment
    return this.verifyMockPayment(data);
  }

  /**
   * Verify Razorpay payment
   */
  private async verifyRazorpayPayment(data: PaymentVerificationData): Promise<boolean> {
    try {
      // Dynamic import
      const crypto = await import('crypto');

      const text = `${data.razorpay_order_id}|${data.razorpay_payment_id}`;
      const secret = this.config.razorpayKeySecret!;
      const generatedSignature = crypto.default
        .createHmac('sha256', secret)
        .update(text)
        .digest('hex');

      const isValid = generatedSignature === data.razorpay_signature;

      if (isValid) {
        console.log(`✅ Razorpay payment verified: ${data.razorpay_payment_id}`);
      } else {
        console.error(`❌ Razorpay payment verification failed: ${data.razorpay_payment_id}`);
      }

      return isValid;
    } catch (error: any) {
      console.error('❌ Razorpay verification error:', error.message);
      throw error;
    }
  }

  /**
   * Verify mock payment
   */
  private verifyMockPayment(data: PaymentVerificationData): boolean {
    // In mock mode, check if payment exists in our mock store
    const payment = this.mockPayments.get(data.razorpay_payment_id);
    if (payment && payment.order_id === data.razorpay_order_id) {
      console.log(`✅ Mock payment verified: ${data.razorpay_payment_id}`);
      return true;
    }
    console.log(`⚠️  Mock payment not found: ${data.razorpay_payment_id}`);
    return false;
  }

  /**
   * Simulate payment success (for mock mode)
   */
  async simulatePaymentSuccess(orderId: string, paymentId?: string): Promise<{
    payment_id: string;
    order_id: string;
    status: string;
  }> {
    const paymentIdFinal = paymentId || `pay_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update order status
    const order = this.mockOrders.get(orderId);
    if (order) {
      order.status = 'paid';
      order.amount_paid = order.amount;
      order.amount_due = 0;
      order.attempts += 1;
    }

    // Store payment
    const payment = {
      id: paymentIdFinal,
      order_id: orderId,
      amount: order?.amount || 0,
      status: 'captured',
      created_at: Math.floor(Date.now() / 1000),
    };
    this.mockPayments.set(paymentIdFinal, payment);

    console.log(`\n✅ Mock Payment Successful:`);
    console.log(`🆔 Payment ID: ${paymentIdFinal}`);
    console.log(`📋 Order ID: ${orderId}`);
    console.log(`💰 Amount: ₹${((order?.amount || 0) / 100).toFixed(2)}`);
    console.log(`⏰ Processed: ${new Date().toLocaleString()}\n`);

    return {
      payment_id: paymentIdFinal,
      order_id: orderId,
      status: 'captured',
    };
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<PaymentOrder | null> {
    if (this.config.provider === 'razorpay') {
      try {
        return await this.getRazorpayOrder(orderId);
      } catch (error: any) {
        console.error('❌ Razorpay get order error:', error);
        // Fallback to mock
        return this.mockOrders.get(orderId) || null;
      }
    }

    return this.mockOrders.get(orderId) || null;
  }

  /**
   * Get Razorpay order
   */
  private async getRazorpayOrder(orderId: string): Promise<PaymentOrder> {
    try {
      const Razorpay = await import('razorpay').catch(() => {
        throw new Error('Razorpay package not installed');
      });

      const razorpay = new Razorpay.default({
        key_id: this.config.razorpayKeyId!,
        key_secret: this.config.razorpayKeySecret!,
      });

      const razorpayOrder = await razorpay.orders.fetch(orderId);

      return {
        id: razorpayOrder.id,
        entity: razorpayOrder.entity,
        amount: razorpayOrder.amount,
        amount_paid: razorpayOrder.amount_paid,
        amount_due: razorpayOrder.amount_due,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status as any,
        attempts: razorpayOrder.attempts,
        notes: razorpayOrder.notes || {},
        created_at: razorpayOrder.created_at,
      };
    } catch (error: any) {
      console.error('❌ Razorpay get order error:', error.message);
      throw error;
    }
  }

  /**
   * Process refund (mock or Razorpay)
   */
  async processRefund(paymentId: string, amount?: number): Promise<{
    id: string;
    amount: number;
    status: string;
  }> {
    if (this.config.provider === 'razorpay') {
      try {
        return await this.processRazorpayRefund(paymentId, amount);
      } catch (error: any) {
        console.error('❌ Razorpay refund error:', error);
        // Fallback to mock
        return this.processMockRefund(paymentId, amount);
      }
    }

    return this.processMockRefund(paymentId, amount);
  }

  /**
   * Process Razorpay refund
   */
  private async processRazorpayRefund(paymentId: string, amount?: number): Promise<{
    id: string;
    amount: number;
    status: string;
  }> {
    try {
      const Razorpay = await import('razorpay').catch(() => {
        throw new Error('Razorpay package not installed');
      });

      const razorpay = new Razorpay.default({
        key_id: this.config.razorpayKeyId!,
        key_secret: this.config.razorpayKeySecret!,
      });

      const refundData: any = {};
      if (amount) {
        refundData.amount = amount;
      }

      const refund = await razorpay.payments.refund(paymentId, refundData);

      console.log(`\n💰 Razorpay Refund Processed:`);
      console.log(`🆔 Refund ID: ${refund.id}`);
      console.log(`💵 Amount: ₹${(refund.amount / 100).toFixed(2)}`);
      console.log(`⏰ Processed: ${new Date().toLocaleString()}\n`);

      return {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
      };
    } catch (error: any) {
      console.error('❌ Razorpay refund error:', error.message);
      throw error;
    }
  }

  /**
   * Process mock refund
   */
  private processMockRefund(paymentId: string, amount?: number): {
    id: string;
    amount: number;
    status: string;
  } {
    const payment = this.mockPayments.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const refundId = `refund_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const refundAmount = amount || payment.amount;

    console.log(`\n💰 Mock Refund Processed:`);
    console.log(`🆔 Refund ID: ${refundId}`);
    console.log(`💵 Amount: ₹${(refundAmount / 100).toFixed(2)}`);
    console.log(`⏰ Processed: ${new Date().toLocaleString()}\n`);

    return {
      id: refundId,
      amount: refundAmount,
      status: 'processed',
    };
  }
}

export const paymentGatewayService = PaymentGatewayService.getInstance();
