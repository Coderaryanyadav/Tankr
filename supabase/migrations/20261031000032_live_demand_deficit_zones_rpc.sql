-- ==============================================================================
-- TANKR DATABASE MIGRATION 32: Real-Time Demand Deficit & Heatmap RPC
-- Removes all hardcoded deficit zones; calculates live spatial deficit in PostgreSQL
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_live_demand_deficit_zones()
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH zone_stats AS (
        SELECT 
            z.id,
            z.zone_name,
            z.center_lat,
            z.center_lng,
            z.radius_km,
            COUNT(DISTINCT t.id) FILTER (WHERE t.is_online = TRUE)::INT AS online_fleet,
            COUNT(DISTINCT t.id) FILTER (WHERE t.is_online = TRUE AND t.is_available = TRUE)::INT AS available_fleet,
            COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('pending', 'accepted', 'driver_assigned', 'en_route', 'delivering'))::INT AS active_demand,
            z.minimum_fleet_density
        FROM public.service_zones z
        LEFT JOIN public.tankers t 
            ON t.is_online = TRUE 
           AND ST_DWithin(
               ST_SetSRID(ST_MakePoint(t.longitude, t.latitude), 4326)::geography,
               ST_SetSRID(ST_MakePoint(z.center_lng, z.center_lat), 4326)::geography,
               z.radius_km * 1000
           )
        LEFT JOIN public.bookings b
            ON b.status IN ('pending', 'accepted', 'driver_assigned', 'en_route', 'delivering')
           AND ST_DWithin(
               ST_SetSRID(ST_MakePoint(b.delivery_longitude, b.delivery_latitude), 4326)::geography,
               ST_SetSRID(ST_MakePoint(z.center_lng, z.center_lat), 4326)::geography,
               z.radius_km * 1000
           )
        WHERE z.is_operational = TRUE
        GROUP BY z.id, z.zone_name, z.center_lat, z.center_lng, z.radius_km, z.minimum_fleet_density
    )
    SELECT
        zs.id,
        zs.zone_name,
        zs.center_lat,
        zs.center_lng,
        zs.radius_km,
        zs.online_fleet,
        zs.available_fleet,
        zs.active_demand,
        -- Calculated deficit percentage based on live supply vs demand and density target
        CASE 
            WHEN zs.available_fleet = 0 AND zs.active_demand > 0 THEN 92
            WHEN zs.available_fleet = 0 THEN 78
            WHEN zs.available_fleet < zs.minimum_fleet_density THEN 
                LEAST(85, GREATEST(35, ROUND((1.0 - (zs.available_fleet::NUMERIC / GREATEST(zs.minimum_fleet_density, 1))) * 100)::INT))
            ELSE 
                LEAST(30, GREATEST(10, ROUND((zs.active_demand::NUMERIC / GREATEST(zs.available_fleet, 1)) * 20)::INT))
        END AS deficit_percentage,
        -- Live human-readable deficit status
        CASE 
            WHEN zs.available_fleet = 0 AND zs.active_demand > 0 THEN 'CRITICAL (92%)'
            WHEN zs.available_fleet = 0 THEN 'SEVERE (78%)'
            WHEN zs.available_fleet < (zs.minimum_fleet_density / 2.0) THEN 'ELEVATED (65%)'
            WHEN zs.available_fleet < zs.minimum_fleet_density THEN 'MODERATE (45%)'
            ELSE 'OPTIMAL (20%)'
        END AS deficit_level,
        -- Live heatmap gradient indicator
        CASE 
            WHEN zs.available_fleet = 0 AND zs.active_demand > 0 THEN '#DC2626' -- Severe Red
            WHEN zs.available_fleet = 0 THEN '#EA580C' -- Critical Orange-Red
            WHEN zs.available_fleet < (zs.minimum_fleet_density / 2.0) THEN '#D97706' -- Elevated Amber
            WHEN zs.available_fleet < zs.minimum_fleet_density THEN '#EAB308' -- Moderate Yellow
            ELSE '#16A34A' -- Optimal Green
        END AS color,
        ROUND(32 + (zs.radius_km * 3.0))::INT AS radius_pixels
    FROM zone_stats zs
    ORDER BY zs.center_lat DESC;
END;
$$;
