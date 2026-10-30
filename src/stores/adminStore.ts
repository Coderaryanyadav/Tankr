import { create } from 'zustand';
import { supabase } from '../services/supabase/client';

export interface AdminMetrics {
  total_gmv: number;
  platform_revenue: number;
  total_bookings: number;
  completed_bookings: number;
  active_tankers_online: number;
  total_suppliers: number;
  pending_kyc_suppliers: number;
  total_liters_delivered: number;
  surge_multiplier: number;
}

export interface SupplierKYCItem {
  id: string;
  business_name: string;
  contact_person: string;
  phone_number: string;
  gstin: string;
  fleet_size: number;
  verification_status: 'verified' | 'pending_review' | 'rejected';
  water_source: string;
  submitted_at: string;
}

export interface DisputeItem {
  id: string;
  booking_reference: string;
  customer_name: string;
  supplier_name: string;
  amount: number;
  reason: string;
  status: 'open' | 'resolved' | 'refunded';
  created_at: string;
}

interface AdminState {
  metrics: AdminMetrics;
  pendingSuppliers: SupplierKYCItem[];
  disputes: DisputeItem[];
  isLoading: boolean;
  emergencyMode: boolean;

  fetchDashboardMetrics: () => Promise<void>;
  approveSupplier: (supplierId: string) => Promise<boolean>;
  rejectSupplier: (supplierId: string) => Promise<boolean>;
  setSurgeMultiplier: (multiplier: number) => Promise<void>;
  toggleEmergencyMode: () => void;
  resolveDispute: (disputeId: string, refund: boolean) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  metrics: {
    total_gmv: 489200,
    platform_revenue: 48920,
    total_bookings: 384,
    completed_bookings: 362,
    active_tankers_online: 28,
    total_suppliers: 14,
    pending_kyc_suppliers: 2,
    total_liters_delivered: 2150000,
    surge_multiplier: 1.0,
  },

  pendingSuppliers: [
    {
      id: 'sup-pending-01',
      business_name: 'Marathahalli Aqua Express',
      contact_person: 'Ramesh Reddy',
      phone_number: '+91 99801 23456',
      gstin: '29ABCDE1234F1Z5',
      fleet_size: 4,
      verification_status: 'pending_review',
      water_source: 'BWSSB Certified Borewell & Filter Plant',
      submitted_at: '2 hours ago',
    },
    {
      id: 'sup-pending-02',
      business_name: 'Varthur Fresh Water Supplies',
      contact_person: 'Srinivas Murthy',
      phone_number: '+91 98450 78901',
      gstin: '29XYZAB5678C1Z2',
      fleet_size: 6,
      verification_status: 'pending_review',
      water_source: 'RO Treated Water Source',
      submitted_at: '5 hours ago',
    },
  ],

  disputes: [
    {
      id: 'disp-01',
      booking_reference: 'TKR-2026-8812',
      customer_name: 'Ananya Sharma',
      supplier_name: 'Sri Cauvery Water Supplies',
      amount: 877,
      reason: 'Driver delivered 4,000L instead of 5,000L tank capacity.',
      status: 'open',
      created_at: '1 hour ago',
    },
  ],

  isLoading: false,
  emergencyMode: false,

  fetchDashboardMetrics: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_metrics');

      if (!error && data && data.length > 0) {
        const row = data[0];
        set({
          metrics: {
            total_gmv: Number(row.total_gmv),
            platform_revenue: Number(row.platform_revenue),
            total_bookings: Number(row.total_bookings),
            completed_bookings: Number(row.completed_bookings),
            active_tankers_online: Number(row.active_tankers_online),
            total_suppliers: Number(row.total_suppliers),
            pending_kyc_suppliers: Number(row.pending_kyc_suppliers),
            total_liters_delivered: Number(row.total_liters_delivered),
            surge_multiplier: Number(row.surge_multiplier),
          },
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  approveSupplier: async (supplierId: string) => {
    try {
      await supabase.rpc('admin_verify_supplier', {
        p_supplier_id: supplierId,
        p_status: 'verified',
      });

      set((state) => ({
        pendingSuppliers: state.pendingSuppliers.filter((s) => s.id !== supplierId),
        metrics: {
          ...state.metrics,
          pending_kyc_suppliers: Math.max(0, state.metrics.pending_kyc_suppliers - 1),
          total_suppliers: state.metrics.total_suppliers + 1,
        },
      }));
      return true;
    } catch {
      set((state) => ({
        pendingSuppliers: state.pendingSuppliers.filter((s) => s.id !== supplierId),
      }));
      return true;
    }
  },

  rejectSupplier: async (supplierId: string) => {
    try {
      await supabase.rpc('admin_verify_supplier', {
        p_supplier_id: supplierId,
        p_status: 'rejected',
      });

      set((state) => ({
        pendingSuppliers: state.pendingSuppliers.filter((s) => s.id !== supplierId),
        metrics: {
          ...state.metrics,
          pending_kyc_suppliers: Math.max(0, state.metrics.pending_kyc_suppliers - 1),
        },
      }));
      return true;
    } catch {
      set((state) => ({
        pendingSuppliers: state.pendingSuppliers.filter((s) => s.id !== supplierId),
      }));
      return true;
    }
  },

  setSurgeMultiplier: async (multiplier: number) => {
    set((state) => ({
      metrics: {
        ...state.metrics,
        surge_multiplier: multiplier,
      },
    }));

    try {
      await supabase
        .from('platform_settings')
        .update({
          value: {
            surge_multiplier: multiplier,
          },
        })
        .eq('key', 'pricing_defaults');
    } catch {
      // Ignored
    }
  },

  toggleEmergencyMode: () => {
    set((state) => ({ emergencyMode: !state.emergencyMode }));
  },

  resolveDispute: async (disputeId: string, refund: boolean) => {
    set((state) => ({
      disputes: state.disputes.map((d) =>
        d.id === disputeId
          ? { ...d, status: refund ? 'refunded' : 'resolved' }
          : d
      ),
    }));
  },
}));
