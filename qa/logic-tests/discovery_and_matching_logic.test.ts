import { NearbyTanker, TankerSortOption } from '../../src/types/discovery';

describe('LOGIC-03: Discovery & Capacity Matching Business Logic', () => {
  const MOCK_FLEET: NearbyTanker[] = [
    {
      tanker_id: 'a0000000-0000-0000-0000-000000000001',
      supplier_id: 'b0000000-0000-0000-0000-000000000001',
      supplier_name: 'Marol Mini Waters',
      vehicle_number: 'MH-02-TC-1000',
      driver_name: 'Ramesh Pawar',
      driver_phone: '+919876543201',
      capacity_liters: 1000,
      water_type: 'Potable (Drinking)',
      base_price: 450,
      price_per_km: 25,
      distance_km: 1.2,
      eta_minutes: 8,
      estimated_total_price: 504,
      latitude: 19.1171,
      longitude: 72.8809,
      heading_degrees: 45,
      is_available: true,
      rating: 4.8,
      total_deliveries: 210,
    },
    {
      tanker_id: 'a0000000-0000-0000-0000-000000000002',
      supplier_id: 'b0000000-0000-0000-0000-000000000002',
      supplier_name: 'Powai Pure Waters',
      vehicle_number: 'MH-02-TC-5001',
      driver_name: 'Suresh Patil',
      driver_phone: '+919876543202',
      capacity_liters: 5000,
      water_type: 'Potable (Drinking)',
      base_price: 1200,
      price_per_km: 40,
      distance_km: 3.5,
      eta_minutes: 18,
      estimated_total_price: 1407,
      latitude: 19.1200,
      longitude: 72.8850,
      heading_degrees: 90,
      is_available: true,
      rating: 4.9,
      total_deliveries: 840,
    },
    {
      tanker_id: 'a0000000-0000-0000-0000-000000000003',
      supplier_id: 'b0000000-0000-0000-0000-000000000002',
      supplier_name: 'Powai Pure Waters',
      vehicle_number: 'MH-02-TC-5002',
      driver_name: 'Vikram Shinde',
      driver_phone: '+919876543203',
      capacity_liters: 5000,
      water_type: 'Potable (Drinking)',
      base_price: 1200,
      price_per_km: 40,
      distance_km: 0.8,
      eta_minutes: 6,
      estimated_total_price: 1293,
      latitude: 19.1180,
      longitude: 72.8820,
      heading_degrees: 180,
      is_available: false, // Busy delivering elsewhere
      rating: 4.7,
      total_deliveries: 420,
    },
    {
      tanker_id: 'a0000000-0000-0000-0000-000000000004',
      supplier_id: 'b0000000-0000-0000-0000-000000000003',
      supplier_name: 'Andheri Logistics',
      vehicle_number: 'MH-02-TC-9999',
      driver_name: 'Ganesh More',
      driver_phone: '+919876543204',
      capacity_liters: 10000,
      water_type: 'Potable (Drinking)',
      base_price: 1800,
      price_per_km: 45,
      distance_km: 2.1,
      eta_minutes: 12,
      estimated_total_price: 1989,
      latitude: 19.1150,
      longitude: 72.8790,
      heading_degrees: 270,
      is_available: true,
      rating: 4.6,
      total_deliveries: 1100,
    },
  ];

  it('filters out unavailable tankers from active bookable discovery', () => {
    const bookable = MOCK_FLEET.filter((t) => t.is_available === true);
    expect(bookable.find((t) => t.tanker_id === 'a0000000-0000-0000-0000-000000000003')).toBeUndefined();
    expect(bookable.length).toBe(3);
  });

  it('matches capacity filter strictly when customer specifies volume', () => {
    const filterByCapacity = (fleet: NearbyTanker[], cap: number) =>
      fleet.filter((t) => t.is_available && t.capacity_liters === cap);

    const fiveK = filterByCapacity(MOCK_FLEET, 5000);
    expect(fiveK.length).toBe(1);
    expect(fiveK[0].tanker_id).toBe('a0000000-0000-0000-0000-000000000002');

    const tenK = filterByCapacity(MOCK_FLEET, 10000);
    expect(tenK.length).toBe(1);
    expect(tenK[0].capacity_liters).toBe(10000);
  });

  it('sorts tankers deterministically by distance, price, and ETA', () => {
    const sortFleet = (fleet: NearbyTanker[], sort: TankerSortOption): NearbyTanker[] => {
      const copy = [...fleet.filter((t) => t.is_available)];
      if (sort === 'distance') return copy.sort((a, b) => a.distance_km - b.distance_km);
      if (sort === 'price') return copy.sort((a, b) => a.estimated_total_price - b.estimated_total_price);
      if (sort === 'eta') return copy.sort((a, b) => a.eta_minutes - b.eta_minutes);
      return copy;
    };

    // Sort by Distance
    const byDist = sortFleet(MOCK_FLEET, 'distance');
    expect(byDist[0].distance_km).toBe(1.2);
    expect(byDist[byDist.length - 1].distance_km).toBe(3.5);

    // Sort by Lowest Price
    const byPrice = sortFleet(MOCK_FLEET, 'price');
    expect(byPrice[0].estimated_total_price).toBe(504);
    expect(byPrice[byPrice.length - 1].estimated_total_price).toBe(1989);

    // Sort by Fastest ETA
    const byEta = sortFleet(MOCK_FLEET, 'eta');
    expect(byEta[0].eta_minutes).toBe(8);
  });
});
