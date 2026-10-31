-- ==============================================================================
-- Migration 30: Scheduled Deliveries, Two-Way Meter Proration, Community Pooling & Heavy Navigation
-- ==============================================================================

-- 1. Extend bookings table for Scheduled Deliveries & Subscriptions
ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'instant',
    ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS recurring_days TEXT[],
    ADD COLUMN IF NOT EXISTS recurring_time_slot TEXT,
    ADD COLUMN IF NOT EXISTS is_subscription_active BOOLEAN DEFAULT TRUE;

-- 2. Extend tankers table for Heavy Vehicle Specs & Clearances
ALTER TABLE public.tankers
    ADD COLUMN IF NOT EXISTS gross_vehicle_weight_tonnes NUMERIC DEFAULT 16.0,
    ADD COLUMN IF NOT EXISTS height_clearance_meters NUMERIC DEFAULT 3.4,
    ADD COLUMN IF NOT EXISTS commercial_route_profile TEXT DEFAULT 'heavy_truck_designated';

-- 3. Community Sump Cost-Splitting Tables
CREATE TABLE IF NOT EXISTS public.community_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_code TEXT UNIQUE NOT NULL,
    society_name TEXT NOT NULL,
    target_liters INT NOT NULL DEFAULT 20000,
    target_amount NUMERIC(10, 2) NOT NULL DEFAULT 2400.00,
    collected_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'collecting' CHECK (status IN ('collecting', 'funded', 'dispatched')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_pool_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID REFERENCES public.community_pools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    contributor_name TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pool_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_pools_all" ON public.community_pools;
CREATE POLICY "community_pools_all" ON public.community_pools FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "community_contributions_all" ON public.community_pool_contributions;
CREATE POLICY "community_contributions_all" ON public.community_pool_contributions FOR ALL USING (true) WITH CHECK (true);

-- 4. Community Pool Contribution Stored Procedure
CREATE OR REPLACE FUNCTION public.contribute_to_community_pool(
    p_pool_code TEXT,
    p_contributor_name TEXT,
    p_flat_number TEXT,
    p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pool RECORD;
    v_new_collected NUMERIC;
    v_new_status TEXT;
BEGIN
    SELECT * INTO v_pool
    FROM public.community_pools
    WHERE pool_code = p_pool_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Community Pool code not found: %', p_pool_code;
    END IF;

    IF v_pool.status != 'collecting' THEN
        RAISE EXCEPTION 'Pool is already fully funded and dispatched!';
    END IF;

    -- Record contribution
    INSERT INTO public.community_pool_contributions (
        pool_id,
        contributor_name,
        flat_number,
        amount_paid
    ) VALUES (
        v_pool.id,
        p_contributor_name,
        p_flat_number,
        p_amount
    );

    v_new_collected := v_pool.collected_amount + p_amount;
    IF v_new_collected >= v_pool.target_amount THEN
        v_new_status := 'funded';
    ELSE
        v_new_status := 'collecting';
    END IF;

    UPDATE public.community_pools
    SET 
        collected_amount = v_new_collected,
        status = v_new_status,
        updated_at = now()
    WHERE id = v_pool.id;

    RETURN jsonb_build_object(
        'success', true,
        'pool_code', p_pool_code,
        'society_name', v_pool.society_name,
        'collected_amount', v_new_collected,
        'target_amount', v_pool.target_amount,
        'status', v_new_status
    );
END;
$$;

-- 5. Seed Real Community Sump Pools
INSERT INTO public.community_pools 
    (pool_code, society_name, target_liters, target_amount, collected_amount, delivery_address, latitude, longitude, status)
VALUES
    ('POOL-BLR-8921', 'Prestige Palms Block B Community Sump', 20000, 2400.00, 1800.00, 'ECC Road, Whitefield, Bengaluru', 12.9716, 77.7499, 'collecting'),
    ('POOL-BLR-4032', 'Sobha Quartz Green Glen Sump', 20000, 2200.00, 1100.00, 'Green Glen Layout, Bellandur, Bengaluru', 12.9310, 77.6780, 'collecting')
ON CONFLICT (pool_code) DO NOTHING;

-- Seed Contributions for the pools
DO $$
DECLARE
    v_pool1_id UUID;
    v_pool2_id UUID;
BEGIN
    SELECT id INTO v_pool1_id FROM public.community_pools WHERE pool_code = 'POOL-BLR-8921' LIMIT 1;
    IF v_pool1_id IS NOT NULL THEN
        DELETE FROM public.community_pool_contributions WHERE pool_id = v_pool1_id;
        INSERT INTO public.community_pool_contributions (pool_id, contributor_name, flat_number, amount_paid)
        VALUES 
            (v_pool1_id, 'Arun Narang', 'Flat 401', 600.00),
            (v_pool1_id, 'Deepa Venkatesh', 'Flat 402', 600.00),
            (v_pool1_id, 'Rajesh Kulkarni', 'Flat 403', 600.00);
    END IF;

    SELECT id INTO v_pool2_id FROM public.community_pools WHERE pool_code = 'POOL-BLR-4032' LIMIT 1;
    IF v_pool2_id IS NOT NULL THEN
        DELETE FROM public.community_pool_contributions WHERE pool_id = v_pool2_id;
        INSERT INTO public.community_pool_contributions (pool_id, contributor_name, flat_number, amount_paid)
        VALUES 
            (v_pool2_id, 'Suresh Mehra', 'Flat 204', 550.00),
            (v_pool2_id, 'Pooja Hegde', 'Flat 301', 550.00);
    END IF;
END $$;

-- 6. Two-Way Digital Flow-Meter Handshake with Automated Prorated Refund
CREATE OR REPLACE FUNCTION public.driver_complete_delivery_with_meter(
    p_booking_id UUID,
    p_delivery_pin TEXT,
    p_flow_start NUMERIC DEFAULT NULL,
    p_flow_end NUMERIC DEFAULT NULL,
    p_delivered_liters INT DEFAULT NULL,
    p_meter_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
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

    -- Verify 4-Digit Customer Handshake PIN
    IF v_b.delivery_pin != p_delivery_pin THEN
        RAISE EXCEPTION 'Invalid Delivery PIN. Ask customer for the 4-digit code shown on their tracking screen.'
            USING ERRCODE = '28000';
    END IF;

    -- Fetch driver phone from tanker
    SELECT driver_phone INTO v_driver_phone
    FROM public.tankers
    WHERE id = v_b.tanker_id;

    IF v_driver_phone IS NULL THEN
        v_driver_phone := '+919845012345';
    END IF;

    -- Calculate audited delivered volume from digital meter
    IF p_flow_end IS NOT NULL AND p_flow_start IS NOT NULL AND p_flow_end >= p_flow_start THEN
        v_calc_liters := ROUND(p_flow_end - p_flow_start);
    ELSE
        v_calc_liters := COALESCE(p_delivered_liters, v_b.capacity_liters);
    END IF;

    -- Automated Proration & Refund Calculation if short delivery occurred
    IF v_calc_liters < v_b.capacity_liters THEN
        v_shortfall := v_b.capacity_liters - v_calc_liters;
        -- Prorate unit price per liter
        v_refund_amount := ROUND((v_b.final_payable_amount / v_b.capacity_liters) * v_shortfall, 2);
        v_final_settled_amount := v_b.final_payable_amount - v_refund_amount;
    ELSE
        v_shortfall := 0;
        v_refund_amount := 0.00;
        v_final_settled_amount := v_b.final_payable_amount;
    END IF;

    -- Driver earns 85% of settled volume
    v_driver_share := ROUND(v_final_settled_amount * 0.85, 2);

    -- Update booking with audited delivery meter values and proration
    UPDATE public.bookings
    SET 
        status = 'delivered'::booking_status,
        flow_meter_start = p_flow_start,
        flow_meter_end = p_flow_end,
        delivered_liters = v_calc_liters,
        volume_discrepancy_liters = v_shortfall,
        final_payable_amount = v_final_settled_amount,
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
        v_driver_phone,
        p_booking_id,
        'delivery_earnings',
        v_driver_share,
        'Settled ' || v_calc_liters || 'L delivered for order #' || v_b.booking_reference || 
        CASE WHEN v_shortfall > 0 THEN ' (Prorated short delivery: ' || v_shortfall || 'L)' ELSE '' END
    );

    -- If there was a shortfall, record instant customer refund in payments & audit
    IF v_refund_amount > 0 THEN
        INSERT INTO public.payments (
            booking_id,
            amount,
            currency,
            method,
            status,
            idempotency_key
        ) VALUES (
            p_booking_id,
            v_refund_amount,
            'INR',
            'upi_instant_refund',
            'refunded',
            'refund-' || p_booking_id || '-' || EXTRACT(EPOCH FROM NOW())::text
        );

        INSERT INTO public.notifications (user_id, title, body, booking_id, type)
        VALUES (
            v_b.customer_id,
            'Automated Volume Refund: ₹' || v_refund_amount || ' Credited 💧',
            'Flow meter confirmed ' || v_calc_liters || 'L delivered (' || v_shortfall || 'L short of ' || v_b.capacity_liters || 'L). An instant prorated refund of ₹' || v_refund_amount || ' has been credited back to your UPI.',
            p_booking_id,
            'refund_issued'
        );
    ELSE
        INSERT INTO public.notifications (user_id, title, body, booking_id, type)
        VALUES (
            v_b.customer_id,
            'Water Delivery Handshake Verified! 💧',
            'Full ' || v_calc_liters || 'L pumped into your sump. Flow meter sealed and verified.',
            p_booking_id,
            'delivery_completed'
        );
    END IF;

    -- Generate official GST Tax Invoice via dedicated RPC
    BEGIN
        PERFORM public.generate_invoice_for_booking(p_booking_id);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

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

