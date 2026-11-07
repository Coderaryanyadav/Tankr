/**
 * Server-Side Razorpay Integration Module
 * Strictly server-only: Reads RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from server environment.
 * NEVER imports or exposes EXPO_PUBLIC_ client variables.
 */

import crypto from 'crypto';
import { supabase } from '../supabase/client';

export interface CreateOrderParams {
  bookingId: string;
  amount: number; // in INR
  method?: 'upi' | 'card' | 'cod';
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  error?: string;
}

export class RazorpayServerService {
  /**
   * Calls POST https://api.razorpay.com/v1/orders with Key Id and Key Secret
   * Amount is sent in paise (1 INR = 100 paise), receipt = bookingId.
   */
  static async createOrderOnGateway(params: CreateOrderParams): Promise<CreateOrderResult> {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return {
        success: false,
        error: 'Razorpay credentials missing from server environment (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).',
      };
    }

    const amountInPaise = Math.round(params.amount * 100);

    try {
      const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: params.bookingId,
          notes: {
            booking_id: params.bookingId,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `Razorpay API call failed: ${errText}`,
        };
      }

      const rzpData: any = await response.json();
      const gatewayOrderId = rzpData.id;

      // Persist the real Razorpay order ID in database
      const idempotencyKey = `ord_${params.bookingId}_${gatewayOrderId}`;
      const { data: rpcData, error: rpcErr } = await supabase.rpc('create_payment_order', {
        p_booking_id: params.bookingId,
        p_method: params.method || 'upi',
        p_idempotency_key: idempotencyKey,
        p_gateway_order_id: gatewayOrderId,
      });

      if (rpcErr || !rpcData?.success) {
        return {
          success: false,
          error: rpcErr?.message || rpcData?.error || 'Database order registration failed.',
        };
      }

      return {
        success: true,
        orderId: gatewayOrderId,
        amount: params.amount,
        currency: 'INR',
        keyId,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error communicating with Razorpay Orders API.',
      };
    }
  }

  /**
   * Authoritative Webhook Signature Verification
   * Computes HMAC-SHA256 over raw body with RAZORPAY_WEBHOOK_SECRET.
   */
  static verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret || !signature || !rawBody) return false;

    try {
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const sigBuf = Buffer.from(signature.toLowerCase(), 'hex');
      const expBuf = Buffer.from(expected.toLowerCase(), 'hex');

      if (sigBuf.length !== expBuf.length || sigBuf.length === 0) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }
}

