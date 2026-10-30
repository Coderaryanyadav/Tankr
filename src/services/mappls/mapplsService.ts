/**
 * TANKR — Mappls (MapmyIndia) Geospatial & Navigation Engine
 * Powers reverse geocoding, address search, route ETA, and driver navigation across India.
 */
import { Platform, Linking } from 'react-native';

const MAPPLS_REST_KEY = process.env.EXPO_PUBLIC_MAPPLS_REST_KEY || '';
const MAPPLS_CLIENT_ID = process.env.EXPO_PUBLIC_MAPPLS_CLIENT_ID || '';
const MAPPLS_CLIENT_SECRET = process.env.EXPO_PUBLIC_MAPPLS_CLIENT_SECRET || '';

export interface MapplsAddress {
  formattedAddress: string;
  houseNumber?: string;
  houseName?: string;
  locality?: string;
  subLocality?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

export interface MapplsRouteETA {
  distanceKm: number;
  durationMinutes: number;
  routePolyline?: string;
}

class MapplsServiceClass {
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  /**
   * Fetch or return cached OAuth2 Bearer token from Mappls Security Gateway
   */
  async getOAuthToken(): Promise<string | null> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    if (!MAPPLS_CLIENT_ID || !MAPPLS_CLIENT_SECRET) {
      return null;
    }

    try {
      const response = await fetch('https://outpost.mapmyindia.com/api/security/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=client_credentials&client_id=${encodeURIComponent(
          MAPPLS_CLIENT_ID
        )}&client_secret=${encodeURIComponent(MAPPLS_CLIENT_SECRET)}`,
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data?.access_token) {
        this.cachedToken = data.access_token;
        // Expire 2 minutes early for safety buffer
        this.tokenExpiresAt = Date.now() + (data.expires_in - 120) * 1000;
        return this.cachedToken;
      }
      return null;
    } catch (err) {
      console.warn('[MapplsService] OAuth token fetch error:', err);
      return null;
    }
  }

  /**
   * Reverse geocoding via Mappls REST API (India-optimized precision)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<MapplsAddress | null> {
    try {
      // 1. Try search.mappls.com with Static Key (access_token)
      if (MAPPLS_REST_KEY) {
        const url = `https://search.mappls.com/search/address/rev-geocode?access_token=${MAPPLS_REST_KEY}&lat=${latitude}&lng=${longitude}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json?.results && json.results.length > 0) {
            const item = json.results[0];
            return {
              formattedAddress:
                item.formatted_address ||
                [item.street, item.subLocality, item.locality, item.city].filter(Boolean).join(', ') ||
                'Bengaluru, Karnataka',
              houseNumber: item.houseNumber,
              houseName: item.houseName,
              locality: item.locality,
              subLocality: item.subLocality || item.subSubLocality,
              city: item.city || 'Bengaluru',
              state: item.state || 'Karnataka',
              pincode: item.pincode || '',
              latitude,
              longitude,
            };
          }
        }
      }

      // 2. Try OAuth Bearer Token if available
      const token = await this.getOAuthToken();
      if (token) {
        const url = `https://atlas.mappls.com/api/places/geocode?lat=${latitude}&lng=${longitude}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          const item = json?.copResults || json?.results?.[0];
          if (item) {
            return {
              formattedAddress: item.formattedAddress || 'Bengaluru, Karnataka',
              locality: item.locality,
              city: item.city || 'Bengaluru',
              state: item.state || 'Karnataka',
              pincode: item.pincode || '',
              latitude,
              longitude,
            };
          }
        }
      }

      return null;
    } catch (err) {
      console.warn('[MapplsService] Reverse geocode error:', err);
      return null;
    }
  }

  /**
   * Driving Route and ETA using Mappls Routing API
   */
  async getRouteETA(
    startLat: number,
    startLng: number,
    destLat: number,
    destLng: number
  ): Promise<MapplsRouteETA | null> {
    try {
      if (MAPPLS_REST_KEY) {
        const url = `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_REST_KEY}/route_adv/driving/${startLng},${startLat};${destLng},${destLat}?geometries=polyline&overview=full`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data?.routes && data.routes.length > 0) {
            const route = data.routes[0];
            return {
              distanceKm: Math.round((route.distance / 1000) * 10) / 10,
              durationMinutes: Math.max(1, Math.round(route.duration / 60)),
              routePolyline: route.geometry,
            };
          }
        }
      }
      return null;
    } catch (err) {
      console.warn('[MapplsService] Route ETA error:', err);
      return null;
    }
  }

  /**
   * Launch native Mappls navigation intent on driver or customer device
   */
  openNavigation(destLat: number, destLng: number, label = 'Customer Delivery Location'): void {
    const webUrl = `https://maps.mappls.com/navigation/?destination=${destLat},${destLng}`;
    const appIntent = `mappls://navi?lat=${destLat}&lng=${destLng}&name=${encodeURIComponent(label)}`;

    Linking.canOpenURL(appIntent)
      .then((supported) => {
        if (supported) {
          Linking.openURL(appIntent);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl);
      });
  }
}

export const MapplsService = new MapplsServiceClass();

