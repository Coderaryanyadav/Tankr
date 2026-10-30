import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface GeocodedAddress {
  formattedAddress: string;
  flatOrBuilding?: string;
  streetAddress: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

/**
 * Default fallback coordinates: Central Bengaluru
 */
export const DEFAULT_FALLBACK_LOCATION: GeoLocation = {
  latitude: 12.9716,
  longitude: 77.5946,
};

export const LocationService = {
  /**
   * Request foreground location permission with user-facing explanation
   */
  requestPermission: async (): Promise<boolean> => {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      if (existingStatus === 'granted') {
        return true;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.warn('[LocationService] Permission check error:', error);
      return false;
    }
  },

  /**
   * Fetch current GPS location. Never crashes if denied or timed out.
   */
  getCurrentLocation: async (): Promise<GeoLocation | null> => {
    try {
      const hasPermission = await LocationService.requestPermission();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.warn('[LocationService] Failed to obtain GPS location:', error);
      return null;
    }
  },

  /**
   * Reverse geocode a latitude/longitude into human-readable Indian address components
   */
  reverseGeocode: async (coords: GeoLocation): Promise<GeocodedAddress | null> => {
    try {
      const results = await Location.reverseGeocodeAsync(coords);
      if (!results || results.length === 0) {
        return null;
      }

      const item = results[0];
      const streetParts = [item.name, item.street, item.subregion || item.district]
        .filter(Boolean)
        .join(', ');

      const formatted = [streetParts, item.city, item.postalCode]
        .filter(Boolean)
        .join(', ');

      return {
        formattedAddress: formatted || 'Selected Pin Location',
        flatOrBuilding: item.name || '',
        streetAddress: [item.street, item.subregion].filter(Boolean).join(', ') || 'Main Road',
        city: item.city || 'Bengaluru',
        pincode: item.postalCode || '',
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
    } catch (error) {
      console.warn('[LocationService] Reverse geocode error:', error);
      return null;
    }
  },

  /**
   * Autocomplete location query helper
   */
  searchPlaces: async (query: string): Promise<Array<{ title: string; subtitle: string; coords: GeoLocation }>> => {
    if (!query || query.trim().length < 3) return [];

    try {
      const results = await Location.geocodeAsync(query);
      return results.slice(0, 4).map((res, index) => ({
        title: query,
        subtitle: `Latitude: ${res.latitude.toFixed(4)}, Longitude: ${res.longitude.toFixed(4)}`,
        coords: {
          latitude: res.latitude,
          longitude: res.longitude,
        },
      }));
    } catch (error) {
      console.warn('[LocationService] Geocoding query notice:', error);
      return [];
    }
  },
};
