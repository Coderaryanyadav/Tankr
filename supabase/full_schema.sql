-- ==============================================================================
-- TANKR DATABASE MIGRATION: Auth Profiles & Onboarding
-- ==============================================================================

-- 1. Create User Roles Enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'supplier', 'driver', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Profiles Table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    is_onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    profile_photo_url TEXT,
    preferred_address TEXT,
    city TEXT DEFAULT 'Bengaluru',
    pincode TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 5. Trigger function to auto-create profile record upon phone signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, phone_number, full_name, is_onboarding_completed)
    VALUES (
        NEW.id,
        COALESCE(NEW.phone, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
        FALSE
    )
    ON CONFLICT (id) DO UPDATE
    SET phone_number = EXCLUDED.phone_number,
        updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 6. Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- TANKR DATABASE MIGRATION: PostGIS & Saved Delivery Addresses
-- ==============================================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Address Label Enum
DO $$ BEGIN
    CREATE TYPE address_label AS ENUM ('home', 'work', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Saved Addresses Table
CREATE TABLE IF NOT EXISTS public.saved_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label address_label NOT NULL DEFAULT 'home',
    custom_name TEXT,
    flat_or_building TEXT NOT NULL,
    street_address TEXT NOT NULL,
    landmark TEXT,
    city TEXT NOT NULL DEFAULT 'Bengaluru',
    pincode VARCHAR(6) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    coordinates geography(POINT, 4326),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Spatial Index on coordinates
CREATE INDEX IF NOT EXISTS idx_saved_addresses_coordinates 
    ON public.saved_addresses USING GIST (coordinates);

CREATE INDEX IF NOT EXISTS idx_saved_addresses_user_id 
    ON public.saved_addresses (user_id);

-- 5. Trigger to auto-sync geography(POINT) from lat/lng
CREATE OR REPLACE FUNCTION public.sync_address_coordinates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.coordinates = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_address_coordinates ON public.saved_addresses;
CREATE TRIGGER trg_sync_address_coordinates
    BEFORE INSERT OR UPDATE OF latitude, longitude
    ON public.saved_addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_address_coordinates();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
CREATE POLICY "Users can view their own saved addresses"
    ON public.saved_addresses
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved addresses"
    ON public.saved_addresses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved addresses"
    ON public.saved_addresses
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved addresses"
    ON public.saved_addresses
    FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- TANKR DATABASE MIGRATION: Suppliers, Tankers & Discovery RPC
-- ==============================================================================

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    rating NUMERIC(2,1) NOT NULL DEFAULT 4.8,
    total_deliveries INT NOT NULL DEFAULT 150,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tankers Table
CREATE TABLE IF NOT EXISTS public.tankers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    vehicle_number TEXT NOT NULL UNIQUE,
    driver_name TEXT NOT NULL,
    driver_phone TEXT NOT NULL,
    capacity_liters INT NOT NULL CHECK (capacity_liters IN (1000, 2000, 5000, 10000, 12000, 20000)),
    water_type TEXT NOT NULL DEFAULT 'Potable (Drinking)',
    base_price NUMERIC(10,2) NOT NULL,
    price_per_km NUMERIC(10,2) NOT NULL DEFAULT 25.00,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_online BOOLEAN NOT NULL DEFAULT TRUE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    current_location geography(POINT, 4326),
    heading_degrees DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_ping_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Spatial Indexes
CREATE INDEX IF NOT EXISTS idx_tankers_current_location 
    ON public.tankers USING GIST (current_location);

CREATE INDEX IF NOT EXISTS idx_tankers_availability 
    ON public.tankers (is_available, is_online, capacity_liters);

-- 4. Sync Trigger for tanker coordinates
CREATE OR REPLACE FUNCTION public.sync_tanker_coordinates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.current_location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    NEW.last_ping_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_tanker_coordinates ON public.tankers;
CREATE TRIGGER trg_sync_tanker_coordinates
    BEFORE INSERT OR UPDATE OF latitude, longitude
    ON public.tankers
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_tanker_coordinates();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tankers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view verified suppliers"
    ON public.suppliers FOR SELECT
    USING (is_verified = TRUE);

CREATE POLICY "Public can view active online tankers"
    ON public.tankers FOR SELECT
    USING (is_online = TRUE);

-- 6. PostGIS Discovery Stored Procedure / RPC
CREATE OR REPLACE FUNCTION get_nearby_tankers(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 25000,
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
    distance_km DOUBLE PRECISION,
    eta_minutes INT,
    estimated_total_price NUMERIC,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    heading_degrees DOUBLE PRECISION,
    is_available BOOLEAN,
    rating NUMERIC,
    total_deliveries INT
)
LANGUAGE sql
STABLE
AS $$
    WITH tanker_distances AS (
        SELECT 
            t.id AS tanker_id,
            s.id AS supplier_id,
            s.business_name AS supplier_name,
            t.vehicle_number,
            t.driver_name,
            t.driver_phone,
            t.capacity_liters,
            t.water_type,
            t.base_price,
            t.price_per_km,
            -- Haversine distance adjusted by road winding factor (1.25)
            ROUND(((ST_Distance(
                t.current_location,
                ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
            ) * 1.25) / 1000.0)::numeric, 1)::double precision AS dist_km,
            t.latitude,
            t.longitude,
            t.heading_degrees,
            t.is_available,
            s.rating,
            s.total_deliveries
        FROM public.tankers t
        JOIN public.suppliers s ON s.id = t.supplier_id
        WHERE t.is_online = TRUE
          AND t.is_available = TRUE
          AND s.is_verified = TRUE
          AND (capacity_filter IS NULL OR t.capacity_liters = capacity_filter)
          AND ST_DWithin(
              t.current_location,
              ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
              radius_meters
          )
    )
    SELECT 
        tanker_id,
        supplier_id,
        supplier_name,
        vehicle_number,
        driver_name,
        driver_phone,
        capacity_liters,
        water_type,
        base_price,
        price_per_km,
        dist_km AS distance_km,
        -- Urban ETA: prep time (6 mins) + travel time (~18 km/h = 3.3 min/km)
        ROUND(6 + (dist_km * 3.3))::int AS eta_minutes,
        -- Server computed quote
        ROUND(base_price + (dist_km::numeric * price_per_km), 0) AS estimated_total_price,
        latitude,
        longitude,
        heading_degrees,
        is_available,
        rating,
        total_deliveries
    FROM tanker_distances
    ORDER BY dist_km ASC;
$$;

-- 7. Seed Data: Verified Suppliers and Active Tankers in Bengaluru
DO $$
DECLARE
    supp1 UUID;
    supp2 UUID;
    supp3 UUID;
    supp4 UUID;
BEGIN
    -- Only seed if suppliers table is empty
    IF NOT EXISTS (SELECT 1 FROM public.suppliers LIMIT 1) THEN
        INSERT INTO public.suppliers (business_name, contact_phone, is_verified, rating, total_deliveries)
        VALUES 
            ('Sri Cauvery Water Supplies', '+919845012345', TRUE, 4.9, 320)
        RETURNING id INTO supp1;

        INSERT INTO public.suppliers (business_name, contact_phone, is_verified, rating, total_deliveries)
        VALUES 
            ('Ganga Jal Commercial Tankers', '+919845067890', TRUE, 4.8, 280)
        RETURNING id INTO supp2;

        INSERT INTO public.suppliers (business_name, contact_phone, is_verified, rating, total_deliveries)
        VALUES 
            ('Nandi Water Express Logistics', '+919845098765', TRUE, 4.7, 195)
        RETURNING id INTO supp3;

        INSERT INTO public.suppliers (business_name, contact_phone, is_verified, rating, total_deliveries)
        VALUES 
            ('Bangalore Pure Drops Supply', '+919845054321', TRUE, 4.9, 410)
        RETURNING id INTO supp4;

        -- Insert Tankers across 6 initial configurable categories:
        -- 1kL, 2kL, 5kL, 10kL, 12kL, 20kL
        INSERT INTO public.tankers 
            (supplier_id, vehicle_number, driver_name, driver_phone, capacity_liters, water_type, base_price, price_per_km, latitude, longitude, heading_degrees)
        VALUES
            -- 1,000 Litres (Compact Quick Emergency Top-up)
            (supp1, 'KA-01-MJ-1001', 'Manjunath Gowda', '+919845110001', 1000, 'Potable (Drinking)', 350.00, 20.00, 12.9730, 77.5960, 45),
            
            -- 2,000 Litres (Small Home & Kitchen)
            (supp2, 'KA-03-FA-2002', 'Ravi Shankar', '+919845120002', 2000, 'Potable (Drinking)', 480.00, 22.00, 12.9680, 77.6020, 120),
            
            -- 5,000 Litres (Standard Independent House)
            (supp1, 'KA-04-TC-5001', 'Basavaraj Patil', '+919845150001', 5000, 'Potable (Drinking)', 750.00, 25.00, 12.9780, 77.6100, 90),
            (supp3, 'KA-05-TC-5002', 'Suresh Kumar', '+919845150002', 5000, 'Filtered Borewell', 650.00, 22.00, 12.9600, 77.5850, 210),

            -- 10,000 Litres (Residential Society Sump)
            (supp2, 'KA-51-TN-1001', 'Kiran Reddy', '+919845110010', 10000, 'Potable (Drinking)', 1200.00, 30.00, 12.9850, 77.6200, 310),
            (supp4, 'KA-53-TN-1002', 'Venkatesh Rao', '+919845110020', 10000, 'Filtered Borewell', 1050.00, 28.00, 12.9550, 77.6250, 180),

            -- 12,000 Litres (Apartment Blocks & Commercial)
            (supp3, 'KA-01-EQ-1201', 'Anand Swamy', '+919845112001', 12000, 'Potable (Drinking)', 1450.00, 35.00, 12.9900, 77.5800, 15),

            -- 20,000 Litres (Mega Society Bulk Reservoir)
            (supp4, 'KA-04-HV-2001', 'Mohan Das', '+919845120001', 20000, 'Potable (Drinking)', 2200.00, 45.00, 12.9450, 77.6100, 270),
            (supp2, 'KA-51-HV-2002', 'Dhananjay Singh', '+919845120002', 20000, 'Commercial Tank', 1950.00, 40.00, 13.0020, 77.6050, 80);
    END IF;
END $$;

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

-- ==============================================================================
-- TANKR DATABASE MIGRATION: Supplier & Driver Roles, Registration & Dashboards
-- ==============================================================================

-- 1. Supplier Registrations Table
CREATE TABLE IF NOT EXISTS public.supplier_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    business_address TEXT NOT NULL,
    operating_areas TEXT[] NOT NULL DEFAULT '{"Whitefield", "Bellandur", "Indiranagar", "Koramangala"}',
    gst_number TEXT,
    tanker_count INT NOT NULL DEFAULT 1,
    approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Driver Profiles Table
CREATE TABLE IF NOT EXISTS public.driver_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    assigned_tanker_id UUID REFERENCES public.tankers(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    license_number TEXT NOT NULL,
    is_on_duty BOOLEAN NOT NULL DEFAULT TRUE,
    approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Row Level Security
ALTER TABLE public.supplier_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can view own registration"
    ON public.supplier_registrations FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Drivers can view own profile"
    ON public.driver_profiles FOR SELECT
    USING (auth.uid() = profile_id);

-- 4. Supplier Booking Acceptance RPC
CREATE OR REPLACE FUNCTION supplier_accept_booking(
    p_booking_id UUID,
    p_supplier_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.bookings
    SET status = 'accepted'::booking_status,
        updated_at = NOW()
    WHERE id = p_booking_id
      AND supplier_id = p_supplier_id
      AND status = 'pending'::booking_status;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking is no longer available or already accepted';
    END IF;

    RETURN TRUE;
END;
$$;

-- 5. Driver Update Delivery Status & PIN Verification RPC
CREATE OR REPLACE FUNCTION driver_update_delivery_status(
    p_booking_id UUID,
    p_new_status TEXT,
    p_delivery_pin TEXT DEFAULT NULL
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

    -- Require PIN match when completing delivery
    IF p_new_status = 'delivered' THEN
        IF p_delivery_pin IS NULL OR v_b.delivery_pin != p_delivery_pin THEN
            RAISE EXCEPTION 'Invalid Delivery PIN. Please ask customer for their 4-digit code.';
        END IF;

        UPDATE public.bookings
        SET status = 'delivered'::booking_status,
            payment_status = 'paid',
            updated_at = NOW()
        WHERE id = p_booking_id;

        -- Free up tanker
        UPDATE public.tankers
        SET is_available = TRUE
        WHERE id = v_b.tanker_id;

        -- Increment deliveries count
        UPDATE public.suppliers
        SET total_deliveries = total_deliveries + 1
        WHERE id = v_b.supplier_id;

        RETURN TRUE;
    END IF;

    -- Normal status progression: en_route, arrived, delivering
    UPDATE public.bookings
    SET status = p_new_status::booking_status,
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN TRUE;
END;
$$;

-- ==============================================================================
-- TANKR DATABASE MIGRATION: Supabase Realtime & Server-Side GPS Validation
-- ==============================================================================

-- 1. Tracking Breadcrumbs Table
CREATE TABLE IF NOT EXISTS public.tracking_breadcrumbs (
    id BIGSERIAL PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION NOT NULL DEFAULT 0,
    speed_kmh DOUBLE PRECISION DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy route history queries
CREATE INDEX IF NOT EXISTS idx_tracking_breadcrumbs_booking_time 
    ON public.tracking_breadcrumbs (booking_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.tracking_breadcrumbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized booking participants can read breadcrumbs"
    ON public.tracking_breadcrumbs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id
              AND (b.customer_id = auth.uid() OR auth.uid() IN (
                  SELECT profile_id FROM public.driver_profiles WHERE assigned_tanker_id = b.tanker_id
              ))
        )
    );

-- 2. Server-Side GPS Sanity Check & Validation RPC
CREATE OR REPLACE FUNCTION record_driver_location_ping(
    p_booking_id UUID,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_heading DOUBLE PRECISION DEFAULT 0,
    p_speed_kmh DOUBLE PRECISION DEFAULT 0
)
RETURNS TABLE (
    valid BOOLEAN,
    distance_remaining_km NUMERIC(5,2),
    eta_minutes INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_booking RECORD;
    v_dist_km NUMERIC(5,2);
    v_eta INT;
BEGIN
    -- Verify booking is active and in transit
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.status NOT IN ('accepted', 'driver_assigned', 'en_route', 'arrived', 'delivering') THEN
        -- Only track active deliveries
        RETURN QUERY SELECT FALSE, 0.0::numeric(5,2), 0;
        RETURN;
    END IF;

    -- Speed sanity check (anti-spoofing): reject realistic speeds exceeding 120 km/h
    IF p_speed_kmh > 120 THEN
        RETURN QUERY SELECT FALSE, 0.0::numeric(5,2), 0;
        RETURN;
    END IF;

    -- Compute updated remaining road distance
    v_dist_km := ROUND(((ST_Distance(
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        v_booking.delivery_coordinates
    ) * 1.25) / 1000.0)::numeric, 2);

    -- Compute updated ETA
    v_eta := GREATEST(1, ROUND(v_dist_km * 3.3)::int);

    -- Record breadcrumb (short-term retention)
    INSERT INTO public.tracking_breadcrumbs (
        booking_id, latitude, longitude, heading, speed_kmh
    )
    VALUES (
        p_booking_id, p_lat, p_lng, p_heading, p_speed_kmh
    );

    -- Update active tanker coordinate
    UPDATE public.tankers
    SET latitude = p_lat,
        longitude = p_lng,
        heading_degrees = p_heading,
        last_ping_at = NOW()
    WHERE id = v_booking.tanker_id;

    RETURN QUERY
    SELECT TRUE, v_dist_km, v_eta;
END;
$$;

-- ==============================================================================
-- TANKR DATABASE MIGRATION: Payments, Invoices & Notification Triggers
-- ==============================================================================

-- 1. Payments Table with Idempotency Protection
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    gateway_order_id TEXT NOT NULL,
    gateway_payment_id TEXT,
    gateway_signature TEXT,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    method TEXT NOT NULL DEFAULT 'upi',
    status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Official Tax Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    supplier_gstin TEXT NOT NULL DEFAULT '29AABCS1429B1Z8',
    vehicle_number TEXT NOT NULL,
    capacity_liters INT NOT NULL,
    delivery_address TEXT NOT NULL,
    base_amount NUMERIC(10,2) NOT NULL,
    delivery_charge NUMERIC(10,2) NOT NULL,
    surcharge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'PAID',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (auth.uid() = customer_id);

CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- 4. Server-Side Invoice Generation RPC: generate_invoice_for_booking
CREATE OR REPLACE FUNCTION generate_invoice_for_booking(p_booking_id UUID)
RETURNS TABLE (
    invoice_id UUID,
    invoice_number TEXT,
    total_amount NUMERIC(10,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_b RECORD;
    v_inv_ref TEXT;
    v_inv_id UUID;
    v_cust_name TEXT;
    v_cust_phone TEXT;
BEGIN
    SELECT 
        b.*, s.business_name AS supplier_business_name,
        p.full_name AS profile_name, p.phone_number AS profile_phone
    INTO v_b
    FROM public.bookings b
    JOIN public.suppliers s ON s.id = b.supplier_id
    JOIN public.profiles p ON p.id = b.customer_id
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    v_inv_ref := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::text, 5, '0');
    v_cust_name := COALESCE(v_b.profile_name, 'Valued Customer');
    v_cust_phone := COALESCE(v_b.profile_phone, '+919876543210');

    INSERT INTO public.invoices (
        booking_id,
        invoice_number,
        customer_id,
        customer_name,
        customer_phone,
        supplier_name,
        vehicle_number,
        capacity_liters,
        delivery_address,
        base_amount,
        delivery_charge,
        surcharge,
        tax_amount,
        total_amount,
        payment_method,
        payment_status
    )
    VALUES (
        p_booking_id,
        v_inv_ref,
        v_b.customer_id,
        v_cust_name,
        v_cust_phone,
        v_b.supplier_business_name,
        COALESCE(v_b.vehicle_number, 'KA-04-TC-5001'),
        v_b.capacity_liters,
        v_b.delivery_address,
        v_b.base_price,
        v_b.delivery_charge,
        v_b.surcharge,
        v_b.tax_amount,
        v_b.final_payable_amount,
        v_b.payment_preference::text,
        'PAID'
    )
    RETURNING id INTO v_inv_id;

    -- Add delivery completed notification
    INSERT INTO public.notifications (user_id, title, body, booking_id, type)
    VALUES (
        v_b.customer_id,
        'Water Delivery Completed! 💧',
        'Your invoice ' || v_inv_ref || ' for ₹' || v_b.final_payable_amount || ' is available for download.',
        p_booking_id,
        'delivery_completed'
    );

    RETURN QUERY
    SELECT v_inv_id, v_inv_ref, v_b.final_payable_amount;
END;
$$;

-- ==============================================================================
-- TANKR DATABASE MIGRATION: Admin Analytics, KYC Verification & Platform Settings
-- ==============================================================================

-- 1. Platform Settings & Pricing Overrides Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial default platform settings
INSERT INTO public.platform_settings (key, value)
VALUES 
    ('pricing_defaults', '{"base_rate_per_kl": 150, "commission_percentage": 10, "surge_multiplier": 1.0, "emergency_mode": false}'::jsonb),
    ('compliance_rules', '{"require_gstin": true, "require_water_test_certificate": true, "max_tanker_age_years": 15}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Disputes & Customer Support Escalations
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'refunded', 'resolved', 'dismissed')),
    refund_amount NUMERIC(10,2) DEFAULT 0.00,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read platform_settings"
    ON public.platform_settings FOR SELECT
    USING (TRUE);

CREATE POLICY "Admin manage disputes"
    ON public.disputes FOR ALL
    USING (TRUE);

-- 3. Executive KPI Metrics RPC: get_admin_dashboard_metrics
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

-- 4. Supplier Verification Admin RPC
CREATE OR REPLACE FUNCTION admin_verify_supplier(
    p_supplier_id UUID,
    p_status TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.suppliers
    SET 
        verification_status = p_status,
        updated_at = NOW()
    WHERE id = p_supplier_id;

    RETURN FOUND;
END;
$$;

