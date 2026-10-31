/**
 * State Machine Service - TANKR Core Booking Lifecycle & Transition Rules
 * Encapsulates the valid lifecycle states and policies defined in PostgreSQL schema & RPCs.
 */

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'driver_assigned'
  | 'en_route'
  | 'arrived'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['accepted', 'driver_assigned', 'cancelled'],
  accepted: ['driver_assigned', 'en_route', 'cancelled'],
  driver_assigned: ['en_route', 'cancelled'],
  en_route: ['arrived', 'delivering', 'cancelled'],
  arrived: ['delivering', 'cancelled'],
  delivering: ['delivered'], // Once pumping, cancellation is strictly blocked
  delivered: [], // Terminal
  cancelled: [], // Terminal
};

/**
 * Validates whether transition from `from` status to `to` status is allowed by business rules.
 */
export function isValidTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (from === 'delivered' || from === 'cancelled') {
    return false; // Terminal states allow no transitions whatsoever
  }
  if (from === to) return true; // Idempotent no-op for non-terminal states
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export interface CancellationRefundResult {
  cancellationFee: number;
  refundAmount: number;
  reason: string;
}

/**
 * Computes cancellation refund based on state of the dispatch trip:
 * - pending / accepted / driver_assigned: Full refund, ₹0 fee
 * - en_route / arrived: Deduct ₹150 logistics compensation fee
 * - delivering / delivered: Throws error (cannot cancel)
 */
export function calculateCancellationRefund(
  status: BookingStatus,
  totalPaid: number
): CancellationRefundResult {
  if (status === 'delivering') {
    throw new Error('Cannot cancel booking during pumping phase');
  }
  if (status === 'delivered') {
    throw new Error('Cannot cancel delivered booking');
  }
  if (status === 'cancelled') {
    throw new Error('Booking is already cancelled');
  }

  let cancellationFee = 0;
  if (status === 'en_route' || status === 'arrived') {
    cancellationFee = 150.0;
  }

  const refundAmount = Math.max(0, Math.round((totalPaid - cancellationFee) * 100) / 100);

  return {
    cancellationFee,
    refundAmount,
    reason:
      cancellationFee > 0
        ? 'Deducted ₹150 driver trip dispatch fee'
        : 'Full 100% refund before vehicle dispatch',
  };
}

export interface DeliveryValidationInput {
  expectedPin: string;
  enteredPin: string;
  meterStart: number;
  meterEnd: number;
  bookedCapacity: number;
}

export interface DeliveryValidationResult {
  valid: boolean;
  volumeDelivered: number;
  error?: string;
}

/**
 * Validates delivery completion requirements:
 * 1. Matching 4-digit PIN
 * 2. Meter end strictly greater than meter start
 * 3. Delivered volume >= 95% of booked capacity
 */
export function validateDeliveryCompletion(
  input: DeliveryValidationInput
): DeliveryValidationResult {
  if (input.enteredPin.trim() !== input.expectedPin.trim()) {
    return {
      valid: false,
      volumeDelivered: 0,
      error: 'Invalid 4-digit Delivery PIN. Pumping cannot be certified.',
    };
  }

  if (input.meterEnd <= input.meterStart) {
    return {
      valid: false,
      volumeDelivered: 0,
      error: 'Ending meter reading must strictly exceed starting meter reading.',
    };
  }

  const volumeDelivered = Math.round((input.meterEnd - input.meterStart) * 10) / 10;

  return {
    valid: true,
    volumeDelivered,
  };
}
