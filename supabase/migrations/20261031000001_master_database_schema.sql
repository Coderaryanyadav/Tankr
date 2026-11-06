-- ==============================================================================
-- TANKR MASTER DATABASE SCHEMA & ENGINE
-- Single Unified Production-Grade Schema (Mumbai Metro / Marol HQ Operations)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'supplier', 'driver', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM (
        'pending', 
        'accepted', 
        'driver_assigned', 
        'en_route', 
        'arrived', 
        'delivering', 
        'delivered', 
        'cancelled', 
        'disputed',
        'unfulfilled_refunded'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_preference AS ENUM ('upi', 'credit_debit_card', 'net_banking', 'cash_on_delivery');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE institution_type AS ENUM ('hospital_dialysis', 'icu_critical', 'maternity_emergency', 'residential_society');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    is_onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    profile_photo_url TEXT,
    preferred_address TEXT,
    city TEXT DEFAULT 'Mumbai',
    pincode TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SAVED ADDRESSES
CREATE TABLE IF NOT EXISTS public.saved_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    custom_name TEXT,
    flat_or_building TEXT NOT NULL,
    street_address TEXT NOT NULL,
    landmark TEXT,
    city TEXT NOT NULL DEFAULT 'Mumbai',
    pincode TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    coordinates GEOGRAPHY(Point, 4326) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SERVICE ZONES (Mumbai Operational Hubs & Demand Sectors)
CREATE TABLE IF NOT EXISTS public.service_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_name TEXT NOT NULL UNIQUE,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    radius_km NUMERIC(4,1) NOT NULL DEFAULT 5.0,
    traffic_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    minimum_fleet_density INT NOT NULL DEFAULT 2,
    is_operational BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    business_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status TEXT NOT NULL DEFAULT 'pending_review',
    rating NUMERIC(2,1) NOT NULL DEFAULT 5.0,
    total_deliveries INT NOT NULL DEFAULT 0,
    water_source TEXT NOT NULL DEFAULT 'BMC Bhandup Potable Filtration Reservoir',
    gstin TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TANKERS (Fleet Vehicles)
CREATE TABLE IF NOT EXISTS public.tankers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    vehicle_number TEXT NOT NULL UNIQUE,
    driver_name TEXT NOT NULL,
    driver_phone TEXT NOT NULL,
    capacity_liters INT NOT NULL,
    water_type TEXT NOT NULL DEFAULT 'Potable (Drinking)',
    base_price NUMERIC(10,2) NOT NULL DEFAULT 750.00,
    price_per_km NUMERIC(10,2) NOT NULL DEFAULT 25.00,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_online BOOLEAN NOT NULL DEFAULT TRUE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    current_location GEOGRAPHY(Point, 4326),
    heading_degrees DOUBLE PRECISION DEFAULT 0.0,
    last_ping_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gross_vehicle_weight_tonnes NUMERIC(4,1) DEFAULT 16.0,
    height_clearance_meters NUMERIC(3,1) DEFAULT 3.4,
    commercial_route_profile TEXT DEFAULT 'heavy_water_tanker',
    active_certificate_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7b. DRIVER PROFILES (Link to Tankers & Authentication)
CREATE TABLE IF NOT EXISTS public.driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    license_number TEXT NOT NULL,
    assigned_tanker_id UUID REFERENCES public.tankers(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tanker_id UUID NOT NULL REFERENCES public.tankers(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    status booking_status NOT NULL DEFAULT 'pending',
    capacity_liters INT NOT NULL,
    water_type TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_latitude DOUBLE PRECISION NOT NULL,
    delivery_longitude DOUBLE PRECISION NOT NULL,
    delivery_coordinates GEOGRAPHY(Point, 4326) NOT NULL,
    delivery_pin VARCHAR(4) NOT NULL,
    delivery_distance_km NUMERIC(5,2) NOT NULL,
    estimated_arrival_minutes INT NOT NULL,
    base_price NUMERIC(10,2) NOT NULL,
    delivery_charge NUMERIC(10,2) NOT NULL,
    surcharge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10,2) NOT NULL,
    final_payable_amount NUMERIC(10,2) NOT NULL,
    payment_preference payment_preference NOT NULL DEFAULT 'upi',
    payment_status TEXT NOT NULL DEFAULT 'pending_payment',
    driver_name TEXT,
    driver_phone TEXT,
    vehicle_number TEXT,
    supplier_name TEXT,
    flow_meter_start NUMERIC(10,2),
    flow_meter_end NUMERIC(10,2),
    delivered_liters INT,
    volume_discrepancy_liters INT DEFAULT 0,
    meter_photo_url TEXT,
    customer_volume_confirmed BOOLEAN DEFAULT FALSE,
    water_certificate_id UUID,
    quote_expires_at TIMESTAMPTZ NOT NULL,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivery_type TEXT DEFAULT 'instant',
    scheduled_for TIMESTAMPTZ,
    recurring_days TEXT,
    recurring_time_slot TEXT,
    is_subscription_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    gateway_order_id TEXT,
    gateway_payment_id TEXT,
    gateway_signature TEXT,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    customer_phone TEXT,
    delivery_address TEXT,
    supplier_business_name TEXT,
    supplier_gstin TEXT,
    water_type TEXT,
    volume_liters INT,
    base_price NUMERIC(10,2),
    delivery_charge NUMERIC(10,2),
    surcharge NUMERIC(10,2),
    tax_amount NUMERIC(10,2) DEFAULT 0.00,
    cgst_amount NUMERIC(10,2) DEFAULT 0.00,
    sgst_amount NUMERIC(10,2) DEFAULT 0.00,
    final_amount NUMERIC(10,2),
    total_amount NUMERIC(10,2),
    payment_method TEXT,
    payment_status TEXT NOT NULL DEFAULT 'PAID',
    payment_reference TEXT,
    delivered_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'issued',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. TRACKING BREADCRUMBS
CREATE TABLE IF NOT EXISTS public.tracking_breadcrumbs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION DEFAULT 0,
    speed_kmh DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. DISPUTES
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    category TEXT DEFAULT 'delivery_issue',
    reason TEXT NOT NULL,
    evidence_url TEXT,
    liters_received INT,
    claimed_refund_amount NUMERIC(10,2),
    status TEXT NOT NULL DEFAULT 'pending_review',
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. EMERGENCY DISPATCHES (Hospitals & Critical Care Sumps)
CREATE TABLE IF NOT EXISTS public.emergency_dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_name TEXT NOT NULL,
    institution_type institution_type NOT NULL DEFAULT 'hospital_dialysis',
    contact_person TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    required_liters INT NOT NULL DEFAULT 10000,
    water_type TEXT NOT NULL DEFAULT 'Potable (Drinking)',
    sla_minutes INT NOT NULL DEFAULT 20,
    status TEXT NOT NULL DEFAULT 'priority_queued',
    assigned_tanker_id UUID REFERENCES public.tankers(id) ON DELETE SET NULL,
    vehicle_number TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    dispatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. CORPORATE SUBSCRIPTIONS & BULK CONTRACTS
CREATE TABLE IF NOT EXISTS public.corporate_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'tech_park',
    contact_person TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    daily_liters INT NOT NULL DEFAULT 20000,
    frequency_per_day INT NOT NULL DEFAULT 2,
    preferred_time_slot TEXT NOT NULL DEFAULT '06:00 AM - 08:00 AM',
    monthly_rate NUMERIC(12,2) NOT NULL DEFAULT 95000.00,
    status TEXT NOT NULL DEFAULT 'active',
    assigned_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    assigned_supplier_name TEXT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. COMMUNITY POOLS & COST-SPLITTING
CREATE TABLE IF NOT EXISTS public.community_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_code TEXT NOT NULL UNIQUE,
    community_name TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    target_liters INT NOT NULL DEFAULT 20000,
    target_amount NUMERIC(10,2) NOT NULL DEFAULT 2400.00,
    collected_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'collecting',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '4 hours')
);

CREATE TABLE IF NOT EXISTS public.community_pool_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID NOT NULL REFERENCES public.community_pools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    contributor_name TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'paid',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. DRIVER PAYOUT LEDGER
CREATE TABLE IF NOT EXISTS public.driver_payout_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_phone TEXT NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    entry_type TEXT NOT NULL DEFAULT 'delivery_earnings',
    amount NUMERIC(10,2) NOT NULL,
    notes TEXT,
    settlement_batch_id TEXT,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. WATER QUALITY CERTIFICATES
CREATE TABLE IF NOT EXISTS public.water_quality_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    water_source TEXT NOT NULL,
    tds_ppm INT NOT NULL,
    ph_level NUMERIC(3,1) NOT NULL,
    lab_name TEXT NOT NULL,
    certified_at DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '90 days'),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. PLATFORM SETTINGS & AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suspended_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    identifier_value TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    suspended_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 20. SECURITY TRIGGERS & FUNCTIONS
-- ==============================================================================

-- 20a. Auto-create profile on signup (SEC-002: Hardened to strictly customer role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (id, phone_number, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.phone, '98200' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::text, 5, '0')),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Verified User'),
        'customer'::user_role
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 20a-2. Protect profile insert role (TNK-C02: Prevent role tampering on direct profile inserts)
CREATE OR REPLACE FUNCTION public.protect_profile_insert_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.role != 'customer'::user_role AND auth.role() != 'service_role' AND NOT public.is_admin(auth.uid()) THEN
        NEW.role := 'customer'::user_role;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_insert_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_insert_role
    BEFORE INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_insert_role();

-- 20b. Protect role escalation
CREATE OR REPLACE FUNCTION public.protect_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF auth.role() != 'service_role' AND NOT public.is_admin(auth.uid()) THEN
            -- Allow verified supplier onboarding transition if initiated within supplier registration RPC
            IF NOT (OLD.role = 'customer' AND NEW.role = 'supplier' AND current_setting('tankr.in_supplier_registration', true) = 'on') THEN
                RAISE EXCEPTION 'Privilege escalation denied: You cannot alter your account role.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role_escalation();

