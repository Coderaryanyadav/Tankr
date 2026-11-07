import { supabase } from '../supabase/client';

export interface PaymentIntent {
  id: string;
  booking_id: string;
  gateway_order_id: string;
  gateway_payment_id?: string;
  amount: number;
  currency: 'INR';
  method: 'upi' | 'card' | 'cod';
  status: 'created' | 'captured' | 'failed' | 'refunded';
  idempotency_key: string;
  created_at: string;
}

export interface PaymentProcessResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  transactionRef?: string;
  requiresCheckout?: boolean;
  amount?: number;
  currency?: string;
  keyId?: string;
  error?: string;
}

export interface GatewayOrderDetails {
  orderId: string;
  amount: number;
  currency: string;
  keyId?: string;
}

class PaymentService {
  /**
   * Generates a unique, cryptographically robust idempotency key to prevent double debits.
   */
  public generateIdempotencyKey(bookingId: string): string {
    let rand = '';
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const arr = new Uint8Array(8);
      crypto.getRandomValues(arr);
      rand = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
    } else {
      rand = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    }
    return `pay_${bookingId}_${Date.now()}_${rand}`;
  }

  /**
   * Server-Side Payment Order Creation.
   * Invokes authoritative database RPC `create_payment_order` to create an immutable payment intent.
   */
  async createPaymentOrder(
    bookingId: string,
    method: 'upi' | 'card' | 'cod',
    idempotencyKey?: string
  ): Promise<{ success: boolean; data?: GatewayOrderDetails; error?: string }> {
    const key = idempotencyKey || this.generateIdempotencyKey(bookingId);

    try {
      // 1. Authoritative Server RPC Execution
      const { data, error } = await supabase.rpc('create_payment_order', {
        p_booking_id: bookingId,
        p_method: method,
        p_idempotency_key: key,
      });

      if (!error && data && data.success) {
        return {
          success: true,
          data: {
            orderId: data.order_id,
            amount: Number(data.amount),
            currency: data.currency || 'INR',
            keyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
          },
        };
      }

      // Security Remediation (BUG-002): Financial mutations MUST NOT fall back to direct client table insertion
      return {
        success: false,
        error: error?.message || 'Payment order creation failed on secure backend RPC.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error during payment initialization',
      };
    }
  }

  /**
   * Verifies payment completion and reconciles database state.
   * In production, validates Razorpay/Cashfree webhook or signature against server RPC.
   * NEVER returns mock success on failure.
   */
  async verifyAndCapturePayment(
    bookingId: string,
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<PaymentProcessResult> {
    if (!orderId || !paymentId || !signature) {
      return {
        success: false,
        error: 'Payment verification refused: Missing gateway orderId, paymentId, or signature.',
      };
    }

    try {
      // 1. Authoritative Server RPC Reconciliation
      const { data, error } = await supabase.rpc('verify_and_reconcile_payment', {
        p_booking_id: bookingId,
        p_gateway_order_id: orderId,
        p_gateway_payment_id: paymentId,
        p_gateway_signature: signature,
      });

      if (!error && data?.success) {
        return {
          success: true,
          paymentId: data.payment_id,
          orderId,
          transactionRef: `UPI/${paymentId}/tankr`,
        };
      }

      // Security Remediation (BUG-002): Financial reconciliation MUST NOT fall back to direct client table updates
      return {
        success: false,
        error: error?.message || data?.error || 'Payment reconciliation rejected: Gateway signature or transaction verification failed.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Internal error while reconciling payment transaction.',
      };
    }
  }

  /**
   * Cryptographic verification of payment gateway signatures.
   * Authoritative HMAC-SHA256 comparison using constant-time comparison.
   * Requires authoritative secret; rejects if secret is missing or parameters malformed.
   */
  public verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
    secret: string
  ): boolean {
    if (!orderId || !paymentId || !signature || !secret) return false;

    try {
      const crypto = require('crypto');
      const expected = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      const sigBuf = Buffer.from(signature.toLowerCase(), 'hex');
      const expBuf = Buffer.from(expected.toLowerCase(), 'hex');
      if (sigBuf.length !== expBuf.length || sigBuf.length === 0) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  /**
   * Payment order processing flow for a booking.
   * May only call createPaymentOrder.
   * For COD, returns { success: true, orderId } leaving the payment row at status created.
   * For UPI and card, returns { success: true, requiresCheckout: true, orderId, amount, currency, keyId }.
   */
  async processBookingPayment(
    bookingId: string,
    _amount: number,
    method: 'upi' | 'card' | 'cod'
  ): Promise<PaymentProcessResult> {
    const idempotencyKey = this.generateIdempotencyKey(bookingId);

    // May ONLY call createPaymentOrder
    const orderRes = await this.createPaymentOrder(bookingId, method, idempotencyKey);
    if (!orderRes.success || !orderRes.data) {
      return {
        success: false,
        error: orderRes.error || 'Failed to establish payment order.',
      };
    }

    const { orderId, amount, currency, keyId } = orderRes.data;

    // For COD, return { success: true, orderId } and leave payment row at status created
    if (method === 'cod') {
      return {
        success: true,
        orderId,
      };
    }

    // For UPI and card, return { success: true, requiresCheckout: true, orderId, amount, currency, keyId }
    return {
      success: true,
      requiresCheckout: true,
      orderId,
      amount,
      currency,
      keyId: keyId || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
    };
  }

  /**
   * Completes checkout by reconciling gateway tokens with authoritative backend RPC.
   */
  async completeCheckout(
    bookingId: string,
    orderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<PaymentProcessResult> {
    return await this.verifyAndCapturePayment(
      bookingId,
      orderId,
      razorpayPaymentId,
      razorpaySignature
    );
  }

  /**
   * Authoritative checkout boundary that accepts real Razorpay success payload
   * and reconciles it via server RPC.
   */
  async handleRazorpayCheckoutSuccess(
    bookingId: string,
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }
  ): Promise<PaymentProcessResult> {
    if (!payload?.razorpay_order_id || !payload?.razorpay_payment_id || !payload?.razorpay_signature) {
      return {
        success: false,
        error: 'Missing required Razorpay payment verification tokens.',
      };
    }

    return await this.completeCheckout(
      bookingId,
      payload.razorpay_order_id,
      payload.razorpay_payment_id,
      payload.razorpay_signature
    );
  }

  /**
   * Processes a refund request when a tanker booking is cancelled prior to tanker dispatch.
   * Invokes authoritative database RPC `request_booking_refund` to record pending_gateway status.
   */
  async processRefund(bookingId: string, reason: string = 'Booking cancelled prior to dispatch'): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('request_booking_refund', {
        p_booking_id: bookingId,
        p_reason: reason,
      });

      if (!error && data?.success) {
        return {
          success: true,
          refundId: data.booking_id,
        };
      }

      return {
        success: false,
        error: data?.error || error?.message || 'Failed to request refund from server.',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to process refund request' };
    }
  }
}

export const paymentService = new PaymentService();
export const handleRazorpayCheckoutSuccess = (
  bookingId: string,
  payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
) => paymentService.handleRazorpayCheckoutSuccess(bookingId, payload);
