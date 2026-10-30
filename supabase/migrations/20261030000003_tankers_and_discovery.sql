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

