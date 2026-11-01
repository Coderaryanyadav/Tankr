import * as Location from 'expo-location';
import { MapplsService } from '../mappls/mapplsService';

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
 * Default fallback coordinates: Marol, Andheri East, Mumbai
 */
export const DEFAULT_FALLBACK_LOCATION: GeoLocation = {
  latitude: 19.1171,
  longitude: 72.8809,
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
      // 1. Prioritize Mappls (MapmyIndia) Reverse Geocoding for India
      const mapplsResult = await MapplsService.reverseGeocode(coords.latitude, coords.longitude);
      if (mapplsResult) {
        return {
          formattedAddress: mapplsResult.formattedAddress,
          flatOrBuilding: mapplsResult.houseNumber || mapplsResult.houseName || '',
          streetAddress: [mapplsResult.subLocality, mapplsResult.locality].filter(Boolean).join(', ') || 'Main Road',
          city: mapplsResult.city,
          pincode: mapplsResult.pincode,
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
      }

      // 2. Fallback to device location geocoding
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
        city: item.city || 'Mumbai',
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
      return results.slice(0, 4).map((res) => ({
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

