-- ====================================================================
-- TANKR Migration: Clean Staging Data & Seed Real Supabase Locations
-- ====================================================================

-- 1. Purge all test transactions, bookings, and transient event logs
DELETE FROM public.payments;
DELETE FROM public.invoices;
DELETE FROM public.disputes;
DELETE FROM public.tracking_breadcrumbs;
DELETE FROM public.notifications;
DELETE FROM public.admin_audit_logs;
DELETE FROM public.bookings;

-- 2. Clean out duplicate/staging suppliers (retain Seema Water Hub only)
DELETE FROM public.tankers WHERE supplier_id NOT IN (
  SELECT id FROM public.suppliers WHERE business_name = 'Seema Water Hub'
);
DELETE FROM public.suppliers WHERE business_name != 'Seema Water Hub';

-- 3. Ensure Seema Water Hub supplier entity is verified
INSERT INTO public.suppliers (id, business_name, contact_phone, is_verified, rating, total_deliveries, verification_status, gstin, water_source)
VALUES 
  ('addd79a1-bdf1-459d-a1cc-046a424b19b9', 'Seema Water Hub', '+919999999999', true, 4.9, 142, 'verified', '29ABCDE1234F1Z5', 'BWSSB Certified Potable Source'),
  ('beee79a1-bdf1-459d-a1cc-046a424b19b0', 'Seema Water Hub', '+919000000004', true, 4.9, 142, 'verified', '29ABCDE1234F1Z5', 'BWSSB Certified Potable Source')
ON CONFLICT (id) DO UPDATE SET 
  business_name = EXCLUDED.business_name,
  is_verified = true,
  rating = 4.9;

-- 4. Clean & Seed 6 Real Fleet Tankers across Bengaluru for Seema Water Hub
DELETE FROM public.tankers;

INSERT INTO public.tankers (
  supplier_id, vehicle_number, driver_name, driver_phone, capacity_liters,
  water_type, base_price, price_per_km, is_available, is_online,
  latitude, longitude, heading_degrees, last_ping_at, current_location
) VALUES
  ('addd79a1-bdf1-459d-a1cc-046a424b19b9', 'KA-04-TC-5001', 'Jagdeep Yadav', '+919876543210', 5000,
   'Potable (Drinking)', 750, 25, true, true,
   12.9352, 77.6245, 90, NOW(), ST_SetSRID(ST_MakePoint(77.6245, 12.9352), 4326)::geography),

  ('addd79a1-bdf1-459d-a1cc-046a424b19b9', 'KA-03-FA-2002', 'Suresh Kumar', '+919845150002', 2000,
   'Filtered Borewell', 450, 20, true, true,
   12.9716, 77.6412, 180, NOW(), ST_SetSRID(ST_MakePoint(77.6412, 12.9716), 4326)::geography),

  ('addd79a1-bdf1-459d-a1cc-046a424b19b9', 'KA-01-MJ-1001', 'Kiran Reddy', '+919845110010', 10000,
   'Potable (Drinking)', 1200, 30, true, true,
   12.9121, 77.6446, 310, NOW(), ST_SetSRID(ST_MakePoint(77.6446, 12.9121), 4326)::geography),

  ('addd79a1-bdf1-459d-a1cc-046a424b19b9', 'KA-01-EQ-1201', 'Anand Swamy', '+919845112001', 12000,
   'Potable (Drinking)', 1450, 35, true, true,
   12.9850, 77.7200, 15, NOW(), ST_SetSRID(ST_MakePoint(77.7200, 12.9850), 4326)::geography),

  ('addd79a1-bdf1-459d-a1cc-046a424b19b9', 'KA-51-HV-2002', 'Dhananjay Singh', '+919845120002', 20000,
   'Commercial Tank', 1950, 40, true, true,
   12.9260, 77.6762, 80, NOW(), ST_SetSRID(ST_MakePoint(77.6762, 12.9260), 4326)::geography),

  ('addd79a1-bdf1-459d-a1cc-046a424b19b9', 'KA-05-MN-1002', 'Manjunath Gowda', '+919845150005', 1000,
   'Potable (Drinking)', 350, 18, true, true,
   12.9600, 77.6500, 45, NOW(), ST_SetSRID(ST_MakePoint(77.6500, 12.9600), 4326)::geography);

-- 5. Seed Real Saved Delivery Addresses in Database for Customer Accounts
DELETE FROM public.saved_addresses;

INSERT INTO public.saved_addresses (
  user_id, label, custom_name, flat_or_building, street_address, landmark, city, pincode, latitude, longitude, is_default
) VALUES
  ('bca75357-3da7-4106-b7e8-bd275857efbc', 'home', 'Home', 'Villa 42, Prestige Palms', 'Whitefield Main Road', 'Near Forum Mall', 'Bengaluru', '560066', 12.9698, 77.7499, true),
  ('bca75357-3da7-4106-b7e8-bd275857efbc', 'work', 'Office', 'Tower B, RMZ Ecospace', 'Outer Ring Road, Bellandur', 'Opposite Intel Campus', 'Bengaluru', '560103', 12.9260, 77.6762, false),
  ('d64671d9-665d-4a90-9a45-52be0313978d', 'home', 'Home', 'Villa 42, Prestige Palms', 'Whitefield Main Road', 'Near Forum Mall', 'Bengaluru', '560066', 12.9698, 77.7499, true),
  ('d64671d9-665d-4a90-9a45-52be0313978d', 'work', 'Office', 'Tower B, RMZ Ecospace', 'Outer Ring Road, Bellandur', 'Opposite Intel Campus', 'Bengaluru', '560103', 12.9260, 77.6762, false);
