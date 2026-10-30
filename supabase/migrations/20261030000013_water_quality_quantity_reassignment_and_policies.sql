-- ==============================================================================
-- TANKR DATABASE MIGRATION 13: Water Quantity & Quality Verification,
-- Supplier Cancellation Reassignment, Driver Compensation & Service Zone Operations
-- ==============================================================================

-- 1. Extend Booking Status Enum with Reassignment & Unfulfilled States
DO $$ BEGIN
    ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'reassigning';
    ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'unfulfilled_refunded';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Water Quantity & Meter Verification Columns on Bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS flow_meter_start NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS flow_meter_end NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS delivered_liters INT DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meter_photo_url TEXT DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_volume_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS volume_discrepancy_liters INT DEFAULT 0;

-- 3. Water Quality Certificates Table (Lab Testing & Potability Passport)
CREATE TABLE IF NOT EXISTS public.water_quality_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL DEFAULT 'Certified Deep Borewell',
    lab_name TEXT NOT NULL DEFAULT 'Bangalore Water Testing Laboratories (NABL Accredited)',
    test_report_number TEXT NOT NULL UNIQUE,
    tds_ppm INT NOT NULL CHECK (tds_ppm BETWEEN 20 AND 1500),
    ph_level NUMERIC(3,1) NOT NULL CHECK (ph_level BETWEEN 5.0 AND 9.5),
    turbidity_ntu NUMERIC(3,1) NOT NULL DEFAULT 0.5,
    coliform_detected BOOLEAN NOT NULL DEFAULT FALSE,
    certified_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '90 days'),
    is_potable BOOLEAN NOT NULL DEFAULT TRUE,
    certificate_url TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.water_quality_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active water certificates" ON public.water_quality_certificates;
CREATE POLICY "Public can view active water certificates"
    ON public.water_quality_certificates FOR SELECT
    USING (TRUE);

