-- ==============================================================================
-- TANKR DATABASE MIGRATION 35: Fix Vehicle Onboarding & Supplier Validation
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.supplier_onboard_tanker(
    p_supplier_id uuid,
    p_vehicle_number text,
    p_capacity_liters integer,
    p_water_type text,
    p_driver_name text,
    p_driver_phone text,
    p_base_price numeric DEFAULT 750.00,
    p_price_per_km numeric DEFAULT 25.00
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_veh TEXT;
    v_tanker_id UUID;
    v_supplier RECORD;
    v_default_lat DOUBLE PRECISION := 19.1171;
    v_default_lng DOUBLE PRECISION := 72.8809;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    v_clean_veh := UPPER(TRIM(p_vehicle_number));

    -- 1. Validate vehicle number format
    IF LENGTH(v_clean_veh) < 8 THEN
        RAISE EXCEPTION 'Invalid Vehicle Number: Registration must be at least 8 characters (e.g. MH-02-TC-5001).'
            USING ERRCODE = '22023';
    END IF;

    -- 2. Verify supplier existence
    SELECT * INTO v_supplier
    FROM public.suppliers
    WHERE id = p_supplier_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Supplier hub not found.' USING ERRCODE = '02000';
    END IF;

    -- 3. Verify caller authorization (must own supplier hub or be admin)
    IF auth.uid() IS NOT NULL AND auth.role() != 'service_role' THEN
        -- Check admin
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
            v_is_authorized := TRUE;
        END IF;

        -- Check supplier ownership
        IF NOT v_is_authorized AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (v_supplier.contact_phone = p.phone_number OR v_supplier.contact_phone = '+' || p.phone_number)
        ) THEN
            v_is_authorized := TRUE;
        END IF;

        IF NOT v_is_authorized THEN
            RAISE EXCEPTION 'Unauthorized: You do not own this supplier hub.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 4. Check if vehicle is suspended or compliance-flagged
    IF EXISTS (
        SELECT 1 FROM public.suspended_entities
        WHERE entity_type = 'vehicle_reg' AND identifier_value = v_clean_veh
    ) THEN
        RAISE EXCEPTION 'Vehicle Rejected: This vehicle registration has been flagged for safety compliance violations.'
            USING ERRCODE = '23505';
    END IF;

    -- 5. Prevent duplicate vehicle registrations
    IF EXISTS (
        SELECT 1 FROM public.tankers
        WHERE vehicle_number = v_clean_veh
    ) THEN
        RAISE EXCEPTION 'Duplicate Vehicle: A tanker with registration % is already onboarded.', v_clean_veh
            USING ERRCODE = '23505';
    END IF;

    -- 6. Insert into tankers with correct PostGIS location columns
    INSERT INTO public.tankers (
        supplier_id,
        vehicle_number,
        capacity_liters,
        water_type,
        driver_name,
        driver_phone,
        base_price,
        price_per_km,
        is_online,
        is_available,
        latitude,
        longitude,
        current_location,
        gross_vehicle_weight_tonnes,
        height_clearance_meters,
        commercial_route_profile
    ) VALUES (
        p_supplier_id,
        v_clean_veh,
        GREATEST(1000, p_capacity_liters),
        COALESCE(p_water_type, 'Potable (Drinking)'),
        TRIM(p_driver_name),
        TRIM(p_driver_phone),
        GREATEST(100.00, p_base_price),
        GREATEST(10.00, p_price_per_km),
        TRUE,
        TRUE,
        v_default_lat,
        v_default_lng,
        ST_SetSRID(ST_MakePoint(v_default_lng, v_default_lat), 4326)::geography,
        CASE WHEN p_capacity_liters >= 15000 THEN 24.0 WHEN p_capacity_liters >= 8000 THEN 16.0 ELSE 9.5 END,
        3.4,
        'heavy_water_tanker'
    ) RETURNING id INTO v_tanker_id;

    RETURN jsonb_build_object(
        'success', true,
        'tanker_id', v_tanker_id,
        'vehicle_number', v_clean_veh,
        'capacity_liters', p_capacity_liters,
        'water_type', p_water_type
    );
END;
$$;
