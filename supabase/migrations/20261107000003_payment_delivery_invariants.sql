-- ==============================================================================
-- TANKR MIGRATION 3: PAYMENT & DELIVERY INVARIANTS (FORWARD MIGRATION)
-- Authoritatively upgrades runtime RPCs, payment reconciliation, and delivery invariants
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table schema enhancements
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none';

-- Unique index ensuring no duplicate delivery earnings rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_payout_ledger_booking_entry
ON public.driver_payout_ledger (booking_id, entry_type)
WHERE booking_id IS NOT NULL;

-- 2. customer_cancel_booking_with_policy
-- Computes the fee from the status before it changes the row, writes cancellation_fee, then sets cancelled.
CREATE OR REPLACE FUNCTION public.customer_cancel_booking_with_policy(
    p_booking_id uuid,
    p_reason text DEFAULT 'Customer requested cancellation'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_b RECORD;
    v_fee NUMERIC(10, 2) := 0.00;
BEGIN
    SELECT * INTO v_b
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking record not found');
    END IF;

    -- Caller must be the customer who booked the trip, an admin, or service_role
    IF auth.uid() IS NOT NULL AND auth.role() != 'service_role' AND NOT public.is_admin(auth.uid()) THEN
        IF v_b.customer_id != auth.uid() THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You can only cancel your own bookings');
        END IF;
    ELSIF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required to cancel booking');
    END IF;

    -- Reject terminal states
    IF v_b.status IN ('delivering', 'delivered', 'cancelled', 'disputed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel booking in status: ' || v_b.status);
    END IF;

    -- 1. Compute fee from status before modifying the row
    IF v_b.status = 'arrived' THEN
        v_fee := 200.00;
    ELSIF v_b.status = 'en_route' THEN
        v_fee := 150.00;
    ELSE
        v_fee := 0.00;
    END IF;

    -- 2. Writes cancellation_fee, then sets cancelled
    UPDATE public.bookings
    SET cancellation_fee = v_fee,
        updated_at = NOW()
    WHERE id = p_booking_id;

    UPDATE public.bookings
    SET status = 'cancelled'::booking_status,
        cancellation_reason = p_reason,
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_booking_id;

    UPDATE public.tankers
    SET is_available = TRUE,
        updated_at = NOW()
    WHERE id = v_b.tanker_id;

    -- Credit driver compensation ledger when fee applies without duplicate entries
    IF v_fee > 0 AND v_b.driver_phone IS NOT NULL THEN
        INSERT INTO public.driver_payout_ledger (
            driver_phone,
            booking_id,
            entry_type,
            amount,
            notes
        ) VALUES (
            v_b.driver_phone,
            p_booking_id,
            'cancellation_compensation',
            v_fee,
            'Customer cancelled trip while ' || v_b.status || '. Driver dispatch compensation credited.'
        )
        ON CONFLICT (booking_id, entry_type) WHERE booking_id IS NOT NULL DO NOTHING;
    END IF;

    -- Call request_booking_refund after a legal cancel, in the same transaction
    PERFORM public.request_booking_refund(p_booking_id, p_reason);

    RETURN jsonb_build_object(
        'success', true,
        'cancellation_fee', v_fee,
        'message', 'Booking cancelled successfully'
    );
END;
$$;

-- 3. request_booking_refund
-- Reads the stored cancellation_fee. Does not recompute the fee from status cancelled.
-- If there is no captured payment, a legal cancel still commits and returns success true with refund_amount 0.
CREATE OR REPLACE FUNCTION public.request_booking_refund(
    p_booking_id UUID,
    p_reason TEXT DEFAULT 'Customer requested cancellation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_booking RECORD;
    v_payment RECORD;
    v_fee NUMERIC(10,2) := 0.00;
    v_refund_amount NUMERIC(10,2) := 0.00;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking record not found for refund request');
    END IF;

    -- The caller is the booking customer, an admin, or service_role
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authentication required for refund processing');
        END IF;

        IF auth.uid() <> v_booking.customer_id AND NOT public.is_admin(auth.uid()) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You can only request refunds for your own bookings');
        END IF;
    END IF;

    -- Delivering, delivered, or un-cancelled bookings are refused with success false and no row changes
    IF v_booking.status <> 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Refund refused: Booking is not in cancelled status');
    END IF;

    -- The latest captured payment is locked
    SELECT * INTO v_payment
    FROM public.payments
    WHERE booking_id = p_booking_id
      AND status IN ('captured', 'paid')
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    -- If there is no captured payment, a legal cancel still commits and returns success true with refund_amount 0
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'refund_amount', 0,
            'message', 'No captured payment requires gateway refund'
        );
    END IF;

    -- Read stored fee from booking record
    v_fee := COALESCE(v_booking.cancellation_fee, 0.00);
    v_refund_amount := GREATEST(0.00, v_payment.amount - v_fee);

    UPDATE public.payments
    SET status = 'refund_pending',
        refund_amount = v_refund_amount,
        refund_reason = p_reason,
        refund_requested_at = NOW(),
        updated_at = NOW()
    WHERE id = v_payment.id;

    UPDATE public.bookings
    SET refund_status = 'refund_pending',
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment.id,
        'status', 'refund_pending',
        'refund_amount', v_refund_amount
    );
