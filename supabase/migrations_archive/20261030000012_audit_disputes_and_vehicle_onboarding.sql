-- ==============================================================================
-- TANKR DATABASE MIGRATION 12: Admin Audit Logs, Supplier Identity Uniqueness,
-- Customer Dispute Handling & Fleet Vehicle Onboarding
-- ==============================================================================

-- 1. Admin Audit Trail Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.admin_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Suspended / Blacklisted Entities Table (Prevents Re-registration)
CREATE TABLE IF NOT EXISTS public.suspended_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('gstin', 'phone', 'pan', 'vehicle_reg')),
    identifier_value TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    suspended_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.suspended_entities ENABLE ROW LEVEL SECURITY;

-- 3. Supplier Identity Uniqueness Constraints
-- Deduplicate existing test seed data first
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER () as rn
    FROM public.suppliers
    WHERE gstin = '29AABCS1429B1Z8'
)
UPDATE public.suppliers s
SET gstin = '29AABCS' || UPPER(SUBSTRING(MD5(s.id::text) FROM 1 FOR 4)) || '1Z' || numbered.rn
FROM numbered
WHERE s.id = numbered.id;

DO $$ BEGIN
    ALTER TABLE public.suppliers ADD CONSTRAINT uq_suppliers_gstin UNIQUE (gstin);
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.suppliers ADD CONSTRAINT uq_suppliers_phone UNIQUE (contact_phone);
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.supplier_registrations ADD CONSTRAINT uq_sup_reg_gstin UNIQUE (gst_number);
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.supplier_registrations ADD CONSTRAINT uq_sup_reg_phone UNIQUE (phone_number);
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.tankers ADD CONSTRAINT uq_tankers_vehicle_num UNIQUE (vehicle_number);
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN duplicate_table THEN null;
END $$;

