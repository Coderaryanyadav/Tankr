-- ==============================================================================
-- TANKR DATABASE MIGRATION 14: Quote Expiry, Telemetry Tracking Privacy, & KYC Storage
-- Sprint 3 (Quote Expiry & SLA), Sprint 4 (Tracking Privacy), Sprint 2 (KYC Documents)
-- ==============================================================================

-- 1. Add quote_expires_at to public.bookings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'bookings' 
          AND column_name = 'quote_expires_at'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN quote_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes');
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_quote_expiry 
ON public.bookings (status, quote_expires_at) 
WHERE status = 'pending';

-- 2. RPC: expire_stale_booking_quotes
-- Background scheduled worker / cron or client polling triggers this to auto-cancel expired quotes
CREATE OR REPLACE FUNCTION expire_stale_booking_quotes()
RETURNS TABLE (
    expired_booking_id UUID,
    expired_reference TEXT,
    cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH expired AS (
        UPDATE public.bookings
        SET 
            status = 'cancelled',
            cancellation_reason = 'Quote expired: No supplier accepted within the 10-minute dispatch SLA',
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE status = 'pending'
          AND quote_expires_at < NOW()
        RETURNING id, booking_reference, public.bookings.cancelled_at
    )
    SELECT id, booking_reference, expired.cancelled_at FROM expired;
END;
$$;

-- 3. Telemetry Tracking Privacy Policy on public.tracking_breadcrumbs
-- Hardens RLS to ensure customers can ONLY view telemetry during active trips
DROP POLICY IF EXISTS "Authorized booking participants can read breadcrumbs" ON public.tracking_breadcrumbs;
DROP POLICY IF EXISTS "Customers can view active driver telemetry" ON public.tracking_breadcrumbs;

CREATE POLICY "Customers can view active driver telemetry"
    ON public.tracking_breadcrumbs FOR SELECT
    USING (
        -- Admins can view all telemetry
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        -- Booking customer can ONLY view if booking is in an active in-transit state
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = public.tracking_breadcrumbs.booking_id
              AND b.customer_id = auth.uid()
              AND b.status IN ('accepted', 'driver_assigned', 'en_route', 'arrived', 'delivering')
        )
        OR
        -- Driver or Supplier assigned to this booking can view
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = public.tracking_breadcrumbs.booking_id
              AND (
                  b.supplier_id IN (
                      SELECT s.id FROM public.suppliers s
                      JOIN public.profiles p ON p.phone_number = s.contact_phone
                      WHERE p.id = auth.uid()
                  )
                  OR auth.uid() IN (SELECT dp.profile_id FROM public.driver_profiles dp WHERE dp.assigned_tanker_id = b.tanker_id)
              )
        )
    );

-- 4. KYC Documents Table (Sprint 2)
CREATE TABLE IF NOT EXISTS public.kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL, -- references suppliers.id or profiles.id
    entity_type TEXT NOT NULL CHECK (entity_type IN ('supplier', 'driver', 'tanker')),
    document_type TEXT NOT NULL CHECK (document_type IN ('gst_certificate', 'pan_card', 'aadhaar_card', 'driving_license', 'vehicle_rc', 'fitness_certificate', 'water_quality_report')),
    document_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    rejection_reason TEXT,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_docs_entity ON public.kyc_documents (entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_kyc_docs_status ON public.kyc_documents (verification_status);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entity owners can view own KYC documents" ON public.kyc_documents;
CREATE POLICY "Entity owners can view own KYC documents"
    ON public.kyc_documents FOR SELECT
    USING (
        auth.uid() = entity_id 
        OR EXISTS (
            SELECT 1 FROM public.suppliers s 
            JOIN public.profiles p ON p.phone_number = s.contact_phone
            WHERE s.id = public.kyc_documents.entity_id AND p.id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Entity owners can upload KYC documents" ON public.kyc_documents;
CREATE POLICY "Entity owners can upload KYC documents"
    ON public.kyc_documents FOR INSERT
    WITH CHECK (
        auth.uid() = entity_id 
        OR EXISTS (
            SELECT 1 FROM public.suppliers s 
            JOIN public.profiles p ON p.phone_number = s.contact_phone
            WHERE s.id = public.kyc_documents.entity_id AND p.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can update KYC document verification" ON public.kyc_documents;
CREATE POLICY "Admins can update KYC document verification"
    ON public.kyc_documents FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
