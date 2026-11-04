import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { paymentService } from '../services/payment/paymentService';
import { notificationService } from '../services/notification/notificationService';
import { useNotificationStore } from './notificationStore';
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
  setActiveBooking: (booking: BookingRecord | null) => void;
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
    paymentPreference: PaymentPreference,
    scheduleOptions?: {
      delivery_type: 'instant' | 'scheduled_once' | 'recurring';
      scheduled_for?: string;
      recurring_days?: string[];
      recurring_time_slot?: string;
    }
  ) => Promise<{ success: boolean; booking?: BookingRecord; error?: string }>;
  cancelBooking: (
    bookingId: string,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
  fetchUserBookings: (customerId: string) => Promise<void>;
  subscribeToBookingUpdates: (bookingId: string) => () => void;
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

  setActiveBooking: (booking) => set({ activeBooking: booking }),

  requestPriceQuote: async (tanker, deliveryLat, deliveryLng) => {
    if (isNaN(deliveryLat) || isNaN(deliveryLng) || Math.abs(deliveryLat) < 0.01 || Math.abs(deliveryLng) < 0.01) {
      set({
        isLoadingQuote: false,
        bookingError: 'Invalid delivery coordinates. Please select a valid delivery address on the map.',
      });
      return null;
    }

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
        set({ activeQuote: q, isLoadingQuote: false, bookingError: null });
        return q;
      }

      if (process.env.NODE_ENV !== 'test') {
        console.warn('[BookingStore] RPC calculation returned no quote or error:', error);
      }
      set({
        activeQuote: null,
        isLoadingQuote: false,
        bookingError: error?.message || 'Unable to retrieve live quote from pricing engine.',
      });
      return null;
    } catch (err: any) {
      console.warn('[BookingStore] Quote calculation error:', err);
      set({
        activeQuote: null,
        isLoadingQuote: false,
        bookingError: err?.message || 'Network error while contacting pricing engine.',
      });
      return null;
    }
  },

  createBooking: async (
    tanker,
    customerId,
    deliveryAddress,
    deliveryLat,
    deliveryLng,
    paymentPreference,
    scheduleOptions
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

      if (error) {
        set({ isCreatingBooking: false, bookingError: error.message });
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        const errMsg = 'Failed to create booking: No response from dispatch server.';
        set({ isCreatingBooking: false, bookingError: errMsg });
        return { success: false, error: errMsg };
      }

      const bookingRow = data[0];
      const bookingId = bookingRow.booking_id;
      const bookingRef = bookingRow.booking_reference;
      const deliveryPin = bookingRow.delivery_pin;
      const finalAmount = Number(bookingRow.final_payable_amount);

      // If scheduled or recurring, update booking attributes in Supabase
      if (scheduleOptions && scheduleOptions.delivery_type !== 'instant') {
        await supabase
          .from('bookings')
          .update({
            delivery_type: scheduleOptions.delivery_type,
            scheduled_for: scheduleOptions.scheduled_for || null,
            recurring_days: scheduleOptions.recurring_days || null,
            recurring_time_slot: scheduleOptions.recurring_time_slot || null,
          })
          .eq('id', bookingId);
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
        delivery_type: scheduleOptions?.delivery_type || 'instant',
        scheduled_for: scheduleOptions?.scheduled_for,
        recurring_days: scheduleOptions?.recurring_days,
        recurring_time_slot: scheduleOptions?.recurring_time_slot,
      };

      // Phase 8: Authoritative payment processing (Idempotent & Reconciled)
      const payMethod = paymentPreference === 'cash_on_delivery' ? 'cod' : (paymentPreference as 'upi' | 'card');
      const paymentRes = await paymentService.processBookingPayment(bookingId, finalAmount, payMethod);

      if (!paymentRes.success) {
        // Rollback atomic booking reservation upon payment gateway failure
        await supabase.rpc('cancel_booking_atomic', {
          p_booking_id: bookingId,
          p_reason: `Payment failed: ${paymentRes.error}`,
        });
        set({ isCreatingBooking: false, isSearchingDriver: false, activeBooking: null, bookingError: paymentRes.error });
        return { success: false, error: paymentRes.error || 'Payment transaction failed' };
      }

      set({
        activeBooking: newRecord,
        userBookings: [newRecord, ...get().userBookings],
        isCreatingBooking: false,
        isSearchingDriver: true,
      });

      // Subscribe to authoritative real-time updates from drivers & suppliers
      get().subscribeToBookingUpdates(bookingId);

      // Phase 8: Dispatch booking confirmed notification
      notificationService.triggerNotification(
        customerId,
        'booking_confirmed',
        'Tanker Booking Confirmed! 🚛',
        `Your request for ${tanker.capacity_liters.toLocaleString('en-IN')}L water is being dispatched. Reference: ${bookingRef}`,
        bookingId
      ).catch(() => {});

      useNotificationStore.getState().addNotification({
        id: `notif-${Date.now()}`,
        user_id: customerId,
        title: 'Tanker Booking Confirmed! 🚛',
        body: `Your request for ${tanker.capacity_liters.toLocaleString('en-IN')}L water is being dispatched. Reference: ${bookingRef}`,
        booking_id: bookingId,
        type: 'booking_confirmed',
        is_read: false,
        created_at: new Date().toISOString(),
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
      const target = get().userBookings.find((b) => b.id === bookingId) || get().activeBooking;
      if (target && (target.status === 'delivering' || target.status === 'delivered' || target.status === 'cancelled')) {
        return {
          success: false,
          error: `Cannot cancel a delivery in '${target.status}' status. Water pumping has already commenced or completed.`,
        };
      }

      const { data, error } = await supabase.rpc('customer_cancel_booking_with_policy', {
        p_booking_id: bookingId,
        p_reason: reason,
      });

      if (data && data.success === false) {
        return { success: false, error: data.error || 'Cancellation policy rejected request.' };
      }

      if (error) {
        const { error: atomicErr } = await supabase.rpc('cancel_booking_atomic', {
          p_booking_id: bookingId,
          p_reason: reason,
        });
        if (atomicErr) {
          if (process.env.NODE_ENV !== 'test') {
            console.warn('[bookingStore] Remote cancellation warning:', atomicErr.message);
          }
        }
      }

      const updated = get().userBookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b
      );

      set({
        userBookings: updated,
        activeBooking:
          get().activeBooking?.id === bookingId
            ? null
            : get().activeBooking,
        isSearchingDriver: false,
      });

      // Phase 8: Trigger refund & cancellation notification
      paymentService.processRefund(bookingId, reason).catch(() => {});
      const cancelledBooking = get().userBookings.find((b) => b.id === bookingId);
      if (cancelledBooking) {
        notificationService.triggerNotification(
          cancelledBooking.customer_id,
          'booking_cancelled',
          'Booking Cancelled',
          `Order ${cancelledBooking.booking_reference} has been cancelled. Any pre-authorized charges will be refunded.`,
          bookingId
        ).catch(() => {});

        useNotificationStore.getState().addNotification({
          id: `notif-cancel-${Date.now()}`,
          user_id: cancelledBooking.customer_id,
          title: 'Booking Cancelled',
          body: `Order ${cancelledBooking.booking_reference} has been cancelled. Any pre-authorized charges will be refunded.`,
          booking_id: bookingId,
          type: 'booking_cancelled',
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

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
        const list = data as BookingRecord[];
        const activeTrip = list.find(
          (b) => b.status !== 'delivered' && b.status !== 'cancelled'
        );
        set((state) => ({
          userBookings: list,
          isLoadingBookings: false,
          activeBooking: state.activeBooking || activeTrip || null,
        }));
      } else {
        // If customer has no bookings or is demo user, check demo customer bookings from live database
        const { data: demoBookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('customer_id', '2644c504-f611-40d3-a1c1-0d97214bf6f9')
          .order('created_at', { ascending: false });

        if (demoBookings && demoBookings.length > 0) {
          const list = demoBookings as BookingRecord[];
          const activeTrip = list.find(
            (b) => b.status !== 'delivered' && b.status !== 'cancelled'
          );
          set((state) => ({
            userBookings: list,
            isLoadingBookings: false,
            activeBooking: state.activeBooking || activeTrip || null,
          }));
        } else {
          set({ isLoadingBookings: false });
        }
      }
    } catch (err) {
      set({ isLoadingBookings: false });
    }
  },

  subscribeToBookingUpdates: (bookingId: string) => {
    const channel = supabase
      .channel(`booking-live-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          const updatedRecord = payload.new as BookingRecord;
          set((state) => ({
            activeBooking: updatedRecord,
            isSearchingDriver: updatedRecord.status === 'pending',
            userBookings: state.userBookings.map((b) =>
              b.id === updatedRecord.id ? updatedRecord : b
            ),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  clearActiveBooking: () => {
    set({ activeBooking: null, isSearchingDriver: false });
  },
}));
