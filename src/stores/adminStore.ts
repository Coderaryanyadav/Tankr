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
  id?: string;
  zone_name: string;
  online_fleet_count: number;
  available_fleet_count: number;
  active_deliveries: number;
  liquidity_status: 'OPTIMAL' | 'LIMITED_SUPPLY' | 'HIGH_DEMAND_SURGE' | 'OFFLINE';
  avg_eta_minutes: number;
  traffic_factor: number;
  traffic_multiplier?: number;
}

export interface LiveDeficitZone {
  id: string;
  zone_name: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  online_fleet_count: number;
  available_fleet_count: number;
  active_deliveries: number;
  deficit_percentage: number;
  deficit_level: string;
  color: string;
  radius_pixels: number;
}

export interface FleetTankerItem {
  id: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  capacity_liters: number;
  water_type: string;
  is_available: boolean;
  is_online: boolean;
  latitude: number;
  longitude: number;
  heading_degrees?: number;
  base_price?: number;
  supplier_id?: string;
}

export interface EmergencyDispatchItem {
  id: string;
  institution_name: string;
  institution_type: 'hospital_dialysis' | 'icu_facility' | 'critical_sump' | 'elderly_care';
  contact_person: string;
  contact_phone: string;
  delivery_address: string;
  latitude: number;
  longitude: number;
  required_liters: number;
  water_type: string;
  sla_minutes: number;
  status: 'en_route' | 'delivered' | 'diverted';
  assigned_tanker_id?: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  dispatched_at: string;
  created_at: string;
}

export interface PayoutLedgerItem {
  id: string;
  driver_phone: string;
  booking_id?: string;
  entry_type: string;
  amount: number;
  notes?: string;
  created_at: string;
}

export interface FinancialSummary {
  totalCollected: number;
  supplierPayout: number;
  driverTipTake: number;
  platformTake: number;
  escrowHoldback: number;
}

export interface WaterCertificateItem {
  id: string;
  supplier_id: string;
  water_source?: string;
  source_type: string;
  lab_name: string;
  test_report_number: string;
  tds_ppm: number;
  ph_level: number;
  turbidity_ntu: number;
  coliform_detected: boolean;
  certified_date: string;
  expiry_date: string;
  is_potable: boolean;
  certificate_url?: string;
}

export interface CorporateSubscriptionItem {
  id: string;
  client_name: string;
  category: 'tech_park' | 'society' | 'hospital' | 'commercial';
  contact_person: string;
  contact_phone: string;
  delivery_address: string;
  latitude: number;
  longitude: number;
  daily_liters: number;
  preferred_time_slot: string;
  monthly_rate: number;
  status: 'active' | 'paused' | 'expired';
  assigned_supplier_name?: string;
  start_date: string;
}

interface AdminState {
  metrics: AdminMetrics;
  pendingSuppliers: SupplierKYCItem[];
  disputes: DisputeItem[];
  auditLogs: AdminAuditLogItem[];
  serviceZones: ServiceZoneItem[];
  deficitZones: LiveDeficitZone[];
  fleetTankers: FleetTankerItem[];
  emergencyDispatches: EmergencyDispatchItem[];
  payoutLedger: PayoutLedgerItem[];
  financialSummary: FinancialSummary;
  waterCertificates: WaterCertificateItem[];
  corporateSubscriptions: CorporateSubscriptionItem[];
  isLoading: boolean;
  emergencyMode: boolean;

