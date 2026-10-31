-- ==============================================================================
-- TANKR DATABASE MIGRATION 27: Purge Staging Duplicate Tankers & Ensure Clean Spatial Distribution
-- ==============================================================================

-- 1. Remove all test tankers and any linked test bookings
DELETE FROM public.bookings
WHERE tanker_id IN (
    SELECT id FROM public.tankers WHERE vehicle_number LIKE '%TEST%'
);

DELETE FROM public.tankers
WHERE vehicle_number LIKE '%TEST%';

-- 2. Ensure distinct, realistically spaced fleet across Bangalore hubs
UPDATE public.tankers SET latitude = 12.9352, longitude = 77.6245 WHERE vehicle_number = 'KA-04-TC-5001'; -- Koramangala
UPDATE public.tankers SET latitude = 12.9716, longitude = 77.6412 WHERE vehicle_number = 'KA-05-TC-5002'; -- Indiranagar
UPDATE public.tankers SET latitude = 12.9121, longitude = 77.6446 WHERE vehicle_number = 'KA-51-TN-1001'; -- HSR Layout
UPDATE public.tankers SET latitude = 12.9850, longitude = 77.7200 WHERE vehicle_number = 'KA-01-EQ-1201'; -- Whitefield
UPDATE public.tankers SET latitude = 12.9260, longitude = 77.6762 WHERE vehicle_number = 'KA-51-HV-2002'; -- Bellandur
UPDATE public.tankers SET latitude = 12.8452, longitude = 77.6602 WHERE vehicle_number = 'KA-04-HV-2001'; -- Electronic City
UPDATE public.tankers SET latitude = 12.9250, longitude = 77.5938 WHERE vehicle_number = 'KA-53-TN-1002'; -- Jayanagar
UPDATE public.tankers SET latitude = 12.9900, longitude = 77.5500 WHERE vehicle_number = 'KA-03-FA-2002'; -- Rajajinagar
UPDATE public.tankers SET latitude = 12.9600, longitude = 77.6500 WHERE vehicle_number = 'KA-01-MJ-1001'; -- Domlur