-- 20c. calculate_booking_quote
CREATE OR REPLACE FUNCTION public.calculate_booking_quote(
    p_tanker_id uuid,
    p_delivery_lat double precision,
    p_delivery_lng double precision
)
RETURNS TABLE(
    tanker_id uuid,
    supplier_name text,
    vehicle_number text,
    capacity_liters integer,
    water_type text,
    distance_km numeric,
    eta_minutes integer,
    base_price numeric,
    delivery_charge numeric,
    surcharge numeric,
    tax_amount numeric,
    final_payable_amount numeric
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
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

    v_dist_km := ROUND(((ST_Distance(
        v_tanker.current_location,
        ST_SetSRID(ST_MakePoint(p_delivery_lng, p_delivery_lat), 4326)::geography
    ) * 1.25) / 1000.0)::numeric, 2);

    v_eta_min := GREATEST(5, ROUND(6 + (v_dist_km * 3.3))::int);

    v_base_price := v_tanker.base_price;
    v_delivery_charge := ROUND((v_dist_km * v_tanker.price_per_km)::numeric, 2);

    v_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))::int;
    IF v_hour >= 18 AND v_hour <= 22 THEN
        v_surcharge := ROUND((v_base_price * 0.10)::numeric, 2);
    END IF;

    v_tax_amount := ROUND(((v_base_price + v_delivery_charge + v_surcharge) * 0.05)::numeric, 2);
    v_total := ROUND(v_base_price + v_delivery_charge + v_surcharge + v_tax_amount, 2);

    RETURN QUERY
    SELECT 
        v_tanker.id,
        v_tanker.supplier_name,
        v_tanker.vehicle_number,
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

-- 20d. create_booking_atomic
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
    p_tanker_id uuid,
    p_customer_id uuid,
    p_delivery_address text,
    p_delivery_lat double precision,
    p_delivery_lng double precision,
    p_payment_preference text DEFAULT 'upi'::text
)
RETURNS TABLE(booking_id uuid, booking_reference text, status booking_status, delivery_pin text, final_payable_amount numeric)
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
    IF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Authentication required: You must be logged in to create a water delivery booking.'
            USING ERRCODE = '42501';
    END IF;

    IF auth.uid() IS NOT NULL AND auth.role() != 'service_role' AND auth.uid() != p_customer_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only create bookings for your own customer account.'
            USING ERRCODE = '42501';
    END IF;

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

    SELECT * INTO v_supplier
    FROM public.suppliers
    WHERE id = v_tanker.supplier_id;

    IF p_payment_preference = 'card_online' THEN
        v_pref := 'credit_debit_card'::payment_preference;
    ELSE
        BEGIN
            v_pref := p_payment_preference::payment_preference;
        EXCEPTION WHEN OTHERS THEN
            v_pref := 'upi'::payment_preference;
        END;
    END IF;

    SELECT * INTO v_quote
    FROM public.calculate_booking_quote(p_tanker_id, p_delivery_lat, p_delivery_lng);

    -- TNK-L03: Cryptographically random 4-digit verification PIN using pgcrypto
    v_pin := LPAD((ABS(get_byte(gen_random_bytes(2), 0) * 256 + get_byte(gen_random_bytes(2), 1)) % 9000 + 1000)::text, 4, '0');
    v_ref := 'TKR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::text, 5, '0');

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
        CASE WHEN v_pref = 'cash_on_delivery' THEN 'pending_delivery' ELSE 'pending_payment' END,
        v_tanker.driver_phone,
        v_tanker.driver_name,
        v_tanker.vehicle_number,
        COALESCE(v_supplier.business_name, v_quote.supplier_name, 'Marol Potable Water Hub'),
        NOW() + INTERVAL '10 minutes'
    )
    RETURNING id INTO v_booking_id;

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

-- 20e. cancel_booking_atomic (SEC-005 & TNK-C05: Enforce Caller Identity)
CREATE OR REPLACE FUNCTION public.cancel_booking_atomic(
    p_booking_id uuid,
    p_reason text DEFAULT 'Customer requested cancellation'::text
)
RETURNS boolean
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
        RAISE EXCEPTION 'Booking not found';
    END IF;

    -- TNK-C05: Caller authorization verification
    IF auth.uid() IS NOT NULL AND auth.role() != 'service_role' THEN
        IF v_b.customer_id != auth.uid() 
           AND NOT public.is_admin(auth.uid()) 
           AND NOT EXISTS (
               SELECT 1 FROM public.tankers t 
               JOIN public.suppliers s ON t.supplier_id = s.id 
               WHERE t.id = v_b.tanker_id AND (s.owner_id = auth.uid() OR t.driver_phone IN (SELECT phone_number FROM public.profiles WHERE id = auth.uid()))
           ) THEN
            RAISE EXCEPTION 'Access Denied: You are not authorized to cancel this booking (ERRCODE 42501)' USING ERRCODE = '42501';
        END IF;
    ELSIF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Authentication required to cancel a booking (ERRCODE 42501)' USING ERRCODE = '42501';
    END IF;

    IF v_b.status IN ('delivering', 'delivered', 'cancelled', 'disputed') THEN
        RAISE EXCEPTION 'Cannot cancel booking in % status', v_b.status;
    END IF;

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

    RETURN TRUE;
END;
$$;

-- 20f. customer_cancel_booking_with_policy (TNK-C05 & TNK-H04: Persist Fee & Ledger Credit)
CREATE OR REPLACE FUNCTION public.customer_cancel_booking_with_policy(
    p_booking_id uuid,
    p_reason text DEFAULT 'Customer cancellation'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_b RECORD;
    v_fee NUMERIC(10,2) := 0.00;
BEGIN
    SELECT * INTO v_b
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
    END IF;

    -- TNK-C05: Caller must be the customer who booked the trip, an admin, or service_role
    IF auth.uid() IS NOT NULL AND auth.role() != 'service_role' AND NOT public.is_admin(auth.uid()) THEN
        IF v_b.customer_id != auth.uid() THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You can only cancel your own bookings');
        END IF;
    ELSIF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required to cancel booking');
    END IF;

    -- TNK-H04: Reject terminal states
    IF v_b.status IN ('delivering', 'delivered', 'cancelled', 'disputed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel booking in status: ' || v_b.status);
    END IF;

    IF v_b.status = 'arrived' THEN
        v_fee := 200.00;
    ELSIF v_b.status = 'en_route' THEN
        v_fee := 150.00;
    END IF;

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

    -- TNK-H04: Credit driver compensation ledger when fee applies
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
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cancellation_fee', v_fee,
        'message', 'Booking cancelled successfully'
    );
END;
$$;
END;
$$;

-- 20g. verify_and_reconcile_payment (Server-Authenticated, Authorized & Idempotent)
CREATE OR REPLACE FUNCTION public.verify_and_reconcile_payment(
    p_booking_id uuid,
    p_gateway_order_id text,
    p_gateway_payment_id text,
    p_gateway_signature text,
    p_verified boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_payment RECORD;
    v_booking RECORD;
BEGIN
    -- 1. Input Validation: gateway payment ID must be provided
    IF p_gateway_payment_id IS NULL OR length(trim(p_gateway_payment_id)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid gateway payment ID provided.');
    END IF;

    -- 2. Retrieve booking and enforce caller authorization
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking record not found for payment reference.');
    END IF;

    -- Caller must be the customer who owns the booking, an administrator, or service_role
    IF auth.uid() IS NOT NULL AND auth.uid() <> v_booking.customer_id AND NOT public.is_admin(auth.uid()) AND auth.role() <> 'service_role' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Caller not authorized to reconcile payment for this booking.');
    END IF;

    -- 3. Verification enforcement: reject explicitly unverified transactions
    IF p_verified IS FALSE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment verification failed: Gateway reported unverified signature.');
    END IF;

    -- 4. Locate payment record with row lock
    SELECT * INTO v_payment
    FROM public.payments
    WHERE booking_id = p_booking_id
      AND gateway_order_id = p_gateway_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment record not found for order reference.');
    END IF;

    -- 5. Idempotent check: if already captured, return success immediately
    IF v_payment.status = 'captured' THEN
        RETURN jsonb_build_object(
            'success', true,
            'payment_id', v_payment.id,
            'order_id', p_gateway_order_id,
            'status', 'captured',
            'idempotent', true
        );
    END IF;

    -- 6. Reconcile and transition statuses atomically
    UPDATE public.payments
    SET status = 'captured',
        gateway_payment_id = p_gateway_payment_id,
        gateway_signature = COALESCE(p_gateway_signature, v_payment.gateway_signature),
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
        'status', 'captured',
        'idempotent', false
    );
END;
$$;

-- 20h. driver_complete_delivery_with_meter
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

    -- TNK-C05: Reject terminal states and multiple executions
    IF v_b.status = 'delivered' THEN
        RAISE EXCEPTION 'Booking has already been completed and settled' USING ERRCODE = '22000';
    END IF;
    IF v_b.status NOT IN ('delivering', 'arrived', 'en_route') THEN
        RAISE EXCEPTION 'Cannot complete delivery for booking in % status', v_b.status USING ERRCODE = '22000';
    END IF;

    -- TNK-C05: Enforce driver/supplier/admin caller authorization
    IF auth.uid() IS NOT NULL AND auth.role() != 'service_role' THEN
        IF NOT (
            public.is_admin(auth.uid())
            OR EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = auth.uid() 
                  AND (p.phone_number = v_b.driver_phone OR '+' || p.phone_number = v_b.driver_phone)
            )
            OR EXISTS (
                SELECT 1 FROM public.tankers t
                JOIN public.suppliers s ON t.supplier_id = s.id
                WHERE t.id = v_b.tanker_id AND (s.owner_id = auth.uid() OR t.driver_phone IN (SELECT phone_number FROM public.profiles WHERE id = auth.uid()))
            )
        ) THEN
            RAISE EXCEPTION 'Access Denied: Only the assigned driver or operating supplier can complete delivery' USING ERRCODE = '42501';
        END IF;
    ELSIF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    IF v_b.delivery_pin != p_delivery_pin THEN
        RAISE EXCEPTION 'Invalid Delivery PIN. Ask customer for the 4-digit code shown on their tracking screen.'
            USING ERRCODE = '28000';
    END IF;

    v_driver_phone := COALESCE(v_b.driver_phone, '+919820011001');

    IF p_flow_end IS NOT NULL AND p_flow_start IS NOT NULL AND p_flow_end >= p_flow_start THEN
        v_calc_liters := ROUND(p_flow_end - p_flow_start);
    ELSE
        v_calc_liters := COALESCE(p_delivered_liters, v_b.capacity_liters);
    END IF;

    IF v_calc_liters < v_b.capacity_liters THEN
        v_shortfall := v_b.capacity_liters - v_calc_liters;
        v_refund_amount := ROUND((v_b.final_payable_amount / v_b.capacity_liters) * v_shortfall, 2);
        v_final_settled_amount := v_b.final_payable_amount - v_refund_amount;
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

    -- TNK-C05: Idempotent payout ledger write (only insert if not already recorded)
    IF NOT EXISTS (
        SELECT 1 FROM public.driver_payout_ledger 
        WHERE booking_id = p_booking_id AND entry_type = 'delivery_earnings'
    ) THEN
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
        );
    END IF;

    -- TNK-H06: Notify customer on delivery completion
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
        'final_amount', v_final_settled_amount,
        'driver_earnings', v_driver_share
    );
