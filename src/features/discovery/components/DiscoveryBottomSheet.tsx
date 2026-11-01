import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { EmptyState } from '../../../components/common/Feedback/EmptyState';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { PriceDisplay } from '../../../components/common/Card/PriceDisplay';
import { TankerCardSkeleton } from '../../../components/common/Feedback/Skeleton';
import { WaterQualityBadge } from './WaterQualityBadge';
import {
  NearbyTanker,
  TANKER_CONFIGURABLE_CATEGORIES,
  TankerCapacityLiters,
  TankerSortOption,
} from '../../../types/discovery';
import { borderRadius, colors, fontSizes, fontWeights, shadows, spacing } from '../../../theme';
import { haptics } from '../../../theme/haptics';
import { useReducedMotion } from '../../../theme/motion';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// 3 Snap Heights
const SNAP_HEIGHTS = {
  collapsed: 140,
  intermediate: Math.min(420, SCREEN_HEIGHT * 0.52),
  expanded: Math.min(680, SCREEN_HEIGHT * 0.85),
};

export type BottomSheetSnapState = 'collapsed' | 'intermediate' | 'expanded';

interface DiscoveryBottomSheetProps {
  tankers: NearbyTanker[];
  selectedTankerId: string | null;
  selectedCapacityFilter: TankerCapacityLiters | null;
  sortOption: TankerSortOption;
  isLoading: boolean;
  isRefreshing: boolean;
  deliveryAddress: string;
  snapState?: BottomSheetSnapState;
  onSnapStateChange?: (state: BottomSheetSnapState) => void;
  onChangeAddress: () => void;
  onRefresh: () => void;
  onSelectTanker: (tankerId: string) => void;
  onSelectCapacityFilter: (capacity: TankerCapacityLiters | null) => void;
  onSelectSortOption: (sort: TankerSortOption) => void;
  onBookSelectedTanker: (tanker: NearbyTanker) => void;
}

