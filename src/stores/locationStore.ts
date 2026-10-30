import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import {
  DEFAULT_FALLBACK_LOCATION,
  GeocodedAddress,
  GeoLocation,
  LocationService,
} from '../services/location/locationService';

export interface SavedAddress {
  id: string;
  user_id: string;
  label: 'home' | 'work' | 'other';
  custom_name?: string | null;
  flat_or_building: string;
  street_address: string;
  landmark?: string | null;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  created_at?: string;
}

interface LocationState {
  // Current active delivery location
  activeCoordinates: GeoLocation;
  activeAddressText: string;
  activeAddressLabel: string;
  isLocating: boolean;

  // Saved Addresses
  savedAddresses: SavedAddress[];
  isLoadingAddresses: boolean;

  // Actions
  fetchSavedAddresses: (userId: string) => Promise<void>;
  setActiveLocation: (addressText: string, coords: GeoLocation, label?: string) => void;
  locateUserViaGps: () => Promise<GeocodedAddress | null>;
  addSavedAddress: (
    userId: string,
    address: Omit<SavedAddress, 'id' | 'user_id' | 'created_at'>
  ) => Promise<{ success: boolean; data?: SavedAddress; error?: string }>;
  updateSavedAddress: (
    id: string,
    updates: Partial<SavedAddress>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteSavedAddress: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  activeCoordinates: DEFAULT_FALLBACK_LOCATION,
  activeAddressText: 'Whitefield, Bengaluru',
  activeAddressLabel: 'Home',
  isLocating: false,
  savedAddresses: [],
  isLoadingAddresses: false,

  setActiveLocation: (addressText: string, coords: GeoLocation, label = 'Delivery Point') => {
    set({
      activeAddressText: addressText,
      activeCoordinates: coords,
      activeAddressLabel: label,
    });
  },

  locateUserViaGps: async (): Promise<GeocodedAddress | null> => {
    set({ isLocating: true });
    try {
      const coords = await LocationService.getCurrentLocation();
      if (!coords) {
        set({ isLocating: false });
        return null;
      }

      const geocoded = await LocationService.reverseGeocode(coords);
      if (geocoded) {
        set({
          activeCoordinates: coords,
          activeAddressText: geocoded.formattedAddress,
          activeAddressLabel: 'Current Location',
          isLocating: false,
        });
        return geocoded;
      }

      set({
        activeCoordinates: coords,
        isLocating: false,
      });
      return null;
    } catch (err) {
      console.warn('[LocationStore] Locate error:', err);
      set({ isLocating: false });
      return null;
    }
  },

  fetchSavedAddresses: async (userId: string) => {
    set({ isLoadingAddresses: true });
    try {
      const { data, error } = await supabase
        .from('saved_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[LocationStore] Fetch addresses notice:', error.message);
      }

      if (data && data.length > 0) {
        set({ savedAddresses: data as SavedAddress[], isLoadingAddresses: false });
        // Set default address if active location has not been selected yet
        const defaultAddr = data.find((a) => a.is_default) || data[0];
        if (defaultAddr) {
          const display = `${defaultAddr.flat_or_building}, ${defaultAddr.street_address}`;
          set({
            activeAddressText: display,
            activeCoordinates: {
              latitude: defaultAddr.latitude,
              longitude: defaultAddr.longitude,
            },
            activeAddressLabel: defaultAddr.label.toUpperCase(),
          });
        }
      } else {
        set({ savedAddresses: [], isLoadingAddresses: false });
      }
    } catch (err) {
      console.warn('[LocationStore] Error loading addresses:', err);
      set({ savedAddresses: [], isLoadingAddresses: false });
    }
  },

  addSavedAddress: async (userId, addressData) => {
    try {
      const { data, error } = await supabase
        .from('saved_addresses')
        .insert({
          user_id: userId,
          label: addressData.label,
          custom_name: addressData.custom_name,
          flat_or_building: addressData.flat_or_building,
          street_address: addressData.street_address,
          landmark: addressData.landmark,
          city: addressData.city,
          pincode: addressData.pincode,
          latitude: addressData.latitude,
          longitude: addressData.longitude,
          is_default: addressData.is_default,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      await get().fetchSavedAddresses(userId);
      return { success: true, data: data as SavedAddress };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to save address' };
    }
  },

  updateSavedAddress: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('saved_addresses')
        .update(updates)
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      const current = get().savedAddresses.map((a) => (a.id === id ? { ...a, ...updates } : a));
      set({ savedAddresses: current });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update address' };
    }
  },

  deleteSavedAddress: async (id) => {
    try {
      const { error } = await supabase
        .from('saved_addresses')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      set({ savedAddresses: get().savedAddresses.filter((a) => a.id !== id) });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete address' };
    }
  },
}));

