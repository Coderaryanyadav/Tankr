-- ==============================================================================
-- TANKR DATABASE MIGRATION 26: Set roles for sequential test numbers
-- ==============================================================================

UPDATE public.profiles
SET full_name = 'Aryan Yadav',
    role = 'customer',
    is_onboarding_completed = TRUE,
    city = 'Bengaluru',
    pincode = '560103'
WHERE phone_number IN ('919000000001', '+919000000001');

UPDATE public.profiles
SET full_name = 'Jagdeep Yadav',
    role = 'driver',
    is_onboarding_completed = TRUE,
    city = 'Bengaluru',
    pincode = '560103'
WHERE phone_number IN ('919000000002', '+919000000002');

UPDATE public.profiles
SET full_name = 'Admin',
    role = 'admin',
    is_onboarding_completed = TRUE,
    city = 'Bengaluru',
    pincode = '560001'
WHERE phone_number IN ('919000000003', '+919000000003');

UPDATE public.profiles
SET full_name = 'Seema Water Hub',
    role = 'supplier',
    is_onboarding_completed = TRUE,
    city = 'Bengaluru',
    pincode = '560066'
WHERE phone_number IN ('919000000004', '+919000000004');

