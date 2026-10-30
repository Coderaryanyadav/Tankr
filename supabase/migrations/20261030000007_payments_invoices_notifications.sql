-- ==============================================================================
-- TANKR DATABASE MIGRATION: Payments, Invoices & Notification Triggers
-- ==============================================================================

-- 1. Payments Table with Idempotency Protection
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    gateway_order_id TEXT NOT NULL,
    gateway_payment_id TEXT,
    gateway_signature TEXT,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    method TEXT NOT NULL DEFAULT 'upi',
    status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Official Tax Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    supplier_gstin TEXT NOT NULL DEFAULT '29AABCS1429B1Z8',
    vehicle_number TEXT NOT NULL,
    capacity_liters INT NOT NULL,
    delivery_address TEXT NOT NULL,
    base_amount NUMERIC(10,2) NOT NULL,
    delivery_charge NUMERIC(10,2) NOT NULL,
    surcharge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'PAID',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (auth.uid() = customer_id);

CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- 4. Server-Side Invoice Generation RPC: generate_invoice_for_booking
CREATE OR REPLACE FUNCTION generate_invoice_for_booking(p_booking_id UUID)
RETURNS TABLE (
    invoice_id UUID,
    invoice_number TEXT,
    total_amount NUMERIC(10,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_b RECORD;
    v_inv_ref TEXT;
    v_inv_id UUID;
    v_cust_name TEXT;
    v_cust_phone TEXT;
BEGIN
    SELECT 
        b.*, s.business_name AS supplier_business_name,
        p.full_name AS profile_name, p.phone_number AS profile_phone
    INTO v_b
    FROM public.bookings b
    JOIN public.suppliers s ON s.id = b.supplier_id
    JOIN public.profiles p ON p.id = b.customer_id
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
        COALESCE(v_b.vehicle_number, 'KA-04-TC-5001'),
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
        'Your invoice ' || v_inv_ref || ' for ₹' || v_b.final_payable_amount || ' is available for download.',
        p_booking_id,
        'delivery_completed'
    );

    RETURN QUERY
    SELECT v_inv_id, v_inv_ref, v_b.final_payable_amount;
END;
$$;

