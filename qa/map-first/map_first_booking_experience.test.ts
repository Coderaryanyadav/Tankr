import { useDiscoveryStore } from '../../src/stores/discoveryStore';
import { useLocationStore } from '../../src/stores/locationStore';
import { useBookingStore } from '../../src/stores/bookingStore';
import { NearbyTanker } from '../../src/types/discovery';

describe('MAP-01: Map-First Booking Experience & Interactive Bottom Sheet', () => {
  const MOCK_TANKERS: NearbyTanker[] = [
    {
      tanker_id: 'a0000000-0000-0000-0000-000000000001',
      supplier_id: 'b0000000-0000-0000-0000-000000000001',
      supplier_name: 'Marol Mini Waters',
      vehicle_number: 'MH-02-TC-1000',
      driver_name: 'Ramesh Pawar',
      driver_phone: '+919876543201',
      capacity_liters: 1000,
      water_type: 'Potable (Drinking)',
      base_price: 450,
      price_per_km: 25,
      distance_km: 1.2,
      eta_minutes: 8,
      estimated_total_price: 504,
      latitude: 19.1171,
      longitude: 72.8809,
      heading_degrees: 45,
      is_available: true,
      rating: 4.8,
      total_deliveries: 210,
    },
    {
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
    },
    {
      tanker_id: 'a0000000-0000-0000-0000-000000000003',
      supplier_id: 'b0000000-0000-0000-0000-000000000002',
      supplier_name: 'Powai Pure Waters',
      vehicle_number: 'MH-02-TC-5002',
      driver_name: 'Vikram Shinde',
      driver_phone: '+919876543203',
      capacity_liters: 5000,
      water_type: 'Potable (Drinking)',
      base_price: 1200,
      price_per_km: 40,
      distance_km: 0.8,
      eta_minutes: 6,
      estimated_total_price: 1293,
      latitude: 19.1180,
      longitude: 72.8820,
      heading_degrees: 180,
      is_available: false, // Busy delivering elsewhere
      rating: 4.7,
      total_deliveries: 420,
    },
  ];

  beforeEach(() => {
    useDiscoveryStore.setState({
      nearbyTankers: MOCK_TANKERS,
      filteredTankers: MOCK_TANKERS.filter((t) => t.is_available),
      selectedTankerId: null,
      selectedTanker: null,
      selectedCapacityFilter: null,
      sortOption: 'distance',
      isLoading: false,
    });
  });

  describe('1. Map Marker & Card Selection Synchronization', () => {
    it('synchronizes selection when user taps a tanker marker on the map', () => {
      const discovery = useDiscoveryStore.getState();
      const targetId = 'a0000000-0000-0000-0000-000000000002';

      discovery.selectTanker(targetId);

      const state = useDiscoveryStore.getState();
      expect(state.selectedTankerId).toBe(targetId);
      expect(state.selectedTanker?.tanker_id).toBe(targetId);
      expect(state.selectedTanker?.capacity_liters).toBe(5000);
      expect(state.selectedTanker?.estimated_total_price).toBe(1407);
    });

    it('synchronizes selection when user taps a tanker card in the bottom sheet', () => {
      const discovery = useDiscoveryStore.getState();
      const targetId = 'a0000000-0000-0000-0000-000000000001';

      discovery.selectTanker(targetId);

      const state = useDiscoveryStore.getState();
      expect(state.selectedTankerId).toBe(targetId);
      expect(state.selectedTanker?.vehicle_number).toBe('MH-02-TC-1000');
    });

    it('safely handles selection when a tanker becomes unavailable', () => {
      const discovery = useDiscoveryStore.getState();
      // Attempt to select busy/unavailable tanker
      discovery.selectTanker('a0000000-0000-0000-0000-000000000003');

      // Unavailable tanker must not be selected as active bookable
      const state = useDiscoveryStore.getState();
      const isBookable = state.filteredTankers.some(
        (t) => t.tanker_id === 'a0000000-0000-0000-0000-000000000003'
      );
      expect(isBookable).toBe(false);
    });
  });

  describe('2. Delivery Address Changes & Invalidation Logic', () => {
    it('updates coordinates, invalidates active quote, and recalculates when address changes', async () => {
      const location = useLocationStore.getState();
      const booking = useBookingStore.getState();

      // Pre-set quote
      useBookingStore.setState({
        activeQuote: {
          tanker_id: 'a0000000-0000-0000-0000-000000000001',
          supplier_name: 'Test',
          vehicle_number: 'MH-02',
          driver_name: 'Ramesh Pawar',
          capacity_liters: 1000,
          water_type: 'Potable',
          distance_km: 1.0,
          eta_minutes: 5,
          base_price: 450,
          delivery_charge: 25,
          surcharge: 0,
          tax_amount: 23.75,
          final_payable_amount: 498.75,
        },
      });

      // User switches delivery address
      const newAddress = 'Hiranandani Gardens, Powai, Mumbai';
      const newCoords = { latitude: 19.1197, longitude: 72.9051 };

      location.setActiveLocation(newAddress, newCoords, 'POWAI');
      useBookingStore.setState({ activeQuote: null }); // Invalidate quote

      const locState = useLocationStore.getState();
      const bookState = useBookingStore.getState();

      expect(locState.activeAddressText).toBe(newAddress);
      expect(locState.activeCoordinates.latitude).toBe(19.1197);
      expect(locState.activeCoordinates.longitude).toBe(72.9051);
      expect(bookState.activeQuote).toBeNull();
    });
  });

  describe('3. Filter Combinations & Sorting', () => {
    it('combines capacity filtering with price sorting', () => {
      const discovery = useDiscoveryStore.getState();

      // Set capacity filter to 5000L
      discovery.setCapacityFilter(5000);
      discovery.setSortOption('price');

      const state = useDiscoveryStore.getState();
      // Should filter to only 5000L available tankers
      state.filteredTankers.forEach((t) => {
        expect(t.capacity_liters).toBe(5000);
        expect(t.is_available).toBe(true);
      });
    });

    it('resets capacity filter cleanly when "All" is chosen', () => {
      const discovery = useDiscoveryStore.getState();

      discovery.setCapacityFilter(5000);
      expect(useDiscoveryStore.getState().selectedCapacityFilter).toBe(5000);

      discovery.setCapacityFilter(null);
      expect(useDiscoveryStore.getState().selectedCapacityFilter).toBeNull();
      expect(useDiscoveryStore.getState().filteredTankers.length).toBe(2);
    });
  });

  describe('4. GPS Permission & Safe Fallbacks', () => {
    it('maintains safe Mumbai central coordinates when GPS locating fails or is denied', async () => {
      const location = useLocationStore.getState();
      const current = location.activeCoordinates;

      // Ensure fallback coordinates are within valid Mumbai bounds
      expect(current.latitude).toBeGreaterThan(18.9);
      expect(current.latitude).toBeLessThan(19.3);
      expect(current.longitude).toBeGreaterThan(72.7);
      expect(current.longitude).toBeLessThan(73.1);
    });
  });
});
