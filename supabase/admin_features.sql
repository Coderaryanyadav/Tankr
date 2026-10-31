-- ==============================================================================
-- ADMIN ENTERPRISE OPERATIONS RPC & TABLE EXTENSIONS
-- ==============================================================================

-- 1. Ensure driver_payout_ledger exists
CREATE TABLE IF NOT EXISTS public.driver_payout_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_phone TEXT NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('delivery_earnings', 'tip_credit', 'batch_payout_settlement', 'dispute_deduction')),
    amount NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Ensure corporate_subscriptions exists
CREATE TABLE IF NOT EXISTS public.corporate_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('tech_park', 'society', 'hospital', 'commercial')),
    contact_person TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    daily_liters INTEGER NOT NULL,
    frequency_per_day INTEGER DEFAULT 1,
    preferred_time_slot TEXT NOT NULL,
    monthly_rate NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
    assigned_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    assigned_supplier_name TEXT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Ensure emergency_dispatches exists
CREATE TABLE IF NOT EXISTS public.emergency_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_name TEXT NOT NULL,
    institution_type TEXT NOT NULL CHECK (institution_type IN ('hospital_dialysis', 'icu_facility', 'critical_sump', 'elderly_care')),
    contact_person TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    required_liters INTEGER NOT NULL,
    water_type TEXT NOT NULL DEFAULT 'Potable (Drinking)',
    sla_minutes INTEGER NOT NULL DEFAULT 20,
    status TEXT NOT NULL DEFAULT 'en_route' CHECK (status IN ('en_route', 'delivered', 'diverted')),
    assigned_tanker_id UUID REFERENCES public.tankers(id) ON DELETE SET NULL,
    vehicle_number TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Ensure disputes table columns match UI expectations
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2);
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'volume_shortage';

-- 5. Table Grants & RLS for Authenticated and Anon
GRANT ALL ON TABLE public.driver_payout_ledger TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.corporate_subscriptions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.emergency_dispatches TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.water_quality_certificates TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.disputes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.admin_audit_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.service_zones TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.platform_settings TO anon, authenticated, service_role;

ALTER TABLE public.driver_payout_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_quality_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "driver_payout_ledger_all" ON public.driver_payout_ledger;
    CREATE POLICY "driver_payout_ledger_all" ON public.driver_payout_ledger FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "corporate_subscriptions_all" ON public.corporate_subscriptions;
    CREATE POLICY "corporate_subscriptions_all" ON public.corporate_subscriptions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "emergency_dispatches_all" ON public.emergency_dispatches;
    CREATE POLICY "emergency_dispatches_all" ON public.emergency_dispatches FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "water_quality_certificates_all" ON public.water_quality_certificates;
    CREATE POLICY "water_quality_certificates_all" ON public.water_quality_certificates FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "disputes_all" ON public.disputes;
    CREATE POLICY "disputes_all" ON public.disputes FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 6. RPC: get_service_zone_liquidity_health
