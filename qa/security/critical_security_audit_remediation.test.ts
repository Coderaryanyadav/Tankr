import fs from 'fs';
import path from 'path';

describe('Critical Security Audit Remediation (SEC-001 to SEC-004)', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/migrations/20261031000001_master_database_schema.sql');
  const rpcPath = path.resolve(process.cwd(), 'supabase/migrations/20261031000002_core_operational_rpcs.sql');
  let schemaContent = '';
  let rpcContent = '';

  beforeAll(() => {
    schemaContent = fs.readFileSync(schemaPath, 'utf8');
    rpcContent = fs.readFileSync(rpcPath, 'utf8');
  });

  describe('SEC-001: Database Permissions & Least-Privilege Grants', () => {
    test('Migration eliminates blanket GRANT ALL to anon and authenticated roles', () => {
      // Must not have unqualified GRANT ALL ON ALL TABLES TO anon
      const blanketTableGrant = /GRANT\s+ALL\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+public\s+TO[^;]*\banon\b/i;
      expect(blanketTableGrant.test(schemaContent)).toBe(false);

      // Must explicitly revoke blanket tables and sequences from anon
      expect(schemaContent).toContain('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;');
      expect(schemaContent).toContain('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;');
      expect(schemaContent).toContain('REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;');
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

    test('verify_and_reconcile_payment validates gateway payment ID and rejects unverified flags', () => {
      expect(schemaContent).toContain('p_gateway_payment_id IS NULL');
      expect(schemaContent).toContain('IF p_verified IS FALSE THEN');
      expect(schemaContent).toContain('Payment verification failed: Gateway reported unverified signature');
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

    test('Administrative stored procedures have execute privileges revoked from PUBLIC and anon', () => {
      expect(schemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() FROM PUBLIC, anon;');
      expect(schemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.admin_emergency_dispatch(TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, TEXT, INTEGER) FROM PUBLIC, anon;');
      expect(schemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.admin_execute_batch_payout() FROM PUBLIC, anon;');
      expect(schemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.admin_verify_supplier(UUID, TEXT, TEXT) FROM PUBLIC, anon;');
      expect(schemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon;');
      expect(schemaContent).toContain('REVOKE EXECUTE ON FUNCTION public.admin_rebalance_tanker(UUID, TEXT) FROM PUBLIC, anon;');
    });
  });
});
