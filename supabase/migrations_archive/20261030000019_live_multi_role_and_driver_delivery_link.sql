-- ==============================================================================
-- TANKR DATABASE MIGRATION 19: Multi-Role Personas & Driver Delivery Linking
-- ==============================================================================

-- 1. Ensure bookings table has driver and tanker denormalized fields for zero-latency queries
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS driver_phone TEXT,
    ADD COLUMN IF NOT EXISTS driver_name TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_number TEXT,
    ADD COLUMN IF NOT EXISTS supplier_name TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_driver_phone ON public.bookings(driver_phone);

-- 2. Backfill existing bookings with tanker and supplier details
UPDATE public.bookings b
SET 
    driver_phone = t.driver_phone,
    driver_name = t.driver_name,
    vehicle_number = t.vehicle_number,
    supplier_name = s.business_name
FROM public.tankers t
JOIN public.suppliers s ON s.id = t.supplier_id
WHERE b.tanker_id = t.id
  AND (b.driver_phone IS NULL OR b.vehicle_number IS NULL);

-- 3. Update create_booking_atomic to automatically populate these columns
CREATE OR REPLACE FUNCTION create_booking_atomic(
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
    FROM calculate_booking_quote(p_tanker_id, p_delivery_lat, p_delivery_lng);

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
        v_pin,
        v_quote.final_payable_amount;
END;
$$;

-- 4. Seed / Configure Specific Test Accounts into profiles
-- Customer: 919845012345
UPDATE public.profiles
SET role = 'customer',
    is_onboarding_completed = TRUE,
    full_name = 'Aryan Yadav (Customer)',
    city = 'Bengaluru',
    pincode = '560103',
    preferred_address = 'Flat 402, Green Glen Layout, Bellandur, Bengaluru'
WHERE phone_number IN ('919845012345', '+919845012345');

-- Driver: 919876543210
UPDATE public.profiles
SET role = 'driver',
    is_onboarding_completed = TRUE,
    full_name = 'Ramesh Patil (Driver)',
    city = 'Bengaluru',
    pincode = '560103'
WHERE phone_number IN ('919876543210', '+919876543210');

-- Supplier: 919999999999
UPDATE public.profiles
SET role = 'supplier',
    is_onboarding_completed = TRUE,
    full_name = 'Cauvery Water Hub (Supplier)',
    city = 'Bengaluru',
    pincode = '560103'
WHERE phone_number IN ('919999999999', '+919999999999');

-- Admin: 918888888888
UPDATE public.profiles
SET role = 'admin',
    is_onboarding_completed = TRUE,
    full_name = 'TANKR Operations Admin',
    city = 'Bengaluru',
    pincode = '560001'
WHERE phone_number IN ('918888888888', '+918888888888');

-- QA Tester: 917777777777
UPDATE public.profiles
SET role = 'customer',
    is_onboarding_completed = TRUE,
    full_name = 'QA General Tester',
    city = 'Bengaluru',
    pincode = '560103'
WHERE phone_number IN ('917777777777', '+917777777777');

-- 5. Ensure Supplier Hub exists and is linked to Supplier phone
INSERT INTO public.suppliers (id, business_name, contact_phone, is_verified, verification_status, rating, total_deliveries)
VALUES (
    'addd79a1-bdf1-459d-a1cc-046a424b19b9',
    'Sri Cauvery Water Supplies',
    '+919999999999',
    TRUE,
    'verified',
    4.9,
    350
)
ON CONFLICT (id) DO UPDATE
SET contact_phone = '+919999999999',
    business_name = 'Sri Cauvery Water Supplies',
    verification_status = 'verified';

-- 6. Ensure Tanker KA-04-E-2024 is linked to Driver Ramesh Patil (+919876543210)
UPDATE public.tankers
SET driver_name = 'Ramesh Patil',
    driver_phone = '+919876543210',
    is_available = TRUE,
    is_online = TRUE,
    supplier_id = 'addd79a1-bdf1-459d-a1cc-046a424b19b9',
    capacity_liters = 5000,
    base_price = 850.00,
    price_per_km = 25.00,
    latitude = 12.9352,
    longitude = 77.6245
WHERE vehicle_number = 'KA-04-E-2024';

-- 7. Dev Role Switcher RPC (Allows switching role in dev/testing effortlessly)
CREATE OR REPLACE FUNCTION public.dev_switch_role(p_new_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role user_role;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    BEGIN
        v_role := p_new_role::user_role;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid role: %', p_new_role;
    END;

    UPDATE public.profiles
    SET role = v_role,
        is_onboarding_completed = TRUE,
        updated_at = NOW()
    WHERE id = auth.uid();

    RETURN jsonb_build_object(
        'success', true,
        'user_id', auth.uid(),
        'new_role', v_role
    );
END;
$$;