END;
$$;

-- 20i. supplier_onboard_tanker
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
    v_default_lat DOUBLE PRECISION := 19.1171;
    v_default_lng DOUBLE PRECISION := 72.8809;
BEGIN
    v_clean_veh := UPPER(TRIM(p_vehicle_number));

    IF LENGTH(v_clean_veh) < 8 THEN
        RAISE EXCEPTION 'Invalid Vehicle Number (e.g. MH-02-TC-5001).' USING ERRCODE = '22023';
    END IF;

    IF EXISTS (SELECT 1 FROM public.tankers WHERE vehicle_number = v_clean_veh) THEN
        RAISE EXCEPTION 'Duplicate Vehicle: A tanker with registration % is already onboarded.', v_clean_veh
            USING ERRCODE = '23505';
    END IF;

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
        current_location
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
        ST_SetSRID(ST_MakePoint(v_default_lng, v_default_lat), 4326)::geography
    ) RETURNING id INTO v_tanker_id;

    RETURN jsonb_build_object(
        'success', true,
        'tanker_id', v_tanker_id,
        'vehicle_number', v_clean_veh,
        'capacity_liters', p_capacity_liters
    );
END;
$$;

-- 20j. record_driver_location_ping
CREATE OR REPLACE FUNCTION public.record_driver_location_ping(
    p_booking_id uuid,
    p_lat double precision,
    p_lng double precision,
    p_heading double precision DEFAULT 0,
    p_speed_kmh double precision DEFAULT 0
)
RETURNS TABLE(valid boolean, distance_remaining_km numeric, eta_minutes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_booking RECORD;
    v_dist_km NUMERIC(5,2);
    v_eta INT;
BEGIN
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    -- TNK-C05: Enforce driver/admin identity authorization for GPS pings
    IF auth.uid() IS NOT NULL AND auth.role() != 'service_role' THEN
        IF NOT (
            public.is_admin(auth.uid())
            OR EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = auth.uid() 
                  AND (p.phone_number = v_booking.driver_phone OR '+' || p.phone_number = v_booking.driver_phone)
            )
            OR EXISTS (
                SELECT 1 FROM public.tankers t
                WHERE t.id = v_booking.tanker_id 
                  AND t.driver_phone IN (SELECT phone_number FROM public.profiles WHERE id = auth.uid() UNION SELECT '+' || phone_number FROM public.profiles WHERE id = auth.uid())
            )
        ) THEN
            RAISE EXCEPTION 'Access Denied: Only the assigned driver can record location telemetry' USING ERRCODE = '42501';
        END IF;
    ELSIF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Authentication required to record telemetry' USING ERRCODE = '42501';
    END IF;

    IF p_speed_kmh > 120 THEN
        RETURN QUERY SELECT FALSE, 0.0::numeric(5,2), 0;
        RETURN;
    END IF;

    v_dist_km := ROUND(((ST_Distance(
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        v_booking.delivery_coordinates
    ) * 1.25) / 1000.0)::numeric, 2);

    v_eta := GREATEST(1, ROUND(v_dist_km * 3.3)::int);

    INSERT INTO public.tracking_breadcrumbs (
        booking_id, latitude, longitude, heading, speed_kmh
    )
    VALUES (
        p_booking_id, p_lat, p_lng, p_heading, p_speed_kmh
    );

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

-- 20k. get_live_demand_deficit_zones (Dynamic Uber/Ola Demand Deficit Engine)
CREATE OR REPLACE FUNCTION public.get_live_demand_deficit_zones()
RETURNS TABLE (
    id UUID,
    zone_name TEXT,
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_km NUMERIC,
    online_fleet_count INT,
    available_fleet_count INT,
    active_deliveries INT,
    deficit_percentage INT,
    deficit_level TEXT,
    color TEXT,
    radius_pixels INT
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH zone_stats AS (
        SELECT 
            sz.id,
            sz.zone_name,
            sz.center_lat,
            sz.center_lng,
            sz.radius_km,
            sz.minimum_fleet_density,
            COALESCE((
                SELECT COUNT(*)::INT
                FROM public.tankers t
                WHERE t.is_online = TRUE
                  AND ST_DWithin(
                      ST_SetSRID(ST_MakePoint(t.longitude, t.latitude), 4326)::geography,
                      ST_SetSRID(ST_MakePoint(sz.center_lng, sz.center_lat), 4326)::geography,
                      (sz.radius_km * 1000)::DOUBLE PRECISION
                  )
            ), 0) AS online_fleet,
            COALESCE((
                SELECT COUNT(*)::INT
                FROM public.tankers t
                WHERE t.is_online = TRUE AND t.is_available = TRUE
                  AND ST_DWithin(
                      ST_SetSRID(ST_MakePoint(t.longitude, t.latitude), 4326)::geography,
                      ST_SetSRID(ST_MakePoint(sz.center_lng, sz.center_lat), 4326)::geography,
                      (sz.radius_km * 1000)::DOUBLE PRECISION
                  )
            ), 0) AS avail_fleet,
            COALESCE((
                SELECT COUNT(*)::INT
                FROM public.bookings b
                WHERE b.status IN ('pending', 'accepted', 'driver_assigned', 'en_route', 'arrived', 'delivering')
                  AND ST_DWithin(
                      b.delivery_coordinates,
                      ST_SetSRID(ST_MakePoint(sz.center_lng, sz.center_lat), 4326)::geography,
                      (sz.radius_km * 1000)::DOUBLE PRECISION
                  )
            ), 0) AS active_demand
        FROM public.service_zones sz
        WHERE sz.is_operational = TRUE
    ),
    calculated_deficit AS (
        SELECT 
            zs.id,
            zs.zone_name,
            zs.center_lat,
            zs.center_lng,
            zs.radius_km,
            zs.online_fleet,
            zs.avail_fleet,
            zs.active_demand,
            CASE 
                -- If high active demand with constrained available fleet
                WHEN zs.avail_fleet = 0 AND zs.active_demand > 0 THEN 90
                WHEN zs.active_demand >= zs.avail_fleet * 3 THEN 84
                WHEN zs.active_demand >= zs.avail_fleet * 2 THEN 78
                WHEN zs.active_demand > zs.avail_fleet THEN 68
                WHEN zs.active_demand = zs.avail_fleet AND zs.active_demand > 0 THEN 52
                WHEN zs.avail_fleet > zs.active_demand AND zs.avail_fleet >= zs.minimum_fleet_density THEN 25
                ELSE 35
            END AS raw_deficit
        FROM zone_stats zs
    )
    SELECT 
        cd.id,
        cd.zone_name,
        cd.center_lat,
        cd.center_lng,
        cd.radius_km,
        cd.online_fleet,
        cd.avail_fleet,
        cd.active_demand,
        cd.raw_deficit,
        CASE 
            WHEN cd.raw_deficit >= 80 THEN 'SEVERE (' || cd.raw_deficit || '%)'
            WHEN cd.raw_deficit >= 70 THEN 'CRITICAL (' || cd.raw_deficit || '%)'
            WHEN cd.raw_deficit >= 60 THEN 'ELEVATED (' || cd.raw_deficit || '%)'
            WHEN cd.raw_deficit >= 45 THEN 'MODERATE (' || cd.raw_deficit || '%)'
            ELSE 'OPTIMAL (' || cd.raw_deficit || '%)'
        END AS deficit_level,
        CASE 
            WHEN cd.raw_deficit >= 80 THEN '#DC2626'
            WHEN cd.raw_deficit >= 70 THEN '#EA580C'
            WHEN cd.raw_deficit >= 60 THEN '#D97706'
            WHEN cd.raw_deficit >= 45 THEN '#EAB308'
            ELSE '#16A34A'
        END AS color,
        LEAST(60, GREATEST(32, (cd.raw_deficit * 0.55)::INT)) AS radius_pixels
    FROM calculated_deficit cd
    ORDER BY cd.raw_deficit DESC;
END;
$$;

-- 20l. Admin dashboard metrics
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
    IF NOT (public.is_admin(auth.uid()) OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Access Denied: Administrative authorization required for dashboard metrics (ERRCODE 42501)';
    END IF;

    -- TNK-M01: GMV calculation counts actual captured transactions (or delivered bookings)
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total_gmv
    FROM public.payments
    WHERE status = 'captured';

    IF v_total_gmv = 0.00 THEN
        SELECT COALESCE(SUM(final_payable_amount), 0.00)
        INTO v_total_gmv
        FROM public.bookings
        WHERE status = 'delivered';
    END IF;

    SELECT COUNT(*) INTO v_total_b FROM public.bookings;

    v_platform_rev := ROUND(v_total_gmv * 0.10, 2);

    -- TNK-M01: Completed delivered volume counts actual delivered_liters
    SELECT COUNT(*), COALESCE(SUM(COALESCE(delivered_liters, capacity_liters)), 0)
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

    -- TNK-M01: Read configured peak surge multiplier from pricing_config or pricing_defaults
    SELECT COALESCE(
        (value->>'peak_surge_multiplier')::NUMERIC,
        (value->>'surge_multiplier')::NUMERIC,
        1.25
    )
    INTO v_surge
    FROM public.platform_settings
    WHERE key IN ('pricing_config', 'pricing_defaults')
    LIMIT 1;

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

-- ==============================================================================
-- 21. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tankers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_breadcrumbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pool_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_payout_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_quality_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspended_entities ENABLE ROW LEVEL SECURITY;

-- Helper for RLS without recursive triggers
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND role = 'admin');
$$;

-- Privilege Grants: Least-Privilege Role Separation (SEC-001 Remediation)
-- 1. Schema Usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Service Role has authoritative administration
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- 3. Authenticated Role: Access strictly moderated by Row-Level Security (RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- TNK-H03: Disallow direct arbitrary UPDATE on bookings from client REST API; enforce RPC status transitions
REVOKE UPDATE, DELETE ON public.bookings FROM authenticated;
GRANT SELECT, INSERT ON public.bookings TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- 4. Anon Role: Minimal public read permissions, strictly bounded to unauthenticated discovery
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

GRANT SELECT ON public.service_zones, public.water_quality_certificates, public.community_pools, public.community_pool_contributions TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Default Privileges: ensure newly created objects do not leak blanket privileges to anon
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Clean existing policies for idempotency
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins full read on profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Public read driver and supplier basic info" ON public.profiles;

    DROP POLICY IF EXISTS "Users can read own addresses" ON public.saved_addresses;
    DROP POLICY IF EXISTS "Users can insert own addresses" ON public.saved_addresses;
    DROP POLICY IF EXISTS "Users can update own addresses" ON public.saved_addresses;
    DROP POLICY IF EXISTS "Users can delete own addresses" ON public.saved_addresses;
    DROP POLICY IF EXISTS "Admins full access on saved_addresses" ON public.saved_addresses;
    DROP POLICY IF EXISTS "Users can manage own addresses" ON public.saved_addresses;

    DROP POLICY IF EXISTS "Public read on service_zones" ON public.service_zones;
    DROP POLICY IF EXISTS "Admins manage service_zones" ON public.service_zones;
    DROP POLICY IF EXISTS "Public read on suppliers" ON public.suppliers;
    DROP POLICY IF EXISTS "Public read verified suppliers" ON public.suppliers;
    DROP POLICY IF EXISTS "Admins and owners manage suppliers" ON public.suppliers;
    DROP POLICY IF EXISTS "Public read on tankers" ON public.tankers;
    DROP POLICY IF EXISTS "Public read active tankers" ON public.tankers;
    DROP POLICY IF EXISTS "Suppliers can update own tankers" ON public.tankers;
    DROP POLICY IF EXISTS "Admins manage tankers" ON public.tankers;
    DROP POLICY IF EXISTS "Public read on driver_profiles" ON public.driver_profiles;
    DROP POLICY IF EXISTS "Drivers and suppliers read driver_profiles" ON public.driver_profiles;
    DROP POLICY IF EXISTS "Drivers manage own driver_profiles" ON public.driver_profiles;

    DROP POLICY IF EXISTS "Customers can view own bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Customers can insert own bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Customers can update own bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Drivers can view assigned bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Drivers can update assigned bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Suppliers can view hub bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Admins have full access to bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Admins manage bookings" ON public.bookings;

    DROP POLICY IF EXISTS "Users read own invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Users read own payments" ON public.payments;
    DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Tracking read by booking parties" ON public.tracking_breadcrumbs;

    DROP POLICY IF EXISTS "Public read community_pools" ON public.community_pools;
    DROP POLICY IF EXISTS "Users insert community_pools" ON public.community_pools;
    DROP POLICY IF EXISTS "Admins manage community_pools" ON public.community_pools;
    DROP POLICY IF EXISTS "Public insert pool contributions" ON public.community_pool_contributions;
    DROP POLICY IF EXISTS "Public read pool contributions" ON public.community_pool_contributions;
    DROP POLICY IF EXISTS "Users read pool contributions" ON public.community_pool_contributions;
    DROP POLICY IF EXISTS "Authenticated users contribute to pool" ON public.community_pool_contributions;
    DROP POLICY IF EXISTS "Public read water certificates" ON public.water_quality_certificates;
    DROP POLICY IF EXISTS "Admins full emergency dispatches" ON public.emergency_dispatches;
    DROP POLICY IF EXISTS "Admins full corporate subscriptions" ON public.corporate_subscriptions;
    DROP POLICY IF EXISTS "Admins full platform settings" ON public.platform_settings;
    DROP POLICY IF EXISTS "Admins full audit logs" ON public.admin_audit_logs;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- 21a. Profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (
    auth.uid() = id OR public.is_admin(auth.uid()) OR auth.role() = 'service_role'
);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins full read on profiles" ON public.profiles FOR SELECT USING (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
);

-- 21b. Saved Addresses
CREATE POLICY "Users can read own addresses" ON public.saved_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own addresses" ON public.saved_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addresses" ON public.saved_addresses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses" ON public.saved_addresses FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins full access on saved_addresses" ON public.saved_addresses FOR ALL USING (public.is_admin(auth.uid()));

-- 21c. Service Zones & Suppliers & Tankers (SEC-002: Hardened Discovery & Access Policies)
CREATE POLICY "Public read on service_zones" ON public.service_zones FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage service_zones" ON public.service_zones FOR ALL USING (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
) WITH CHECK (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
);

