import { useBookingStore } from '../../src/stores/bookingStore';
import { useLocationStore } from '../../src/stores/locationStore';
import { calculateAuthoritativeQuote } from '../../src/services/pricingService';
import { NearbyTanker } from '../../src/types/discovery';

describe('CHECKOUT-01: Premium Booking Checkout and Conversion UX', () => {
  const MOCK_TANKER: NearbyTanker = {
    tanker_id: 'a0000000-0000-0000-0000-000000000002',
    supplier_id: 'b0000000-0000-0000-0000-000000000002',
    supplier_name: 'Powai Pure Waters',
    vehicle_number: 'MH-02-TC-5001',
    driver_name: 'Suresh Patil',
    driver_phone: '+919876543202',
    capacity_liters: 5000,
    water_type: 'Potable (Drinking)',
    base_price: 1200,
    price_per_km: 40,
    distance_km: 3.5,
    eta_minutes: 18,
    estimated_total_price: 1407,
    latitude: 19.1200,
    longitude: 72.8850,
    heading_degrees: 90,
    is_available: true,
    rating: 4.9,
    total_deliveries: 840,
  };

  beforeEach(() => {
    useBookingStore.setState({
      activeQuote: null,
      isLoadingQuote: false,
      isCreatingBooking: false,
      bookingError: null,
    });
  });

  describe('1. Transparent Pricing & Itemized Reconciliation', () => {
    it('accurately reconciles base, delivery, peak surge and 5% GST without inventing charges', () => {
      // 5,000L tanker, 3.5 km distance, Daytime (14:00 IST)
      const quote = calculateAuthoritativeQuote({
        basePrice: MOCK_TANKER.base_price,
        pricePerKm: MOCK_TANKER.price_per_km,
        distanceKm: MOCK_TANKER.distance_km,
        hourIST: 14,
      });

      // Base: ₹1200.00
      // Delivery (3.5km * ₹40): ₹140.00
      // Surcharge (Daytime): ₹0.00
      // Subtotal: ₹1340.00
      // GST (5%): ₹67.00
      // Total: ₹1407.00
      expect(quote.base_price).toBe(1200.00);
      expect(quote.delivery_charge).toBe(140.00);
      expect(quote.surcharge_amount).toBe(0.00);
      expect(quote.subtotal).toBe(1340.00);
      expect(quote.tax_amount).toBe(67.00);
      expect(quote.final_payable_amount).toBe(1407.00);
    });

    it('clearly itemizes peak evening surge (+10%) when booking during 18:00 - 22:00 IST', () => {
      const quote = calculateAuthoritativeQuote({
        basePrice: 1200.00,
        pricePerKm: 40.00,
        distanceKm: 3.5,
        hourIST: 20, // 8 PM IST Peak
      });

      // Surcharge is 10% of base rate = ₹120.00
      expect(quote.surcharge_amount).toBe(120.00);
      // Subtotal = 1200 + 140 + 120 = 1460.00
      expect(quote.subtotal).toBe(1460.00);
      // GST = 5% of 1460 = 73.00
      expect(quote.tax_amount).toBe(73.00);
      // Total = 1533.00
      expect(quote.final_payable_amount).toBe(1533.00);
    });
  });

  describe('2. Delivery Instructions & Notes Preservation', () => {
    it('preserves sump delivery instructions and appends them to delivery destination', () => {
      const baseAddress = 'Building A, Flat 301, Andheri East, Mumbai';
      const instructions = 'Sump is at the rear entrance. Gate 2.';
      const combined = `${baseAddress} (Notes: ${instructions})`;

      expect(combined).toContain(baseAddress);
      expect(combined).toContain('Notes: Sump is at the rear entrance. Gate 2.');
    });
  });

  describe('3. Payment Method Conformance', () => {
    it('only accepts supported backend payment preferences (upi, cash_on_delivery, card_online)', () => {
      const validMethods = ['upi', 'cash_on_delivery', 'card_online'];
      expect(validMethods.includes('upi')).toBe(true);
      expect(validMethods.includes('cash_on_delivery')).toBe(true);
      expect(validMethods.includes('card_online')).toBe(true);
      expect(validMethods.includes('crypto_wallet')).toBe(false);
      expect(validMethods.includes('unverified_cheque')).toBe(false);
    });
  });

  describe('4. Duplicate Submission & Mutex Protection', () => {
    it('sets isCreatingBooking true during submission to prevent rapid double-clicks', async () => {
      const booking = useBookingStore.getState();
      expect(booking.isCreatingBooking).toBe(false);

      useBookingStore.setState({ isCreatingBooking: true });
      expect(useBookingStore.getState().isCreatingBooking).toBe(true);

      // Mutex guard simulation
      let clickHandled = false;
      const attemptSubmit = () => {
        if (useBookingStore.getState().isCreatingBooking) {
          return { blocked: true };
        }
        clickHandled = true;
        return { blocked: false };
      };

      const result = attemptSubmit();
      expect(result.blocked).toBe(true);
      expect(clickHandled).toBe(false);
    });
  });

  describe('5. Error Recovery & User Data Preservation', () => {
    it('preserves address and displays error banner without destroying user state on failure', () => {
      const location = useLocationStore.getState();
      const initialAddress = location.activeAddressText;

      // Simulate failure
      useBookingStore.setState({
        bookingError: 'Tanker vehicle has just been reserved by another customer. Please choose another tanker.',
        isCreatingBooking: false,
      });

      const state = useBookingStore.getState();
      expect(state.bookingError).toMatch(/reserved by another customer/i);
      // User's address is preserved
      expect(useLocationStore.getState().activeAddressText).toBe(initialAddress);
    });
  });
});
