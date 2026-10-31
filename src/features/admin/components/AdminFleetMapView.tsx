import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FleetTankerItem, useAdminStore } from '../../../stores/adminStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

const TILE_SIZE = 256;
const CARTO_KEY = process.env.EXPO_PUBLIC_CARTO_API_KEY || 'cb1_4yut_1_53099494f5cc36d9ace8e1e4';

// Mercator Projection for Slippy Map Tiles
function projectToTileCoords(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const clampedLatRad = Math.max(-1.4844, Math.min(1.4844, latRad));
  const y = ((1 - Math.log(Math.tan(clampedLatRad) + 1 / Math.cos(clampedLatRad)) / Math.PI) / 2) * n;
  return { x, y };
}

export const AdminFleetMapView: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = true }) => {
  const { fleetTankers, deficitZones, fetchDeficitZones, fetchFleetTankers } = useAdminStore();
  const [zoom, setZoom] = useState<number>(13);
  const [centerLat, setCenterLat] = useState<number>(19.1171);
  const [centerLng, setCenterLng] = useState<number>(72.8809);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [selectedCapacity, setSelectedCapacity] = useState<number | null>(null);
  const [selectedTanker, setSelectedTanker] = useState<FleetTankerItem | null>(null);

  useEffect(() => {
    fetchDeficitZones();
    fetchFleetTankers();
  }, [fetchDeficitZones, fetchFleetTankers]);

  // Center map dynamically on first zone when data loads
  useEffect(() => {
    if (deficitZones.length > 0 && centerLat === 19.1171 && centerLng === 72.8809) {
      setCenterLat(deficitZones[0].center_lat);
      setCenterLng(deficitZones[0].center_lng);
    }
  }, [deficitZones]);

  const mapWidth = isDesktop ? 780 : Dimensions.get('window').width - 32;
  const mapHeight = 520;

  // Filter tankers by capacity if selected
  const filteredTankers = useMemo(() => {
    return fleetTankers.filter((t) => {
      if (!t.is_online) return false;
      if (selectedCapacity && t.capacity_liters !== selectedCapacity) return false;
      return true;
    });
  }, [fleetTankers, selectedCapacity]);

  // Generate Slippy Map Tiles (CartoDB Positron)
  const mapTiles = useMemo(() => {
    const center = projectToTileCoords(centerLat, centerLng, zoom);
    const centerTileX = Math.floor(center.x);
    const centerTileY = Math.floor(center.y);

    const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];
    const radiusX = Math.ceil(mapWidth / (2 * TILE_SIZE)) + 1;
    const radiusY = Math.ceil(mapHeight / (2 * TILE_SIZE)) + 1;

    for (let dx = -radiusX; dx <= radiusX; dx++) {
      for (let dy = -radiusY; dy <= radiusY; dy++) {
        const tileX = centerTileX + dx;
        const tileY = centerTileY + dy;
        const left = (tileX - center.x) * TILE_SIZE + mapWidth / 2;
        const top = (tileY - center.y) * TILE_SIZE + mapHeight / 2;

        tiles.push({
          key: `${zoom}-${tileX}-${tileY}`,
          url: `https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tileX}/${tileY}.png?key=${CARTO_KEY}`,
          left,
          top,
        });
      }
    }
    return tiles;
  }, [centerLat, centerLng, zoom, mapWidth, mapHeight]);

  // Project Tankers to Pixel Coordinates
  const projectedTankers = useMemo(() => {
    const center = projectToTileCoords(centerLat, centerLng, zoom);
    const scale = Math.pow(2, zoom) * TILE_SIZE;

    return filteredTankers.map((t) => {
      const proj = projectToTileCoords(t.latitude, t.longitude, zoom);
      const pixelX = (proj.x - center.x) * TILE_SIZE + mapWidth / 2;
      const pixelY = (proj.y - center.y) * TILE_SIZE + mapHeight / 2;
      return {
        ...t,
        pixelX,
        pixelY,
        inView: pixelX >= -20 && pixelX <= mapWidth + 20 && pixelY >= -20 && pixelY <= mapHeight + 20,
      };
    });
  }, [filteredTankers, centerLat, centerLng, zoom, mapWidth, mapHeight]);

  // Project Live Database Heatmap Zones
  const projectedDeficits = useMemo(() => {
    const center = projectToTileCoords(centerLat, centerLng, zoom);
    return deficitZones.map((zone) => {
      const proj = projectToTileCoords(zone.center_lat, zone.center_lng, zoom);
      const pixelX = (proj.x - center.x) * TILE_SIZE + mapWidth / 2;
      const pixelY = (proj.y - center.y) * TILE_SIZE + mapHeight / 2;
      return {
        id: zone.id,
        name: zone.zone_name,
        deficitLevel: zone.deficit_level,
        color: zone.color,
        radius: zone.radius_pixels,
        onlineFleet: zone.online_fleet_count,
        activeDeliveries: zone.active_deliveries,
        pixelX,
        pixelY,
      };
    });
  }, [deficitZones, centerLat, centerLng, zoom, mapWidth, mapHeight]);

  return (
    <View style={styles.container}>
      {/* Top Controls Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <Text style={styles.toolbarTitle}>Mumbai Fleet Command & Deficit Heatmap (Marol HQ)</Text>
          <Text style={styles.toolbarSub}>
            Streaming telemetry for {filteredTankers.length} online tankers across Marol & Andheri
          </Text>
        </View>

        <View style={styles.toolbarRight}>
          {/* Heatmap Toggle */}
          <View style={styles.heatmapToggleWrap}>
            <Text style={styles.toggleLabel}>Deficit Heatmap</Text>
            <Switch
              value={showHeatmap}
              onValueChange={setShowHeatmap}
              trackColor={{ false: '#CBD5E1', true: '#DC2626' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Capacity Filters */}
          <View style={styles.filterGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show all capacities"
              onPress={() => setSelectedCapacity(null)}
              style={[styles.filterChip, selectedCapacity === null && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, selectedCapacity === null && styles.filterChipTextActive]}>
                All ({fleetTankers.filter((t) => t.is_online).length})
              </Text>
            </Pressable>
            {[2000, 5000, 10000, 20000].map((cap) => (
              <Pressable
                key={cap}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${cap}L`}
                onPress={() => setSelectedCapacity(cap === selectedCapacity ? null : cap)}
                style={[styles.filterChip, selectedCapacity === cap && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, selectedCapacity === cap && styles.filterChipTextActive]}>
                  {cap >= 1000 ? `${cap / 1000}kL` : `${cap}L`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Main Map View + Telemetry Drawer Split */}
      <View style={[styles.mapContainerRow, !isDesktop && { flexDirection: 'column' }]}>
        {/* Interactive Map Box */}
        <View style={[styles.mapBox, { width: isDesktop ? mapWidth : '100%', height: mapHeight }]}>
          {/* Map Tile Layers */}
          {mapTiles.map((tile) => (
            <Image
              key={tile.key}
              source={{ uri: tile.url }}
              style={[
                styles.mapTile,
                {
                  left: tile.left,
                  top: tile.top,
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                },
              ]}
              resizeMode="cover"
            />
          ))}

          {/* Deficit Heatmap Circles */}
          {showHeatmap &&
            projectedDeficits.map((d, index) => (
              <View
                key={`deficit-${index}`}
                style={[
                  styles.deficitCircle,
                  {
                    left: d.pixelX - d.radius,
                    top: d.pixelY - d.radius,
                    width: d.radius * 2,
                    height: d.radius * 2,
                    borderRadius: d.radius,
                    backgroundColor: `${d.color}28`,
                    borderColor: d.color,
                  },
                ]}
              >
                <View style={[styles.deficitLabelTag, { borderColor: d.color }]}>
                  <Text style={[styles.deficitLabelText, { color: d.color }]}>
                    {d.name.split(' ')[0]} • {d.deficitLevel}
                  </Text>
                </View>
              </View>
            ))}

          {/* Active Tanker Markers */}
          {projectedTankers.map((tanker) => {
            const isSelected = selectedTanker?.id === tanker.id;
            return (
              <Pressable
                key={tanker.id}
                accessibilityRole="button"
                accessibilityLabel={`Tanker ${tanker.vehicle_number}`}
                onPress={() => setSelectedTanker(tanker)}
                style={[
                  styles.tankerPinWrap,
                  {
                    left: tanker.pixelX - 22,
                    top: tanker.pixelY - 22,
                    zIndex: isSelected ? 99 : 10,
                  },
                ]}
              >
                <View
                  style={[
                    styles.tankerPin,
                    tanker.is_available ? styles.pinAvailable : styles.pinBusy,
                    isSelected && styles.pinSelected,
                  ]}
                >
                  <Ionicons name="water" size={14} color="#FFFFFF" />
                  <Text style={styles.pinCapText}>
                    {tanker.capacity_liters >= 1000 ? `${tanker.capacity_liters / 1000}k` : `${tanker.capacity_liters}`}
                  </Text>
                </View>
                <View style={styles.pinPlateBubble}>
                  <Text style={styles.pinPlateText}>{tanker.vehicle_number.replace('KA-', '')}</Text>
                </View>
              </Pressable>
            );
          })}

          {/* Map Navigation Controls (+ / - / Reset) */}
          <View style={styles.mapControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in map"
              onPress={() => setZoom((z) => Math.min(15, z + 1))}
              style={styles.mapCtrlBtn}
            >
              <Ionicons name="add" size={18} color="#0F172A" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom out map"
              onPress={() => setZoom((z) => Math.max(10, z - 1))}
              style={styles.mapCtrlBtn}
            >
              <Ionicons name="remove" size={18} color="#0F172A" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Recenter Fleet Map"
              onPress={() => {
                const targetLat = deficitZones[0]?.center_lat ?? filteredTankers[0]?.latitude ?? 19.1171;
                const targetLng = deficitZones[0]?.center_lng ?? filteredTankers[0]?.longitude ?? 72.8809;
                setCenterLat(targetLat);
                setCenterLng(targetLng);
                setZoom(13);
              }}
              style={styles.mapCtrlBtn}
            >
              <Ionicons name="locate" size={16} color="#0284C7" />
            </Pressable>
          </View>

          {/* Map Legend */}
          <View style={styles.legendBox}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
              <Text style={styles.legendText}>Available (Ready)</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.legendText}>Dispatched / En Route</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendText}>Dry Borewell Deficit Zone</Text>
            </View>
          </View>
        </View>

        {/* Telemetry Drawer */}
        <View style={[styles.drawerBox, !isDesktop && { width: '100%', marginTop: 16 }]}>
          {selectedTanker ? (
            <View style={styles.drawerContent}>
              <View style={styles.drawerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerPlate}>{selectedTanker.vehicle_number}</Text>
                  <Text style={styles.drawerSub}>
                    {selectedTanker.driver_name} • {selectedTanker.driver_phone}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close Telemetry"
                  onPress={() => setSelectedTanker(null)}
                >
                  <Ionicons name="close-circle-outline" size={24} color="#64748B" />
                </Pressable>
              </View>

              {/* Status Badge */}
              <View
                style={[
                  styles.telemetryStatusBadge,
                  selectedTanker.is_available
                    ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }
                    : { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
                ]}
              >
                <View
                  style={[
                    styles.statusPillDot,
                    { backgroundColor: selectedTanker.is_available ? '#16A34A' : '#D97706' },
                  ]}
                />
                <Text
                  style={[
                    styles.telemetryStatusText,
                    { color: selectedTanker.is_available ? '#16A34A' : '#D97706' },
                  ]}
                >
                  {selectedTanker.is_available ? 'ONLINE & READY FOR DISPATCH' : 'ENGAGED IN ACTIVE DELIVERY'}
                </Text>
              </View>

              {/* Specs Grid */}
              <View style={styles.specsGrid}>
                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>CAPACITY</Text>
                  <Text style={styles.specVal}>{selectedTanker.capacity_liters.toLocaleString('en-IN')} L</Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>WATER GRADE</Text>
                  <Text style={styles.specVal}>{selectedTanker.water_type}</Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>GPS COORDINATES</Text>
                  <Text style={styles.specVal}>
                    {selectedTanker.latitude.toFixed(4)}, {selectedTanker.longitude.toFixed(4)}
                  </Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>BASE FARE</Text>
                  <Text style={styles.specVal}>₹{selectedTanker.base_price || 750}</Text>
                </View>
              </View>

              {/* Flow Meter Telemetry */}
              <View style={styles.telemetryMetricCard}>
                <View style={styles.telemetryHeaderRow}>
                  <Ionicons name="speedometer-outline" size={16} color="#0284C7" />
                  <Text style={styles.telemetryTitle}>Flow Meter & IoT Sensor Logs</Text>
                </View>
                <Text style={styles.telemetryDesc}>
                  Calibrated digital valve streaming flow volume via Bluetooth BLE.
                </Text>
                <View style={styles.telemetryReadout}>
                  <Text style={styles.readoutItem}>Valve Status: SEALED</Text>
                  <Text style={styles.readoutItem}>Calibration: ISO 4064 Class B</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.drawerEmpty}>
              <Ionicons name="navigate-circle-outline" size={48} color="#94A3B8" />
              <Text style={styles.drawerEmptyTitle}>Select a Tanker on the Map</Text>
              <Text style={styles.drawerEmptySub}>
                Click any tanker pin across Mumbai (Marol, Andheri, Powai) to inspect driver telemetry, capacity, and live GPS coordinates.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  toolbar: {
    padding: spacing.md,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolbarLeft: {
    flex: 1,
    minWidth: 260,
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  toolbarSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heatmapToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#334155',
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  mapContainerRow: {
    flexDirection: 'row',
    position: 'relative',
  },
  mapBox: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  mapTile: {
    position: 'absolute',
  },
  deficitCircle: {
    position: 'absolute',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deficitLabelTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  deficitLabelText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },
  tankerPinWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  tankerPin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    ...shadows.card,
  },
  pinAvailable: {
    backgroundColor: '#16A34A',
  },
  pinBusy: {
    backgroundColor: '#D97706',
  },
  pinSelected: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
    transform: [{ scale: 1.15 }],
  },
  pinCapText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: fontWeights.bold,
  },
  pinPlateBubble: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
    marginTop: 2,
  },
  pinPlateText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: fontWeights.bold,
  },
  mapControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...shadows.card,
  },
  mapCtrlBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  legendBox: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
    ...shadows.card,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: fontWeights.medium,
  },
  drawerBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    padding: spacing.md,
  },
  drawerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 400,
    paddingHorizontal: spacing.lg,
  },
  drawerEmptyTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#334155',
    marginTop: spacing.md,
  },
  drawerEmptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  drawerContent: {
    gap: spacing.md,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  drawerPlate: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  drawerSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  telemetryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  telemetryStatusText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specBox: {
    flex: 1,
    minWidth: 130,
    padding: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: fontWeights.bold,
  },
  specVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: fontWeights.bold,
    marginTop: 2,
  },
  telemetryMetricCard: {
    padding: spacing.md,
    backgroundColor: '#F0F9FF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  telemetryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  telemetryTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#0369A1',
  },
  telemetryDesc: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 4,
    lineHeight: 16,
  },
  telemetryReadout: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
    paddingTop: 6,
    gap: 4,
  },
  readoutItem: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#0369A1',
  },
});
