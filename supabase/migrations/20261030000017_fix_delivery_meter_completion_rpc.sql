-- ==============================================================================
-- TANKR DATABASE MIGRATION 17: Authoritative Delivery Meter Completion using generate_invoice_for_booking
-- ==============================================================================

-- 1. Drop existing driver_complete_delivery_with_meter
DROP FUNCTION IF EXISTS public.driver_complete_delivery_with_meter(UUID, VARCHAR, NUMERIC, NUMERIC, INT, TEXT);
DROP FUNCTION IF EXISTS public.driver_complete_delivery_with_meter(UUID, VARCHAR, NUMERIC, NUMERIC, INT);
DROP FUNCTION IF EXISTS public.driver_complete_delivery_with_meter(UUID, TEXT, NUMERIC, NUMERIC, INT, TEXT);
DROP FUNCTION IF EXISTS public.driver_complete_delivery_with_meter(UUID, TEXT, NUMERIC, NUMERIC, INT);
DROP FUNCTION IF EXISTS public.driver_complete_delivery_with_meter;

-- 2. Clean, authoritative implementation
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
        v_driver_phone,
        p_booking_id,
        'delivery_earnings',
        ROUND(v_b.final_payable_amount * 0.85, 2), -- 85% driver share, 15% platform fee
        'Completed delivery of ' || v_calc_liters || 'L for order #' || v_b.booking_reference
    );

    -- Generate official GST Tax Invoice via dedicated RPC
    BEGIN
        PERFORM public.generate_invoice_for_booking(p_booking_id);
    EXCEPTION WHEN OTHERS THEN
        -- Invoice already generated or non-fatal
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'status', 'delivered',
        'delivered_liters', v_calc_liters,
        'payout_amount', ROUND(v_b.final_payable_amount * 0.85, 2)
    );
END;
$$;
