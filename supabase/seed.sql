-- ==============================================================================
-- LIVE MUMBAI OPERATIONAL SEED FOR ALL 10 ADMIN DESKS
-- ==============================================================================

DO $$
DECLARE
    v_admin_id UUID;
    v_customer_id UUID;
    v_supplier_id UUID;
    v_tanker_id UUID;
    v_veh TEXT;
    v_dname TEXT;
    v_dphone TEXT;
    v_booking_1 UUID := gen_random_uuid();
    v_booking_2 UUID := gen_random_uuid();
    v_booking_3 UUID := gen_random_uuid();
BEGIN
    -- Get primary test users
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
    SELECT id INTO v_customer_id FROM public.profiles WHERE role = 'customer' LIMIT 1;
    SELECT id INTO v_supplier_id FROM public.suppliers LIMIT 1;
    SELECT id, vehicle_number, driver_name, driver_phone INTO v_tanker_id, v_veh, v_dname, v_dphone FROM public.tankers LIMIT 1;

    -- 1. SEED COMPLETED BOOKINGS & PAYMENTS (Powers Tab 1 Operations Desk KPIs)
    INSERT INTO public.bookings (
        id, booking_reference, customer_id, supplier_id, tanker_id, delivery_address,
        delivery_latitude, delivery_longitude, delivery_coordinates,
        capacity_liters, water_type, delivery_pin, delivery_distance_km,
        estimated_arrival_minutes, base_price, delivery_charge, surcharge,
        tax_amount, final_payable_amount, payment_preference, payment_status,
        driver_name, driver_phone, vehicle_number, quote_expires_at, status
    ) VALUES 
    (
        v_booking_1, 'TKR-MUM-701', v_customer_id, v_supplier_id, v_tanker_id,
        'Flat 402, Ruby Apts, Near Ruby Bar, Marol, Mumbai 400059',
        19.1104, 72.8822, ST_SetSRID(ST_MakePoint(72.8822, 19.1104), 4326)::geography,
        5000, 'Potable (Drinking)', '4819', 2.4, 25,
        1450.00, 150.00, 290.00, 90.00, 1980.00, 'upi', 'settled',
        v_dname, v_dphone, v_veh, NOW() + INTERVAL '15 minutes', 'delivered'
    ),
    (
        v_booking_2, 'TKR-MUM-702', v_customer_id, v_supplier_id, v_tanker_id,
        'Building B, Raheja Platinum, Sag Baug Road, Marol, Mumbai 400059',
        19.1140, 72.8860, ST_SetSRID(ST_MakePoint(72.8860, 19.1140), 4326)::geography,
        10000, 'Potable (Drinking)', '7231', 3.8, 30,
        2600.00, 200.00, 0.00, 130.00, 2930.00, 'upi', 'settled',
        v_dname, v_dphone, v_veh, NOW() + INTERVAL '15 minutes', 'delivered'
    ),
    (
        v_booking_3, 'TKR-MUM-703', v_customer_id, v_supplier_id, v_tanker_id,
        'Plot 12, SEEPZ SEZ Corridor, Andheri East, Mumbai 400096',
        19.1280, 72.8790, ST_SetSRID(ST_MakePoint(72.8790, 19.1280), 4326)::geography,
        20000, 'Commercial / Construction', '9912', 4.5, 35,
        4200.00, 300.00, 2100.00, 315.00, 6915.00, 'credit_debit_card', 'settled',
        v_dname, v_dphone, v_veh, NOW() + INTERVAL '15 minutes', 'delivered'
    )
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

    -- Payments for the completed bookings
    INSERT INTO public.payments (
        booking_id, amount, method, status, gateway_payment_id
    ) VALUES
    (v_booking_1, 1980.00, 'upi', 'captured', 'pay_live_01mumbai'),
    (v_booking_2, 2930.00, 'upi', 'captured', 'pay_live_02mumbai'),
    (v_booking_3, 6915.00, 'credit_card', 'captured', 'pay_live_03mumbai')
    ON CONFLICT DO NOTHING;

    -- Invoices for the completed bookings
    INSERT INTO public.invoices (
        booking_id, invoice_number, base_price, surcharge,
        tax_amount, final_amount, payment_status, customer_name, customer_phone,
        supplier_business_name
    ) VALUES
    (v_booking_1, 'INV-MUM-2026-001', 1450.00, 290.00, 90.00, 1980.00, 'PAID', 'Jeet', '9876543210', 'Marol Aqua Logistics'),
    (v_booking_2, 'INV-MUM-2026-002', 2600.00, 0.00, 130.00, 2930.00, 'PAID', 'Jeet', '9876543210', 'Marol Aqua Logistics'),
    (v_booking_3, 'INV-MUM-2026-003', 4200.00, 2100.00, 315.00, 6915.00, 'PAID', 'Jeet', '9876543210', 'Marol Aqua Logistics')
    ON CONFLICT DO NOTHING;

    -- 2. SEED DRIVER PAYOUT LEDGER (Powers Tab 4 Financial & Payouts)
    DELETE FROM public.driver_payout_ledger WHERE driver_phone = '+919000000001';
    INSERT INTO public.driver_payout_ledger (
        driver_phone, booking_id, entry_type, amount, notes, created_at
    ) VALUES
    ('+919000000001', v_booking_1, 'delivery_earnings', 550.00, 'Completed 5,000L drop at Ruby Apts Marol (Base payout + 1.2x surge tier)', NOW() - INTERVAL '3 hours'),
    ('+919000000001', v_booking_1, 'tip_credit', 100.00, 'Customer tip for direct sump pumping via high-pressure booster', NOW() - INTERVAL '3 hours'),
    ('+919000000001', v_booking_2, 'delivery_earnings', 950.00, 'Completed 10,000L delivery at Raheja Platinum Marol', NOW() - INTERVAL '6 hours'),
    ('+919000000001', v_booking_3, 'delivery_earnings', 1450.00, 'Completed 20,000L heavy dispatch at SEEPZ SEZ Corridor', NOW() - INTERVAL '1 day');

    -- 3. SEED PENDING SUPPLIERS (Powers Tab 7 KYC Approvals Queue)
    INSERT INTO public.suppliers (
        id, business_name, contact_person, contact_phone, gstin,
        water_source, fleet_size, verification_status, created_at
    ) VALUES
    (
        'a1111111-2222-3333-4444-555555555551',
        'Metro Aqua Lifeline (Andheri East Hub)',
        'Suresh Gounder',
        '+919820011223',
        '27AABCU9603R1ZM',
        'MIDC Deep Extraction Node 3 (MCGM Certified)',
        4,
        'pending_review',
        NOW() - INTERVAL '1 day'
    ),
    (
        'a1111111-2222-3333-4444-555555555552',
        'Powai Lake Water Logistics LLP',
        'Sunil Deshmukh',
        '+919820044556',
        '27AABCP1145K1ZK',
        'Vihar Aqua Treatment Station',
        3,
        'pending_review',
        NOW() - INTERVAL '2 days'
    )
    ON CONFLICT (id) DO UPDATE SET verification_status = 'pending_review';

    -- 4. SEED CUSTOMER DISPUTES (Powers Tab 8 Disputes & Escrow Mediation)
    DELETE FROM public.disputes WHERE customer_name = 'Jeet';
    INSERT INTO public.disputes (
        id, booking_id, customer_id, customer_name, supplier_name,
        amount, claimed_refund_amount, reason, category, status, created_at
    ) VALUES
    (
        'd1111111-2222-3333-4444-555555555551',
        v_booking_1,
        v_customer_id,
        'Jeet',
        'Marol Aqua Logistics',
        450.00,
        450.00,
        'Flow meter variance: Ordered 5,000L, calibrated digital valve readout stopped at 4,680L (320L short delivery).',
        'volume_shortage',
        'open',
        NOW() - INTERVAL '2 hours'
    ),
    (
        'd1111111-2222-3333-4444-555555555552',
        v_booking_2,
        v_customer_id,
        'Jeet',
        'Marol Aqua Logistics',
        600.00,
        600.00,
        'Driver delayed delivery window past promised SLA slot by 48 minutes.',
        'sla_breach',
        'open',
        NOW() - INTERVAL '5 hours'
    );

    -- 5. SEED CORPORATE CONTRACTS (Powers Tab 6 Corporate Contracts)
    DELETE FROM public.corporate_subscriptions WHERE client_name LIKE '%Mumbai%' OR client_name LIKE '%Park%' OR client_name LIKE '%Raheja%' OR client_name LIKE '%Nesco%';
    INSERT INTO public.corporate_subscriptions (
        client_name, category, contact_person, contact_phone, delivery_address,
        latitude, longitude, daily_liters, preferred_time_slot, monthly_rate,
        status, assigned_supplier_name
    ) VALUES
    (
        'Nesco IT Park Commercial Complex',
        'tech_park',
        'Vikramaditya Rao (VP Infra)',
        '+919820019283',
        'Western Express Highway, Goregaon / Andheri Hub, Mumbai',
        19.1550, 72.8550,
        50000,
        '05:00 AM - 07:00 AM',
        180000.00,
        'active',
        'Marol Aqua Logistics'
    ),
    (
        'Hiranandani Business Park (Central Wing)',
        'tech_park',
        'Meera Sen (Facilities Director)',
        '+919820099881',
        'High Street, Hiranandani Gardens, Powai, Mumbai 400076',
        19.1197, 72.9051,
        40000,
        '05:30 AM - 07:30 AM',
        145000.00,
        'active',
        'Marol Aqua Logistics'
    ),
    (
        'Raheja Platinum Corporate Towers',
        'tech_park',
        'Kunal Bhatia (Asset Lead)',
        '+919820077665',
        'Sag Baug Road, Off Andheri-Kurla Rd, Marol, Mumbai 400059',
        19.1140, 72.8860,
        25000,
        '06:00 AM - 08:00 AM',
        95000.00,
        'active',
        'Marol Aqua Logistics'
    ),
    (
        'Powai Lake View Co-op Housing Society',
        'society',
        'Col. R. K. Nair (Secretary)',
        '+919820033441',
        'Cliff Avenue, Hiranandani Powai, Mumbai 400076',
        19.1250, 72.9100,
        20000,
        '06:30 AM - 08:30 AM',
        78000.00,
        'active',
        'Marol Aqua Logistics'
    );

    -- 6. SEED WATER QUALITY CERTIFICATES (Powers Tab 5 Water Quality Audit)
    DELETE FROM public.water_quality_certificates WHERE lab_name LIKE '%Mumbai%' OR lab_name LIKE '%MCGM%' OR lab_name LIKE '%NABL%';
    INSERT INTO public.water_quality_certificates (
        supplier_id, water_source, source_type, lab_name, test_report_number,
        tds_ppm, ph_level, turbidity_ntu, coliform_detected,
        certified_date, expiry_date, is_potable, certificate_url
    ) VALUES
    (
        v_supplier_id,
        'MCGM Municipal Water Bulk Inflow',
        'MCGM Municipal Water Bulk Inflow',
        'MCGM Water Quality Testing Laboratory, Bhandup Complex, Mumbai',
        'MCGM-WTR-2026-8819',
        112, 7.3, 0.4, false,
        CURRENT_DATE - INTERVAL '10 days',
        CURRENT_DATE + INTERVAL '170 days',
        true,
        'https://portal.mcgm.gov.in/water/certs/2026-8819.pdf'
    ),
    (
        v_supplier_id,
        'Marol MIDC Deep Aquifer Node 4',
        'Marol MIDC Deep Aquifer Node 4',
        'SGS India Analytical NABL Accredited Laboratory, Andheri East',
        'SGS-MUM-2026-4019',
        184, 7.4, 1.1, false,
        CURRENT_DATE - INTERVAL '25 days',
        CURRENT_DATE + INTERVAL '65 days',
        true,
        'https://sgs.com/certs/mumbai/2026-4019.pdf'
    ),
    (
        v_supplier_id,
        'Powai Sub-surface Water Borewell',
        'Powai Sub-surface Water Borewell',
        'Geo-Chem Laboratories NABL ISO-17025 Unit, Kanjurmarg',
        'GEOCHEM-WTR-2026-1192',
        240, 7.1, 1.3, false,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '175 days',
        true,
        'https://geochem.in/reports/2026-1192.pdf'
    ),
    (
        v_supplier_id,
        'Industrial Utility Treated Stream',
        'Industrial Utility Treated Stream',
        'Mumbai Enviro Testing Centre, Sakinaka Hub',
        'ENVIRO-2026-0921',
        490, 6.6, 3.8, false,
        CURRENT_DATE - INTERVAL '40 days',
        CURRENT_DATE + INTERVAL '20 days',
        false,
        'https://mumbaienviro.com/certs/0921.pdf'
    );

    -- 7. SEED EMERGENCY HOSPITAL DISPATCHES (Powers Tab 3 Hospital Dispatch)
    DELETE FROM public.emergency_dispatches WHERE institution_name LIKE '%Hospital%' OR institution_name LIKE '%Care%';
    INSERT INTO public.emergency_dispatches (
        institution_name, institution_type, contact_person, contact_phone,
        delivery_address, latitude, longitude, required_liters, water_type,
        sla_minutes, status, vehicle_number, driver_name, driver_phone, dispatched_at
    ) VALUES
    (
        'SevenHills Hospital (Dialysis Unit & ICU)',
        'hospital_dialysis',
        'Dr. Hemant Joshi (Chief Medical Officer)',
        '+919820055112',
        'Marol Maroshi Road, Andheri East, Mumbai 400059',
        19.1235, 72.8815,
        12000,
        'Potable (Drinking)',
        20,
        'en_route',
        'MH-02-EQ-1201',
        'Rajesh Kumar',
        '+919000000001',
        NOW() - INTERVAL '8 minutes'
    ),
    (
        'Holy Spirit Hospital (Emergency Trauma Wing)',
        'icu_critical',
        'Sister Philomena (Admin In-Charge)',
        '+919820044883',
        'Mahakali Caves Road, Andheri East, Mumbai 400093',
        19.1280, 72.8680,
        10000,
        'Potable (Drinking)',
        20,
        'en_route',
        'MH-02-BW-4819',
        'Anand Swamy',
        '+919845112001',
        NOW() - INTERVAL '14 minutes'
    ),
    (
        'Dr. L H Hiranandani Hospital (Critical Sumps)',
        'hospital_dialysis',
        'Dr. Sunita Kulkarni (Medical Supt)',
        '+919820011994',
        'Hillside Avenue, Hiranandani Gardens, Powai, Mumbai 400076',
        19.1190, 72.9080,
        20000,
        'Potable (Drinking)',
        20,
        'delivered',
        'MH-02-HV-2002',
        'Kiran Reddy',
        '+919845110010',
        NOW() - INTERVAL '2 hours'
    );

    -- 8. SEED AUDIT LOGS (Powers Tab 10 System Audit Trail)
    DELETE FROM public.admin_audit_logs;
    INSERT INTO public.admin_audit_logs (
        admin_id, action, target_entity, target_id, details, created_at
    ) VALUES
    (
        v_admin_id,
        'SYSTEM_BOOT_METRO',
        'platform_settings',
        'pricing_defaults',
        jsonb_build_object('cluster', 'BOM-1', 'center', 'Marol Operations Hub', 'version', '2.0.0'),
        NOW() - INTERVAL '2 days'
    ),
    (
        v_admin_id,
        'APPROVE_SUPPLIER_KYC',
        'suppliers',
        v_supplier_id::text,
        jsonb_build_object('supplier', 'Marol Aqua Logistics', 'status', 'verified', 'decision', 'Approved NABL compliance'),
        NOW() - INTERVAL '1 day'
    ),
    (
        v_admin_id,
        'UPDATE_SURGE_MULTIPLIER',
        'platform_settings',
        'pricing_defaults',
        jsonb_build_object('old_multiplier', 1.0, 'new_multiplier', 1.25, 'reason', 'Severe deficit detected in Marol & Sakinaka sectors'),
        NOW() - INTERVAL '12 hours'
    ),
    (
        v_admin_id,
        'EMERGENCY_PRIORITY_DISPATCH',
        'emergency_dispatches',
        'dispatch-sevenhills-01',
        jsonb_build_object('institution', 'SevenHills Hospital (Dialysis Unit & ICU)', 'liters', 12000, 'sla_minutes', 20, 'assigned_tanker', 'MH-02-EQ-1201'),
        NOW() - INTERVAL '8 minutes'
    );

END $$;
