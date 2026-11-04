describe('Supplier Verification, Fleet Compliance & Customer Dispute Arbitration', () => {
  const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const ALLOWED_CAPACITIES = [1000, 2000, 5000, 10000, 12000, 20000];

  const validateSupplierRegistration = (params: {
    businessName: string;
    contactPhone: string;
    gstin: string;
    agreeSLA: boolean;
  }) => {
    if (!params.businessName || params.businessName.trim().length < 3) {
      throw new Error('Business name must be at least 3 characters');
    }
    if (!/^[6-9]\d{9}$/.test(params.contactPhone)) {
      throw new Error('Invalid Indian mobile phone number');
    }
    if (!GSTIN_REGEX.test(params.gstin)) {
      throw new Error('Invalid 15-character Indian GSTIN format');
    }
    if (!params.agreeSLA) {
      throw new Error('You must accept the Supplier SLA terms');
    }
    return { valid: true };
  };

  const validateVehicleOnboarding = (capacityLiters: number, vehicleNumber: string) => {
    if (!ALLOWED_CAPACITIES.includes(capacityLiters)) {
      throw new Error(`Unauthorized capacity: ${capacityLiters}L. Allowed: ${ALLOWED_CAPACITIES.join(', ')}`);
    }
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,4}[0-9]{4}$/.test(vehicleNumber.replace(/-/g, ''))) {
      throw new Error('Invalid Indian commercial RTO vehicle registration number');
    }
    return { valid: true };
  };

  const calculateDeliveredWaterFromMeter = (startReading: number, endReading: number) => {
    if (endReading <= startReading) {
      throw new Error('Flow meter end reading must be strictly greater than start reading');
    }
    const delivered = Math.round(endReading - startReading);
    return delivered;
  };

  test('validates valid supplier enterprise onboarding registration', () => {
    const res = validateSupplierRegistration({
      businessName: 'Cauvery Pure Water Solutions LLP',
      contactPhone: '9845012345',
      gstin: '29ABCDE1234F1Z5',
      agreeSLA: true,
    });
    expect(res.valid).toBe(true);
  });

  test('rejects supplier registration with invalid GSTIN format', () => {
    expect(() =>
      validateSupplierRegistration({
        businessName: 'Fake Water Supplier',
        contactPhone: '9845012345',
        gstin: 'INVALID_GST_123',
        agreeSLA: true,
      })
    ).toThrow('Invalid 15-character Indian GSTIN format');
  });

  test('enforces authorized tanker capacities only', () => {
    expect(validateVehicleOnboarding(5000, 'KA-04-TC-5001').valid).toBe(true);
    expect(validateVehicleOnboarding(10000, 'KA-04-TC-1002').valid).toBe(true);
    expect(() => validateVehicleOnboarding(7500, 'KA-04-TC-7500')).toThrow(
      'Unauthorized capacity: 7500L'
    );
  });

  test('accurately calculates flow meter delivered liters and flags tampering', () => {
    const delivered = calculateDeliveredWaterFromMeter(14200.0, 19200.0);
    expect(delivered).toBe(5000);

    expect(() => calculateDeliveredWaterFromMeter(19200.0, 14200.0)).toThrow(
      'Flow meter end reading must be strictly greater than start reading'
    );
  });

  test('handles customer dispute categorization and refund reconciliation', () => {
    interface Dispute {
      id: string;
      bookingId: string;
      category: 'short_delivery' | 'water_quality' | 'driver_conduct' | 'delayed_arrival';
      claimedLiters?: number;
      refundAmount: number;
      status: 'open' | 'refunded' | 'resolved';
    }

    const dispute: Dispute = {
      id: 'disp-001',
      bookingId: 'bk-101',
      category: 'short_delivery',
      claimedLiters: 4200, // Ordered 5000, received 4200 (800L short)
      refundAmount: 0,
      status: 'open',
    };

    // Admin resolves with partial refund
    const resolveDispute = (d: Dispute, refundLiters: number, ratePerLiter: number = 0.175) => {
      const refund = Math.round(refundLiters * ratePerLiter * 100) / 100;
      return {
        ...d,
        refundAmount: refund,
        status: 'refunded' as const,
      };
    };

    const resolved = resolveDispute(dispute, 800);
    expect(resolved.status).toBe('refunded');
    expect(resolved.refundAmount).toBe(140);
  });
});

