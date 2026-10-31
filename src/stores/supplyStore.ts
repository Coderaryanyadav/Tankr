import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { invoiceService } from '../services/invoice/invoiceService';
import { notificationService } from '../services/notification/notificationService';
import { useNotificationStore } from './notificationStore';
import { BookingRecord, BookingStatus } from '../types/booking';

export interface FleetVehicle {
  id: string;
  vehicle_number: string;
  capacity_liters: number;
  water_type: string;
  driver_name: string;
  driver_phone: string;
  is_online: boolean;
  is_available: boolean;
}

interface SupplyState {
  // Multi-user dynamic identity
  supplierId: string | null;
  supplierBusinessName: string;
  verificationStatus: string;
  driverId: string | null;
  driverName: string;
  driverAssignedVehicle: { vehicle_number: string; capacity_liters: number } | null;

  // Supplier Dashboard State
  pendingRequests: BookingRecord[];
  fleetTankers: FleetVehicle[];
  supplierMetrics: {
    todayRevenue: number;
    todayLiters: number;
    activeDeliveriesCount: number;
    completedCount: number;
  };
  isLoadingSupplier: boolean;

  // Driver Dashboard State
  assignedDelivery: BookingRecord | null;
  driverDutyStatus: boolean;
  isLoadingDriver: boolean;

  // Actions
  loadSupplierData: (userId: string, userPhone?: string) => Promise<void>;
  loadDriverData: (userId: string, userPhone?: string) => Promise<void>;
  subscribeToSupplierBookings: (supplierId: string) => () => void;
  subscribeToDriverTrips: (driverPhone: string) => () => void;
  onboardTankerVehicle: (payload: {
    vehicleNumber: string;
    capacityLiters: number;
    waterType: string;
    driverName: string;
    driverPhone: string;
  }) => Promise<{ success: boolean; error?: string }>;
  acceptSupplierBooking: (bookingId: string) => Promise<{ success: boolean; error?: string }>;
  rejectSupplierBooking: (bookingId: string) => Promise<{ success: boolean; error?: string }>;
  driverUpdateStatus: (
    bookingId: string,
    newStatus: BookingStatus,
    pin?: string
  ) => Promise<{ success: boolean; error?: string }>;
  toggleDriverDuty: () => void;
}

