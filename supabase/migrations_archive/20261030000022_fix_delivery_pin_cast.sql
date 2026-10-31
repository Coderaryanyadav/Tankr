-- ==============================================================================
-- TANKR DATABASE MIGRATION 22: Fix delivery_pin return type cast
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_booking_atomic(
    p_tanker_id UUID,
    p_customer_id UUID,
    p_delivery_address TEXT,
    p_delivery_lat DOUBLE PRECISION,
    p_delivery_lng DOUBLE PRECISION,
    p_payment_preference TEXT DEFAULT 'upi'
)
RETURNS TABLE (
    booking_id UUID,
    booking_reference TEXT,
    status booking_status,
    delivery_pin TEXT,
    final_payable_amount NUMERIC(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tanker RECORD;
    v_quote RECORD;
    v_supplier RECORD;
    v_ref TEXT;
    v_pin VARCHAR(4);
    v_booking_id UUID;
    v_pref payment_preference;
BEGIN
    -- 1. Row Lock on Tanker to prevent race conditions
    SELECT * INTO v_tanker
    FROM public.tankers
    WHERE id = p_tanker_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tanker not found';
    END IF;

    IF v_tanker.is_available = FALSE OR v_tanker.is_online = FALSE THEN
        RAISE EXCEPTION 'This tanker has just been booked by another customer. Please choose another nearby tanker.';
    END IF;

    -- Fetch supplier name
    SELECT * INTO v_supplier
    FROM public.suppliers
    WHERE id = v_tanker.supplier_id;

    -- 2. Verify payment preference
    BEGIN
        v_pref := p_payment_preference::payment_preference;
    EXCEPTION WHEN OTHERS THEN
        v_pref := 'upi'::payment_preference;
    END;

    -- 3. Compute final authoritative server-side quote
    SELECT * INTO v_quote
    FROM public.calculate_booking_quote(p_tanker_id, p_delivery_lat, p_delivery_lng);

    -- 4. Generate random 4-digit PIN and unique reference
    v_pin := LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0');
    v_ref := 'TKR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::text, 5, '0');

    -- 5. Insert Booking with denormalized driver & vehicle info
    INSERT INTO public.bookings (
        booking_reference,
        customer_id,
        tanker_id,
        supplier_id,
        status,
        capacity_liters,
        water_type,
        delivery_address,
        delivery_latitude,
        delivery_longitude,
        delivery_coordinates,
        delivery_pin,
        delivery_distance_km,
        estimated_arrival_minutes,
        base_price,
        delivery_charge,
        surcharge,
        tax_amount,
        final_payable_amount,
        payment_preference,
        payment_status,
        driver_phone,
        driver_name,
        vehicle_number,
        supplier_name,
        quote_expires_at
    )
    VALUES (
        v_ref,
        p_customer_id,
        p_tanker_id,
        v_tanker.supplier_id,
        'pending'::booking_status,
        v_quote.capacity_liters,
        v_quote.water_type,
        p_delivery_address,
        p_delivery_lat,
        p_delivery_lng,
        ST_SetSRID(ST_MakePoint(p_delivery_lng, p_delivery_lat), 4326)::geography,
        v_pin,
        v_quote.distance_km,
        v_quote.eta_minutes,
        v_quote.base_price,
        v_quote.delivery_charge,
        v_quote.surcharge,
        v_quote.tax_amount,
        v_quote.final_payable_amount,
        v_pref,
        CASE WHEN v_pref = 'cash_on_delivery' THEN 'pending_delivery' ELSE 'authorized' END,
        v_tanker.driver_phone,
        v_tanker.driver_name,
        v_tanker.vehicle_number,
        COALESCE(v_supplier.business_name, v_quote.supplier_name, 'TANKR Water Express'),
        NOW() + INTERVAL '10 minutes'
    )
    RETURNING id INTO v_booking_id;

    -- 6. Lock tanker availability
    UPDATE public.tankers
    SET is_available = FALSE,
        updated_at = NOW()
    WHERE id = p_tanker_id;

    RETURN QUERY
    SELECT 
        v_booking_id,
        v_ref,
        'pending'::booking_status,
        v_pin::text,
        v_quote.final_payable_amount;
END;
$$;

