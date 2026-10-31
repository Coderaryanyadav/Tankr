-- ==============================================================================
-- TANKR DATABASE MIGRATION 11: Enforce Strict RBAC & Secure Payment Reconciliation
-- ==============================================================================

-- 1. Security Trigger: Prevent User Role Escalation
-- Normal authenticated users MUST NOT be able to modify their own 'role' column.
-- Only database superusers, service_role, or existing verified Admins can change roles.

CREATE OR REPLACE FUNCTION public.protect_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Check if executing context is service_role or an existing verified admin
        IF auth.role() != 'service_role' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
            ) THEN
                RAISE EXCEPTION 'Privilege escalation denied: You cannot alter your account role.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_role_escalation();

-- 2. Hardened Admin Analytics & Operations RPCs with Strict Role Check
CREATE OR REPLACE FUNCTION get_admin_dashboard_metrics()
RETURNS TABLE (
    total_gmv NUMERIC(12,2),
    platform_revenue NUMERIC(12,2),
    total_bookings INT,
    completed_bookings INT,
    active_tankers_online INT,
    total_suppliers INT,
    pending_kyc_suppliers INT,
    total_liters_delivered BIGINT,
    surge_multiplier NUMERIC(3,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_gmv NUMERIC(12,2);
    v_platform_rev NUMERIC(12,2);
    v_total_b INT;
    v_comp_b INT;
    v_tankers_online INT;
    v_suppliers INT;
    v_pending_kyc INT;
    v_liters BIGINT;
    v_surge NUMERIC(3,2);
BEGIN
    -- Strict RBAC check: Must be admin or service_role
    IF auth.role() != 'service_role' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Access Denied: Admin authorization required'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Aggregate Gross Merchandise Value & Volume
    SELECT 
        COALESCE(SUM(final_payable_amount), 0),
        COALESCE(SUM(final_payable_amount * 0.10), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'delivered'),
        COALESCE(SUM(capacity_liters) FILTER (WHERE status = 'delivered'), 0)
    INTO v_total_gmv, v_platform_rev, v_total_b, v_comp_b, v_liters
    FROM public.bookings;

    -- Aggregate Fleet online
    SELECT COUNT(*)
    INTO v_tankers_online
    FROM public.tankers
    WHERE is_online = TRUE;

    -- Aggregate Suppliers & Verification
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE verification_status = 'pending_review')
    INTO v_suppliers, v_pending_kyc
    FROM public.suppliers;

    -- Surge multiplier from settings
    SELECT COALESCE((value->>'surge_multiplier')::NUMERIC, 1.0)
    INTO v_surge
    FROM public.platform_settings
    WHERE key = 'pricing_defaults';

    IF v_surge IS NULL THEN
        v_surge := 1.0;
    END IF;

    RETURN QUERY
    SELECT 
        v_total_gmv,
        v_platform_rev,
        v_total_b,
        v_comp_b,
        v_tankers_online,
        v_suppliers,
        v_pending_kyc,
        v_liters,
        v_surge;
END;
$$;

-- 3. Hardened Supplier Verification Admin RPC
CREATE OR REPLACE FUNCTION admin_verify_supplier(
    p_supplier_id UUID,
    p_status TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Strict RBAC check
    IF auth.role() != 'service_role' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Access Denied: Admin authorization required'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    UPDATE public.suppliers
    SET 
        verification_status = p_status,
        updated_at = NOW()
    WHERE id = p_supplier_id;

    RETURN FOUND;
END;
$$;

-- 4. Secure Payment Table RLS Policies
DROP POLICY IF EXISTS "Customers can read own payments" ON public.payments;
CREATE POLICY "Customers can read own payments"
    ON public.payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = payments.booking_id
              AND b.customer_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 5. Secure Payment Order Creation RPC
CREATE OR REPLACE FUNCTION create_payment_order(
    p_booking_id UUID,
    p_method TEXT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking RECORD;
    v_order_id TEXT;
    v_payment_id UUID;
BEGIN
    -- 1. Validate Booking & Ownership
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id
      AND customer_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found or unauthorized' USING ERRCODE = '42501';
    END IF;

    -- 2. Idempotency Check: Check if an active payment order exists for this key
    SELECT id, gateway_order_id INTO v_payment_id, v_order_id
    FROM public.payments
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'order_id', v_order_id,
            'payment_record_id', v_payment_id,
            'amount', v_booking.final_payable_amount,
            'currency', 'INR',
            'is_duplicate', true
        );
    END IF;

    -- 3. Generate Gateway Order Reference (e.g., rzp_order_...)
    v_order_id := 'rzp_order_' || UPPER(SUBSTRING(MD5(p_booking_id::TEXT || p_idempotency_key || NOW()::TEXT) FROM 1 FOR 14));

    -- 4. Insert Payment Record in 'created' status
    INSERT INTO public.payments (
        booking_id,
        gateway_order_id,
        amount,
        currency,
        method,
        status,
        idempotency_key
    ) VALUES (
        p_booking_id,
        v_order_id,
        v_booking.final_payable_amount,
        'INR',
        p_method,
        'created',
        p_idempotency_key
    ) RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'payment_record_id', v_payment_id,
        'amount', v_booking.final_payable_amount,
        'currency', 'INR',
        'is_duplicate', false
    );
END;
$$;

-- 6. Secure Payment Verification and Reconciliation RPC
CREATE OR REPLACE FUNCTION verify_and_reconcile_payment(
    p_booking_id UUID,
    p_gateway_order_id TEXT,
    p_gateway_payment_id TEXT,
    p_gateway_signature TEXT,
    p_verified BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment RECORD;
BEGIN
    -- 1. Find matching payment record
    SELECT * INTO v_payment
    FROM public.payments
    WHERE booking_id = p_booking_id
      AND gateway_order_id = p_gateway_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment record not found for order reference.'
        );
    END IF;

    -- 2. If verification failed or fraudulent signature
    IF NOT p_verified THEN
        UPDATE public.payments
        SET 
            status = 'failed',
            gateway_payment_id = p_gateway_payment_id,
            gateway_signature = p_gateway_signature
        WHERE id = v_payment.id;

        UPDATE public.bookings
        SET payment_status = 'failed'
        WHERE id = p_booking_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment verification failed at gateway.'
        );
    END IF;

    -- 3. Capture Payment and mark Booking as paid
    UPDATE public.payments
    SET 
        status = 'captured',
        gateway_payment_id = p_gateway_payment_id,
        gateway_signature = p_gateway_signature
    WHERE id = v_payment.id;

    UPDATE public.bookings
    SET payment_status = 'paid'
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment.id,
        'order_id', p_gateway_order_id,
        'status', 'captured'
    );
END;
$$;

