import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NearbyTanker } from '../../../types/discovery';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Radar pulse animation for customer location pin
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.8,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Marker style by capacity tier
  const getMarkerVisuals = (capacity: number) => {
    if (capacity <= 2000) {
      return {
        bg: colors.secondary,
        icon: 'water' as const,
        label: `${(capacity / 1000).toFixed(0)}kL`,
      };
    } else if (capacity <= 5000) {
      return {
        bg: colors.primary,
        icon: 'car' as const,
        label: '5kL',
      };
    } else if (capacity <= 10000) {
      return {
        bg: colors.darkNavy,
        icon: 'bus' as const,
        label: '10kL',
      };
    } else {
      return {
        bg: '#8B5CF6', // Purple for Jumbo 12kL & 20kL
        icon: 'train' as const,
        label: `${(capacity / 1000).toFixed(0)}kL`,
      };
    }
  };

  // Convert GPS delta to responsive pixel offset on screen canvas
  const getPixelPosition = (lat: number, lng: number) => {
    const centerLat = userLocation.latitude;
    const centerLng = userLocation.longitude;
    const scale = 5000 * zoomLevel;

    const x = (lng - centerLng) * scale + SCREEN_WIDTH / 2;
    const y = (centerLat - lat) * scale + 180; // center height reference

    return { left: Math.max(20, Math.min(SCREEN_WIDTH - 60, x)), top: Math.max(30, Math.min(320, y)) };
  };

  return (
    <View style={styles.mapContainer}>
      {/* Visual Road & Water Grid Canvas */}
      <View style={styles.canvasBackground}>
        {/* City Road Network Graphics */}
        <View style={styles.horizontalRoad1} />
        <View style={styles.horizontalRoad2} />
        <View style={styles.verticalRoad1} />
        <View style={styles.verticalRoad2} />
        <View style={styles.diagonalHighway} />

        {/* Water Lake / Reservoir Representation */}
        <View style={styles.reservoirLake}>
          <Text style={styles.lakeLabel}>Ulsoor Lake Water Node</Text>
        </View>

        {/* Customer Location Pin with Radar Ping */}
        <View style={[styles.customerPinContainer, { left: SCREEN_WIDTH / 2 - 16, top: 164 }]}>
          <Animated.View
            style={[
              styles.radarRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.8],
                  outputRange: [0.6, 0],
                }),
              },
            ]}
          />
          <View style={styles.customerPinCore}>
            <View style={styles.customerPinCenterDot} />
          </View>
          <View style={styles.deliveryCallout}>
            <Text style={styles.deliveryCalloutText}>Delivery Sump</Text>
          </View>
        </View>

        {/* Dynamic Tanker Markers */}
        {tankers.map((tanker) => {
          const isSelected = selectedTankerId === tanker.tanker_id;
          const visuals = getMarkerVisuals(tanker.capacity_liters);
          const pos = getPixelPosition(tanker.latitude, tanker.longitude);

          return (
            <Pressable
              key={tanker.tanker_id}
              accessibilityRole="button"
              accessibilityLabel={`${tanker.supplier_name}, ${visuals.label}, ETA ${tanker.eta_minutes} mins`}
              onPress={() => onSelectTanker(tanker.tanker_id)}
              style={[
                styles.markerWrapper,
                { left: pos.left, top: pos.top },
                isSelected && styles.markerWrapperSelected,
              ]}
            >
              {/* ETA Badge */}
              <View style={[styles.etaTag, isSelected && styles.etaTagSelected]}>
                <Text style={styles.etaText}>{tanker.eta_minutes}m</Text>
              </View>

              {/* Vehicle Pin */}
              <View
                style={[
                  styles.markerPin,
                  { backgroundColor: visuals.bg },
                  isSelected && styles.markerPinSelected,
                ]}
              >
                <Ionicons name={visuals.icon} size={15} color={colors.white} />
              </View>

              {/* Capacity Label */}
              <View style={styles.capacityBadge}>
                <Text style={styles.capacityText}>{visuals.label}</Text>
              </View>
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
          <Ionicons name="add" size={20} color={colors.darkNavy} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          onPress={() => setZoomLevel((z) => Math.max(0.6, z - 0.25))}
          style={styles.zoomButton}
        >
          <Ionicons name="remove" size={20} color={colors.darkNavy} />
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
            size={22}
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
    height: 380,
    backgroundColor: '#E8F1FA',
    position: 'relative',
    overflow: 'hidden',
  },
  canvasBackground: {
    ...StyleSheet.absoluteFill,
  },
  horizontalRoad1: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  horizontalRoad2: {
    position: 'absolute',
    top: 240,
    left: 0,
    right: 0,
    height: 22,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  verticalRoad1: {
    position: 'absolute',
    left: 90,
    top: 0,
    bottom: 0,
    width: 18,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  verticalRoad2: {
    position: 'absolute',
    right: 80,
    top: 0,
    bottom: 0,
    width: 24,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  diagonalHighway: {
    position: 'absolute',
    top: 20,
    left: -40,
    width: 500,
    height: 26,
    backgroundColor: '#FAF5E8',
    borderColor: '#EFE2C5',
    borderWidth: 1,
    transform: [{ rotate: '25deg' }],
  },
  reservoirLake: {
    position: 'absolute',
    top: 40,
    right: 30,
    width: 140,
    height: 70,
    borderRadius: borderRadius['3xl'],
    backgroundColor: '#C5DFF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A8D2F2',
  },
  lakeLabel: {
    fontSize: 9,
    color: '#09529E',
    fontWeight: fontWeights.semibold,
  },
  customerPinContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  radarRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  customerPinCore: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  customerPinCenterDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
  },
  deliveryCallout: {
    position: 'absolute',
    top: -20,
    backgroundColor: colors.darkNavy,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    ...shadows.subtle,
  },
  deliveryCalloutText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },
  markerWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  markerWrapperSelected: {
    zIndex: 25,
    transform: [{ scale: 1.15 }],
  },
  etaTag: {
    backgroundColor: colors.darkNavy,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    marginBottom: 2,
    ...shadows.subtle,
  },
  etaTagSelected: {
    backgroundColor: colors.primary,
  },
  etaText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },
  markerPin: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.card,
  },
  markerPinSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
    ...shadows.floating,
  },
  capacityBadge: {
    backgroundColor: colors.cardSurface,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  capacityText: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  zoomControls: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    zIndex: 15,
    ...shadows.card,
  },
  zoomButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  recenterWrapper: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.md,
    zIndex: 15,
  },
  gpsButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
});
