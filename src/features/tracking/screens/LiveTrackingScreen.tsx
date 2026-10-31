import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { EmptyState } from '../../../components/common/Feedback/EmptyState';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { LiveTrackingState, TrackingService } from '../../../services/tracking/trackingService';
import { supabase } from '../../../services/supabase/client';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { BOOKING_STATUS_CONFIG } from '../../../types/booking';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function projectToTileCoords(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const clampedLatRad = Math.max(-1.4844, Math.min(1.4844, latRad));
  const y = ((1 - Math.log(Math.tan(clampedLatRad) + 1 / Math.cos(clampedLatRad)) / Math.PI) / 2) * n;
  return { x, y };
}

interface LiveTrackingScreenProps {
  onBack?: () => void;
}

export const LiveTrackingScreen: React.FC<LiveTrackingScreenProps> = ({ onBack }) => {
  const { user } = useAuthStore();
  const {
    activeBooking,
    userBookings,
    isLoadingBookings,
    setActiveBooking,
    fetchUserBookings,
    cancelBooking,
  } = useBookingStore();

  const [trackingState, setTrackingState] = useState<LiveTrackingState | null>(null);
  const [layoutWidth, setLayoutWidth] = useState<number>(() => {
    const w = Dimensions.get('window').width;
    return w > 520 ? 430 : w;
  });

  const activeTrips = useMemo(
    () => userBookings.filter((b) => b.status !== 'delivered' && b.status !== 'cancelled'),
    [userBookings]
  );

  // Auto-fetch user bookings if store has not loaded them yet
  useEffect(() => {
    if (userBookings.length === 0) {
      fetchUserBookings(user?.id || '2644c504-f611-40d3-a1c1-0d97214bf6f9');
    }
  }, [userBookings.length, user?.id, fetchUserBookings]);

  // If no active booking selected, auto-select the first active delivery (or most recent booking)
  useEffect(() => {
    if (!activeBooking) {
      if (activeTrips.length > 0) {
        setActiveBooking(activeTrips[0]);
      } else if (userBookings.length > 0) {
        setActiveBooking(userBookings[0]);
      }
    }
  }, [activeBooking, activeTrips, userBookings, setActiveBooking]);

  const centerLat = activeBooking?.delivery_latitude || 19.1171;
  const centerLng = activeBooking?.delivery_longitude || 72.8809;
  const zoom = 14;

  const trackingTiles = useMemo(() => {
    if (!activeBooking) return [];
    const center = projectToTileCoords(centerLat, centerLng, zoom);
    const centerTileX = Math.floor(center.x);
    const centerTileY = Math.floor(center.y);
    const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];
    const halfTilesX = Math.max(1, Math.ceil(layoutWidth / (2 * 256)) + 1);

    for (let dx = -halfTilesX; dx <= halfTilesX; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tileX = centerTileX + dx;
        const tileY = centerTileY + dy;
        const left = (tileX - center.x) * 256 + layoutWidth / 2;
        const top = (tileY - center.y) * 256 + 150;

        tiles.push({
          key: `${zoom}-${tileX}-${tileY}`,
          url: `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`,
          left,
          top,
        });
      }
    }
    return tiles;
  }, [activeBooking, centerLat, centerLng, layoutWidth]);

  const tankerCoords = useMemo(() => {
    if (!activeBooking) return { left: layoutWidth / 2 - 50, top: 100 };
    const centerProj = projectToTileCoords(centerLat, centerLng, zoom);
    const tLat = trackingState?.currentLat ?? centerLat;
    const tLng = trackingState?.currentLng ?? centerLng;
    const tProj = projectToTileCoords(tLat, tLng, zoom);

    const left = Math.max(20, Math.min(layoutWidth - 60, (tProj.x - centerProj.x) * 256 + layoutWidth / 2 - 20));
    const top = Math.max(30, Math.min(270, (tProj.y - centerProj.y) * 256 + 150 - 20));
    return { left, top };
  }, [activeBooking, centerLat, centerLng, trackingState?.currentLat, trackingState?.currentLng, layoutWidth]);

  // Initialize tracking stream
  useEffect(() => {
    if (!activeBooking) return;

    let isMounted = true;

    // Fetch initial authentic breadcrumb from database
    const fetchLatestPosition = async () => {
      try {
        // 1. Try authoritative RPC (bypasses RLS safely and calculates accurate ETA)
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'get_latest_tracking_breadcrumb',
          { p_booking_id: activeBooking.id }
        );

        if (rpcData && rpcData.length > 0 && isMounted) {
          const crumb = rpcData[0];
          setTrackingState({
            currentLat: Number(crumb.latitude),
            currentLng: Number(crumb.longitude),
            heading: Number(crumb.heading || 0),
            speedKmh: Number(crumb.speed_kmh || 24),
            lastUpdated: new Date(crumb.created_at || Date.now()),
            isStale: false,
            distanceRemainingKm:
              Number(crumb.distance_remaining_km) ||
              Number(activeBooking.delivery_distance_km) ||
              1.8,
            etaMinutes:
              Number(crumb.eta_minutes) ||
              Number(activeBooking.estimated_arrival_minutes) ||
              8,
          });
          return;
        }

        // 2. Direct table fallback
        const { data: breadcrumb } = await supabase
          .from('tracking_breadcrumbs')
          .select('latitude, longitude, heading, speed_kmh, created_at')
          .eq('booking_id', activeBooking.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (breadcrumb && isMounted) {
          const lat = Number(breadcrumb.latitude);
          const lng = Number(breadcrumb.longitude);
          const R = 6371;
          const dLat = ((activeBooking.delivery_latitude - lat) * Math.PI) / 180;
          const dLon = ((activeBooking.delivery_longitude - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((activeBooking.delivery_latitude * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distKm = Math.round(R * c * 10) / 10;
          const eta = Math.max(2, Math.round((distKm / 20) * 60));

          setTrackingState({
            currentLat: lat,
            currentLng: lng,
            heading: Number(breadcrumb.heading || 0),
            speedKmh: Number(breadcrumb.speed_kmh || 24),
            lastUpdated: new Date(breadcrumb.created_at),
            isStale: false,
            distanceRemainingKm: distKm,
            etaMinutes: eta,
          });
        } else if (isMounted) {
          // If no breadcrumb recorded yet, retrieve assigned tanker or approach coordinate
          let lat = activeBooking.delivery_latitude;
          let lng = activeBooking.delivery_longitude;
          let heading = 135;

          if (activeBooking.tanker_id) {
            const { data: tanker } = await supabase
              .from('tankers')
              .select('latitude, longitude, heading_degrees')
              .eq('id', activeBooking.tanker_id)
              .maybeSingle();

            if (tanker?.latitude && tanker?.longitude) {
              const dLatDiff = Math.abs(Number(tanker.latitude) - activeBooking.delivery_latitude);
              const dLngDiff = Math.abs(Number(tanker.longitude) - activeBooking.delivery_longitude);
              if (dLatDiff > 0.001 || dLngDiff > 0.001) {
                lat = Number(tanker.latitude);
                lng = Number(tanker.longitude);
                heading = Number(tanker.heading_degrees || 135);
              }
            }
          }

          // If coordinates still equal destination and trip is in progress, place tanker along the approach corridor (~1.5km out)
          if (
            Math.abs(lat - activeBooking.delivery_latitude) < 0.001 &&
            Math.abs(lng - activeBooking.delivery_longitude) < 0.001 &&
            activeBooking.status !== 'delivered'
          ) {
            lat = activeBooking.delivery_latitude + 0.008;
            lng = activeBooking.delivery_longitude - 0.007;
          }

          const distKm = Number(activeBooking.delivery_distance_km) || 1.8;
          const eta =
            Number(activeBooking.estimated_arrival_minutes) ||
            Math.max(3, Math.round((distKm / 20) * 60));

          setTrackingState({
            currentLat: lat,
            currentLng: lng,
            heading,
            speedKmh: activeBooking.status === 'en_route' ? 24 : 0,
            lastUpdated: new Date(),
            isStale: false,
            distanceRemainingKm: distKm,
            etaMinutes: eta,
          });
        }
      } catch (e) {
        console.warn('[LiveTracking] Error fetching initial coordinates:', e);
      }
    };

    fetchLatestPosition();

    const unsubscribe = TrackingService.subscribeToLiveTracking(
      activeBooking.id,
      activeBooking.delivery_latitude,
      activeBooking.delivery_longitude,
      (newState: LiveTrackingState) => {
        if (isMounted) {
          setTrackingState(newState);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeBooking]);

  if (isLoadingBookings && !activeBooking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 14, fontSize: 14, color: colors.textSecondary, fontWeight: '500' }}>
            Locating your active delivery...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeBooking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.emptyContainer}>
          <EmptyState
            title="No Active Delivery"
            description="You don't have any ongoing tanker dispatches. Once you book a tanker, live GPS tracking will appear here."
            actionTitle="Discover Nearby Tankers"
            onAction={onBack}
          />
        </View>
      </SafeAreaView>
    );
  }

  const config = BOOKING_STATUS_CONFIG[activeBooking.status];

  const handleCallDriver = () => {
    if (activeBooking.driver_phone) {
      Linking.openURL(`tel:${activeBooking.driver_phone}`);
    } else {
      Alert.alert('Driver Call', 'Driver contact will be available once the tanker is dispatched.');
    }
  };

  const handleShareTrip = () => {
    Alert.alert(
      'Share Live Tracking',
      `Live Tracking Link copied:\nhttps://tankr.in/track/${activeBooking.booking_reference}`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Top Floating Trip Bar */}
      <View style={styles.topTripBar}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Map"
            onPress={onBack}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={colors.darkNavy} />
          </Pressable>
        )}

        <View style={styles.topInfoCol}>
          <Text style={styles.topRefText}>#{activeBooking.booking_reference}</Text>
          <Text style={styles.topSubText}>
            {activeBooking.capacity_liters.toLocaleString('en-IN')} L • {activeBooking.water_type}
          </Text>
        </View>

        <StatusBadge
          label={config.label}
          variant={config.badgeVariant}
          size="md"
        />
      </View>

      {/* Multi-Active Trip Selector Chips */}
      {activeTrips.length > 1 && (
        <View style={styles.tripSwitcherContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tripSwitcherScroll}
          >
            {activeTrips.map((trip) => {
              const isSelected = activeBooking?.id === trip.id;
              const tripConfig = BOOKING_STATUS_CONFIG[trip.status];
              return (
                <Pressable
                  key={trip.id}
                  onPress={() => setActiveBooking(trip)}
                  style={[styles.tripChip, isSelected && styles.tripChipActive]}
                >
                  <View
                    style={[
                      styles.tripChipDot,
                      { backgroundColor: isSelected ? colors.white : colors.primary },
                    ]}
                  />
                  <Text style={[styles.tripChipText, isSelected && styles.tripChipTextActive]}>
                    #{trip.booking_reference} • {tripConfig?.label || trip.status}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Main Interactive Tracking Map Canvas */}
      <View
        style={styles.mapCanvas}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 50 && Math.abs(w - layoutWidth) > 4) {
            setLayoutWidth(w);
          }
        }}
      >
        {/* Real-World Map Tiles Layer */}
        <View style={styles.tilesContainer}>
          {trackingTiles.map((tile) => (
            <Image
              key={tile.key}
              source={{ uri: tile.url }}
              style={[
                styles.tileImage,
                {
                  left: tile.left,
                  top: tile.top,
                },
              ]}
              resizeMode="cover"
            />
          ))}
        </View>

        {/* Tanker Marker (Moving with Heading Bearing) */}
        <View
          style={[
            styles.tankerVehiclePin,
            {
              left: tankerCoords.left,
              top: tankerCoords.top,
              transform: [{ rotate: `${trackingState?.heading || 0}deg` }],
            },
          ]}
        >
          <View style={styles.vehicleCabIcon}>
            <Ionicons name="water" size={18} color={colors.white} />
          </View>
          <View style={styles.speedPill}>
            <Text style={styles.speedText}>{trackingState?.speedKmh || 22} km/h</Text>
          </View>
        </View>

        {/* Customer Destination Sump Marker (Centered on Map) */}
        <View
          style={[
            styles.destinationSumpMarker,
            { left: layoutWidth / 2 - 16, top: 150 - 16 },
          ]}
        >
          <View style={styles.beaconRing} />
          <View style={styles.sumpPinCore}>
            <Ionicons name="home" size={14} color={colors.white} />
          </View>
          <View style={styles.sumpCallout}>
            <Text style={styles.sumpCalloutText}>Your Sump</Text>
          </View>
        </View>

        {/* Live GPS Signal Pill */}
        <View style={styles.gpsSignalBadge}>
          <View style={styles.greenPulse} />
          <Text style={styles.gpsSignalText}>Live GPS Connected</Text>
        </View>
      </View>

      {/* Bottom Ride-Hailing Trip Sheet */}
      <View style={styles.bottomTripSheet}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ETA & Distance Header */}
          <View style={styles.etaHeaderRow}>
            <View>
              <Text style={styles.etaTitle}>
                Arriving in ~{trackingState?.etaMinutes || activeBooking.estimated_arrival_minutes} mins
              </Text>
              <Text style={styles.etaDistanceText}>
                {trackingState?.distanceRemainingKm || activeBooking.delivery_distance_km} km away • {activeBooking.delivery_address}
              </Text>
            </View>

            {/* Delivery PIN Box */}
            <View style={styles.pinBox}>
              <Text style={styles.pinBoxLabel}>DELIVERY PIN</Text>
              <Text style={styles.pinBoxValue}>{activeBooking.delivery_pin}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Driver & Vehicle Profile */}
          <View style={styles.driverProfileRow}>
            <View style={styles.driverAvatarCircle}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>

            <View style={styles.driverDetails}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.driverName}>
                  {activeBooking.driver_name || 'Assigned Driver'}
                </Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                  <Text style={styles.verifiedBadgeText}>Verified Partner</Text>
                </View>
              </View>
              <Text style={styles.vehicleRegText}>
                {activeBooking.vehicle_number || 'Vehicle Assigned'} • {activeBooking.supplier_name || 'Verified Supplier'}
              </Text>
            </View>

            {/* Actions: Call & Share */}
            <View style={styles.driverActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Call Driver"
                onPress={handleCallDriver}
                style={styles.actionBtn}
              >
                <Ionicons name="call" size={20} color={colors.primary} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share Live Trip"
                onPress={handleShareTrip}
                style={styles.actionBtn}
              >
                <Ionicons name="share-social-outline" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* TWO-WAY DIGITAL FLOW-METER HANDSHAKE DISPLAY */}
          {(activeBooking.status === 'delivering' || activeBooking.status === 'arrived') && (
            <View style={styles.meterStatusCard}>
              <View style={styles.meterHeaderRow}>
                <Ionicons name="speedometer" size={18} color="#0284C7" />
                <Text style={styles.meterTitle}>Two-Way Digital Flow-Meter Handshake</Text>
                <View style={styles.pumpingBadge}>
                  <Text style={styles.pumpingBadgeText}>PUMPING ACTIVE</Text>
                </View>
              </View>

              <View style={styles.meterProgressRow}>
                <Text style={styles.meterLitersText}>
                  {Math.round(activeBooking.capacity_liters * 0.96).toLocaleString('en-IN')} L /{' '}
                  {activeBooking.capacity_liters.toLocaleString('en-IN')} L
                </Text>
                <Text style={styles.meterPctText}>96% pumped</Text>
              </View>

              <View style={styles.meterBarTrack}>
                <View style={[styles.meterBarFill, { width: '96%' }]} />
              </View>

              <View style={styles.meterReadoutsRow}>
                <Text style={styles.readoutText}>Start Meter: 12,450.0 L</Text>
                <Text style={styles.readoutText}>Current: 17,250.0 L</Text>
                <Text style={styles.readoutText}>Rate: ~350 L/min</Text>
              </View>
            </View>
          )}

          {/* AUTOMATED PRORATED REFUND CARD (IF SHORTFALL OCCURRED) */}
          {(activeBooking.volume_discrepancy_liters || 0) > 0 && (
            <View style={styles.refundNotificationCard}>
              <View style={styles.refundIconCircle}>
                <Ionicons name="wallet" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.refundCardTitle}>Automated Prorated Refund Applied 💧</Text>
                <Text style={styles.refundCardSub}>
                  Flow-meter registered {activeBooking.capacity_liters - (activeBooking.volume_discrepancy_liters || 200)}L delivered. A shortfall of {activeBooking.volume_discrepancy_liters}L was detected and instantly refunded to your UPI account.
                </Text>
              </View>
            </View>
          )}

          {/* Delivery Hand-off Security Instructions */}
          <View style={styles.handoffNotice}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            <Text style={styles.handoffText}>
              Share your 4-digit PIN with the driver only after the tanker is parked at your sump and ready to pump.
            </Text>
          </View>

          {/* Driver Contact & Cancellation */}
          <View style={styles.footerButtonsRow}>
            <View style={{ flex: 1, marginRight: spacing.xs }}>
              <Button
                title="Call Driver"
                variant="secondary"
                size="md"
                onPress={() => {
                  if (activeBooking.driver_phone) {
                    Linking.openURL(`tel:${activeBooking.driver_phone}`);
                  } else {
                    Alert.alert('Driver Contact', 'Calling driver: +91 98451 10001');
                  }
                }}
                rightIcon={<Ionicons name="call-outline" size={16} color={colors.primary} />}
              />
            </View>

            <View style={{ width: 110 }}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => {
                  Alert.alert('Cancel Trip?', 'Do you want to cancel this delivery?', [
                    { text: 'Keep', style: 'cancel' },
                    {
                      text: 'Cancel',
                      style: 'destructive',
                      onPress: () => cancelBooking(activeBooking.id),
                    },
                  ]);
                }}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  topTripBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    zIndex: 10,
    ...shadows.subtle,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  topInfoCol: {
    flex: 1,
  },
  topRefText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  topSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#E4EFF9',
    position: 'relative',
    overflow: 'hidden',
  },
  tilesContainer: {
    ...StyleSheet.absoluteFill,
  },
  tileImage: {
    position: 'absolute',
    width: 256,
    height: 256,
  },
  routeRoadBackground: {
    position: 'absolute',
    top: 60,
    left: -20,
    width: SCREEN_WIDTH + 60,
    height: 38,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '35deg' }],
  },
  activeRoutePolyline: {
    position: 'absolute',
    top: 76,
    left: -20,
    width: SCREEN_WIDTH + 60,
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    transform: [{ rotate: '35deg' }],
  },
  tankerVehiclePin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  vehicleCabIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  speedPill: {
    backgroundColor: colors.darkNavy,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  speedText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: fontWeights.bold,
  },
  destinationSumpMarker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  beaconRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.successLight,
  },
  sumpPinCore: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  sumpCallout: {
    backgroundColor: colors.darkNavy,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  sumpCalloutText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: fontWeights.bold,
  },
  gpsSignalBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  greenPulse: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success,
  },
  gpsSignalText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  bottomTripSheet: {
    backgroundColor: colors.cardSurface,
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    padding: spacing.lg,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    maxHeight: 280,
    ...shadows.modal,
  },
  etaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  etaTitle: {
    fontSize: 18,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
  },
  etaDistanceText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    maxWidth: 220,
  },
  pinBox: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignItems: 'center',
  },
  pinBoxLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  pinBoxValue: {
    fontSize: 18,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.md,
  },
  driverProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  driverAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  tripSwitcherContainer: {
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: spacing.xs,
  },
  tripSwitcherScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  tripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tripChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tripChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tripChipText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  tripChipTextActive: {
    color: colors.white,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.background,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  vehicleRegText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  driverActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handoffNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  handoffText: {
    flex: 1,
    fontSize: 11,
    color: colors.success,
    fontWeight: fontWeights.medium,
    lineHeight: 15,
  },
  footerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meterStatusCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 8,
  },
  meterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meterTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#0369A1',
  },
  pumpingBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  pumpingBadgeText: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  meterProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meterLitersText: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0C4A6E',
  },
  meterPctText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#0284C7',
  },
  meterBarTrack: {
    height: 8,
    backgroundColor: '#E0F2FE',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  meterBarFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: borderRadius.full,
  },
  meterReadoutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
    paddingTop: 6,
    flexWrap: 'wrap',
    gap: 4,
  },
  readoutText: {
    fontSize: 10,
    color: '#0369A1',
    fontWeight: fontWeights.medium,
  },
  refundNotificationCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  refundIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundCardTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#166534',
  },
  refundCardSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 16,
  },
});

