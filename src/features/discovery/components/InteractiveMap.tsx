import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NearbyTanker } from '../../../types/discovery';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 320;
const USER_CENTER_Y = 150;

interface InteractiveMapProps {
  userLocation: { latitude: number; longitude: number };
  tankers: NearbyTanker[];
  selectedTankerId: string | null;
  onSelectTanker: (tankerId: string) => void;
  onRecenterGps: () => void;
  isLocating?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  userLocation,
  tankers,
  selectedTankerId,
  onSelectTanker,
  onRecenterGps,
  isLocating = false,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Radar pulse animation for customer GPS dot
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.9,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Compute non-overlapping collision-free positions for top 6 closest tankers
  const placedTankers = useMemo(() => {
    const topTankers = tankers.slice(0, 6);
    const placed: Array<{ tanker: NearbyTanker; left: number; top: number }> = [];

    const centerLat = userLocation.latitude;
    const centerLng = userLocation.longitude;
    const scale = 7500 * zoomLevel;

    // Reservation zone for customer "You" pin
    const reservedCenter = { x: SCREEN_WIDTH / 2, y: USER_CENTER_Y };
    const minDistance = 64; // minimum distance in pixels between marker centers

    topTankers.forEach((tanker, index) => {
      let rawX = (tanker.longitude - centerLng) * scale + SCREEN_WIDTH / 2;
      let rawY = (centerLat - tanker.latitude) * scale + USER_CENTER_Y;

      // Check collision with center pin or previously placed markers
      let attempts = 0;
      let collision = true;
      let angle = (index * 60 * Math.PI) / 180;
      let offsetRadius = 0;

      while (collision && attempts < 10) {
        const testX = rawX + (offsetRadius > 0 ? Math.cos(angle) * offsetRadius : 0);
        const testY = rawY + (offsetRadius > 0 ? Math.sin(angle) * offsetRadius : 0);

        // Distance from center
        const distCenter = Math.hypot(testX - reservedCenter.x, testY - reservedCenter.y);
        let distOthers = true;

        for (const p of placed) {
          const d = Math.hypot(testX - (p.left + 42), testY - (p.top + 16));
          if (d < minDistance) {
            distOthers = false;
            break;
          }
        }

        if (distCenter >= minDistance && distOthers) {
          rawX = testX;
          rawY = testY;
          collision = false;
        } else {
          offsetRadius += 30;
          angle += (Math.PI / 3);
          attempts++;
        }
      }

      // Clamp within map bounds
      const left = Math.max(16, Math.min(SCREEN_WIDTH - 105, rawX - 42));
      const top = Math.max(28, Math.min(MAP_HEIGHT - 65, rawY - 16));

      placed.push({ tanker, left, top });
    });

    return placed;
  }, [tankers, userLocation.latitude, userLocation.longitude, zoomLevel]);

  const getCapacityLabel = (capacity: number) => {
    return `${(capacity / 1000).toFixed(0)}kL`;
  };

