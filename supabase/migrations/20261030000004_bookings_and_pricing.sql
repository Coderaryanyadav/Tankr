-- ==============================================================================
-- TANKR DATABASE MIGRATION: Bookings Lifecycle, Server-Side Pricing & Atomic Transactions
-- ==============================================================================

-- 1. Booking Status Enum
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM (
        'pending', 
        'accepted', 
        'supplier_assigned', 
        'driver_assigned', 
        'en_route', 
        'arrived', 
        'delivering', 
        'delivered', 
        'cancelled', 
        'disputed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Payment Preference Enum
DO $$ BEGIN
    CREATE TYPE payment_preference AS ENUM ('upi', 'cash_on_delivery', 'card_online');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    tanker_id UUID NOT NULL REFERENCES public.tankers(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    status booking_status NOT NULL DEFAULT 'pending',
    capacity_liters INT NOT NULL,
    water_type TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_latitude DOUBLE PRECISION NOT NULL,
    delivery_longitude DOUBLE PRECISION NOT NULL,
    delivery_coordinates geography(POINT, 4326),
    delivery_pin VARCHAR(4) NOT NULL,
    delivery_distance_km NUMERIC(5,2) NOT NULL,
    estimated_arrival_minutes INT NOT NULL,
    base_price NUMERIC(10,2) NOT NULL,
    delivery_charge NUMERIC(10,2) NOT NULL,
    surcharge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    final_payable_amount NUMERIC(10,2) NOT NULL,
    payment_preference payment_preference NOT NULL DEFAULT 'upi',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Spatial & Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tanker_id ON public.bookings (tanker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at DESC);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own bookings"
    ON public.bookings FOR SELECT
    USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own bookings"
    ON public.bookings FOR UPDATE
    USING (auth.uid() = customer_id)
    WITH CHECK (auth.uid() = customer_id);

-- 6. Server-side Pricing Engine RPC: calculate_booking_quote
CREATE OR REPLACE FUNCTION calculate_booking_quote(
    p_tanker_id UUID,
    p_delivery_lat DOUBLE PRECISION,
    p_delivery_lng DOUBLE PRECISION
)
RETURNS TABLE (
    tanker_id UUID,
    supplier_name TEXT,
    vehicle_number TEXT,
    driver_name TEXT,
    capacity_liters INT,
    water_type TEXT,
    distance_km NUMERIC(5,2),
    eta_minutes INT,
    base_price NUMERIC(10,2),
    delivery_charge NUMERIC(10,2),
    surcharge NUMERIC(10,2),
    tax_amount NUMERIC(10,2),
    final_payable_amount NUMERIC(10,2)
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_tanker RECORD;
    v_dist_km NUMERIC(5,2);
    v_eta_min INT;
    v_base_price NUMERIC(10,2);
    v_delivery_charge NUMERIC(10,2);
    v_surcharge NUMERIC(10,2) := 0.00;
    v_tax_amount NUMERIC(10,2);
    v_total NUMERIC(10,2);
    v_hour INT;
BEGIN
    -- Fetch tanker with supplier
    SELECT 
        t.id, t.capacity_liters, t.water_type, t.base_price, t.price_per_km,
        t.current_location, t.vehicle_number, t.driver_name,
        s.business_name AS supplier_name
    INTO v_tanker
    FROM public.tankers t
    JOIN public.suppliers s ON s.id = t.supplier_id
    WHERE t.id = p_tanker_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tanker not found or unavailable';
    END IF;

    -- Calculate distance using PostGIS geography
    v_dist_km := ROUND(((ST_Distance(
        v_tanker.current_location,
        ST_SetSRID(ST_MakePoint(p_delivery_lng, p_delivery_lat), 4326)::geography
    ) * 1.25) / 1000.0)::numeric, 2);

    -- Calculate ETA (prep 6m + 3.3m/km)
    v_eta_min := ROUND(6 + (v_dist_km * 3.3))::int;

    v_base_price := v_tanker.base_price;
    v_delivery_charge := ROUND((v_dist_km * v_tanker.price_per_km)::numeric, 2);

    -- Time-based surcharge: 10% peak surge between 18:00 and 22:00
    v_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))::int;
    IF v_hour >= 18 AND v_hour <= 22 THEN
        v_surcharge := ROUND((v_base_price * 0.10)::numeric, 2);
    END IF;

    -- 5% GST tax on total utility service
    v_tax_amount := ROUND(((v_base_price + v_delivery_charge + v_surcharge) * 0.05)::numeric, 2);
    v_total := ROUND(v_base_price + v_delivery_charge + v_surcharge + v_tax_amount, 2);

    RETURN QUERY
    SELECT 
        v_tanker.id,
        v_tanker.supplier_name,
        v_tanker.vehicle_number,
        v_tanker.driver_name,
        v_tanker.capacity_liters,
        v_tanker.water_type,
        v_dist_km,
        v_eta_min,
        v_base_price,
        v_delivery_charge,
        v_surcharge,
        v_tax_amount,
        v_total;
END;
$$;

-- 7. Server-Side Atomic Booking Transaction: create_booking_atomic
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
    v_ref TEXT;
    v_pin VARCHAR(4);
    v_booking_id UUID;
    v_pref payment_preference;
BEGIN
    -- 1. Row Lock on Tanker to prevent concurrent race condition bookings
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

    -- 5. Insert Booking
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
        payment_status
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
        CASE WHEN v_pref = 'cash_on_delivery' THEN 'pending_delivery' ELSE 'authorized' END
    )
    RETURNING id INTO v_booking_id;

    -- 6. Atomically mark tanker as assigned
    UPDATE public.tankers
    SET is_available = FALSE
    WHERE id = p_tanker_id;

    -- Return confirmed booking data
    RETURN QUERY
    SELECT 
        v_booking_id,
        v_ref,
        'pending'::booking_status,
        v_pin::text,
        v_quote.final_payable_amount;
END;
$$;

-- 8. Atomic Booking Cancellation RPC: cancel_booking_atomic
CREATE OR REPLACE FUNCTION cancel_booking_atomic(
    p_booking_id UUID,
    p_reason TEXT DEFAULT 'Customer requested cancellation'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_b RECORD;
BEGIN
    SELECT * INTO v_b
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_b.status IN ('delivering', 'delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot cancel booking in % status', v_b.status;
    END IF;

    -- Update booking status
    UPDATE public.bookings
    SET status = 'cancelled'::booking_status,
        cancellation_reason = p_reason,
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_booking_id;

    -- Re-enable tanker availability
    UPDATE public.tankers
    SET is_available = TRUE
    WHERE id = v_b.tanker_id;

    RETURN TRUE;
END;
$$;