export const DiscoveryBottomSheet: React.FC<DiscoveryBottomSheetProps> = ({
  tankers,
  selectedTankerId,
  selectedCapacityFilter,
  sortOption,
  isLoading,
  isRefreshing,
  deliveryAddress,
  snapState = 'intermediate',
  onSnapStateChange,
  onChangeAddress,
  onRefresh,
  onSelectTanker,
  onSelectCapacityFilter,
  onSelectSortOption,
  onBookSelectedTanker,
}) => {
  const [currentSnap, setCurrentSnap] = useState<BottomSheetSnapState>(snapState);
  const currentSnapRef = useRef<BottomSheetSnapState>(snapState);
  const heightAnim = useRef(new Animated.Value(SNAP_HEIGHTS[snapState])).current;
  const isReducedMotion = useReducedMotion();

  const animateToSnap = (nextSnap: BottomSheetSnapState) => {
    currentSnapRef.current = nextSnap;
    setCurrentSnap(nextSnap);
    onSnapStateChange?.(nextSnap);
    haptics.lightImpact();
    if (isReducedMotion) {
      heightAnim.setValue(SNAP_HEIGHTS[nextSnap]);
    } else {
      Animated.spring(heightAnim, {
        toValue: SNAP_HEIGHTS[nextSnap],
        useNativeDriver: false,
        tension: 200,
        friction: 22,
      }).start();
    }
  };

  // Sync state if snapState prop changes externally
  useEffect(() => {
    if (snapState && snapState !== currentSnapRef.current) {
      animateToSnap(snapState);
    }
  }, [snapState]);

  // PanResponder to handle drag gestures smoothly without blocking child taps
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 8;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 8;
      },
      onPanResponderRelease: (_, gestureState) => {
        const snap = currentSnapRef.current;
        const { dy, vy } = gestureState;

        // Downward drag or swipe
        if (dy > 30 || vy > 0.4) {
          if (snap === 'expanded') {
            animateToSnap('intermediate');
          } else if (snap === 'intermediate') {
            animateToSnap('collapsed');
          }
        }
        // Upward drag or swipe
        else if (dy < -30 || vy < -0.4) {
          if (snap === 'collapsed') {
            animateToSnap('intermediate');
          } else if (snap === 'intermediate') {
            animateToSnap('expanded');
          }
        }
      },
    })
  ).current;

  const selectedTanker = tankers.find((t) => t.tanker_id === selectedTankerId) || tankers[0];

  const getCapacityDisplay = (liters: number) => {
    return `${liters.toLocaleString('en-IN')} L`;
  };

  return (
    <Animated.View style={[styles.sheetContainer, { height: heightAnim }]}>
      {/* Draggable Header Bar */}
      <View {...panResponder.panHandlers} style={styles.dragHandleWrapper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            currentSnap === 'expanded'
              ? 'Collapse to half screen'
              : currentSnap === 'collapsed'
              ? 'Expand to half screen'
              : 'Expand to full screen'
          }
          onPress={() => {
            if (currentSnap === 'expanded') animateToSnap('intermediate');
            else if (currentSnap === 'collapsed') animateToSnap('intermediate');
            else animateToSnap('expanded');
          }}
          style={styles.dragBarHitArea}
        >
          <View style={styles.dragBar} />
        </Pressable>
      </View>

      {/* 1. Delivering To Address Row (Visible in all states) */}
      <View style={styles.destinationBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change delivery address"
          onPress={onChangeAddress}
          style={styles.destinationPressable}
        >
          <View style={styles.destinationIconCircle}>
            <Ionicons name="location" size={16} color={colors.primary} />
          </View>
          <View style={styles.destinationTextCol}>
            <Text style={styles.destinationTitle}>DELIVERING TO</Text>
            <Text numberOfLines={1} style={styles.destinationAddress}>
              {deliveryAddress}
            </Text>
          </View>
          <View style={styles.changePill}>
            <Text style={styles.changePillText}>Change</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.primary} />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh nearby availability"
          onPress={onRefresh}
          disabled={isRefreshing}
          style={styles.refreshButton}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="sync" size={16} color={colors.darkNavy} />
          )}
        </Pressable>

        {currentSnap === 'expanded' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Collapse fleet sheet"
            onPress={() => animateToSnap('intermediate')}
            style={styles.collapseCircleBtn}
          >
            <Ionicons name="chevron-down" size={18} color={colors.darkNavy} />
          </Pressable>
        )}
      </View>

      {/* STATE A: COLLAPSED VIEW */}
      {currentSnap === 'collapsed' && selectedTanker && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Expand fleet options"
          accessibilityHint="Tap to expand available tanker fleet and booking details"
          onPress={() => animateToSnap('intermediate')}
          style={styles.collapsedSummaryCard}
        >
          <View style={styles.collapsedInfo}>
            <View style={styles.collapsedBadgeRow}>
              <View style={styles.capacityBadge}>
                <Ionicons name="water" size={12} color={colors.primary} />
                <Text style={styles.capacityBadgeText}>
                  {getCapacityDisplay(selectedTanker.capacity_liters)}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.collapsedSupplierText}>
                {selectedTanker.supplier_name}
              </Text>
            </View>
            <Text style={styles.collapsedEtaText}>
              Arriving in ~{selectedTanker.eta_minutes} mins • {selectedTanker.distance_km} km away
            </Text>
          </View>

          <View style={styles.collapsedPriceCol}>
            <Text style={styles.collapsedPriceText}>
              ₹{selectedTanker.estimated_total_price}
            </Text>
            <Text style={styles.tapToViewText}>View Fleet ➔</Text>
          </View>
        </Pressable>
      )}

      {/* STATE B & C: INTERMEDIATE OR EXPANDED VIEW */}
      {currentSnap !== 'collapsed' && (
        <ScrollView
          style={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Capacity Filters */}
          <View style={styles.filterSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="All Capacities"
                onPress={() => {
                  haptics.selection();
                  onSelectCapacityFilter(null);
                }}
                style={[
                  styles.filterChip,
                  selectedCapacityFilter === null && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCapacityFilter === null && styles.filterChipTextActive,
                  ]}
                >
                  All ({tankers.length})
                </Text>
              </Pressable>

              {TANKER_CONFIGURABLE_CATEGORIES.map((cat) => {
                const isSelected = selectedCapacityFilter === cat.capacity;
                return (
                  <Pressable
                    key={cat.capacity}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat.label} filter`}
                    onPress={() => {
                      haptics.selection();
                      onSelectCapacityFilter(cat.capacity);
                    }}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Sorting Row */}
          <View style={styles.sortBar}>
            <Text style={styles.fleetCount}>
              {tankers.length} Tanker{tankers.length === 1 ? '' : 's'} available
            </Text>
            <View style={styles.sortOptionsRow}>
              {(['distance', 'price', 'eta'] as TankerSortOption[]).map((opt) => (
                <Pressable
                  key={opt}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${opt}`}
                  onPress={() => {
                    haptics.selection();
                    onSelectSortOption(opt);
                  }}
                  style={[
                    styles.sortTab,
                    sortOption === opt && styles.sortTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sortTabText,
                      sortOption === opt && styles.sortTabTextActive,
                    ]}
                  >
                    {opt === 'distance' ? 'Nearest' : opt === 'price' ? 'Price' : 'Fastest'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Loading Skeleton */}
          {isLoading && (
            <View style={styles.listWrap}>
              <TankerCardSkeleton />
              <TankerCardSkeleton />
            </View>
          )}

          {/* Empty State */}
          {!isLoading && tankers.length === 0 && (
            <EmptyState
              title="No Available Tankers Nearby"
              description="No certified water logistics tankers currently match your capacity or area filter. Try expanding your search."
              iconName="water-outline"
              actionTitle="Show All Tankers"
              onAction={() => onSelectCapacityFilter(null)}
            />
          )}

          {/* List of Tankers */}
          {!isLoading && tankers.length > 0 && (
            <View style={styles.listWrap}>
              {tankers.map((tanker) => {
                const isSelected = selectedTanker?.tanker_id === tanker.tanker_id;
                return (
                  <Pressable
                    key={tanker.tanker_id}
                    accessibilityRole="button"
                    accessibilityLabel={`${tanker.supplier_name}, ${tanker.capacity_liters} Litres, ₹${tanker.estimated_total_price}, Arriving in ${tanker.eta_minutes} minutes`}
                    accessibilityState={{ selected: isSelected }}
                    accessibilityHint={isSelected ? 'Currently selected for delivery' : 'Double tap to select this tanker'}
                    onPress={() => {
                      haptics.selection();
                      onSelectTanker(tanker.tanker_id);
                    }}
                    style={({ pressed }) => [
                      styles.tankerCard,
                      isSelected && styles.tankerCardSelected,
                      pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.capacityBadge}>
                        <Ionicons name="water" size={13} color={colors.primary} />
                        <Text style={styles.capacityBadgeText}>
                          {getCapacityDisplay(tanker.capacity_liters)}
                        </Text>
                      </View>
                      <StatusBadge label={`${tanker.eta_minutes} mins ETA`} variant="info" size="sm" />
                    </View>

                    <View style={styles.cardBody}>
                      <View style={styles.cardBodyText}>
                        <Text numberOfLines={1} style={styles.supplierTitle}>
                          {tanker.supplier_name}
                        </Text>
                        <Text style={styles.regNumber}>
                          {tanker.vehicle_number} • {tanker.distance_km} km away
                        </Text>
                      </View>

                      <View style={styles.cardPriceBox}>
                        <Text style={styles.priceEstimate}>₹{tanker.estimated_total_price}</Text>
                        <Text style={styles.priceSubtext}>incl. GST</Text>
                      </View>
                    </View>

                    {isSelected && (
                      <View style={styles.selectedIndicatorRow}>
                        <Text style={styles.selectedIndicatorText}>Selected for Delivery</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="View full specifications"
                          onPress={() => animateToSnap('expanded')}
                          style={styles.viewDetailsBtn}
                        >
                          <Text style={styles.viewDetailsBtnText}>Details ➔</Text>
                        </Pressable>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* STATE C: EXPANDED VIEW DETAILED BREAKDOWN */}
          {currentSnap === 'expanded' && selectedTanker && (
            <View style={styles.expandedDetailsSection}>
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsTitle}>Booking Breakdown & Security</Text>
                <WaterQualityBadge />
              </View>

              <PriceDisplay
                finalAmount={selectedTanker.estimated_total_price}
                basePrice={selectedTanker.base_price}
                deliveryCharge={Math.round(selectedTanker.distance_km * selectedTanker.price_per_km * 100) / 100}
                taxAmount={Math.round(selectedTanker.estimated_total_price * 0.05 * 100) / 100}
                showBreakdown={true}
                size="lg"
                style={{ width: '100%', marginVertical: spacing.md }}
              />

              <View style={styles.pinSecurityNotice}>
                <Ionicons name="shield-checkmark" size={18} color={colors.success} />
                <Text style={styles.pinSecurityText}>
                  Digital Metering Guarantee: Share your 4-digit PIN only when the driver is ready to pump into your sump.
                </Text>
              </View>
            </View>
          )}

          {/* Bottom Padding */}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* Sticky Bottom Booking Action Button (Visible in intermediate and expanded) */}
      {currentSnap !== 'collapsed' && selectedTanker && (
        <View style={styles.stickyFooter}>
          <Button
            title={`Proceed to Book (${getCapacityDisplay(selectedTanker.capacity_liters)} • ₹${selectedTanker.estimated_total_price})`}
            onPress={() => onBookSelectedTanker(selectedTanker)}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardSurface,
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    zIndex: 100,
    ...shadows.modal,
  },
  dragHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 2,
    position: 'relative',
    minHeight: 28,
    justifyContent: 'center',
  },
  dragBarHitArea: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragBar: {
    width: 48,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardBorder,
  },
  destinationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  destinationPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.xl,
    marginRight: spacing.xs,
  },
  destinationIconCircle: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  destinationTextCol: {
    flex: 1,
  },
  destinationTitle: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  destinationAddress: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changePillText: {
    fontSize: fontSizes.xs - 1,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  collapsedSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  collapsedInfo: {
    flex: 1,
  },
  collapsedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  collapsedSupplierText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    flexShrink: 1,
  },
  collapsedEtaText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  collapsedPriceCol: {
    alignItems: 'flex-end',
  },
  collapsedPriceText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heavy,
    color: colors.primary,
  },
  tapToViewText: {
    fontSize: fontSizes.xs - 1,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  filterSection: {
    marginVertical: spacing.xs,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  fleetCount: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  sortOptionsRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  sortTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  sortTabActive: {
    backgroundColor: colors.white,
    ...shadows.subtle,
  },
  sortTabText: {
    fontSize: fontSizes.xs - 1,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  sortTabTextActive: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  listWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  tankerCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  tankerCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  capacityBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBodyText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  supplierTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  regNumber: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardPriceBox: {
    alignItems: 'flex-end',
  },
  priceEstimate: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
  },
  priceSubtext: {
    fontSize: 9,
    color: colors.textMuted,
  },
  selectedIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(11, 100, 192, 0.15)',
  },
  selectedIndicatorText: {
    fontSize: fontSizes.xs - 1,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  viewDetailsBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xs,
  },
  viewDetailsBtnText: {
    fontSize: fontSizes.xs - 1,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  expandedDetailsSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  pinSecurityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pinSecurityText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.darkNavy,
    lineHeight: 16,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    ...shadows.floating,
  },
});
