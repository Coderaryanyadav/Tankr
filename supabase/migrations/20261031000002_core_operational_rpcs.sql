-- ==============================================================================
-- TANKR CORE OPERATIONAL RPCS MIGRATION
-- Adds missing operational RPC stored procedures for complete end-to-end SDLC:
-- 1. create_payment_order
-- 2. generate_invoice_for_booking
-- 3. supplier_accept_booking
-- 4. supplier_cancel_and_reassign
-- 5. driver_update_delivery_status
-- 6. contribute_to_community_pool
-- 7. submit_customer_dispute
-- 8. register_supplier
-- 9. get_nearby_tankers (PostGIS Radius Engine)
-- ==============================================================================

-- 1. create_payment_order
CREATE OR REPLACE FUNCTION public.create_payment_order(
    p_booking_id UUID,
    p_method TEXT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_booking RECORD;
    v_payment RECORD;
    v_order_id TEXT;
BEGIN
    -- Verify booking exists
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking record not found for payment initialization');
    END IF;

    -- Check if active payment with this idempotency key or booking already exists
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

    -- Generate unique gateway order reference
    v_order_id := 'order_' || replace(gen_random_uuid()::text, '-', '');

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
    )
    RETURNING * INTO v_payment;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'amount', v_booking.final_payable_amount,
        'currency', 'INR',
        'status', 'created'
    );
END;
$$;

