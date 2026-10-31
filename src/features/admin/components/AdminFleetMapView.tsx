import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  LayoutChangeEvent,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FleetTankerItem, useAdminStore } from '../../../stores/adminStore';
import { borderRadius, fontWeights, shadows, spacing } from '../../../theme';

const TILE_SIZE = 256;

// Primary Operations Center (Marol HQ, Andheri East, Mumbai)
const MAROL_HQ_LAT = 19.1171;
const MAROL_HQ_LNG = 72.8809;

// Calculate Uber/Ola Surge Multiplier from Deficit Percentage
function getSurgeInfo(deficitPct: number) {
  if (deficitPct >= 80) {
    return { multiplier: '⚡ 2.2x', label: 'CRISIS SURGE', color: '#DC2626', bg: '#FEE2E2', radiusPixels: 130 };
  }
  if (deficitPct >= 70) {
    return { multiplier: '⚡ 1.8x', label: 'HIGH SURGE', color: '#EA580C', bg: '#FFEDD5', radiusPixels: 110 };
  }
  if (deficitPct >= 55) {
    return { multiplier: '⚡ 1.5x', label: 'ELEVATED', color: '#D97706', bg: '#FEF3C7', radiusPixels: 95 };
  }
  if (deficitPct >= 40) {
    return { multiplier: '⚡ 1.2x', label: 'MODERATE', color: '#EAB308', bg: '#FEF9C3', radiusPixels: 80 };
  }
  return { multiplier: '1.0x', label: 'OPTIMAL', color: '#10B981', bg: '#DCFCE7', radiusPixels: 65 };
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

// Inverse conversion from Slippy Map Tile Coordinates to WGS84 Lat/Lng
function unprojectTileCoords(x: number, y: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
}

export const AdminFleetMapView: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = true }) => {
  const {
    fleetTankers,
    deficitZones,
    fetchDeficitZones,
    fetchFleetTankers,
    subscribeToLiveFleetAndHeatmap,
  } = useAdminStore();

  const [zoom, setZoom] = useState<number>(14);
  const [centerLat, setCenterLat] = useState<number>(MAROL_HQ_LAT);
  const [centerLng, setCenterLng] = useState<number>(MAROL_HQ_LNG);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [selectedCapacity, setSelectedCapacity] = useState<number | null>(null);
  const [selectedTanker, setSelectedTanker] = useState<FleetTankerItem | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 1000,
    height: isDesktop ? 640 : 480,
  });

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initial data fetch & realtime subscription
  useEffect(() => {
    fetchDeficitZones();
    fetchFleetTankers();
    const unsubscribe = subscribeToLiveFleetAndHeatmap();
    return () => {
      unsubscribe();
    };
  }, [fetchDeficitZones, fetchFleetTankers, subscribeToLiveFleetAndHeatmap]);

  // Center on live zone epicenter when zones arrive initially
  useEffect(() => {
    if (deficitZones.length > 0 && centerLat === MAROL_HQ_LAT && centerLng === MAROL_HQ_LNG) {
      setCenterLat(deficitZones[0].center_lat);
      setCenterLng(deficitZones[0].center_lng);
    }
  }, [deficitZones]);

  // Filter online fleet by capacity
  const filteredTankers = useMemo(() => {
    return fleetTankers.filter((t) => {
      if (!t.is_online) return false;
      if (selectedCapacity && t.capacity_liters !== selectedCapacity) return false;
      return true;
    });
  }, [fleetTankers, selectedCapacity]);

  // Handle dynamic container resizing
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerSize({ width, height });
    }
  };

  // Center coordinate projection
  const centerProj = useMemo(() => {
    return projectToTileCoords(centerLat, centerLng, zoom);
  }, [centerLat, centerLng, zoom]);

  // Calculate visible slippy map tiles
  const visibleTiles = useMemo(() => {
    const { width, height } = containerSize;
    const effectiveCenterX = centerProj.x - panOffset.x / TILE_SIZE;
    const effectiveCenterY = centerProj.y - panOffset.y / TILE_SIZE;

    const minTileX = Math.floor(effectiveCenterX - width / (2 * TILE_SIZE)) - 1;
    const maxTileX = Math.ceil(effectiveCenterX + width / (2 * TILE_SIZE)) + 1;
    const minTileY = Math.floor(effectiveCenterY - height / (2 * TILE_SIZE)) - 1;
    const maxTileY = Math.ceil(effectiveCenterY + height / (2 * TILE_SIZE)) + 1;

    const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];
    const subdomains = ['a', 'b', 'c', 'd'];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const left = (tx - centerProj.x) * TILE_SIZE + width / 2 + panOffset.x;
        const top = (ty - centerProj.y) * TILE_SIZE + height / 2 + panOffset.y;
        const sub = subdomains[Math.abs((tx + ty) % 4)];
        tiles.push({
          key: `${zoom}-${tx}-${ty}`,
          url: `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${ty}.png`,
          left,
          top,
        });
      }
    }
    return tiles;
  }, [centerProj, containerSize, panOffset, zoom]);

  // Calculate pixel coordinates for Deficit Heatmap Zones
  const placedZones = useMemo(() => {
    const { width, height } = containerSize;
    return deficitZones.map((zone) => {
      const zProj = projectToTileCoords(zone.center_lat, zone.center_lng, zoom);
      const x = (zProj.x - centerProj.x) * TILE_SIZE + width / 2 + panOffset.x;
      const y = (zProj.y - centerProj.y) * TILE_SIZE + height / 2 + panOffset.y;
      const pct = zone.deficit_percentage !== undefined
        ? zone.deficit_percentage
        : (parseInt(String(zone.deficit_level || '').replace(/[^0-9]/g, ''), 10) || 50);
      const surge = getSurgeInfo(pct);
      const shortName = (zone.zone_name || '').split('/')[0].trim();
      return {
        ...zone,
        x,
        y,
        pct,
        surge,
        shortName,
      };
    });
  }, [deficitZones, centerProj, containerSize, panOffset, zoom]);

  // Calculate pixel coordinates for Tanker Fleet Markers
  const placedTankers = useMemo(() => {
    const { width, height } = containerSize;
    return filteredTankers.map((tanker) => {
      const tProj = projectToTileCoords(tanker.latitude, tanker.longitude, zoom);
      const x = (tProj.x - centerProj.x) * TILE_SIZE + width / 2 + panOffset.x;
      const y = (tProj.y - centerProj.y) * TILE_SIZE + height / 2 + panOffset.y;
      const capText = tanker.capacity_liters >= 1000 ? `${tanker.capacity_liters / 1000}k` : `${tanker.capacity_liters}L`;
      return {
        ...tanker,
        x,
        y,
        capText,
      };
    });
  }, [filteredTankers, centerProj, containerSize, panOffset, zoom]);

  // Navigation: Jump to specific hotspot zone
  const handleFlyTo = (lat: number, lng: number, zoomLevel = 15) => {
    setCenterLat(lat);
    setCenterLng(lng);
    setZoom(zoomLevel);
    setPanOffset({ x: 0, y: 0 });
  };

  // Recenter to Marol HQ
  const handleRecenter = () => {
    handleFlyTo(MAROL_HQ_LAT, MAROL_HQ_LNG, 14);
  };

  // Mouse pan handlers for Web
  const handleWebMouseDown = (e: any) => {
    if (Platform.OS !== 'web') return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panOffsetRef.current = panOffset;
  };

  const handleWebMouseMove = (e: any) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: panOffsetRef.current.x + dx,
      y: panOffsetRef.current.y + dy,
    });
  };

  const handleWebMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (panOffset.x !== 0 || panOffset.y !== 0) {
      const effectiveCenterX = centerProj.x - panOffset.x / TILE_SIZE;
      const effectiveCenterY = centerProj.y - panOffset.y / TILE_SIZE;
      const newCenter = unprojectTileCoords(effectiveCenterX, effectiveCenterY, zoom);
      setCenterLat(newCenter.lat);
      setCenterLng(newCenter.lng);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // Scroll wheel zoom for Web
  const handleWebWheel = (e: any) => {
    if (Platform.OS !== 'web') return;
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(18, z + 1));
    } else if (e.deltaY > 0) {
      setZoom((z) => Math.max(11, z - 1));
    }
  };

  // Native Mobile PanResponder for touch panning
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        setPanOffset({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        const effectiveCenterX = centerProj.x - gestureState.dx / TILE_SIZE;
        const effectiveCenterY = centerProj.y - gestureState.dy / TILE_SIZE;
        const newCenter = unprojectTileCoords(effectiveCenterX, effectiveCenterY, zoom);
        setCenterLat(newCenter.lat);
        setCenterLng(newCenter.lng);
        setPanOffset({ x: 0, y: 0 });
      },
    });
  }, [centerProj, zoom]);

  const webDragProps = Platform.OS === 'web' ? {
    onMouseDown: handleWebMouseDown,
    onMouseMove: handleWebMouseMove,
    onMouseUp: handleWebMouseUp,
    onMouseLeave: handleWebMouseUp,
    onWheel: handleWebWheel,
  } : {};

  return (
    <View style={styles.container}>
      {/* 1. TOP HEADER & TELEMETRY TOOLBAR */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.toolbarTitle}>Mumbai Fleet Command & Demand Heatmap</Text>
            <View style={styles.telemetryLiveBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.telemetryLiveText}>LIVE TELEMETRY</Text>
            </View>
          </View>
          <Text style={styles.toolbarSub}>
            Real-time PostGIS surveillance across Marol, Andheri East, MIDC, SEEPZ, Powai & Sakinaka
          </Text>
        </View>

        <View style={styles.toolbarRight}>
          {/* Surge Heatmap Toggle */}
          <View style={styles.heatmapToggleWrap}>
            <Ionicons name="flame" size={16} color={showHeatmap ? '#DC2626' : '#94A3B8'} />
            <Text style={[styles.toggleLabel, showHeatmap && { color: '#DC2626', fontWeight: fontWeights.bold }]}>
              Surge Heatmap
            </Text>
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
            {[2000, 5000, 10000, 20000].map((cap) => {
              const count = fleetTankers.filter((t) => t.is_online && t.capacity_liters === cap).length;
              return (
                <Pressable
                  key={cap}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${cap}L`}
                  onPress={() => setSelectedCapacity(cap === selectedCapacity ? null : cap)}
                  style={[styles.filterChip, selectedCapacity === cap && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, selectedCapacity === cap && styles.filterChipTextActive]}>
                    {cap >= 1000 ? `${cap / 1000}kL` : `${cap}L`} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* 2. QUICK ZONE JUMP NAVIGATION BAR (UBER/OLA HOTSPOT SHORTCUTS) */}
      <View style={styles.quickZonesBar}>
        <Text style={styles.quickZonesLabel}>HOTSPOT JUMP:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickZonesScroll}>
          {deficitZones.map((zone) => {
            const pct = parseInt(zone.deficit_level.replace(/[^0-9]/g, ''), 10) || 50;
            const surge = getSurgeInfo(pct);
            const shortName = zone.zone_name.split('/')[0].trim();
            return (
              <Pressable
                key={zone.id}
                onPress={() => handleFlyTo(zone.center_lat, zone.center_lng, 15)}
                style={[styles.zoneJumpChip, { borderColor: surge.color }]}
              >
                <View style={[styles.surgeMiniBadge, { backgroundColor: surge.color }]}>
                  <Text style={styles.surgeMiniText}>{surge.multiplier}</Text>
                </View>
                <Text style={styles.zoneJumpName}>{shortName}</Text>
                <Text style={[styles.zoneJumpPct, { color: surge.color }]}>{pct}%</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={handleRecenter} style={styles.recenterChip}>
            <Ionicons name="locate" size={14} color="#0284C7" />
            <Text style={styles.recenterChipText}>Marol HQ</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* 3. MAIN INTERACTIVE MAP CANVAS + TELEMETRY DRAWER */}
      <View
        style={[styles.mapWrapper, isDesktop && styles.mapWrapperDesktop]}
        onLayout={handleLayout}
      >
        <View
          style={[styles.mapCanvasBox, isDragging && styles.mapCanvasDragging]}
          {...(Platform.OS === 'web' ? webDragProps : panResponder.panHandlers)}
        >
          {/* A. REAL CARTO VOYAGER MAP TILES */}
          {visibleTiles.map((tile) => (
            <Image
              key={tile.key}
              source={{ uri: tile.url }}
              style={{
                position: 'absolute',
                left: tile.left,
                top: tile.top,
                width: TILE_SIZE,
                height: TILE_SIZE,
              }}
              resizeMode="cover"
            />
          ))}

          {/* B. UBER/OLA DEMAND DEFICIT HEATMAP OVERLAYS */}
          {showHeatmap &&
            placedZones.map((zone) => {
              const radius = zone.surge.radiusPixels;
              return (
                <View
                  key={`zone-${zone.id}`}
                  style={{
                    position: 'absolute',
                    left: zone.x - radius,
                    top: zone.y - radius,
                    width: radius * 2,
                    height: radius * 2,
                    pointerEvents: 'box-none',
                  }}
                >
                  {/* Outer Thermal Glow Corona */}
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: radius * 2,
                      height: radius * 2,
                      borderRadius: radius,
                      backgroundColor: zone.surge.color,
                      opacity: 0.16,
                    }}
                  />
                  {/* Mid Density Concentric Ring */}
                  <View
                    style={{
                      position: 'absolute',
                      left: radius * 0.25,
                      top: radius * 0.25,
                      width: radius * 1.5,
                      height: radius * 1.5,
                      borderRadius: radius * 0.75,
                      borderWidth: 2,
                      borderColor: zone.surge.color,
                      borderStyle: 'dashed',
                      backgroundColor: zone.surge.color,
                      opacity: 0.24,
                    }}
                  />
                  {/* Floating Uber Surge Pill Badge */}
                  <View
                    style={{
                      position: 'absolute',
                      left: radius - 75,
                      top: radius - 16,
                      width: 150,
                      height: 32,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Pressable
                      onPress={() => handleFlyTo(zone.center_lat, zone.center_lng, 15)}
                      style={[styles.uberSurgePill, shadows.subtle]}
                    >
                      <View style={[styles.surgeMultBadge, { backgroundColor: zone.surge.color }]}>
                        <Text style={styles.surgeMultText}>{zone.surge.multiplier}</Text>
                      </View>
                      <Text style={styles.surgeZoneName}>{zone.shortName}</Text>
                      <Text style={[styles.surgeDeficitTag, { color: zone.surge.color }]}>{zone.pct}%</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

          {/* C. LIVE POSTGIS TANKER FLEET PINS */}
          {placedTankers.map((tanker) => {
            const isSelected = selectedTanker?.id === tanker.id;
            return (
              <View
                key={`tanker-${tanker.id}`}
                style={{
                  position: 'absolute',
                  left: tanker.x - 45,
                  top: tanker.y - 24,
                  width: 90,
                  height: 52,
                  zIndex: isSelected ? 300 : 200,
                }}
              >
                <Pressable
                  onPress={() => setSelectedTanker(isSelected ? null : tanker)}
                  style={styles.tankerPinWrap}
                >
                  <View
                    style={[
                      styles.tankerBubble,
                      tanker.is_available ? styles.bubbleAvailable : styles.bubbleBusy,
                      isSelected && styles.bubbleSelected,
                    ]}
                  >
                    <View style={styles.radarPulseDot} />
                    <Ionicons name="water" size={11} color="#FFFFFF" />
                    <Text style={styles.tankerCapText}>{tanker.capText}</Text>
                  </View>
                  <View style={styles.plateChip}>
                    <Text style={styles.plateChipText}>{tanker.vehicle_number}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* D. FLOATING MAP CONTROLS (ZOOM & RECENTER) */}
        <View style={styles.mapControlsGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom In"
            onPress={() => setZoom((z) => Math.min(18, z + 1))}
            style={styles.mapControlBtn}
          >
            <Ionicons name="add" size={20} color="#0F172A" />
          </Pressable>
          <View style={styles.mapControlDivider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom Out"
            onPress={() => setZoom((z) => Math.max(11, z - 1))}
            style={styles.mapControlBtn}
          >
            <Ionicons name="remove" size={20} color="#0F172A" />
          </Pressable>
          <View style={styles.mapControlDivider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recenter to Marol HQ"
            onPress={handleRecenter}
            style={styles.mapControlBtn}
          >
            <Ionicons name="locate" size={18} color="#0284C7" />
          </Pressable>
        </View>

        {/* E. FLOATING UBER/OLA SURGE LEGEND (BOTTOM-LEFT) */}
        <View style={styles.floatingLegend}>
          <View style={styles.legendHeaderRow}>
            <Ionicons name="analytics" size={13} color="#64748B" />
            <Text style={styles.legendTitle}>UBER SURGE & FLEET STATUS</Text>
          </View>
          <View style={styles.legendScaleRow}>
            <View style={styles.legendScaleItem}>
              <View style={[styles.legendColorDot, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendItemText}>2.2x Crisis (80%+)</Text>
            </View>
            <View style={styles.legendScaleItem}>
              <View style={[styles.legendColorDot, { backgroundColor: '#EA580C' }]} />
              <Text style={styles.legendItemText}>1.8x High (70-80%)</Text>
            </View>
            <View style={styles.legendScaleItem}>
              <View style={[styles.legendColorDot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.legendItemText}>1.5x Elevated</Text>
            </View>
            <View style={styles.legendScaleItem}>
              <View style={[styles.legendColorDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendItemText}>1.0x Normal</Text>
            </View>
          </View>
          <View style={styles.legendFleetRow}>
            <View style={styles.legendScaleItem}>
              <View style={[styles.legendColorDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendItemText}>Ready ({filteredTankers.filter((t) => t.is_available).length})</Text>
            </View>
            <View style={styles.legendScaleItem}>
              <View style={[styles.legendColorDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendItemText}>En Route ({filteredTankers.filter((t) => !t.is_available).length})</Text>
            </View>
          </View>
        </View>

        {/* F. SAMSARA / UBER FLEET TELEMETRY DRAWER (FLOATING OVERLAY) */}
        {selectedTanker && (
          <View style={[styles.telemetryDrawer, !isDesktop && styles.telemetryDrawerMobile]}>
            <View style={styles.drawerHeader}>
              <View style={styles.hsrpPlateBox}>
                <View style={styles.hsrpIndBar}>
                  <Text style={styles.hsrpIndText}>IND</Text>
                </View>
                <Text style={styles.hsrpNumber}>{selectedTanker.vehicle_number}</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close Telemetry"
                onPress={() => setSelectedTanker(null)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <View
              style={[
                styles.statusBanner,
                selectedTanker.is_available
                  ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }
                  : { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: selectedTanker.is_available ? '#16A34A' : '#D97706' },
                ]}
              />
              <Text
                style={[
                  styles.statusBannerText,
                  { color: selectedTanker.is_available ? '#16A34A' : '#D97706' },
                ]}
              >
                {selectedTanker.is_available ? 'ONLINE & READY FOR DISPATCH' : 'EN ROUTE / ON ACTIVE DELIVERY'}
              </Text>
            </View>

            <View style={styles.driverCard}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitials}>
                  {selectedTanker.driver_name ? selectedTanker.driver_name.slice(0, 2).toUpperCase() : 'TK'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{selectedTanker.driver_name || 'Assigned Driver'}</Text>
                <Text style={styles.driverPhone}>{selectedTanker.driver_phone || '+91 90000 00000'}</Text>
              </View>
              {selectedTanker.driver_phone && (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${selectedTanker.driver_phone}`)}
                  style={styles.callDriverBtn}
                >
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                </Pressable>
              )}
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>CAPACITY</Text>
                <Text style={styles.metricVal}>{selectedTanker.capacity_liters.toLocaleString('en-IN')} L</Text>
                <View style={styles.capacityBar}>
                  <View style={[styles.capacityFill, { width: '100%' }]} />
                </View>
              </View>

              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>WATER GRADE</Text>
                <Text style={styles.metricVal}>{selectedTanker.water_type}</Text>
                <Text style={styles.metricSub}>TDS &lt; 250 ppm</Text>
              </View>

              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>GPS COORDINATES</Text>
                <Text style={styles.metricVal}>
                  {selectedTanker.latitude.toFixed(4)}, {selectedTanker.longitude.toFixed(4)}
                </Text>
                <Text style={styles.metricSub}>PostGIS Live</Text>
              </View>

              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>BASE FARE</Text>
                <Text style={styles.metricVal}>₹{selectedTanker.base_price || 1200}</Text>
                <Text style={styles.metricSub}>Surge Included</Text>
              </View>
            </View>

            <View style={styles.iotCard}>
              <View style={styles.iotHeader}>
                <Ionicons name="speedometer-outline" size={15} color="#0284C7" />
                <Text style={styles.iotTitle}>Flow Meter & IoT Sensor Logs</Text>
              </View>
              <Text style={styles.iotDesc}>
                Calibrated digital valve streaming flow volume via Bluetooth BLE & PostGIS.
              </Text>
              <View style={styles.iotStatsRow}>
                <View style={styles.iotStatItem}>
                  <Text style={styles.iotStatKey}>Valve Status</Text>
                  <Text style={styles.iotStatVal}>SEALED</Text>
                </View>
                <View style={styles.iotStatItem}>
                  <Text style={styles.iotStatKey}>Calibration</Text>
                  <Text style={styles.iotStatVal}>ISO 4064 Class B</Text>
                </View>
                <View style={styles.iotStatItem}>
                  <Text style={styles.iotStatKey}>Last Heartbeat</Text>
                  <Text style={styles.iotStatVal}>Just Now</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionButtonsRow}>
              <Pressable
                onPress={() =>
                  Alert.alert(
                    'Rebalance Dispatch',
                    `Route tanker ${selectedTanker.vehicle_number} to high-deficit Marol sector?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Confirm Dispatch',
                        onPress: () => Alert.alert('Success', 'Dispatch order transmitted to driver mobile unit.'),
                      },
                    ]
                  )
                }
                style={styles.rebalanceBtn}
              >
                <Ionicons name="navigate" size={15} color="#FFFFFF" />
                <Text style={styles.rebalanceBtnText}>Rebalance to Deficit Hotspot</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },

  // 1. TOOLBAR
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolbarLeft: {
    flex: 1,
    minWidth: 280,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toolbarTitle: {
    fontSize: 18,
    fontWeight: fontWeights.heavy,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  telemetryLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  telemetryLiveText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#15803D',
    letterSpacing: 0.5,
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
    flexWrap: 'wrap',
  },
  heatmapToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },

  // 2. QUICK ZONES BAR
  quickZonesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  quickZonesLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  quickZonesScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  zoneJumpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    ...shadows.subtle,
  },
  surgeMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  surgeMiniText: {
    fontSize: 10,
    fontWeight: fontWeights.heavy,
    color: '#FFFFFF',
  },
  zoneJumpName: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#1E293B',
  },
  zoneJumpPct: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
  },
  recenterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  recenterChipText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#0284C7',
  },

  // 3. MAP CANVAS & OVERLAYS
  mapWrapper: {
    position: 'relative',
    width: '100%',
    height: 520,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  mapWrapperDesktop: {
    height: 640,
  },
  mapCanvasBox: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'grab' as any,
  },
  mapCanvasDragging: {
    cursor: 'grabbing' as any,
  },

  // UBER SURGE PILL
  uberSurgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  surgeMultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  surgeMultText: {
    color: '#FFFFFF',
    fontWeight: fontWeights.heavy,
    fontSize: 11,
  },
  surgeZoneName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: fontWeights.bold,
  },
  surgeDeficitTag: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
  },

  // TANKER PIN
  tankerPinWrap: {
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  tankerBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...shadows.subtle,
  },
  bubbleAvailable: {
    backgroundColor: '#10B981',
  },
  bubbleBusy: {
    backgroundColor: '#F59E0B',
  },
  bubbleSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#BAE6FD',
    transform: [{ scale: 1.15 }],
  },
  radarPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  tankerCapText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: fontWeights.heavy,
  },
  plateChip: {
    marginTop: 2,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    ...shadows.subtle,
  },
  plateChipText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    letterSpacing: 0.3,
  },

  // MAP CONTROLS
  mapControlsGroup: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...shadows.floating,
    zIndex: 100,
  },
  mapControlBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapControlDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    width: '100%',
  },

  // FLOATING UBER/OLA SURGE LEGEND
  floatingLegend: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.floating,
    zIndex: 100,
  },
  legendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  legendScaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  legendFleetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendScaleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendItemText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: fontWeights.medium,
  },

  // TELEMETRY DRAWER (FLOATING SAMSARA / UBER FLEET DESK)
  telemetryDrawer: {
    position: 'absolute',
    top: 16,
    right: 16,
    bottom: 16,
    width: 390,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    ...shadows.modal,
    zIndex: 200,
    justifyContent: 'space-between',
  },
  telemetryDrawerMobile: {
    left: 12,
    right: 12,
    width: 'auto',
    bottom: 12,
    top: 'auto',
    maxHeight: 460,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hsrpPlateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0F172A',
    borderRadius: 6,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  hsrpIndBar: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 5,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hsrpIndText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.5,
  },
  hsrpNumber: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 14,
    fontWeight: fontWeights.heavy,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBannerText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInitials: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
  driverName: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  driverPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  callDriverBtn: {
    backgroundColor: '#16A34A',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.subtle,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metricCell: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  capacityBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0F2FE',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    backgroundColor: '#0284C7',
  },
  iotCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 10,
    marginBottom: 12,
  },
  iotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  iotTitle: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#0369A1',
  },
  iotDesc: {
    fontSize: 11,
    color: '#0284C7',
    lineHeight: 15,
    marginBottom: 6,
  },
  iotStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 6,
  },
  iotStatItem: {
    alignItems: 'center',
  },
  iotStatKey: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: fontWeights.medium,
  },
  iotStatVal: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginTop: 1,
  },
  actionButtonsRow: {
    marginTop: 'auto',
  },
  rebalanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 8,
    ...shadows.subtle,
  },
  rebalanceBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
});