  fetchDashboardMetrics: () => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
  fetchServiceZones: () => Promise<void>;
  fetchDeficitZones: () => Promise<void>;
  fetchFleetTankers: () => Promise<void>;
  subscribeToLiveFleetAndHeatmap: () => () => void;
  fetchEmergencyDispatches: () => Promise<void>;
  triggerEmergencyDispatch: (params: {
    institution_name: string;
    institution_type: string;
    contact_person: string;
    contact_phone: string;
    delivery_address: string;
    latitude: number;
    longitude: number;
    required_liters: number;
    water_type?: string;
    sla_minutes?: number;
  }) => Promise<boolean>;
  fetchPayoutLedger: () => Promise<void>;
  executeBatchPayout: () => Promise<boolean>;
  fetchWaterCertificates: () => Promise<void>;
  suspendWaterCertificate: (certificateId: string, reason: string) => Promise<boolean>;
  fetchCorporateSubscriptions: () => Promise<void>;
  toggleSubscriptionStatus: (subscriptionId: string, currentStatus: string) => Promise<boolean>;
  createCorporateSubscription: (sub: Omit<CorporateSubscriptionItem, 'id'>) => Promise<boolean>;
  approveSupplier: (supplierId: string) => Promise<boolean>;
  rejectSupplier: (supplierId: string) => Promise<boolean>;
  setSurgeMultiplier: (multiplier: number) => Promise<void>;
  toggleEmergencyMode: () => void;
  resolveDispute: (disputeId: string, refund: boolean) => Promise<void>;
  rebalanceTanker: (tankerId: string, zoneName?: string) => Promise<boolean>;
  createTanker: (tanker: {
    vehicle_number: string;
    driver_name: string;
    driver_phone: string;
    capacity_liters: number;
    water_type: string;
    base_price: number;
    latitude?: number;
    longitude?: number;
  }) => Promise<boolean>;
  updateTanker: (tankerId: string, updates: Partial<FleetTankerItem> & { is_online?: boolean; is_available?: boolean }) => Promise<boolean>;
  deleteTanker: (tankerId: string) => Promise<boolean>;
  createWaterCertificate: (cert: {
    water_source: string;
    source_type: string;
    lab_name: string;
    test_report_number: string;
    tds_ppm: number;
    ph_level: number;
    turbidity_ntu: number;
    certified_date?: string;
    expiry_date?: string;
  }) => Promise<boolean>;
  reinstateWaterCertificate: (certificateId: string) => Promise<boolean>;
  deleteWaterCertificate: (certificateId: string) => Promise<boolean>;
  completeEmergencyDispatch: (dispatchId: string) => Promise<boolean>;
  cancelEmergencyDispatch: (dispatchId: string) => Promise<boolean>;
  createDriverPayout: (payout: {
    driver_phone: string;
    amount: number;
    notes?: string;
  }) => Promise<boolean>;
  settleIndividualPayout: (payoutId: string) => Promise<boolean>;
  createTestSupplier: (sup: {
    business_name: string;
    contact_person: string;
    contact_phone: string;
    water_source: string;
    gstin: string;
  }) => Promise<boolean>;
  createTestDispute: (disp: {
    customer_name: string;
    supplier_name: string;
    amount: number;
    reason: string;
    category?: string;
  }) => Promise<boolean>;
  createServiceZone: (zone: {
    zone_name: string;
    center_lat: number;
    center_lng: number;
    radius_km: number;
    traffic_multiplier: number;
  }) => Promise<boolean>;
  updateServiceZone: (zoneId: string, updates: { traffic_multiplier?: number; is_operational?: boolean }) => Promise<boolean>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  metrics: {
    total_gmv: 0,
    platform_revenue: 0,
    total_bookings: 0,
    completed_bookings: 0,
    active_tankers_online: 0,
    total_suppliers: 0,
    pending_kyc_suppliers: 0,
    total_liters_delivered: 0,
    surge_multiplier: 1.0,
  },

