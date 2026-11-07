import fs from 'fs';
import path from 'path';

describe('Critical Security Audit Remediation (SEC-001 to SEC-005)', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/migrations/20261031000001_master_database_schema.sql');
  const rpcPath = path.resolve(process.cwd(), 'supabase/migrations/20261031000002_core_operational_rpcs.sql');
  const forwardPath = path.resolve(process.cwd(), 'supabase/migrations/20261107000003_payment_delivery_invariants.sql');

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const rpcContent = fs.readFileSync(rpcPath, 'utf8');
  const forwardContent = fs.existsSync(forwardPath) ? fs.readFileSync(forwardPath, 'utf8') : '';

  describe('SEC-001: Database Permissions & Least-Privilege Grants', () => {
    test('Migration eliminates blanket GRANT ALL to anon and authenticated roles', () => {
      // Must not have unqualified GRANT ALL ON ALL TABLES TO anon
      const blanketTableGrant = /GRANT\s+ALL\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+public\s+TO[^;]*\banon\b/i;
      expect(blanketTableGrant.test(schemaContent)).toBe(false);

      // Must explicitly revoke blanket tables and sequences from anon
      expect(schemaContent).toContain('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;');
      expect(schemaContent).toContain('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;');
      expect(schemaContent).toContain('REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon;');
    });

    test('Administrative-only RLS policies do not use USING (TRUE)', () => {
      // Emergency dispatches admin policy
      expect(schemaContent).toMatch(/CREATE\s+POLICY\s+"Admins full emergency dispatches"[^;]+USING\s*\(\s*public\.is_admin\(auth\.uid\(\)\)/i);
      
      // Corporate subscriptions admin policy
      expect(schemaContent).toMatch(/CREATE\s+POLICY\s+"Admins full corporate subscriptions"[^;]+USING\s*\(\s*public\.is_admin\(auth\.uid\(\)\)/i);
      
      // Platform settings admin policy
      expect(schemaContent).toMatch(/CREATE\s+POLICY\s+"Admins full platform settings"[^;]+USING\s*\(\s*public\.is_admin\(auth\.uid\(\)\)/i);
      
      // Admin audit logs policy
      expect(schemaContent).toMatch(/CREATE\s+POLICY\s+"Admins full audit logs"[^;]+USING\s*\(\s*public\.is_admin\(auth\.uid\(\)\)/i);

      // Downstream tables in migration do not use blanket true
      expect(schemaContent).not.toMatch(/CREATE\s+POLICY\s+"driver_payout_ledger_all"\s+ON\s+public\.driver_payout_ledger\s+FOR\s+ALL\s+USING\s*\(\s*true\s*\)/i);
      expect(schemaContent).not.toMatch(/CREATE\s+POLICY\s+"emergency_dispatches_all"\s+ON\s+public\.emergency_dispatches\s+FOR\s+ALL\s+USING\s*\(\s*true\s*\)/i);
      expect(schemaContent).not.toMatch(/CREATE\s+POLICY\s+"corporate_subscriptions_all"\s+ON\s+public\.corporate_subscriptions\s+FOR\s+ALL\s+USING\s*\(\s*true\s*\)/i);
    });
  });

  describe('SEC-002: Protection of Sensitive Supplier and Driver PII', () => {
    test('Driver profiles table is isolated from public unauthenticated reads', () => {
      // Must not allow unrestricted public SELECT on driver profiles
      expect(schemaContent).not.toMatch(/CREATE\s+POLICY\s+"Public read on driver_profiles"\s+ON\s+public\.driver_profiles\s+FOR\s+SELECT\s+USING\s*\(\s*TRUE\s*\)/i);
      // Must enforce driver profile ownership or admin check
      expect(schemaContent).toContain('profile_id = auth.uid()');
    });

    test('Tankers and Suppliers table require active/verified status or ownership for discovery', () => {
      expect(schemaContent).not.toMatch(/CREATE\s+POLICY\s+"Public read on suppliers"\s+ON\s+public\.suppliers\s+FOR\s+SELECT\s+USING\s*\(\s*TRUE\s*\)/i);
      expect(schemaContent).not.toMatch(/CREATE\s+POLICY\s+"Public read on tankers"\s+ON\s+public\.tankers\s+FOR\s+SELECT\s+USING\s*\(\s*TRUE\s*\)/i);
      expect(schemaContent).toContain('is_active = TRUE AND verification_status = \'verified\'');
      expect(schemaContent).toContain('is_online = TRUE AND is_available = TRUE');
    });

    test('get_nearby_tankers RPC redacts driver phone numbers to mitigate PII scraping', () => {
      expect(rpcContent).toContain('SUBSTRING(t.driver_phone, 1, 3)');
      expect(rpcContent).toContain('••••');
      expect(rpcContent).toMatch(/WHEN\s+v_caller_is_admin\s+THEN\s+t\.driver_phone/i);
    });
  });

  describe('SEC-003: Server-Authenticated and Idempotent Payment Reconciliation', () => {
    test('verify_and_reconcile_payment enforces caller authorization', () => {
      expect(schemaContent).toContain('auth.uid() <> v_booking.customer_id AND NOT public.is_admin(auth.uid())');
    });

    test('verify_and_reconcile_payment validates gateway payment ID and rejects mismatched signatures', () => {
      expect(schemaContent).toContain('p_gateway_payment_id IS NULL');
      expect(schemaContent).toContain('Cryptographic HMAC signature mismatch');
    });

    test('verify_and_reconcile_payment provides idempotent execution if already captured', () => {
      expect(schemaContent).toContain("IF v_payment.status = 'captured' THEN");
      expect(schemaContent).toContain("'idempotent', true");
    });
  });

  describe('SEC-004: Administrative Stored Procedures Authorization Guards', () => {
    test.each([
      ['admin_emergency_dispatch'],
      ['admin_execute_batch_payout'],
      ['admin_verify_supplier'],
      ['admin_resolve_dispute'],
      ['admin_rebalance_tanker'],
      ['get_admin_dashboard_metrics'],
      ['get_service_zone_liquidity_health'],
    ])('%s RPC enforces is_admin(auth.uid()) check at entry', (funcName) => {
      const funcDefIndex = schemaContent.indexOf(`FUNCTION public.${funcName}`);
      expect(funcDefIndex).toBeGreaterThan(-1);

      const funcSnippet = schemaContent.slice(funcDefIndex, funcDefIndex + 1200);
      expect(funcSnippet).toMatch(/public\.is_admin\(auth\.uid\(\)\)\s+OR\s+auth\.role\(\)\s*=\s*'service_role'/i);
      expect(funcSnippet).toContain('Access Denied: Administrative authorization required');
    });

    test('Both migrations end with blanket REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon', () => {
      expect(schemaContent).toContain('REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon;');
      expect(rpcContent).toContain('REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon;');
      expect(forwardContent).toContain('REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon;');
    });
  });

  describe('SEC-005: Strict Invariant Audit (No Forbidden Strings or Anon Execution)', () => {
    const allMigrations = [
      { name: '20261031000001_master_database_schema.sql', content: schemaContent },
      { name: '20261031000002_core_operational_rpcs.sql', content: rpcContent },
      { name: '20261107000003_payment_delivery_invariants.sql', content: forwardContent },
    ];

    test.each(allMigrations)('Migration $name contains no GRANT EXECUTE to anon', ({ content }) => {
      const grantExecuteAnon = /GRANT\s+EXECUTE[^;]+TO[^;]*\banon\b/i;
      expect(grantExecuteAnon.test(content)).toBe(false);
    });

    test.each(allMigrations)('Migration $name contains no p_verified, pay_tx_, sig_tx_, rfnd_, or +919820011001', ({ content }) => {
      expect(content).not.toContain('p_verified');
      expect(content).not.toContain('pay_tx_');
      expect(content).not.toContain('sig_tx_');
      expect(content).not.toContain('rfnd_');
      expect(content).not.toContain('+919820011001');
    });

    test.each(allMigrations)('Migration $name requires pgcrypto', ({ content }) => {
      expect(content).toMatch(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+["']?pgcrypto["']?/i);
    });

    test.each([
      { name: '20261031000001_master_database_schema.sql', content: schemaContent },
      { name: '20261107000003_payment_delivery_invariants.sql', content: forwardContent },
    ])('Migration $name enforces HMAC equality check and 95% meter delivery guard', ({ content }) => {
      // HMAC digest equality comparison
      expect(content).toContain("digest(lower(trim(p_gateway_signature)), 'sha256') <> digest(lower(trim(v_expected_sig)), 'sha256')");
      // 95% delivery guard
      expect(content).toMatch(/0\.95/);
      expect(content).toContain('delivered volume below 95 percent of booked capacity');
    });

    test('HMAC calculation matches known test vector for Razorpay checkout', () => {
      const crypto = require('crypto');
      const orderId = 'order_test_123456';
      const paymentId = 'pay_test_789012';
      const secret = 'test_secret_tankr_2026';
      const expectedHex = 'df200ab6aeec7f6cb3e871fd5963ddd3fc94bb96e419f112947033287e3870c9';

      const calculated = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(calculated).toBe(expectedHex);
    });

    test.each([
      { name: '20261031000001_master_database_schema.sql', content: schemaContent },
      { name: '20261107000003_payment_delivery_invariants.sql', content: forwardContent },
    ])('Migration $name uses convert_to UTF8 for HMAC calculation', ({ content }) => {
      expect(content).toContain("convert_to(p_gateway_order_id || '|' || p_gateway_payment_id, 'UTF8')");
      expect(content).toContain("convert_to(v_secret, 'UTF8')");
    });

    test('platform_settings table seed does not store server secrets', () => {
      expect(schemaContent).not.toMatch(/INSERT\s+INTO\s+public\.platform_settings[^;]+razorpay_key_secret/i);
      expect(schemaContent).not.toMatch(/INSERT\s+INTO\s+public\.platform_settings[^;]+razorpay_webhook_secret/i);
    });

    test('cancel_stale_pending_payment_bookings sweeps bookings in pending_payment older than 15 minutes', () => {
      expect(schemaContent).toContain('cancel_stale_pending_payment_bookings');
      expect(schemaContent).toContain("status = 'pending'");
      expect(schemaContent).toContain("payment_status = 'pending_payment'");
      expect(schemaContent).toContain("NOW() - INTERVAL '15 minutes'");
    });

    test('customer_cancel_booking_with_policy records fee before updating status to cancelled', () => {
      const funcIndex = schemaContent.indexOf('FUNCTION public.customer_cancel_booking_with_policy');
      expect(funcIndex).toBeGreaterThan(-1);
      const funcBody = schemaContent.slice(funcIndex, funcIndex + 2000);
      const feeIndex = funcBody.indexOf('SET cancellation_fee = v_fee');
      const cancelIndex = funcBody.indexOf("SET status = 'cancelled'::booking_status");
      expect(feeIndex).toBeGreaterThan(-1);
      expect(cancelIndex).toBeGreaterThan(feeIndex);
    });

    test('request_booking_refund reads stored cancellation_fee and returns success with 0 refund when no captured payment exists', () => {
      expect(schemaContent).toContain('v_fee := COALESCE(v_booking.cancellation_fee, 0.00);');
      expect(schemaContent).toContain("'refund_amount', 0");
    });
  });
});
