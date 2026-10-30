import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { EmptyState } from '../../../components/common/Feedback/EmptyState';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { LiveTrackingState, TrackingService } from '../../../services/tracking/trackingService';
import { useBookingStore } from '../../../stores/bookingStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { BOOKING_STATUS_CONFIG } from '../../../types/booking';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LiveTrackingScreenProps {
  onBack?: () => void;
}

export const LiveTrackingScreen: React.FC<LiveTrackingScreenProps> = ({ onBack }) => {
  const { activeBooking, cancelBooking, simulateStatusAdvance } = useBookingStore();

  const [trackingState, setTrackingState] = useState<LiveTrackingState | null>(null);

  // Initialize tracking stream
  useEffect(() => {
    if (!activeBooking) return;

    // Initial position slightly offset to demonstrate approaching vector
    const initialLat = activeBooking.delivery_latitude + 0.015;
    const initialLng = activeBooking.delivery_longitude + 0.012;

    setTrackingState({
      currentLat: initialLat,
      currentLng: initialLng,
      heading: 220,
      speedKmh: 24,
      lastUpdated: new Date(),
      isStale: false,
      distanceRemainingKm: activeBooking.delivery_distance_km || 2.4,
      etaMinutes: activeBooking.estimated_arrival_minutes || 14,
    });

    const unsubscribe = TrackingService.subscribeToLiveTracking(
      activeBooking.id,
      activeBooking.delivery_latitude,
      activeBooking.delivery_longitude,
      (newState) => {
        setTrackingState(newState);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeBooking]);

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
      Alert.alert('Driver Call', 'Calling driver: +91 98451 15001');
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
          <Text style={styles.topRefText}>{activeBooking.booking_reference}</Text>
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

      {/* Main Interactive Tracking Map Canvas */}
      <View style={styles.mapCanvas}>
        {/* Road Graphics */}
        <View style={styles.routeRoadBackground} />
        <View style={styles.activeRoutePolyline} />

        {/* Tanker Marker (Moving with Heading Bearing) */}
        <View
          style={[
            styles.tankerVehiclePin,
            {
              left: SCREEN_WIDTH / 2 - 50,
              top: 100,
              transform: [{ rotate: `${trackingState?.heading || 0}deg` }],
            },
          ]}
        >
          <View style={styles.vehicleCabIcon}>
            <Ionicons name="car" size={20} color={colors.white} />
          </View>
          <View style={styles.speedPill}>
            <Text style={styles.speedText}>{trackingState?.speedKmh || 22} km/h</Text>
          </View>
        </View>

        {/* Customer Destination Sump Marker */}
        <View
          style={[
            styles.destinationSumpMarker,
            { left: SCREEN_WIDTH / 2 + 30, top: 220 },
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
                  {activeBooking.driver_name || 'Basavaraj Patil'}
                </Text>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.ratingText}>4.9</Text>
                </View>
              </View>
              <Text style={styles.vehicleRegText}>
                {activeBooking.vehicle_number || 'KA-04-TC-5001'} • {activeBooking.supplier_name}
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

          {/* Delivery Hand-off Security Instructions */}
          <View style={styles.handoffNotice}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            <Text style={styles.handoffText}>
              Share your 4-digit PIN with the driver only after the tanker is parked at your sump and ready to pump.
            </Text>
          </View>

          {/* Advance simulation or Cancellation */}
          <View style={styles.footerButtonsRow}>
            <View style={{ flex: 1, marginRight: spacing.xs }}>
              <Button
                title="Next Trip Step"
                variant="secondary"
                size="md"
                onPress={simulateStatusAdvance}
                rightIcon={<Ionicons name="play-forward" size={16} color={colors.primary} />}
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
});

