import * as Location from 'expo-location';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';

export interface DriverPingData {
  bookingId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  timestamp: number;
}

export interface LiveTrackingState {
  currentLat: number;
  currentLng: number;
  heading: number;
  speedKmh: number;
  lastUpdated: Date;
  isStale: boolean;
  distanceRemainingKm: number;
  etaMinutes: number;
}

let activeLocationSubscription: Location.LocationSubscription | null = null;
let activeRealtimeChannel: RealtimeChannel | null = null;

export const TrackingService = {
  /**
   * Driver: Start broadcasting device GPS coordinates
   */
  startDriverTracking: async (
    bookingId: string,
    onPingSent?: (data: DriverPingData) => void
  ): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[TrackingService] Location permission denied for driver');
        return false;
      }

      // 1. Join Realtime Channel
      const channel = supabase.channel(`booking:tracking:${bookingId}`);
      await channel.subscribe();
      activeRealtimeChannel = channel;

      // 2. Start Device GPS Watcher (interval 4s or 15m delta)
      activeLocationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 4000,
          distanceInterval: 15,
        },
        async (loc) => {
          const pingData: DriverPingData = {
            bookingId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading || 0,
            speed: Math.max(0, Math.round((loc.coords.speed || 0) * 3.6)),
            timestamp: Date.now(),
          };

          // Broadcast over WebSocket
          await channel.send({
            type: 'broadcast',
            event: 'driver_ping',
            payload: pingData,
          });

          // Server-side validation & audit checkpoint
          supabase.rpc('record_driver_location_ping', {
            p_booking_id: bookingId,
            p_lat: pingData.latitude,
            p_lng: pingData.longitude,
            p_heading: pingData.heading,
            p_speed_kmh: pingData.speed,
          });

          onPingSent?.(pingData);
        }
      );

      return true;
    } catch (err) {
      console.warn('[TrackingService] Error starting driver tracking:', err);
      return false;
    }
  },

  /**
   * Driver / System: Stop location broadcasting
   */
  stopDriverTracking: async () => {
    if (activeLocationSubscription) {
      activeLocationSubscription.remove();
      activeLocationSubscription = null;
    }
    if (activeRealtimeChannel) {
      await activeRealtimeChannel.unsubscribe();
      activeRealtimeChannel = null;
    }
  },

  /**
   * Customer: Subscribe to driver live location updates via Supabase Realtime
   */
  subscribeToLiveTracking: (
    bookingId: string,
    destLat: number,
    destLng: number,
    onUpdate: (state: LiveTrackingState) => void
  ): (() => void) => {
    const channel = supabase.channel(`booking:tracking:${bookingId}`);

    channel
      .on('broadcast', { event: 'driver_ping' }, ({ payload }: { payload: DriverPingData }) => {
        // Calculate remaining distance in km
        const dLat = payload.latitude - destLat;
        const dLng = payload.longitude - destLng;
        const distKm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 111 * 10) / 10;
        const etaMin = Math.max(1, Math.round(distKm * 3.3));

        onUpdate({
          currentLat: payload.latitude,
          currentLng: payload.longitude,
          heading: payload.heading,
          speedKmh: payload.speed,
          lastUpdated: new Date(payload.timestamp),
          isStale: false,
          distanceRemainingKm: distKm,
          etaMinutes: etaMin,
        });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },
};

