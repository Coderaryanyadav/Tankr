import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
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
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

const TILE_SIZE = 256;
const CARTO_KEY = process.env.EXPO_PUBLIC_CARTO_API_KEY || 'cb1_4yut_1_53099494f5cc36d9ace8e1e4';

// Primary Operations Center (Marol HQ, Andheri East, Mumbai)
const MAROL_HQ_LAT = 19.1171;
const MAROL_HQ_LNG = 72.8809;

// Calculate Uber/Ola Surge Multiplier from Deficit Percentage
function getSurgeInfo(deficitPct: number) {
  if (deficitPct >= 80) {
    return { multiplier: '⚡ 2.2x', label: 'CRISIS SURGE', color: '#DC2626', bg: '#FEE2E2', radiusMeters: 1400 };
  }
  if (deficitPct >= 70) {
    return { multiplier: '⚡ 1.8x', label: 'HIGH SURGE', color: '#EA580C', bg: '#FFEDD5', radiusMeters: 1200 };
  }
  if (deficitPct >= 55) {
    return { multiplier: '⚡ 1.5x', label: 'ELEVATED', color: '#D97706', bg: '#FEF3C7', radiusMeters: 1000 };
  }
  if (deficitPct >= 40) {
    return { multiplier: '⚡ 1.2x', label: 'MODERATE', color: '#EAB308', bg: '#FEF9C3', radiusMeters: 850 };
  }
  return { multiplier: '1.0x', label: 'OPTIMAL', color: '#10B981', bg: '#DCFCE7', radiusMeters: 700 };
}

// Convert WGS84 coordinates to tile coordinates for native fallback
function projectToTileCoords(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const clampedLatRad = Math.max(-1.4844, Math.min(1.4844, latRad));
  const y = ((1 - Math.log(Math.tan(clampedLatRad) + 1 / Math.cos(clampedLatRad)) / Math.PI) / 2) * n;
  return { x, y };
}

