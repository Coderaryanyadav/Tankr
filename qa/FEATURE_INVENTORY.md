# TANKR — Complete Feature Inventory & Traceability Matrix

**Document ID:** `QA-INV-001`  
**Version:** 1.0.0  
**Updated:** 2026-10-31  

---

## 1. Feature Traceability Matrix

| Feature ID | User Role | Screen / View | Functionality | Frontend Files | Backend Service | Database Objects | Auth Required | Authorization | External Dependencies | Implementation Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **AUTH-01** | All | `LoginScreen.tsx` | Phone Number OTP Request & Persona Switcher | `LoginScreen.tsx` | `authStore.ts` | `auth.users`, `public.profiles` | No | Public / Unauthenticated | Supabase Auth SMS | Verified |
| **AUTH-02** | All | `VerifyOtpScreen.tsx` | OTP Code Verification & Token Exchange | `VerifyOtpScreen.tsx` | `authStore.ts` | `auth.users`, `public.profiles` | No | Public | Supabase GoTrue | Verified |
| **AUTH-03** | Customer | `OnboardingScreen.tsx` | City Selection, Name & Initial Address | `OnboardingScreen.tsx` | `locationStore.ts` | `public.profiles`, `public.saved_addresses` | Yes | `customer` | None | Verified |
| **AUTH-04** | All | `AccountScreen.tsx` | Session Sign Out & Token Revocation | `AccountScreen.tsx` | `authStore.ts` | `auth.users` | Yes | Authenticated Session | Supabase Auth | Verified |
| **DISC-01** | Customer | `HomeScreen.tsx` | PostGIS Radius Tanker Discovery | `HomeScreen.tsx`, `InteractiveMap.tsx` | `discoveryStore.ts` | `public.tankers`, `public.suppliers` | Yes | `customer` | OpenStreetMap CDN / Mappls | Verified |
| **DISC-02** | Customer | `DiscoveryBottomSheet.tsx` | Capacity Filtering & Sump Sort Engine | `DiscoveryBottomSheet.tsx` | `discoveryStore.ts` | `public.tankers` | Yes | `customer` | None | Verified |
| **DISC-03** | Customer | `DiscoveryBottomSheet.tsx` | Water Quality Certifications (BIS-10500) | `WaterQualityBadge.tsx` | `discoveryStore.ts` | `public.water_quality_certificates` | Yes | `customer` | None | Verified |
| **BOOK-01** | Customer | `BookingReviewModal.tsx` | Real-time Quote Calculation & Breakdown | `BookingReviewModal.tsx` | `bookingStore.ts` | `public.calculate_booking_quote()` | Yes | `customer` | None | Verified |
| **BOOK-02** | Customer | `BookingReviewModal.tsx` | Atomic Booking Creation & Driver Dispatch | `BookingReviewModal.tsx` | `bookingStore.ts` | `public.create_booking_atomic()` | Yes | `customer` | None | Verified |
| **BOOK-03** | Customer | `BookingsListScreen.tsx` | Order History & Delivery Progress Stepper | `BookingsListScreen.tsx` | `bookingStore.ts` | `public.bookings` | Yes | `customer` | None | Verified |
| **BOOK-04** | Customer | `BookingsListScreen.tsx` | Order Cancellation with Policy Guard | `BookingsListScreen.tsx` | `bookingStore.ts` | `public.customer_cancel_booking_with_policy()` | Yes | `customer` | None | Verified |
| **TRCK-01** | Customer / Driver | `LiveTrackingScreen.tsx` | Live GPS Coordinate Map Tracking | `LiveTrackingScreen.tsx` | `trackingService.ts` | `public.tracking_breadcrumbs` | Yes | `customer`, `driver` | Supabase Realtime | Verified |
| **TRCK-02** | Driver | `DriverDashboardScreen.tsx` | Background GPS Telemetry Ingestion Queue | `backgroundLocationTask.ts` | `locationService.ts` | `public.record_driver_location_ping()` | Yes | `driver` | Expo Location | Verified |
| **DELV-01** | Customer / Driver | `LiveTrackingScreen.tsx` | Protected 4-digit Handshake Delivery PIN | `LiveTrackingScreen.tsx` | `bookingStore.ts` | `public.bookings.delivery_pin` | Yes | `customer`, `driver` | None | Verified |
| **DELV-02** | Driver | `DriverDashboardScreen.tsx` | Two-Way Digital Flow Meter Verification | `DriverDashboardScreen.tsx` | `supplyStore.ts` | `public.driver_complete_delivery_with_meter()` | Yes | `driver` | None | Verified |
| **PAYM-01** | Customer | `BookingReviewModal.tsx` | Razorpay Online Payment & Signature Reconcile | `paymentService.ts` | `paymentService.ts` | `public.verify_and_reconcile_payment()` | Yes | `customer` | Razorpay Gateway | Verified |
| **PAYM-02** | Customer | `BookingsListScreen.tsx` | Prorated Flow Meter Refund Calculation | `BookingsListScreen.tsx` | `bookingStore.ts` | `public.bookings.volume_discrepancy_liters` | Yes | `customer` | Razorpay Refund API | Verified |
| **INVC-01** | Customer / Supplier | `InvoiceViewModal.tsx` | Formal GST Tax Invoice Generation & Display | `InvoiceViewModal.tsx` | `invoiceService.ts` | `public.invoices` | Yes | `customer`, `supplier` | None | Verified |
| **COMM-01** | Customer | `CommunityPoolModal.tsx` | Community Sump Pooling & Cost-Splitting | `CommunityPoolModal.tsx` | `communityPoolStore.ts` | `public.community_pools`, `public.community_pool_contributions` | Yes | `customer` | None | Verified |
| **SUPP-01** | Supplier | `SupplierDashboardScreen.tsx` | Fleet Availability & Dispatch Management | `SupplierDashboardScreen.tsx` | `supplyStore.ts` | `public.tankers`, `public.suppliers` | Yes | `supplier` | None | Verified |
| **SUPP-02** | Supplier | `AddVehicleModal.tsx` | Vehicle Onboarding & RTO Registration | `AddVehicleModal.tsx` | `supplyStore.ts` | `public.supplier_onboard_tanker()` | Yes | `supplier` | None | Verified |
| **DRIV-01** | Driver | `DriverDashboardScreen.tsx` | Driver Duty Toggle (Online/Offline) | `DriverDashboardScreen.tsx` | `supplyStore.ts` | `public.driver_profiles`, `public.tankers` | Yes | `driver` | None | Verified |
| **DRIV-02** | Driver | `DriverDashboardScreen.tsx` | Real-time Payout Ledger & Earnings Summary | `DriverDashboardScreen.tsx` | `supplyStore.ts` | `public.driver_payout_ledger` | Yes | `driver` | None | Verified |
| **ADMN-01** | Admin | `AdminDashboardScreen.tsx` | Platform Liquidity & Sump Deficit Radar | `AdminDashboardScreen.tsx` | `adminStore.ts` | `public.get_live_demand_deficit_zones()` | Yes | `admin` | PostGIS | Verified |
| **ADMN-02** | Admin | `AdminDashboardScreen.tsx` | Emergency Priority Dispatch for Hospitals | `AdminDashboardScreen.tsx` | `adminStore.ts` | `public.admin_emergency_dispatch()` | Yes | `admin` | None | Verified |
| **ADMN-03** | Admin | `AdminDashboardScreen.tsx` | Supplier Verification & KYC Approval | `AdminDashboardScreen.tsx` | `adminStore.ts` | `public.admin_verify_supplier()` | Yes | `admin` | None | Verified |
| **ADMN-04** | Admin | `AdminDashboardScreen.tsx` | Customer Water Dispute Arbitration | `AdminDashboardScreen.tsx` | `adminStore.ts` | `public.admin_resolve_dispute()` | Yes | `admin` | None | Verified |
| **NOTF-01** | All | `NotificationsModal.tsx` | Real-time Lifecycle Push & In-app Alerts | `NotificationsModal.tsx` | `notificationStore.ts` | `public.notifications` | Yes | Authenticated | Supabase Realtime | Verified |
| **LOCN-01** | Customer | `SavedAddressesSheet.tsx` | Saved Delivery Locations (Home/Office/Sump) | `SavedAddressesSheet.tsx` | `locationStore.ts` | `public.saved_addresses` | Yes | `customer` | PostGIS | Verified |
| **DISP-01** | Customer | `CustomerDisputeModal.tsx` | Meter Discrepancy & Quality Dispute Filing | `CustomerDisputeModal.tsx` | `disputeService.ts` | `public.disputes` | Yes | `customer` | None | Verified |

---

## 2. Interactive Control Inventory Summary

- **Total Screens/Views:** 19 screens and modals
- **Total Buttons & Pressable Targets:** 84 interactive elements inspected
- **Total Input Forms:** 14 forms (Login OTP, Address Add, Booking Review, Vehicle Add, Meter Reading, Dispute, Emergency Dispatch, etc.)
- **Total Core RPC Stored Procedures:** 16 database functions

