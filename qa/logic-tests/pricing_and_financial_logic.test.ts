import { calculateAuthoritativeQuote, calculateDistanceKm } from '../../src/services/pricingService';

describe('LOGIC-02: Pricing and Financial Logic Audit', () => {
  // Independent Mathematical Oracle for TANKR Tariff Engine
  const oracleCalculateQuote = (
    basePrice: number,
    pricePerKm: number,
    distanceKm: number,
    hourIST: number
  ) => {
    const isPeak = hourIST >= 18 && hourIST <= 22;
    const surgeMultiplier = isPeak ? 0.10 : 0.00;
    const deliveryCharge = Math.round(distanceKm * pricePerKm * 100) / 100;
    const surcharge = Math.round(basePrice * surgeMultiplier * 100) / 100;
    const subtotal = Math.round((basePrice + deliveryCharge + surcharge) * 100) / 100;
    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const total = Math.round((subtotal + gst) * 100) / 100;
    return { deliveryCharge, surcharge, subtotal, gst, total };
  };

  describe('3.1 Authoritative Mathematical Formula Verification', () => {
    it('calculates daytime non-surge price matching independent math oracle', () => {
      const basePrice = 1200.00;
      const pricePerKm = 40.00;
      const distanceKm = 4.5;
      const hourIST = 14; // Daytime (no surge)

      const expected = oracleCalculateQuote(basePrice, pricePerKm, distanceKm, hourIST);
      // Expected: Delivery = 180.00, Surcharge = 0, Subtotal = 1380.00, GST = 69.00, Total = 1449.00
      expect(expected.deliveryCharge).toBe(180.00);
      expect(expected.surcharge).toBe(0.00);
      expect(expected.subtotal).toBe(1380.00);
      expect(expected.gst).toBe(69.00);
      expect(expected.total).toBe(1449.00);

      const quote = calculateAuthoritativeQuote({
        basePrice,
        pricePerKm,
        distanceKm,
        hourIST,
      });

      expect(quote.delivery_charge).toBe(expected.deliveryCharge);
      expect(quote.surcharge_amount).toBe(expected.surcharge);
      expect(quote.subtotal).toBe(expected.subtotal);
      expect(quote.tax_amount).toBe(expected.gst);
      expect(quote.final_payable_amount).toBe(expected.total);
    });

    it('calculates peak evening 18:00-22:00 IST surge (+10%) correctly', () => {
      const basePrice = 1200.00;
      const pricePerKm = 40.00;
      const distanceKm = 5.0;
      const hourIST = 19; // Peak evening

      const expected = oracleCalculateQuote(basePrice, pricePerKm, distanceKm, hourIST);
      // Expected: Delivery = 200.00, Surcharge = 120.00 (10% of 1200), Subtotal = 1520.00, GST = 76.00, Total = 1596.00
      expect(expected.deliveryCharge).toBe(200.00);
      expect(expected.surcharge).toBe(120.00);
      expect(expected.subtotal).toBe(1520.00);
      expect(expected.gst).toBe(76.00);
      expect(expected.total).toBe(1596.00);

      const quote = calculateAuthoritativeQuote({
        basePrice,
        pricePerKm,
        distanceKm,
        hourIST,
      });

      expect(quote.surcharge_amount).toBe(120.00);
      expect(quote.final_payable_amount).toBe(1596.00);
    });
  });

  describe('3.2 Financial Precision & Rounding Invariants', () => {
    it('deterministic 2-decimal rounding prevents fractional rupee drift', () => {
      const testDistances = [1.333, 2.718, 5.555, 9.999];
      testDistances.forEach((d) => {
        const quote = calculateAuthoritativeQuote({
          basePrice: 1250.33,
          pricePerKm: 33.33,
          distanceKm: d,
          hourIST: 20,
        });

        // Ensure every value has at most 2 decimal digits
        const check2Decimals = (val: number) => {
          const str = val.toString();
          const parts = str.split('.');
          if (parts.length > 1) {
            expect(parts[1].length).toBeLessThanOrEqual(2);
          }
        };

        check2Decimals(quote.delivery_charge);
        check2Decimals(quote.surcharge_amount);
        check2Decimals(quote.subtotal);
        check2Decimals(quote.tax_amount);
        check2Decimals(quote.final_payable_amount);
      });
    });

    it('invariance of tax reconciliation: final amount strictly equals subtotal + tax', () => {
      const quote = calculateAuthoritativeQuote({
        basePrice: 1800.00,
        pricePerKm: 45.00,
        distanceKm: 7.25,
        hourIST: 21,
      });

      const reconciled = Math.round((quote.subtotal + quote.tax_amount) * 100) / 100;
      expect(quote.final_payable_amount).toBe(reconciled);
    });
  });

  describe('3.3 Boundary & Edge Case Rejection', () => {
    it('throws error or clamps when base price is negative', () => {
      expect(() => {
        calculateAuthoritativeQuote({
          basePrice: -500,
          pricePerKm: 40,
          distanceKm: 5,
          hourIST: 12,
        });
      }).toThrow(/non-negative/i);
    });

    it('throws error when distance is negative', () => {
      expect(() => {
        calculateAuthoritativeQuote({
          basePrice: 1200,
          pricePerKm: 40,
          distanceKm: -10,
          hourIST: 12,
        });
      }).toThrow(/non-negative/i);
    });
  });
});
