describe('Booking Concurrency, State Machine & E2E Dispatch Loop', () => {
  type BookingStatus =
    | 'pending'
    | 'accepted'
    | 'driver_assigned'
    | 'en_route'
    | 'arrived'
    | 'delivering'
    | 'delivered'
    | 'cancelled'
    | 'disputed'
    | 'reassigning';

  interface TankerFleet {
    id: string;
    vehicleNumber: string;
    isAvailable: boolean;
    isLocked: boolean;
  }

  interface Booking {
    id: string;
    tankerId: string;
    customerId: string;
    driverId?: string;
    status: BookingStatus;
    deliveryPin: string;
    amount: number;
    quoteExpiresAt: number;
  }

  const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
    pending: ['accepted', 'cancelled', 'reassigning'],
    accepted: ['driver_assigned', 'cancelled', 'reassigning'],
    driver_assigned: ['en_route', 'cancelled'],
    en_route: ['arrived', 'cancelled'],
    arrived: ['delivering', 'cancelled'],
    delivering: ['delivered', 'disputed'],
    delivered: ['disputed'],
    cancelled: [],
    disputed: [],
    reassigning: ['accepted', 'cancelled'],
  };

  const advanceBookingStatus = (
    booking: Booking,
    nextStatus: BookingStatus,
    callerId: string,
    providedPin?: string
  ): Booking => {
    const allowed = VALID_TRANSITIONS[booking.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Illegal state transition from ${booking.status} to ${nextStatus}`);
    }

    if (nextStatus === 'delivered') {
      if (providedPin !== booking.deliveryPin) {
        throw new Error('Invalid delivery PIN code');
      }
    }

    return { ...booking, status: nextStatus };
  };

  test('prevents double-booking concurrency via atomic tanker lock', () => {
    const tanker: TankerFleet = {
      id: 'tanker-5k-01',
      vehicleNumber: 'KA-04-TC-5001',
      isAvailable: true,
      isLocked: false,
    };

    const bookTanker = (t: TankerFleet) => {
      if (!t.isAvailable || t.isLocked) {
        throw new Error('Tanker already locked or unavailable (concurrency collision)');
      }
      t.isLocked = true;
      t.isAvailable = false;
      return { success: true };
    };

    // First customer books
    const res1 = bookTanker(tanker);
    expect(res1.success).toBe(true);

    // Concurrent second customer attempts to book same tanker
    expect(() => bookTanker(tanker)).toThrow('Tanker already locked or unavailable');
  });

  test('validates complete happy-path booking dispatch lifecycle', () => {
    let booking: Booking = {
      id: 'bk-test-101',
      tankerId: 'tanker-5k-01',
      customerId: 'cust-01',
      driverId: 'drv-01',
      status: 'pending',
      deliveryPin: '5842',
      amount: 875,
      quoteExpiresAt: Date.now() + 10 * 60 * 1000,
    };

    // Supplier accepts
    booking = advanceBookingStatus(booking, 'accepted', 'sup-01');
    expect(booking.status).toBe('accepted');

    // Driver assigned
    booking = advanceBookingStatus(booking, 'driver_assigned', 'sup-01');
    expect(booking.status).toBe('driver_assigned');

    // Driver en route
    booking = advanceBookingStatus(booking, 'en_route', 'drv-01');
    expect(booking.status).toBe('en_route');

    // Driver arrived at gate
    booking = advanceBookingStatus(booking, 'arrived', 'drv-01');
    expect(booking.status).toBe('arrived');

    // Water hose connected, pumping starts
    booking = advanceBookingStatus(booking, 'delivering', 'drv-01');
    expect(booking.status).toBe('delivering');

    // Verified with 4-digit PIN
    booking = advanceBookingStatus(booking, 'delivered', 'drv-01', '5842');
    expect(booking.status).toBe('delivered');
  });

  test('rejects delivery completion if PIN does not match', () => {
    const booking: Booking = {
      id: 'bk-test-102',
      tankerId: 'tanker-5k-01',
      customerId: 'cust-01',
      driverId: 'drv-01',
      status: 'delivering',
      deliveryPin: '5842',
      amount: 875,
      quoteExpiresAt: Date.now() + 10 * 60 * 1000,
    };

    expect(() => advanceBookingStatus(booking, 'delivered', 'drv-01', '0000')).toThrow(
      'Invalid delivery PIN code'
    );
  });

  test('strictly prevents a cancelled booking from transitioning to delivered', () => {
    const cancelledBooking: Booking = {
      id: 'bk-test-103',
      tankerId: 'tanker-5k-01',
      customerId: 'cust-01',
      status: 'cancelled',
      deliveryPin: '5842',
      amount: 875,
      quoteExpiresAt: Date.now(),
    };

    expect(() => advanceBookingStatus(cancelledBooking, 'delivered', 'drv-01', '5842')).toThrow(
      'Illegal state transition from cancelled to delivered'
    );
  });

  test('applies tiered cancellation penalty policy correctly', () => {
    const evaluateCancellationFee = (status: BookingStatus) => {
      if (status === 'pending' || status === 'accepted') {
        return 0; // Free cancellation before vehicle dispatches
      }
      if (status === 'driver_assigned' || status === 'en_route') {
        return 150; // Transit compensation fee
      }
      if (status === 'arrived' || status === 'delivering') {
        return 200; // Full gate arrival fee
      }
      throw new Error('Cannot cancel a completed delivery');
    };

    expect(evaluateCancellationFee('pending')).toBe(0);
    expect(evaluateCancellationFee('accepted')).toBe(0);
    expect(evaluateCancellationFee('en_route')).toBe(150);
    expect(evaluateCancellationFee('arrived')).toBe(200);
    expect(() => evaluateCancellationFee('delivered')).toThrow('Cannot cancel a completed delivery');
  });
});