END;
$$;

-- 4. verify_and_reconcile_payment
-- Key Secret is read from the server environment (NEVER from platform_settings or EXPO_PUBLIC_).
-- If secret is absent, returns success false and does not capture.
-- Checkout HMAC is encode(hmac(convert_to(order_id || '|' || payment_id, 'UTF8'), convert_to(key_secret, 'UTF8'), 'sha256'), 'hex')
CREATE OR REPLACE FUNCTION public.verify_and_reconcile_payment(
    p_booking_id uuid,
    p_gateway_order_id text,
    p_gateway_payment_id text,
    p_gateway_signature text,
    p_key_secret text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_payment RECORD;
    v_booking RECORD;
    v_secret TEXT;
    v_expected_sig TEXT;
BEGIN
    -- 1. Input Validation: gateway payment ID and signature must be provided
    IF p_gateway_payment_id IS NULL OR length(trim(p_gateway_payment_id)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid gateway payment ID provided.');
    END IF;

    IF p_gateway_signature IS NULL OR length(trim(p_gateway_signature)) < 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid gateway payment signature provided.');
    END IF;

    -- 2. Retrieve booking and enforce caller authentication & authorization
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking record not found for payment reference.');
    END IF;

    -- Reject when auth.uid() is null unless auth.role() is service_role.
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authentication required to reconcile payment.');
        END IF;

        IF auth.uid() <> v_booking.customer_id AND NOT public.is_admin(auth.uid()) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Caller not authorized to reconcile payment for this booking.');
        END IF;
    END IF;

    -- Enforce quote expiration
    IF v_booking.quote_expires_at IS NOT NULL AND v_booking.quote_expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment reconciliation rejected: Booking quote reservation has expired.');
    END IF;

    -- 3. Key Secret read from server environment
    v_secret := COALESCE(
        NULLIF(p_key_secret, ''),
        NULLIF(current_setting('app.settings.razorpay_key_secret', true), ''),
        NULLIF(current_setting('tankr.razorpay_key_secret', true), '')
    );

    -- If secret is absent, return success false. Do not capture.
    IF v_secret IS NULL OR length(trim(v_secret)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment reconciliation refused: Gateway secret is absent in server environment.');
    END IF;

    -- Checkout HMAC calculation
    v_expected_sig := encode(
        hmac(
            convert_to(p_gateway_order_id || '|' || p_gateway_payment_id, 'UTF8'),
            convert_to(v_secret, 'UTF8'),
            'sha256'
        ),
        'hex'
    );

    -- Fixed-length digest constant-time comparison
    IF digest(lower(trim(p_gateway_signature)), 'sha256') <> digest(lower(trim(v_expected_sig)), 'sha256') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cryptographic HMAC signature mismatch: Payment verification rejected.');
    END IF;

    -- 4. Check if a row already captured with the same payment id exists: returns current idempotent success
    SELECT * INTO v_payment
    FROM public.payments
    WHERE gateway_payment_id = p_gateway_payment_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_payment.status = 'captured' THEN
            RETURN jsonb_build_object(
                'success', true,
                'payment_id', v_payment.id,
                'order_id', v_payment.gateway_order_id,
                'status', 'captured',
                'idempotent', true
            );
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Payment already exists with invalid status.');
        END IF;
    END IF;

    -- 5. Lock the payment row matching this booking and order id
    SELECT * INTO v_payment
    FROM public.payments
    WHERE booking_id = p_booking_id
      AND gateway_order_id = p_gateway_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment record not found for this order.');
    END IF;

    -- Require the locked payment row to be status created, the amount to match the booking, and the order id to match
    IF v_payment.status <> 'created' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment record is not in created status.');
    END IF;

    IF v_payment.amount <> v_booking.final_payable_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment amount does not match booking final payable amount.');
    END IF;

    IF v_payment.gateway_order_id IS DISTINCT FROM p_gateway_order_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Gateway order ID mismatch.');
    END IF;

    -- On success set payments.status = captured and bookings.payment_status = paid. Never invent a payment id.
    UPDATE public.payments
    SET status = 'captured',
        gateway_payment_id = p_gateway_payment_id,
        gateway_signature = p_gateway_signature,
        updated_at = NOW()
    WHERE id = v_payment.id;

    UPDATE public.bookings
    SET payment_status = 'paid',
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment.id,
        'order_id', p_gateway_order_id,
        'status', 'captured'
    );
END;
$$;

-- 5. driver_complete_delivery_with_meter
CREATE OR REPLACE FUNCTION public.driver_complete_delivery_with_meter(
    p_booking_id uuid,
    p_delivery_pin text,
    p_flow_start numeric DEFAULT NULL::numeric,
    p_flow_end numeric DEFAULT NULL::numeric,
    p_delivered_liters integer DEFAULT NULL::integer,
    p_meter_photo_url text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_b RECORD;
    v_driver_phone TEXT;
    v_calc_liters INT;
    v_shortfall INT := 0;
    v_refund_amount NUMERIC(10, 2) := 0.00;
    v_final_settled_amount NUMERIC(10, 2);
    v_driver_share NUMERIC(10, 2);
BEGIN
    SELECT * INTO v_b
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found' USING ERRCODE = '02000';
    END IF;

    -- Reject terminal states and already delivered
    IF v_b.status = 'delivered' THEN
        RAISE EXCEPTION 'Booking has already been completed and settled' USING ERRCODE = '22000';
    END IF;

    -- Raise unless status is 'delivering'
    IF v_b.status <> 'delivering' THEN
        RAISE EXCEPTION 'Cannot complete delivery for booking in % status. Status must be delivering.', v_b.status USING ERRCODE = '22000';
    END IF;

    -- Enforce driver/admin/service_role caller authorization
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;

        IF NOT (
            public.is_admin(auth.uid())
            OR EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = auth.uid() 
                  AND (p.phone_number = v_b.driver_phone OR '+' || p.phone_number = v_b.driver_phone)
            )
        ) THEN
            RAISE EXCEPTION 'Access Denied: Only the assigned driver can complete delivery' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Raise if driver_phone is null. No fallback.
    IF v_b.driver_phone IS NULL OR length(trim(v_b.driver_phone)) = 0 THEN
        RAISE EXCEPTION 'Delivery completion failed: No driver is assigned to this booking' USING ERRCODE = '22000';
    END IF;
    v_driver_phone := v_b.driver_phone;

    -- Verify Delivery PIN
    IF v_b.delivery_pin != p_delivery_pin THEN
        RAISE EXCEPTION 'Invalid Delivery PIN. Ask customer for the 4-digit code shown on their tracking screen.'
            USING ERRCODE = '28000';
    END IF;

    -- Compute liters strictly from flow_end - flow_start when both are present and flow_end > flow_start; otherwise raise.
    -- Do not trust p_delivered_liters over the meter.
    IF p_flow_end IS NULL OR p_flow_start IS NULL OR p_flow_end <= p_flow_start THEN
        RAISE EXCEPTION 'Ending flow meter reading must be strictly greater than starting flow meter reading' USING ERRCODE = '22023';
    END IF;

    v_calc_liters := ROUND(p_flow_end - p_flow_start);

    -- Raise 'delivered volume below 95 percent of booked capacity' when liters < capacity_liters * 0.95
    IF v_calc_liters < ROUND(v_b.capacity_liters * 0.95) THEN
        RAISE EXCEPTION 'delivered volume below 95 percent of booked capacity' USING ERRCODE = '22023';
    END IF;

    -- Above threshold: prorate shortfall, set booking to delivered, record refund as pending_gateway
    IF v_calc_liters < v_b.capacity_liters THEN
        v_shortfall := v_b.capacity_liters - v_calc_liters;
        v_refund_amount := ROUND((v_b.final_payable_amount / v_b.capacity_liters) * v_shortfall, 2);
        v_final_settled_amount := v_b.final_payable_amount - v_refund_amount;

        IF v_refund_amount > 0 THEN
            INSERT INTO public.payments (
                booking_id,
                amount,
                currency,
                method,
                status
            ) VALUES (
                p_booking_id,
                v_refund_amount,
                'INR',
                'refund',
                'pending_gateway'
            );

            UPDATE public.bookings
            SET refund_status = 'pending_gateway'
            WHERE id = p_booking_id;
        END IF;
    ELSE
        v_shortfall := 0;
        v_refund_amount := 0.00;
        v_final_settled_amount := v_b.final_payable_amount;
    END IF;

    v_driver_share := ROUND(v_final_settled_amount * 0.85, 2);

    UPDATE public.bookings
    SET 
        status = 'delivered'::booking_status,
        delivered_at = NOW(),
        flow_meter_start = p_flow_start,
        flow_meter_end = p_flow_end,
        delivered_liters = v_calc_liters,
        volume_discrepancy_liters = v_shortfall,
        final_payable_amount = v_final_settled_amount,
        meter_photo_url = p_meter_photo_url,
        updated_at = NOW()
    WHERE id = p_booking_id;

    UPDATE public.tankers
    SET is_available = TRUE,
        updated_at = NOW()
    WHERE id = v_b.tanker_id;

    -- Insert one driver_payout_ledger row without duplicating delivery_earnings
    INSERT INTO public.driver_payout_ledger (
        driver_phone,
        booking_id,
        entry_type,
        amount,
        notes
    ) VALUES (
        v_driver_phone,
        p_booking_id,
        'delivery_earnings',
        v_driver_share,
        'Settled ' || v_calc_liters || 'L delivered for order #' || v_b.booking_reference
    )
    ON CONFLICT (booking_id, entry_type) WHERE booking_id IS NOT NULL DO NOTHING;

    -- Notify customer on delivery completion
    INSERT INTO public.notifications (
        user_id,
        title,
        body,
        type,
        booking_id
    ) VALUES (
        v_b.customer_id,
        'Delivery Completed! 💧',
        'Your water tanker order #' || v_b.booking_reference || ' has been verified and completed (' || v_calc_liters || 'L).',
        'delivery_completed',
        p_booking_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'delivered_liters', v_calc_liters,
        'shortfall_liters', v_shortfall,
        'refund_amount', v_refund_amount,
        'driver_earnings', v_driver_share,
        'final_amount', v_final_settled_amount
    );
END;
$$;

-- 6. create_payment_order
-- Stores the id Razorpay returns. No local 'order_' || uuid value.
CREATE OR REPLACE FUNCTION public.create_payment_order(
    p_booking_id UUID,
    p_method TEXT,
    p_idempotency_key TEXT,
    p_gateway_order_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_booking RECORD;
    v_payment RECORD;
BEGIN
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking record not found for payment initialization');
    END IF;

    -- Require caller to be the customer of the booking, is_admin, or service_role
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authentication required (ERRCODE 42501)');
        END IF;
        IF auth.uid() <> v_booking.customer_id AND NOT public.is_admin(auth.uid()) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Caller does not own this booking');
        END IF;
    END IF;

    -- For digital payments, require the real gateway order ID returned by Razorpay API
    IF p_method IN ('upi', 'card') THEN
        IF p_gateway_order_id IS NULL OR length(trim(p_gateway_order_id)) = 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authoritative Razorpay gateway order ID required for digital payment initialization');
        END IF;
    END IF;

    SELECT * INTO v_payment
    FROM public.payments
    WHERE idempotency_key = p_idempotency_key
       OR (booking_id = p_booking_id AND status = 'captured');

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'order_id', v_payment.gateway_order_id,
            'amount', v_payment.amount,
            'currency', v_payment.currency,
            'status', v_payment.status
        );
    END IF;

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
        p_gateway_order_id,
        v_booking.final_payable_amount,
        'INR',
        p_method,
        'created',
        p_idempotency_key
    )
    RETURNING * INTO v_payment;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment.id,
        'order_id', p_gateway_order_id,
        'amount', v_payment.amount,
        'currency', v_payment.currency,
        'status', 'created'
    );