-- Link active certificate to tankers and bookings
ALTER TABLE public.tankers ADD COLUMN IF NOT EXISTS active_certificate_id UUID REFERENCES public.water_quality_certificates(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS water_certificate_id UUID REFERENCES public.water_quality_certificates(id) ON DELETE SET NULL;

-- 4. Driver Payout & Compensation Ledger
CREATE TABLE IF NOT EXISTS public.driver_payout_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_phone TEXT NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('delivery_earnings', 'transit_compensation', 'no_show_compensation', 'cancellation_fee')),
    amount NUMERIC(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.driver_payout_ledger ENABLE ROW LEVEL SECURITY;

-- 5. Service Zones & Operational Liquidity Table
CREATE TABLE IF NOT EXISTS public.service_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name TEXT NOT NULL UNIQUE,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    radius_km NUMERIC(4,1) NOT NULL DEFAULT 7.5,
    traffic_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0,
    minimum_fleet_density INT NOT NULL DEFAULT 3,
    is_operational BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read service zones" ON public.service_zones;
CREATE POLICY "Public read service zones"
    ON public.service_zones FOR SELECT
    USING (TRUE);

-- Seed Bengaluru Operational Zones
INSERT INTO public.service_zones (zone_name, center_lat, center_lng, radius_km, traffic_multiplier, minimum_fleet_density)
VALUES 
    ('Whitefield / ITPB', 12.9698, 77.7499, 8.0, 1.25, 4),
    ('Bellandur / Outer Ring Road', 12.9304, 77.6784, 7.5, 1.40, 5),
    ('Indiranagar / Domlur', 12.9784, 77.6408, 6.5, 1.30, 3),
    ('Koramangala / HSR', 12.9352, 77.6245, 7.0, 1.35, 4),
    ('Electronic City Phase 1 & 2', 12.8452, 77.6602, 9.0, 1.15, 3)
ON CONFLICT (zone_name) DO NOTHING;

-- 6. RPC: Enhanced Driver Delivery Completion with Flow Meter Readings
CREATE OR REPLACE FUNCTION driver_complete_delivery_with_meter(
    p_booking_id UUID,
    p_delivery_pin TEXT,
    p_flow_start NUMERIC(10,2),
    p_flow_end NUMERIC(10,2),
    p_delivered_liters INT,
    p_meter_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_b RECORD;
    v_calc_liters INT;
BEGIN
    SELECT * INTO v_b
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found' USING ERRCODE = '02000';
    END IF;

    -- Verify 4-Digit Customer Handshake PIN
    IF v_b.delivery_pin != p_delivery_pin THEN
        RAISE EXCEPTION 'Invalid Delivery PIN. Ask customer for the 4-digit code shown on their tracking screen.'
            USING ERRCODE = '28000';
    END IF;

    -- Calculate or validate delivered volume
    IF p_flow_end IS NOT NULL AND p_flow_start IS NOT NULL AND p_flow_end >= p_flow_start THEN
        v_calc_liters := ROUND(p_flow_end - p_flow_start);
    ELSE
        v_calc_liters := COALESCE(p_delivered_liters, v_b.capacity_liters);
    END IF;

    -- Update booking with audited delivery meter values
    UPDATE public.bookings
    SET 
        status = 'delivered'::booking_status,
        flow_meter_start = p_flow_start,
        flow_meter_end = p_flow_end,
        delivered_liters = v_calc_liters,
        meter_photo_url = p_meter_photo_url,
        updated_at = NOW()
    WHERE id = p_booking_id;

    -- Release tanker back to available status
    UPDATE public.tankers
    SET is_available = TRUE,
        updated_at = NOW()
    WHERE id = v_b.tanker_id;

    -- Credit driver earnings to payout ledger
    INSERT INTO public.driver_payout_ledger (
        driver_phone,
        booking_id,
        entry_type,
        amount,
        notes
    ) VALUES (
        v_b.driver_phone,
        p_booking_id,
        'delivery_earnings',
        ROUND(v_b.final_payable_amount * 0.85, 2), -- 85% driver share, 15% platform fee
        'Completed delivery of ' || v_calc_liters || 'L for order #' || v_b.booking_reference
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'status', 'delivered',
        'delivered_liters', v_calc_liters
    );
END;
$$;

-- 7. RPC: Supplier Cancellation & Controlled Automatic Fleet Reassignment
CREATE OR REPLACE FUNCTION supplier_cancel_and_reassign(
    p_booking_id UUID,
    p_supplier_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_b RECORD;
    v_next_tanker RECORD;
BEGIN
    SELECT * INTO v_b
    FROM public.bookings
    WHERE id = p_booking_id
      AND supplier_id = p_supplier_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found or not owned by supplier';
    END IF;

    IF v_b.status NOT IN ('pending'::booking_status, 'accepted'::booking_status) THEN
        RAISE EXCEPTION 'Cannot cancel and reassign an order that is already en route or delivered.';
    END IF;

    -- Mark current tanker available
    UPDATE public.tankers
    SET is_available = TRUE
    WHERE id = v_b.tanker_id;

    -- Search next nearest available tanker matching capacity within 8 km
    SELECT t.id, t.supplier_id, t.vehicle_number, t.driver_name, t.driver_phone,
           ST_Distance(
               ST_SetSRID(ST_MakePoint(t.longitude, t.latitude), 4326)::geography,
               ST_SetSRID(ST_MakePoint(v_b.delivery_longitude, v_b.delivery_latitude), 4326)::geography
           ) / 1000.0 AS dist_km
    INTO v_next_tanker
    FROM public.tankers t
    WHERE t.is_online = TRUE
      AND t.is_available = TRUE
      AND t.capacity_liters = v_b.capacity_liters
      AND t.id != v_b.tanker_id
      AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(t.longitude, t.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(v_b.delivery_longitude, v_b.delivery_latitude), 4326)::geography,
          8000
      )
    ORDER BY dist_km ASC
    LIMIT 1;

    IF FOUND THEN
        -- Reassign atomically
        UPDATE public.bookings
        SET 
            supplier_id = v_next_tanker.supplier_id,
            tanker_id = v_next_tanker.id,
            vehicle_number = v_next_tanker.vehicle_number,
            driver_name = v_next_tanker.driver_name,
            driver_phone = v_next_tanker.driver_phone,
            status = 'pending'::booking_status,
            delivery_distance_km = ROUND(v_next_tanker.dist_km::NUMERIC, 1),
            updated_at = NOW()
        WHERE id = p_booking_id;

        UPDATE public.tankers
        SET is_available = FALSE
        WHERE id = v_next_tanker.id;

        RETURN jsonb_build_object(
            'success', true,
            'reassigned', true,
            'new_tanker_id', v_next_tanker.id,
            'message', 'Booking seamlessly reassigned to alternative fleet partner.'
        );
    ELSE
        -- No nearby replacement available -> Automatic 100% refund
        UPDATE public.bookings
        SET 
            status = 'unfulfilled_refunded'::booking_status,
            payment_status = 'refunded',
            updated_at = NOW()
        WHERE id = p_booking_id;

        UPDATE public.payments
        SET status = 'refunded'
        WHERE booking_id = p_booking_id;

        RETURN jsonb_build_object(
            'success', true,
            'reassigned', false,
            'refunded', true,
            'message', 'No alternative fleet available in zone. Full payment refunded automatically.'
        );
    END IF;
END;
$$;

-- 8. RPC: Transparent Customer Cancellation with Driver Compensation
CREATE OR REPLACE FUNCTION customer_cancel_booking_with_policy(
    p_booking_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_b RECORD;
    v_fee NUMERIC(10,2) := 0.00;
    v_refund NUMERIC(10,2);
    v_age_minutes NUMERIC;
BEGIN
    SELECT * INTO v_b
    FROM public.bookings
    WHERE id = p_booking_id
      AND customer_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found or unauthorized' USING ERRCODE = '42501';
    END IF;

    IF v_b.status IN ('delivering'::booking_status, 'delivered'::booking_status, 'cancelled'::booking_status) THEN
        RAISE EXCEPTION 'Cannot cancel an order currently pumping or already completed.';
    END IF;

    v_age_minutes := EXTRACT(EPOCH FROM (NOW() - v_b.created_at)) / 60.0;

    -- Tiered Fair Cancellation Matrix:
    -- 1. Under 5 mins from creation: Zero fee
    -- 2. After 5 mins if tanker is en route: ₹100 transit charge to compensate driver
    -- 3. If tanker arrived at location: ₹200 no-show/gate arrival charge
    IF v_b.status = 'arrived'::booking_status THEN
        v_fee := 200.00;
    ELSIF v_b.status = 'en_route'::booking_status OR v_age_minutes > 5.0 THEN
        v_fee := 100.00;
    ELSE
        v_fee := 0.00;
    END IF;

    v_refund := GREATEST(0.00, v_b.final_payable_amount - v_fee);

    -- Update booking to cancelled
    UPDATE public.bookings
    SET 
        status = 'cancelled'::booking_status,
        payment_status = CASE WHEN v_refund > 0 THEN 'partially_refunded' ELSE 'charged' END,
        updated_at = NOW()
    WHERE id = p_booking_id;

    -- Release vehicle
    UPDATE public.tankers
    SET is_available = TRUE
    WHERE id = v_b.tanker_id;

    -- Record refund & driver transit compensation
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
            'transit_compensation',
            v_fee,
            'Customer cancelled after dispatch. Transit compensation credited.'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cancellation_fee', v_fee,
        'refund_amount', v_refund,
        'policy_applied', CASE 
            WHEN v_fee = 0 THEN 'Free cancellation within grace window'
            WHEN v_fee = 100 THEN 'Driver en-route transit compensation fee'
            ELSE 'Arrived at location gate fee'
        END
    );
END;
$$;

-- 9. RPC: Service Zone Liquidity & Operations Health Monitor
CREATE OR REPLACE FUNCTION get_service_zone_liquidity_health()
RETURNS TABLE (
    zone_name TEXT,
    online_fleet_count INT,
    available_fleet_count INT,
    active_deliveries INT,
    liquidity_status TEXT,
    avg_eta_minutes INT,
    traffic_factor NUMERIC(3,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        z.zone_name,
        COUNT(t.id)::INT AS online_fleet_count,
        COUNT(t.id) FILTER (WHERE t.is_available = TRUE)::INT AS available_fleet_count,
        COUNT(b.id) FILTER (WHERE b.status IN ('en_route', 'delivering'))::INT AS active_deliveries,
        CASE 
            WHEN COUNT(t.id) FILTER (WHERE t.is_available = TRUE) >= z.minimum_fleet_density THEN 'OPTIMAL'
            WHEN COUNT(t.id) FILTER (WHERE t.is_available = TRUE) > 0 THEN 'LIMITED_SUPPLY'
            ELSE 'HIGH_DEMAND_SURGE'
        END AS liquidity_status,
        ROUND(15 * z.traffic_multiplier)::INT AS avg_eta_minutes,
        z.traffic_multiplier AS traffic_factor
    FROM public.service_zones z
    LEFT JOIN public.tankers t 
        ON t.is_online = TRUE 
       AND ST_DWithin(
           ST_SetSRID(ST_MakePoint(t.longitude, t.latitude), 4326)::geography,
           ST_SetSRID(ST_MakePoint(z.center_lng, z.center_lat), 4326)::geography,
           z.radius_km * 1000
       )
    LEFT JOIN public.bookings b
        ON b.tanker_id = t.id
    GROUP BY z.id, z.zone_name, z.radius_km, z.traffic_multiplier, z.minimum_fleet_density
    ORDER BY z.zone_name;
END;
$$;

