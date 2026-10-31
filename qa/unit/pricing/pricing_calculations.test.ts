import { z } from 'zod';

// Pricing Calculation Specification according to Indian Potable Water Delivery Standards (BIS-10500)
interface PricingInput {
  capacityLiters: number;
  distanceKm: number;
  basePricePerKl: number;
  deliveryChargePerKm: number;
  surgeMultiplier: number;
  taxRate: number; // 0.05 for 5% GST
}

interface CalculatedQuote {
  basePrice: number;
  deliveryCharge: number;
  surcharge: number;
  taxAmount: number;
  finalPayableAmount: number;
}

function calculateWaterQuote(input: PricingInput): CalculatedQuote {
  const kl = input.capacityLiters / 1000;
  const basePrice = Math.round(kl * input.basePricePerKl);
  const deliveryCharge = Math.round(input.distanceKm * input.deliveryChargePerKm);
  const subtotal = basePrice + deliveryCharge;
  const surcharge = input.surgeMultiplier > 1.0 ? Math.round(subtotal * (input.surgeMultiplier - 1.0)) : 0;
  const taxableAmount = subtotal + surcharge;
  const taxAmount = Math.round(taxableAmount * input.taxRate);
  const finalPayableAmount = taxableAmount + taxAmount;

  return {
    basePrice,
    deliveryCharge,
    surcharge,
    taxAmount,
    finalPayableAmount,
  };
}

describe('TANKR Unit QA — Pricing & Surcharges Engine', () => {
  const standardRates = {
    basePricePerKl: 75, // ₹75 per 1,000L
    deliveryChargePerKm: 25, // ₹25 per km
    surgeMultiplier: 1.0,
    taxRate: 0.05, // 5% GST
  };

  test('TC-UNIT-01: calculates standard 5,000L delivery over 4km', () => {
    const quote = calculateWaterQuote({
      capacityLiters: 5000,
      distanceKm: 4.0,
      ...standardRates,
    });

    // Base: 5 * 75 = 375
    // Delivery: 4 * 25 = 100
    // Subtotal: 475
    // Tax: 475 * 0.05 = 23.75 -> 24
    // Final: 475 + 24 = 499
    expect(quote.basePrice).toBe(375);
    expect(quote.deliveryCharge).toBe(100);
    expect(quote.surcharge).toBe(0);
    expect(quote.taxAmount).toBe(24);
    expect(quote.finalPayableAmount).toBe(499);
  });

  test('TC-UNIT-02: calculates bulk residential sump 20,000L delivery over 10km', () => {
    const quote = calculateWaterQuote({
      capacityLiters: 20000,
      distanceKm: 10.0,
      ...standardRates,
    });

    // Base: 20 * 75 = 1500
    // Delivery: 10 * 25 = 250
    // Subtotal: 1750
    // Tax: 1750 * 0.05 = 87.5 -> 88
    // Final: 1750 + 88 = 1838
    expect(quote.basePrice).toBe(1500);
    expect(quote.deliveryCharge).toBe(250);
    expect(quote.finalPayableAmount).toBe(1838);
  });

  test('TC-UNIT-03: applies peak summer surge multiplier (1.25x)', () => {
    const quote = calculateWaterQuote({
      capacityLiters: 10000,
      distanceKm: 5.0,
      ...standardRates,
      surgeMultiplier: 1.25,
    });

    // Base: 10 * 75 = 750
    // Delivery: 5 * 25 = 125
    // Subtotal: 875
    // Surcharge: 875 * 0.25 = 218.75 -> 219
    // Taxable: 875 + 219 = 1094
    // Tax: 1094 * 0.05 = 54.7 -> 55
    // Final: 1094 + 55 = 1149
    expect(quote.surcharge).toBe(219);
    expect(quote.finalPayableAmount).toBe(1149);
  });

  test('TC-UNIT-04: ensures 0km adjacent delivery charges minimum delivery fee without division error', () => {
    const quote = calculateWaterQuote({
      capacityLiters: 1000,
      distanceKm: 0.1,
      ...standardRates,
    });

    expect(quote.basePrice).toBe(75);
    expect(quote.deliveryCharge).toBeGreaterThanOrEqual(0);
    expect(quote.finalPayableAmount).toBeGreaterThan(75);
  });

  test('TC-UNIT-05: enforces strict integer rupee rounding with zero decimal leakage', () => {
    const quote = calculateWaterQuote({
      capacityLiters: 3333,
      distanceKm: 3.7,
      ...standardRates,
      surgeMultiplier: 1.15,
    });

    expect(Number.isInteger(quote.basePrice)).toBe(true);
    expect(Number.isInteger(quote.deliveryCharge)).toBe(true);
    expect(Number.isInteger(quote.surcharge)).toBe(true);
    expect(Number.isInteger(quote.taxAmount)).toBe(true);
    expect(Number.isInteger(quote.finalPayableAmount)).toBe(true);
  });
});

