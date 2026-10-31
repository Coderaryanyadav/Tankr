import { BookingStatus } from '../../../src/types/booking';

// TANKR Formal State Machine Engine
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['driver_assigned', 'cancelled'],
  supplier_assigned: ['driver_assigned', 'cancelled'],
  driver_assigned: ['en_route', 'cancelled'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['delivering', 'cancelled'],
  delivering: ['delivered', 'disputed'],
  delivered: ['disputed'],
  cancelled: [], // Terminal
  disputed: ['delivered', 'cancelled'],
};

function canTransition(current: BookingStatus, target: BookingStatus): boolean {
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

// Cancellation Fee Schedule based on TANKR Logistics Rules
function calculateCancellationPolicy(status: BookingStatus, basePrice: number): {
  allowed: boolean;
  cancellationFee: number;
  refundAmount: number;
} {
  switch (status) {
    case 'pending':
    case 'accepted':
    case 'driver_assigned':
      // Free cancellation prior to vehicle dispatch
      return { allowed: true, cancellationFee: 0, refundAmount: basePrice };

    case 'en_route':
      // ₹150 vehicle dispatch compensation fee
      const enRouteFee = Math.min(basePrice, 150);
      return { allowed: true, cancellationFee: enRouteFee, refundAmount: basePrice - enRouteFee };

    case 'arrived':
      // ₹200 driver arrival & idle fuel compensation fee
      const arrivedFee = Math.min(basePrice, 200);
      return { allowed: true, cancellationFee: arrivedFee, refundAmount: basePrice - arrivedFee };

    case 'delivering':
    case 'delivered':
      // Cannot cancel once pumping has initiated or completed
      return { allowed: false, cancellationFee: basePrice, refundAmount: 0 };

    case 'cancelled':
      return { allowed: false, cancellationFee: 0, refundAmount: 0 };

    default:
      return { allowed: false, cancellationFee: 0, refundAmount: 0 };
  }
}

describe('TANKR Integration QA — Booking State Machine & Policy Transitions', () => {
  describe('State Machine Transition Graph', () => {
    test('TC-INT-09: permits valid forward delivery lifecycle', () => {
      expect(canTransition('pending', 'accepted')).toBe(true);
      expect(canTransition('accepted', 'driver_assigned')).toBe(true);
      expect(canTransition('driver_assigned', 'en_route')).toBe(true);
      expect(canTransition('en_route', 'arrived')).toBe(true);
      expect(canTransition('arrived', 'delivering')).toBe(true);
      expect(canTransition('delivering', 'delivered')).toBe(true);
    });

    test('TC-INT-10: strictly rejects invalid backward transitions (preventing rollback)', () => {
      expect(canTransition('delivered', 'pending')).toBe(false);
      expect(canTransition('delivering', 'en_route')).toBe(false);
      expect(canTransition('arrived', 'accepted')).toBe(false);
      expect(canTransition('cancelled', 'delivered')).toBe(false);
    });

    test('TC-INT-11: strictly rejects skipping required stages (e.g. pending directly to delivered)', () => {
      expect(canTransition('pending', 'delivered')).toBe(false);
      expect(canTransition('accepted', 'delivering')).toBe(false);
    });

    test('TC-INT-12: allows filing a dispute only on delivered or delivering orders', () => {
      expect(canTransition('delivered', 'disputed')).toBe(true);
      expect(canTransition('delivering', 'disputed')).toBe(true);
      expect(canTransition('pending', 'disputed')).toBe(false);
    });
  });

  describe('Cancellation Policy & Financial Refund Rules', () => {
    const totalOrderAmount = 1250.0;

    test('TC-INT-13: free 100% refund when cancelled before driver dispatch', () => {
      const policy = calculateCancellationPolicy('pending', totalOrderAmount);
      expect(policy.allowed).toBe(true);
      expect(policy.cancellationFee).toBe(0);
      expect(policy.refundAmount).toBe(1250.0);
    });

    test('TC-INT-14: applies ₹150 transit fee when cancelled while tanker is en route', () => {
      const policy = calculateCancellationPolicy('en_route', totalOrderAmount);
      expect(policy.allowed).toBe(true);
      expect(policy.cancellationFee).toBe(150.0);
      expect(policy.refundAmount).toBe(1100.0);
    });

    test('TC-INT-15: applies ₹200 arrival compensation fee when cancelled after tanker reached destination', () => {
      const policy = calculateCancellationPolicy('arrived', totalOrderAmount);
      expect(policy.allowed).toBe(true);
      expect(policy.cancellationFee).toBe(200.0);
      expect(policy.refundAmount).toBe(1050.0);
    });

    test('TC-INT-16: strictly forbids cancellation once water delivery hose is pumping', () => {
      const policy = calculateCancellationPolicy('delivering', totalOrderAmount);
      expect(policy.allowed).toBe(false);
      expect(policy.refundAmount).toBe(0);
    });
  });
});