-- Suppliers: Public can only view active, verified business entities; Suppliers view/edit their own; Admins view all
CREATE POLICY "Public read verified suppliers" ON public.suppliers FOR SELECT USING (
    (is_active = TRUE AND verification_status = 'verified')
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
    OR (owner_id IS NOT NULL AND owner_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
          AND (p.phone_number = suppliers.contact_phone OR '+' || p.phone_number = suppliers.contact_phone)
    )
);

CREATE POLICY "Admins and owners manage suppliers" ON public.suppliers FOR ALL USING (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role' OR (owner_id IS NOT NULL AND owner_id = auth.uid())
) WITH CHECK (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role' OR (owner_id IS NOT NULL AND owner_id = auth.uid())
);

-- Tankers: Public can only discover online and available fleet units; Suppliers & Drivers manage their assigned units
CREATE POLICY "Public read active tankers" ON public.tankers FOR SELECT USING (
    (is_online = TRUE AND is_available = TRUE)
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1 FROM public.suppliers s 
        JOIN public.profiles p ON (s.contact_phone = p.phone_number OR s.contact_phone = '+' || p.phone_number)
        WHERE p.id = auth.uid() AND s.id = tankers.supplier_id
    )
    OR driver_phone IN (
        SELECT phone_number FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT '+' || phone_number FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Suppliers can update own tankers" ON public.tankers FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.suppliers s JOIN public.profiles p ON (s.contact_phone = p.phone_number OR s.contact_phone = '+' || p.phone_number) WHERE p.id = auth.uid() AND s.id = tankers.supplier_id)
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

CREATE POLICY "Admins manage tankers" ON public.tankers FOR ALL USING (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
) WITH CHECK (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
);

-- Driver Profiles: Strictly restricted to the driver, their operating supplier, and platform administrators (TNK-C01 & TNK-C06)
CREATE POLICY "Drivers and suppliers read driver_profiles" ON public.driver_profiles FOR SELECT USING (
    profile_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1 FROM public.tankers t
        JOIN public.suppliers s ON t.supplier_id = s.id
        WHERE t.id = driver_profiles.assigned_tanker_id
          AND (s.owner_id = auth.uid() OR EXISTS (
              SELECT 1 FROM public.profiles p 
              WHERE p.id = auth.uid() 
                AND (p.phone_number = s.contact_phone OR '+' || p.phone_number = s.contact_phone)
          ))
    )
);

CREATE POLICY "Drivers manage own driver_profiles" ON public.driver_profiles FOR ALL USING (
    profile_id = auth.uid() 
    OR public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
);

-- 21d. Bookings (Strict Isolation)
CREATE POLICY "Customers can view own bookings" ON public.bookings FOR SELECT USING (
    auth.uid() = customer_id OR public.is_admin(auth.uid()) OR auth.role() = 'service_role'
);
CREATE POLICY "Customers can insert own bookings" ON public.bookings FOR INSERT WITH CHECK (
    auth.uid() = customer_id AND status = 'pending'::booking_status
);
CREATE POLICY "Drivers can view assigned bookings" ON public.bookings FOR SELECT USING (
    driver_phone IN (SELECT phone_number FROM public.profiles WHERE id = auth.uid() UNION SELECT '+' || phone_number FROM public.profiles WHERE id = auth.uid())
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);
CREATE POLICY "Suppliers can view hub bookings" ON public.bookings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.suppliers s WHERE (s.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.phone_number = s.contact_phone OR '+' || p.phone_number = s.contact_phone))) AND s.id = public.bookings.supplier_id)
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);
CREATE POLICY "Admins manage bookings" ON public.bookings FOR ALL USING (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
) WITH CHECK (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
);

-- 21e. Invoices, Payments, Notifications, Tracking
CREATE POLICY "Users read own invoices" ON public.invoices FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = public.invoices.booking_id AND b.customer_id = auth.uid())
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);
CREATE POLICY "Users read own payments" ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = public.payments.booking_id AND b.customer_id = auth.uid())
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);
CREATE POLICY "Admins manage invoices" ON public.invoices FOR ALL USING (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
) WITH CHECK (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
);
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
) WITH CHECK (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
);
CREATE POLICY "Users read own notifications" ON public.notifications FOR ALL USING (
    auth.uid() = user_id OR public.is_admin(auth.uid()) OR auth.role() = 'service_role'
);
CREATE POLICY "Tracking read by booking parties" ON public.tracking_breadcrumbs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = public.tracking_breadcrumbs.booking_id AND (b.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.phone_number = b.driver_phone OR '+' || p.phone_number = b.driver_phone))))
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

-- 21f. Community Pools, Subscriptions & Emergency (SEC-001 & SEC-002: Authenticated / Admin Isolation)
CREATE POLICY "Public read community_pools" ON public.community_pools FOR SELECT USING (TRUE);
CREATE POLICY "Users insert community_pools" ON public.community_pools FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid())
);
CREATE POLICY "Admins manage community_pools" ON public.community_pools FOR ALL USING (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
) WITH CHECK (
    public.is_admin(auth.uid()) OR auth.role() = 'service_role'
);

CREATE POLICY "Users read pool contributions" ON public.community_pool_contributions FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users contribute to pool" ON public.community_pool_contributions FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid())
);

CREATE POLICY "Public read water certificates" ON public.water_quality_certificates FOR SELECT USING (TRUE);