-- 2. generate_invoice_for_booking (TNK-C08 & TNK-M06: Full Financial Fields & No Fake GSTIN)
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

    -- Authorization check: Caller must be booking party or admin
    IF auth.uid() IS NOT NULL AND NOT (
        public.is_admin(auth.uid()) 
        OR auth.role() = 'service_role' 
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
        final_amount,
        total_amount,
        cgst_amount,
        sgst_amount,
        payment_method,
        payment_status,
        payment_reference,
        delivered_at,
        status
    ) VALUES (
        p_booking_id,
        v_invoice_number,
        COALESCE(v_booking.cust_name, 'Verified Customer'),
        COALESCE(v_booking.cust_phone, 'N/A'),
        v_booking.delivery_address,
        COALESCE(v_booking.supp_name, v_booking.supplier_name, 'TANKR Verified Water Hub'),
        v_booking.supp_gstin,
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

-- 3. supplier_accept_booking (TNK-C04 & TNK-M04: Ownership & Expiration Enforcement)
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
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required (ERRCODE 42501)');
    END IF;

    SELECT * INTO v_supp FROM public.suppliers WHERE id = p_supplier_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Supplier record not found');
    END IF;

    IF NOT (
        public.is_admin(auth.uid()) 
        OR auth.role() = 'service_role'
        OR (v_supp.owner_id IS NOT NULL AND v_supp.owner_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
              AND (p.phone_number = v_supp.contact_phone OR '+' || p.phone_number = v_supp.contact_phone)
        )
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Caller does not manage this supplier');
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
        RETURN jsonb_build_object('success', false, 'error', 'Booking quote has expired');
    END IF;

    UPDATE public.bookings
    SET status = 'accepted'::booking_status,
        updated_at = NOW()
    WHERE id = p_booking_id;

    -- Customer Notification
    INSERT INTO public.notifications (
        user_id,
        title,
        body,
        type,
        booking_id
    ) VALUES (
        v_b.customer_id,
        'Tanker Dispatch Accepted',
        'Your supplier has confirmed tanker filling at the distribution depot.',
        'booking_confirmed',
        p_booking_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'status', 'accepted'
    );
END;
$$;

-- 4. supplier_cancel_and_reassign (TNK-C04: Ownership Enforcement)
CREATE OR REPLACE FUNCTION public.supplier_cancel_and_reassign(
    p_booking_id UUID,
    p_supplier_id UUID,
    p_reason TEXT DEFAULT 'Supplier unavailable'
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
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required (ERRCODE 42501)');
    END IF;

    SELECT * INTO v_supp FROM public.suppliers WHERE id = p_supplier_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Supplier not found');
    END IF;

    IF NOT (
        public.is_admin(auth.uid()) 
        OR auth.role() = 'service_role'
        OR (v_supp.owner_id IS NOT NULL AND v_supp.owner_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
              AND (p.phone_number = v_supp.contact_phone OR '+' || p.phone_number = v_supp.contact_phone)
        )
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Caller does not manage this supplier');
    END IF;

    SELECT * INTO v_b
    FROM public.bookings
    WHERE id = p_booking_id
      AND supplier_id = p_supplier_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found or unauthorized');
    END IF;

    -- Make original tanker available
    UPDATE public.tankers
    SET is_available = TRUE,
        updated_at = NOW()
    WHERE id = v_b.tanker_id;

    -- Search for alternative replacement tanker
    SELECT * INTO v_alt
    FROM public.tankers
    WHERE is_available = TRUE
      AND is_online = TRUE
      AND id != v_b.tanker_id
      AND capacity_liters >= v_b.capacity_liters
    ORDER BY ST_Distance(
        current_location,
        ST_SetSRID(ST_MakePoint(v_b.delivery_longitude, v_b.delivery_latitude), 4326)::geography
    ) ASC
    LIMIT 1;

    IF FOUND THEN
        -- Reassign to alternative tanker
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

        RETURN jsonb_build_object(
            'success', true,
            'reassigned', true,
            'new_tanker_id', v_alt.id
        );
    ELSE
        -- No replacement available: Cancel and refund
        UPDATE public.bookings
        SET status = 'cancelled'::booking_status,
            cancellation_reason = p_reason,
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE id = p_booking_id;

        RETURN jsonb_build_object(
            'success', true,
            'reassigned', false,
            'status', 'cancelled'
        );
    END IF;
END;
$$;

-- 5. driver_update_delivery_status (TNK-C04 & TNK-H03: Driver Authentication & Verification)
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
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required (ERRCODE 42501)');
    END IF;

    SELECT * INTO v_b
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
    END IF;

    -- Validate caller identity
    IF NOT (
        public.is_admin(auth.uid()) 
        OR auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
              AND (p.phone_number = v_b.driver_phone OR '+' || p.phone_number = v_b.driver_phone)
        )
        OR EXISTS (
            SELECT 1 FROM public.suppliers s
            WHERE s.id = v_b.supplier_id 
              AND (s.owner_id = auth.uid() OR EXISTS (
                  SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND (p2.phone_number = s.contact_phone OR '+' || p2.phone_number = s.contact_phone)
              ))
        )
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Not authorized to update status for this delivery');
    END IF;

    -- Validate transition & PIN if delivering/delivered
    IF p_new_status IN ('delivering', 'delivered') THEN
        IF p_delivery_pin IS NULL OR p_delivery_pin != v_b.delivery_pin THEN
            RETURN jsonb_build_object('success', false, 'error', 'Invalid delivery verification PIN');
        END IF;
    END IF;

    UPDATE public.bookings
    SET status = p_new_status::booking_status,
        dispatched_at = CASE WHEN p_new_status = 'en_route' AND dispatched_at IS NULL THEN NOW() ELSE dispatched_at END,
        arrived_at = CASE WHEN p_new_status = 'arrived' AND arrived_at IS NULL THEN NOW() ELSE arrived_at END,
        delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
        updated_at = NOW()
    WHERE id = p_booking_id;

    -- Release vehicle availability on completion or cancellation
    IF p_new_status IN ('delivered', 'cancelled') THEN
        UPDATE public.tankers
        SET is_available = TRUE,
            updated_at = NOW()
        WHERE id = v_b.tanker_id;
    END IF;

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

-- 6. contribute_to_community_pool (TNK-C08: Auth Check & Dual Column Compatibility)
CREATE OR REPLACE FUNCTION public.contribute_to_community_pool(
    p_pool_code TEXT,
    p_contributor_name TEXT,
    p_flat_number TEXT,
    p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pool RECORD;
    v_new_amount NUMERIC;
    v_new_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required to contribute to community pool');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Contribution amount must be greater than zero');
    END IF;

    SELECT * INTO v_pool
    FROM public.community_pools
    WHERE pool_code = p_pool_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Community pool not found');
    END IF;

    IF v_pool.status = 'dispatched' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Community pool is already fulfilled and dispatched');
    END IF;

    INSERT INTO public.community_pool_contributions (
        pool_id,
        user_id,
        contributor_name,
        flat_number,
        amount,
        amount_paid,
        payment_status
    ) VALUES (
        v_pool.id,
        auth.uid(),
        p_contributor_name,
        p_flat_number,
        p_amount,
        p_amount,
        'paid'
    );

    v_new_amount := v_pool.collected_amount + p_amount;
    v_new_status := CASE WHEN v_new_amount >= v_pool.target_amount THEN 'funded' ELSE v_pool.status END;

    UPDATE public.community_pools
    SET collected_amount = v_new_amount,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = v_pool.id;

    RETURN jsonb_build_object(
        'success', true,
        'pool_id', v_pool.id,
        'collected_amount', v_new_amount,
        'status', v_new_status
    );
END;
$$;

-- 7. submit_customer_dispute (TNK-C08: Proper Columns & Caller Verification)
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
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required to lodge dispute');
    END IF;

    SELECT b.*, s.business_name AS s_name, p.full_name AS c_name 
    INTO v_b
    FROM public.bookings b
    LEFT JOIN public.suppliers s ON b.supplier_id = s.id
    LEFT JOIN public.profiles p ON b.customer_id = p.id
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
    END IF;

    IF NOT (public.is_admin(auth.uid()) OR auth.role() = 'service_role' OR auth.uid() = v_b.customer_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Only booking customer can submit dispute');
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

-- 8. register_supplier (TNK-C04 & TNK-H05: Auth & Role Escalation Protection Bypass)
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
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required for supplier registration (ERRCODE 42501)');
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

-- 9. get_nearby_tankers (TNK-H01 & SEC-002: PostGIS Radius Engine with 1.25 Road Routing & 5% GST)
CREATE OR REPLACE FUNCTION public.get_nearby_tankers(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 30000,
    capacity_filter INT DEFAULT NULL
)
RETURNS TABLE (
    tanker_id UUID,
    supplier_id UUID,
    supplier_name TEXT,
    vehicle_number TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    capacity_liters INT,
    water_type TEXT,
    base_price NUMERIC,
    price_per_km NUMERIC,
    distance_km NUMERIC,
    eta_minutes INT,
    estimated_total_price NUMERIC,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    heading_degrees DOUBLE PRECISION,
    is_available BOOLEAN,
    rating NUMERIC,
    total_deliveries INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    user_point GEOGRAPHY;
    v_caller_is_admin BOOLEAN := FALSE;
BEGIN
    user_point := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;

    IF auth.uid() IS NOT NULL THEN
        v_caller_is_admin := public.is_admin(auth.uid()) OR auth.role() = 'service_role';
    END IF;

    RETURN QUERY
    SELECT 
        t.id AS tanker_id,
        t.supplier_id,
        s.business_name AS supplier_name,
        t.vehicle_number,
        t.driver_name,
        -- SEC-002: Redact driver phone numbers during discovery scans to protect PII against scraping
        CASE 
            WHEN v_caller_is_admin THEN t.driver_phone
            WHEN t.driver_phone IS NULL THEN NULL
            WHEN LENGTH(t.driver_phone) >= 10 THEN
                SUBSTRING(t.driver_phone, 1, 3) || '••••' || SUBSTRING(t.driver_phone, LENGTH(t.driver_phone) - 2)
            ELSE '••••••••••'
        END AS driver_phone,
        t.capacity_liters,
        t.water_type,
        t.base_price,
        t.price_per_km,
        ROUND(((ST_Distance(t.current_location, user_point) * 1.25) / 1000.0)::numeric, 1) AS distance_km,
        GREATEST(5, ROUND(8 + ((ST_Distance(t.current_location, user_point) * 1.25) / 1000.0) * 3.2)::int) AS eta_minutes,
        ROUND(((t.base_price + ((ST_Distance(t.current_location, user_point) * 1.25) / 1000.0)::numeric * t.price_per_km) * 1.05), 0) AS estimated_total_price,
        t.latitude,
        t.longitude,
        COALESCE(t.heading_degrees, 0.0) AS heading_degrees,
        t.is_available,
        COALESCE(s.rating, 5.0) AS rating,
        COALESCE(s.total_deliveries, 0) AS total_deliveries
    FROM public.tankers t
    JOIN public.suppliers s ON t.supplier_id = s.id
    WHERE t.is_online = TRUE
      AND t.is_available = TRUE
      AND ST_DWithin(t.current_location, user_point, radius_meters)
      AND (capacity_filter IS NULL OR t.capacity_liters = capacity_filter)
    ORDER BY ST_Distance(t.current_location, user_point) ASC;
END;
$$;

-- 10. get_latest_tracking_breadcrumb (TNK-C04: Booking Party Authorization Guard)
CREATE OR REPLACE FUNCTION public.get_latest_tracking_breadcrumb(p_booking_id UUID)
RETURNS TABLE (
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    speed_kmh DOUBLE PRECISION,
    created_at TIMESTAMPTZ,
    distance_remaining_km NUMERIC,
    eta_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_b public.bookings;
    v_crumb public.tracking_breadcrumbs;
    v_dist NUMERIC;
    v_eta INTEGER;
BEGIN
    SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Verify caller is booking party or admin
    IF auth.uid() IS NOT NULL AND NOT (
        public.is_admin(auth.uid()) 
        OR auth.role() = 'service_role' 
        OR auth.uid() = v_b.customer_id
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.phone_number = v_b.driver_phone OR '+' || p.phone_number = v_b.driver_phone))
        OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = v_b.supplier_id AND (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND (p2.phone_number = s.contact_phone OR '+' || p2.phone_number = s.contact_phone))))
    ) THEN
        RETURN;
    END IF;

    SELECT * INTO v_crumb
    FROM public.tracking_breadcrumbs
    WHERE booking_id = p_booking_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        v_dist := ROUND(((ST_Distance(
            ST_SetSRID(ST_MakePoint(v_crumb.longitude, v_crumb.latitude), 4326)::geography,
            v_b.delivery_coordinates
        ) * 1.25) / 1000.0)::numeric, 2);
        v_eta := GREATEST(1, ROUND(v_dist * 3.3)::int);

        RETURN QUERY SELECT
            v_crumb.latitude,
            v_crumb.longitude,
            v_crumb.heading,
            v_crumb.speed_kmh,
            v_crumb.created_at,
            v_dist,
            v_eta;
    ELSE
        -- Fallback to tanker position or booking distance
        SELECT latitude, longitude, heading_degrees INTO v_crumb.latitude, v_crumb.longitude, v_crumb.heading
        FROM public.tankers
        WHERE id = v_b.tanker_id;

        IF FOUND AND v_crumb.latitude IS NOT NULL THEN
            v_dist := ROUND(((ST_Distance(
                ST_SetSRID(ST_MakePoint(v_crumb.longitude, v_crumb.latitude), 4326)::geography,
                v_b.delivery_coordinates
            ) * 1.25) / 1000.0)::numeric, 2);
            v_eta := GREATEST(1, ROUND(v_dist * 3.3)::int);

            RETURN QUERY SELECT
                v_crumb.latitude,
                v_crumb.longitude,
                COALESCE(v_crumb.heading, 0.0)::double precision,
                24.0::double precision,
                NOW(),
                v_dist,
                v_eta;
        END IF;
    END IF;
END;
$$;

-- Routine Permissions: Restrict privileged operational routines from anon (TNK-C04)
REVOKE EXECUTE ON FUNCTION public.create_payment_order(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_for_booking(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.supplier_accept_booking(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.supplier_cancel_and_reassign(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.driver_update_delivery_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.contribute_to_community_pool(TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_customer_dispute(UUID, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_supplier(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], INT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_latest_tracking_breadcrumb(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_payment_order(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoice_for_booking(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.supplier_accept_booking(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.supplier_cancel_and_reassign(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.driver_update_delivery_status(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.contribute_to_community_pool(TEXT, TEXT, TEXT, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_customer_dispute(UUID, TEXT, TEXT, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_supplier(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_nearby_tankers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_latest_tracking_breadcrumb(UUID) TO authenticated, service_role;

-- Seed breadcrumbs for demo active trip TKR-2026-90401
INSERT INTO public.tracking_breadcrumbs (
    booking_id, latitude, longitude, heading, speed_kmh, created_at
) VALUES
    ('b7777777-7777-7777-7777-777777777777', 19.1245, 72.8720, 135, 28, NOW() - INTERVAL '2 minutes'),
    ('b7777777-7777-7777-7777-777777777777', 19.1215, 72.8755, 135, 25, NOW() - INTERVAL '1 minute'),
    ('b7777777-7777-7777-7777-777777777777', 19.1190, 72.8785, 130, 22, NOW())
ON CONFLICT DO NOTHING;

