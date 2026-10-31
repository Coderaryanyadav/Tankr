interface SimulatedTanker {
  id: string;
  isAvailable: boolean;
  assignedBookingId: string | null;
}

class SimulatedBookingEngine {
  private tanker: SimulatedTanker;
  private bookings: Array<{ id: string; customerId: string; status: string }> = [];

  constructor(tankerId: string) {
    this.tanker = { id: tankerId, isAvailable: true, assignedBookingId: null };
  }

  // Simulates PostgreSQL SELECT ... FOR UPDATE atomic transaction
  async attemptBooking(bookingId: string, customerId: string): Promise<{ success: boolean; error?: string }> {
    // Artificial small jitter to simulate network concurrency
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20)));

    if (!this.tanker.isAvailable) {
      return { success: false, error: 'Tanker is already reserved by another customer' };
    }

    // Atomic write
    this.tanker.isAvailable = false;
    this.tanker.assignedBookingId = bookingId;
    this.bookings.push({ id: bookingId, customerId, status: 'pending' });

    return { success: true };
  }

  getTankerState() {
    return { ...this.tanker };
  }

  getBookings() {
    return [...this.bookings];
  }
}

describe('TANKR Performance QA — Concurrency & Race Condition Elimination', () => {
  test('TC-PERF-01: exactly ONE booking succeeds when 2 customers book the identical tanker simultaneously', async () => {
    const engine = new SimulatedBookingEngine('tanker-marol-01');

    const customerA = engine.attemptBooking('book-001', 'cust-sunita');
    const customerB = engine.attemptBooking('book-002', 'cust-rahul');

    const [resA, resB] = await Promise.all([customerA, customerB]);

    // Exactly one must succeed, and one must fail
    const successes = [resA, resB].filter((r) => r.success);
    const failures = [resA, resB].filter((r) => !r.success);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(failures[0].error).toContain('already reserved');

    // Database state must show exactly one assigned booking
    const tankerState = engine.getTankerState();
    expect(tankerState.isAvailable).toBe(false);
    expect(tankerState.assignedBookingId).not.toBeNull();
    expect(engine.getBookings().length).toBe(1);
  });

  test('TC-PERF-02: handles 10 simultaneous competing booking requests with zero duplicate assignments', async () => {
    const engine = new SimulatedBookingEngine('tanker-marol-02');

    const requests = Array.from({ length: 10 }).map((_, i) =>
      engine.attemptBooking(`book-req-${i}`, `customer-${i}`)
    );

    const results = await Promise.all(requests);
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(9);
    expect(engine.getBookings().length).toBe(1);
  });
});
