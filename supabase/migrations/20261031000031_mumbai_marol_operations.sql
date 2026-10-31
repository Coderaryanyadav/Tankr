-- ==============================================================================
-- TANKR DATABASE MIGRATION 31: Mumbai & Marol Metropolitan Operations Overhaul
-- Transition from Bengaluru staging to Mumbai (Marol, Andheri East, Powai, Sakinaka)
-- ==============================================================================

-- 1. Update Profiles schema default city to Mumbai
ALTER TABLE public.profiles ALTER COLUMN city SET DEFAULT 'Mumbai';

-- 2. Update existing User Profiles to Mumbai & Marol
UPDATE public.profiles
SET 
    city = 'Mumbai',
    preferred_address = CASE 
        WHEN role = 'customer' THEN 'Flat 404, Marol Hill View Apartments, Marol Military Road, Andheri East, Mumbai 400059'
        WHEN role = 'supplier' THEN 'Plot No. 18, Marol MIDC Industrial Area, Andheri East, Mumbai 400059'
        WHEN role = 'driver' THEN 'Marol Naka Driver Hub, Andheri Kurla Road, Mumbai 400059'
        ELSE 'Operations HQ, Marol Fire Brigade Lane, Andheri East, Mumbai 400059'
    END,
    pincode = '400059';

-- 3. Replace Service Zones with Mumbai - Marol & Andheri Metropolitan Hubs
DELETE FROM public.service_zones;

INSERT INTO public.service_zones (zone_name, center_lat, center_lng, radius_km, traffic_multiplier, minimum_fleet_density, is_operational)
VALUES
    ('Marol / MIDC Andheri East', 19.1171, 72.8809, 5.0, 1.25, 6, true),
    ('Sakinaka / Asalpha', 19.1068, 72.8877, 4.5, 1.30, 4, true),
    ('SEEPZ / Mahakali Caves', 19.1280, 72.8790, 4.5, 1.20, 4, true),
    ('Powai / Hiranandani Gardens', 19.1197, 72.9051, 6.0, 1.35, 5, true),
    ('Chakala / JB Nagar / Airport', 19.1114, 72.8617, 4.5, 1.25, 4, true),
    ('Chandivali / Raheja Vihar', 19.1128, 72.8988, 4.0, 1.20, 3, true);

-- 4. Update Suppliers to Mumbai / Marol Entities
UPDATE public.suppliers
SET 
    business_name = CASE 
        WHEN id = 'addd79a1-bdf1-459d-a1cc-046a424b19b9' THEN 'Marol Potable Water Hub (MIDC Andheri)'
        WHEN id = 'beee79a1-bdf1-459d-a1cc-046a424b19b0' THEN 'Marol Express Water Logistics'
        ELSE 'Andheri Metropolitan Water Works'
    END,
    water_source = 'BMC Bhandup Potable Filtration Reservoir',
    gstin = '27' || UPPER(SUBSTRING(MD5(id::text), 1, 10)) || '1Z5'
WHERE id IS NOT NULL;

-- 5. Update Tankers Fleet to Mumbai (Marol, Andheri East, Sakinaka, Powai)
-- Update primary active fleet
UPDATE public.tankers SET
    vehicle_number = 'MH-02-TC-5001',
    driver_name = 'Jagdeep Yadav',
    driver_phone = '+919876543210',
    capacity_liters = 5000,
    water_type = 'Potable (Drinking)',
    base_price = 650.00,
    price_per_km = 18.00,
    is_available = true,
    is_online = true,
    latitude = 19.1175,
    longitude = 72.8812,
    heading_degrees = 45,
    gross_vehicle_weight_tonnes = 9.5,
    height_clearance_meters = 2.9,
    commercial_route_profile = 'standard_heavy'
WHERE id = '3422a32a-624e-46bd-940c-083bf7ae18f8';

UPDATE public.tankers SET
    vehicle_number = 'MH-02-TC-5002',
    driver_name = 'Suresh Kumar',
    driver_phone = '+919845012341',
    capacity_liters = 5000,
    water_type = 'Potable (Drinking)',
    base_price = 650.00,
    price_per_km = 18.00,
    is_available = true,
    is_online = true,
    latitude = 19.1220,
    longitude = 72.8725,
    heading_degrees = 90,
    gross_vehicle_weight_tonnes = 9.5,
    height_clearance_meters = 2.9,
    commercial_route_profile = 'standard_heavy'
WHERE id = 'dbd938bc-46ef-41c7-8053-4e7184ba95e5';

UPDATE public.tankers SET
    vehicle_number = 'MH-02-TN-1001',
    driver_name = 'Kiran Patil',
    driver_phone = '+919845012342',
    capacity_liters = 10000,
    water_type = 'Potable (Drinking)',
    base_price = 1100.00,
    price_per_km = 24.00,
    is_available = true,
    is_online = true,
    latitude = 19.1070,
    longitude = 72.8875,
    heading_degrees = 180,
    gross_vehicle_weight_tonnes = 16.0,
    height_clearance_meters = 3.4,
    commercial_route_profile = 'heavy_vehicle_restricted'
