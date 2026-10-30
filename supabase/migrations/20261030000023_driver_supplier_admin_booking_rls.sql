-- ==============================================================================
-- TANKR DATABASE MIGRATION 23: Complete RLS for Drivers, Suppliers & Admins on Bookings
-- ==============================================================================

-- 1. Drivers can view bookings assigned to them
DROP POLICY IF EXISTS "Drivers can view assigned bookings" ON public.bookings;
CREATE POLICY "Drivers can view assigned bookings"
    ON public.bookings FOR SELECT
    USING (
        driver_phone IN (
            SELECT phone_number FROM public.profiles WHERE id = auth.uid()
            UNION
            SELECT '+' || phone_number FROM public.profiles WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('driver', 'admin')
        )
    );

-- 2. Drivers can update their assigned bookings (e.g. status en_route, arrived, delivering)
DROP POLICY IF EXISTS "Drivers can update assigned bookings" ON public.bookings;
CREATE POLICY "Drivers can update assigned bookings"
    ON public.bookings FOR UPDATE
    USING (
        driver_phone IN (
            SELECT phone_number FROM public.profiles WHERE id = auth.uid()
            UNION
            SELECT '+' || phone_number FROM public.profiles WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('driver', 'admin')
        )
    )
    WITH CHECK (
        driver_phone IN (
            SELECT phone_number FROM public.profiles WHERE id = auth.uid()
            UNION
            SELECT '+' || phone_number FROM public.profiles WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('driver', 'admin')
        )
    );

-- 3. Suppliers can view bookings assigned to their fleet
DROP POLICY IF EXISTS "Suppliers can view hub bookings" ON public.bookings;
CREATE POLICY "Suppliers can view hub bookings"
    ON public.bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.suppliers s
            JOIN public.profiles p ON (s.contact_phone = p.phone_number OR s.contact_phone = '+' || p.phone_number)
            WHERE p.id = auth.uid() AND s.id = public.bookings.supplier_id
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('supplier', 'admin')
        )
    );

-- 4. Admins have unrestricted access to all bookings for surveillance & dispute resolution
DROP POLICY IF EXISTS "Admins have full access to bookings" ON public.bookings;
CREATE POLICY "Admins have full access to bookings"
    ON public.bookings FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