  return (
    <View style={styles.mapContainer}>
      {/* City Street Grid Canvas */}
      <View style={styles.canvasBackground}>
        {/* Major Avenue 1 */}
        <View style={styles.horizontalRoad1} />
        {/* Major Avenue 2 */}
        <View style={styles.horizontalRoad2} />
        {/* Cross Boulevard 1 */}
        <View style={styles.verticalRoad1} />
        {/* Cross Boulevard 2 */}
        <View style={styles.verticalRoad2} />
        {/* Express Ring Road */}
        <View style={styles.expressRing} />

        {/* Elegant Park / Green Zone */}
        <View style={styles.parkZone} />

        {/* User Current Location ("You") */}
        <View style={[styles.customerPinContainer, { left: SCREEN_WIDTH / 2 - 14, top: USER_CENTER_Y - 14 }]}>
          <Animated.View
            style={[
              styles.radarRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.9],
                  outputRange: [0.55, 0],
                }),
              },
            ]}
          />
          <View style={styles.customerPinCore}>
            <View style={styles.customerPinCenterDot} />
          </View>
          <View style={styles.youBadge}>
            <Text style={styles.youBadgeText}>You</Text>
          </View>
        </View>

        {/* Clean Sleek Vehicle Markers (Collision-Free) */}
        {placedTankers.map(({ tanker, left, top }) => {
          const isSelected = selectedTankerId === tanker.tanker_id;
          const capText = getCapacityLabel(tanker.capacity_liters);

          return (
            <Pressable
              key={tanker.tanker_id}
              accessibilityRole="button"
              accessibilityLabel={`${tanker.supplier_name}, ${capText}, ETA ${tanker.eta_minutes} mins`}
              onPress={() => onSelectTanker(tanker.tanker_id)}
              style={[
                styles.markerPill,
                isSelected ? styles.markerPillSelected : styles.markerPillDefault,
                { left, top },
              ]}
            >
              <View
                style={[
                  styles.markerIconCircle,
                  isSelected ? styles.markerIconCircleSelected : styles.markerIconCircleDefault,
                ]}
              >
                <Ionicons
                  name="water"
                  size={12}
                  color={isSelected ? colors.white : colors.primary}
                />
              </View>

              <Text
                style={[
                  styles.markerCapacityText,
                  isSelected ? styles.textWhite : styles.textNavy,
                ]}
              >
                {capText}
              </Text>

              <Text style={[styles.markerBullet, isSelected ? styles.textWhite : styles.textMuted]}>
                •
              </Text>

              <Text
                style={[
                  styles.markerEtaText,
                  isSelected ? styles.textWhite : styles.textPrimary,
                ]}
              >
                {tanker.eta_minutes}m
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Floating Map Zoom Controls (Top Right) */}
      <View style={styles.zoomControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
          onPress={() => setZoomLevel((z) => Math.min(2.0, z + 0.25))}
          style={styles.zoomButton}
        >
          <Ionicons name="add" size={18} color={colors.darkNavy} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          onPress={() => setZoomLevel((z) => Math.max(0.6, z - 0.25))}
          style={styles.zoomButton}
        >
          <Ionicons name="remove" size={18} color={colors.darkNavy} />
        </Pressable>
      </View>

      {/* Floating GPS Recenter Button (Bottom Right) */}
      <View style={styles.recenterWrapper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Center map to current location"
          onPress={onRecenterGps}
          disabled={isLocating}
          style={({ pressed }) => [styles.gpsButton, pressed && { opacity: 0.8 }]}
        >
          <Ionicons
            name="locate"
            size={20}
            color={isLocating ? colors.primaryLight : colors.primary}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    height: MAP_HEIGHT,
    backgroundColor: '#F1F5F9', // Crisp modern map canvas tone
    position: 'relative',
    overflow: 'hidden',
  },
  canvasBackground: {
    ...StyleSheet.absoluteFill,
  },
  horizontalRoad1: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  horizontalRoad2: {
    position: 'absolute',
    top: 220,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  verticalRoad1: {
    position: 'absolute',
    left: 80,
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  verticalRoad2: {
    position: 'absolute',
    right: 90,
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  expressRing: {
    position: 'absolute',
    top: -20,
    left: -50,
    width: 520,
    height: 18,
    backgroundColor: '#FEF3C7',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FDE68A',
    transform: [{ rotate: '22deg' }],
  },
  parkZone: {
    position: 'absolute',
    top: 30,
    right: 25,
    width: 100,
    height: 60,
    borderRadius: borderRadius.xl,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  customerPinContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    zIndex: 20,
  },
  radarRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  customerPinCore: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  customerPinCenterDot: {
    width: 5,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
  },
  youBadge: {
    position: 'absolute',
    top: -18,
    backgroundColor: colors.darkNavy,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    ...shadows.subtle,
  },
  youBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },
  // Sleek Single-Pill Marker
  markerPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    zIndex: 10,
    ...shadows.card,
  },
  markerPillDefault: {
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  markerPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryHover,
    borderWidth: 1.5,
    zIndex: 30,
    transform: [{ scale: 1.08 }],
    ...shadows.floating,
  },
  markerIconCircle: {
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  markerIconCircleDefault: {
    backgroundColor: '#E0F2FE',
  },
  markerIconCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  markerCapacityText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
  },
  markerBullet: {
    fontSize: 10,
    marginHorizontal: 3,
  },
  markerEtaText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
  },
  textNavy: {
    color: colors.darkNavy,
  },
  textWhite: {
    color: colors.white,
  },
  textPrimary: {
    color: colors.primary,
  },
  textMuted: {
    color: colors.textMuted,
  },
  zoomControls: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    zIndex: 25,
    ...shadows.card,
  },
  zoomButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  recenterWrapper: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    zIndex: 25,
  },
  gpsButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
});