WHERE id = 'd2433330-1a7a-4684-b34b-6ee2b05ee603';

UPDATE public.tankers SET
    vehicle_number = 'MH-02-EQ-1201',
    driver_name = 'Anand Sharma',
    driver_phone = '+919845012343',
    capacity_liters = 10000,
    water_type = 'Potable (Drinking)',
    base_price = 1100.00,
    price_per_km = 24.00,
    is_available = true,
    is_online = true,
    latitude = 19.1285,
    longitude = 72.8795,
    heading_degrees = 270,
    gross_vehicle_weight_tonnes = 16.0,
    height_clearance_meters = 3.4,
    commercial_route_profile = 'heavy_vehicle_restricted'
WHERE id = '58205e94-3ecd-4b3d-a325-bc8322e3ccfc';

UPDATE public.tankers SET
    vehicle_number = 'MH-02-HV-2002',
    driver_name = 'Dhananjay Singh',
    driver_phone = '+919845012344',
    capacity_liters = 20000,
    water_type = 'Potable (Drinking)',
    base_price = 2200.00,
    price_per_km = 32.00,
    is_available = true,
    is_online = true,
    latitude = 19.1195,
    longitude = 72.9055,
    heading_degrees = 15,
    gross_vehicle_weight_tonnes = 28.0,
    height_clearance_meters = 3.8,
    commercial_route_profile = 'heavy_vehicle_restricted'
WHERE id = '3761ab6c-b9af-4775-81a8-b72774b47715';

UPDATE public.tankers SET
    vehicle_number = 'MH-02-MN-1002',
    driver_name = 'Manjunath Rao',
    driver_phone = '+919845012345',
    capacity_liters = 2000,
    water_type = 'Potable (Drinking)',
    base_price = 450.00,
    price_per_km = 15.00,
    is_available = true,
    is_online = true,
    latitude = 19.1135,
    longitude = 72.8995,
    heading_degrees = 120,
    gross_vehicle_weight_tonnes = 4.5,
    height_clearance_meters = 2.4,
    commercial_route_profile = 'standard_heavy'
WHERE id = 'd6d3cdc9-9c4d-431c-abb8-ca4aefb97cf6';

-- Deactivate or reposition all other test tankers to Mumbai Marol
UPDATE public.tankers SET
    is_available = false,
    is_online = false,
    latitude = 19.1171,
    longitude = 72.8809
WHERE id NOT IN (
    '3422a32a-624e-46bd-940c-083bf7ae18f8',
    'dbd938bc-46ef-41c7-8053-4e7184ba95e5',
    'd2433330-1a7a-4684-b34b-6ee2b05ee603',
    '58205e94-3ecd-4b3d-a325-bc8322e3ccfc',
    '3761ab6c-b9af-4775-81a8-b72774b47715',
    'd6d3cdc9-9c4d-431c-abb8-ca4aefb97cf6'
);

-- Update PostGIS geometry column for all tankers
UPDATE public.tankers 
SET current_location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 6. Update Emergency Dispatches for Mumbai & Marol Hospitals
DELETE FROM public.emergency_dispatches;

INSERT INTO public.emergency_dispatches (
    institution_name,
    institution_type,
    contact_person,
    contact_phone,
    delivery_address,
    latitude,
    longitude,
    required_liters,
    water_type,
    sla_minutes,
    status
) VALUES
    ('SevenHills Hospital (Marol)', 'hospital_dialysis', 'Dr. Hemant Deshmukh (Dialysis Dir.)', '+919820155001', 'Marol Maroshi Road, Andheri East, Mumbai 400059', 19.1235, 72.8815, 20000, 'Potable (Drinking)', 20, 'en_route'),
    ('Holy Spirit Hospital ICU', 'icu_facility', 'Dr. Sister Sneha (Medical Superintendent)', '+919820155002', 'Mahakali Caves Road, Andheri East, Mumbai 400093', 19.1275, 72.8690, 15000, 'Potable (Drinking)', 20, 'en_route'),
    ('Dr. L H Hiranandani Hospital', 'hospital_dialysis', 'Col. Dr. B. Roy (Emergency Ops)', '+919820155003', 'Hillside Avenue, Hiranandani Gardens, Powai, Mumbai 400076', 19.1190, 72.9080, 25000, 'Potable (Drinking)', 25, 'en_route');

-- 7. Update Corporate Subscriptions for Mumbai & Marol Commercial Hubs
DELETE FROM public.corporate_subscriptions;

