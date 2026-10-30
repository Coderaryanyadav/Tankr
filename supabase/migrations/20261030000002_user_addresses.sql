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