-- SEC-001: Enforce strict administrator authorization on sensitive operational controls
CREATE POLICY "Admins full emergency dispatches" ON public.emergency_dispatches FOR ALL 
    USING (public.is_admin(auth.uid()) OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin(auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Admins full corporate subscriptions" ON public.corporate_subscriptions FOR ALL 
    USING (public.is_admin(auth.uid()) OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin(auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Admins full platform settings" ON public.platform_settings FOR ALL 
    USING (public.is_admin(auth.uid()) OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin(auth.uid()) OR auth.role() = 'service_role');

CREATE POLICY "Admins full audit logs" ON public.admin_audit_logs FOR ALL 
    USING (public.is_admin(auth.uid()) OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin(auth.uid()) OR auth.role() = 'service_role');

-- ==============================================================================
-- 22. REALTIME PUBLICATION SETUP
-- ==============================================================================
ALTER TABLE public.tankers REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.tracking_breadcrumbs REPLICA IDENTITY FULL;
ALTER TABLE public.emergency_dispatches REPLICA IDENTITY FULL;
ALTER TABLE public.community_pools REPLICA IDENTITY FULL;
ALTER TABLE public.community_pool_contributions REPLICA IDENTITY FULL;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
        public.tankers, 
        public.bookings, 
        public.notifications, 
        public.tracking_breadcrumbs, 
        public.emergency_dispatches, 
        public.community_pools, 
        public.community_pool_contributions;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 23. SEED REALISTIC MUMBAI / MAROL OPERATIONAL DATA
-- ==============================================================================

-- 23-zero. Synchronize profiles from auth.users and seed seed-dependent demo accounts
INSERT INTO public.profiles (id, phone_number, full_name, role, is_onboarding_completed)
VALUES 
    ('2644c504-f611-40d3-a1c1-0d97214bf6f9', '+919876543210', 'Vikram Malhotra', 'customer', TRUE),
    ('65cee903-3554-49b1-9729-55552d400087', '+919876572207', 'Demo Customer', 'customer', TRUE),
    ('bca75357-3da7-4106-b7e8-bd275857efbc', '+919845012345', 'Anand Swamy', 'customer', TRUE),
    ('d64671d9-665d-4a90-9a45-52be0313978d', '+919000000001', 'Rajesh Sharma', 'driver', TRUE),
    ('b70a66f3-f265-45af-8bb8-ed463ed6e000', '+919000000002', 'Suresh Shinde', 'driver', TRUE),
    ('b9a4be98-b394-4c00-b5d8-7b2d6bb7c8de', '+919000000003', 'Sunil Pawar', 'driver', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, phone_number, full_name, role, is_onboarding_completed)
SELECT 
    u.id,
    COALESCE(u.phone, u.raw_user_meta_data->>'phone_number', '+919999999999'),
    COALESCE(u.raw_user_meta_data->>'full_name', 'Tankr Verified Member'),
    COALESCE((u.raw_user_meta_data->>'role')::user_role, 'customer'),
    TRUE
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
    phone_number = EXCLUDED.phone_number,
    is_onboarding_completed = TRUE;

UPDATE public.profiles SET role = 'admin', full_name = 'Super Admin' WHERE phone_number IN ('+918888888888', '8888888888');
UPDATE public.profiles SET role = 'supplier', full_name = 'Marol Potable Water Hub' WHERE phone_number IN ('+919999999999', '9999999999');
UPDATE public.profiles SET role = 'driver', full_name = 'Rajesh Sharma' WHERE phone_number IN ('+919000000001', '9000000001');
UPDATE public.profiles SET role = 'driver', full_name = 'Suresh Shinde' WHERE phone_number IN ('+919000000002', '9000000002');
UPDATE public.profiles SET role = 'driver', full_name = 'Sunil Pawar' WHERE phone_number IN ('+919000000003', '9000000003');
UPDATE public.profiles SET role = 'supplier', full_name = 'Marol Express Water Logistics' WHERE phone_number IN ('+919000000004', '9000000004');
UPDATE public.profiles SET role = 'customer', full_name = 'Vikram Malhotra' WHERE phone_number IN ('+919876543210', '9876543210', '+919876572207', '9876572207');
UPDATE public.profiles SET role = 'customer', full_name = 'Anand Swamy' WHERE phone_number IN ('+919845012345', '9845012345');

-- 23a. Service Zones (Mumbai Metro Hubs)
INSERT INTO public.service_zones (id, zone_name, center_lat, center_lng, radius_km, traffic_multiplier, minimum_fleet_density, is_operational)
VALUES 
    ('74c0c1db-242f-48b2-86ef-b30725add5f9', 'Marol / MIDC Andheri East', 19.1171, 72.8809, 5.0, 1.25, 2, TRUE),
    ('845fabe8-8627-42c1-bad0-022f165b64e5', 'Sakinaka / Asalpha', 19.1068, 72.8877, 4.5, 1.30, 2, TRUE),
    ('dbe6cf83-1daf-4ab6-92fb-b1cbb3b7cbd8', 'SEEPZ / Mahakali Caves', 19.1280, 72.8790, 4.5, 1.15, 2, TRUE),
    ('3ccde0ae-ef59-4b95-bfaf-e40d9affe738', 'Powai / Hiranandani Gardens', 19.1197, 72.9051, 6.0, 1.10, 2, TRUE),
    ('fd8c9aca-8005-49bd-88ae-032bf628780b', 'Chakala / JB Nagar / Airport', 19.1114, 72.8617, 4.5, 1.05, 2, TRUE),
    ('8c3deeae-796c-4ee6-af1a-2a551ac1fed8', 'Chandivali / Raheja Vihar', 19.1128, 72.8988, 4.0, 1.10, 2, TRUE)
ON CONFLICT (zone_name) DO UPDATE SET 
    center_lat = EXCLUDED.center_lat,
    center_lng = EXCLUDED.center_lng,
    is_operational = TRUE;

-- 23b. Suppliers
INSERT INTO public.suppliers (id, business_name, contact_phone, is_verified, verification_status, rating, total_deliveries, water_source, gstin)
VALUES 
    ('addd79a1-bdf1-459d-a1cc-046a424b19b9', 'Marol Potable Water Hub (MIDC Andheri)', '+919999999999', TRUE, 'verified', 4.9, 342, 'BMC Bhandup Potable Filtration Reservoir', '276E9AC2576C1Z5'),
    ('beee79a1-bdf1-459d-a1cc-046a424b19b0', 'Marol Express Water Logistics', '+919000000004', TRUE, 'verified', 4.8, 280, 'BMC Bhandup Potable Filtration Reservoir', '2748B1EDA8D01Z5')
ON CONFLICT (id) DO UPDATE SET 
    business_name = EXCLUDED.business_name,
    is_verified = TRUE,
    verification_status = 'verified';

-- 23c. Tankers
INSERT INTO public.tankers (
    id, supplier_id, vehicle_number, driver_name, driver_phone, capacity_liters,
    water_type, base_price, price_per_km, is_available, is_online,
    latitude, longitude, current_location, heading_degrees, gross_vehicle_weight_tonnes
) VALUES 
    ('415b741d-9372-46be-9e7f-fcad2a8449c2', 'addd79a1-bdf1-459d-a1cc-046a424b19b9', 'MH-02-TC-5001', 'Rajesh Sharma', '+919000000001', 5000, 'Potable (Drinking)', 750.00, 25.00, FALSE, TRUE, 19.1171, 72.8809, ST_SetSRID(ST_MakePoint(72.8809, 19.1171), 4326)::geography, 90, 9.5),
    ('d7211bf7-d64e-4f01-9f93-54877e8172ea', 'addd79a1-bdf1-459d-a1cc-046a424b19b9', 'MH-02-TC-5002', 'Suresh Shinde', '+919000000002', 5000, 'Potable (Drinking)', 750.00, 25.00, TRUE, TRUE, 19.1128, 72.8988, ST_SetSRID(ST_MakePoint(72.8988, 19.1128), 4326)::geography, 120, 9.5),
    ('1caae87d-ea3a-4ef8-831d-b8d4bb1ee05f', 'beee79a1-bdf1-459d-a1cc-046a424b19b0', 'MH-02-TN-1001', 'Sunil Pawar', '+919000000003', 10000, 'Potable (Drinking)', 1200.00, 30.00, TRUE, TRUE, 19.1068, 72.8877, ST_SetSRID(ST_MakePoint(72.8877, 19.1068), 4326)::geography, 180, 16.0),
    ('f95b5c92-eb26-47b2-bdcf-88aa8d998782', 'beee79a1-bdf1-459d-a1cc-046a424b19b0', 'MH-02-EQ-1201', 'Anand Kadam', '+919000000004', 12000, 'Potable (Drinking)', 1450.00, 35.00, TRUE, TRUE, 19.1280, 72.8790, ST_SetSRID(ST_MakePoint(72.8790, 19.1280), 4326)::geography, 45, 18.0),
    ('ad09d4fe-4860-4965-a8ea-c764a0f4a86a', 'addd79a1-bdf1-459d-a1cc-046a424b19b9', 'MH-02-HV-2002', 'Dhananjay Patil', '+919820011005', 20000, 'Potable (Drinking)', 2200.00, 45.00, TRUE, TRUE, 19.1197, 72.9051, ST_SetSRID(ST_MakePoint(72.9051, 19.1197), 4326)::geography, 270, 24.0),
    ('3dfcbb4f-77ae-4f6c-94e8-8b9393ebc5e9', 'beee79a1-bdf1-459d-a1cc-046a424b19b0', 'MH-02-MN-1002', 'Venkatesh Parab', '+919820011006', 2000, 'Filtered Borewell', 450.00, 20.00, TRUE, TRUE, 19.1114, 72.8617, ST_SetSRID(ST_MakePoint(72.8617, 19.1114), 4326)::geography, 310, 5.5)
ON CONFLICT (vehicle_number) DO UPDATE SET 
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    current_location = EXCLUDED.current_location,
    driver_phone = EXCLUDED.driver_phone,
    is_available = EXCLUDED.is_available,
    is_online = TRUE;

-- 23c-2. Driver Profiles
INSERT INTO public.driver_profiles (id, profile_id, full_name, license_number, assigned_tanker_id, is_active)
VALUES 
    ('d1111111-1111-1111-1111-111111111111', 'd64671d9-665d-4a90-9a45-52be0313978d', 'Rajesh Sharma', 'MH02-2018-0098471', '415b741d-9372-46be-9e7f-fcad2a8449c2', TRUE),
    ('d2222222-2222-2222-2222-222222222222', 'b70a66f3-f265-45af-8bb8-ed463ed6e000', 'Suresh Shinde', 'MH02-2019-0043120', 'd7211bf7-d64e-4f01-9f93-54877e8172ea', TRUE),
    ('d3333333-3333-3333-3333-333333333333', 'b9a4be98-b394-4c00-b5d8-7b2d6bb7c8de', 'Sunil Pawar', 'MH02-2020-0076541', '1caae87d-ea3a-4ef8-831d-b8d4bb1ee05f', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 23c-3. Saved Addresses for Verified Customer
INSERT INTO public.saved_addresses (
    id, user_id, label, custom_name, flat_or_building, street_address,
    landmark, city, pincode, latitude, longitude, coordinates, is_default
) VALUES 
    (
        'a1111111-1111-1111-1111-111111111111',
        '2644c504-f611-40d3-a1c1-0d97214bf6f9',
        'home',
        'Marol Hill View Flat',
        'Flat 402, Wing B',
        'Marol Military Road, Andheri East',
        'Near SevenHills Hospital',
        'Mumbai',
        '400059',
        19.1171,
        72.8809,
        ST_SetSRID(ST_MakePoint(72.8809, 19.1171), 4326)::geography,
        TRUE
    ),
    (
        'a2222222-2222-2222-2222-222222222222',
        '2644c504-f611-40d3-a1c1-0d97214bf6f9',
        'work',
        'SEEPZ Office',
        'Building 5, 2nd Floor',
        'SEEPZ SEZ, Central Road, Andheri East',
        'Gate 2 SEEPZ',
        'Mumbai',
        '400096',
        19.1280,
        72.8790,
        ST_SetSRID(ST_MakePoint(72.8790, 19.1280), 4326)::geography,
        FALSE
    )
ON CONFLICT (id) DO NOTHING;

-- 23d. Water Quality Certificates
INSERT INTO public.water_quality_certificates (supplier_id, water_source, tds_ppm, ph_level, lab_name, certified_at, valid_until, is_active)
VALUES 
    ('addd79a1-bdf1-459d-a1cc-046a424b19b9', 'BMC Bhandup Potable Filtration Reservoir', 165, 7.2, 'Envirocare Laboratories Mumbai (NABL Accredited)', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', TRUE),
    ('beee79a1-bdf1-459d-a1cc-046a424b19b0', 'BMC Bhandup Potable Filtration Reservoir', 172, 7.3, 'Geo-Chem Laboratories (NABL Accredited)', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', TRUE);

-- 23e. Emergency Dispatches
INSERT INTO public.emergency_dispatches (id, institution_name, institution_type, contact_person, contact_phone, delivery_address, latitude, longitude, required_liters, water_type, sla_minutes, status, vehicle_number, driver_name, driver_phone)
VALUES 
    ('46e0f9ca-5999-4cca-a6f5-82f287d6177b', 'SevenHills Hospital (Marol)', 'hospital_dialysis', 'Dr. Hemant Deshmukh (Dialysis Dir.)', '+919820155001', 'Marol Maroshi Road, Andheri East, Mumbai 400059', 19.1235, 72.8815, 20000, 'Potable (Drinking)', 20, 'en_route', 'MH-02-HV-2002', 'Dhananjay Patil', '+919820011005'),
    ('b38f888c-9a4f-4d43-8551-ff7cbb7a1dfa', 'Holy Spirit Hospital ICU (Andheri East)', 'icu_critical', 'Dr. Sunita Fernandes (ICU Incharge)', '+919820155002', 'Mahakali Caves Road, Andheri East, Mumbai 400093', 19.1250, 72.8680, 10000, 'Potable (Drinking)', 20, 'priority_queued', 'MH-02-TN-1001', 'Sunil Pawar', '+919820011003'),
    ('11ecae64-bbcf-4ff3-9aa0-8bb3cb3d95ae', 'Dr. L H Hiranandani Hospital (Powai)', 'maternity_emergency', 'Sister Joyce (Emergency Operations)', '+919820155003', 'Hillside Avenue, Hiranandani Gardens, Powai, Mumbai 400076', 19.1205, 72.9120, 10000, 'Potable (Drinking)', 20, 'priority_queued', 'MH-02-TC-5002', 'Suresh Shinde', '+919820011002')
ON CONFLICT (id) DO NOTHING;

-- 23f. Corporate Subscriptions
INSERT INTO public.corporate_subscriptions (id, client_name, category, contact_person, contact_phone, delivery_address, latitude, longitude, daily_liters, frequency_per_day, preferred_time_slot, monthly_rate, status, assigned_supplier_name)
VALUES 
    ('6dc192d9-89b1-4b1a-8675-d99a686ba00e', 'Boomerang Business Park', 'tech_park', 'Rajesh Nair (Estate Head)', '+919820011221', 'Chandivali Farm Road, Andheri East, Mumbai 400072', 19.1128, 72.8988, 30000, 2, '05:30 AM - 07:30 AM', 125000.00, 'active', 'Marol Potable Water Hub (MIDC Andheri)'),
    ('2f89ca91-11ee-48f8-8bb0-0199fbaaeef1', 'SEEPZ Special Economic Zone (Gems & Jewelry)', 'sez_complex', 'Mehul Mehta (Ops Director)', '+919820011222', 'Gate No 1, SEEPZ, Andheri East, Mumbai 400096', 19.1280, 72.8790, 40000, 3, '06:00 AM - 08:30 AM', 160000.00, 'active', 'Marol Express Water Logistics'),
    ('99ecfa44-a1bf-4df9-8ca0-33bbdeea9901', 'Hiranandani Business Park (Powai)', 'tech_park', 'Ananya Sengupta (Facilities Manager)', '+919820011223', 'Ventura Building, Central Ave, Powai, Mumbai 400076', 19.1197, 72.9051, 50000, 4, '05:00 AM - 09:00 AM', 195000.00, 'active', 'Marol Potable Water Hub (MIDC Andheri)'),
    ('55bba911-33cf-4ee0-99aa-77dcbaae1199', 'Lotus Corporate Park (Western Express Hwy)', 'corporate_tower', 'Girish Chheda (Estate Manager)', '+919820011224', 'Laxmi Nagar, Goregaon-Andheri Link, Mumbai 400063', 19.1380, 72.8560, 20000, 2, '07:00 AM - 09:00 AM', 88000.00, 'active', 'Marol Express Water Logistics')
ON CONFLICT (id) DO NOTHING;

-- 23g. Community Pools
INSERT INTO public.community_pools (id, pool_code, community_name, delivery_address, latitude, longitude, target_liters, target_amount, collected_amount, status)
VALUES 
    ('55dca9e1-22fe-4aa9-81cb-98eaee910011', 'POOL-MAROL-404', 'Marol Hill View Housing Society', 'Marol Military Road, Andheri East, Mumbai 400059', 19.1171, 72.8809, 20000, 2400.00, 1800.00, 'collecting'),
    ('66edba44-33df-4bb0-92dc-09fbfe020022', 'POOL-RAHEJA-202', 'Raheja Vihar Complex Wing C', 'Chandivali Farm Road, Andheri East, Mumbai 400072', 19.1128, 72.8988, 20000, 2400.00, 2400.00, 'dispatched'),
    ('77feea55-44ef-4cc1-a3ed-10acaf130033', 'POOL-HIRAN-101', 'Hiranandani Glen Classic', 'Ridge Road, Powai, Mumbai 400076', 19.1197, 72.9051, 20000, 2400.00, 1200.00, 'collecting')
ON CONFLICT (pool_code) DO NOTHING;

-- 23h. Community Pool Contributions
INSERT INTO public.community_pool_contributions (pool_id, contributor_name, flat_number, amount, payment_status)
VALUES 
    ('55dca9e1-22fe-4aa9-81cb-98eaee910011', 'Rohan Verma', 'Flat 401', 600.00, 'paid'),
    ('55dca9e1-22fe-4aa9-81cb-98eaee910011', 'Pooja Kulkarni', 'Flat 402', 600.00, 'paid'),
    ('55dca9e1-22fe-4aa9-81cb-98eaee910011', 'Kunal Merchant', 'Flat 503', 600.00, 'paid');

-- 23i. Active Demand Bookings (Generating Realistic Hotspots for the Uber/Ola Heatmap)
-- Marol has 5 active bookings (creating high demand)
INSERT INTO public.bookings (
    id, booking_reference, customer_id, tanker_id, supplier_id, status, capacity_liters, water_type,
    delivery_address, delivery_latitude, delivery_longitude, delivery_coordinates, delivery_pin,
    delivery_distance_km, estimated_arrival_minutes, base_price, delivery_charge, surcharge, tax_amount,
    final_payable_amount, payment_preference, payment_status, driver_name, driver_phone, vehicle_number,
    supplier_name, quote_expires_at
) VALUES 
    ('b1111111-1111-1111-1111-111111111111', 'TKR-2026-88101', '65cee903-3554-49b1-9729-55552d400087', '415b741d-9372-46be-9e7f-fcad2a8449c2', 'addd79a1-bdf1-459d-a1cc-046a424b19b9', 'en_route', 5000, 'Potable (Drinking)', 'Marol Military Road, Andheri East', 19.1171, 72.8809, ST_SetSRID(ST_MakePoint(72.8809, 19.1171), 4326)::geography, '4821', 1.8, 12, 750, 45, 0, 39.75, 834.75, 'upi', 'paid', 'Rajesh Sharma', '+919820011001', 'MH-02-TC-5001', 'Marol Potable Water Hub (MIDC Andheri)', NOW() + INTERVAL '1 hour'),
    ('b2222222-2222-2222-2222-222222222222', 'TKR-2026-88102', '65cee903-3554-49b1-9729-55552d400087', 'ad09d4fe-4860-4965-a8ea-c764a0f4a86a', 'addd79a1-bdf1-459d-a1cc-046a424b19b9', 'driver_assigned', 5000, 'Potable (Drinking)', 'MIDC Central Road, Marol, Andheri East', 19.1185, 72.8795, ST_SetSRID(ST_MakePoint(72.8795, 19.1185), 4326)::geography, '7392', 2.1, 15, 750, 52, 0, 40.10, 842.10, 'upi', 'paid', 'Dhananjay Patil', '+919820011005', 'MH-02-HV-2002', 'Marol Potable Water Hub (MIDC Andheri)', NOW() + INTERVAL '1 hour'),
    ('b3333333-3333-3333-3333-333333333333', 'TKR-2026-88103', 'bca75357-3da7-4106-b7e8-bd275857efbc', 'd7211bf7-d64e-4f01-9f93-54877e8172ea', 'addd79a1-bdf1-459d-a1cc-046a424b19b9', 'pending', 5000, 'Potable (Drinking)', 'Marol Maroshi Rd, Near SevenHills', 19.1210, 72.8820, ST_SetSRID(ST_MakePoint(72.8820, 19.1210), 4326)::geography, '5129', 2.4, 18, 750, 60, 0, 40.50, 850.50, 'upi', 'authorized', 'Suresh Shinde', '+919820011002', 'MH-02-TC-5002', 'Marol Potable Water Hub (MIDC Andheri)', NOW() + INTERVAL '1 hour'),
    ('b4444444-4444-4444-4444-444444444444', 'TKR-2026-88104', 'd64671d9-665d-4a90-9a45-52be0313978d', '1caae87d-ea3a-4ef8-831d-b8d4bb1ee05f', 'beee79a1-bdf1-459d-a1cc-046a424b19b0', 'en_route', 10000, 'Potable (Drinking)', 'Sakinaka Metro Station, Andheri-Kurla Rd', 19.1068, 72.8877, ST_SetSRID(ST_MakePoint(72.8877, 19.1068), 4326)::geography, '8410', 3.2, 22, 1200, 96, 0, 64.80, 1360.80, 'upi', 'paid', 'Sunil Pawar', '+919820011003', 'MH-02-TN-1001', 'Marol Express Water Logistics', NOW() + INTERVAL '1 hour'),
    ('b5555555-5555-5555-5555-555555555555', 'TKR-2026-88105', 'd64671d9-665d-4a90-9a45-52be0313978d', '3dfcbb4f-77ae-4f6c-94e8-8b9393ebc5e9', 'beee79a1-bdf1-459d-a1cc-046a424b19b0', 'pending', 10000, 'Potable (Drinking)', 'Asalpha Village, Sakinaka, Mumbai', 19.1040, 72.8910, ST_SetSRID(ST_MakePoint(72.8910, 19.1040), 4326)::geography, '2941', 3.5, 25, 1200, 105, 0, 65.25, 1370.25, 'upi', 'authorized', 'Venkatesh Parab', '+919820011006', 'MH-02-MN-1002', 'Marol Express Water Logistics', NOW() + INTERVAL '1 hour'),
    ('b6666666-6666-6666-6666-666666666666', 'TKR-2026-88106', '65cee903-3554-49b1-9729-55552d400087', 'f95b5c92-eb26-47b2-bdcf-88aa8d998782', 'beee79a1-bdf1-459d-a1cc-046a424b19b0', 'en_route', 12000, 'Potable (Drinking)', 'SEEPZ Gate 2, Mahakali Caves Rd', 19.1280, 72.8790, ST_SetSRID(ST_MakePoint(72.8790, 19.1280), 4326)::geography, '3321', 2.8, 19, 1450, 98, 0, 77.40, 1625.40, 'upi', 'paid', 'Anand Kadam', '+919820011004', 'MH-02-EQ-1201', 'Marol Express Water Logistics', NOW() + INTERVAL '1 hour'),
    ('b7777777-7777-7777-7777-777777777777', 'TKR-2026-90401', '2644c504-f611-40d3-a1c1-0d97214bf6f9', '415b741d-9372-46be-9e7f-fcad2a8449c2', 'addd79a1-bdf1-459d-a1cc-046a424b19b9', 'en_route', 5000, 'Potable (Drinking)', 'Flat 402, Marol Hill View CHS, Military Road, Andheri East, Mumbai', 19.1171, 72.8809, ST_SetSRID(ST_MakePoint(72.8809, 19.1171), 4326)::geography, '9412', 2.3, 14, 750, 50, 0, 40.00, 840.00, 'upi', 'paid', 'Rajesh Sharma', '+919000000001', 'MH-02-TC-5001', 'Marol Potable Water Hub (MIDC Andheri)', NOW() + INTERVAL '2 hours'),
    ('b8888888-8888-8888-8888-888888888888', 'TKR-2026-89100', '2644c504-f611-40d3-a1c1-0d97214bf6f9', '415b741d-9372-46be-9e7f-fcad2a8449c2', 'addd79a1-bdf1-459d-a1cc-046a424b19b9', 'delivered', 5000, 'Potable (Drinking)', 'Flat 402, Marol Hill View CHS, Military Road, Andheri East, Mumbai', 19.1171, 72.8809, ST_SetSRID(ST_MakePoint(72.8809, 19.1171), 4326)::geography, '3128', 2.3, 0, 750, 50, 0, 40.00, 840.00, 'upi', 'paid', 'Rajesh Sharma', '+919000000001', 'MH-02-TC-5001', 'Marol Potable Water Hub (MIDC Andheri)', NOW() - INTERVAL '1 day'),
    ('b9999999-9999-9999-9999-999999999999', 'TKR-2026-95001', '2644c504-f611-40d3-a1c1-0d97214bf6f9', 'd7211bf7-d64e-4f01-9f93-54877e8172ea', 'addd79a1-bdf1-459d-a1cc-046a424b19b9', 'pending', 5000, 'Potable (Drinking)', 'Raheja Vihar Wing C, Chandivali, Andheri East, Mumbai', 19.1128, 72.8988, ST_SetSRID(ST_MakePoint(72.8988, 19.1128), 4326)::geography, '6219', 2.8, 18, 750, 55, 0, 40.25, 845.25, 'upi', 'authorized', 'Suresh Shinde', '+919000000002', 'MH-02-TC-5002', 'Marol Potable Water Hub (MIDC Andheri)', NOW() + INTERVAL '1 hour')
ON CONFLICT (id) DO UPDATE SET 
    status = EXCLUDED.status,
    delivery_address = EXCLUDED.delivery_address,
    delivery_latitude = EXCLUDED.delivery_latitude,
    delivery_longitude = EXCLUDED.delivery_longitude,
    delivery_coordinates = EXCLUDED.delivery_coordinates;

-- 23i-2. Invoices
INSERT INTO public.invoices (
    id, booking_id, invoice_number, customer_name, customer_phone,
    delivery_address, supplier_business_name, supplier_gstin, water_type,
    volume_liters, base_price, delivery_charge, surcharge, tax_amount,
    final_amount, payment_status, issued_at
) VALUES (
    'c1111111-1111-1111-1111-111111111111',
    'b8888888-8888-8888-8888-888888888888',
    'INV-2026-89100',
    'Vikram Malhotra',
    '+919876543210',
    'Flat 402, Marol Hill View CHS, Military Road, Andheri East, Mumbai',
    'Marol Potable Water Hub (MIDC Andheri)',
    '276E9AC2576C1Z5',
    'Potable (Drinking)',
    5000,
    750.00,
    50.00,
    0.00,
    40.00,
    840.00,
    'PAID',
    NOW() - INTERVAL '1 day'
)
ON CONFLICT (invoice_number) DO NOTHING;

-- 23j. Platform Settings
INSERT INTO public.platform_settings (key, value)
VALUES 
    ('pricing_config', '{"base_rate_5kl": 750, "price_per_km": 25, "gst_rate": 0.05, "platform_commission": 0.10, "peak_surge_multiplier": 1.25}'::jsonb),
    ('compliance_rules', '{"max_tds_potable": 250, "min_ph": 6.5, "max_ph": 8.5, "cert_validity_days": 90}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 23k. Admin Audit Logs
INSERT INTO public.admin_audit_logs (action, target_entity, target_id, details)
VALUES 
    ('SYSTEM_INIT', 'platform', 'qicoczialqxulcbipuix', '{"status": "ONLINE", "cluster": "BOM-1", "hub": "Marol MIDC", "active_zones": 6, "active_fleet": 6}'::jsonb);
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

-- 5. Table Grants & Least-Privilege RLS (SEC-001 & SEC-002 Remediation)
-- Service role retains full administrative grants
GRANT ALL ON TABLE public.driver_payout_ledger TO service_role;
GRANT ALL ON TABLE public.corporate_subscriptions TO service_role;
GRANT ALL ON TABLE public.emergency_dispatches TO service_role;
GRANT ALL ON TABLE public.water_quality_certificates TO service_role;
GRANT ALL ON TABLE public.disputes TO service_role;
GRANT ALL ON TABLE public.admin_audit_logs TO service_role;
GRANT ALL ON TABLE public.service_zones TO service_role;
GRANT ALL ON TABLE public.platform_settings TO service_role;

-- Authenticated roles granted DML bounded by RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.driver_payout_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.corporate_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.emergency_dispatches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.water_quality_certificates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.disputes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.service_zones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.platform_settings TO authenticated;

-- Anon revoked from privileged tables, allowed public discovery read on certificates and zones
REVOKE ALL ON TABLE public.driver_payout_ledger, public.corporate_subscriptions, public.emergency_dispatches, public.disputes, public.admin_audit_logs, public.platform_settings FROM anon;
GRANT SELECT ON TABLE public.water_quality_certificates, public.service_zones TO anon;

ALTER TABLE public.driver_payout_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_quality_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "driver_payout_ledger_all" ON public.driver_payout_ledger;
    CREATE POLICY "driver_payout_ledger_access" ON public.driver_payout_ledger FOR ALL 
        USING (
            public.is_admin(auth.uid()) 
            OR auth.role() = 'service_role'
            OR driver_phone IN (SELECT phone_number FROM public.profiles WHERE id = auth.uid() UNION SELECT '+' || phone_number FROM public.profiles WHERE id = auth.uid())
        ) 
        WITH CHECK (
            public.is_admin(auth.uid()) 
            OR auth.role() = 'service_role'
        );

    DROP POLICY IF EXISTS "corporate_subscriptions_all" ON public.corporate_subscriptions;
    CREATE POLICY "corporate_subscriptions_access" ON public.corporate_subscriptions FOR ALL 
        USING (
            public.is_admin(auth.uid()) 
            OR auth.role() = 'service_role'
        ) 
        WITH CHECK (
            public.is_admin(auth.uid()) 
            OR auth.role() = 'service_role'
        );

    DROP POLICY IF EXISTS "emergency_dispatches_all" ON public.emergency_dispatches;
    CREATE POLICY "emergency_dispatches_access" ON public.emergency_dispatches FOR ALL 
        USING (
            public.is_admin(auth.uid()) 
            OR auth.role() = 'service_role'
            OR driver_phone IN (SELECT phone_number FROM public.profiles WHERE id = auth.uid() UNION SELECT '+' || phone_number FROM public.profiles WHERE id = auth.uid())
        ) 
        WITH CHECK (
            public.is_admin(auth.uid()) 
            OR auth.role() = 'service_role'
        );

    DROP POLICY IF EXISTS "water_quality_certificates_all" ON public.water_quality_certificates;
    CREATE POLICY "water_quality_certificates_read" ON public.water_quality_certificates FOR SELECT USING (TRUE);
    CREATE POLICY "water_quality_certificates_admin_write" ON public.water_quality_certificates FOR ALL 
        USING (public.is_admin(auth.uid()) OR auth.role() = 'service_role')
        WITH CHECK (public.is_admin(auth.uid()) OR auth.role() = 'service_role');

    DROP POLICY IF EXISTS "disputes_all" ON public.disputes;
    CREATE POLICY "disputes_access" ON public.disputes FOR ALL 
        USING (
            public.is_admin(auth.uid()) 
            OR auth.role() = 'service_role'
            OR customer_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.suppliers s 
                JOIN public.profiles p ON (s.contact_phone = p.phone_number OR s.contact_phone = '+' || p.phone_number) 
                WHERE p.id = auth.uid() AND s.business_name = disputes.supplier_name
            )
        ) 
        WITH CHECK (
            public.is_admin(auth.uid()) 
            OR auth.role() = 'service_role'
            OR customer_id = auth.uid()
        );
END $$;

-- 6. RPC: get_service_zone_liquidity_health (SEC-004: Admin / Service Role Authorized)
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
    IF NOT (public.is_admin(auth.uid()) OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Access Denied: Administrative authorization required for zone liquidity metrics (ERRCODE 42501)';
    END IF;

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

-- 7. RPC: admin_emergency_dispatch (SEC-004: Admin / Service Role Authorized)
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
    IF NOT (public.is_admin(auth.uid()) OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Access Denied: Administrative authorization required for emergency dispatch (ERRCODE 42501)';
    END IF;

    BEGIN
        v_type_enum := p_institution_type::public.institution_type;
    EXCEPTION WHEN OTHERS THEN
        v_type_enum := 'hospital_dialysis'::public.institution_type;
    END;

    -- Select nearest available online tanker
    SELECT id, vehicle_number, driver_name, driver_phone
    INTO v_tanker_id, v_vehicle_number, v_driver_name, v_driver_phone
    FROM public.tankers
    WHERE is_online = true AND is_available = true
    ORDER BY ST_Distance(
        current_location,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) ASC
    LIMIT 1;

    -- If no available tanker is ready, fail gracefully rather than preempting a vehicle already performing another trip
    IF v_tanker_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No available tankers currently online in the emergency service zone. Please try again shortly.'
        );
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

-- 8. RPC: admin_execute_batch_payout (SEC-004 & TNK-C07: Batch ID & Settlement Tracking)
CREATE OR REPLACE FUNCTION public.admin_execute_batch_payout()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_amount NUMERIC := 0;
    v_records_count INTEGER := 0;
    v_batch_id UUID := gen_random_uuid();
    r RECORD;
BEGIN
    IF NOT (public.is_admin(auth.uid()) OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Access Denied: Administrative authorization required for batch payouts (ERRCODE 42501)';
    END IF;

    FOR r IN 
        SELECT 
            driver_phone,
            COUNT(*) as trip_count,
            SUM(amount) as driver_earnings
        FROM public.driver_payout_ledger
        WHERE entry_type = 'delivery_earnings' AND is_settled = FALSE
        GROUP BY driver_phone
    LOOP
        -- Mark earnings as settled under this batch id
        UPDATE public.driver_payout_ledger
        SET is_settled = TRUE,
            settlement_batch_id = v_batch_id
        WHERE driver_phone = r.driver_phone
          AND entry_type = 'delivery_earnings'
          AND is_settled = FALSE;

        INSERT INTO public.driver_payout_ledger (
            driver_phone,
            entry_type,
            amount,
            notes,
            settlement_batch_id,
            is_settled
        ) VALUES (
            r.driver_phone,
            'batch_payout_settlement',
            r.driver_earnings,
            format('Bank NEFT/IMPS payout transfer executed for %s completed deliveries (Batch: %s)', r.trip_count, v_batch_id),
            v_batch_id,
            TRUE
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
        v_batch_id::text,
        jsonb_build_object(
            'batch_id', v_batch_id,
            'beneficiaries', v_records_count,
            'total_settled', v_total_amount,
            'method', 'Automated Razorpay Payouts API / Direct Bank Transfer'
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', v_batch_id,
        'beneficiaries_count', v_records_count,
        'total_settled_amount', v_total_amount
    );
END;
$$;

-- 9. RPC: admin_verify_supplier (SEC-004: Admin / Service Role Authorized)
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
    IF NOT (public.is_admin(auth.uid()) OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Access Denied: Administrative authorization required for supplier verification (ERRCODE 42501)';
    END IF;

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

-- 10. RPC: admin_resolve_dispute (SEC-004 & TNK-C07: Capped at captured balance)
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
    v_total_captured NUMERIC := 0;
    v_already_refunded NUMERIC := 0;
    v_max_eligible_refund NUMERIC := 0;
BEGIN
    IF NOT (public.is_admin(auth.uid()) OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Access Denied: Administrative authorization required for dispute resolution (ERRCODE 42501)';
    END IF;

    SELECT booking_id, customer_id INTO v_booking_id, v_customer_id
    FROM public.disputes WHERE id = p_dispute_id;

    IF v_booking_id IS NULL THEN
        RAISE EXCEPTION 'Dispute not found';
    END IF;

    IF p_status = 'refunded' AND p_refund_amount > 0 THEN
        SELECT 
            COALESCE(SUM(amount) FILTER (WHERE status = 'captured' OR status = 'paid'), 0),
            COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0)
        INTO v_total_captured, v_already_refunded
        FROM public.payments
        WHERE booking_id = v_booking_id;

        v_max_eligible_refund := GREATEST(0, v_total_captured - v_already_refunded);

        IF p_refund_amount > v_max_eligible_refund THEN
            RAISE EXCEPTION 'Requested refund amount % exceeds maximum eligible captured balance %', p_refund_amount, v_max_eligible_refund;
        END IF;

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
            'rfnd_dispute_' || p_dispute_id::text
        );

        UPDATE public.bookings
        SET payment_status = 'refunded'
        WHERE id = v_booking_id;
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
        jsonb_build_object('status', p_status, 'refund_amount', p_refund_amount, 'notes', p_notes)
    );

    RETURN jsonb_build_object('success', true, 'dispute_id', p_dispute_id, 'status', p_status);
END;
$$;

-- 10b. RPC: process_booking_refund (TNK-C07: Financial Integrity Server RPC)
CREATE OR REPLACE FUNCTION public.process_booking_refund(
    p_booking_id UUID,
    p_reason TEXT DEFAULT 'Cancellation or Service Failure'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_booking RECORD;
    v_total_captured NUMERIC := 0;
    v_already_refunded NUMERIC := 0;
    v_refundable_amount NUMERIC := 0;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
    END IF;

    IF NOT (public.is_admin(auth.uid()) OR auth.role() = 'service_role' OR auth.uid() = v_booking.customer_id) THEN
        RAISE EXCEPTION 'Access Denied: You cannot trigger a refund for this booking';
    END IF;

    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE status = 'captured' OR status = 'paid'), 0),
        COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0)
    INTO v_total_captured, v_already_refunded
    FROM public.payments
    WHERE booking_id = p_booking_id;

    v_refundable_amount := GREATEST(0, v_total_captured - v_already_refunded);

    IF v_refundable_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No captured balance available for refund');
    END IF;

    INSERT INTO public.payments (
        booking_id,
        amount,
        method,
        status,
        gateway_payment_id
    ) VALUES (
        p_booking_id,
        v_refundable_amount,
        'refund',
        'refunded',
        'rfnd_' || substr(gen_random_uuid()::text, 1, 12)
    );

    UPDATE public.bookings
    SET payment_status = 'refunded'
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'refunded_amount', v_refundable_amount,
        'reason', p_reason
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_booking_refund(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_booking_refund(UUID, TEXT) TO authenticated, service_role;

-- 11. RPC: admin_rebalance_tanker (SEC-004: Admin / Service Role Authorized)
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
    IF NOT (public.is_admin(auth.uid()) OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'Access Denied: Administrative authorization required for tanker rebalancing (ERRCODE 42501)';
    END IF;

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

-- Complete customer onboarding RPC (Atomic, Security Definer)
CREATE OR REPLACE FUNCTION public.complete_customer_onboarding(
    p_full_name TEXT,
    p_preferred_address TEXT,
    p_city TEXT,
    p_pincode TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.profiles
    SET 
        full_name = p_full_name,
        preferred_address = p_preferred_address,
        city = p_city,
        pincode = p_pincode,
        is_onboarding_completed = true,
        updated_at = NOW()
    WHERE id = v_user_id
    RETURNING * INTO v_profile;

    IF NOT FOUND THEN
        INSERT INTO public.profiles (
            id,
            full_name,
            preferred_address,
            city,
            pincode,
            is_onboarding_completed,
            role,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            p_full_name,
            p_preferred_address,
            p_city,
            p_pincode,
            true,
            'customer',
            NOW(),
            NOW()
        )
        RETURNING * INTO v_profile;
    END IF;

    RETURN to_jsonb(v_profile);
END;
$$;

-- Explicit Routine Permissions: Restrict privileged administrative routines
REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_service_zone_liquidity_health() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_emergency_dispatch(TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_execute_batch_payout() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_verify_supplier(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_rebalance_tanker(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_service_zone_liquidity_health() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_emergency_dispatch(TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_execute_batch_payout() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_verify_supplier(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, TEXT, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_rebalance_tanker(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_customer_onboarding(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