export const useSupplyStore = create<SupplyState>((set, get) => ({
  supplierId: null,
  supplierBusinessName: 'Loading Hub...',
  verificationStatus: 'pending_review',
  driverId: null,
  driverName: '',
  driverAssignedVehicle: null,

  pendingRequests: [],
  fleetTankers: [],
  supplierMetrics: {
    todayRevenue: 0,
    todayLiters: 0,
    activeDeliveriesCount: 0,
    completedCount: 0,
  },
  isLoadingSupplier: false,

  assignedDelivery: null,
  driverDutyStatus: true,
  isLoadingDriver: false,

  toggleDriverDuty: () => set((s) => ({ driverDutyStatus: !s.driverDutyStatus })),

  loadSupplierData: async (userId: string, userPhone?: string) => {
    set({ isLoadingSupplier: true });
    try {
      // 1. Fetch Supplier Record for authenticated user
      let supplierQuery = supabase.from('suppliers').select('*');
      if (userPhone) {
        const raw = userPhone.replace(/\D/g, '');
        const last10 = raw.slice(-10);
        supplierQuery = supplierQuery.or(
          `contact_phone.eq.+91${last10},contact_phone.eq.91${last10},contact_phone.eq.${last10}`
        );
      }

      const { data: supplierData } = await supplierQuery.limit(1).maybeSingle();

      if (!supplierData) {
        set({
          supplierId: null,
          supplierBusinessName: 'No Supplier Hub Registered',
          verificationStatus: 'unregistered',
          fleetTankers: [],
          pendingRequests: [],
          isLoadingSupplier: false,
        });
        return;
      }

      const currentSupplierId = supplierData.id;

      set({
        supplierId: currentSupplierId,
        supplierBusinessName: supplierData.business_name,
        verificationStatus: supplierData.verification_status || (supplierData.is_verified ? 'verified' : 'pending_review'),
      });

      // 2. Fetch Fleet Tankers for this supplier
      const { data: fleetData } = await supabase
        .from('tankers')
        .select('*')
        .eq('supplier_id', currentSupplierId);

      const fleet: FleetVehicle[] = (fleetData || []).map((t: any) => ({
        id: t.id,
        vehicle_number: t.vehicle_number,
        capacity_liters: t.capacity_liters,
        water_type: t.water_type || 'Potable (Drinking)',
        driver_name: t.driver_name,
        driver_phone: t.driver_phone,
        is_online: t.is_online,
        is_available: t.is_available,
      }));

      // 3. Fetch Pending Bookings for this supplier
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('supplier_id', currentSupplierId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // 4. Fetch Completed deliveries today for live metrics
      const { data: metricsData } = await supabase
        .from('bookings')
        .select('final_payable_amount, capacity_liters, status')
        .eq('supplier_id', currentSupplierId);

      const completed = (metricsData || []).filter((b: any) => b.status === 'delivered');
      const active = (metricsData || []).filter((b: any) =>
        ['accepted', 'driver_assigned', 'en_route', 'arrived', 'delivering'].includes(b.status)
      );

      const todayRevenue = completed.reduce((sum: number, b: any) => sum + Number(b.final_payable_amount || 0), 0);
      const todayLiters = completed.reduce((sum: number, b: any) => sum + Number(b.capacity_liters || 0), 0);

      set({
        supplierId: currentSupplierId,
        fleetTankers: fleet,
        pendingRequests: (bookingsData || []) as BookingRecord[],
        supplierMetrics: {
          todayRevenue,
          todayLiters,
          activeDeliveriesCount: active.length,
          completedCount: completed.length,
        },
        isLoadingSupplier: false,
      });
    } catch (err) {
      console.warn('[SupplyStore] Error loading supplier data:', err);
      set({ isLoadingSupplier: false });
    }
  },

  loadDriverData: async (userId: string, userPhone?: string) => {
    set({ isLoadingDriver: true });
    try {
      // 1. Fetch driver profile & vehicle information
      let resolvedDriverName = '';
      let resolvedAssignedVehicle: { vehicle_number: string; capacity_liters: number } | null = null;

      if (userId) {
        const { data: driverProf } = await supabase
          .from('driver_profiles')
          .select('full_name, assigned_tanker_id, tankers(vehicle_number, capacity_liters)')
          .eq('profile_id', userId)
          .maybeSingle();

        if (driverProf) {
          resolvedDriverName = driverProf.full_name || '';
          if (driverProf.tankers) {
            resolvedAssignedVehicle = {
              vehicle_number: (driverProf.tankers as any).vehicle_number,
              capacity_liters: Number((driverProf.tankers as any).capacity_liters),
            };
          }
        }
      }

      if (!resolvedDriverName && userPhone) {
        const raw = userPhone.replace(/\D/g, '');
        const last10 = raw.slice(-10);
        const { data: tankerRec } = await supabase
          .from('tankers')
          .select('driver_name, vehicle_number, capacity_liters')
          .or(`driver_phone.eq.+91${last10},driver_phone.eq.91${last10},driver_phone.eq.${last10}`)
          .limit(1)
          .maybeSingle();

        if (tankerRec) {
          resolvedDriverName = tankerRec.driver_name || '';
          resolvedAssignedVehicle = {
            vehicle_number: tankerRec.vehicle_number,
            capacity_liters: Number(tankerRec.capacity_liters),
          };
        }
      }

      // 2. Fetch Active Delivery assigned to driver's phone or profile
      let query = supabase
        .from('bookings')
        .select('*')
        .in('status', ['accepted', 'driver_assigned', 'en_route', 'arrived', 'delivering'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (userPhone) {
        const raw = userPhone.replace(/\D/g, '');
        const last10 = raw.slice(-10);
        query = query.or(
          `driver_phone.eq.+91${last10},driver_phone.eq.91${last10},driver_phone.eq.${last10}`
        );
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        const booking = data as BookingRecord;
        if (!resolvedAssignedVehicle && booking.vehicle_number) {
          resolvedAssignedVehicle = {
            vehicle_number: booking.vehicle_number,
            capacity_liters: booking.capacity_liters,
          };
        }
        if (!resolvedDriverName && booking.driver_name) {
          resolvedDriverName = booking.driver_name;
        }

        set({
          assignedDelivery: booking,
          driverName: resolvedDriverName,
          driverAssignedVehicle: resolvedAssignedVehicle,
          isLoadingDriver: false,
        });
      } else {
        set({
          assignedDelivery: null,
          driverName: resolvedDriverName,
          driverAssignedVehicle: resolvedAssignedVehicle,
          isLoadingDriver: false,
        });
      }
    } catch {
      set({ isLoadingDriver: false });
    }
  },

  subscribeToSupplierBookings: (supplierId: string) => {
    const channel = supabase
      .channel(`supplier:bookings:${supplierId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `supplier_id=eq.${supplierId}` },
        () => {
          const supId = get().supplierId;
          if (supId) {
            get().loadSupplierData(supId);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },

  subscribeToDriverTrips: (driverPhone: string) => {
    const raw = driverPhone.replace(/\D/g, '');
    const last10 = raw.slice(-10);
    const channel = supabase
      .channel(`driver:trips:${last10}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          get().loadDriverData('', driverPhone);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },

  onboardTankerVehicle: async (payload) => {
    const { supplierId } = get();
    if (!supplierId) {
      return { success: false, error: 'No active supplier hub connected. Please register your hub.' };
    }

    try {
      const { data, error } = await supabase.rpc('supplier_onboard_tanker', {
        p_supplier_id: supplierId,
        p_vehicle_number: payload.vehicleNumber,
        p_capacity_liters: payload.capacityLiters,
        p_water_type: payload.waterType,
        p_driver_name: payload.driverName,
        p_driver_phone: payload.driverPhone,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.success) {
        // Append to fleet
        const newVehicle: FleetVehicle = {
          id: data.tanker_id,
          vehicle_number: payload.vehicleNumber,
          capacity_liters: payload.capacityLiters,
          water_type: payload.waterType,
          driver_name: payload.driverName,
          driver_phone: payload.driverPhone,
          is_online: true,
          is_available: true,
        };

        set((state) => ({
          fleetTankers: [newVehicle, ...state.fleetTankers],
        }));

        return { success: true };
      }

      return { success: false, error: 'Failed to onboard vehicle' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error registering vehicle' };
    }
  },

  acceptSupplierBooking: async (bookingId) => {
    try {
      const { supplierId } = get();
      if (!supplierId) {
        return { success: false, error: 'Supplier ID not found' };
      }
      const { error: rpcErr } = await supabase.rpc('supplier_accept_booking', {
        p_booking_id: bookingId,
        p_supplier_id: supplierId,
      });

      if (rpcErr) {
        // Fallback: direct table update
        await supabase
          .from('bookings')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', bookingId);
      }

      set((state) => ({
        pendingRequests: state.pendingRequests.filter((b) => b.id !== bookingId),
      }));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to accept booking' };
    }
  },

  rejectSupplierBooking: async (bookingId) => {
    try {
      const { supplierId } = get();
      if (!supplierId) {
        return { success: false, error: 'Supplier ID not found' };
      }
      const { error: rpcErr } = await supabase.rpc('supplier_cancel_and_reassign', {
        p_booking_id: bookingId,
        p_supplier_id: supplierId,
        p_reason: 'Supplier unavailable (automatic fleet reassignment initiated)',
      });

      if (rpcErr) {
        // Fallback: direct table update
        await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancellation_reason: 'Supplier unavailable',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId);
      }

      set((state) => ({
        pendingRequests: state.pendingRequests.filter((b) => b.id !== bookingId),
      }));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to reject and reassign booking' };
    }
  },

  driverUpdateStatus: async (bookingId, newStatus, pin) => {
    try {
      const { error: rpcErr } = await supabase.rpc('driver_update_delivery_status', {
        p_booking_id: bookingId,
        p_new_status: newStatus,
        p_delivery_pin: pin || null,
      });

      if (rpcErr) {
        // Fallback: direct table update
        const updatePayload: any = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        };
        if (newStatus === 'en_route') updatePayload.dispatched_at = new Date().toISOString();
        if (newStatus === 'arrived') updatePayload.arrived_at = new Date().toISOString();
        if (newStatus === 'delivered') updatePayload.delivered_at = new Date().toISOString();

        await supabase.from('bookings').update(updatePayload).eq('id', bookingId);
      }

      // Update local assigned order
      const current = get().assignedDelivery;
      if (current && current.id === bookingId) {
        if (newStatus === 'delivered') {
          set({ assignedDelivery: null });

          // Generate official tax invoice
          invoiceService.generateInvoice(bookingId).catch(() => {});

          // Trigger customer push notification
          notificationService.triggerNotification(
            current.customer_id,
            'delivery_completed',
            'Water Delivery Completed! 💧',
            `Tanker ${current.vehicle_number} has completed pumping ${current.capacity_liters.toLocaleString('en-IN')}L into your sump.`,
            bookingId
          ).catch(() => {});

          useNotificationStore.getState().addNotification({
            id: `notif-delivered-${Date.now()}`,
            user_id: current.customer_id,
            title: 'Water Delivery Completed! 💧',
            body: `Tanker ${current.vehicle_number} has completed pumping ${current.capacity_liters.toLocaleString('en-IN')}L into your sump.`,
            booking_id: bookingId,
            type: 'delivery_completed',
            is_read: false,
            created_at: new Date().toISOString(),
          });
        } else {
          set({ assignedDelivery: { ...current, status: newStatus } });
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update delivery status' };
    }
  },
}));