INSERT INTO public.corporate_subscriptions (
    client_name,
    category,
    contact_person,
    contact_phone,
    delivery_address,
    latitude,
    longitude,
    daily_liters,
    frequency_per_day,
    preferred_time_slot,
    monthly_rate,
    status,
    assigned_supplier_name
) VALUES
    ('Boomerang Business Park', 'tech_park', 'Rajesh Nair (Estate Head)', '+919820011221', 'Chandivali Farm Road, Andheri East, Mumbai 400072', 19.1128, 72.8988, 30000, 2, '05:30 AM - 07:30 AM', 125000.00, 'active', 'Marol Potable Water Hub (MIDC Andheri)'),
    ('SEEPZ Special Economic Zone', 'tech_park', 'Amitabh Sengupta (Admin Director)', '+919820011222', 'Gate No. 1, SEEPZ, Andheri East, Mumbai 400096', 19.1280, 72.8790, 50000, 3, '06:00 AM - 09:00 AM', 195000.00, 'active', 'Marol Potable Water Hub (MIDC Andheri)'),
    ('Hiranandani Business Park', 'commercial', 'Vikramaditya Rao (VP Facilities)', '+919820011223', 'Central Avenue, Hiranandani Gardens, Powai, Mumbai 400076', 19.1197, 72.9051, 40000, 2, '06:00 AM - 08:00 AM', 160000.00, 'active', 'Marol Potable Water Hub (MIDC Andheri)'),
    ('Lotus Corporate Park', 'commercial', 'Sandeep Mehta (Operations Mgr)', '+919820011224', 'Western Express Highway, Goregaon / Andheri East, Mumbai', 19.1310, 72.8590, 25000, 1, '07:00 AM - 09:00 AM', 105000.00, 'active', 'Marol Potable Water Hub (MIDC Andheri)');

-- 8. Update Community Pools for Marol & Andheri Societies
DELETE FROM public.community_pools;

INSERT INTO public.community_pools (
    pool_code,
    society_name,
    target_liters,
    target_amount,
    collected_amount,
    delivery_address,
    latitude,
    longitude,
    status
) VALUES
    ('POOL-MUM-4001', 'Marol Hill View Cooperative Housing Society', 20000, 2200.00, 1650.00, 'Marol Military Road, Andheri East, Mumbai 400059', 19.1180, 72.8810, 'collecting'),
    ('POOL-MUM-4002', 'Raheja Vihar Complex Wing C Sump', 20000, 2200.00, 1100.00, 'Raheja Vihar, Chandivali, Andheri East, Mumbai 400072', 19.1130, 72.8990, 'collecting'),
    ('POOL-MUM-4003', 'Hiranandani Glen Classic Society Sump', 20000, 2400.00, 2400.00, 'Cliff Avenue, Hiranandani Gardens, Powai, Mumbai 400076', 19.1210, 72.9060, 'funded');

-- 9. Update Water Quality Certificates for Mumbai Water Authorities
DELETE FROM public.water_quality_certificates;

INSERT INTO public.water_quality_certificates (
    supplier_id,
    source_type,
    lab_name,
    test_report_number,
    tds_ppm,
    ph_level,
    turbidity_ntu,
    coliform_detected,
    certified_date,
    expiry_date,
    is_potable,
    certificate_url
) VALUES
    ('addd79a1-bdf1-459d-a1cc-046a424b19b9', 'Municipal Supply (BMC Bhandup)', 'Envirocare Laboratories (NABL Accredited - Mumbai)', 'MUM/ENV/2026/8912', 142.50, 7.20, 0.45, false, CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE + INTERVAL '78 days', true, 'https://tankr.in/cert/MUM-BHANDUP-8912.pdf'),
    ('addd79a1-bdf1-459d-a1cc-046a424b19b9', 'Vihar Lake Filtration Node', 'GeoChem Laboratories Mumbai (NABL ISO 17025)', 'MUM/GEO/2026/4102', 168.00, 7.35, 0.62, false, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '85 days', true, 'https://tankr.in/cert/MUM-VIHAR-4102.pdf');

-- 10. Update Saved Addresses for Customer Profiles to Marol, Mumbai
DELETE FROM public.saved_addresses;

INSERT INTO public.saved_addresses (
    user_id,
    label,
    custom_name,
    flat_or_building,
    street_address,
    landmark,
    city,
    pincode,
    latitude,
    longitude,
    is_default
)
SELECT 
    p.id,
    'home',
    'Home (Marol)',
    'Flat 404, Marol Hill View Apartments',
    'Marol Military Road, Andheri East',
    'Near Marol Fire Brigade, Opposite SevenHills',
    'Mumbai',
    '400059',
    19.1171,
    72.8809,
    true
FROM public.profiles p
WHERE p.role = 'customer';

INSERT INTO public.saved_addresses (
    user_id,
    label,
    custom_name,
    flat_or_building,
    street_address,
    landmark,
    city,
    pincode,
    latitude,
    longitude,
    is_default
)
SELECT 
    p.id,
    'work',
    'Office (Chandivali)',
    'Unit 302, Boomerang Business Park',
    'Chandivali Farm Road, Andheri East',
    'Near Raheja Vihar Gate 2',
    'Mumbai',
    '400072',
    19.1128,
    72.8988,
    false
FROM public.profiles p
WHERE p.role = 'customer';
