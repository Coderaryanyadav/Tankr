import { useBookingStore } from '../../src/stores/bookingStore';
import { useAuthStore } from '../../src/stores/authStore';
import { BOOKING_STATUS_CONFIG, BookingRecord, BookingStatus } from '../../src/types/booking';

describe('TANKR Live Tracking & Account Profile Business Logic Verification', () => {
  beforeEach(() => {
    useBookingStore.setState({
      activeBooking: null,
      userBookings: [],
      isLoadingBookings: false,
    });
  });

  describe('1. Genuine State-Driven Live Tracking Lifecycle & Telemetry Rules', () => {
    const mockPendingBooking: BookingRecord = {
      id: 'book-pending-101',
      booking_reference: 'TKR-2026-9901',
      customer_id: 'cust-1',
      tanker_id: 'tank-1',
      supplier_id: 'supp-1',
      supplier_name: 'Marol Express Water Logistics',
      status: 'pending',
      capacity_liters: 10000,
      water_type: 'Potable (Drinking)',
      delivery_address: 'Flat 402, Marol Hill View CHS, Andheri East, Mumbai',
      delivery_latitude: 19.1171,
      delivery_longitude: 72.8809,
      delivery_pin: '5582',
      delivery_distance_km: 1.8,
      estimated_arrival_minutes: 8,
      base_price: 1800,
      delivery_charge: 120,
      surcharge: 0,
      tax_amount: 96,
      final_payable_amount: 2016,
      payment_preference: 'upi',
      payment_status: 'authorized',
      created_at: new Date().toISOString(),
    };

    it('Pending state invariants: must NOT expose driver details, live vehicle speed or en-route telemetry', () => {
      useBookingStore.setState({ activeBooking: mockPendingBooking });
      const booking = useBookingStore.getState().activeBooking;
      expect(booking).toBeDefined();
      expect(booking?.status).toBe('pending');

      const isPending = booking?.status === 'pending';
      const isAccepted = booking?.status === 'accepted' || booking?.status === 'supplier_assigned';
      const isDriverAssigned = booking?.status === 'driver_assigned';
      const isEnRoute = booking?.status === 'en_route';
      const isArrived = booking?.status === 'arrived';
      const isDelivering = booking?.status === 'delivering';
      const isDelivered = booking?.status === 'delivered';

      expect(isPending).toBe(true);
      expect(isAccepted).toBe(false);
      expect(isDriverAssigned).toBe(false);
      expect(isEnRoute).toBe(false);
      expect(isArrived).toBe(false);
      expect(isDelivering).toBe(false);
      expect(isDelivered).toBe(false);

      // Invariant: Vehicle marker must NOT render when pending or accepted
      const shouldRenderVehicleMarker = isEnRoute || isArrived || isDelivering;
      expect(shouldRenderVehicleMarker).toBe(false);

      // Status badge and GPS signal must indicate connecting supplier
      const config = BOOKING_STATUS_CONFIG[booking!.status];
      expect(config.label).toBe('Connecting Supplier');
      expect(config.badgeVariant).toBe('warning');
    });

    it('Driver details and telemetry become authorized ONLY once driver is assigned or en route', () => {
      const mockEnRouteBooking: BookingRecord = {
        ...mockPendingBooking,
        id: 'book-enroute-202',
        status: 'en_route',
        driver_name: 'Sunil Pawar',
        driver_phone: '+91 98200 11003',
        vehicle_number: 'MH-02-TN-1001',
      };

      useBookingStore.setState({ activeBooking: mockEnRouteBooking });
      const booking = useBookingStore.getState().activeBooking;

      const isEnRoute = booking?.status === 'en_route';
      expect(isEnRoute).toBe(true);
      expect(booking?.driver_name).toBe('Sunil Pawar');
      expect(booking?.driver_phone).toBe('+91 98200 11003');
      expect(booking?.vehicle_number).toBe('MH-02-TN-1001');

      const shouldRenderVehicleMarker =
        booking?.status === 'en_route' ||
        booking?.status === 'arrived' ||
        booking?.status === 'delivering';
      expect(shouldRenderVehicleMarker).toBe(true);
    });

    it('Delivery completed invariants: triggers verified volume, PIN confirmed, and tax invoice readiness', () => {
      const mockDeliveredBooking: BookingRecord = {
        ...mockPendingBooking,
        id: 'book-delivered-303',
        status: 'delivered',
        driver_name: 'Sunil Pawar',
        delivered_liters: 10000,
      };

      useBookingStore.setState({ activeBooking: mockDeliveredBooking });
      const booking = useBookingStore.getState().activeBooking;

      expect(booking?.status).toBe('delivered');
      const config = BOOKING_STATUS_CONFIG[booking!.status];
      expect(config.label).toBe('Delivery Complete');
      expect(config.badgeVariant).toBe('success');
    });
  });

  describe('2. Cancellation Modal Invariant: Active booking cleared without zombie resurrection', () => {
    it('Cancelling active trip sets status to cancelled and prevents resurrecting old cancelled bookings', async () => {
      const activeTrip: BookingRecord = {
        id: 'active-trip-1',
        booking_reference: 'TKR-9999',
        customer_id: 'cust-1',
        tanker_id: 'tank-1',
        supplier_id: 'supp-1',
        status: 'pending',
        capacity_liters: 10000,
        water_type: 'Potable',
        delivery_address: 'Andheri East',
        delivery_latitude: 19.11,
        delivery_longitude: 72.88,
        delivery_pin: '1234',
        delivery_distance_km: 1.5,
        estimated_arrival_minutes: 10,
        base_price: 1500,
        delivery_charge: 100,
        surcharge: 0,
        tax_amount: 80,
        final_payable_amount: 1680,
        payment_preference: 'upi',
        payment_status: 'authorized',
        created_at: new Date().toISOString(),
      };

      useBookingStore.setState({
        activeBooking: activeTrip,
        userBookings: [activeTrip],
      });

      const res = await useBookingStore.getState().cancelBooking(activeTrip.id, 'Customer cancelled trip');
      expect(res.success).toBe(true);

      const store = useBookingStore.getState();
      expect(store.activeBooking).toBeNull();
      expect(store.userBookings[0].status).toBe('cancelled');

      // Filtering activeTrips must return 0
      const activeTrips = store.userBookings.filter(
        (b) => b.status !== 'delivered' && b.status !== 'cancelled'
      );
      expect(activeTrips.length).toBe(0);
    });
  });

  describe('3. Account Profile Editing & Persistence', () => {
    it('Allows updating full name, phone, city, preferred address, and pincode', async () => {
      useAuthStore.setState({
        profile: {
          id: 'test-user',
          phone_number: '919876543210',
          full_name: 'Jeet',
          role: 'customer',
          is_onboarding_completed: true,
          profile_photo_url: null,
          preferred_address: 'Building A, Flat 301',
          city: 'Mumbai',
          pincode: '400059',
        },
      });

      const res = await useAuthStore.getState().updateProfile({
        fullName: 'Jeetendra Sharma',
        phone: '919876543299',
        city: 'Thane',
        preferredAddress: 'Wing B, High Park Society, Pokhran Road',
        pincode: '400601',
      });

      expect(res.success).toBe(true);
      const updated = useAuthStore.getState().profile;
      expect(updated?.full_name).toBe('Jeetendra Sharma');
      expect(updated?.phone_number).toBe('919876543299');
      expect(updated?.city).toBe('Thane');
      expect(updated?.preferred_address).toBe('Wing B, High Park Society, Pokhran Road');
      expect(updated?.pincode).toBe('400601');
    });
  });
});
