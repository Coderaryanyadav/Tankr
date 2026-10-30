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

