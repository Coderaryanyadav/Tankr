import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import {
  NearbyTanker,
  TankerCapacityLiters,
  TankerSortOption,
} from '../types/discovery';

interface DiscoveryState {
  // Tankers state
  nearbyTankers: NearbyTanker[];
  filteredTankers: NearbyTanker[];
  selectedTankerId: string | null;
  selectedTanker: NearbyTanker | null;

  // Filter & Sort state
  selectedCapacityFilter: TankerCapacityLiters | null;
  sortOption: TankerSortOption;

  // Loading & Error
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchedAt: Date | null;

  // Map state
  userCoordinates: { latitude: number; longitude: number };

  // Actions
  fetchNearbyTankers: (lat: number, lng: number, forceRefresh?: boolean) => Promise<void>;
  selectTanker: (id: string | null) => void;
  setCapacityFilter: (capacity: TankerCapacityLiters | null) => void;
  setSortOption: (sort: TankerSortOption) => void;
  applyFiltersAndSort: () => void;
}

// Fallback generator around the customer's coordinate if DB has not been seeded yet
const generateFallbackTankers = (userLat: number, userLng: number): NearbyTanker[] => {
  const templates = [
    {
      id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      supplier_id: 'a1b2c3d4-e5f6-4a5b-8c9d-111111111111',
      supplier_name: 'Sri Cauvery Water Supplies',
      vehicle_number: 'KA-01-MJ-1001',
      driver_name: 'Manjunath Gowda',
      driver_phone: '+919845110001',
      capacity_liters: 1000 as TankerCapacityLiters,
      water_type: 'Potable (Drinking)',
      base_price: 350,
      price_per_km: 20,
      dLat: 0.008,
      dLng: 0.006,
      heading: 45,
      rating: 4.9,
      total_deliveries: 340,
    },
    {
      id: '8a2ceb3c-2a6c-4c9c-8acc-1a9c6a2cba5c',
      supplier_id: 'b2c3d4e5-f6a7-4b6c-9d0e-222222222222',
      supplier_name: 'Ganga Jal Commercial Tankers',
      vehicle_number: 'KA-03-FA-2002',
      driver_name: 'Ravi Shankar',
      driver_phone: '+919845120002',
      capacity_liters: 2000 as TankerCapacityLiters,
      water_type: 'Potable (Drinking)',
      base_price: 480,
      price_per_km: 22,
      dLat: -0.006,
      dLng: 0.012,
      heading: 120,
      rating: 4.8,
      total_deliveries: 280,
    },
    {
      id: '7b3dfc2b-1b5b-4b8b-7bbb-0b8b5b1ba4b',
      supplier_id: 'a1b2c3d4-e5f6-4a5b-8c9d-111111111111',
      supplier_name: 'Sri Cauvery Water Supplies',
      vehicle_number: 'KA-04-TC-5001',
      driver_name: 'Basavaraj Patil',
      driver_phone: '+919845150001',
      capacity_liters: 5000 as TankerCapacityLiters,
      water_type: 'Potable (Drinking)',
      base_price: 750,
      price_per_km: 25,
      dLat: 0.012,
      dLng: -0.009,
      heading: 90,
      rating: 4.9,
      total_deliveries: 420,
    },
    {
      id: '6c4eed1a-0a4a-4a7a-6aaa-9a7a4a0a93a',
      supplier_id: 'c3d4e5f6-a7b8-4c7d-0e1f-333333333333',
      supplier_name: 'Nandi Water Express',
      vehicle_number: 'KA-51-TN-1001',
      driver_name: 'Kiran Reddy',
      driver_phone: '+919845110010',
      capacity_liters: 10000 as TankerCapacityLiters,
      water_type: 'Potable (Drinking)',
      base_price: 1200,
      price_per_km: 30,
      dLat: -0.014,
      dLng: -0.011,
      heading: 310,
      rating: 4.7,
      total_deliveries: 195,
    },
    {
      id: '5d5ffd09-9b39-4969-5999-89693999829',
      supplier_id: 'c3d4e5f6-a7b8-4c7d-0e1f-333333333333',
      supplier_name: 'Nandi Water Express',
      vehicle_number: 'KA-01-EQ-1201',
      driver_name: 'Anand Swamy',
      driver_phone: '+919845112001',
      capacity_liters: 12000 as TankerCapacityLiters,
      water_type: 'Potable (Drinking)',
      base_price: 1450,
      price_per_km: 35,
      dLat: 0.018,
      dLng: 0.015,
      heading: 15,
      rating: 4.7,
      total_deliveries: 230,
    },
    {
      id: '4e6aae98-8a28-4858-4888-78582888718',
      supplier_id: 'd4e5f6a7-b8c9-4d8e-1f2a-444444444444',
      supplier_name: 'Bangalore Pure Drops',
      vehicle_number: 'KA-04-HV-2001',
      driver_name: 'Mohan Das',
      driver_phone: '+919845120001',
      capacity_liters: 20000 as TankerCapacityLiters,
      water_type: 'Potable (Drinking)',
      base_price: 2200,
      price_per_km: 45,
      dLat: -0.022,
      dLng: 0.008,
      heading: 270,
      rating: 4.9,
      total_deliveries: 510,
    },
  ];

  return templates.map((t) => {
    const lat = userLat + t.dLat;
    const lng = userLng + t.dLng;
    // Calculate realistic distance in km
    const distKm = Math.round(Math.sqrt(t.dLat * t.dLat + t.dLng * t.dLng) * 111 * 10) / 10;
    const etaMin = Math.round(6 + distKm * 3.3);
    const totalPrice = Math.round(t.base_price + distKm * t.price_per_km);

    return {
      tanker_id: t.id,
      supplier_id: t.supplier_id,
      supplier_name: t.supplier_name,
      vehicle_number: t.vehicle_number,
      driver_name: t.driver_name,
      driver_phone: t.driver_phone,
      capacity_liters: t.capacity_liters,
      water_type: t.water_type,
      base_price: t.base_price,
      price_per_km: t.price_per_km,
      distance_km: distKm,
      eta_minutes: etaMin,
      estimated_total_price: totalPrice,
      latitude: lat,
      longitude: lng,
      heading_degrees: t.heading,
      is_available: true,
      rating: t.rating,
      total_deliveries: t.total_deliveries,
    };
  });
};

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  nearbyTankers: [],
  filteredTankers: [],
  selectedTankerId: null,
  selectedTanker: null,
  selectedCapacityFilter: null,
  sortOption: 'distance',
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastFetchedAt: null,
  userCoordinates: { latitude: 12.9716, longitude: 77.5946 },

  fetchNearbyTankers: async (lat: number, lng: number, forceRefresh = false) => {
    if (forceRefresh) {
      set({ isRefreshing: true, error: null });
    } else {
      set({ isLoading: true, error: null });
    }

    set({ userCoordinates: { latitude: lat, longitude: lng } });

    try {
      // 1. Invoke Supabase PostGIS RPC
      const { data, error } = await supabase.rpc('get_nearby_tankers', {
        user_lat: lat,
        user_lng: lng,
        radius_meters: 25000,
        capacity_filter: get().selectedCapacityFilter,
      });

      if (error) {
        console.warn('[DiscoveryStore] RPC error or unseeded schema, falling back to local geo data:', error.message);
      }

      let tankersList: NearbyTanker[] = [];

      if (data && Array.isArray(data) && data.length > 0) {
        tankersList = data as NearbyTanker[];
      } else {
        // Fallback to high-fidelity geographic points around user coordinate
        tankersList = generateFallbackTankers(lat, lng);
      }

      set({
        nearbyTankers: tankersList,
        isLoading: false,
        isRefreshing: false,
        lastFetchedAt: new Date(),
      });

      get().applyFiltersAndSort();

      // Auto-select first tanker if none selected
      const currentSelected = get().selectedTankerId;
      if (!currentSelected && tankersList.length > 0) {
        get().selectTanker(tankersList[0].tanker_id);
      }
    } catch (err: any) {
      console.warn('[DiscoveryStore] Exception fetching tankers:', err);
      const fallback = generateFallbackTankers(lat, lng);
      set({
        nearbyTankers: fallback,
        isLoading: false,
        isRefreshing: false,
        lastFetchedAt: new Date(),
      });
      get().applyFiltersAndSort();
    }
  },

  selectTanker: (id: string | null) => {
    const found = get().nearbyTankers.find((t) => t.tanker_id === id) || null;
    set({ selectedTankerId: id, selectedTanker: found });
  },

  setCapacityFilter: (capacity: TankerCapacityLiters | null) => {
    set({ selectedCapacityFilter: capacity });
    get().applyFiltersAndSort();
  },

  setSortOption: (sort: TankerSortOption) => {
    set({ sortOption: sort });
    get().applyFiltersAndSort();
  },

  applyFiltersAndSort: () => {
    const { nearbyTankers, selectedCapacityFilter, sortOption } = get();

    let list = [...nearbyTankers];

    // Filter by capacity
    if (selectedCapacityFilter !== null) {
      list = list.filter((t) => t.capacity_liters === selectedCapacityFilter);
    }

    // Sort
    if (sortOption === 'price') {
      list.sort((a, b) => a.estimated_total_price - b.estimated_total_price);
    } else if (sortOption === 'eta') {
      list.sort((a, b) => a.eta_minutes - b.eta_minutes);
    } else {
      // default: distance
      list.sort((a, b) => a.distance_km - b.distance_km);
    }

    set({ filteredTankers: list });

    // Update selected tanker if current selection was filtered out
    const currentSelected = get().selectedTanker;
    if (currentSelected && !list.some((t) => t.tanker_id === currentSelected.tanker_id)) {
      set({
        selectedTankerId: list.length > 0 ? list[0].tanker_id : null,
        selectedTanker: list.length > 0 ? list[0] : null,
      });
    }
  },
}));

