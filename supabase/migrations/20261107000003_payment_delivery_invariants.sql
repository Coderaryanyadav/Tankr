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

-- 2. Platform settings seed for webhook HMAC verification
INSERT INTO public.platform_settings (key, value)
VALUES ('razorpay_webhook_secret', '{"secret": "tankr_sec_webhook_server_2026"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. customer_cancel_booking_with_policy
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

    IF v_b.status = 'arrived' THEN
        v_fee := 200.00;
    ELSIF v_b.status = 'en_route' THEN
        v_fee := 150.00;
    ELSE
        v_fee := 0.00;
    END IF;

    -- Persist the fee on the booking
    UPDATE public.bookings
    SET status = 'cancelled'::booking_status,
        cancellation_reason = p_reason,
        cancellation_fee = v_fee,
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

-- 4. request_booking_refund
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

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'No captured payment requires gateway refund'
        );
    END IF;

    -- Set status refund_pending, refund_amount to captured amount minus the cancellation fee, and refund_reason.
    -- Leave gateway_payment_id and gateway_signature as the gateway sent them.
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

-- 5. verify_and_reconcile_payment
CREATE OR REPLACE FUNCTION public.verify_and_reconcile_payment(
    p_booking_id uuid,
    p_gateway_order_id text,
    p_gateway_payment_id text,
    p_gateway_signature text
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
    -- The booking customer, an admin, or service_role are the only other callers allowed.
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authentication required to reconcile payment.');
        END IF;

        IF auth.uid() <> v_booking.customer_id AND NOT public.is_admin(auth.uid()) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Caller not authorized to reconcile payment for this booking.');
        END IF;
    END IF;

    -- Enforce quote expiration: payment cannot be reconciled on an expired quote/reservation
    IF v_booking.quote_expires_at IS NOT NULL AND v_booking.quote_expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment reconciliation rejected: Booking quote reservation has expired.');
    END IF;

    -- 3. Load the Razorpay secret from platform_settings where key = 'razorpay_webhook_secret'
    SELECT 
        CASE 
            WHEN jsonb_typeof(value) = 'string' THEN value #>> '{}'
            WHEN value ? 'secret' THEN value->>'secret'
            WHEN value ? 'value' THEN value->>'value'
            WHEN value ? 'razorpay_key_secret' THEN value->>'razorpay_key_secret'
            ELSE value #>> '{}'
        END INTO v_secret
    FROM public.platform_settings
    WHERE key = 'razorpay_webhook_secret';

    -- If the secret is missing, return success false. Do not capture.
    IF v_secret IS NULL OR length(trim(v_secret)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment reconciliation refused: Gateway secret is not configured in platform settings.');
    END IF;

    v_expected_sig := encode(hmac((p_gateway_order_id || '|' || p_gateway_payment_id)::bytea, v_secret::bytea, 'sha256'), 'hex');

    -- Compare with digest(candidate, 'sha256') = digest(expected, 'sha256')
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

    -- Require the locked payment row to be status created, the amount to match the booking, and the order id to match.
    -- Any other state returns success false.
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

-- 6. driver_complete_delivery_with_meter
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

        -- Record prorated refund as pending_gateway without fake gateway refund ID
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

-- 7. admin_resolve_dispute
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
    p_dispute_id UUID,
    p_status TEXT,
    p_refund_amount NUMERIC DEFAULT 0,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_booking_id UUID;
    v_customer_id UUID;
    v_payment RECORD;
    v_actual_refund NUMERIC(10, 2) := 0.00;
BEGIN
    IF NOT (public.is_admin(auth.uid()) OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Access Denied: Administrative authorization required for dispute resolution (ERRCODE 42501)';
    END IF;

    SELECT booking_id, customer_id INTO v_booking_id, v_customer_id
    FROM public.disputes WHERE id = p_dispute_id;

    IF v_booking_id IS NULL THEN
        RAISE EXCEPTION 'Dispute not found';
    END IF;

    -- admin_resolve_dispute, on a refund, updates that captured payment to refund_pending for the approved amount, capped at the captured amount.
    IF p_status = 'refunded' AND p_refund_amount > 0 THEN
        SELECT * INTO v_payment
        FROM public.payments
        WHERE booking_id = v_booking_id
          AND status IN ('captured', 'paid', 'refund_pending')
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE;

        IF FOUND THEN
            v_actual_refund := LEAST(p_refund_amount, v_payment.amount);
            UPDATE public.payments
            SET status = 'refund_pending',
                refund_amount = v_actual_refund,
                refund_reason = COALESCE(p_notes, 'Admin dispute resolution refund'),
                refund_requested_at = NOW(),
                updated_at = NOW()
            WHERE id = v_payment.id;

            UPDATE public.bookings
            SET refund_status = 'refund_pending',
                updated_at = NOW()
            WHERE id = v_booking_id;
        END IF;
    END IF;

    UPDATE public.disputes 
    SET status = p_status,
        admin_notes = p_notes,
        resolved_at = NOW()
    WHERE id = p_dispute_id;

    INSERT INTO public.admin_audit_logs (
        action,
        target_entity,
        target_id,
        details
    ) VALUES (
        'RESOLVE_CUSTOMER_DISPUTE',
        'disputes',
        p_dispute_id::text,
        jsonb_build_object('status', p_status, 'refund_amount', v_actual_refund, 'notes', p_notes)
    );

    RETURN jsonb_build_object('success', true, 'dispute_id', p_dispute_id, 'status', p_status, 'refund_amount', v_actual_refund);
END;
$$;

-- 8. create_payment_order
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
    v_key_id TEXT;
    v_key_secret TEXT;
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

    SELECT value->>'razorpay_key_id', value->>'razorpay_key_secret'
    INTO v_key_id, v_key_secret
    FROM public.platform_settings
    WHERE key = 'payment_gateway';

    IF v_key_id IS NULL OR length(trim(v_key_id)) = 0 OR v_key_secret IS NULL OR length(trim(v_key_secret)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'razorpay_not_configured');
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

-- 9. supplier_accept_booking
CREATE OR REPLACE FUNCTION public.supplier_accept_booking(
    p_booking_id UUID,
    p_supplier_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_b RECORD;
    v_supp RECORD;
BEGIN
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authentication required (ERRCODE 42501)');
        END IF;

        SELECT * INTO v_supp FROM public.suppliers WHERE id = p_supplier_id;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Supplier record not found');
        END IF;

        IF NOT (
            public.is_admin(auth.uid()) 
            OR (v_supp.owner_id IS NOT NULL AND v_supp.owner_id = auth.uid())
            OR EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = auth.uid() 
                  AND (p.phone_number = v_supp.contact_phone OR '+' || p.phone_number = v_supp.contact_phone)
            )
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Caller does not manage this supplier');
        END IF;
    END IF;

    SELECT * INTO v_b
    FROM public.bookings
    WHERE id = p_booking_id
      AND supplier_id = p_supplier_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found or not assigned to supplier');
    END IF;

    IF v_b.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking is not in pending state');
    END IF;

    IF v_b.quote_expires_at IS NOT NULL AND v_b.quote_expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking reservation has expired');
    END IF;

    UPDATE public.bookings
    SET status = 'accepted'::booking_status,
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'status', 'accepted'
    );
END;
$$;

-- 10. supplier_cancel_and_reassign
CREATE OR REPLACE FUNCTION public.supplier_cancel_and_reassign(
    p_booking_id UUID,
    p_supplier_id UUID,
    p_reason TEXT DEFAULT 'Supplier vehicle unavailable'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_b RECORD;
    v_supp RECORD;
    v_alt RECORD;
BEGIN
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authentication required (ERRCODE 42501)');
        END IF;

        SELECT * INTO v_supp FROM public.suppliers WHERE id = p_supplier_id;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Supplier not found');
        END IF;

        IF NOT (
            public.is_admin(auth.uid()) 
            OR (v_supp.owner_id IS NOT NULL AND v_supp.owner_id = auth.uid())
            OR EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = auth.uid() 
                  AND (p.phone_number = v_supp.contact_phone OR '+' || p.phone_number = v_supp.contact_phone)
            )
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Caller does not manage this supplier');
        END IF;
    END IF;

    SELECT * INTO v_b
    FROM public.bookings
    WHERE id = p_booking_id
      AND supplier_id = p_supplier_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found or unauthorized');
    END IF;

    UPDATE public.tankers
    SET is_available = TRUE,
        updated_at = NOW()
    WHERE id = v_b.tanker_id;

    SELECT * INTO v_alt
    FROM public.tankers
    WHERE is_available = TRUE
      AND is_online = TRUE
      AND capacity_liters = v_b.capacity_liters
      AND water_type = v_b.water_type
      AND id != v_b.tanker_id
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        UPDATE public.tankers
        SET is_available = FALSE,
            updated_at = NOW()
        WHERE id = v_alt.id;

        UPDATE public.bookings
        SET tanker_id = v_alt.id,
            supplier_id = v_alt.supplier_id,
            driver_name = v_alt.driver_name,
            driver_phone = v_alt.driver_phone,
            vehicle_number = v_alt.vehicle_number,
            status = 'pending'::booking_status,
            updated_at = NOW()
        WHERE id = p_booking_id;

        RETURN jsonb_build_object('success', true, 'reassigned', true, 'tanker_id', v_alt.id);
    ELSE
        UPDATE public.bookings
        SET status = 'cancelled'::booking_status,
            cancellation_reason = 'Cancelled: No replacement tanker available after supplier rejection',
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE id = p_booking_id;

        PERFORM public.request_booking_refund(p_booking_id, 'Supplier cancelled and no replacement fleet found');

        RETURN jsonb_build_object('success', true, 'reassigned', false, 'cancelled', true);
    END IF;
END;
$$;

-- 11. driver_update_delivery_status
CREATE OR REPLACE FUNCTION public.driver_update_delivery_status(
    p_booking_id UUID,
    p_new_status TEXT,
    p_delivery_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_b RECORD;
BEGIN
    SELECT * INTO v_b
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
    END IF;

    -- Validate caller identity: assigned driver, admin, or service_role
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authentication required (ERRCODE 42501)');
        END IF;

        IF NOT (
            public.is_admin(auth.uid()) 
            OR (
                v_b.driver_phone IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.profiles p 
                    WHERE p.id = auth.uid() 
                      AND (p.phone_number = v_b.driver_phone OR '+' || p.phone_number = v_b.driver_phone)
                )
            )
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Only the assigned driver can update delivery status');
        END IF;
    END IF;

    -- driver_update_delivery_status must not accept delivered or cancelled. Delivery completion stays on the meter function.
    IF p_new_status IN ('delivered', 'cancelled') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid status: ' || p_new_status || ' cannot be set through driver_update_delivery_status. Delivery completion must use driver_complete_delivery_with_meter.');
    END IF;

    -- Enforce the same transition table as src/services/stateMachineService.ts:
    -- driver_assigned -> en_route
    -- en_route -> arrived, delivering
    -- arrived -> delivering
    IF v_b.status = p_new_status::booking_status THEN
        RETURN jsonb_build_object('success', true, 'status', p_new_status, 'idempotent', true);
    ELSIF v_b.status = 'driver_assigned' AND p_new_status = 'en_route' THEN
        NULL;
    ELSIF v_b.status = 'en_route' AND p_new_status IN ('arrived', 'delivering') THEN
        NULL;
    ELSIF v_b.status = 'arrived' AND p_new_status = 'delivering' THEN
        NULL;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid status transition from ' || v_b.status || ' to ' || p_new_status);
    END IF;

    -- Validate transition & PIN if delivering
    IF p_new_status = 'delivering' THEN
        IF p_delivery_pin IS NULL OR p_delivery_pin != v_b.delivery_pin THEN
            RETURN jsonb_build_object('success', false, 'error', 'Invalid delivery verification PIN');
        END IF;
    END IF;

    UPDATE public.bookings
    SET status = p_new_status::booking_status,
        dispatched_at = CASE WHEN p_new_status = 'en_route' AND dispatched_at IS NULL THEN NOW() ELSE dispatched_at END,
        arrived_at = CASE WHEN p_new_status = 'arrived' AND arrived_at IS NULL THEN NOW() ELSE arrived_at END,
        updated_at = NOW()
    WHERE id = p_booking_id;

    -- Notify Customer
    INSERT INTO public.notifications (
        user_id,
        title,
        body,
        type,
        booking_id
    ) VALUES (
        v_b.customer_id,
        'Trip Update: ' || UPPER(p_new_status),
        'Your water tanker status has been updated to ' || p_new_status || '.',
        'trip_update',
        p_booking_id
    );

    RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$;

-- 12. generate_invoice_for_booking
CREATE OR REPLACE FUNCTION public.generate_invoice_for_booking(
    p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_booking RECORD;
    v_existing RECORD;
    v_invoice_number TEXT;
    v_invoice_id UUID;
    v_cgst NUMERIC(10,2);
    v_sgst NUMERIC(10,2);
    v_tax NUMERIC(10,2);
    v_total NUMERIC(10,2);
BEGIN
    SELECT * INTO v_existing
    FROM public.invoices
    WHERE booking_id = p_booking_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'invoice_id', v_existing.id,
            'invoice_number', v_existing.invoice_number,
            'already_existed', true
        );
    END IF;

    SELECT b.*, p.full_name AS cust_name, p.phone_number AS cust_phone, s.business_name AS supp_name, s.gstin AS supp_gstin
    INTO v_booking
    FROM public.bookings b
    LEFT JOIN public.profiles p ON b.customer_id = p.id
    LEFT JOIN public.suppliers s ON b.supplier_id = s.id
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking record not found for invoice generation');
    END IF;

    -- Authorization check: Caller must be owning customer, supplier, admin, or service_role
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authentication required (ERRCODE 42501)');
        END IF;

        IF NOT (
            public.is_admin(auth.uid()) 
            OR auth.uid() = v_booking.customer_id
            OR EXISTS (
                SELECT 1 FROM public.suppliers s2 
                WHERE s2.id = v_booking.supplier_id AND (s2.owner_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND (p2.phone_number = s2.contact_phone OR '+' || p2.phone_number = s2.contact_phone)
                ))
            )
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Not authorized to generate invoice for this booking');
        END IF;
    END IF;

    v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(p_booking_id::text, 1, 6));
    v_tax := COALESCE(v_booking.tax_amount, 0);
    v_cgst := ROUND((v_tax / 2.0), 2);
    v_sgst := ROUND((v_tax / 2.0), 2);
    v_total := COALESCE(v_booking.final_payable_amount, (v_booking.base_price + v_booking.delivery_charge + v_booking.surcharge + v_tax));

    INSERT INTO public.invoices (
        booking_id,
        invoice_number,
        customer_name,
        customer_phone,
        delivery_address,
        supplier_business_name,
        supplier_gstin,
        water_type,
        volume_liters,
        base_price,
        delivery_charge,
        surcharge,
        tax_amount,
        total_amount,
        final_payable_amount,
        cgst_amount,
        sgst_amount,
        payment_method,
        payment_status,
        payment_reference,
        issued_at,
        status
    ) VALUES (
        p_booking_id,
        v_invoice_number,
        COALESCE(v_booking.cust_name, 'Valued Customer'),
        COALESCE(v_booking.cust_phone, '+910000000000'),
        v_booking.delivery_address,
        COALESCE(v_booking.supp_name, 'Verified TANKR Partner Hub'),
        COALESCE(v_booking.supp_gstin, '27AAAAA0000A1Z5'),
        v_booking.water_type,
        v_booking.capacity_liters,
        v_booking.base_price,
        v_booking.delivery_charge,
        v_booking.surcharge,
        v_tax,
        v_total,
        v_total,
        v_cgst,
        v_sgst,
        COALESCE(v_booking.payment_preference, 'upi'),
        COALESCE(v_booking.payment_status, 'pending_payment'),
        'UPI/' || v_booking.booking_reference,
        COALESCE(v_booking.delivered_at, NOW()),
        'issued'
    )
    RETURNING id INTO v_invoice_id;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number
    );
END;
$$;

-- 13. submit_customer_dispute
CREATE OR REPLACE FUNCTION public.submit_customer_dispute(
    p_booking_id UUID,
    p_category TEXT,
    p_reason TEXT,
    p_liters_received NUMERIC DEFAULT NULL,
    p_evidence_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_b RECORD;
    v_dispute_id UUID;
BEGIN
    SELECT b.*, s.business_name AS s_name, p.full_name AS c_name 
    INTO v_b
    FROM public.bookings b
    LEFT JOIN public.suppliers s ON b.supplier_id = s.id
    LEFT JOIN public.profiles p ON b.customer_id = p.id
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
    END IF;

    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authentication required to lodge dispute');
        END IF;

        IF NOT (public.is_admin(auth.uid()) OR auth.uid() = v_b.customer_id) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Only booking customer can submit dispute');
        END IF;
    END IF;

    INSERT INTO public.disputes (
        booking_id,
        customer_id,
        supplier_id,
        customer_name,
        supplier_name,
        category,
        reason,
        amount,
        liters_received,
        evidence_url,
        status
    ) VALUES (
        p_booking_id,
        v_b.customer_id,
        v_b.supplier_id,
        COALESCE(v_b.c_name, 'Customer'),
        COALESCE(v_b.s_name, v_b.supplier_name, 'Supplier'),
        COALESCE(p_category, 'volume_shortage'),
        p_reason,
        v_b.final_payable_amount,
        p_liters_received,
        p_evidence_url,
        'open'
    )
    RETURNING id INTO v_dispute_id;

    UPDATE public.bookings
    SET status = 'disputed'::booking_status,
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'dispute_id', v_dispute_id,
        'status', 'open'
    );
END;
$$;

-- 14. register_supplier
CREATE OR REPLACE FUNCTION public.register_supplier(
    p_business_name TEXT,
    p_owner_name TEXT,
    p_phone_number TEXT,
    p_business_address TEXT,
    p_gst_number TEXT,
    p_water_source TEXT,
    p_operating_areas TEXT[],
    p_tanker_count INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_supplier_id UUID;
BEGIN
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Authentication required for supplier registration (ERRCODE 42501)');
        END IF;
    END IF;

    IF LENGTH(p_gst_number) != 15 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid GSTIN length. Must be 15 characters.');
    END IF;

    INSERT INTO public.suppliers (
        owner_id,
        business_name,
        contact_phone,
        is_verified,
        verification_status,
        water_source,
        gstin,
        is_active
    ) VALUES (
        auth.uid(),
        p_business_name,
        p_phone_number,
        FALSE,
        'pending_review',
        p_water_source,
        p_gst_number,
        TRUE
    )
    RETURNING id INTO v_supplier_id;

    -- Elevate to supplier role under authorized registration session context
    PERFORM set_config('tankr.in_supplier_registration', 'on', true);

    UPDATE public.profiles
    SET role = 'supplier'::user_role,
        full_name = p_owner_name,
        phone_number = p_phone_number,
        preferred_address = p_business_address,
        updated_at = NOW()
    WHERE id = auth.uid();

    RETURN jsonb_build_object(
        'success', true,
        'supplier_id', v_supplier_id,
        'status', 'pending_review'
    );
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
GRANT EXECUTE ON FUNCTION public.verify_and_reconcile_payment(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_booking_refund(UUID, TEXT) TO authenticated, service_role;
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
