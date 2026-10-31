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
      // 1. Invoke Real Supabase PostGIS RPC
      const { data, error } = await supabase.rpc('get_nearby_tankers', {
        user_lat: lat,
        user_lng: lng,
        radius_meters: 30000,
        capacity_filter: get().selectedCapacityFilter,
      });

      let tankersList: NearbyTanker[] = [];

      if (!error && data && Array.isArray(data) && data.length > 0) {
        tankersList = data as NearbyTanker[];
      } else {
        // 2. Direct real-time query against live tankers table in database
        const { data: dbTankers, error: dbErr } = await supabase
          .from('tankers')
          .select('*, suppliers!inner(business_name, rating, total_deliveries)')
          .eq('is_online', true)
          .eq('is_available', true);

        if (!dbErr && dbTankers && dbTankers.length > 0) {
          tankersList = dbTankers.map((t: any) => {
            const dLat = (t.latitude - lat) * 111;
            const dLng = (t.longitude - lng) * 111 * Math.cos((lat * Math.PI) / 180);
            const distKm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10;
            const etaMin = Math.max(5, Math.round(8 + distKm * 3.2));
            const estPrice = Math.round(Number(t.base_price) + distKm * Number(t.price_per_km));

            return {
              tanker_id: t.id,
              supplier_id: t.supplier_id,
              supplier_name: t.suppliers?.business_name || 'TANKR Partner Hub',
              vehicle_number: t.vehicle_number,
              driver_name: t.driver_name,
              driver_phone: t.driver_phone,
              capacity_liters: t.capacity_liters,
              water_type: t.water_type || 'Potable (Drinking)',
              base_price: Number(t.base_price),
              price_per_km: Number(t.price_per_km),
              distance_km: distKm,
              eta_minutes: etaMin,
              estimated_total_price: estPrice,
              latitude: t.latitude,
              longitude: t.longitude,
              heading_degrees: t.heading_degrees || 0,
              is_available: t.is_available,
              rating: Number(t.suppliers?.rating ?? 0),
              total_deliveries: Number(t.suppliers?.total_deliveries ?? 0),
            };
          });
        }
      }

      set({
        nearbyTankers: tankersList,
        isLoading: false,
        isRefreshing: false,
        lastFetchedAt: new Date(),
        error: tankersList.length === 0 ? 'No online tankers in your delivery radius' : null,
      });

      get().applyFiltersAndSort();

      // Auto-select first tanker if none selected
      const currentSelected = get().selectedTankerId;
      if (!currentSelected && tankersList.length > 0) {
        get().selectTanker(tankersList[0].tanker_id);
      }
    } catch (err: any) {
      console.warn('[DiscoveryStore] Exception fetching tankers:', err);
      set({
        nearbyTankers: [],
        isLoading: false,
        isRefreshing: false,
        lastFetchedAt: new Date(),
        error: err?.message || 'Failed to fetch live tankers',
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
