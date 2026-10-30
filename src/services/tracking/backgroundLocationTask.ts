import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { supabase } from '../supabase/client';

export const DRIVER_BACKGROUND_LOCATION_TASK = 'TANKR_DRIVER_BACKGROUND_LOCATION_TASK';

interface QueuedLocationPing {
  bookingId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  timestamp: number;
}

// Global active tracking metadata
let activeBookingId: string | null = null;
const pingQueue: QueuedLocationPing[] = [];
let isFlushingQueue = false;

export const setActiveTrackingBookingId = (bookingId: string | null) => {
  activeBookingId = bookingId;
};

export const getActiveTrackingBookingId = (): string | null => {
  return activeBookingId;
};

/**
 * Flush offline buffered pings to database upon network reconnection
 */
const flushPingQueue = async () => {
  if (isFlushingQueue || pingQueue.length === 0) return;
  isFlushingQueue = true;

  try {
    while (pingQueue.length > 0) {
      const ping = pingQueue[0];
      const { error } = await supabase.rpc('record_driver_location_ping', {
        p_booking_id: ping.bookingId,
        p_lat: ping.latitude,
        p_lng: ping.longitude,
        p_heading: ping.heading,
        p_speed_kmh: ping.speed,
      });

      if (!error) {
        pingQueue.shift();
      } else {
        // Network still unavailable or temporary disruption
        break;
      }
    }
  } catch (err) {
    console.warn('[BackgroundTracking] Error flushing ping queue:', err);
  } finally {
    isFlushingQueue = false;
  }
};

/**
 * Native Background Location Task Callback.
 * Executed by iOS / Android OS when new GPS coordinates are received while the app is backgrounded.
 */
TaskManager.defineTask(DRIVER_BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[BackgroundTracking] Task error:', error.message);
    return;
  }

  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  const currentBooking = activeBookingId;
  if (!currentBooking) {
    // No active trip requiring location broadcast
    return;
  }

  // Pick the freshest location fix
  const latest = locations[locations.length - 1];
  const { coords, timestamp } = latest;

  const pingData: QueuedLocationPing = {
    bookingId: currentBooking,
    latitude: coords.latitude,
    longitude: coords.longitude,
    heading: coords.heading || 0,
    speed: Math.max(0, Math.round((coords.speed || 0) * 3.6)),
    timestamp,
  };

  try {
    // 1. WebSocket Broadcast to listening customer
    const channel = supabase.channel(`booking:tracking:${currentBooking}`);
    await channel.send({
      type: 'broadcast',
      event: 'driver_ping',
      payload: pingData,
    });

    // 2. Persist Ping in Postgres database for audit & speed calculation
    const { error: rpcError } = await supabase.rpc('record_driver_location_ping', {
      p_booking_id: currentBooking,
      p_lat: pingData.latitude,
      p_lng: pingData.longitude,
      p_heading: pingData.heading,
      p_speed_kmh: pingData.speed,
    });

    if (rpcError) {
      // Buffer in offline queue for retry
      pingQueue.push(pingData);
    } else {
      // Success - check if pending buffered pings need flushing
      if (pingQueue.length > 0) {
        flushPingQueue();
      }
    }
  } catch (netErr) {
    // Buffer offline
    pingQueue.push(pingData);
  }
});
