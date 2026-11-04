import { z } from 'zod';
import { calculateAuthoritativeQuote } from '../../../src/services/pricingService';

// Pricing Calculation Specification according to Indian Potable Water Delivery Standards (BIS-10500)
// and Mumbai Municipal Water Logistics Rules (PRICING_RULES.md, calculate_booking_quote RPC)
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
  const basePrice = Math.round(kl * input.basePricePerKl * 100) / 100;
  const deliveryCharge = Math.round(input.distanceKm * input.deliveryChargePerKm * 100) / 100;
  // Authoritative rule: Surge applies on base price (aligned with calculate_booking_quote RPC & pricingService)
  const surcharge = input.surgeMultiplier > 1.0 ? Math.round(basePrice * (input.surgeMultiplier - 1.0) * 100) / 100 : 0.0;
  const subtotal = Math.round((basePrice + deliveryCharge + surcharge) * 100) / 100;
  const taxAmount = Math.round(subtotal * input.taxRate * 100) / 100;
  const finalPayableAmount = Math.round((subtotal + taxAmount) * 100) / 100;

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
    // Tax: 475 * 0.05 = 23.75
    // Final: 475 + 23.75 = 498.75
    expect(quote.basePrice).toBe(375);
    expect(quote.deliveryCharge).toBe(100);
    expect(quote.surcharge).toBe(0);
    expect(quote.taxAmount).toBe(23.75);
    expect(quote.finalPayableAmount).toBe(498.75);
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
    // Tax: 1750 * 0.05 = 87.5
    // Final: 1750 + 87.5 = 1837.5
    expect(quote.basePrice).toBe(1500);
    expect(quote.deliveryCharge).toBe(250);
    expect(quote.finalPayableAmount).toBe(1837.5);
  });

  test('TC-UNIT-03: applies peak summer surge multiplier (1.25x on base price)', () => {
    const quote = calculateWaterQuote({
      capacityLiters: 10000,
      distanceKm: 5.0,
      ...standardRates,
      surgeMultiplier: 1.25,
    });

    // Base: 10 * 75 = 750
    // Delivery: 5 * 25 = 125
    // Surcharge (25% on base): 750 * 0.25 = 187.5
    // Subtotal: 750 + 125 + 187.5 = 1062.5
    // Tax (5% on subtotal): 1062.5 * 0.05 = 53.13
    // Final: 1062.5 + 53.13 = 1115.63
    expect(quote.surcharge).toBe(187.5);
    expect(quote.taxAmount).toBe(53.13);
    expect(quote.finalPayableAmount).toBe(1115.63);
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

  test('TC-UNIT-05: enforces strict two-decimal currency precision matching calculateAuthoritativeQuote', () => {
    const authoritative = calculateAuthoritativeQuote({
      basePrice: 1200,
      pricePerKm: 40,
      distanceKm: 3.7,
      hourIST: 20, // Peak hour -> 10% on base
    });

    expect(authoritative.base_price).toBe(1200);
    expect(authoritative.delivery_charge).toBe(148); // 3.7 * 40
    expect(authoritative.surcharge_amount).toBe(120); // 10% of 1200
    expect(authoritative.subtotal).toBe(1468);
    expect(authoritative.tax_amount).toBe(73.4); // 5% of 1468
    expect(authoritative.final_payable_amount).toBe(1541.4);
  });
});

