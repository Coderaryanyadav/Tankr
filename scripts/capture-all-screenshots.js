#!/usr/bin/env node

/**
 * ==============================================================================
 * TANKR Automated Screen Capture Engine
 * Captures pixel-perfect Retina screenshots of EVERY app, screen, modal & desk:
 * - Consumer Customer App (17 screens & modals)
 * - Fleet Driver Console (2 screens & flow meter verification)
 * - Water Supplier Portal (3 screens & fleet management)
 * - Super Admin Operations Desks (10 operational desks & deficit radar)
 * - Design System Showcase (1 comprehensive UI component gallery)
 *
 * Generates an interactive self-contained HTML gallery: screenshots/index.html
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'screenshots');

const DEFAULT_PORT = process.env.PORT || 8081;
const BASE_URL = `http://localhost:${DEFAULT_PORT}`;

// Potential Google Chrome / Chromium executable locations on macOS & Linux
const CHROME_PATHS = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

function findChromePath() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

// 33 Comprehensive Screens & Modals across all 5 Apps
const SCREENS = [
  // --- 1. AUTH & ONBOARDING ---
  {
    id: 'auth_01',
    category: 'customer',
    groupName: 'Auth & Onboarding',
    title: 'Mobile Phone Login & Demo Switcher',
    filename: '01_auth_login.png',
    url: `${BASE_URL}/?app=auth&screen=login&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Login screen with +91 phone input, instant OTP disclaimer, and quick persona demo chips.',
    delay: 1000,
  },
  {
    id: 'auth_02',
    category: 'customer',
    groupName: 'Auth & Onboarding',
    title: 'SMS OTP 6-Digit Verification',
    filename: '02_auth_otp_verify.png',
    url: `${BASE_URL}/?app=auth&screen=verify&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: '6-digit SMS verification code input with 30s resend countdown and security badge.',
    delay: 1000,
  },
  {
    id: 'auth_03',
    category: 'customer',
    groupName: 'Auth & Onboarding',
    title: 'Customer Onboarding & Sump Setup',
    filename: '03_auth_onboarding.png',
    url: `${BASE_URL}/?app=auth&screen=onboarding&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'City selection, full name, residential address, and underground/overhead sump specification.',
    delay: 1000,
  },

  // --- 2. CONSUMER CUSTOMER APP ---
  {
    id: 'cust_01',
    category: 'customer',
    groupName: 'Customer App',
    title: 'Live Discovery Map & Tanker Sheet',
    filename: '04_customer_home_discovery.png',
    url: `${BASE_URL}/?app=customer&tab=discovery&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Interactive OpenStreetMap with radius tankers, capacity filter chips (1kL to 20kL), and bottom sheet.',
    delay: 2000,
  },
  {
    id: 'cust_02',
    category: 'customer',
    groupName: 'Customer App',
    title: 'Booking Review & Authoritative Quote',
    filename: '05_customer_booking_review.png',
    url: `${BASE_URL}/?app=customer&modal=booking_review&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Detailed price breakdown (base rate, km delivery, 5% GST), schedule selection, and UPI / Cash options.',
    delay: 1500,
  },
  {
    id: 'cust_03',
    category: 'customer',
    groupName: 'Customer App',
    title: 'Searching & Dispatching Supplier Overlay',
    filename: '06_customer_booking_searching.png',
    url: `${BASE_URL}/?app=customer&modal=searching&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Animated radar pulse locating nearest available tanker with auto-cancellation guard.',
    delay: 1200,
  },
  {
    id: 'cust_04',
    category: 'customer',
    groupName: 'Customer App',
    title: 'Order History & Delivery Stepper',
    filename: '07_customer_bookings_list.png',
    url: `${BASE_URL}/?app=customer&tab=bookings&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Bookings list with placed -> confirmed -> dispatched -> delivered stepper and GST invoice links.',
    delay: 1200,
  },
  {
    id: 'cust_05',
    category: 'customer',
    groupName: 'Customer App',
    title: 'Official GST Tax Invoice Modal',
    filename: '08_customer_tax_invoice.png',
    url: `${BASE_URL}/?app=customer&screen=bookings&modal=invoice&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Itemized GST invoice with CGST/SGST breakdown, supplier GSTIN, water TDS rating, and delivery stamp.',
    delay: 1500,
  },
  {
    id: 'cust_06',
    category: 'customer',
    groupName: 'Customer App',
    title: 'Live GPS Telemetry & Handshake PIN',
    filename: '09_customer_live_tracking.png',
    url: `${BASE_URL}/?app=customer&tab=activity&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Live tanker map tracking with current speed, heading, driver contact, and 4-digit Handshake Delivery PIN.',
    delay: 2000,
  },
  {
    id: 'cust_07',
    category: 'customer',
    groupName: 'Customer App',
    title: 'Customer Account & Sump Profile',
    filename: '10_customer_account_profile.png',
    url: `${BASE_URL}/?app=customer&tab=account&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'User profile management, saved sump locations, water quality guarantees, and sign-out controls.',
    delay: 1200,
  },
  {
    id: 'cust_08',
    category: 'customer',
    groupName: 'Customer App',
    title: 'Saved Delivery Addresses & Sump Sheet',
    filename: '11_customer_saved_addresses.png',
    url: `${BASE_URL}/?app=customer&modal=saved_addresses&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Multi-location management with Home, Office, and Sump designations (underground/overhead).',
    delay: 1200,
  },
  {
    id: 'cust_09',
    category: 'customer',
    groupName: 'Customer App',
    title: 'BIS-10500 Water Quality Lab Certificate',
    filename: '12_customer_water_quality.png',
    url: `${BASE_URL}/?app=customer&screen=account&modal=water_quality&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'NABL accredited test report details: TDS ppm, pH level, turbidity, and 0-coliform certification.',
    delay: 1200,
  },
  {
    id: 'cust_10',
    category: 'customer',
    groupName: 'Customer App',
    title: 'Two-Way Fair Metering Guarantee',
    filename: '13_customer_fair_metering.png',
    url: `${BASE_URL}/?app=customer&screen=account&modal=fair_metering&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Digital flow meter guarantee with automatic prorated escrow refund policy for short deliveries.',
    delay: 1200,
  },
  {
    id: 'cust_11',
    category: 'customer',
    groupName: 'Customer App',
    title: 'Customer Delivery Incident & Dispute Filing',
    filename: '14_customer_dispute_modal.png',
    url: `${BASE_URL}/?app=customer&modal=dispute&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Formal complaint form for volume shortages, delayed tankers, or water quality discrepancies.',
    delay: 1200,
  },
  {
    id: 'cust_12',
    category: 'customer',
    groupName: 'Customer App',
    title: 'Community Sump Pooling & Cost Splitting',
    filename: '15_customer_community_pool.png',
    url: `${BASE_URL}/?app=customer&modal=community_pool&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Multi-household pooled delivery campaign allowing neighbors to co-fund large 20kL bulk tankers.',
    delay: 1200,
  },
  {
    id: 'cust_13',
    category: 'customer',
    groupName: 'Customer App',
    title: 'Real-time Notifications Drawer',
    filename: '16_customer_notifications.png',
    url: `${BASE_URL}/?app=customer&modal=notifications&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'In-app notification drawer showing delivery status changes, OTP verifications, and surge alerts.',
    delay: 1200,
  },
  {
    id: 'cust_14',
    category: 'customer',
    groupName: 'Customer App',
    title: '24/7 Water Emergency Support Desk',
    filename: '17_customer_support_desk.png',
    url: `${BASE_URL}/?app=customer&screen=account&modal=support&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Direct priority contact channels with Mumbai municipal liaison and 24/7 emergency dispatch helpline.',
    delay: 1200,
  },

  // --- 3. FLEET DRIVER APP ---
  {
    id: 'driv_01',
    category: 'driver',
    groupName: 'Fleet Driver Console',
    title: 'Driver Duty Toggle & Active Delivery Card',
    filename: '18_driver_dashboard_active.png',
    url: `${BASE_URL}/?app=driver&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Driver duty status switch (ON/OFF), assigned delivery address, navigation trigger, and trip earnings.',
    delay: 1500,
  },
  {
    id: 'driv_02',
    category: 'driver',
    groupName: 'Fleet Driver Console',
    title: 'Digital Meter Verification & Customer PIN Handshake',
    filename: '19_driver_meter_verification.png',
    url: `${BASE_URL}/?app=driver&modal=verify_pin&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Two-way handshake verification: customer 4-digit PIN entry plus digital flow meter start/end reading.',
    delay: 1500,
  },

  // --- 4. WATER SUPPLIER APP ---
  {
    id: 'supp_01',
    category: 'supplier',
    groupName: 'Supplier Partner Portal',
    title: 'Supplier Fleet & Dispatch Dashboard',
    filename: '20_supplier_dashboard_fleet.png',
    url: `${BASE_URL}/?app=supplier&screenshot=1`,
    viewport: { width: 1200, height: 800, scale: 2 },
    description: 'Supplier operations command: daily revenue metrics, pending incoming orders, and live fleet tankers.',
    delay: 1500,
  },
  {
    id: 'supp_02',
    category: 'supplier',
    groupName: 'Supplier Partner Portal',
    title: 'Tanker Vehicle Onboarding Modal',
    filename: '21_supplier_add_vehicle.png',
    url: `${BASE_URL}/?app=supplier&modal=add_vehicle&screenshot=1`,
    viewport: { width: 1200, height: 800, scale: 2 },
    description: 'RTO vehicle registration input, water grade (Potable BIS-10500/Commercial), capacity, and driver assignment.',
    delay: 1500,
  },
  {
    id: 'supp_03',
    category: 'supplier',
    groupName: 'Supplier Partner Portal',
    title: 'Supplier KYC & Compliance Registration',
    filename: '22_supplier_registration.png',
    url: `${BASE_URL}/?app=supplier&screen=registration&screenshot=1`,
    viewport: { width: 390, height: 844, scale: 2 },
    description: 'Supplier partner onboarding: GSTIN, municipal water extraction permits, and lab certificate upload.',
    delay: 1500,
  },

  // --- 5. SUPER ADMIN OPERATIONS DESKS ---
  {
    id: 'admn_01',
    category: 'admin',
    groupName: 'Operations Admin Desks',
    title: 'Operations Desk & Demand Deficit Radar',
    filename: '23_admin_overview_radar.png',
    url: `${BASE_URL}/?app=admin&desk=overview&screenshot=1`,
    viewport: { width: 1280, height: 820, scale: 2 },
    description: 'Executive command center with GMV metrics, live demand deficit zones (BKC, Andheri, Powai), and surge controls.',
    delay: 1500,
  },
  {
    id: 'admn_02',
    category: 'admin',
    groupName: 'Operations Admin Desks',
    title: 'Live Fleet GPS Tracking & Heatmap Desk',
    filename: '24_admin_fleet_map.png',
    url: `${BASE_URL}/?app=admin&desk=fleet_map&screenshot=1`,
    viewport: { width: 1280, height: 820, scale: 2 },
    description: 'High-density interactive map showing all online tankers, real-time velocities, and heading vectors.',
    delay: 2000,
  },
  {
    id: 'admn_03',
    category: 'admin',
    groupName: 'Operations Admin Desks',
    title: 'Hospital Priority Dispatch (20m SLA) Desk',
    filename: '25_admin_priority_dispatch.png',
    url: `${BASE_URL}/?app=admin&desk=priority_dispatch&screenshot=1`,
    viewport: { width: 1280, height: 820, scale: 2 },
    description: 'Emergency priority console for hospitals & dialysis units with guaranteed 20-minute SLA fulfillment.',
    delay: 1500,
  },
  {
    id: 'admn_04',
    category: 'admin',
    groupName: 'Operations Admin Desks',
    title: 'Financial Settlements & Driver Payouts Desk',
    filename: '26_admin_payouts_ledger.png',
    url: `${BASE_URL}/?app=admin&desk=payouts&screenshot=1`,
    viewport: { width: 1280, height: 820, scale: 2 },
    description: 'Payout ledger, escrow holdbacks, supplier splits, and instant NEFT bank settlement verification.',
    delay: 1500,
  },
  {
    id: 'admn_05',
    category: 'admin',
    groupName: 'Operations Admin Desks',
    title: 'Water Safety & Quality Lab Audit Desk',
    filename: '27_admin_water_safety.png',
    url: `${BASE_URL}/?app=admin&desk=water_safety&screenshot=1`,
    viewport: { width: 1280, height: 820, scale: 2 },
    description: 'Water quality compliance dashboard tracking BIS-10500 lab tests, TDS ppm ratings, and supplier source audits.',
    delay: 1500,
  },
  {
    id: 'admn_06',
    category: 'admin',
    groupName: 'Operations Admin Desks',
    title: 'Corporate Recurring Contracts & Subscriptions Desk',
    filename: '28_admin_corporate_subscriptions.png',
    url: `${BASE_URL}/?app=admin&desk=subscriptions&screenshot=1`,
    viewport: { width: 1280, height: 820, scale: 2 },
    description: 'Enterprise contract management for IT tech parks, hospital clusters, and large residential societies.',
    delay: 1500,
  },
  {
    id: 'admn_07',
    category: 'admin',
    groupName: 'Operations Admin Desks',
    title: 'Supplier KYC Compliance & Document Approvals Desk',
    filename: '29_admin_kyc_approvals.png',
    url: `${BASE_URL}/?app=admin&desk=verifications&screenshot=1`,
    viewport: { width: 1280, height: 820, scale: 2 },
    description: 'KYC approval workflow verifying GSTIN, RTO commercial vehicle permits, and municipal water licenses.',
    delay: 1500,
  },
  {
    id: 'admn_08',
    category: 'admin',
    groupName: 'Operations Admin Desks',
    title: 'Customer Disputes & Escrow Arbitration Desk',
    filename: '30_admin_disputes_escrow.png',
    url: `${BASE_URL}/?app=admin&desk=disputes&screenshot=1`,
    viewport: { width: 1280, height: 820, scale: 2 },
    description: 'Dispute arbitration queue handling digital flow meter discrepancies and automated prorated refunds.',
    delay: 1500,
  },
  {
    id: 'admn_09',
    category: 'admin',
    groupName: 'Operations Admin Desks',
    title: 'Service Delivery Zones & Traffic Multipliers Desk',
    filename: '31_admin_service_zones.png',
    url: `${BASE_URL}/?app=admin&desk=zones&screenshot=1`,
    viewport: { width: 1280, height: 820, scale: 2 },
    description: 'Operational polygon management, zone minimum density rules, and real-time peak traffic factors.',
    delay: 1500,
  },
  {
    id: 'admn_10',
    category: 'admin',
    groupName: 'Operations Admin Desks',
    title: 'Authoritative Cryptographic System Audit Log',
    filename: '32_admin_system_audit_log.png',
    url: `${BASE_URL}/?app=admin&desk=audit_log&screenshot=1`,
    viewport: { width: 1280, height: 820, scale: 2 },
    description: 'Immutable system audit trail recording emergency dispatches, surge changes, and supplier authorizations.',
    delay: 1500,
  },

  // --- 6. DESIGN SYSTEM SHOWCASE ---
  {
    id: 'show_01',
    category: 'showcase',
    groupName: 'Design System Showcase',
    title: 'Design System Visual Component Catalog',
    filename: '33_showcase_design_system.png',
    url: `${BASE_URL}/?app=showcase&screenshot=1`,
    viewport: { width: 1200, height: 900, scale: 2 },
    description: 'Complete UI component library: brand typography, buttons, color swatches, status badges, and inputs.',
    delay: 1500,
  },
];

// Verify if the Expo dev server is responding
function checkServerRunning(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Generate an elegant HTML gallery
function generateHtmlGallery(results) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const categories = [
    { key: 'all', label: `All Screens (${results.length})` },
    { key: 'customer', label: `Customer App (${results.filter((r) => r.category === 'customer').length})` },
    { key: 'driver', label: `Driver App (${results.filter((r) => r.category === 'driver').length})` },
    { key: 'supplier', label: `Supplier App (${results.filter((r) => r.category === 'supplier').length})` },
    { key: 'admin', label: `Admin Operations (${results.filter((r) => r.category === 'admin').length})` },
    { key: 'showcase', label: `Design System (${results.filter((r) => r.category === 'showcase').length})` },
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TANKR — Complete Screen & App Visual Catalog</title>
  <style>
    :root {
      --bg: #0B1120;
      --card-bg: #1E293B;
      --card-border: #334155;
      --text-main: #F8FAFC;
      --text-sub: #94A3B8;
      --accent: #0284C7;
      --accent-glow: rgba(2, 132, 199, 0.25);
      --success: #10B981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      padding: 32px 24px;
      line-height: 1.5;
    }
    .header {
      max-width: 1400px;
      margin: 0 auto 32px auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 24px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand-title {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-badge {
      background: var(--accent);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-text {
      font-size: 13px;
      color: var(--text-sub);
    }
    .tabs-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .tab-btn {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text-sub);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .tab-btn:hover {
      border-color: var(--accent);
      color: var(--text-main);
    }
    .tab-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
      box-shadow: 0 0 12px var(--accent-glow);
    }
    .grid {
      max-width: 1400px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 24px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px -8px rgba(0,0,0,0.5);
      border-color: #475569;
    }
    .img-container {
      width: 100%;
      height: 380px;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      overflow: hidden;
      position: relative;
    }
    .img-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      transition: transform 0.25s ease;
    }
    .img-container:hover img {
      transform: scale(1.03);
    }
    .img-overlay {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(15, 23, 42, 0.85);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      backdrop-filter: blur(4px);
    }
    .card-body {
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }
    .card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .group-tag {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--accent);
    }
    .file-size {
      font-size: 11px;
      color: var(--text-sub);
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }
    .card-desc {
      font-size: 12px;
      color: var(--text-sub);
      line-height: 1.4;
      flex: 1;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .view-btn {
      font-size: 12px;
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }
    .view-btn:hover {
      text-decoration: underline;
    }
    .res-badge {
      font-size: 10px;
      background: rgba(255,255,255,0.06);
      padding: 2px 6px;
      border-radius: 4px;
      color: #94A3B8;
    }
    /* Modal Lightbox */
    .lightbox {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(3, 7, 18, 0.94);
      z-index: 1000;
      backdrop-filter: blur(8px);
      padding: 24px;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
    .lightbox.active {
      display: flex;
    }
    .lightbox-close {
      position: absolute;
      top: 20px;
      right: 28px;
      font-size: 32px;
      color: #fff;
      cursor: pointer;
      background: none;
      border: none;
      padding: 8px;
    }
    .lightbox img {
      max-width: 90vw;
      max-height: 85vh;
      border-radius: 8px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.8);
      object-fit: contain;
    }
    .lightbox-title {
      margin-top: 12px;
      font-size: 15px;
      font-weight: 600;
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div class="brand-title">
        TANKR <span class="brand-badge">Automated Visual QA</span>
      </div>
      <div class="meta-text">
        Generated: <strong>${timestamp}</strong> • <strong>${results.length} Screens Captured</strong> • Retina 2x
      </div>
    </div>
    <div class="tabs-row">
      ${categories
        .map(
          (c, idx) =>
            `<button class="tab-btn ${idx === 0 ? 'active' : ''}" onclick="filterCategory('${c.key}', this)">${c.label}</button>`
        )
        .join('')}
    </div>
  </div>

  <div class="grid" id="screensGrid">
    ${results
      .map(
        (r) => `
      <div class="card" data-category="${r.category}">
        <div class="img-container" onclick="openLightbox('${r.category}/${r.filename}', '${r.title.replace(/'/g, "\\'")}')">
          <img src="${r.category}/${r.filename}" alt="${r.title}" loading="lazy" />
          <div class="img-overlay">${r.viewport.width} × ${r.viewport.height} @2x</div>
        </div>
        <div class="card-body">
          <div class="card-meta">
            <span class="group-tag">${r.groupName}</span>
            <span class="file-size">${r.fileSizeKb} KB</span>
          </div>
          <div class="card-title">${r.title}</div>
          <div class="card-desc">${r.description}</div>
          <div class="card-footer">
            <span class="res-badge">${r.category.toUpperCase()}</span>
            <a class="view-btn" href="${r.category}/${r.filename}" target="_blank">Open High-Res ↗</a>
          </div>
        </div>
      </div>
    `
      )
      .join('')}
  </div>

  <div class="lightbox" id="lightbox" onclick="closeLightbox()">
    <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
    <img id="lightboxImg" src="" alt="Fullscreen Preview" onclick="event.stopPropagation()" />
    <div class="lightbox-title" id="lightboxTitle"></div>
  </div>

  <script>
    function filterCategory(cat, btn) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cards = document.querySelectorAll('#screensGrid .card');
      cards.forEach(card => {
        if (cat === 'all' || card.getAttribute('data-category') === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    function openLightbox(src, title) {
      document.getElementById('lightboxImg').src = src;
      document.getElementById('lightboxTitle').innerText = title;
      document.getElementById('lightbox').classList.add('active');
    }

    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('active');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  </script>
</body>
</html>
`;

  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'index.html'), html, 'utf8');
}

async function main() {
  console.log('\n\x1b[1m\x1b[34m================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[34m       TANKR — Comprehensive Screen & App Capture Engine        \x1b[0m');
  console.log('\x1b[1m\x1b[34m================================================================\x1b[0m\n');

  const chromePath = findChromePath();
  if (!chromePath) {
    console.error('\x1b[31m[ERROR] No compatible Chrome/Chromium browser found on this machine.\x1b[0m');
    console.error('Please install Google Chrome or set CHROME_PATH to your browser executable.');
    process.exit(1);
  }
  console.log(`\x1b[32m✔ Browser detected:\x1b[0m ${chromePath}`);

  // Check if server is running
  const isRunning = await checkServerRunning(BASE_URL);
  if (!isRunning) {
    console.error(`\x1b[31m[ERROR] Expo Web server is not running on ${BASE_URL}.\x1b[0m`);
    console.error(`Please run '\x1b[1mnpx expo start --web\x1b[0m' or '\x1b[1m./scripts/start-dev.sh\x1b[0m' first.`);
    process.exit(1);
  }
  console.log(`\x1b[32m✔ Target server active:\x1b[0m ${BASE_URL}\n`);

  // Prepare directories
  const categories = ['customer', 'driver', 'supplier', 'admin', 'showcase', 'all'];
  for (const cat of categories) {
    const dir = path.join(SCREENSHOTS_DIR, cat);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  console.log(`\x1b[1mCapturing ${SCREENS.length} screens across all roles...\x1b[0m\n`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < SCREENS.length; i++) {
    const s = SCREENS[i];
    const num = `[${String(i + 1).padStart(2, '0')}/${SCREENS.length}]`;
    process.stdout.write(`  ${num} \x1b[36m${s.groupName}\x1b[0m — ${s.title}... `);

    try {
      await page.setViewport({
        width: s.viewport.width,
        height: s.viewport.height,
        deviceScaleFactor: s.viewport.scale || 2,
      });

      await page.goto(s.url, { waitUntil: 'networkidle0', timeout: 35000 });

      // Extra delay for maps, CSS transitions, and SVG icons to render fully
      await new Promise((r) => setTimeout(r, s.delay || 1200));

      const categoryPath = path.join(SCREENSHOTS_DIR, s.category, s.filename);
      const allPath = path.join(SCREENSHOTS_DIR, 'all', s.filename);

      await page.screenshot({ path: categoryPath, type: 'png' });
      fs.copyFileSync(categoryPath, allPath);

      const stats = fs.statSync(categoryPath);
      const sizeKb = Math.round(stats.size / 1024);

      results.push({
        ...s,
        fileSizeKb: sizeKb,
      });

      console.log(`\x1b[32m✔ DONE\x1b[0m (${sizeKb} KB)`);
    } catch (err) {
      console.log(`\x1b[31m✖ FAILED\x1b[0m (${err.message})`);
    }
  }

  await browser.close();

  // Generate HTML Gallery
  generateHtmlGallery(results);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalKb = results.reduce((acc, r) => acc + r.fileSizeKb, 0);
  const totalMb = (totalKb / 1024).toFixed(2);

  console.log('\n\x1b[1m\x1b[32m================================================================\x1b[0m');
  console.log(`\x1b[1m\x1b[32m✔ SUCCESS: Captured ${results.length} screens in ${durationSec}s (${totalMb} MB total)\x1b[0m`);
  console.log('\x1b[1m\x1b[32m================================================================\x1b[0m\n');
  console.log(`📂 Screenshots directory:  \x1b[34m${SCREENSHOTS_DIR}\x1b[0m`);
  console.log(`🌐 Visual HTML Gallery:     \x1b[34m${path.join(SCREENSHOTS_DIR, 'index.html')}\x1b[0m\n`);
  console.log(`\x1b[1mTo view the screenshots in your browser:\x1b[0m`);
  console.log(`  \x1b[33mopen ${path.join(SCREENSHOTS_DIR, 'index.html')}\x1b[0m\n`);
}

main().catch((err) => {
  console.error('\x1b[31mFatal execution error:\x1b[0m', err);
  process.exit(1);
});

