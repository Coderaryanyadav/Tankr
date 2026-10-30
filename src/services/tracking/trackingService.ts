import * as Location from 'expo-location';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import {
  DRIVER_BACKGROUND_LOCATION_TASK,
  setActiveTrackingBookingId,
} from './backgroundLocationTask';

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
   * Driver: Start continuous GPS broadcasting (Foreground & Native Background)
   */
  startDriverTracking: async (
    bookingId: string,
    onPingSent?: (data: DriverPingData) => void
  ): Promise<boolean> => {
    try {
      // 1. Foreground Location Permission
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        console.warn('[TrackingService] Foreground location permission denied for driver');
        return false;
      }

      // 2. Background Location Permission (Essential for continuous tracking when driver locks phone)
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        console.warn('[TrackingService] Background location permission denied or limited');
      }

      // 3. Set Active Global Trip Reference
      setActiveTrackingBookingId(bookingId);

      // 4. Join Realtime Channel
      const channel = supabase.channel(`booking:tracking:${bookingId}`);
      await channel.subscribe();
      activeRealtimeChannel = channel;

      // 5. Start Native Background Location Updates (via TaskManager)
      const hasStartedBg = await Location.hasStartedLocationUpdatesAsync(
        DRIVER_BACKGROUND_LOCATION_TASK
      );
      if (!hasStartedBg && bgStatus === 'granted') {
        await Location.startLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 15, // Update every 15 meters to balance precision and battery
          showsBackgroundLocationIndicator: true, // Native iOS blue indicator pill
          pausesUpdatesAutomatically: false,
          foregroundService: {
            notificationTitle: 'TANKR Delivery in Progress',
            notificationBody: 'Broadcasting live tanker GPS location for active trip.',
            notificationColor: '#007AFF',
          },
        });
      }

      // 6. Foreground Watcher for low-latency in-app navigation
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

          // Broadcast over Supabase WebSocket
          await channel.send({
            type: 'broadcast',
            event: 'driver_ping',
            payload: pingData,
          });

          // Server-side audit & ETA checkpoint
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
   * Driver / System: Stop location broadcasting (Cleans up both background & foreground)
   */
  stopDriverTracking: async () => {
    try {
      setActiveTrackingBookingId(null);

      // Stop foreground watcher
      if (activeLocationSubscription) {
        activeLocationSubscription.remove();
        activeLocationSubscription = null;
      }

      // Stop native background task
      const hasStartedBg = await Location.hasStartedLocationUpdatesAsync(
        DRIVER_BACKGROUND_LOCATION_TASK
      );
      if (hasStartedBg) {
        await Location.stopLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK);
      }

      // Unsubscribe from WebSocket channel
      if (activeRealtimeChannel) {
        await activeRealtimeChannel.unsubscribe();
        activeRealtimeChannel = null;
      }
    } catch (err) {
      console.warn('[TrackingService] Error stopping tracking:', err);
    }
  },

  /**
   * Customer: Subscribe to driver live location updates via Supabase Realtime
   */
  subscribeToLiveTracking: (
    bookingId: string,
    destinationLat: number,
    destinationLng: number,
    onLocationUpdate: (state: LiveTrackingState) => void
  ) => {
    const channel = supabase.channel(`booking:tracking:${bookingId}`);

    channel
      .on('broadcast', { event: 'driver_ping' }, (payload) => {
        const ping = payload.payload as DriverPingData;
        if (!ping || !ping.latitude || !ping.longitude) return;

        let distanceKm = 3.5;
        let eta = 12;

        if (destinationLat && destinationLng) {
          const R = 6371;
          const dLat = ((destinationLat - ping.latitude) * Math.PI) / 180;
          const dLon = ((destinationLng - ping.longitude) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((ping.latitude * Math.PI) / 180) *
              Math.cos((destinationLat * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distanceKm = Math.round(R * c * 10) / 10;
          eta = Math.max(2, Math.round((distanceKm / 20) * 60));
        }

        onLocationUpdate({
          currentLat: ping.latitude,
          currentLng: ping.longitude,
          heading: ping.heading,
          speedKmh: ping.speed,
          lastUpdated: new Date(),
          isStale: false,
          distanceRemainingKm: distanceKm,
          etaMinutes: eta,
        });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },
};