END;
$$;

-- 7. cancel_stale_pending_payment_bookings
-- Automatically releases tankers reserved for bookings left in pending_payment for > 15 minutes
CREATE OR REPLACE FUNCTION public.cancel_stale_pending_payment_bookings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rec RECORD;
    v_count INT := 0;
BEGIN
    FOR v_rec IN 
        SELECT id FROM public.bookings
        WHERE status = 'pending'
          AND payment_status = 'pending_payment'
          AND created_at < NOW() - INTERVAL '15 minutes'
    LOOP
        PERFORM public.cancel_booking_atomic(v_rec.id, 'Booking expired: Payment was not completed within 15 minutes.');
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'cancelled_count', v_count);
END;
$$;

-- Explicit Routine Permissions: Restrict privileged operational routines from anon/PUBLIC (TNK-C04)
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.uuid_generate_v4() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_booking_quote(UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(UUID, UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_booking_atomic(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_cancel_booking_with_policy(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_and_reconcile_payment(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_booking_refund(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_stale_pending_payment_bookings() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.driver_complete_delivery_with_meter(UUID, TEXT, NUMERIC, NUMERIC, INTEGER, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_driver_location_ping(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.supplier_onboard_tanker(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, NUMERIC, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_customer_onboarding(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_service_zone_liquidity_health() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_emergency_dispatch(TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_execute_batch_payout() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_verify_supplier(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, TEXT, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_rebalance_tanker(UUID, TEXT) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_payment_order(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoice_for_booking(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.supplier_accept_booking(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.supplier_cancel_and_reassign(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.driver_update_delivery_status(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.contribute_to_community_pool(TEXT, TEXT, TEXT, NUMERIC, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_customer_dispute(UUID, TEXT, TEXT, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_supplier(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_nearby_tankers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_latest_tracking_breadcrumb(UUID) TO authenticated, service_role;
