import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  LayoutChangeEvent,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FleetTankerItem, useAdminStore } from '../../../stores/adminStore';
import { borderRadius, fontWeights, shadows, spacing } from '../../../theme';
import { confirmAction, notify } from '../../../utils/alertUtils';

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
    rebalanceTanker,
    createTanker,
    updateTanker,
    deleteTanker,
  } = useAdminStore();

  const [zoom, setZoom] = useState<number>(14);
  const [centerLat, setCenterLat] = useState<number>(MAROL_HQ_LAT);
  const [centerLng, setCenterLng] = useState<number>(MAROL_HQ_LNG);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showZoneLabels, setShowZoneLabels] = useState<boolean>(true);
  const [showPlates, setShowPlates] = useState<boolean>(false);
  const [mapTheme, setMapTheme] = useState<'dark' | 'street'>('dark');
  const [selectedCapacity, setSelectedCapacity] = useState<number | null>(null);
  const [selectedTanker, setSelectedTanker] = useState<FleetTankerItem | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 1000,
    height: isDesktop ? 640 : 480,
  });

  // CRUD Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Tanker Form Fields
  const [newPlate, setNewPlate] = useState('');
  const [newDriver, setNewDriver] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCap, setNewCap] = useState(5000);
  const [newWaterType, setNewWaterType] = useState('Potable (Drinking)');
  const [newPrice, setNewPrice] = useState(650);

  // Edit Tanker Form Fields
  const [editDriver, setEditDriver] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCap, setEditCap] = useState(5000);
  const [editPrice, setEditPrice] = useState(650);

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

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const left = (tx - centerProj.x) * TILE_SIZE + width / 2 + panOffset.x;
        const top = (ty - centerProj.y) * TILE_SIZE + height / 2 + panOffset.y;
        // ArcGIS public CDN tiles (Zero watermarks, No API key required, high-speed cached)
        const url = mapTheme === 'dark'
          ? `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${zoom}/${ty}/${tx}`
          : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`;
        tiles.push({
          key: `${mapTheme}-${zoom}-${tx}-${ty}`,
          url,
          left,
          top,
        });
      }
    }
    return tiles;
  }, [centerProj, containerSize, panOffset, zoom, mapTheme]);

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

  // Calculate pixel coordinates for Tanker Fleet Markers with Golden-Angle Dispersion
  const placedTankers = useMemo(() => {
    const { width, height } = containerSize;
    const placed: Array<any> = [];
    const seenPositions: Array<{ x: number; y: number }> = [];

    filteredTankers.forEach((tanker) => {
      const tProj = projectToTileCoords(tanker.latitude, tanker.longitude, zoom);
      let rawX = (tProj.x - centerProj.x) * TILE_SIZE + width / 2 + panOffset.x;
      let rawY = (tProj.y - centerProj.y) * TILE_SIZE + height / 2 + panOffset.y;

      // Anti-collision: Stagger tankers clustered within 36px so they never occlude
      const closeCount = seenPositions.filter(
        (p) => Math.hypot(p.x - rawX, p.y - rawY) < 36
      ).length;
      if (closeCount > 0) {
        const angle = closeCount * 2.39996; // Golden angle in radians
        const dist = 32 * Math.sqrt(closeCount);
        rawX += Math.cos(angle) * dist;
        rawY += Math.sin(angle) * dist;
      }
      seenPositions.push({ x: rawX, y: rawY });

      const capText = tanker.capacity_liters >= 1000 ? `${tanker.capacity_liters / 1000}k` : `${tanker.capacity_liters}L`;
      placed.push({
        ...tanker,
        x: rawX,
        y: rawY,
        capText,
      });
    });
    return placed;
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
          {/* Map Base Theme Selector */}
          <View style={styles.themeToggleWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dark Operations Map"
              onPress={() => setMapTheme('dark')}
              style={[styles.themeChip, mapTheme === 'dark' && styles.themeChipActive]}
            >
              <Ionicons name="moon" size={13} color={mapTheme === 'dark' ? '#38BDF8' : '#64748B'} />
              <Text style={[styles.themeChipText, mapTheme === 'dark' && styles.themeChipTextActive]}>
                Dark Ops
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Street Grid Map"
              onPress={() => setMapTheme('street')}
              style={[styles.themeChip, mapTheme === 'street' && styles.themeChipActive]}
            >
              <Ionicons name="map" size={13} color={mapTheme === 'street' ? '#0284C7' : '#64748B'} />
              <Text style={[styles.themeChipText, mapTheme === 'street' && styles.themeChipTextActive]}>
                Street Grid
              </Text>
            </Pressable>
          </View>

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

          {/* Unclutter Toggles: Zone Labels & Plate Numbers */}
          <View style={styles.toggleRowSmall}>
            <View style={styles.heatmapToggleWrap}>
              <Ionicons name="pricetag-outline" size={13} color={showZoneLabels ? '#0284C7' : '#94A3B8'} />
              <Text style={styles.toggleLabelSmall}>Zone Tags</Text>
              <Switch
                value={showZoneLabels}
                onValueChange={setShowZoneLabels}
                trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                thumbColor="#FFFFFF"
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>

            <View style={styles.heatmapToggleWrap}>
              <Ionicons name="card-outline" size={13} color={showPlates ? '#0284C7' : '#94A3B8'} />
              <Text style={styles.toggleLabelSmall}>Plates</Text>
              <Switch
                value={showPlates}
                onValueChange={setShowPlates}
                trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                thumbColor="#FFFFFF"
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
          </View>

          {/* + Add Tanker CRUD Action */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Onboard New Tanker"
            onPress={() => {
              setNewPlate(`MH-02-TC-${Math.floor(1000 + Math.random() * 9000)}`);
              setNewDriver('Ramesh Gaikwad');
              setNewPhone('+9198200' + Math.floor(10000 + Math.random() * 90000));
              setIsAddModalOpen(true);
            }}
            style={styles.addTankerBtn}
          >
            <Ionicons name="add" size={15} color="#FFFFFF" />
            <Text style={styles.addTankerBtnText}>+ Add Tanker</Text>
          </Pressable>
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
                  {/* Sleek Floating Surge Badge - Anchored at the TOP arc of the circle (Zero Center Occlusion!) */}
                  {showZoneLabels && (
                    <View
                      style={{
                        position: 'absolute',
                        left: radius - 60,
                        top: 6,
                        width: 120,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                        pointerEvents: 'box-none',
                      }}
                    >
                      <Pressable
                        onPress={() => handleFlyTo(zone.center_lat, zone.center_lng, 15)}
                        style={[styles.uberSurgePillCompact, shadows.subtle]}
                      >
                        <View style={[styles.surgeMultBadgeSmall, { backgroundColor: zone.surge.color }]}>
                          <Text style={styles.surgeMultTextSmall}>{zone.surge.multiplier}</Text>
                        </View>
                        <Text style={styles.surgeZoneNameSmall}>{zone.shortName}</Text>
                        <Text style={[styles.surgeDeficitTagSmall, { color: zone.surge.color }]}>{zone.pct}%</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}

          {/* C. LIVE POSTGIS TANKER FLEET PINS (UNCLUTTERED HIGH-DEF TOKENS) */}
          {placedTankers.map((tanker) => {
            const isSelected = selectedTanker?.id === tanker.id;
            return (
              <View
                key={`tanker-${tanker.id}`}
                style={{
                  position: 'absolute',
                  left: tanker.x - 22,
                  top: tanker.y - 22,
                  width: 44,
                  height: showPlates || isSelected ? 62 : 44,
                  zIndex: isSelected ? 300 : 200,
                  alignItems: 'center',
                }}
              >
                <Pressable
                  onPress={() => {
                    setSelectedTanker(isSelected ? null : tanker);
                    setEditDriver(tanker.driver_name);
                    setEditPhone(tanker.driver_phone);
                    setEditCap(tanker.capacity_liters);
                    setEditPrice(tanker.base_price || 650);
                  }}
                  style={[
                    styles.tankerPinCompact,
                    tanker.is_available ? styles.pinAvailable : styles.pinBusy,
                    isSelected && styles.pinSelected,
                  ]}
                >
                  <Ionicons name="water" size={13} color="#FFFFFF" />
                  <Text style={styles.pinCapText}>{tanker.capText}</Text>
                  <View
                    style={[
                      styles.pinStatusDot,
                      { backgroundColor: tanker.is_available ? '#10B981' : '#F59E0B' },
                    ]}
                  />
                </Pressable>

                {(showPlates || isSelected) && (
                  <View style={[styles.compactPlateWrap, isSelected && styles.compactPlateWrapSelected]}>
                    <Text style={styles.compactPlateText}>{tanker.vehicle_number}</Text>
                  </View>
                )}
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

            {/* Telemetry Drawer CRUD Controls */}
            <View style={styles.actionButtonsCol}>
              {/* Row 1: Real-time Status Toggles */}
              <View style={styles.drawerCrudRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Online Status"
                  onPress={async () => {
                    const nextOnline = !selectedTanker.is_online;
                    const ok = await updateTanker(selectedTanker.id, { is_online: nextOnline });
                    if (ok) {
                      notify('Fleet Status Updated', `Tanker marked ${nextOnline ? 'ONLINE' : 'OFFLINE'}.`);
                      setSelectedTanker((prev) => (prev ? { ...prev, is_online: nextOnline } : null));
                    }
                  }}
                  style={[styles.crudActionBtn, { backgroundColor: selectedTanker.is_online ? '#EF4444' : '#10B981' }]}
                >
                  <Ionicons name={selectedTanker.is_online ? 'power' : 'radio'} size={13} color="#FFFFFF" />
                  <Text style={styles.crudActionBtnText}>
                    {selectedTanker.is_online ? 'Take Offline' : 'Bring Online'}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Availability"
                  onPress={async () => {
                    const nextAvail = !selectedTanker.is_available;
                    const ok = await updateTanker(selectedTanker.id, { is_available: nextAvail });
                    if (ok) {
                      notify('Availability Changed', `Tanker marked ${nextAvail ? 'READY' : 'EN ROUTE'}.`);
                      setSelectedTanker((prev) => (prev ? { ...prev, is_available: nextAvail } : null));
                    }
                  }}
                  style={[styles.crudActionBtn, { backgroundColor: '#0284C7' }]}
                >
                  <Ionicons
                    name={selectedTanker.is_available ? 'navigate-outline' : 'checkmark-circle-outline'}
                    size={13}
                    color="#FFFFFF"
                  />
                  <Text style={styles.crudActionBtnText}>
                    {selectedTanker.is_available ? 'Mark En Route' : 'Mark Ready'}
                  </Text>
                </Pressable>
              </View>

              {/* Row 2: Edit & Retire CRUD Actions */}
              <View style={styles.drawerCrudRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit Tanker"
                  onPress={() => {
                    setEditDriver(selectedTanker.driver_name);
                    setEditPhone(selectedTanker.driver_phone);
                    setEditCap(selectedTanker.capacity_liters);
                    setEditPrice(selectedTanker.base_price || 650);
                    setIsEditModalOpen(true);
                  }}
                  style={[styles.crudActionBtn, { backgroundColor: '#475569' }]}
                >
                  <Ionicons name="pencil" size={13} color="#FFFFFF" />
                  <Text style={styles.crudActionBtnText}>Edit Tanker</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retire Tanker"
                  onPress={() =>
                    confirmAction(
                      'Retire Tanker from Fleet',
                      `Permanently decommission tanker ${selectedTanker.vehicle_number} from operations?`,
                      async () => {
                        const ok = await deleteTanker(selectedTanker.id);
                        if (ok) {
                          notify('Tanker Decommissioned', `Tanker ${selectedTanker.vehicle_number} removed.`);
                          setSelectedTanker(null);
                        }
                      },
                      'Retire Tanker'
                    )
                  }
                  style={[styles.crudActionBtn, { backgroundColor: '#991B1B' }]}
                >
                  <Ionicons name="trash-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.crudActionBtnText}>Retire Fleet</Text>
                </Pressable>
              </View>

              {/* Rebalance Dispatch */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rebalance to Deficit Hotspot"
                onPress={() =>
                  confirmAction(
                    'Rebalance Dispatch',
                    `Route tanker ${selectedTanker.vehicle_number} to high-deficit Marol sector?`,
                    async () => {
                      const ok = await rebalanceTanker(selectedTanker.id, 'Marol / MIDC Andheri East');
                      if (ok) {
                        notify('Dispatch Transmitted', `Tanker ${selectedTanker.vehicle_number} rebalanced to Marol high-deficit zone.`);
                        setSelectedTanker(null);
                      } else {
                        notify('Dispatch Error', 'Failed to dispatch tanker rebalance.');
                      }
                    },
                    'Confirm Dispatch'
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

      {/* CRUD MODAL 1: ADD NEW TANKER */}
      <Modal visible={isAddModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="bus" size={20} color="#0284C7" />
                <Text style={styles.modalTitle}>Onboard New Tanker to Fleet</Text>
              </View>
              <Pressable onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Vehicle Number (HSRP)</Text>
              <TextInput
                value={newPlate}
                onChangeText={setNewPlate}
                placeholder="e.g. MH-02-TC-9021"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Driver Full Name</Text>
              <TextInput
                value={newDriver}
                onChangeText={setNewDriver}
                placeholder="e.g. Anand Kulkarni"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Driver Phone (+91)</Text>
              <TextInput
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="+919820011223"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Capacity (Liters)</Text>
                  <TextInput
                    value={String(newCap)}
                    onChangeText={(t) => setNewCap(parseInt(t, 10) || 5000)}
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Base Fare (₹)</Text>
                  <TextInput
                    value={String(newPrice)}
                    onChangeText={(t) => setNewPrice(parseInt(t, 10) || 650)}
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Water Grade</Text>
              <TextInput
                value={newWaterType}
                onChangeText={setNewWaterType}
                placeholder="e.g. Potable (Drinking)"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setIsAddModalOpen(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={isSaving}
                onPress={async () => {
                  if (!newPlate.trim() || !newDriver.trim() || !newPhone.trim()) {
                    notify('Missing Information', 'Please fill in all tanker details.');
                    return;
                  }
                  setIsSaving(true);
                  const ok = await createTanker({
                    vehicle_number: newPlate.trim(),
                    driver_name: newDriver.trim(),
                    driver_phone: newPhone.trim(),
                    capacity_liters: newCap,
                    water_type: newWaterType,
                    base_price: newPrice,
                    latitude: 19.1171 + (Math.random() - 0.5) * 0.02,
                    longitude: 72.8809 + (Math.random() - 0.5) * 0.02,
                  });
                  setIsSaving(false);
                  if (ok) {
                    notify('Tanker Onboarded', `Vehicle ${newPlate} successfully registered to live fleet.`);
                    setIsAddModalOpen(false);
                  } else {
                    notify('Save Error', 'Failed to save tanker.');
                  }
                }}
                style={styles.modalSubmitBtn}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Create Tanker</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* CRUD MODAL 2: EDIT TANKER DETAILS */}
      <Modal visible={isEditModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="create" size={20} color="#0284C7" />
                <Text style={styles.modalTitle}>
                  Edit Tanker: {selectedTanker?.vehicle_number}
                </Text>
              </View>
              <Pressable onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Driver Full Name</Text>
              <TextInput
                value={editDriver}
                onChangeText={setEditDriver}
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Driver Phone</Text>
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                style={styles.textInput}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Capacity (Liters)</Text>
                  <TextInput
                    value={String(editCap)}
                    onChangeText={(t) => setEditCap(parseInt(t, 10) || 5000)}
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Base Fare (₹)</Text>
                  <TextInput
                    value={String(editPrice)}
                    onChangeText={(t) => setEditPrice(parseInt(t, 10) || 650)}
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setIsEditModalOpen(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={isSaving}
                onPress={async () => {
                  if (!selectedTanker) return;
                  setIsSaving(true);
                  const ok = await updateTanker(selectedTanker.id, {
                    driver_name: editDriver.trim(),
                    driver_phone: editPhone.trim(),
                    capacity_liters: editCap,
                    base_price: editPrice,
                  });
                  setIsSaving(false);
                  if (ok) {
                    notify('Tanker Updated', `Vehicle ${selectedTanker.vehicle_number} details refreshed.`);
                    setSelectedTanker((prev) =>
                      prev
                        ? {
                            ...prev,
                            driver_name: editDriver.trim(),
                            driver_phone: editPhone.trim(),
                            capacity_liters: editCap,
                            base_price: editPrice,
                          }
                        : null
                    );
                    setIsEditModalOpen(false);
                  } else {
                    notify('Update Error', 'Failed to update tanker details.');
                  }
                }}
                style={styles.modalSubmitBtn}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  themeToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  themeChipActive: {
    backgroundColor: '#0F172A',
  },
  themeChipText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#64748B',
  },
  themeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
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
  actionButtonsCol: {
    marginTop: 'auto',
    gap: 8,
  },
  drawerCrudRow: {
    flexDirection: 'row',
    gap: 8,
  },
  crudActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  crudActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: fontWeights.bold,
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

  // Unclutter & Marker Styles
  toggleRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabelSmall: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  addTankerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...shadows.subtle,
  },
  addTankerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: fontWeights.bold,
  },
  uberSurgePillCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  surgeMultBadgeSmall: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  surgeMultTextSmall: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },
  surgeZoneNameSmall: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: fontWeights.semibold,
  },
  surgeDeficitTagSmall: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },

  // Compact Modern Circular Tanker Pin
  tankerPinCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...shadows.card,
  },
  pinAvailable: {
    backgroundColor: '#0F172A',
    borderColor: '#10B981',
  },
  pinBusy: {
    backgroundColor: '#0F172A',
    borderColor: '#F59E0B',
  },
  pinSelected: {
    borderColor: '#38BDF8',
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  pinCapText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: fontWeights.bold,
    marginLeft: 2,
  },
  pinStatusDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  compactPlateWrap: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#334155',
  },
  compactPlateWrapSelected: {
    borderColor: '#38BDF8',
    backgroundColor: '#0284C7',
  },
  compactPlateText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: fontWeights.bold,
    fontFamily: 'monospace',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    overflow: 'hidden',
    ...shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#475569',
    marginBottom: 5,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: fontWeights.semibold,
  },
  modalSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
});
