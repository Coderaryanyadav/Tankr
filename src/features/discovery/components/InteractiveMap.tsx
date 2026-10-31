import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NearbyTanker } from '../../../types/discovery';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 280;
const TILE_SIZE = 256;

const CARTO_KEY = process.env.EXPO_PUBLIC_CARTO_API_KEY || 'cb1_4yut_1_53099494f5cc36d9ace8e1e4';

interface InteractiveMapProps {
  userLocation: { latitude: number; longitude: number };
  tankers: NearbyTanker[];
  selectedTankerId: string | null;
  onSelectTanker: (tankerId: string) => void;
  onRecenterGps: () => void;
  isLocating?: boolean;
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
}) => {
  // Zoom level: 12 (city overview) to 15 (detailed neighborhood streets)
  const [zoom, setZoom] = useState<number>(13);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Radar pulse animation for customer GPS pin
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.8,
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

  // Calculate Real-World Map Tiles to cover the viewport
  const mapTiles = useMemo(() => {
    const center = projectToTileCoords(userLocation.latitude, userLocation.longitude, zoom);
    const centerTileX = Math.floor(center.x);
    const centerTileY = Math.floor(center.y);

    const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];

    // 3x3 grid around center tile
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tileX = centerTileX + dx;
        const tileY = centerTileY + dy;
        const left = (tileX - center.x) * TILE_SIZE + SCREEN_WIDTH / 2;
        const top = (tileY - center.y) * TILE_SIZE + MAP_HEIGHT / 2;

        const sub = ['a', 'b', 'c', 'd'][Math.abs((tileX + tileY) % 4)];
        const keyParam = CARTO_KEY ? `?key=${CARTO_KEY}` : '';
        tiles.push({
          key: `${zoom}-${tileX}-${tileY}`,
          url: `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tileX}/${tileY}.png${keyParam}`,
          left,
          top,
        });
      }
    }
    return tiles;
  }, [userLocation.latitude, userLocation.longitude, zoom]);

  // Calculate real GPS positions for tankers with proximity collision resolution
  const placedTankers = useMemo(() => {
    const topTankers = tankers.slice(0, 6);
    const center = projectToTileCoords(userLocation.latitude, userLocation.longitude, zoom);

    const placed: Array<{ tanker: NearbyTanker; left: number; top: number }> = [];
    const reservedCenter = { x: SCREEN_WIDTH / 2, y: MAP_HEIGHT / 2 };
    const minDistance = 58;

    topTankers.forEach((tanker, index) => {
      const projected = projectToTileCoords(tanker.latitude, tanker.longitude, zoom);
      let rawX = (projected.x - center.x) * TILE_SIZE + SCREEN_WIDTH / 2;
      let rawY = (projected.y - center.y) * TILE_SIZE + MAP_HEIGHT / 2;

      // Proximity check against center pin and previously placed tankers
      let attempts = 0;
      let collision = true;
      let angle = (index * 60 * Math.PI) / 180;
      let offsetRadius = 0;

      while (collision && attempts < 8) {
        const testX = rawX + (offsetRadius > 0 ? Math.cos(angle) * offsetRadius : 0);
        const testY = rawY + (offsetRadius > 0 ? Math.sin(angle) * offsetRadius : 0);

        const distCenter = Math.hypot(testX - reservedCenter.x, testY - reservedCenter.y);
        let distOthers = true;

        for (const p of placed) {
          const d = Math.hypot(testX - (p.left + 40), testY - (p.top + 14));
          if (d < minDistance) {
            distOthers = false;
            break;
          }
        }

        if (distCenter >= 40 && distOthers) {
          rawX = testX;
          rawY = testY;
          collision = false;
        } else {
          offsetRadius += 26;
          angle += Math.PI / 3;
          attempts++;
        }
      }

      // Constrain inside visible map canvas
      const left = Math.max(12, Math.min(SCREEN_WIDTH - 96, rawX - 40));
      const top = Math.max(20, Math.min(MAP_HEIGHT - 48, rawY - 14));

      placed.push({ tanker, left, top });
    });

    return placed;
  }, [tankers, userLocation.latitude, userLocation.longitude, zoom]);

  const getCapacityLabel = (capacity: number) => {
    return `${(capacity / 1000).toFixed(0)}kL`;
  };

  return (
    <View style={styles.mapContainer}>
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

      {/* Customer Location Pin ("You") Centered on Map */}
      <View
        style={[
          styles.customerPinContainer,
          {
            left: SCREEN_WIDTH / 2 - 14,
            top: MAP_HEIGHT / 2 - 14,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.radarRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.8],
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

      {/* Real-Time Live Tanker Pins */}
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

      {/* Map Attribution */}
      <View style={styles.attributionPill}>
        <Text style={styles.attributionText}>© OpenStreetMap © CARTO</Text>
      </View>

      {/* Zoom Controls (Top Right) */}
      <View style={styles.zoomControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
          onPress={() => setZoom((z) => Math.min(15, z + 1))}
          style={styles.zoomButton}
        >
          <Ionicons name="add" size={18} color={colors.darkNavy} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          onPress={() => setZoom((z) => Math.max(12, z - 1))}
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
    backgroundColor: '#EBF2F7', // Neutral street map tone while tiles load
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
  attributionPill: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 5,
  },
  attributionText: {
    fontSize: 8,
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
