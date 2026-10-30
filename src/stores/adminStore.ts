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
  category?: string;
  status: 'open' | 'resolved' | 'refunded';
  created_at: string;
}

export interface AdminAuditLogItem {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  notes?: string;
  created_at: string;
}

export interface ServiceZoneItem {
  zone_name: string;
  online_fleet_count: number;
  available_fleet_count: number;
  active_deliveries: number;
  liquidity_status: 'OPTIMAL' | 'LIMITED_SUPPLY' | 'HIGH_DEMAND_SURGE';
  avg_eta_minutes: number;
  traffic_factor: number;
}

interface AdminState {
  metrics: AdminMetrics;
  pendingSuppliers: SupplierKYCItem[];
  disputes: DisputeItem[];
  auditLogs: AdminAuditLogItem[];
  serviceZones: ServiceZoneItem[];
  isLoading: boolean;
  emergencyMode: boolean;

  fetchDashboardMetrics: () => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
  fetchServiceZones: () => Promise<void>;
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

  pendingSuppliers: [],
  disputes: [],
  auditLogs: [],
  serviceZones: [],
  isLoading: false,
  emergencyMode: false,

  fetchDashboardMetrics: async () => {
    set({ isLoading: true });
    try {
      // 1. Authoritative Metrics RPC
      const { data, error } = await supabase.rpc('get_admin_dashboard_metrics');

      if (!error && data && data.length > 0) {
        const row = data[0];
        set({
          metrics: {
            total_gmv: Number(row.total_gmv || 0),
            platform_revenue: Number(row.platform_revenue || 0),
            total_bookings: Number(row.total_bookings || 0),
            completed_bookings: Number(row.completed_bookings || 0),
            active_tankers_online: Number(row.active_tankers_online || 0),
            total_suppliers: Number(row.total_suppliers || 0),
            pending_kyc_suppliers: Number(row.pending_kyc_suppliers || 0),
            total_liters_delivered: Number(row.total_liters_delivered || 0),
            surge_multiplier: Number(row.surge_multiplier || 1.0),
          },
        });
      }

      // 2. Fetch pending supplier applications
      const { data: sups } = await supabase
        .from('suppliers')
        .select('*')
        .eq('verification_status', 'pending_review');

      if (sups) {
        set({
          pendingSuppliers: sups.map((s: any) => ({
            id: s.id,
            business_name: s.business_name,
            contact_person: 'Fleet Operations',
            phone_number: s.contact_phone,
            gstin: s.gstin || '29AABCS1429B1Z8',
            fleet_size: 2,
            verification_status: s.verification_status,
            water_source: s.water_source || 'Tested Borewell',
            submitted_at: s.created_at,
          })),
        });
      }

      // 3. Fetch open customer disputes
      const { data: dispData } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (dispData) {
        set({
          disputes: dispData.map((d: any) => ({
            id: d.id,
            booking_reference: d.booking_id ? `TKR-${d.booking_id.substring(0, 8)}` : 'TKR-INCIDENT',
            customer_name: 'Customer Account',
            supplier_name: 'Water Fleet Partner',
            amount: 875,
            reason: d.reason,
            category: d.category,
            status: d.status,
            created_at: d.created_at,
          })),
        });
      }

      // 4. Fetch Audit Logs
      await get().fetchAuditLogs();
      set({ isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchAuditLogs: async () => {
    try {
      const { data } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        set({
          auditLogs: data.map((log: any) => ({
            id: log.id,
            admin_id: log.admin_id,
            action: log.action,
            target_type: log.target_type,
            target_id: log.target_id,
            notes: log.notes,
            created_at: log.created_at,
          })),
        });
      }
    } catch {
      // Ignored
    }
  },

  fetchServiceZones: async () => {
    try {
      const { data, error } = await supabase.rpc('get_service_zone_liquidity_health');
      if (!error && data) {
        set({
          serviceZones: data.map((z: any) => ({
            zone_name: z.zone_name,
            online_fleet_count: Number(z.online_fleet_count || 0),
            available_fleet_count: Number(z.available_fleet_count || 0),
            active_deliveries: Number(z.active_deliveries || 0),
            liquidity_status: z.liquidity_status || 'OPTIMAL',
            avg_eta_minutes: Number(z.avg_eta_minutes || 15),
            traffic_factor: Number(z.traffic_factor || 1.0),
          })),
        });
      }
    } catch {
      // Ignored
    }
  },

  approveSupplier: async (supplierId: string) => {
    try {
      await supabase.rpc('admin_verify_supplier', {
        p_supplier_id: supplierId,
        p_status: 'verified',
      });

      // Write to audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'approve_supplier',
          target_type: 'supplier',
          target_id: supplierId,
          notes: 'KYC verified and approved for Bangalore metropolitan distribution.',
        });
      }

      set((state) => ({
        pendingSuppliers: state.pendingSuppliers.filter((s) => s.id !== supplierId),
        metrics: {
          ...state.metrics,
          pending_kyc_suppliers: Math.max(0, state.metrics.pending_kyc_suppliers - 1),
          total_suppliers: state.metrics.total_suppliers + 1,
        },
      }));
      get().fetchAuditLogs();
      return true;
    } catch {
      return false;
    }
  },

  rejectSupplier: async (supplierId: string) => {
    try {
      await supabase.rpc('admin_verify_supplier', {
        p_supplier_id: supplierId,
        p_status: 'rejected',
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'reject_supplier',
          target_type: 'supplier',
          target_id: supplierId,
          notes: 'KYC documentation failed verification standard.',
        });
      }

      set((state) => ({
        pendingSuppliers: state.pendingSuppliers.filter((s) => s.id !== supplierId),
        metrics: {
          ...state.metrics,
          pending_kyc_suppliers: Math.max(0, state.metrics.pending_kyc_suppliers - 1),
        },
      }));
      get().fetchAuditLogs();
      return true;
    } catch {
      return false;
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

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'update_surge_multiplier',
          target_type: 'platform_settings',
          target_id: 'pricing_defaults',
          notes: `Surge multiplier dynamically updated to ${multiplier}x.`,
        });
      }
      get().fetchAuditLogs();
    } catch {
      // Ignored
    }
  },

  toggleEmergencyMode: () => {
    set((state) => ({ emergencyMode: !state.emergencyMode }));
  },

  resolveDispute: async (disputeId: string, refund: boolean) => {
    try {
      await supabase.rpc('admin_resolve_dispute', {
        p_dispute_id: disputeId,
        p_status: refund ? 'refunded' : 'resolved',
        p_refund_amount: refund ? 875.0 : 0.0,
        p_notes: refund ? 'Customer refund approved due to verified short delivery.' : 'Resolved after driver clarification.',
      });

      set((state) => ({
        disputes: state.disputes.map((d) =>
          d.id === disputeId ? { ...d, status: refund ? 'refunded' : 'resolved' } : d
        ),
      }));
      get().fetchAuditLogs();
    } catch {
      // Ignored
    }
  },
}));
