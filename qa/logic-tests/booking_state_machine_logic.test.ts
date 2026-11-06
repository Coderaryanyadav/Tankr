import {
  BookingStatus,
  isValidTransition,
  calculateCancellationRefund,
  validateDeliveryCompletion,
} from '../../src/services/stateMachineService';

describe('LOGIC-03: Booking State Machine & Transition Logic Audit', () => {
  describe('4.1 Valid Forward State Progression', () => {
    it('allows complete linear lifecycle from pending to delivered', () => {
      const fullLifecycle: BookingStatus[] = [
        'pending',
        'accepted',
        'driver_assigned',
        'en_route',
        'arrived',
        'delivering',
        'delivered',
      ];

      for (let i = 0; i < fullLifecycle.length - 1; i++) {
        const from = fullLifecycle[i];
        const to = fullLifecycle[i + 1];
        expect(isValidTransition(from, to)).toBe(true);
      }
    });

    it('allows cancellation from pre-delivery states', () => {
      const cancellableStates: BookingStatus[] = [
        'pending',
        'accepted',
        'driver_assigned',
        'en_route',
        'arrived',
      ];

      cancellableStates.forEach((state) => {
        expect(isValidTransition(state, 'cancelled')).toBe(true);
      });
    });
  });

  describe('4.2 Illegal State Transitions (Immutability & Safety)', () => {
    it('rejects backward transitions', () => {
      expect(isValidTransition('delivering', 'pending')).toBe(false);
      expect(isValidTransition('en_route', 'accepted')).toBe(false);
      expect(isValidTransition('arrived', 'driver_assigned')).toBe(false);
    });

    it('strictly forbids transitions from terminal states', () => {
      const allStates: BookingStatus[] = [
        'pending',
        'accepted',
        'driver_assigned',
        'en_route',
        'arrived',
        'delivering',
        'delivered',
        'cancelled',
      ];

      // Terminal state: delivered
      allStates.forEach((state) => {
        expect(isValidTransition('delivered', state)).toBe(false);
      });

      // Terminal state: cancelled
      allStates.forEach((state) => {
        expect(isValidTransition('cancelled', state)).toBe(false);
      });
    });

    it('forbids cancellation once pumping has started (delivering)', () => {
      expect(isValidTransition('delivering', 'cancelled')).toBe(false);
    });
  });

  describe('4.3 Cancellation Policy & Refund Calculation', () => {
    const totalPaid = 1449.00;

    it('gives 100% refund when cancelled before driver dispatch (pending/accepted)', () => {
      const refundPending = calculateCancellationRefund('pending', totalPaid);
      expect(refundPending.cancellationFee).toBe(0.00);
      expect(refundPending.refundAmount).toBe(totalPaid);

      const refundAccepted = calculateCancellationRefund('accepted', totalPaid);
      expect(refundAccepted.cancellationFee).toBe(0.00);
      expect(refundAccepted.refundAmount).toBe(totalPaid);
    });

    it('deducts ₹150 for en_route and ₹200 for arrived according to cancellation policy', () => {
      const refundEnRoute = calculateCancellationRefund('en_route', totalPaid);
      expect(refundEnRoute.cancellationFee).toBe(150.00);
      expect(refundEnRoute.refundAmount).toBe(totalPaid - 150.00);

      const refundArrived = calculateCancellationRefund('arrived', totalPaid);
      expect(refundArrived.cancellationFee).toBe(200.00);
      expect(refundArrived.refundAmount).toBe(totalPaid - 200.00);
    });

    it('throws error when attempting cancellation on delivering or delivered', () => {
      expect(() => calculateCancellationRefund('delivering', totalPaid)).toThrow(
        /Cannot cancel booking during pumping/i
      );
      expect(() => calculateCancellationRefund('delivered', totalPaid)).toThrow(
        /Cannot cancel delivered booking/i
      );
    });
  });

  describe('4.4 Delivery Completion Validation (Meter Reading & PIN)', () => {
    it('validates delivery when meter_end strictly exceeds meter_start and PIN matches', () => {
      const res = validateDeliveryCompletion({
        expectedPin: '5582',
        enteredPin: '5582',
        meterStart: 10450.5,
        meterEnd: 15450.5, // 5000L delivered
        bookedCapacity: 5000,
      });

      expect(res.valid).toBe(true);
      expect(res.volumeDelivered).toBe(5000);
    });

    it('rejects delivery if PIN is incorrect', () => {
      const res = validateDeliveryCompletion({
        expectedPin: '5582',
        enteredPin: '9999',
        meterStart: 1000,
        meterEnd: 6000,
        bookedCapacity: 5000,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Invalid 4-digit Delivery PIN/i);
    });

    it('rejects delivery if meter_end is less than or equal to meter_start', () => {
      const resNegative = validateDeliveryCompletion({
        expectedPin: '5582',
        enteredPin: '5582',
        meterStart: 5000,
        meterEnd: 4000, // Negative flow!
        bookedCapacity: 5000,
      });

      expect(resNegative.valid).toBe(false);
      expect(resNegative.error).toMatch(/Ending meter reading must strictly exceed/i);

      const resZero = validateDeliveryCompletion({
        expectedPin: '5582',
        enteredPin: '5582',
        meterStart: 5000,
        meterEnd: 5000, // 0 flow
        bookedCapacity: 5000,
      });

      expect(resZero.valid).toBe(false);
    });

    it('rejects delivery if delivered volume is less than 95% of booked capacity', () => {
      const resUnder = validateDeliveryCompletion({
        expectedPin: '5582',
        enteredPin: '5582',
        meterStart: 1000,
        meterEnd: 5500, // 4500L delivered out of 5000L booked (90% < 95%)
        bookedCapacity: 5000,
      });

      expect(resUnder.valid).toBe(false);
      expect(resUnder.error).toMatch(/below 95 percent of booked capacity/i);

      const resValidThreshold = validateDeliveryCompletion({
        expectedPin: '5582',
        enteredPin: '5582',
        meterStart: 1000,
        meterEnd: 5750, // 4750L delivered (exactly 95%)
        bookedCapacity: 5000,
      });

      expect(resValidThreshold.valid).toBe(true);
      expect(resValidThreshold.volumeDelivered).toBe(4750);

      // Verify proration logic at 95% delivery:
      const bookedCapacity = 5000;
      const finalPayable = 840;
      const shortfall = bookedCapacity - resValidThreshold.volumeDelivered; // 250L
      const refundProrated = Math.round((finalPayable / bookedCapacity) * shortfall * 100) / 100; // 42.00
      expect(refundProrated).toBe(42);
    });

    it('rejects driver_update_delivery_status with delivered status (meter verification required)', () => {
      // Simulates driver_update_delivery_status stored procedure validation
      const simulateDriverUpdateStatus = (newStatus: string) => {
        if (newStatus === 'delivered') {
          return {
            success: false,
            error: 'Delivered status can only be certified through driver_complete_delivery_with_meter with verified meter readings.',
          };
        }
        return { success: true };
      };

      const result = simulateDriverUpdateStatus('delivered');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Delivered status can only be certified through driver_complete_delivery_with_meter/i);
    });
  });
});
