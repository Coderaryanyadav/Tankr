import { supabase } from '../supabase/client';

export interface InvoiceRecord {
  id: string;
  booking_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  supplier_name: string;
  supplier_gstin: string;
  vehicle_number: string;
  capacity_liters: number;
  delivery_address: string;
  base_amount: number;
  delivery_charge: number;
  surcharge: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
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
        .single();

      if (error || !data) {
        return null;
      }

      return data as InvoiceRecord;
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
      const { data, error } = await supabase.rpc('generate_invoice_for_booking', {
        p_booking_id: bookingId,
      });

      if (error) {
        return null;
      }

      return this.getInvoiceByBookingId(bookingId);
    } catch {
      return null;
    }
  }
}

export const invoiceService = new InvoiceService();
