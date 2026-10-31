import { supabase } from '../supabase/client';

export type DisputeCategory =
  | 'short_delivery'
  | 'water_contamination'
  | 'overcharge'
  | 'driver_behavior';

export interface DisputeSubmission {
  bookingId: string;
  category: DisputeCategory;
  reason: string;
  litersReceived?: number;
  evidenceUrl?: string;
}

export interface DisputeRecord {
  id: string;
  booking_id: string;
  customer_id: string;
  supplier_id?: string;
  category: DisputeCategory;
  reason: string;
  liters_received?: number;
  evidence_url?: string;
  status: 'open' | 'under_review' | 'refunded' | 'resolved' | 'dismissed';
  refund_amount: number;
  admin_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export const DisputeService = {
  /**
   * Customer: Submits a dispute for short deliveries, contaminated water, or overcharges.
   */
  submitDispute: async (payload: DisputeSubmission): Promise<{ success: boolean; disputeId?: string; error?: string }> => {
    try {
      // 1. Attempt authoritative RPC
      const { data, error } = await supabase.rpc('submit_customer_dispute', {
        p_booking_id: payload.bookingId,
        p_category: payload.category,
        p_reason: payload.reason,
        p_liters_received: payload.litersReceived || null,
        p_evidence_url: payload.evidenceUrl || null,
      });

      if (!error && data?.success) {
        return { success: true, disputeId: data.dispute_id };
      }

      // 2. Resilient Fallback: Insert into public.disputes directly
      const { data: b, error: bErr } = await supabase
        .from('bookings')
        .select('customer_id, supplier_id')
        .eq('id', payload.bookingId)
        .single();

      if (bErr || !b) {
        return { success: false, error: bErr?.message || 'Booking not found' };
      }

      const { data: disp, error: dErr } = await supabase
        .from('disputes')
        .insert({
          booking_id: payload.bookingId,
          customer_id: b.customer_id,
          supplier_id: b.supplier_id,
          category: payload.category,
          reason: payload.reason,
          liters_received: payload.litersReceived || null,
          evidence_url: payload.evidenceUrl || null,
          status: 'open',
        })
        .select('id')
        .single();

      if (dErr || !disp) {
        return { success: false, error: dErr?.message || 'Failed to submit dispute' };
      }

      await supabase
        .from('bookings')
        .update({ status: 'disputed' })
        .eq('id', payload.bookingId);

      return { success: true, disputeId: disp.id };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error filing dispute.' };
    }
  },

  /**
   * Customer: Fetch existing disputes filed by this customer
   */
  getCustomerDisputes: async (): Promise<DisputeRecord[]> => {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data as DisputeRecord[];
    } catch {
      return [];
    }
  },
};

