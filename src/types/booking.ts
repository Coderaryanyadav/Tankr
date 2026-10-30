import { z } from 'zod';

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'supplier_assigned'
  | 'driver_assigned'
  | 'en_route'
  | 'arrived'
  | 'delivering'
  | 'delivered'
  | 'cancelled'
  | 'disputed';

export type PaymentPreference = 'upi' | 'cash_on_delivery' | 'card_online';

export interface BookingQuote {
  tanker_id: string;
  supplier_name: string;
  vehicle_number: string;
  driver_name: string;
  capacity_liters: number;
  water_type: string;
  distance_km: number;
  eta_minutes: number;
  base_price: number;
  delivery_charge: number;
  surcharge: number;
  tax_amount: number;
  final_payable_amount: number;
}

export interface BookingRecord {
  id: string;
  booking_reference: string;
  customer_id: string;
  tanker_id: string;
  supplier_id: string;
  supplier_name?: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  status: BookingStatus;
  capacity_liters: number;
  water_type: string;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_pin: string;
  delivery_distance_km: number;
  estimated_arrival_minutes: number;
  base_price: number;
  delivery_charge: number;
  surcharge: number;
  tax_amount: number;
  final_payable_amount: number;
  payment_preference: PaymentPreference;
  payment_status: string;
  cancellation_reason?: string | null;
  created_at: string;
}

export const CreateBookingSchema = z.object({
  tankerId: z.string().uuid(),
  deliveryAddress: z.string().min(5, 'Delivery address is required'),
  deliveryLat: z.number(),
  deliveryLng: z.number(),
  paymentPreference: z.enum(['upi', 'cash_on_delivery', 'card_online']),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export const BOOKING_STATUS_CONFIG: Record<
  BookingStatus,
  {
    label: string;
    description: string;
    badgeVariant: 'warning' | 'primary' | 'success' | 'error' | 'neutral' | 'info';
    stepIndex: number;
  }
> = {
  pending: {
    label: 'Connecting Supplier',
    description: 'Dispatch request sent to supplier dispatch desk',
    badgeVariant: 'warning',
    stepIndex: 1,
  },
  accepted: {
    label: 'Order Accepted',
    description: 'Supplier confirmed availability for filling',
    badgeVariant: 'primary',
    stepIndex: 2,
  },
  supplier_assigned: {
    label: 'Depot Assigned',
    description: 'Filling water at primary distribution sump',
    badgeVariant: 'primary',
    stepIndex: 2,
  },
  driver_assigned: {
    label: 'Driver Assigned',
    description: 'Vehicle assigned and ready for departure',
    badgeVariant: 'primary',
    stepIndex: 3,
  },
  en_route: {
    label: 'Tanker En Route',
    description: 'Driver is on the way to your delivery address',
    badgeVariant: 'warning',
    stepIndex: 4,
  },
  arrived: {
    label: 'Tanker Arrived',
    description: 'Driver reached your gate. Ready for hose hook-up',
    badgeVariant: 'info',
    stepIndex: 5,
  },
  delivering: {
    label: 'Pumping Water',
    description: 'Transferring clean water into your sump',
    badgeVariant: 'info',
    stepIndex: 5,
  },
  delivered: {
    label: 'Delivery Complete',
    description: 'Water successfully delivered & confirmed',
    badgeVariant: 'success',
    stepIndex: 6,
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Booking was cancelled',
    badgeVariant: 'error',
    stepIndex: 0,
  },
  disputed: {
    label: 'Under Review',
    description: 'Support review in progress',
    badgeVariant: 'neutral',
    stepIndex: 0,
  },
};

