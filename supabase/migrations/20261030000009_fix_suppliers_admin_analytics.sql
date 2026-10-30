-- ==============================================================================
-- TANKR DATABASE MIGRATION: Fix Supplier Verification & Recompile Admin Analytics
-- ==============================================================================

-- 1. Ensure supplier compliance columns exist
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'verified';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS gstin TEXT DEFAULT '29AABCS1429B1Z8';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS water_source TEXT DEFAULT 'Certified Borewell';

-- 2. Recompile Executive KPI Metrics RPC
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
