import { calculateAuthoritativeQuote } from '../../src/services/pricingService';
import { validateDeliveryCompletion } from '../../src/services/stateMachineService';

describe('LOGIC-09: Property-Based Fuzzing & Randomized Invariant Stress Test', () => {
  // Simple deterministic linear congruential generator for reproducible fuzzing
  class SeededPRNG {
    private seed: number;
    constructor(seed: number = 42) {
      this.seed = seed;
    }
    next(): number {
      this.seed = (this.seed * 9301 + 49297) % 233280;
      return this.seed / 233280;
    }
    nextRange(min: number, max: number): number {
      return min + this.next() * (max - min);
    }
  }

  describe('9.1 Pricing Property Fuzzing (500 Randomized Configurations)', () => {
    it('maintains pricing invariants across 500 pseudorandom inputs', () => {
      const prng = new SeededPRNG(1337);

      for (let i = 0; i < 500; i++) {
        const basePrice = Math.round(prng.nextRange(200, 8000) * 100) / 100;
        const pricePerKm = Math.round(prng.nextRange(15, 90) * 100) / 100;
        const distanceKm = Math.round(prng.nextRange(0.5, 45.0) * 100) / 100;
        const hourIST = Math.floor(prng.nextRange(0, 24));

        const quote = calculateAuthoritativeQuote({
          basePrice,
          pricePerKm,
          distanceKm,
          hourIST,
        });

        // Invariant 1: No NaN or Infinite values
        expect(Number.isNaN(quote.final_payable_amount)).toBe(false);
        expect(Number.isFinite(quote.final_payable_amount)).toBe(true);

        // Invariant 2: Total payable is strictly greater than base price
        expect(quote.final_payable_amount).toBeGreaterThan(basePrice);

        // Invariant 3: Subtotal + Tax = Final
        const reconciled = Math.round((quote.subtotal + quote.tax_amount) * 100) / 100;
        expect(quote.final_payable_amount).toBe(reconciled);

        // Invariant 4: Tax is strictly 5% of subtotal (with rounding tolerance <= 0.01)
        const expectedTax = Math.round(quote.subtotal * 0.05 * 100) / 100;
        expect(Math.abs(quote.tax_amount - expectedTax)).toBeLessThanOrEqual(0.01);
      }
    });
  });

  describe('9.2 Meter Reading Fuzzing (200 Pumping Volume Cycles)', () => {
    it('accurately verifies physical flow volume across 200 random start/end readings', () => {
      const prng = new SeededPRNG(2026);

      for (let i = 0; i < 200; i++) {
        const startMeter = Math.round(prng.nextRange(100, 50000) * 10) / 10;
        const actualDelivered = Math.round(prng.nextRange(1000, 20000) * 10) / 10;
        const endMeter = Math.round((startMeter + actualDelivered) * 10) / 10;

        const result = validateDeliveryCompletion({
          expectedPin: '7788',
          enteredPin: '7788',
          meterStart: startMeter,
          meterEnd: endMeter,
          bookedCapacity: Math.round(actualDelivered),
        });

        expect(result.valid).toBe(true);
        expect(result.volumeDelivered).toBeCloseTo(actualDelivered, 1);
      }
    });
  });
});
