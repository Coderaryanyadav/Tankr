import crypto from 'crypto';

interface FlowMeterAudit {
  orderedLiters: number;
  deliveredLiters: number;
  totalPaid: number;
}

interface ProratedRefundResult {
  hasDiscrepancy: boolean;
  shortfallLiters: number;
  refundPercentage: number;
  refundAmountRupees: number;
  reconciledPayable: number;
}

// Authoritative TANKR Flow Meter Shortfall Refund Calculator
function calculateProratedRefund(audit: FlowMeterAudit): ProratedRefundResult {
  if (audit.deliveredLiters >= audit.orderedLiters) {
    return {
      hasDiscrepancy: false,
      shortfallLiters: 0,
      refundPercentage: 0,
      refundAmountRupees: 0,
      reconciledPayable: audit.totalPaid,
    };
  }

  const shortfallLiters = audit.orderedLiters - audit.deliveredLiters;
  const shortfallRatio = shortfallLiters / audit.orderedLiters;
  const refundAmountRupees = Math.round(audit.totalPaid * shortfallRatio);
  const reconciledPayable = audit.totalPaid - refundAmountRupees;

  return {
    hasDiscrepancy: true,
    shortfallLiters,
    refundPercentage: Math.round(shortfallRatio * 100),
    refundAmountRupees,
    reconciledPayable,
  };
}

// Razorpay / Payment Gateway Webhook HMAC-SHA256 Signature Verification
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

describe('TANKR Integration QA — Payments & Financial Reconciliation', () => {
  describe('Flow Meter Shortfall Prorated Refunds', () => {
    test('TC-INT-25: zero refund when full 10,000L ordered volume is delivered', () => {
      const result = calculateProratedRefund({
        orderedLiters: 10000,
        deliveredLiters: 10000,
        totalPaid: 1500,
      });

      expect(result.hasDiscrepancy).toBe(false);
      expect(result.shortfallLiters).toBe(0);
      expect(result.refundAmountRupees).toBe(0);
      expect(result.reconciledPayable).toBe(1500);
    });

    test('TC-INT-26: calculates exact prorated refund for 1,000L shortfall on 10,000L booking (10% refund)', () => {
      const result = calculateProratedRefund({
        orderedLiters: 10000,
        deliveredLiters: 9000,
        totalPaid: 1500,
      });

      expect(result.hasDiscrepancy).toBe(true);
      expect(result.shortfallLiters).toBe(1000);
      expect(result.refundPercentage).toBe(10);
      expect(result.refundAmountRupees).toBe(150);
      expect(result.reconciledPayable).toBe(1350);
    });

    test('TC-INT-27: handles partial emergency delivery (only 2,500L pumped out of 10,000L)', () => {
      const result = calculateProratedRefund({
        orderedLiters: 10000,
        deliveredLiters: 2500,
        totalPaid: 2000,
      });

      expect(result.hasDiscrepancy).toBe(true);
      expect(result.shortfallLiters).toBe(7500);
      expect(result.refundPercentage).toBe(75);
      expect(result.refundAmountRupees).toBe(1500);
      expect(result.reconciledPayable).toBe(500);
    });
  });

  describe('Payment Gateway Webhook Verification', () => {
    const webhookSecret = 'test_webhook_secret_key_tankr_99';
    const samplePayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_H93jf91823',
            amount: 150000,
            currency: 'INR',
            status: 'captured',
            order_id: 'order_9831726351',
          },
        },
      },
    });

    test('TC-INT-28: successfully authenticates valid HMAC-SHA256 signature', () => {
      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(samplePayload)
        .digest('hex');

      expect(verifyWebhookSignature(samplePayload, validSignature, webhookSecret)).toBe(true);
    });

    test('TC-INT-29: rejects tampered webhook payload with invalid signature', () => {
      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(samplePayload)
        .digest('hex');

      const tamperedPayload = samplePayload.replace('150000', '100000');
      expect(verifyWebhookSignature(tamperedPayload, validSignature, webhookSecret)).toBe(false);
    });

    test('TC-INT-30: timing-safe comparison rejects forged signature lengths safely', () => {
      expect(verifyWebhookSignature(samplePayload, 'forged_short_signature', webhookSecret)).toBe(false);
    });
  });
});
