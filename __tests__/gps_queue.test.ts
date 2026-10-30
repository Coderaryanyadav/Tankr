describe('Offline GPS Queue & Reconnection Telemetry', () => {
  interface LocationPing {
    bookingId: string;
    lat: number;
    lng: number;
    speed: number;
    timestamp: number;
  }

  class MockOfflineGpsQueue {
    public queue: LocationPing[] = [];
    public deliveredPings: LocationPing[] = [];

    push(ping: LocationPing) {
      this.queue.push(ping);
    }

    flush(isNetworkOnline: boolean) {
      if (!isNetworkOnline) return;

      while (this.queue.length > 0) {
        const item = this.queue.shift()!;
        this.deliveredPings.push(item);
      }
    }
  }

  test('buffers GPS coordinates while offline and flushes chronologically upon reconnect', () => {
    const tracker = new MockOfflineGpsQueue();

    // 1. Driver traverses cellular dead zone
    tracker.push({ bookingId: 'b-01', lat: 12.9716, lng: 77.5946, speed: 28, timestamp: 1000 });
    tracker.push({ bookingId: 'b-01', lat: 12.9725, lng: 77.5955, speed: 30, timestamp: 2000 });
    tracker.push({ bookingId: 'b-01', lat: 12.9734, lng: 77.5964, speed: 32, timestamp: 3000 });

    expect(tracker.queue.length).toBe(3);
    expect(tracker.deliveredPings.length).toBe(0);

    // 2. Flush while still offline has no effect
    tracker.flush(false);
    expect(tracker.queue.length).toBe(3);
    expect(tracker.deliveredPings.length).toBe(0);

    // 3. Network reconnects
    tracker.flush(true);
    expect(tracker.queue.length).toBe(0);
    expect(tracker.deliveredPings.length).toBe(3);
    expect(tracker.deliveredPings[0].timestamp).toBe(1000);
    expect(tracker.deliveredPings[2].timestamp).toBe(3000);
  });
});
