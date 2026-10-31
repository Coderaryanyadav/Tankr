import { calculateDistanceKm } from '../../src/services/pricingService';

describe('LOGIC-06: GPS Telemetry & Tracking Logic Audit', () => {
  interface LocationBreadcrumb {
    latitude: number;
    longitude: number;
    timestamp: number; // Unix epoch ms
    speedKmph?: number;
  }

  // Pure logic engine for GPS ping ingestion
  const processGpsPing = (
    currentHistory: LocationBreadcrumb[],
    newPing: LocationBreadcrumb
  ): { accepted: boolean; rejectionReason?: string } => {
    // 1. Check Null Island (0, 0)
    if (Math.abs(newPing.latitude) < 0.0001 && Math.abs(newPing.longitude) < 0.0001) {
      return { accepted: false, rejectionReason: 'Null Island (0, 0) coordinates rejected' };
    }

    // 2. WGS-84 Bounds Check
    if (newPing.latitude < -90 || newPing.latitude > 90 || newPing.longitude < -180 || newPing.longitude > 180) {
      return { accepted: false, rejectionReason: 'Out-of-bounds geographic coordinates' };
    }

    // 3. Monotonic Timestamp Check
    if (currentHistory.length > 0) {
      const lastPing = currentHistory[currentHistory.length - 1];
      if (newPing.timestamp <= lastPing.timestamp) {
        return { accepted: false, rejectionReason: 'Non-monotonic or duplicate timestamp rejected' };
      }

      // 4. Teleportation / Speed Filter
      const timeDeltaHours = (newPing.timestamp - lastPing.timestamp) / (1000 * 3600);
      const distKm = calculateDistanceKm(
        lastPing.latitude,
        lastPing.longitude,
        newPing.latitude,
        newPing.longitude
      );
      const computedSpeed = distKm / timeDeltaHours;

      if (computedSpeed > 120) {
        // Commercial water tankers in Mumbai urban traffic cannot exceed 120 km/h
        return { accepted: false, rejectionReason: `Supersonic teleportation anomaly: ${Math.round(computedSpeed)} km/h` };
      }
    }

    return { accepted: true };
  };

  describe('7.1 Geo-Boundary & Null Island Verification', () => {
    it('rejects Null Island (0, 0) pings', () => {
      const res = processGpsPing([], { latitude: 0.0, longitude: 0.0, timestamp: 1730000000 });
      expect(res.accepted).toBe(false);
      expect(res.rejectionReason).toMatch(/Null Island/i);
    });

    it('rejects coordinates exceeding Earth coordinate bounds', () => {
      const resLat = processGpsPing([], { latitude: 95.0, longitude: 72.8, timestamp: 1730000000 });
      expect(resLat.accepted).toBe(false);

      const resLng = processGpsPing([], { latitude: 19.1, longitude: 195.0, timestamp: 1730000000 });
      expect(resLng.accepted).toBe(false);
    });
  });

  describe('7.2 Monotonic Ordering & Teleportation Anomaly Rejection', () => {
    it('rejects out-of-order stale GPS breadcrumbs', () => {
      const history: LocationBreadcrumb[] = [
        { latitude: 19.1171, longitude: 72.8809, timestamp: 10000 },
        { latitude: 19.1180, longitude: 72.8815, timestamp: 20000 },
      ];

      // Ping with timestamp 15000 arriving after 20000 (packet reordering)
      const res = processGpsPing(history, {
        latitude: 19.1175,
        longitude: 72.8812,
        timestamp: 15000,
      });

      expect(res.accepted).toBe(false);
      expect(res.rejectionReason).toMatch(/Non-monotonic/i);
    });

    it('rejects physical teleportation (> 120 km/h) anomaly', () => {
      const history: LocationBreadcrumb[] = [
        { latitude: 19.1171, longitude: 72.8809, timestamp: 1000000 }, // Andheri East
      ];

      // 5 seconds later, claimed ping at Pune (120 km away!)
      const teleportPing: LocationBreadcrumb = {
        latitude: 18.5204,
        longitude: 73.8567,
        timestamp: 1005000, // 5 seconds later
      };

      const res = processGpsPing(history, teleportPing);
      expect(res.accepted).toBe(false);
      expect(res.rejectionReason).toMatch(/teleportation anomaly/i);
    });

    it('accepts realistic city driving telemetry', () => {
      const history: LocationBreadcrumb[] = [
        { latitude: 19.1171, longitude: 72.8809, timestamp: 1000000 },
      ];

      // 30 seconds later, 200 meters ahead (speed ~24 km/h)
      const validPing: LocationBreadcrumb = {
        latitude: 19.1185,
        longitude: 72.8820,
        timestamp: 1030000,
      };

      const res = processGpsPing(history, validPing);
      expect(res.accepted).toBe(true);
    });
  });
});
