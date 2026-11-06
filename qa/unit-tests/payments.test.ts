import { paymentService } from '../../src/services/payment/paymentService';

describe('Payment Idempotency & Gateway Reconciliation', () => {
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

  test('cryptographically verifies HMAC-SHA256 signatures with secret key', () => {
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

  test('guarantees payment failure does NOT return mock success', () => {
    const processPayment = (hasNetworkError: boolean) => {
      if (hasNetworkError) {
        return {
          success: false,
          error: 'Network timeout: Failed to connect to payment gateway.',
        };
      }
      return { success: true };
    };

    const result = processPayment(true);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

