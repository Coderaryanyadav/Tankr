import { Pool } from 'pg';

// Test Database Connection Configuration
// Security: Never hardcode database credentials. Requires explicit TEST_DATABASE_URL.
const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

// Refuse execution against unknown or unvalidated production targets
const isTestDbConfigured = Boolean(
  TEST_DB_URL &&
  (process.env.ALLOW_TEST_DB === 'true' || process.env.NODE_ENV === 'test') &&
  !TEST_DB_URL.includes('prod')
);

const describeOrSkip = isTestDbConfigured ? describe : describe.skip;

describeOrSkip('TANKR Live Staging End-to-End Multi-Role Dispatch Verification', () => {
  let pool: Pool;
  let testSupplierId: string | null = null;
  let testTankerId: string | null = null;
  let testBookingId: string | null = null;

  beforeAll(() => {
    if (!TEST_DB_URL) return;
    pool = new Pool({
      connectionString: TEST_DB_URL,
      ssl: { rejectUnauthorized: false },
    });
  });

  afterAll(async () => {
    if (pool) {
      // Clean up any test entities created during test run
      const client = await pool.connect();
      try {
        if (testBookingId) {
          await client.query('DELETE FROM public.invoices WHERE booking_id = $1;', [testBookingId]);
          await client.query('DELETE FROM public.driver_payout_ledger WHERE booking_id = $1;', [testBookingId]);
          await client.query('DELETE FROM public.tracking_breadcrumbs WHERE booking_id = $1;', [testBookingId]);
          await client.query('DELETE FROM public.payments WHERE booking_id = $1;', [testBookingId]);
          await client.query('DELETE FROM public.notifications WHERE booking_id = $1;', [testBookingId]);
          await client.query('DELETE FROM public.bookings WHERE id = $1;', [testBookingId]);
        }
        if (testTankerId) {
          await client.query('DELETE FROM public.tankers WHERE id = $1;', [testTankerId]);
        }
        if (testSupplierId) {
          await client.query('DELETE FROM public.suppliers WHERE id = $1;', [testSupplierId]);
        }
      } catch {
        // Ignored in cleanup
      } finally {
        client.release();
        await pool.end();
      }
    }
  });

  test('successfully executes complete 4-party booking lifecycle against verified PostgreSQL engine', async () => {
    const client = await pool.connect();
    try {
      // 1. SETUP: Verify/Seed test actors in Mumbai / Marol operations
      const testPhone = '98200' + Math.floor(10000 + Math.random() * 90000);
      const testVehicle = 'MH-02-TEST-' + Math.floor(1000 + Math.random() * 9000);
      const testGstin = '27TEST' + Math.floor(1000 + Math.random() * 9000) + 'F1Z5';

      // 1a. Ensure test supplier exists
      const supRes = await client.query(
        `INSERT INTO public.suppliers (business_name, contact_phone, gstin, is_verified, rating, total_deliveries, water_source)
         VALUES ($1, $2, $3, TRUE, 4.9, 120, 'BMC Bhandup Potable Filtration Reservoir')
         RETURNING id;`,
        ['Marol Quality Staging Logistics', testPhone, testGstin]
      );
      testSupplierId = supRes.rows[0].id;
      expect(testSupplierId).toBeDefined();

      // 1b. Ensure tanker exists & is available (Mumbai / Marol coordinates)
      const tankerRes = await client.query(
        `INSERT INTO public.tankers (
           supplier_id, vehicle_number, driver_name, driver_phone,
           capacity_liters, water_type, base_price, price_per_km,
           is_available, is_online, latitude, longitude,
           current_location
         )
         VALUES ($1, $2, 'Ramesh Shinde', $3, 5000, 'Potable (Drinking)', 750.00, 25.00, TRUE, TRUE, 19.1171, 72.8809,
                 ST_SetSRID(ST_MakePoint(72.8809, 19.1171), 4326)::geography)
         ON CONFLICT (vehicle_number) DO UPDATE SET is_available = TRUE, is_online = TRUE
         RETURNING id;`,
        [testSupplierId, testVehicle, testPhone]
      );
      testTankerId = tankerRes.rows[0].id;
      expect(testTankerId).toBeDefined();

      // 1c. Ensure customer profile exists
      const custPhone = '98100' + Math.floor(10000 + Math.random() * 90000);
      const custRes = await client.query(
        `INSERT INTO public.profiles (phone_number, full_name, role, is_onboarding_completed)
         VALUES ($1, 'Test Customer Mumbai', 'customer', TRUE)
         ON CONFLICT (phone_number) DO UPDATE SET is_onboarding_completed = TRUE
         RETURNING id;`,
        [custPhone]
      );
      const customerId = custRes.rows[0].id;
      expect(customerId).toBeDefined();

      // 2. DISPATCH ATOMIC CREATION: Customer books tanker via RPC
      const createRes = await client.query(
        `SELECT * FROM create_booking_atomic(
           $1, $2, 'Marol Military Road, Andheri East, Mumbai 400059', 19.1171, 72.8809, 'upi'
         );`,
        [testTankerId, customerId]
      );

      const bookingRow = createRes.rows[0];
      testBookingId = bookingRow.booking_id;
      const bookingPin = bookingRow.delivery_pin;
      expect(testBookingId).toBeDefined();
      expect(bookingPin).toHaveLength(4);
      expect(bookingRow.status).toBe('pending');
      expect(Number(bookingRow.final_payable_amount)).toBeGreaterThan(700);

      // Verify tanker is marked unavailable
      const lockedTankerRes = await client.query(
        `SELECT is_available FROM public.tankers WHERE id = $1;`,
        [testTankerId]
      );
      expect(lockedTankerRes.rows[0].is_available).toBe(false);

      // 3. SUPPLIER STAGE: Supplier accepts order and assigns driver
      const acceptRes = await client.query(
        `UPDATE public.bookings
         SET status = 'accepted', updated_at = NOW()
         WHERE id = $1
         RETURNING status;`,
        [testBookingId]
      );
      expect(acceptRes.rows[0].status).toBe('accepted');

      const assignRes = await client.query(
        `UPDATE public.bookings
         SET status = 'driver_assigned',
             driver_name = 'Ramesh Shinde',
             driver_phone = $2,
             vehicle_number = $3,
             updated_at = NOW()
         WHERE id = $1
         RETURNING status;`,
        [testBookingId, testPhone, testVehicle]
      );
      expect(assignRes.rows[0].status).toBe('driver_assigned');

      // 4. DRIVER STAGE: Trip progression & Real-Time Telemetry
      const enRouteRes = await client.query(
        `UPDATE public.bookings
         SET status = 'en_route', updated_at = NOW()
         WHERE id = $1
         RETURNING status;`,
        [testBookingId]
      );
      expect(enRouteRes.rows[0].status).toBe('en_route');

      // Record GPS location ping via RPC
      const pingRes = await client.query(
        `SELECT * FROM record_driver_location_ping($1, 19.1175, 72.8812, 45.0, 25.0);`,
        [testBookingId]
      );
      expect(pingRes.rows[0].valid).toBe(true);

      // Driver arrives at gate
      const arrivedRes = await client.query(
        `UPDATE public.bookings
         SET status = 'arrived', updated_at = NOW()
         WHERE id = $1
         RETURNING status;`,
        [testBookingId]
      );
      expect(arrivedRes.rows[0].status).toBe('arrived');

      // Hose connected, water pumping starts
      const pumpingRes = await client.query(
        `UPDATE public.bookings
         SET status = 'delivering', updated_at = NOW()
         WHERE id = $1
         RETURNING status;`,
        [testBookingId]
      );
      expect(pumpingRes.rows[0].status).toBe('delivering');

      // 5. DELIVERY VERIFICATION: Flow Meter Readings & PIN Exchange
      const verifyRes = await client.query(
        `SELECT * FROM driver_complete_delivery_with_meter($1, $2, 14200.0, 19200.0, 5000);`,
        [testBookingId, bookingPin]
      );
      const deliveryResult =
        verifyRes.rows[0].driver_complete_delivery_with_meter || verifyRes.rows[0];
      expect(deliveryResult.success).toBe(true);
      expect(Number(deliveryResult.delivered_liters)).toBe(5000);

      // 6. POST-DELIVERY AUDIT & RECONCILIATION
      const finalBookingRes = await client.query(
        `SELECT status, flow_meter_start, flow_meter_end, delivered_liters
         FROM public.bookings WHERE id = $1;`,
        [testBookingId]
      );
      expect(finalBookingRes.rows[0].status).toBe('delivered');
      expect(Number(finalBookingRes.rows[0].delivered_liters)).toBe(5000);

      // Verify GST Invoice
      const invoiceRes = await client.query(
        `SELECT * FROM public.invoices WHERE booking_id = $1;`,
        [testBookingId]
      );
      expect(invoiceRes.rows.length).toBe(1);
      expect(invoiceRes.rows[0].invoice_number).toMatch(/^INV-/);

      // Verify driver payout ledger
      const ledgerRes = await client.query(
        `SELECT * FROM public.driver_payout_ledger WHERE booking_id = $1;`,
        [testBookingId]
      );
      expect(ledgerRes.rows.length).toBe(1);
      expect(Number(ledgerRes.rows[0].amount)).toBeGreaterThan(500);

      // Tanker is freed and marked available again
      const freedTankerRes = await client.query(
        `SELECT is_available FROM public.tankers WHERE id = $1;`,
        [testTankerId]
      );
      expect(freedTankerRes.rows[0].is_available).toBe(true);
    } finally {
      client.release();
    }
  }, 30000);
});
