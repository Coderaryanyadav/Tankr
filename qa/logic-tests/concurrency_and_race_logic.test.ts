describe('LOGIC-04: Concurrency, Race Conditions & Mutex Isolation', () => {
  // In-memory atomic state simulator mimicking PostgreSQL row-level locks (FOR UPDATE)
  class AtomicTankerRegistry {
    private tankers: Map<string, { is_available: boolean; current_booking_id: string | null }> =
      new Map();
    private locks: Set<string> = new Set();

    constructor() {
      this.tankers.set('tanker-uuid-001', { is_available: true, current_booking_id: null });
      this.tankers.set('tanker-uuid-002', { is_available: true, current_booking_id: null });
    }

    /**
     * Simulates PostgreSQL `create_booking_atomic` with `SELECT ... FOR UPDATE`
     */
    async bookTankerAtomic(tankerId: string, customerId: string): Promise<{ success: boolean; error?: string }> {
      // Check mutex lock
      if (this.locks.has(tankerId)) {
        return { success: false, error: 'Row lock contention: concurrent transaction detected' };
      }

      this.locks.add(tankerId);

      // Simulate microsecond network / DB delay
      await new Promise((r) => setTimeout(r, 10));

      try {
        const tanker = this.tankers.get(tankerId);
        if (!tanker) {
          return { success: false, error: 'Tanker not found' };
        }

        if (!tanker.is_available) {
          return { success: false, error: 'Tanker already reserved by another customer' };
        }

        // Reserve
        tanker.is_available = false;
        tanker.current_booking_id = `booking-${customerId}`;
        return { success: true };
      } finally {
        this.locks.delete(tankerId);
      }
    }

    isTankerAvailable(tankerId: string): boolean {
      return this.tankers.get(tankerId)?.is_available ?? false;
    }
  }

  describe('5.1 Double-Booking Race Condition Simulation', () => {
    it('only allows exactly 1 successful reservation when 2 customers book the same tanker simultaneously', async () => {
      const registry = new AtomicTankerRegistry();
      const tankerId = 'tanker-uuid-001';

      // 2 customers send booking request at the exact same millisecond
      const [resCustomerA, resCustomerB] = await Promise.all([
        registry.bookTankerAtomic(tankerId, 'cust-alpha'),
        registry.bookTankerAtomic(tankerId, 'cust-beta'),
      ]);

      const successCount = [resCustomerA.success, resCustomerB.success].filter(Boolean).length;
      const failureCount = [resCustomerA.success, resCustomerB.success].filter((s) => !s).length;

      // Exactly ONE must succeed, and ONE must fail
      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Tanker must now be marked unavailable
      expect(registry.isTankerAvailable(tankerId)).toBe(false);
    });

    it('rejects 10 concurrent requests for a single tanker asset with 9 rejections', async () => {
      const registry = new AtomicTankerRegistry();
      const tankerId = 'tanker-uuid-002';

      // 10 concurrent requests
      const promises = Array.from({ length: 10 }).map((_, idx) =>
        registry.bookTankerAtomic(tankerId, `cust-${idx}`)
      );

      const results = await Promise.all(promises);
      const successful = results.filter((r) => r.success);
      const rejected = results.filter((r) => !r.success);

      expect(successful.length).toBe(1);
      expect(rejected.length).toBe(9);
    });
  });

  describe('5.2 Community Sump Pool Atomic Over-Funding Prevention', () => {
    class AtomicPool {
      public target: number = 2400;
      public collected: number = 2000;
      public isClosed: boolean = false;
      private lock: boolean = false;

      async contribute(amount: number): Promise<{ success: boolean; amountPledged: number; error?: string }> {
        if (this.lock) {
          await new Promise((r) => setTimeout(r, 5));
        }
        this.lock = true;

        try {
          if (this.isClosed) {
            return { success: false, amountPledged: 0, error: 'Pool is fully funded' };
          }

          const remainingNeeded = this.target - this.collected;
          if (remainingNeeded <= 0) {
            this.isClosed = true;
            return { success: false, amountPledged: 0, error: 'Target already reached' };
          }

          // If contribution exceeds remaining needed, cap it at exact remaining amount
          const actualPledged = Math.min(amount, remainingNeeded);
          this.collected += actualPledged;

          if (this.collected >= this.target) {
            this.isClosed = true;
          }

          return { success: true, amountPledged: actualPledged };
        } finally {
          this.lock = false;
        }
      }
    }

    it('caps total pool collection strictly at target amount under concurrent pledges', async () => {
      const pool = new AtomicPool(); // Target ₹2400, Currently ₹2000 (Remaining ₹400)

      // Flat 401 wants to contribute ₹300, Flat 402 wants to contribute ₹300 concurrently
      const [pledge1, pledge2] = await Promise.all([
        pool.contribute(300),
        pool.contribute(300),
      ]);

      expect(pool.collected).toBe(2400); // Cannot exceed target ₹2400
      expect(pool.isClosed).toBe(true);

      const totalPledged = (pledge1.amountPledged || 0) + (pledge2.amountPledged || 0);
      expect(totalPledged).toBe(400);
    });
  });
});
