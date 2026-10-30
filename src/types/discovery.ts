import { z } from 'zod';

export type TankerCapacityLiters = 1000 | 2000 | 5000 | 10000 | 12000 | 20000;

export interface TankerCategoryOption {
  capacity: TankerCapacityLiters;
  label: string;
  description: string;
  idealFor: string;
  iconName: string;
}

export const TANKER_CONFIGURABLE_CATEGORIES: TankerCategoryOption[] = [
  {
    capacity: 1000,
    label: '1,000 Litres',
    description: 'Quick top-up for small homes & emergencies',
    idealFor: '1-2 persons / Kitchen & RO Sump',
    iconName: 'water',
  },
  {
    capacity: 2000,
    label: '2,000 Litres',
    description: 'Compact independent house tank',
    idealFor: 'Small family (2-3 days reserve)',
    iconName: 'water',
  },
  {
    capacity: 5000,
    label: '5,000 Litres',
    description: 'Standard residential tanker',
    idealFor: 'Independent villas & 3-4 BHK homes',
    iconName: 'car',
  },
  {
    capacity: 10000,
    label: '10,000 Litres',
    description: 'Large residential society tanker',
    idealFor: 'Apartment complexes & communities',
    iconName: 'car-sport',
  },
  {
    capacity: 12000,
    label: '12,000 Litres',
    description: 'Commercial & large society supply',
    idealFor: 'Hospitals, offices & gated societies',
    iconName: 'bus',
  },
  {
    capacity: 20000,
    label: '20,000 Litres',
    description: 'Jumbo heavy logistics tanker',
    idealFor: 'Bulk underground reservoir storage',
    iconName: 'train',
  },
];

export const NearbyTankerSchema = z.object({
  tanker_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  supplier_name: z.string(),
  vehicle_number: z.string(),
  driver_name: z.string(),
  driver_phone: z.string(),
  capacity_liters: z.union([
    z.literal(1000),
    z.literal(2000),
    z.literal(5000),
    z.literal(10000),
    z.literal(12000),
    z.literal(20000),
  ]),
  water_type: z.string(),
  base_price: z.number(),
  price_per_km: z.number(),
  distance_km: z.number(),
  eta_minutes: z.number(),
  estimated_total_price: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  heading_degrees: z.number(),
  is_available: z.boolean(),
  rating: z.number(),
  total_deliveries: z.number(),
});

export type NearbyTanker = z.infer<typeof NearbyTankerSchema>;

export type TankerSortOption = 'distance' | 'price' | 'eta';

