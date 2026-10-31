-- ==============================================================================
-- FINAL RESOLUTION FOR ADMIN OPERATIONS RPCS & SCHEMAS
-- ==============================================================================

-- 1. Ensure suppliers has updated_at column
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. get_admin_dashboard_metrics with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS TABLE (
    gross_volume_gmv NUMERIC(12,2),
    platform_revenue NUMERIC(12,2),
    total_bookings INT,
    completed_deliveries INT,
    active_tankers_online INT,
    total_suppliers INT,
    pending_kyc_count INT,
    total_liters_delivered BIGINT,
    network_surge_multiplier NUMERIC(3,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_gmv NUMERIC(12,2) := 0.00;
    v_platform_rev NUMERIC(12,2) := 0.00;
    v_total_b INT := 0;
    v_comp_b INT := 0;
    v_tankers_online INT := 0;
    v_suppliers INT := 0;
    v_pending_kyc INT := 0;
    v_liters BIGINT := 0;
    v_surge NUMERIC(3,2) := 1.25;
BEGIN
    SELECT COALESCE(SUM(final_payable_amount), 0.00), COUNT(*)
    INTO v_total_gmv, v_total_b
    FROM public.bookings;

    v_platform_rev := ROUND(v_total_gmv * 0.10, 2);

    SELECT COUNT(*), COALESCE(SUM(capacity_liters), 0)
    INTO v_comp_b, v_liters
    FROM public.bookings
    WHERE status = 'delivered';

    SELECT COUNT(*) INTO v_tankers_online
    FROM public.tankers
    WHERE is_online = TRUE;

    SELECT COUNT(*) INTO v_suppliers
    FROM public.suppliers;

    SELECT COUNT(*) INTO v_pending_kyc
    FROM public.suppliers
    WHERE verification_status = 'pending_review';

    SELECT COALESCE((value->>'surge_multiplier')::NUMERIC, 1.25)
    INTO v_surge
    FROM public.platform_settings
    WHERE key = 'pricing_defaults';

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

-- 3. admin_emergency_dispatch with enum casting
CREATE OR REPLACE FUNCTION public.admin_emergency_dispatch(
    p_institution_name TEXT,
    p_institution_type TEXT,
    p_contact_person TEXT,
    p_contact_phone TEXT,
    p_delivery_address TEXT,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_required_liters INTEGER,
    p_water_type TEXT DEFAULT 'Potable (Drinking)',
    p_sla_minutes INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tanker_id UUID;
    v_vehicle_number TEXT;
    v_driver_name TEXT;
    v_driver_phone TEXT;
    v_dispatch_id UUID;
    v_type_enum public.institution_type;
BEGIN
    BEGIN
        v_type_enum := p_institution_type::public.institution_type;
    EXCEPTION WHEN OTHERS THEN
        v_type_enum := 'hospital_dialysis'::public.institution_type;
    END;

    -- Select nearest available tanker
    SELECT id, vehicle_number, driver_name, driver_phone
    INTO v_tanker_id, v_vehicle_number, v_driver_name, v_driver_phone
    FROM public.tankers
    WHERE is_online = true AND is_available = true
    ORDER BY ST_Distance(
        current_location,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) ASC
    LIMIT 1;

    -- If none strictly available, pick nearest online tanker
    IF v_tanker_id IS NULL THEN
        SELECT id, vehicle_number, driver_name, driver_phone
        INTO v_tanker_id, v_vehicle_number, v_driver_name, v_driver_phone
        FROM public.tankers
        WHERE is_online = true
        ORDER BY ST_Distance(
            current_location,
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
        ) ASC
        LIMIT 1;
    END IF;

    -- Mark tanker as dispatched
    IF v_tanker_id IS NOT NULL THEN
        UPDATE public.tankers SET is_available = false WHERE id = v_tanker_id;
    END IF;

    -- Insert emergency dispatch record
    INSERT INTO public.emergency_dispatches (
        institution_name,
        institution_type,
        contact_person,
        contact_phone,
        delivery_address,
        latitude,
        longitude,
        required_liters,
        water_type,
        sla_minutes,
        status,
        assigned_tanker_id,
        vehicle_number,
        driver_name,
        driver_phone
    ) VALUES (
        p_institution_name,
        v_type_enum,
        p_contact_person,
        p_contact_phone,
        p_delivery_address,
        p_latitude,
        p_longitude,
        p_required_liters,
        p_water_type,
        p_sla_minutes,
        'en_route',
        v_tanker_id,
        v_vehicle_number,
        v_driver_name,
        v_driver_phone
    )
    RETURNING id INTO v_dispatch_id;

    -- Log to admin audit trail
    INSERT INTO public.admin_audit_logs (
        action,
        target_entity,
        target_id,
        details
    ) VALUES (
        'EMERGENCY_PRIORITY_DISPATCH',
        'emergency_dispatches',
        v_dispatch_id::text,
        jsonb_build_object(
            'institution', p_institution_name,
            'liters', p_required_liters,
            'sla_minutes', p_sla_minutes,
            'tanker', v_vehicle_number,
            'driver', v_driver_name
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'dispatch_id', v_dispatch_id,
        'assigned_vehicle', v_vehicle_number,
        'driver_name', v_driver_name,
        'driver_phone', v_driver_phone,
        'sla_minutes', p_sla_minutes
    );
END;
$$;

-- 4. admin_verify_supplier
CREATE OR REPLACE FUNCTION public.admin_verify_supplier(
    p_supplier_id UUID,
    p_status TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.suppliers 
    SET verification_status = p_status,
        is_verified = (p_status = 'verified'),
        updated_at = NOW()
    WHERE id = p_supplier_id;

    INSERT INTO public.admin_audit_logs (
        action,
        target_entity,
        target_id,
        details
    ) VALUES (
        CASE WHEN p_status = 'verified' THEN 'APPROVE_SUPPLIER_KYC' ELSE 'REJECT_SUPPLIER_KYC' END,
        'suppliers',
        p_supplier_id::text,
        jsonb_build_object('status', p_status, 'notes', COALESCE(p_notes, 'KYC evaluation completed by operations desk.'))
    );

    RETURN jsonb_build_object('success', true, 'supplier_id', p_supplier_id, 'status', p_status);
END;
$$;

-- 5. admin_resolve_dispute
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
BEGIN
    SELECT booking_id, customer_id INTO v_booking_id, v_customer_id
    FROM public.disputes WHERE id = p_dispute_id;

    UPDATE public.disputes 
    SET status = p_status,
        admin_notes = p_notes,
        resolved_at = NOW()
    WHERE id = p_dispute_id;

    IF p_status = 'refunded' AND p_refund_amount > 0 THEN
        INSERT INTO public.payments (
            booking_id,
            amount,
            method,
            status,
            gateway_payment_id
        ) VALUES (
            v_booking_id,
            p_refund_amount,
            'refund',
            'refunded',
            'rfnd_' || substr(md5(random()::text), 1, 16)
        );
    END IF;

    INSERT INTO public.admin_audit_logs (
        action,
        target_entity,
        target_id,
        details
    ) VALUES (
        'RESOLVE_CUSTOMER_DISPUTE',
        'disputes',
        p_dispute_id::text,
        jsonb_build_object('status', p_status, 'refund_amount', p_refund_amount, 'notes', p_notes)
    );

    RETURN jsonb_build_object('success', true, 'dispute_id', p_dispute_id, 'status', p_status);
END;
$$;

-- Grant execution to all
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
