import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NearbyTanker } from '../../../types/discovery';
import { borderRadius, colors, fontSizes, fontWeights, shadows, spacing } from '../../../theme';
import { haptics } from '../../../theme/haptics';

const TILE_SIZE = 256;

export interface InteractiveMapProps {
  userLocation: { latitude: number; longitude: number };
  tankers: NearbyTanker[];
  selectedTankerId: string | null;
  onSelectTanker: (tankerId: string) => void;
  onRecenterGps: () => void;
  isLocating?: boolean;
  isLoading?: boolean;
  hasLocationPermission?: boolean;
  onRequestPermission?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Convert WGS84 Lat/Lng to Slippy Map Tile Coordinates
function projectToTileCoords(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const clampedLatRad = Math.max(-1.4844, Math.min(1.4844, latRad)); // Clamp to ~85 deg
  const y = ((1 - Math.log(Math.tan(clampedLatRad) + 1 / Math.cos(clampedLatRad)) / Math.PI) / 2) * n;
  return { x, y };
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  userLocation,
  tankers,
  selectedTankerId,
  onSelectTanker,
  onRecenterGps,
  isLocating = false,
  isLoading = false,
  hasLocationPermission = true,
  onRequestPermission,
  style,
}) => {
  // Zoom level: 12 (city overview) to 15 (detailed neighborhood streets)
  const [zoom, setZoom] = useState<number>(13);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarSweepAnim = useRef(new Animated.Value(0)).current;

  // Responsive dimensions for map canvas
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>(() => {
    const w = Dimensions.get('window').width;
    return {
      width: w > 520 ? 430 : w,
      height: 380,
    };
  });

  // Radar pulse animation for customer GPS pin
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 2.0,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Radar sweep for map loading state
  useEffect(() => {
    if (!isLoading) return undefined;

    const sweep = Animated.loop(
      Animated.timing(radarSweepAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    sweep.start();
    return () => sweep.stop();
  }, [isLoading, radarSweepAnim]);

  // Calculate Real-World Map Tiles to cover the viewport dynamically
  const mapTiles = useMemo(() => {
    const center = projectToTileCoords(userLocation.latitude, userLocation.longitude, zoom);
    const centerTileX = Math.floor(center.x);
    const centerTileY = Math.floor(center.y);

    const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];
    const halfTilesX = Math.max(1, Math.ceil(dimensions.width / (2 * TILE_SIZE)) + 1);
    const halfTilesY = Math.max(1, Math.ceil(dimensions.height / (2 * TILE_SIZE)) + 1);

    // Grid around center tile
    for (let dx = -halfTilesX; dx <= halfTilesX; dx++) {
      for (let dy = -halfTilesY; dy <= halfTilesY; dy++) {
        const tileX = centerTileX + dx;
        const tileY = centerTileY + dy;
        const left = (tileX - center.x) * TILE_SIZE + dimensions.width / 2;
        const top = (tileY - center.y) * TILE_SIZE + dimensions.height / 2;

        tiles.push({
          key: `${zoom}-${tileX}-${tileY}`,
          url: `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`,
          left,
          top,
        });
      }
    }
    return tiles;
  }, [userLocation.latitude, userLocation.longitude, zoom, dimensions]);

  // Calculate real GPS positions for tankers with proximity collision avoidance
  const placedTankers = useMemo(() => {
    const topTankers = tankers.slice(0, 8);
    const center = projectToTileCoords(userLocation.latitude, userLocation.longitude, zoom);

    const placed: Array<{ tanker: NearbyTanker; left: number; top: number }> = [];
    const reservedCenter = { x: dimensions.width / 2, y: dimensions.height / 2 };
    const minDistance = 64;

    topTankers.forEach((tanker, index) => {
      const projected = projectToTileCoords(tanker.latitude, tanker.longitude, zoom);
      let rawX = (projected.x - center.x) * TILE_SIZE + dimensions.width / 2;
      let rawY = (projected.y - center.y) * TILE_SIZE + dimensions.height / 2;

      // Proximity check against center pin and previously placed tankers
      let attempts = 0;
      let collision = true;
      let angle = (index * 45 * Math.PI) / 180;
      let offsetRadius = 0;

      while (collision && attempts < 8) {
        const testX = rawX + (offsetRadius > 0 ? Math.cos(angle) * offsetRadius : 0);
        const testY = rawY + (offsetRadius > 0 ? Math.sin(angle) * offsetRadius : 0);

        const distCenter = Math.hypot(testX - reservedCenter.x, testY - reservedCenter.y);
        let distOthers = true;

        for (const p of placed) {
          const d = Math.hypot(testX - (p.left + 45), testY - (p.top + 16));
          if (d < minDistance) {
            distOthers = false;
            break;
          }
        }

        if (distCenter >= 44 && distOthers) {
          rawX = testX;
          rawY = testY;
          collision = false;
        } else {
          offsetRadius += 28;
          angle += Math.PI / 4;
          attempts++;
        }
      }

      // Constrain inside visible map canvas with margins
      const left = Math.max(16, Math.min(dimensions.width - 110, rawX - 45));
      const top = Math.max(30, Math.min(dimensions.height - 60, rawY - 16));

      placed.push({ tanker, left, top });
    });

    return placed;
  }, [tankers, userLocation.latitude, userLocation.longitude, zoom, dimensions]);

  const getCapacityLabel = (capacity: number) => {
    return `${(capacity / 1000).toFixed(0)}kL`;
  };

  return (
    <View
      style={[styles.mapContainer, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (
          width > 50 &&
          height > 50 &&
          (Math.abs(width - dimensions.width) > 4 || Math.abs(height - dimensions.height) > 4)
        ) {
          setDimensions({ width, height });
        }
      }}
    >
      {/* Real-World Map Tiles Layer */}
      <View style={styles.tilesContainer}>
        {mapTiles.map((tile) => (
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

      {/* Loading Radar Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Scanning for nearby water tankers...</Text>
        </View>
      )}

      {/* Location Permission Missing Banner */}
      {!hasLocationPermission && (
        <View style={styles.permissionBanner}>
          <Ionicons name="location-outline" size={16} color={colors.warning} />
          <Text style={styles.permissionText}>
            GPS location disabled. Using default Mumbai service center.
          </Text>
          {onRequestPermission && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enable GPS location"
              onPress={onRequestPermission}
              style={styles.enableGpsBtn}
            >
              <Text style={styles.enableGpsBtnText}>Enable</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Customer Location Pin ("Your Sump") Centered on Map */}
      <View
        style={[
          styles.customerPinContainer,
          {
            left: dimensions.width / 2 - 14,
            top: dimensions.height / 2 - 14,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.radarRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 2.0],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />
        <View style={styles.customerPinCore}>
          <View style={styles.customerPinCenterDot} />
        </View>
        <View style={styles.youBadge}>
          <Ionicons name="home" size={9} color={colors.white} style={{ marginRight: 2 }} />
          <Text style={styles.youBadgeText}>Your Sump</Text>
        </View>
      </View>

      {/* Real-Time Live Tanker Markers */}
      {placedTankers.map(({ tanker, left, top }) => {
        const isSelected = selectedTankerId === tanker.tanker_id;
        const capText = getCapacityLabel(tanker.capacity_liters);

        return (
          <Pressable
            key={tanker.tanker_id}
            accessibilityRole="button"
            accessibilityLabel={`${tanker.supplier_name}, ${capText}, ₹${tanker.estimated_total_price}, ETA ${tanker.eta_minutes} mins`}
            onPress={() => {
              haptics.selection();
              onSelectTanker(tanker.tanker_id);
            }}
            style={[
              styles.markerPill,
              isSelected ? styles.markerPillSelected : styles.markerPillDefault,
              { left, top },
            ]}
          >
            {/* Pulsing ring for selected tanker */}
            {isSelected && <View style={styles.selectedMarkerAura} />}

            <View
              style={[
                styles.markerIconCircle,
                isSelected ? styles.markerIconCircleSelected : styles.markerIconCircleDefault,
              ]}
            >
              <Ionicons
                name="water"
                size={13}
                color={isSelected ? colors.white : colors.primary}
              />
            </View>

            <View style={styles.markerContent}>
              <View style={styles.markerTopRow}>
                <Text
                  style={[
                    styles.markerCapacityText,
                    isSelected ? styles.textWhite : styles.textNavy,
                  ]}
                >
                  {capText}
                </Text>
                <Text
                  style={[
                    styles.markerEtaText,
                    isSelected ? styles.textWhite : styles.textPrimary,
                  ]}
                >
                  {tanker.eta_minutes}m
                </Text>
              </View>

              <Text
                style={[
                  styles.markerPriceText,
                  isSelected ? styles.textWhiteMuted : styles.textSecondary,
                ]}
              >
                ₹{tanker.estimated_total_price}
              </Text>
            </View>
          </Pressable>
        );
      })}

      {/* Map Attribution */}
      <View style={styles.attributionPill}>
        <Text style={styles.attributionText}>© OpenStreetMap</Text>
      </View>

      {/* Zoom Controls (Top Right) */}
      <View style={styles.zoomControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom in map"
          onPress={() => {
            haptics.lightImpact();
            setZoom((z) => Math.min(15, z + 1));
          }}
          style={styles.zoomButton}
        >
          <Ionicons name="add" size={18} color={colors.darkNavy} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom out map"
          onPress={() => {
            haptics.lightImpact();
            setZoom((z) => Math.max(12, z - 1));
          }}
          style={styles.zoomButton}
        >
          <Ionicons name="remove" size={18} color={colors.darkNavy} />
        </Pressable>
      </View>

      {/* Floating GPS Recenter Button (Bottom Right) */}
      <View style={styles.recenterWrapper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Center map to my sump GPS location"
          onPress={() => {
            haptics.lightImpact();
            onRecenterGps();
          }}
          disabled={isLocating}
          style={({ pressed }) => [styles.gpsButton, pressed && { opacity: 0.8 }]}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="locate" size={20} color={colors.primary} />
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    flex: 1,
    minHeight: 250,
    backgroundColor: '#EBF2F7',
    position: 'relative',
    overflow: 'hidden',
  },
  tilesContainer: {
    ...StyleSheet.absoluteFill,
  },
  tileImage: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  loadingOverlay: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    zIndex: 30,
    ...shadows.card,
  },
  loadingText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  permissionBanner: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 40,
    gap: spacing.xs,
    ...shadows.subtle,
  },
  permissionText: {
    flex: 1,
    fontSize: fontSizes.xs - 1,
    color: colors.darkNavy,
  },
  enableGpsBtn: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  enableGpsBtnText: {
    fontSize: fontSizes.xs - 2,
    fontWeight: fontWeights.bold,
    color: colors.white,
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
    ...shadows.card,
  },
  customerPinCenterDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
  },
  youBadge: {
    position: 'absolute',
    top: -20,
    backgroundColor: colors.darkNavy,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.subtle,
  },
  youBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },
  markerPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.xl,
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
    borderWidth: 1.5,
    borderColor: colors.white,
    zIndex: 35,
    transform: [{ scale: 1.06 }],
    ...shadows.floating,
  },
  selectedMarkerAura: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: borderRadius.xl + 4,
    backgroundColor: 'rgba(11, 100, 192, 0.25)',
  },
  markerIconCircle: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  markerIconCircleDefault: {
    backgroundColor: colors.primaryLight,
  },
  markerIconCircleSelected: {
    backgroundColor: colors.primaryHover,
  },
  markerContent: {
    justifyContent: 'center',
  },
  markerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markerCapacityText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  markerEtaText: {
    fontSize: fontSizes.xs - 1,
    fontWeight: fontWeights.semibold,
  },
  markerPriceText: {
    fontSize: fontSizes.xs - 2,
    fontWeight: fontWeights.medium,
  },
  textNavy: {
    color: colors.darkNavy,
  },
  textPrimary: {
    color: colors.primary,
  },
  textSecondary: {
    color: colors.textSecondary,
  },
  textWhite: {
    color: colors.white,
  },
  textWhiteMuted: {
    color: '#E0F2FE',
  },
  attributionPill: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  attributionText: {
    fontSize: 8,
    color: colors.textSecondary,
  },
  zoomControls: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    zIndex: 25,
    ...shadows.card,
  },
  zoomButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  recenterWrapper: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    zIndex: 25,
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
