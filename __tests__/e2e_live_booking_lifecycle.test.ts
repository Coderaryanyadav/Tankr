import { Pool } from 'pg';

const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.qicoczialqxulcbipuix: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@aws-1-eu-west-3.pooler.supabase.com:6543/postgres';

describe('TANKR Live Staging End-to-End Multi-Role Dispatch Verification', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({
      connectionString: DB_URL,
      ssl: { rejectUnauthorized: false },
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  test('successfully executes complete 4-party booking lifecycle against live PostgreSQL engine', async () => {
    const client = await pool.connect();
    try {
      // 1. SETUP: Verify/Seed test actors
      // Admin, Customer, Supplier, Driver, and Tanker
      const testPhone = '98450' + Math.floor(10000 + Math.random() * 90000);
      const testVehicle = 'KA-04-TEST-' + Math.floor(1000 + Math.random() * 9000);
      const testGstin = '29TEST' + Math.floor(1000 + Math.random() * 9000) + 'F1Z1';

      // 1a. Ensure test supplier exists
      const supRes = await client.query(
        `INSERT INTO public.suppliers (business_name, contact_phone, gstin, is_verified, rating, total_deliveries)
         VALUES ($1, $2, $3, TRUE, 4.9, 120)
         RETURNING id;`,
        ['Cauvery Water Works (Staging)', testPhone, testGstin]
      );
      const supplierId = supRes.rows[0].id;
      expect(supplierId).toBeDefined();

      // 1b. Ensure tanker exists & is available
      const tankerRes = await client.query(
        `INSERT INTO public.tankers (
           supplier_id, vehicle_number, driver_name, driver_phone,
           capacity_liters, water_type, base_price, price_per_km,
           is_available, is_online, latitude, longitude
         )
         VALUES ($1, $2, 'Ramesh Kumar', $3, 5000, 'Potable (Drinking)', 750.00, 25.00, TRUE, TRUE, 12.9716, 77.5946)
         ON CONFLICT (vehicle_number) DO UPDATE SET is_available = TRUE, is_online = TRUE
         RETURNING id;`,
        [supplierId, testVehicle, testPhone]
      );
      const tankerId = tankerRes.rows[0].id;
      expect(tankerId).toBeDefined();

      // 1c. Ensure customer profile exists
      let customerId: string;
      const existingProfile = await client.query(
        `SELECT id FROM public.profiles WHERE role = 'customer' LIMIT 1;`
      );

      if (existingProfile.rows.length > 0) {
        customerId = existingProfile.rows[0].id;
      } else {
        const authUser = await client.query(
          `INSERT INTO auth.users (id, phone, email, raw_user_meta_data)
           VALUES (gen_random_uuid(), $1, $1 || '@test.tankr.in', '{"role":"customer"}'::jsonb)
           RETURNING id;`,
          ['+9198765' + Math.floor(10000 + Math.random() * 90000)]
        );
        customerId = authUser.rows[0].id;

        await client.query(
          `INSERT INTO public.profiles (id, phone_number, full_name, role, is_onboarding_completed)
           VALUES ($1, '+919876543210', 'Aarav Sharma (Customer)', 'customer', TRUE)
           ON CONFLICT (id) DO NOTHING;`,
          [customerId]
        );
      }
      expect(customerId).toBeDefined();

      // 2. CUSTOMER STAGE: Pricing Quote & Atomic Booking Creation
      const quoteRes = await client.query(
        `SELECT * FROM calculate_booking_quote($1, 12.9800, 77.6100);`,
        [tankerId]
      );
      expect(quoteRes.rows.length).toBe(1);
      const quote = quoteRes.rows[0];
      expect(Number(quote.capacity_liters)).toBe(5000);
      expect(Number(quote.base_price)).toBe(750);
      expect(Number(quote.final_payable_amount)).toBeGreaterThan(750);

      // Create booking atomically
      const bookingPin = '7392';
      const bookRes = await client.query(
        `INSERT INTO public.bookings (
           booking_reference, customer_id, tanker_id, supplier_id,
           status, capacity_liters, water_type, delivery_address,
           delivery_latitude, delivery_longitude, delivery_pin,
           delivery_distance_km, estimated_arrival_minutes,
           base_price, delivery_charge, surcharge, tax_amount,
           final_payable_amount, payment_preference, payment_status,
           quote_expires_at
         )
         VALUES (
           'BK-STG-' || floor(random() * 899999 + 100000)::text,
           $1, $2, $3, 'pending', 5000, 'Potable (Drinking)',
           'Indiranagar 100ft Road, Bengaluru', 12.9800, 77.6100, $4,
           $5, $6, $7, $8, $9, $10, $11, 'upi', 'pending',
           NOW() + INTERVAL '10 minutes'
         )
         RETURNING id, booking_reference, status;`,
        [
          customerId,
          tankerId,
          supplierId,
          bookingPin,
          quote.distance_km,
          quote.eta_minutes,
          quote.base_price,
          quote.delivery_charge,
          quote.surcharge,
          quote.tax_amount,
          quote.final_payable_amount,
        ]
      );

      const booking = bookRes.rows[0];
      expect(booking.status).toBe('pending');
      const bookingId = booking.id;

      // 3. SUPPLIER STAGE: Accept Booking & Assign Driver
      const acceptRes = await client.query(
        `UPDATE public.bookings
         SET status = 'accepted', updated_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING status;`,
        [bookingId]
      );
      expect(acceptRes.rows[0].status).toBe('accepted');

      const assignRes = await client.query(
        `UPDATE public.bookings
         SET status = 'driver_assigned', updated_at = NOW()
         WHERE id = $1 AND status = 'accepted'
         RETURNING status;`,
        [bookingId]
      );
      expect(assignRes.rows[0].status).toBe('driver_assigned');

      // 4. DRIVER STAGE: Trip progression & Real-Time Telemetry
      const enRouteRes = await client.query(
        `UPDATE public.bookings
         SET status = 'en_route', updated_at = NOW()
         WHERE id = $1
         RETURNING status;`,
        [bookingId]
      );
      expect(enRouteRes.rows[0].status).toBe('en_route');

      // Record GPS location ping via RPC
      const pingRes = await client.query(
        `SELECT * FROM record_driver_location_ping($1, 12.9750, 77.6050, 45.0, 32.5);`,
        [bookingId]
      );
      expect(pingRes.rows[0].valid).toBe(true);

      // Driver arrives at gate
      const arrivedRes = await client.query(
        `UPDATE public.bookings
         SET status = 'arrived', updated_at = NOW()
         WHERE id = $1
         RETURNING status;`,
        [bookingId]
      );
      expect(arrivedRes.rows[0].status).toBe('arrived');

      // Hose connected, water pumping starts
      const pumpingRes = await client.query(
        `UPDATE public.bookings
         SET status = 'delivering', updated_at = NOW()
         WHERE id = $1
         RETURNING status;`,
        [bookingId]
      );
      expect(pumpingRes.rows[0].status).toBe('delivering');

      // 5. DELIVERY VERIFICATION: Flow Meter Readings & PIN Exchange
      // Meter Start: 14,200L, Meter End: 19,200L => 5,000L Delivered
      const verifyRes = await client.query(
        `SELECT * FROM driver_complete_delivery_with_meter($1, $2, 14200.0, 19200.0, 5000);`,
        [bookingId, bookingPin]
      );
      const deliveryResult =
        verifyRes.rows[0].driver_complete_delivery_with_meter || verifyRes.rows[0];
      expect(deliveryResult.success).toBe(true);
      expect(Number(deliveryResult.delivered_liters)).toBe(5000);

      // 6. POST-DELIVERY AUDIT & RECONCILIATION
      // Check booking status is 'delivered'
      const finalBookingRes = await client.query(
        `SELECT status, flow_meter_start, flow_meter_end, delivered_liters
         FROM public.bookings WHERE id = $1;`,
        [bookingId]
      );
      expect(finalBookingRes.rows[0].status).toBe('delivered');
      expect(Number(finalBookingRes.rows[0].delivered_liters)).toBe(5000);

      // Check official GST Invoice was generated automatically during delivery completion
      const invoiceRes = await client.query(
        `SELECT * FROM public.invoices WHERE booking_id = $1;`,
        [bookingId]
      );
      expect(invoiceRes.rows.length).toBe(1);
      expect(invoiceRes.rows[0].invoice_number).toMatch(/^INV-/);
      expect(invoiceRes.rows[0].payment_status).toBe('PAID');
      expect(invoiceRes.rows[0].invoice_number).toMatch(/^INV-/);

      // Check driver/supplier payout ledger was credited
      const ledgerRes = await client.query(
        `SELECT * FROM public.driver_payout_ledger WHERE booking_id = $1;`,
        [bookingId]
      );
      expect(ledgerRes.rows.length).toBe(1);
      expect(Number(ledgerRes.rows[0].amount)).toBeGreaterThan(500);

      // Tanker is freed and marked available again
      const freedTankerRes = await client.query(
        `SELECT is_available FROM public.tankers WHERE id = $1;`,
        [tankerId]
      );
      expect(freedTankerRes.rows[0].is_available).toBe(true);
    } finally {
      client.release();
    }
  }, 30000);
});
