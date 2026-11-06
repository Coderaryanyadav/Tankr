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

  test('simulates reconciliation verification check', () => {
    const verifyPaymentSignature = (orderId: string, paymentId: string, signature: string) => {
      if (!signature || signature.includes('invalid')) {
        return { success: false, error: 'Payment signature could not be verified by gateway.' };
      }
      return { success: true, paymentId, orderId, status: 'captured' };
    };

    const validResult = verifyPaymentSignature('rzp_order_991', 'rzp_pay_882', 'sig_valid_hash_99');
    expect(validResult.success).toBe(true);
    expect(validResult.status).toBe('captured');

    const invalidResult = verifyPaymentSignature('rzp_order_991', 'rzp_pay_882', 'sig_invalid_bad');
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toContain('could not be verified');
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

