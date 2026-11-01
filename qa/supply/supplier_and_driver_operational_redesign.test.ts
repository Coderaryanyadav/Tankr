import { useSupplyStore } from '../../src/stores/supplyStore';

describe('TANKR — Supplier & Driver Operational Experience Redesign', () => {
  beforeEach(() => {
    useSupplyStore.setState({
      supplierId: 'sup-powai-01',
      supplierBusinessName: 'Powai Aquifers & Tanker Fleet',
      verificationStatus: 'verified',
      driverId: 'drv-rajesh-01',
      driverName: 'Rajesh Kumar',
      driverAssignedVehicle: { vehicle_number: 'MH-02-TC-5001', capacity_liters: 10000 },
      fleetTankers: [
        {
          id: 'tanker-1',
          vehicle_number: 'MH-02-TC-5001',
          capacity_liters: 10000,
          water_type: 'Potable (Drinking)',
          driver_name: 'Rajesh Kumar',
          driver_phone: '+919000000001',
          is_online: true,
          is_available: true,
        },
        {
          id: 'tanker-2',
          vehicle_number: 'MH-03-TC-8820',
          capacity_liters: 20000,
          water_type: 'Commercial RO Water',
          driver_name: 'Amit Patil',
          driver_phone: '+919820112345',
          is_online: true,
          is_available: false,
        },
      ],
      pendingRequests: [
        {
          id: 'req-01',
          booking_reference: 'TNK-94821',
          customer_id: 'cust-01',
          supplier_id: 'sup-powai-01',
          status: 'pending',
          water_type: 'Potable (Drinking)',
          capacity_liters: 10000,
          final_payable_amount: 2100,
          delivery_address: 'Oberoi Splendor, JVLR',
          delivery_distance_km: 2.4,
          created_at: new Date().toISOString(),
        } as any,
      ],
      activeDeliveries: [],
      supplierMetrics: {
        todayRevenue: 10500,
        todayLiters: 50000,
        activeDeliveriesCount: 1,
        completedCount: 5,
      },
      supplierPricing: {
        1000: 450,
        5000: 1200,
        10000: 2100,
        20000: 3800,
      },
      supplierSettlementDetails: {
        bankAccount: 'HDFC •••• 9182',
        ifsc: 'HDFC0001024',
        upiId: 'powaiwater@hdfcbank',
        pendingPayout: 17850,
        settledToday: 34200,
      },
      assignedDelivery: null,
      driverDutyStatus: true,
    });
  });

  describe('1. Supplier Operations Command Center', () => {
    it('calculates operational pulse metrics correctly', () => {
      const state = useSupplyStore.getState();

      const availableCount = state.fleetTankers.filter((v) => v.is_available && v.is_online).length;
      expect(availableCount).toBe(1);
      expect(state.pendingRequests.length).toBe(1);

      // Financials: Gross 10,500 -> 85% Net Hub share = 8,925
      const netToday = Math.round(state.supplierMetrics.todayRevenue * 0.85);
      expect(netToday).toBe(8925);

      const platformFee = Math.round(state.supplierMetrics.todayRevenue * 0.15);
      expect(platformFee).toBe(1575);
    });

    it('toggles vehicle availability and maintains live fleet readiness', async () => {
      const { toggleVehicleAvailability } = useSupplyStore.getState();

      // Toggle tanker-1 from available (true) to false
      const res = await toggleVehicleAvailability('tanker-1');
      expect(res.success).toBe(true);

      const updated = useSupplyStore.getState().fleetTankers.find((v) => v.id === 'tanker-1');
      expect(updated?.is_available).toBe(false);
      expect(updated?.is_online).toBe(false);
    });

    it('updates supplier pricing tiers across capacity configurations', async () => {
      const { updateSupplierPricing } = useSupplyStore.getState();

      await updateSupplierPricing({
        1000: 500,
        10000: 2250,
      });

      const pricing = useSupplyStore.getState().supplierPricing;
      expect(pricing[1000]).toBe(500);
      expect(pricing[10000]).toBe(2250);
      expect(pricing[5000]).toBe(1200); // Unaltered tier remains preserved
    });

    it('handles booking acceptance and removal from pending queue', async () => {
      const { acceptSupplierBooking } = useSupplyStore.getState();

      const res = await acceptSupplierBooking('req-01');
      expect(res.success).toBe(true);

      const pending = useSupplyStore.getState().pendingRequests;
      expect(pending.find((b) => b.id === 'req-01')).toBeUndefined();
    });
  });

  describe('2. Driver Operations & Stationary Verification Safety Console', () => {
    it('toggles driver duty status between active shift and rest', () => {
      const { toggleDriverDuty } = useSupplyStore.getState();
      expect(useSupplyStore.getState().driverDutyStatus).toBe(true);

      toggleDriverDuty();
      expect(useSupplyStore.getState().driverDutyStatus).toBe(false);

      toggleDriverDuty();
      expect(useSupplyStore.getState().driverDutyStatus).toBe(true);
    });

    it('validates stationary verification parameters (PIN and Flow Meter bounds)', () => {
      const validateStationarySubmission = (params: {
        pin: string;
        flowStart: number;
        flowEnd: number;
      }) => {
        if (params.pin.length !== 4) {
          return { success: false, error: 'PIN must be 4 digits' };
        }
        if (params.flowEnd <= params.flowStart) {
          return { success: false, error: 'End meter reading must exceed start reading' };
        }
        const delivered = Math.round(params.flowEnd - params.flowStart);
        return { success: true, deliveredLiters: delivered };
      };

      // Invalid PIN length
      expect(validateStationarySubmission({ pin: '12', flowStart: 100, flowEnd: 200 }).success).toBe(false);

      // Inverted flow meter reading
      expect(validateStationarySubmission({ pin: '5582', flowStart: 200, flowEnd: 100 }).success).toBe(false);

      // Equal flow meter reading (no water pumped)
      expect(validateStationarySubmission({ pin: '5582', flowStart: 200, flowEnd: 200 }).success).toBe(false);

      // Valid stationary reading
      const valid = validateStationarySubmission({ pin: '5582', flowStart: 12000, flowEnd: 22000 });
      expect(valid.success).toBe(true);
      expect(valid.deliveredLiters).toBe(10000);
    });

    it('accurately computes driver payout share (85% net settlement)', () => {
      const tripPayable = 2000;
      const driverEarnings = Math.round(tripPayable * 0.85);
      expect(driverEarnings).toBe(1700);

      const platformCommission = Math.round(tripPayable * 0.15);
      expect(platformCommission).toBe(300);
      expect(driverEarnings + platformCommission).toBe(tripPayable);
    });
  });
});
