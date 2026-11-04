import { supabase } from '../supabase/client';

export interface InvoiceRecord {
  id: string;
  booking_id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  supplier_name?: string;
  supplier_business_name?: string;
  supplier_gstin: string;
  vehicle_number?: string;
  capacity_liters?: number;
  volume_liters?: number;
  water_type?: string;
  delivery_address: string;
  base_price?: number;
  base_amount?: number;
  delivery_charge: number;
  surcharge: number;
  tax_amount: number;
  final_amount?: number;
  total_amount?: number;
  payment_method?: string;
  payment_status: string;
  issued_at: string;
}

class InvoiceService {
  /**
   * Retrieves the official tax invoice for a given booking.
   */
  async getInvoiceByBookingId(bookingId: string): Promise<InvoiceRecord | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      const row = data as any;
      return {
        id: row.id,
        booking_id: row.booking_id,
        invoice_number: row.invoice_number,
        customer_name: row.customer_name || 'Customer',
        customer_phone: row.customer_phone || '—',
        supplier_name: row.supplier_business_name || 'TANKR Network Partner',
        supplier_business_name: row.supplier_business_name || 'TANKR Network Partner',
        supplier_gstin: row.supplier_gstin || '27AAAAA0000A1Z5',
        vehicle_number: row.vehicle_number || 'Verified Tanker',
        capacity_liters: Number(row.volume_liters || 5000),
        volume_liters: Number(row.volume_liters || 5000),
        water_type: row.water_type || 'Potable (Drinking)',
        delivery_address: row.delivery_address || '—',
        base_price: Number(row.base_price || 0),
        base_amount: Number(row.base_price || 0),
        delivery_charge: Number(row.delivery_charge || 0),
        surcharge: Number(row.surcharge || 0),
        tax_amount: Number(row.tax_amount || 0),
        final_amount: Number(row.final_amount || 0),
        total_amount: Number(row.final_amount || 0),
        payment_method: row.payment_method || 'Online / UPI',
        payment_status: row.payment_status || 'PAID',
        issued_at: row.issued_at || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Invokes the PostgreSQL RPC to authoritatively generate a tax invoice
   * upon water delivery completion.
   */
  async generateInvoice(bookingId: string): Promise<InvoiceRecord | null> {
    try {
      // 1. Authoritative PostgreSQL RPC
      const { data, error } = await supabase.rpc('generate_invoice_for_booking', {
        p_booking_id: bookingId,
      });

      if (!error && data?.success) {
        return this.getInvoiceByBookingId(bookingId);
      }

      // Security Remediation (BUG-002): Financial invoices must be generated authoritatively by the database RPC
      return null;
    } catch {
      return null;
    }
  }
}

export const invoiceService = new InvoiceService();