// HTML Generator for Interactive Leaflet Web Map
function buildLeafletHtml(
  initialLat: number,
  initialLng: number,
  initialZoom: number,
  cartoKey: string,
  initialFleet: any[] = [],
  initialZones: any[] = [],
  initialShowHeatmap: boolean = true,
  initialSelectedCapacity: number | null = null,
  initialSelectedTankerId: string | null = null
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #F1F5F9; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    
    /* Uber/Ola Surge Heatmap Glow & Pulse */
    .surge-heat-halo {
      border-radius: 50%;
      pointer-events: none;
      animation: surgePulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes surgePulse {
      0%, 100% { transform: scale(0.96); opacity: 0.8; }
      50% { transform: scale(1.04); opacity: 1; }
    }

    /* Floating Uber / Ola Surge Multiplier Badge */
    .uber-surge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1.5px solid rgba(255, 255, 255, 0.3);
      border-radius: 24px;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      cursor: pointer;
      user-select: none;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
    }
    .uber-surge-pill:hover {
      transform: scale(1.1) translateY(-2px);
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.5);
    }
    .surge-mult-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: 12px;
      font-weight: 900;
      font-size: 11px;
      letter-spacing: -0.2px;
    }
    .surge-deficit-tag {
      font-size: 10px;
      font-weight: 700;
    }

    /* Tanker Vehicle Markers Matching Mobile/Web Fleet Spec */
    .tanker-marker-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      user-select: none;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .tanker-marker-wrap:hover {
      transform: translateY(-5px) scale(1.12);
      z-index: 9999 !important;
    }
    .tanker-bubble {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 16px;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 800;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      border: 2px solid #FFFFFF;
    }
    .bubble-available {
      background: linear-gradient(135deg, #10B981, #059669);
    }
    .bubble-busy {
      background: linear-gradient(135deg, #F59E0B, #D97706);
    }
    .bubble-selected {
      background: linear-gradient(135deg, #0284C7, #0369A1);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.5), 0 6px 18px rgba(0, 0, 0, 0.35);
      transform: scale(1.1);
    }
    .radar-pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #FFFFFF;
      box-shadow: 0 0 6px #FFFFFF;
    }
    .plate-chip {
      margin-top: 3px;
      padding: 1px 6px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      color: #0F172A;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
      letter-spacing: 0.3px;
      white-space: nowrap;
    }

    /* Custom Leaflet Controls */
    .leaflet-bar {
      border: none !important;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.18) !important;
      border-radius: 10px !important;
      overflow: hidden;
    }
    .leaflet-bar a {
      background: #FFFFFF !important;
      color: #0F172A !important;
      font-size: 16px !important;
      font-weight: 800 !important;
      width: 36px !important;
      height: 36px !important;
      line-height: 36px !important;
      border-bottom: 1px solid #E2E8F0 !important;
    }
    .leaflet-bar a:hover {
      background: #F8FAFC !important;
      color: #0284C7 !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = null;
    var heatmapGroup = null;
    var tankersGroup = null;

    var currentFleet = ${JSON.stringify(initialFleet)};
    var currentZones = ${JSON.stringify(initialZones)};
    var currentShowHeatmap = ${initialShowHeatmap ? 'true' : 'false'};
    var currentSelectedCapacity = ${initialSelectedCapacity !== null ? initialSelectedCapacity : 'null'};
    var currentSelectedTankerId = ${initialSelectedTankerId ? `'${initialSelectedTankerId}'` : 'null'};

    function getZoneSurgeData(deficitPct) {
      if (deficitPct >= 80) return { multiplier: '⚡ 2.2x', label: 'CRISIS SURGE', color: '#DC2626', radius: 1400 };
      if (deficitPct >= 70) return { multiplier: '⚡ 1.8x', label: 'HIGH SURGE', color: '#EA580C', radius: 1200 };
      if (deficitPct >= 55) return { multiplier: '⚡ 1.5x', label: 'ELEVATED', color: '#D97706', radius: 1000 };
      if (deficitPct >= 40) return { multiplier: '⚡ 1.2x', label: 'MODERATE', color: '#EAB308', radius: 850 };
      return { multiplier: '1.0x', label: 'OPTIMAL', color: '#10B981', radius: 700 };
    }

    function renderHeatmap() {
      if (!heatmapGroup) return;
      heatmapGroup.clearLayers();
      if (!currentShowHeatmap) return;

      currentZones.forEach(function(zone) {
        var pct = zone.deficit_percentage !== undefined 
          ? zone.deficit_percentage 
          : (parseInt(String(zone.deficit_level || '').replace(/[^0-9]/g, ''), 10) || 50);
        var surge = getZoneSurgeData(pct);
        var lat = parseFloat(zone.center_lat);
        var lng = parseFloat(zone.center_lng);
        var color = zone.color || surge.color;

        // 1. Outer Thermal Halo
        L.circle([lat, lng], {
          radius: surge.radius,
          fillColor: color,
          fillOpacity: 0.16,
          stroke: false,
          interactive: false,
        }).addTo(heatmapGroup);

        // 2. Mid Density Ring
        L.circle([lat, lng], {
          radius: surge.radius * 0.55,
          fillColor: color,
          fillOpacity: 0.28,
          color: color,
          weight: 1.5,
          dashArray: '5, 5',
          interactive: false,
        }).addTo(heatmapGroup);

        // 3. Floating Uber/Ola Surge Pill Marker
        var shortName = (zone.zone_name || '').split('/')[0].trim();
        var pillHtml = '<div class="uber-surge-pill" onclick="onZoneClick(' + lat + ',' + lng + ')">' +
          '<span class="surge-mult-badge" style="background:' + color + '; color:#FFF;">' + surge.multiplier + '</span>' +
          '<span>' + shortName + '</span>' +
          '<span class="surge-deficit-tag" style="color:' + color + ';">' + pct + '%</span>' +
          '</div>';

        var surgeIcon = L.divIcon({
          className: 'uber-surge-container',
          html: pillHtml,
          iconSize: [160, 32],
          iconAnchor: [80, 16],
        });

        L.marker([lat, lng], { icon: surgeIcon, zIndexOffset: 500 }).addTo(heatmapGroup);
      });
    }

    function renderTankers() {
      if (!tankersGroup) return;
      tankersGroup.clearLayers();

      currentFleet.forEach(function(tanker) {
        if (!tanker.is_online) return;
        if (currentSelectedCapacity && tanker.capacity_liters !== currentSelectedCapacity) return;

        var isSelected = tanker.id === currentSelectedTankerId;
        var isAvail = tanker.is_available;
        var capText = tanker.capacity_liters >= 1000 ? (tanker.capacity_liters / 1000) + 'k' : tanker.capacity_liters + 'L';
        var bubbleClass = isSelected ? 'bubble-selected' : (isAvail ? 'bubble-available' : 'bubble-busy');

        var markerHtml = '<div class="tanker-marker-wrap" onclick="onTankerClick(\'' + tanker.id + '\')">' +
          '<div class="tanker-bubble ' + bubbleClass + '">' +
          '<span class="radar-pulse-dot"></span>' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>' +
          '<span>' + capText + '</span>' +
          '</div>' +
          '<div class="plate-chip">' + tanker.vehicle_number + '</div>' +
          '</div>';

        var tankerIcon = L.divIcon({
          className: 'tanker-pin-div',
          html: markerHtml,
          iconSize: [90, 48],
          iconAnchor: [45, 24],
        });

        L.marker([parseFloat(tanker.latitude), parseFloat(tanker.longitude)], {
          icon: tankerIcon,
          zIndexOffset: isSelected ? 2000 : 1000,
        }).addTo(tankersGroup);
      });
    }

    window.onTankerClick = function(id) {
      window.parent.postMessage({ type: 'SELECT_TANKER', tankerId: id }, '*');
    };

    window.onZoneClick = function(lat, lng) {
      if (map) map.flyTo([lat, lng], 15, { duration: 1.2 });
    };

    function initMap() {
      if (typeof L === 'undefined') {
        setTimeout(initMap, 50);
        return;
      }
      if (map) return;

      try {
        map = L.map('map', {
          zoomControl: true,
          attributionControl: false,
          minZoom: 10,
          maxZoom: 18,
        }).setView([${initialLat}, ${initialLng}], ${initialZoom});

        var cartoUrl = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoKey}';
        var cartoLayer = L.tileLayer(cartoUrl, {
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(map);

        cartoLayer.on('tileerror', function() {
          if (!window._fallbackTriggered) {
            window._fallbackTriggered = true;
            console.warn('Carto tile error, fallback to OpenStreetMap');
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
          }
        });

        heatmapGroup = L.layerGroup().addTo(map);
        tankersGroup = L.layerGroup().addTo(map);

        map.on('click', function(e) {
          if (e.originalEvent && (e.originalEvent.target.id === 'map' || (e.originalEvent.target.classList && e.originalEvent.target.classList.contains('leaflet-container')))) {
            window.parent.postMessage({ type: 'DESELECT_TANKER' }, '*');
          }
        });

        renderHeatmap();
        renderTankers();

        window.parent.postMessage({ type: 'MAP_READY' }, '*');
      } catch (err) {
        console.error('Failed to init Leaflet map:', err);
      }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initMap();
    } else {
      window.addEventListener('load', initMap);
    }
    setTimeout(initMap, 100);

    window.addEventListener('message', function(event) {
      if (!event.data || typeof event.data !== 'object') return;
      var data = event.data;

      if (data.type === 'UPDATE_DATA') {
        currentFleet = data.fleetTankers || [];
        currentZones = data.deficitZones || [];
        currentShowHeatmap = data.showHeatmap !== undefined ? data.showHeatmap : currentShowHeatmap;
        currentSelectedCapacity = data.selectedCapacity;
        currentSelectedTankerId = data.selectedTankerId;
        renderHeatmap();
        renderTankers();
      } else if (data.type === 'FLY_TO') {
        if (map) map.flyTo([data.lat, data.lng], data.zoom || 15, { duration: 1.2 });
      } else if (data.type === 'RECENTER') {
        if (map) map.flyTo([${initialLat}, ${initialLng}], 13, { duration: 1 });
      }
    });
  </script>
</body>
</html>`;
}

export const AdminFleetMapView: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = true }) => {
  const {
    fleetTankers,
    deficitZones,
    fetchDeficitZones,
    fetchFleetTankers,
    subscribeToLiveFleetAndHeatmap,
  } = useAdminStore();

  const [zoom, setZoom] = useState<number>(13);
  const [centerLat, setCenterLat] = useState<number>(MAROL_HQ_LAT);
  const [centerLng, setCenterLng] = useState<number>(MAROL_HQ_LNG);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [selectedCapacity, setSelectedCapacity] = useState<number | null>(null);
  const [selectedTanker, setSelectedTanker] = useState<FleetTankerItem | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Web iframe reference
  const iframeRef = useRef<any>(null);

  // Initial data fetch & realtime subscription
  useEffect(() => {
    fetchDeficitZones();
    fetchFleetTankers();
    const unsubscribe = subscribeToLiveFleetAndHeatmap();
    return () => {
      unsubscribe();
    };
  }, [fetchDeficitZones, fetchFleetTankers, subscribeToLiveFleetAndHeatmap]);

  // Center on live zone epicenter when zones arrive
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

  // Handle messages from Web Leaflet iframe
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'SELECT_TANKER') {
        const found = fleetTankers.find((t) => t.id === event.data.tankerId);
        if (found) {
          setSelectedTanker(found);
        }
      } else if (event.data.type === 'DESELECT_TANKER') {
        setSelectedTanker(null);
      } else if (event.data.type === 'MAP_READY') {
        try {
          iframeRef.current?.contentWindow?.postMessage(
            {
              type: 'UPDATE_DATA',
              fleetTankers: filteredTankers,
              deficitZones,
              showHeatmap,
              selectedCapacity,
              selectedTankerId: selectedTanker?.id,
            },
            '*'
          );
        } catch {
          // Non-blocking sync
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [fleetTankers]);

  // Synchronize state changes to Leaflet iframe
  useEffect(() => {
    if (Platform.OS !== 'web' || !iframeRef.current?.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'UPDATE_DATA',
          fleetTankers: filteredTankers,
          deficitZones,
          showHeatmap,
          selectedCapacity,
          selectedTankerId: selectedTanker?.id,
        },
        '*'
      );
    } catch {
      // Non-blocking sync
    }
  }, [filteredTankers, deficitZones, showHeatmap, selectedCapacity, selectedTanker]);

  // Navigation: Fly to specific hotspot / coordinates
  const handleFlyTo = (lat: number, lng: number, zoomLevel = 15) => {
    setCenterLat(lat);
    setCenterLng(lng);
    setZoom(zoomLevel);

    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'FLY_TO',
          lat,
          lng,
          zoom: zoomLevel,
        },
        '*'
      );
    }
  };

  // Recenter to Marol HQ
  const handleRecenter = () => {
    handleFlyTo(MAROL_HQ_LAT, MAROL_HQ_LNG, 13);
  };

  // Native PanResponder for mobile touch dragging
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        setPanOffset({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        const deltaX = gestureState.dx;
        const deltaY = gestureState.dy;
        const scale = Math.pow(2, zoom);
        const lngShift = -(deltaX / TILE_SIZE) * (360 / scale);
        const latShift = (deltaY / TILE_SIZE) * (180 / scale);

        setCenterLat((prev) => Math.max(-85, Math.min(85, prev + latShift)));
        setCenterLng((prev) => ((prev + lngShift + 180) % 360) - 180);
        setPanOffset({ x: 0, y: 0 });
      },
    });
  }, [zoom]);

  // Memoized HTML for Web Leaflet map
  const leafletHtml = useMemo(() => {
    return buildLeafletHtml(
      centerLat,
      centerLng,
      zoom,
      CARTO_KEY,
      filteredTankers,
      deficitZones,
      showHeatmap,
      selectedCapacity,
      selectedTanker?.id || null
    );
  }, [CARTO_KEY]);

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
      <View style={[styles.mapWrapper, isDesktop && styles.mapWrapperDesktop]}>
        {/* Real Leaflet Map Container for Web */}
        {Platform.OS === 'web' ? (
          <View style={styles.mapCanvasBox}>
            {React.createElement('iframe', {
              ref: iframeRef,
              srcDoc: leafletHtml,
              style: {
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#F8FAFC',
              },
              title: 'TANKR Mumbai Live Fleet Map',
            })}
          </View>
        ) : (
          /* Native Interactive Touch-Pannable View Fallback */
          <View style={styles.mapCanvasBox} {...panResponder.panHandlers}>
            <View style={[styles.nativeCenterTarget, { transform: [{ translateX: panOffset.x }, { translateY: panOffset.y }] }]}>
              <Text style={styles.nativeNotice}>
                Drag to explore Mumbai (Marol, Sakinaka, Andheri, Powai).
              </Text>
            </View>
          </View>
        )}

        {/* Floating Uber / Ola Demand Surge Legend (Bottom-Left) */}
        <View style={styles.floatingLegend}>
          <View style={styles.legendHeaderRow}>
            <Ionicons name="analytics" size={13} color="#CBD5E1" />
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

        {/* 4. SAMSARA / UBER FLEET TELEMETRY DRAWER (FLOATING OVERLAY) */}
        {selectedTanker && (
          <View style={[styles.telemetryDrawer, !isDesktop && styles.telemetryDrawerMobile]}>
            {/* Drawer Header */}
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

            {/* Live Operational Status */}
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
                {selectedTanker.is_available ? 'ONLINE & READY FOR RAPID DISPATCH' : 'ENGAGED IN ACTIVE WATER DELIVERY'}
              </Text>
            </View>

            {/* Driver Dossier */}
            <View style={styles.driverCard}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitials}>
                  {selectedTanker.driver_name
                    ? selectedTanker.driver_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'DR'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.driverName}>{selectedTanker.driver_name || 'Assigned Driver'}</Text>
                  <Ionicons name="checkmark-circle" size={16} color="#0284C7" />
                </View>
                <Text style={styles.driverPhone}>{selectedTanker.driver_phone || '+91 98200 11001'}</Text>
              </View>
              <Pressable
                onPress={() => {
                  if (selectedTanker.driver_phone) {
                    Linking.openURL(`tel:${selectedTanker.driver_phone}`).catch(() => {});
                  }
                }}
                style={styles.callDriverBtn}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* 4 Telemetry Metrics */}
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
                <Text style={styles.metricSub}>BIS-10500 Certified</Text>
              </View>

              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>LIVE GPS FIX</Text>
                <Text style={styles.metricVal}>
                  {selectedTanker.latitude.toFixed(4)}, {selectedTanker.longitude.toFixed(4)}
                </Text>
                <Text style={styles.metricSub}>Marol / Andheri Sector</Text>
              </View>

              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>BASE PRICING</Text>
                <Text style={[styles.metricVal, { color: '#059669' }]}>₹{selectedTanker.base_price || 750}</Text>
                <Text style={styles.metricSub}>Standard Dispatch</Text>
              </View>
            </View>

            {/* IoT Digital Flow Meter & Sensor Readout */}
            <View style={styles.iotCard}>
              <View style={styles.iotHeader}>
                <Ionicons name="speedometer-outline" size={16} color="#0284C7" />
                <Text style={styles.iotTitle}>IoT Flow Meter & Sensor Telemetry</Text>
              </View>
              <Text style={styles.iotDesc}>
                Calibrated digital telemetry streaming real-time dispensing logs via Bluetooth BLE.
              </Text>
              <View style={styles.iotStatsRow}>
                <View style={styles.iotStatItem}>
                  <Text style={styles.iotStatKey}>Valve Status</Text>
                  <Text style={[styles.iotStatVal, { color: '#16A34A' }]}>SEALED</Text>
                </View>
                <View style={styles.iotStatItem}>
                  <Text style={styles.iotStatKey}>Calibration</Text>
                  <Text style={styles.iotStatVal}>ISO 4064 B</Text>
                </View>
                <View style={styles.iotStatItem}>
                  <Text style={styles.iotStatKey}>Water Purity</Text>
                  <Text style={styles.iotStatVal}>TDS 165 ppm</Text>
                </View>
              </View>
            </View>

            {/* Quick Dispatch Actions */}
            <View style={styles.actionButtonsRow}>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'Rebalance Order Issued',
                    `Tanker ${selectedTanker.vehicle_number} has been instructed to reposition to Marol MIDC deficit hotspot with priority routing.`
                  );
                }}
                style={styles.rebalanceBtn}
              >
                <Ionicons name="flash" size={16} color="#FFFFFF" />
                <Text style={styles.rebalanceBtnText}>Reposition to Hotspot</Text>
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.card,
  },

  // 1. TOOLBAR
  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  toolbarLeft: {
    flex: 1,
    minWidth: 280,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolbarTitle: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  telemetryLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  heatmapToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: borderRadius.md,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  filterChipActive: {
    backgroundColor: '#0284C7',
    ...shadows.subtle,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },

  // 2. QUICK ZONES BAR
  quickZonesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
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
  },
  zoneJumpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    ...shadows.subtle,
  },
  surgeMiniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
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

  // 3. MAP WRAPPER
  mapWrapper: {
    position: 'relative',
    width: '100%',
    height: 520,
    backgroundColor: '#F8FAFC',
  },
  mapWrapperDesktop: {
    height: 640,
  },
  mapCanvasBox: {
    width: '100%',
    height: '100%',
  },
  nativeCenterTarget: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  nativeNotice: {
    color: '#64748B',
    fontSize: 13,
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

  // 4. TELEMETRY DRAWER (FLOATING SAMSARA / UBER FLEET DESK)
  telemetryDrawer: {
    position: 'absolute',
    top: 16,
    right: 16,
    bottom: 16,
    width: 390,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
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
