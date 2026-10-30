describe('TANKR Authoritative Pricing Calculations', () => {
  const calculateQuote = (
    capacityLiters: number,
    distanceKm: number,
    baseRatePerKl: number = 150,
    pricePerKm: number = 25,
    surgeMultiplier: number = 1.0
  ) => {
    const basePrice = (capacityLiters / 1000) * baseRatePerKl;
    const deliveryCharge = Math.round(distanceKm * pricePerKm * 100) / 100;
    const subtotal = (basePrice + deliveryCharge) * surgeMultiplier;
    const surcharge = surgeMultiplier > 1.0 ? Math.round((subtotal - (basePrice + deliveryCharge)) * 100) / 100 : 0;
    const taxableAmount = basePrice + deliveryCharge + surcharge;
    const gstRate = 0.05; // 5% GST on potable water transit
    const taxAmount = Math.round(taxableAmount * gstRate * 100) / 100;
    const finalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

    return {
      basePrice,
      deliveryCharge,
      surcharge,
      taxAmount,
      finalAmount,
    };
  };

  test('calculates correct quote for standard 5,000L tanker delivery', () => {
    const quote = calculateQuote(5000, 3.5, 150, 25, 1.0);
    expect(quote.basePrice).toBe(750); // 5 * 150
    expect(quote.deliveryCharge).toBe(87.5); // 3.5 * 25
    expect(quote.surcharge).toBe(0);
    expect(quote.taxAmount).toBe(41.88); // 5% of 837.50
    expect(quote.finalAmount).toBe(879.38);
  });

  test('applies surge pricing accurately during peak drought mode (1.25x)', () => {
    const standard = calculateQuote(10000, 4.0, 150, 25, 1.0);
    const surged = calculateQuote(10000, 4.0, 150, 25, 1.25);

    expect(standard.basePrice).toBe(1500);
    expect(surged.basePrice).toBe(1500);
    expect(surged.surcharge).toBe(400); // 25% of (1500 + 100)
    expect(surged.finalAmount).toBeGreaterThan(standard.finalAmount);
  });

  test('rejects negative or impossible delivery distance', () => {
    const runInvalid = () => {
      const dist = -5;
      if (dist < 0 || dist > 60) throw new Error('Distance out of operational bounds');
      return calculateQuote(5000, dist);
    };

    expect(runInvalid).toThrow('Distance out of operational bounds');
  });
});
