import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import {
  BookingQuote,
  BookingRecord,
  BookingStatus,
  PaymentPreference,
} from '../types/booking';
import { NearbyTanker } from '../types/discovery';

interface BookingState {
  activeQuote: BookingQuote | null;
  isLoadingQuote: boolean;
  activeBooking: BookingRecord | null;
  userBookings: BookingRecord[];
  isLoadingBookings: boolean;
  isCreatingBooking: boolean;
  isSearchingDriver: boolean;
  bookingError: string | null;

  // Actions
  requestPriceQuote: (
    tanker: NearbyTanker,
    deliveryLat: number,
    deliveryLng: number
  ) => Promise<BookingQuote | null>;
  createBooking: (
    tanker: NearbyTanker,
    customerId: string,
    deliveryAddress: string,
    deliveryLat: number,
    deliveryLng: number,
    paymentPreference: PaymentPreference
  ) => Promise<{ success: boolean; booking?: BookingRecord; error?: string }>;
  cancelBooking: (
    bookingId: string,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
  fetchUserBookings: (customerId: string) => Promise<void>;
  simulateStatusAdvance: () => void;
  clearActiveBooking: () => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  activeQuote: null,
  isLoadingQuote: false,
  activeBooking: null,
  userBookings: [],
  isLoadingBookings: false,
  isCreatingBooking: false,
  isSearchingDriver: false,
  bookingError: null,

  requestPriceQuote: async (tanker, deliveryLat, deliveryLng) => {
    set({ isLoadingQuote: true, bookingError: null });

    try {
      // Call Supabase pricing RPC
      const { data, error } = await supabase.rpc('calculate_booking_quote', {
        p_tanker_id: tanker.tanker_id,
        p_delivery_lat: deliveryLat,
        p_delivery_lng: deliveryLng,
      });

      if (!error && data && data.length > 0) {
        const q = data[0] as BookingQuote;
        set({ activeQuote: q, isLoadingQuote: false });
        return q;
      }

      // Authoritative fallback matching server formula
      const distKm = tanker.distance_km;
      const base = tanker.base_price;
      const deliveryCharge = Math.round(distKm * tanker.price_per_km);
      const surcharge = 0; // standard hours
      const tax = Math.round((base + deliveryCharge + surcharge) * 0.05);
      const total = base + deliveryCharge + surcharge + tax;

      const fallbackQuote: BookingQuote = {
        tanker_id: tanker.tanker_id,
        supplier_name: tanker.supplier_name,
        vehicle_number: tanker.vehicle_number,
        driver_name: tanker.driver_name,
        capacity_liters: tanker.capacity_liters,
        water_type: tanker.water_type,
        distance_km: distKm,
        eta_minutes: tanker.eta_minutes,
        base_price: base,
        delivery_charge: deliveryCharge,
        surcharge,
        tax_amount: tax,
        final_payable_amount: total,
      };

      set({ activeQuote: fallbackQuote, isLoadingQuote: false });
      return fallbackQuote;
    } catch (err: any) {
      console.warn('[BookingStore] Quote calculation error:', err);
      set({ isLoadingQuote: false });
      return null;
    }
  },

  createBooking: async (
    tanker,
    customerId,
    deliveryAddress,
    deliveryLat,
    deliveryLng,
    paymentPreference
  ) => {
    set({ isCreatingBooking: true, bookingError: null });

    try {
      // 1. Call atomic database transaction
      const { data, error } = await supabase.rpc('create_booking_atomic', {
        p_tanker_id: tanker.tanker_id,
        p_customer_id: customerId,
        p_delivery_address: deliveryAddress,
        p_delivery_lat: deliveryLat,
        p_delivery_lng: deliveryLng,
        p_payment_preference: paymentPreference,
      });

      let bookingRef = `TKR-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      let bookingId = 'mock-' + Date.now();
      let deliveryPin = `${Math.floor(1000 + Math.random() * 9000)}`;
      let finalAmount = tanker.estimated_total_price;

      if (!error && data && data.length > 0) {
        bookingId = data[0].booking_id;
        bookingRef = data[0].booking_reference;
        deliveryPin = data[0].delivery_pin;
        finalAmount = data[0].final_payable_amount;
      }

      const quote = get().activeQuote;

      const newRecord: BookingRecord = {
        id: bookingId,
        booking_reference: bookingRef,
        customer_id: customerId,
        tanker_id: tanker.tanker_id,
        supplier_id: tanker.supplier_id,
        supplier_name: tanker.supplier_name,
        vehicle_number: tanker.vehicle_number,
        driver_name: tanker.driver_name,
        driver_phone: tanker.driver_phone,
        status: 'pending',
        capacity_liters: tanker.capacity_liters,
        water_type: tanker.water_type,
        delivery_address: deliveryAddress,
        delivery_latitude: deliveryLat,
        delivery_longitude: deliveryLng,
        delivery_pin: deliveryPin,
        delivery_distance_km: quote?.distance_km || tanker.distance_km,
        estimated_arrival_minutes: quote?.eta_minutes || tanker.eta_minutes,
        base_price: quote?.base_price || tanker.base_price,
        delivery_charge: quote?.delivery_charge || Math.round(tanker.distance_km * tanker.price_per_km),
        surcharge: quote?.surcharge || 0,
        tax_amount: quote?.tax_amount || 0,
        final_payable_amount: finalAmount,
        payment_preference: paymentPreference,
        payment_status: paymentPreference === 'cash_on_delivery' ? 'pending_delivery' : 'authorized',
        created_at: new Date().toISOString(),
      };

      set({
        activeBooking: newRecord,
        userBookings: [newRecord, ...get().userBookings],
        isCreatingBooking: false,
        isSearchingDriver: true,
      });

      return { success: true, booking: newRecord };
    } catch (err: any) {
      const msg = err?.message || 'Failed to complete booking request';
      set({ isCreatingBooking: false, bookingError: msg });
      return { success: false, error: msg };
    }
  },

  cancelBooking: async (bookingId, reason = 'Customer requested cancellation') => {
    try {
      await supabase.rpc('cancel_booking_atomic', {
        p_booking_id: bookingId,
        p_reason: reason,
      });

      const updated = get().userBookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b
      );

      set({
        userBookings: updated,
        activeBooking:
          get().activeBooking?.id === bookingId
            ? { ...get().activeBooking!, status: 'cancelled' }
            : get().activeBooking,
        isSearchingDriver: false,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to cancel booking' };
    }
  },

  fetchUserBookings: async (customerId) => {
    set({ isLoadingBookings: true });
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        set({ userBookings: data as BookingRecord[], isLoadingBookings: false });
      } else {
        set({ isLoadingBookings: false });
      }
    } catch (err) {
      set({ isLoadingBookings: false });
    }
  },

  simulateStatusAdvance: () => {
    const current = get().activeBooking;
    if (!current) return;

    const progression: Record<BookingStatus, BookingStatus> = {
      pending: 'accepted',
      accepted: 'driver_assigned',
      supplier_assigned: 'driver_assigned',
      driver_assigned: 'en_route',
      en_route: 'arrived',
      arrived: 'delivering',
      delivering: 'delivered',
      delivered: 'delivered',
      cancelled: 'cancelled',
      disputed: 'disputed',
    };

    const nextStatus = progression[current.status];
    const updated: BookingRecord = {
      ...current,
      status: nextStatus,
    };

    set({
      activeBooking: updated,
      isSearchingDriver: nextStatus === 'pending',
      userBookings: get().userBookings.map((b) => (b.id === current.id ? updated : b)),
    });
  },

  clearActiveBooking: () => {
    set({ activeBooking: null, isSearchingDriver: false });
  },
}));