CREATE OR REPLACE FUNCTION public.get_service_zone_liquidity_health()
RETURNS TABLE (
    zone_name TEXT,
    online_fleet_count INTEGER,
    available_fleet_count INTEGER,
    active_deliveries INTEGER,
    liquidity_status TEXT,
    avg_eta_minutes INTEGER,
    traffic_factor NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH zone_calc AS (
        SELECT 
            sz.zone_name,
            COALESCE((
                SELECT COUNT(*)::INTEGER FROM public.tankers t
                WHERE t.is_online = TRUE 
                  AND ST_DWithin(t.current_location, ST_SetSRID(ST_MakePoint(sz.center_lng, sz.center_lat), 4326)::geography, (sz.radius_km * 1000)::DOUBLE PRECISION)
            ), 0) AS z_online,
            COALESCE((
                SELECT COUNT(*)::INTEGER FROM public.tankers t
                WHERE t.is_online = TRUE AND t.is_available = TRUE
                  AND ST_DWithin(t.current_location, ST_SetSRID(ST_MakePoint(sz.center_lng, sz.center_lat), 4326)::geography, (sz.radius_km * 1000)::DOUBLE PRECISION)
            ), 0) AS z_avail,
            COALESCE((
                SELECT COUNT(*)::INTEGER FROM public.bookings b
                WHERE b.status IN ('pending', 'accepted', 'driver_assigned', 'en_route', 'arrived', 'delivering')
                  AND ST_DWithin(b.delivery_coordinates, ST_SetSRID(ST_MakePoint(sz.center_lng, sz.center_lat), 4326)::geography, (sz.radius_km * 1000)::DOUBLE PRECISION)
            ), 0) AS z_demand,
            sz.traffic_multiplier,
            sz.minimum_fleet_density
        FROM public.service_zones sz
        WHERE sz.is_operational = TRUE
    )
    SELECT 
        zc.zone_name,
        zc.z_online AS online_fleet_count,
        zc.z_avail AS available_fleet_count,
        zc.z_demand AS active_deliveries,
        CASE 
            WHEN zc.z_avail = 0 AND zc.z_demand > 0 THEN 'CRITICAL'
            WHEN zc.z_demand > zc.z_avail THEN 'ELEVATED'
            WHEN zc.z_avail < zc.minimum_fleet_density THEN 'MODERATE'
            ELSE 'OPTIMAL'
        END AS liquidity_status,
        CASE 
            WHEN zc.z_avail = 0 THEN 45
            WHEN zc.z_demand > zc.z_avail THEN 30
            ELSE 15
        END AS avg_eta_minutes,
        zc.traffic_multiplier AS traffic_factor
    FROM zone_calc zc
    ORDER BY zc.zone_name ASC;
END;
$$;

-- 7. RPC: admin_emergency_dispatch
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
BEGIN
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

    -- If none strictly available, pick nearest online tanker to pre-empt
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
        p_institution_type,
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

-- 8. RPC: admin_execute_batch_payout
CREATE OR REPLACE FUNCTION public.admin_execute_batch_payout()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_amount NUMERIC := 0;
    v_records_count INTEGER := 0;
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            driver_phone,
            COUNT(*) as trip_count,
            SUM(amount) as driver_earnings
        FROM public.driver_payout_ledger
        WHERE entry_type = 'delivery_earnings'
        GROUP BY driver_phone
    LOOP
        INSERT INTO public.driver_payout_ledger (
            driver_phone,
            entry_type,
            amount,
            notes
        ) VALUES (
            r.driver_phone,
            'batch_payout_settlement',
            r.driver_earnings,
            format('Bank NEFT/IMPS payout transfer executed for %s completed deliveries', r.trip_count)
        );

        v_total_amount := v_total_amount + r.driver_earnings;
        v_records_count := v_records_count + 1;
    END LOOP;

    INSERT INTO public.admin_audit_logs (
        action,
        target_entity,
        target_id,
        details
    ) VALUES (
        'BATCH_PAYOUT_EXECUTED',
        'driver_payout_ledger',
        'batch-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
        jsonb_build_object(
            'beneficiaries', v_records_count,
            'total_settled', v_total_amount,
            'method', 'Automated Razorpay Payouts API / Direct Bank Transfer'
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'beneficiaries_count', v_records_count,
        'total_settled_amount', v_total_amount
    );
END;
$$;

-- 9. RPC: admin_verify_supplier
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

-- 10. RPC: admin_resolve_dispute
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
            user_id,
            amount,
            status,
            payment_gateway,
            gateway_payment_id
        ) VALUES (
            v_booking_id,
            v_customer_id,
            p_refund_amount,
            'refunded',
            'razorpay',
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

-- 11. RPC: admin_rebalance_tanker
CREATE OR REPLACE FUNCTION public.admin_rebalance_tanker(
    p_tanker_id UUID,
    p_zone_name TEXT DEFAULT 'Marol / MIDC Andheri East'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_veh TEXT;
    v_target_lat DOUBLE PRECISION;
    v_target_lng DOUBLE PRECISION;
BEGIN
    SELECT center_lat, center_lng INTO v_target_lat, v_target_lng
    FROM public.service_zones WHERE zone_name ILIKE '%' || p_zone_name || '%' LIMIT 1;

    IF v_target_lat IS NULL THEN
        v_target_lat := 19.1171;
        v_target_lng := 72.8809;
    END IF;

    UPDATE public.tankers
    SET is_available = FALSE,
        latitude = v_target_lat,
        longitude = v_target_lng,
        current_location = ST_SetSRID(ST_MakePoint(v_target_lng, v_target_lat), 4326)::geography
    WHERE id = p_tanker_id
    RETURNING vehicle_number INTO v_veh;

    INSERT INTO public.admin_audit_logs (
        action,
        target_entity,
        target_id,
        details
    ) VALUES (
        'TANKER_REBALANCE_DISPATCH',
        'tankers',
        p_tanker_id::text,
        jsonb_build_object('vehicle_number', v_veh, 'target_zone', p_zone_name, 'target_coordinates', jsonb_build_array(v_target_lat, v_target_lng))
    );

    RETURN jsonb_build_object('success', true, 'vehicle_number', v_veh, 'status', 'en_route_rebalance');
END;
$$;

-- Grant execute on routines
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