  pendingSuppliers: [],
  disputes: [],
  auditLogs: [],
  serviceZones: [],
  deficitZones: [],
  fleetTankers: [],
  emergencyDispatches: [],
  payoutLedger: [],
  financialSummary: {
    totalCollected: 0,
    supplierPayout: 0,
    driverTipTake: 0,
    platformTake: 0,
    escrowHoldback: 0,
  },
  waterCertificates: [],
  corporateSubscriptions: [],
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
            total_gmv: Number(row.gross_volume_gmv ?? row.total_gmv ?? 0),
            platform_revenue: Number(row.platform_revenue ?? 0),
            total_bookings: Number(row.total_bookings ?? 0),
            completed_bookings: Number(row.completed_deliveries ?? row.completed_bookings ?? 0),
            active_tankers_online: Number(row.active_tankers_online ?? 0),
            total_suppliers: Number(row.total_suppliers ?? 0),
            pending_kyc_suppliers: Number(row.pending_kyc_count ?? row.pending_kyc_suppliers ?? 0),
            total_liters_delivered: Number(row.total_liters_delivered ?? 0),
            surge_multiplier: Number(row.network_surge_multiplier ?? row.surge_multiplier ?? 1.0),
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
            contact_person: s.contact_person || 'Fleet Operations',
            phone_number: s.contact_phone,
            gstin: s.gstin || 'NOT_REGISTERED',
            fleet_size: s.fleet_size || 1,
            verification_status: s.verification_status,
            water_source: s.water_source || 'Verified Sump/Borewell',
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
            customer_name: d.customer_name || 'Customer Account',
            supplier_name: d.supplier_name || 'Water Fleet Partner',
            amount: Number(d.amount || 0),
            reason: d.reason,
            category: d.category,
            status: d.status,
            created_at: d.created_at,
          })),
        });
      }

      // 4. Parallel fetch enterprise suite modules
      await Promise.allSettled([
        get().fetchFleetTankers(),
        get().fetchDeficitZones(),
        get().fetchEmergencyDispatches(),
        get().fetchPayoutLedger(),
        get().fetchWaterCertificates(),
        get().fetchCorporateSubscriptions(),
        get().fetchAuditLogs(),
      ]);

      set({ isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchFleetTankers: async () => {
    try {
      const { data } = await supabase
        .from('tankers')
        .select('*')
        .order('capacity_liters', { ascending: false });

      if (data) {
        set({
          fleetTankers: data.map((t: any) => ({
            id: t.id,
            vehicle_number: t.vehicle_number,
            driver_name: t.driver_name,
            driver_phone: t.driver_phone,
            capacity_liters: t.capacity_liters,
            water_type: t.water_type || 'Potable (Drinking)',
            is_available: t.is_available,
            is_online: t.is_online,
            latitude: Number(t.latitude || 19.1171),
            longitude: Number(t.longitude || 72.8809),
            heading_degrees: t.heading_degrees,
            base_price: t.base_price,
            supplier_id: t.supplier_id,
          })),
        });
      }
    } catch {
      // Ignored
    }
  },

  fetchDeficitZones: async () => {
    try {
      const { data, error } = await supabase.rpc('get_live_demand_deficit_zones');
      if (!error && data && Array.isArray(data)) {
        set({
          deficitZones: data.map((z: any) => ({
            id: z.id,
            zone_name: z.zone_name,
            center_lat: Number(z.center_lat),
            center_lng: Number(z.center_lng),
            radius_km: Number(z.radius_km),
            online_fleet_count: Number(z.online_fleet_count || 0),
            available_fleet_count: Number(z.available_fleet_count || 0),
            active_deliveries: Number(z.active_deliveries || 0),
            deficit_percentage: Number(z.deficit_percentage || 0),
            deficit_level: z.deficit_level || 'OPTIMAL',
            color: z.color || '#16A34A',
            radius_pixels: Number(z.radius_pixels || 40),
          })),
        });
      }
    } catch (err) {
      console.warn('[AdminStore] Error fetching live deficit zones:', err);
    }
  },

  subscribeToLiveFleetAndHeatmap: () => {
    const channel = supabase
      .channel('admin:realtime:fleet_and_deficits')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tankers' },
        () => {
          get().fetchFleetTankers();
          get().fetchDeficitZones();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          get().fetchDeficitZones();
          get().fetchDashboardMetrics();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },

  fetchEmergencyDispatches: async () => {
    try {
      const { data } = await supabase
        .from('emergency_dispatches')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        set({
          emergencyDispatches: data.map((e: any) => ({
            id: e.id,
            institution_name: e.institution_name,
            institution_type: e.institution_type,
            contact_person: e.contact_person,
            contact_phone: e.contact_phone,
            delivery_address: e.delivery_address,
            latitude: Number(e.latitude),
            longitude: Number(e.longitude),
            required_liters: Number(e.required_liters),
            water_type: e.water_type,
            sla_minutes: Number(e.sla_minutes || 20),
            status: e.status,
            assigned_tanker_id: e.assigned_tanker_id,
            vehicle_number: e.vehicle_number,
            driver_name: e.driver_name,
            driver_phone: e.driver_phone,
            dispatched_at: e.dispatched_at,
            created_at: e.created_at,
          })),
        });
      }
    } catch {
      // Ignored
    }
  },

  triggerEmergencyDispatch: async (params) => {
    try {
      const { data, error } = await supabase.rpc('admin_emergency_dispatch', {
        p_institution_name: params.institution_name,
        p_institution_type: params.institution_type,
        p_contact_person: params.contact_person,
        p_contact_phone: params.contact_phone,
        p_delivery_address: params.delivery_address,
        p_latitude: params.latitude,
        p_longitude: params.longitude,
        p_required_liters: params.required_liters,
        p_water_type: params.water_type || 'Potable (Drinking)',
        p_sla_minutes: params.sla_minutes || 20,
      });

      if (!error && data?.success) {
        await Promise.all([get().fetchEmergencyDispatches(), get().fetchFleetTankers(), get().fetchAuditLogs()]);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  fetchPayoutLedger: async () => {
    try {
      const { data } = await supabase
        .from('driver_payout_ledger')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        const rows: PayoutLedgerItem[] = data.map((p: any) => ({
          id: p.id,
          driver_phone: p.driver_phone,
          booking_id: p.booking_id,
          entry_type: p.entry_type,
          amount: Number(p.amount || 0),
          notes: p.notes,
          created_at: p.created_at,
        }));

        const totalEarnings = rows.reduce((acc, cur) => acc + (cur.entry_type === 'delivery_earnings' ? cur.amount : 0), 0);
        const totalCollected = totalEarnings > 0 ? totalEarnings / 0.85 : 0;
        const supplierPayout = totalEarnings;
        const platformTake = totalCollected * 0.10;
        const driverTipTake = totalCollected * 0.05;
        const escrowHoldback = get().disputes.filter((d) => d.status === 'open').reduce((acc, d) => acc + d.amount, 0);

        set({
          payoutLedger: rows,
          financialSummary: {
            totalCollected,
            supplierPayout,
            driverTipTake,
            platformTake,
            escrowHoldback,
          },
        });
      }
    } catch {
      // Ignored
    }
  },

  executeBatchPayout: async () => {
    try {
      const { data, error } = await supabase.rpc('admin_execute_batch_payout');
      if (!error && data?.success) {
        await Promise.all([get().fetchPayoutLedger(), get().fetchAuditLogs()]);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  fetchWaterCertificates: async () => {
    try {
      const { data } = await supabase
        .from('water_quality_certificates')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        set({
          waterCertificates: data.map((c: any) => ({
            id: c.id,
            supplier_id: c.supplier_id,
            water_source: c.water_source || 'Groundwater / Aquifer Borewell',
            source_type: c.source_type,
            lab_name: c.lab_name,
            test_report_number: c.test_report_number,
            tds_ppm: Number(c.tds_ppm || 0),
            ph_level: Number(c.ph_level || 7.0),
            turbidity_ntu: Number(c.turbidity_ntu || 1.0),
            coliform_detected: Boolean(c.coliform_detected),
            certified_date: c.certified_date,
            expiry_date: c.expiry_date,
            is_potable: Boolean(c.is_potable),
            certificate_url: c.certificate_url,
          })),
        });
      }
    } catch {
      // Ignored
    }
  },

  suspendWaterCertificate: async (certificateId: string, reason: string) => {
    try {
      await supabase
        .from('water_quality_certificates')
        .update({ is_potable: false })
        .eq('id', certificateId);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'SUSPEND_WATER_CERTIFICATE',
          target_type: 'water_quality_certificates',
          target_id: certificateId,
          notes: `Certificate suspended by Safety Desk: ${reason}`,
        });
      }

      await Promise.all([get().fetchWaterCertificates(), get().fetchAuditLogs()]);
      return true;
    } catch {
      return false;
    }
  },

  fetchCorporateSubscriptions: async () => {
    try {
      const { data } = await supabase
        .from('corporate_subscriptions')
        .select('*')
        .order('monthly_rate', { ascending: false });

      if (data) {
        set({
          corporateSubscriptions: data.map((s: any) => ({
            id: s.id,
            client_name: s.client_name,
            category: s.category,
            contact_person: s.contact_person,
            contact_phone: s.contact_phone,
            delivery_address: s.delivery_address,
            latitude: Number(s.latitude),
            longitude: Number(s.longitude),
            daily_liters: Number(s.daily_liters),
            preferred_time_slot: s.preferred_time_slot,
            monthly_rate: Number(s.monthly_rate),
            status: s.status,
            assigned_supplier_name: s.assigned_supplier_name || 'Seema Water Hub',
            start_date: s.start_date,
          })),
        });
      }
    } catch {
      // Ignored
    }
  },

  toggleSubscriptionStatus: async (subscriptionId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await supabase
        .from('corporate_subscriptions')
        .update({ status: nextStatus })
        .eq('id', subscriptionId);

      set((state) => ({
        corporateSubscriptions: state.corporateSubscriptions.map((s) =>
          s.id === subscriptionId ? { ...s, status: nextStatus as any } : s
        ),
      }));

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'UPDATE_SUBSCRIPTION_STATUS',
          target_type: 'corporate_subscriptions',
          target_id: subscriptionId,
          notes: `Contract status changed to ${nextStatus}`,
        });
      }

      get().fetchAuditLogs();
      return true;
    } catch {
      return false;
    }
  },

  createCorporateSubscription: async (sub) => {
    try {
      const { error } = await supabase.from('corporate_subscriptions').insert({
        client_name: sub.client_name,
        category: sub.category,
        contact_person: sub.contact_person,
        contact_phone: sub.contact_phone,
        delivery_address: sub.delivery_address,
        latitude: sub.latitude,
        longitude: sub.longitude,
        daily_liters: sub.daily_liters,
        preferred_time_slot: sub.preferred_time_slot,
        monthly_rate: sub.monthly_rate,
        status: sub.status,
        assigned_supplier_name: sub.assigned_supplier_name || 'Seema Water Hub',
        start_date: sub.start_date,
      });

      if (!error) {
        await Promise.all([get().fetchCorporateSubscriptions(), get().fetchAuditLogs()]);
        return true;
      }
      return false;
    } catch {
      return false;
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
            notes: log.notes || (typeof log.details === 'object' ? JSON.stringify(log.details) : undefined),
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
            id: z.id,
            zone_name: z.zone_name,
            online_fleet_count: Number(z.online_fleet_count || 0),
            available_fleet_count: Number(z.available_fleet_count || 0),
            active_deliveries: Number(z.active_deliveries || 0),
            liquidity_status: z.liquidity_status || 'OPTIMAL',
            avg_eta_minutes: Number(z.avg_eta_minutes || 15),
            traffic_factor: Number(z.traffic_factor || 1.0),
            traffic_multiplier: Number(z.traffic_multiplier || z.traffic_factor || 1.1),
          })),
        });
      }
    } catch {
      // Ignored
    }
  },

  approveSupplier: async (supplierId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_verify_supplier', {
        p_supplier_id: supplierId,
        p_status: 'verified',
      });

      if (error || (data && data.success === false)) {
        console.warn('[AdminStore] Error approving supplier:', error?.message || data?.error);
        return false;
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
      const { data, error } = await supabase.rpc('admin_verify_supplier', {
        p_supplier_id: supplierId,
        p_status: 'rejected',
      });

      if (error || (data && data.success === false)) {
        console.warn('[AdminStore] Error rejecting supplier:', error?.message || data?.error);
        return false;
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
            peak_surge_multiplier: multiplier,
          },
        })
        .in('key', ['pricing_defaults', 'pricing_config']);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'update_surge_multiplier',
          target_type: 'platform_settings',
          target_id: 'pricing_config',
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
      const disp = get().disputes.find((d) => d.id === disputeId);
      const refundAmt = refund ? (disp?.amount || 450.0) : 0.0;
      const { data, error } = await supabase.rpc('admin_resolve_dispute', {
        p_dispute_id: disputeId,
        p_status: refund ? 'refunded' : 'resolved',
        p_refund_amount: refundAmt,
        p_notes: refund
          ? 'Customer refund approved due to verified short delivery.'
          : 'Resolved after driver clarification.',
      });

      if (error || (data && data.success === false)) {
        console.warn('[AdminStore] Error resolving dispute:', error?.message || data?.error);
        return;
      }

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

  rebalanceTanker: async (tankerId: string, zoneName = 'Marol / MIDC Andheri East') => {
    try {
      const { data, error } = await supabase.rpc('admin_rebalance_tanker', {
        p_tanker_id: tankerId,
        p_zone_name: zoneName,
      });

      if (!error && data?.success) {
        await Promise.all([
          get().fetchFleetTankers(),
          get().fetchDeficitZones(),
          get().fetchAuditLogs(),
        ]);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  createTanker: async (tankerData) => {
    try {
      // Find a supplier id or use default supplier
      const sup = get().pendingSuppliers[0];
      const { data: sups } = await supabase.from('suppliers').select('id').limit(1);
      const supplierId = sups?.[0]?.id || sup?.id || '8cf81dd2-a4ca-4d4d-8268-9f3212f71e87';

      const { error } = await supabase.from('tankers').insert({
        supplier_id: supplierId,
        vehicle_number: tankerData.vehicle_number,
        driver_name: tankerData.driver_name,
        driver_phone: tankerData.driver_phone,
        capacity_liters: tankerData.capacity_liters,
        water_type: tankerData.water_type || 'Potable (Drinking)',
        base_price: tankerData.base_price || 650,
        latitude: tankerData.latitude || 19.1171,
        longitude: tankerData.longitude || 72.8809,
        is_available: true,
        is_online: true,
      });

      if (!error) {
        await get().fetchFleetTankers();
        await supabase.from('admin_audit_logs').insert({
          action: 'tanker_onboarded',
          entity_type: 'tankers',
          details: { vehicle_number: tankerData.vehicle_number, capacity: tankerData.capacity_liters },
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  updateTanker: async (tankerId, updates) => {
    try {
      const { error } = await supabase.from('tankers').update(updates).eq('id', tankerId);
      if (!error) {
        await get().fetchFleetTankers();
        await supabase.from('admin_audit_logs').insert({
          action: 'tanker_updated',
          entity_type: 'tankers',
          entity_id: tankerId,
          details: updates,
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  deleteTanker: async (tankerId) => {
    try {
      const { error } = await supabase.from('tankers').delete().eq('id', tankerId);
      if (!error) {
        await get().fetchFleetTankers();
        await supabase.from('admin_audit_logs').insert({
          action: 'tanker_retired',
          entity_type: 'tankers',
          entity_id: tankerId,
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  createWaterCertificate: async (cert) => {
    try {
      const { error } = await supabase.from('water_quality_certificates').insert({
        water_source: cert.water_source,
        source_type: cert.source_type,
        lab_name: cert.lab_name,
        test_report_number: cert.test_report_number,
        tds_ppm: cert.tds_ppm,
        ph_level: cert.ph_level,
        turbidity_ntu: cert.turbidity_ntu,
        certified_date: cert.certified_date || new Date().toISOString().split('T')[0],
        expiry_date: cert.expiry_date || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
        is_potable: cert.tds_ppm <= 250,
        is_active: true,
      });

      if (!error) {
        await get().fetchWaterCertificates();
        await supabase.from('admin_audit_logs').insert({
          action: 'water_certificate_created',
          entity_type: 'water_quality_certificates',
          details: { report_number: cert.test_report_number, tds: cert.tds_ppm },
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  reinstateWaterCertificate: async (certificateId) => {
    try {
      const { error } = await supabase
        .from('water_quality_certificates')
        .update({ is_potable: true, is_active: true })
        .eq('id', certificateId);

      if (!error) {
        await get().fetchWaterCertificates();
        await supabase.from('admin_audit_logs').insert({
          action: 'water_certificate_reinstated',
          entity_type: 'water_quality_certificates',
          entity_id: certificateId,
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  deleteWaterCertificate: async (certificateId) => {
    try {
      const { error } = await supabase
        .from('water_quality_certificates')
        .delete()
        .eq('id', certificateId);

      if (!error) {
        await get().fetchWaterCertificates();
        await supabase.from('admin_audit_logs').insert({
          action: 'water_certificate_deleted',
          entity_type: 'water_quality_certificates',
          entity_id: certificateId,
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  completeEmergencyDispatch: async (dispatchId) => {
    try {
      const { error } = await supabase
        .from('emergency_dispatches')
        .update({ status: 'delivered' })
        .eq('id', dispatchId);

      if (!error) {
        await get().fetchEmergencyDispatches();
        await supabase.from('admin_audit_logs').insert({
          action: 'emergency_dispatch_completed',
          entity_type: 'emergency_dispatches',
          entity_id: dispatchId,
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  cancelEmergencyDispatch: async (dispatchId) => {
    try {
      const { error } = await supabase
        .from('emergency_dispatches')
        .update({ status: 'cancelled' })
        .eq('id', dispatchId);

      if (!error) {
        await get().fetchEmergencyDispatches();
        await supabase.from('admin_audit_logs').insert({
          action: 'emergency_dispatch_cancelled',
          entity_type: 'emergency_dispatches',
          entity_id: dispatchId,
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  createDriverPayout: async (payout) => {
    try {
      const { error } = await supabase.from('driver_payout_ledger').insert({
        driver_phone: payout.driver_phone,
        entry_type: 'delivery_earning',
        amount: payout.amount,
        notes: payout.notes || 'Trip fare & incentive earning',
      });

      if (!error) {
        await get().fetchPayoutLedger();
        await supabase.from('admin_audit_logs').insert({
          action: 'payout_recorded',
          entity_type: 'driver_payout_ledger',
          details: { driver_phone: payout.driver_phone, amount: payout.amount },
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  settleIndividualPayout: async (payoutId) => {
    try {
      const { error } = await supabase
        .from('driver_payout_ledger')
        .update({ notes: 'Settled via Instant NEFT' })
        .eq('id', payoutId);

      if (!error) {
        await get().fetchPayoutLedger();
        await supabase.from('admin_audit_logs').insert({
          action: 'individual_payout_settled',
          entity_type: 'driver_payout_ledger',
          entity_id: payoutId,
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  createTestSupplier: async (sup) => {
    try {
      const { error } = await supabase.from('suppliers').insert({
        business_name: sup.business_name,
        contact_person: sup.contact_person,
        contact_phone: sup.contact_phone,
        water_source: sup.water_source,
        gstin: sup.gstin,
        verification_status: 'pending_review',
        is_verified: false,
        fleet_size: 4,
      });

      if (!error) {
        await get().fetchDashboardMetrics();
        await supabase.from('admin_audit_logs').insert({
          action: 'test_supplier_created',
          entity_type: 'suppliers',
          details: { business: sup.business_name, gstin: sup.gstin },
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  createTestDispute: async (disp) => {
    try {
      const { error } = await supabase.from('disputes').insert({
        customer_name: disp.customer_name,
        supplier_name: disp.supplier_name,
        amount: disp.amount,
        reason: disp.reason,
        category: disp.category || 'volume_shortage',
        status: 'open',
      });

      if (!error) {
        await get().fetchDashboardMetrics();
        await supabase.from('admin_audit_logs').insert({
          action: 'test_dispute_created',
          entity_type: 'disputes',
          details: { customer: disp.customer_name, amount: disp.amount },
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  createServiceZone: async (zone) => {
    try {
      const { error } = await supabase.from('service_zones').insert({
        zone_name: zone.zone_name,
        center_lat: zone.center_lat,
        center_lng: zone.center_lng,
        radius_km: zone.radius_km,
        traffic_multiplier: zone.traffic_multiplier,
        minimum_fleet_density: 3,
        is_operational: true,
      });

      if (!error) {
        await get().fetchServiceZones();
        await get().fetchDeficitZones();
        await supabase.from('admin_audit_logs').insert({
          action: 'service_zone_created',
          entity_type: 'service_zones',
          details: { zone_name: zone.zone_name, radius: zone.radius_km },
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  updateServiceZone: async (zoneIdOrName, updates) => {
    try {
      const { error } = await supabase
        .from('service_zones')
        .update(updates)
        .eq('zone_name', zoneIdOrName);

      if (!error) {
        await get().fetchServiceZones();
        await get().fetchDeficitZones();
        await supabase.from('admin_audit_logs').insert({
          action: 'service_zone_updated',
          entity_type: 'service_zones',
          details: { zone: zoneIdOrName, ...updates },
        });
        await get().fetchAuditLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
