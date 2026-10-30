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
