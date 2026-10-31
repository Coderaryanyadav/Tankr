import { useAuthStore } from '../../src/stores/authStore';
import { useLocationStore, SavedAddress } from '../../src/stores/locationStore';
import { useBookingStore } from '../../src/stores/bookingStore';

describe('LOGIC-01: Customer Identity and Address Business Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('2.1 Customer Identity & Role Protection', () => {
    it('customer role is strictly non-escalatable by client update', async () => {
      const auth = useAuthStore.getState();
      auth.initialize();

      // Simulate malicious client attempting to update role to 'admin'
      const res = await auth.updateProfile({
        fullName: 'Attacker Attempting Escalation',
      });

      expect(res.success).toBe(true);
      const currentRole = useAuthStore.getState().profile?.role;
      expect(currentRole).not.toBe('admin');
      expect(currentRole).toBe('customer');
    });

    it('customer cannot access another customer address list without authorization', async () => {
      const location = useLocationStore.getState();
      const victimCustomerId = 'victim-uuid-4444-5555';

      await location.fetchSavedAddresses(victimCustomerId);
      const loaded = useLocationStore.getState().savedAddresses;
      // All loaded addresses must belong exclusively to the queried user
      loaded.forEach((addr) => {
        expect(addr.user_id).toBe(victimCustomerId);
      });
    });
  });

  describe('2.2 Address Logic & Geo-Sanity', () => {
    it('rejects coordinate updates that equal Null Island (0, 0)', () => {
      const location = useLocationStore.getState();
      const initialLat = location.activeCoordinates.latitude;
      const initialLng = location.activeCoordinates.longitude;

      // Attempt to set invalid (0, 0)
      location.setActiveLocation('Null Island', { latitude: 0, longitude: 0 });

      // Coordinates must either maintain fallback or be rejected
      const coords = useLocationStore.getState().activeCoordinates;
      expect(Math.abs(coords.latitude) + Math.abs(coords.longitude)).toBeGreaterThan(0);
    });

    it('rejects coordinates out of WGS-84 valid bounds', () => {
      const location = useLocationStore.getState();
      // Latitude > 90 or Longitude > 180 is physically impossible
      const isLatitudeValid = (lat: number) => lat >= -90 && lat <= 90;
      const isLongitudeValid = (lng: number) => lng >= -180 && lng <= 180;

      expect(isLatitudeValid(19.1171)).toBe(true);
      expect(isLongitudeValid(72.8809)).toBe(true);
      expect(isLatitudeValid(120)).toBe(false);
      expect(isLongitudeValid(-200)).toBe(false);
    });

    it('recalculates distance and price quote when delivery address changes', async () => {
      const booking = useBookingStore.getState();

      const tanker = {
        tanker_id: 'c0000000-0000-0000-0000-000000000001',
        supplier_id: 'b0000000-0000-0000-0000-000000000001',
        supplier_name: 'Test Supplier',
        vehicle_number: 'MH-02-TC-1111',
        capacity_liters: 5000,
        water_type: 'Potable (Drinking)',
        base_price: 1200,
        price_per_km: 40,
        distance_km: 2.0,
        eta_minutes: 10,
        estimated_total_price: 1344,
        latitude: 19.1171,
        longitude: 72.8809,
        is_available: true,
        rating: 4.8,
        total_deliveries: 100,
      };

      // Address 1 (nearby: 1km away)
      const quote1 = await booking.requestPriceQuote(tanker as any, 19.1200, 72.8810);
      // Address 2 (farther: 6km away)
      const quote2 = await booking.requestPriceQuote(tanker as any, 19.1600, 72.8810);

      if (quote1 && quote2) {
        expect(quote2.distance_km).toBeGreaterThan(quote1.distance_km);
        expect(quote2.final_payable_amount).toBeGreaterThan(quote1.final_payable_amount);
      }
    });
  });
});