-- 4. Supplier Registration RPC (With Identity Uniqueness & Blacklist Verification)
CREATE OR REPLACE FUNCTION register_supplier(
    p_business_name TEXT,
    p_owner_name TEXT,
    p_phone_number TEXT,
    p_business_address TEXT,
    p_gst_number TEXT,
    p_water_source TEXT,
    p_operating_areas TEXT[],
    p_tanker_count INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_phone TEXT;
    v_clean_gst TEXT;
    v_reg_id UUID;
    v_supplier_id UUID;
BEGIN
    v_clean_phone := TRIM(p_phone_number);
    v_clean_gst := UPPER(TRIM(p_gst_number));

    -- Check if blacklisted
    IF EXISTS (
        SELECT 1 FROM public.suspended_entities
        WHERE identifier_value IN (v_clean_phone, v_clean_gst)
    ) THEN
        RAISE EXCEPTION 'Registration Rejected: This business entity or phone number has been permanently suspended for regulatory compliance violations.'
            USING ERRCODE = '23505';
    END IF;

    -- Check if already registered
    IF EXISTS (SELECT 1 FROM public.suppliers WHERE gstin = v_clean_gst OR contact_phone = v_clean_phone) OR
       EXISTS (SELECT 1 FROM public.supplier_registrations WHERE gst_number = v_clean_gst OR phone_number = v_clean_phone) THEN
        RAISE EXCEPTION 'Registration Error: A supplier with this GSTIN or Phone number is already registered or pending review.'
            USING ERRCODE = '23505';
    END IF;

    -- Insert into supplier_registrations with pending KYC review
    INSERT INTO public.supplier_registrations (
        profile_id,
        business_name,
        owner_name,
        phone_number,
        business_address,
        operating_areas,
        gst_number,
        tanker_count,
        approval_status
    ) VALUES (
        auth.uid(),
        p_business_name,
        p_owner_name,
        v_clean_phone,
        p_business_address,
        p_operating_areas,
        v_clean_gst,
        p_tanker_count,
        'pending'
    ) RETURNING id INTO v_reg_id;

    -- Also create inactive supplier record waiting for admin verification
    INSERT INTO public.suppliers (
        business_name,
        contact_phone,
        city,
        service_areas,
        is_verified,
        verification_status,
        gstin,
        water_source
    ) VALUES (
        p_business_name,
        v_clean_phone,
        'Bengaluru',
        p_operating_areas,
        FALSE,
        'pending_review',
        v_clean_gst,
        p_water_source
    ) RETURNING id INTO v_supplier_id;

    -- Update user profile to role 'supplier'
    UPDATE public.profiles
    SET role = 'supplier'
    WHERE id = auth.uid();

    RETURN jsonb_build_object(
        'success', true,
        'registration_id', v_reg_id,
        'supplier_id', v_supplier_id,
        'status', 'pending_review',
        'message', 'Supplier application submitted successfully. Under Admin KYC review.'
    );
END;
$$;

-- 5. Fleet Vehicle Onboarding RPC for Suppliers
CREATE OR REPLACE FUNCTION supplier_onboard_tanker(
    p_supplier_id UUID,
    p_vehicle_number TEXT,
    p_capacity_liters INT,
    p_water_type TEXT,
    p_driver_name TEXT,
    p_driver_phone TEXT,
    p_base_price NUMERIC(10,2) DEFAULT 750.00,
    p_price_per_km NUMERIC(10,2) DEFAULT 25.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_veh TEXT;
    v_tanker_id UUID;
BEGIN
    v_clean_veh := UPPER(TRIM(p_vehicle_number));

    -- Check if vehicle is suspended
    IF EXISTS (
        SELECT 1 FROM public.suspended_entities
        WHERE entity_type = 'vehicle_reg' AND identifier_value = v_clean_veh
    ) THEN
        RAISE EXCEPTION 'Vehicle Rejected: This vehicle registration has been flagged for safety compliance violations.'
            USING ERRCODE = '23505';
    END IF;

    -- Insert into tankers
    INSERT INTO public.tankers (
        supplier_id,
        vehicle_number,
        capacity_liters,
        water_type,
        driver_name,
        driver_phone,
        base_price,
        price_per_km,
        is_online,
        is_available,
        current_latitude,
        current_longitude
    ) VALUES (
        p_supplier_id,
        v_clean_veh,
        p_capacity_liters,
        p_water_type,
        p_driver_name,
        p_driver_phone,
        p_base_price,
        p_price_per_km,
        TRUE,
        TRUE,
        12.9716,
        77.5946
    ) RETURNING id INTO v_tanker_id;

    RETURN jsonb_build_object(
        'success', true,
        'tanker_id', v_tanker_id,
        'vehicle_number', v_clean_veh,
        'capacity_liters', p_capacity_liters
    );
END;
$$;

-- 6. Customer Disputes Extension & Submission RPC
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'short_delivery';
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS liters_received INT DEFAULT NULL;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS evidence_url TEXT DEFAULT NULL;

DROP POLICY IF EXISTS "Customers can manage own disputes" ON public.disputes;
CREATE POLICY "Customers can manage own disputes"
    ON public.disputes
    FOR ALL
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

CREATE OR REPLACE FUNCTION submit_customer_dispute(
    p_booking_id UUID,
    p_category TEXT,
    p_reason TEXT,
    p_liters_received INT DEFAULT NULL,
    p_evidence_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking RECORD;
    v_dispute_id UUID;
BEGIN
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id
      AND customer_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found or not owned by caller' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.disputes (
        booking_id,
        customer_id,
        supplier_id,
        category,
        reason,
        liters_received,
        evidence_url,
        status
    ) VALUES (
        p_booking_id,
        auth.uid(),
        v_booking.supplier_id,
        p_category,
        p_reason,
        p_liters_received,
        p_evidence_url,
        'open'
    ) RETURNING id INTO v_dispute_id;

    -- Update booking status to disputed
    UPDATE public.bookings
    SET status = 'disputed'::booking_status
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'dispute_id', v_dispute_id,
        'status', 'open',
        'message', 'Dispute ticket raised. TANKR operations team is investigating.'
    );
END;
$$;

-- 7. Admin Action with Automatic Audit Logging
CREATE OR REPLACE FUNCTION admin_resolve_dispute(
    p_dispute_id UUID,
    p_status TEXT,
    p_refund_amount NUMERIC(10,2),
    p_notes TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_disp RECORD;
BEGIN
    -- Verify admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Access Denied: Admin role required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_disp
    FROM public.disputes
    WHERE id = p_dispute_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Dispute not found';
    END IF;

    UPDATE public.disputes
    SET 
        status = p_status,
        refund_amount = p_refund_amount,
        admin_notes = p_notes,
        resolved_at = NOW()
    WHERE id = p_dispute_id;

    -- Write to audit log
    INSERT INTO public.admin_audit_logs (
        admin_id,
        action,
        target_type,
        target_id,
        previous_state,
        new_state,
        notes
    ) VALUES (
        auth.uid(),
        'resolve_dispute',
        'dispute',
        p_dispute_id::TEXT,
        to_jsonb(v_disp),
        jsonb_build_object('status', p_status, 'refund_amount', p_refund_amount, 'admin_notes', p_notes),
        p_notes
    );

    RETURN TRUE;
END;
$$;
