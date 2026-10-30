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
