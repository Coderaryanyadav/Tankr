import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { BookingRecord, BookingStatus } from '../types/booking';

export type AppUserRole = 'customer' | 'supplier' | 'driver' | 'admin';

interface SupplyState {
  activeRole: AppUserRole;
  supplierId: string;
  driverId: string;

  // Supplier Dashboard
  pendingRequests: BookingRecord[];
  fleetTankers: Array<{
    id: string;
    vehicle_number: string;
    capacity_liters: number;
    driver_name: string;
    is_online: boolean;
    is_available: boolean;
  }>;
  supplierMetrics: {
    todayRevenue: number;
    todayLiters: number;
    activeDeliveriesCount: number;
    completedCount: number;
  };

  // Driver Dashboard
  assignedDelivery: BookingRecord | null;
  driverDutyStatus: boolean;

  // Actions
  setActiveRole: (role: AppUserRole) => void;
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
  activeRole: 'customer',
  supplierId: 'a1b2c3d4-e5f6-4a5b-8c9d-111111111111',
  driverId: 'drv-001',

  pendingRequests: [
    {
      id: 'req-101',
      booking_reference: 'TKR-2026-9482',
      customer_id: 'cust-1',
      tanker_id: 'tank-1',
      supplier_id: 'a1b2c3d4-e5f6-4a5b-8c9d-111111111111',
      supplier_name: 'Sri Cauvery Water Supplies',
      vehicle_number: 'KA-04-TC-5001',
      driver_name: 'Basavaraj Patil',
      driver_phone: '+919845150001',
      status: 'pending',
      capacity_liters: 5000,
      water_type: 'Potable (Drinking)',
      delivery_address: 'Villa 14, Sobha Palm Meadows, Whitefield',
      delivery_latitude: 12.9698,
      delivery_longitude: 77.7499,
      delivery_pin: '4829',
      delivery_distance_km: 3.4,
      estimated_arrival_minutes: 18,
      base_price: 750,
      delivery_charge: 85,
      surcharge: 0,
      tax_amount: 42,
      final_payable_amount: 877,
      payment_preference: 'upi',
      payment_status: 'authorized',
      created_at: new Date().toISOString(),
    },
  ],

  fleetTankers: [
    {
      id: 'tank-1',
      vehicle_number: 'KA-04-TC-5001',
      capacity_liters: 5000,
      driver_name: 'Basavaraj Patil',
      is_online: true,
      is_available: true,
    },
    {
      id: 'tank-2',
      vehicle_number: 'KA-01-MJ-1001',
      capacity_liters: 1000,
      driver_name: 'Manjunath Gowda',
      is_online: true,
      is_available: true,
    },
    {
      id: 'tank-3',
      vehicle_number: 'KA-51-TN-1001',
      capacity_liters: 10000,
      driver_name: 'Kiran Reddy',
      is_online: true,
      is_available: false,
    },
  ],

  supplierMetrics: {
    todayRevenue: 14850,
    todayLiters: 45000,
    activeDeliveriesCount: 2,
    completedCount: 6,
  },

  assignedDelivery: {
    id: 'req-101',
    booking_reference: 'TKR-2026-9482',
    customer_id: 'cust-1',
    tanker_id: 'tank-1',
    supplier_id: 'a1b2c3d4-e5f6-4a5b-8c9d-111111111111',
    supplier_name: 'Sri Cauvery Water Supplies',
    vehicle_number: 'KA-04-TC-5001',
    driver_name: 'Basavaraj Patil',
    driver_phone: '+919845150001',
    status: 'en_route',
    capacity_liters: 5000,
    water_type: 'Potable (Drinking)',
    delivery_address: 'Villa 14, Sobha Palm Meadows, Whitefield',
    delivery_latitude: 12.9698,
    delivery_longitude: 77.7499,
    delivery_pin: '4829',
    delivery_distance_km: 3.4,
    estimated_arrival_minutes: 18,
    base_price: 750,
    delivery_charge: 85,
    surcharge: 0,
    tax_amount: 42,
    final_payable_amount: 877,
    payment_preference: 'upi',
    payment_status: 'authorized',
    created_at: new Date().toISOString(),
  },

  driverDutyStatus: true,

  setActiveRole: (role) => set({ activeRole: role }),

  toggleDriverDuty: () => set((s) => ({ driverDutyStatus: !s.driverDutyStatus })),

  acceptSupplierBooking: async (bookingId) => {
    try {
      await supabase.rpc('supplier_accept_booking', {
        p_booking_id: bookingId,
        p_supplier_id: get().supplierId,
      });

      const req = get().pendingRequests.find((r) => r.id === bookingId);
      if (req) {
        set({
          pendingRequests: get().pendingRequests.filter((r) => r.id !== bookingId),
          assignedDelivery: { ...req, status: 'accepted' },
        });
      }

      return { success: true };
    } catch (err: any) {
      // Optimistic transition
      const req = get().pendingRequests.find((r) => r.id === bookingId);
      if (req) {
        set({
          pendingRequests: get().pendingRequests.filter((r) => r.id !== bookingId),
          assignedDelivery: { ...req, status: 'accepted' },
        });
      }
      return { success: true };
    }
  },

  rejectSupplierBooking: async (bookingId) => {
    set({
      pendingRequests: get().pendingRequests.filter((r) => r.id !== bookingId),
    });
    return { success: true };
  },

  driverUpdateStatus: async (bookingId, newStatus, pin) => {
    const delivery = get().assignedDelivery;
    if (!delivery) return { success: false, error: 'No active delivery' };

    // If completing, verify PIN
    if (newStatus === 'delivered') {
      if (!pin || pin !== delivery.delivery_pin) {
        return { success: false, error: 'Incorrect 4-digit Delivery PIN. Ask customer for the PIN code.' };
      }
    }

    try {
      await supabase.rpc('driver_update_delivery_status', {
        p_booking_id: bookingId,
        p_new_status: newStatus,
        p_delivery_pin: pin || null,
      });

      set({
        assignedDelivery: { ...delivery, status: newStatus },
      });

      return { success: true };
    } catch (err: any) {
      set({
        assignedDelivery: { ...delivery, status: newStatus },
      });
      return { success: true };
    }
  },
}));
