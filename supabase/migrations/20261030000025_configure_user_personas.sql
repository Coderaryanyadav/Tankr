-- ==============================================================================
-- TANKR DATABASE MIGRATION 25: Seed Exact User Personas
-- ==============================================================================

-- 1. Ensure Seema Water Hub Supplier exists in public.suppliers
INSERT INTO public.suppliers (id, business_name, contact_phone, is_verified, verification_status, rating, total_deliveries)
VALUES (
    'addd79a1-bdf1-459d-a1cc-046a424b19b9',
    'Seema Water Hub',
    '+919999999999',
    TRUE,
    'verified',
    4.9,
    420
)
ON CONFLICT (id) DO UPDATE
SET business_name = 'Seema Water Hub',
    contact_phone = '+919999999999',
    is_verified = TRUE,
    verification_status = 'verified';

-- Also insert alias for 9000000004
INSERT INTO public.suppliers (id, business_name, contact_phone, is_verified, verification_status, rating, total_deliveries)
VALUES (
    'beee79a1-bdf1-459d-a1cc-046a424b19b0',
    'Seema Water Hub',
    '+919000000004',
    TRUE,
    'verified',
    4.9,
    420
)
ON CONFLICT (id) DO UPDATE
SET business_name = 'Seema Water Hub',
    contact_phone = '+919000000004',
    is_verified = TRUE,
    verification_status = 'verified';

-- 2. Link Tankers to Driver Jagdeep Yadav under Seema Water Hub
UPDATE public.tankers
SET driver_name = 'Jagdeep Yadav',
    driver_phone = '+919876543210',
    supplier_id = 'addd79a1-bdf1-459d-a1cc-046a424b19b9',
    is_available = TRUE,
    is_online = TRUE,
    capacity_liters = 5000,
    base_price = 750.00,
    price_per_km = 25.00
WHERE vehicle_number = 'KA-04-E-2024';

UPDATE public.tankers
SET driver_name = 'Jagdeep Yadav',
    driver_phone = '+919000000002',
    supplier_id = 'beee79a1-bdf1-459d-a1cc-046a424b19b0',
    is_available = TRUE,
    is_online = TRUE,
    capacity_liters = 10000,
    base_price = 1200.00,
    price_per_km = 30.00
WHERE vehicle_number = 'KA-01-MJ-1001';

-- 3. Configure Customer: Aryan Yadav
UPDATE public.profiles
SET full_name = 'Aryan Yadav',
    role = 'customer',
    is_onboarding_completed = TRUE,
    preferred_address = 'Flat 402, Bellandur, Bengaluru',
    city = 'Bengaluru',
    pincode = '560103'
WHERE phone_number IN ('919845012345', '+919845012345', '919000000001', '+919000000001');

-- 4. Configure Driver: Jagdeep Yadav
UPDATE public.profiles
SET full_name = 'Jagdeep Yadav',
    role = 'driver',
    is_onboarding_completed = TRUE,
    city = 'Bengaluru',
    pincode = '560103'
WHERE phone_number IN ('919876543210', '+919876543210', '919000000002', '+919000000002');

-- 5. Configure Admin: Admin
UPDATE public.profiles
SET full_name = 'Admin',
    role = 'admin',
    is_onboarding_completed = TRUE,
    city = 'Bengaluru',
    pincode = '560001'
WHERE phone_number IN ('918888888888', '+918888888888', '919000000003', '+919000000003');

-- 6. Configure Supplier: Seema Water Hub
UPDATE public.profiles
SET full_name = 'Seema Water Hub',
    role = 'supplier',
    is_onboarding_completed = TRUE,
    preferred_address = 'Industrial Layout, Whitefield, Bengaluru',
    city = 'Bengaluru',
    pincode = '560066'
WHERE phone_number IN ('919999999999', '+919999999999', '919000000004', '+919000000004');

