import { paymentService, handleRazorpayCheckoutSuccess } from '../../src/services/payment/paymentService';
import fs from 'fs';
import path from 'path';

describe('Payment Idempotency, Gateway Reconciliation & Security Boundary', () => {
  test('generates unique deterministic idempotency key format using paymentService', () => {
    const bookingId = 'b001-c882-411a';
    const key = paymentService.generateIdempotencyKey(bookingId);

    expect(key).toContain(bookingId);
    expect(key).toMatch(/^pay_b001-c882-411a_\d+_[a-z0-9_]+$/);
  });

  test('refuses payment capture when required gateway signatures or tokens are missing', async () => {
    const res = await paymentService.verifyAndCapturePayment('b001', '', 'pay_123', 'sig_123');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Missing gateway orderId, paymentId, or signature');
  });

  test('cryptographically verifies HMAC-SHA256 signatures with secret key and rejects wrong/empty signatures', () => {
    const crypto = require('crypto');
    const secret = 'rzp_secret_water_hub_2026';
    const orderId = 'order_DA294FA1';
    const paymentId = 'pay_928172BA';

    // 1. Calculate genuine HMAC-SHA256 signature
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(paymentService.verifySignature(orderId, paymentId, validSignature, secret)).toBe(true);

    // 2. Reject forged signature (single character tamper)
    const tamperedSignature = validSignature.substring(0, validSignature.length - 1) + (validSignature.slice(-1) === 'a' ? 'b' : 'a');
    expect(paymentService.verifySignature(orderId, paymentId, tamperedSignature, secret)).toBe(false);

    // 3. Reject wrong orderId or paymentId replay
    expect(paymentService.verifySignature('order_FORGED', paymentId, validSignature, secret)).toBe(false);
    expect(paymentService.verifySignature(orderId, 'pay_REPLAY', validSignature, secret)).toBe(false);

    // 4. Reject empty or malformed format
    expect(paymentService.verifySignature(orderId, paymentId, '', secret)).toBe(false);
    expect(paymentService.verifySignature(orderId, paymentId, 'invalid_signature_format', secret)).toBe(false);
  });

  test('processBookingPayment source and runtime result contain no pay_tx_ or sig_tx_', async () => {
    // 1. Static source audit: inspect paymentService.ts
    const paymentServiceSource = fs.readFileSync(
      path.resolve(__dirname, '../../src/services/payment/paymentService.ts'),
      'utf8'
    );
    expect(paymentServiceSource).not.toContain('pay_tx_');
    expect(paymentServiceSource).not.toContain('sig_tx_');
    expect(paymentServiceSource).not.toContain('tankr_test_secret_key');
    expect(paymentServiceSource).not.toContain('EXPO_PUBLIC_RAZORPAY_KEY_SECRET');

    // 2. Runtime execution audit: COD flow returns clean references
    const codRes = await paymentService.processBookingPayment('b001', 750, 'cod');
    expect(JSON.stringify(codRes)).not.toContain('pay_tx_');
    expect(JSON.stringify(codRes)).not.toContain('sig_tx_');
  });

  test('processRefund does not update the payments table from the client', () => {
    const paymentServiceSource = fs.readFileSync(
      path.resolve(__dirname, '../../src/services/payment/paymentService.ts'),
      'utf8'
    );
    // Ensure client-side direct payments table mutations are completely removed
    expect(paymentServiceSource).not.toContain(".from('payments').update");
    expect(paymentServiceSource).not.toContain('rfnd_');
    expect(paymentServiceSource).toContain('request_booking_refund');
  });

  test('handleRazorpayCheckoutSuccess boundary validates real checkout tokens', async () => {
    const resEmpty = await handleRazorpayCheckoutSuccess('b001', {
      razorpay_order_id: '',
      razorpay_payment_id: '',
      razorpay_signature: '',
    });
    expect(resEmpty.success).toBe(false);
    expect(resEmpty.error).toMatch(/Missing required Razorpay payment verification tokens/i);
  });
});

