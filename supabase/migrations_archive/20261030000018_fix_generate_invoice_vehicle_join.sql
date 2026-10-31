-- ==============================================================================
-- TANKR DATABASE MIGRATION 18: Fix generate_invoice_for_booking vehicle join
-- Joins public.tankers to correctly populate vehicle_number on invoices
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.generate_invoice_for_booking(p_booking_id UUID)
RETURNS TABLE (
    invoice_id UUID,
    invoice_number TEXT,
    total_amount NUMERIC(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_b RECORD;
    v_inv_ref TEXT;
    v_inv_id UUID;
    v_cust_name TEXT;
    v_cust_phone TEXT;
BEGIN
    SELECT 
        b.*, 
        s.business_name AS supplier_business_name,
        p.full_name AS profile_name, 
        p.phone_number AS profile_phone,
        t.vehicle_number AS tanker_vehicle_number
    INTO v_b
    FROM public.bookings b
    JOIN public.suppliers s ON s.id = b.supplier_id
    JOIN public.profiles p ON p.id = b.customer_id
    LEFT JOIN public.tankers t ON t.id = b.tanker_id
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    v_inv_ref := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::text, 5, '0');
    v_cust_name := COALESCE(v_b.profile_name, 'Valued Customer');
    v_cust_phone := COALESCE(v_b.profile_phone, '+919876543210');

    INSERT INTO public.invoices (
        booking_id,
        invoice_number,
        customer_id,
        customer_name,
        customer_phone,
        supplier_name,
        vehicle_number,
        capacity_liters,
        delivery_address,
        base_amount,
        delivery_charge,
        surcharge,
        tax_amount,
        total_amount,
        payment_method,
        payment_status
    )
    VALUES (
        p_booking_id,
        v_inv_ref,
        v_b.customer_id,
        v_cust_name,
        v_cust_phone,
        v_b.supplier_business_name,
        COALESCE(v_b.tanker_vehicle_number, 'KA-04-TC-5001'),
        v_b.capacity_liters,
        v_b.delivery_address,
        v_b.base_price,
        v_b.delivery_charge,
        v_b.surcharge,
        v_b.tax_amount,
        v_b.final_payable_amount,
        v_b.payment_preference::text,
        'PAID'
    )
    RETURNING id INTO v_inv_id;

    -- Add delivery completed notification
    INSERT INTO public.notifications (user_id, title, body, booking_id, type)
    VALUES (
        v_b.customer_id,
        'Water Delivery Completed! 💧',
        'Your ' || v_b.capacity_liters || 'L water tanker delivery is verified and completed. Official invoice ' || v_inv_ref || ' is ready.',
        p_booking_id,
        'delivery_completed'
    );

    RETURN QUERY
    SELECT v_inv_id, v_inv_ref, v_b.final_payable_amount;
END;
$$;
