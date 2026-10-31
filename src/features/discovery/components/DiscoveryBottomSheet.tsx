import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { Card } from '../../../components/common/Card/Card';
import { EmptyState } from '../../../components/common/Feedback/EmptyState';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { TankerCardSkeleton } from '../../../components/common/Feedback/Skeleton';
import { WaterQualityBadge } from './WaterQualityBadge';
import {
  NearbyTanker,
  TANKER_CONFIGURABLE_CATEGORIES,
  TankerCapacityLiters,
  TankerSortOption,
} from '../../../types/discovery';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface DiscoveryBottomSheetProps {
  tankers: NearbyTanker[];
  selectedTankerId: string | null;
  selectedCapacityFilter: TankerCapacityLiters | null;
  sortOption: TankerSortOption;
  isLoading: boolean;
  isRefreshing: boolean;
  deliveryAddress: string;
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
  onChangeAddress,
  onRefresh,
  onSelectTanker,
  onSelectCapacityFilter,
  onSelectSortOption,
  onBookSelectedTanker,
}) => {
  const selectedTanker = tankers.find((t) => t.tanker_id === selectedTankerId) || tankers[0];

  const getCapacityDisplay = (liters: number) => {
    return `${liters.toLocaleString('en-IN')} L`;
  };

  return (
    <View style={styles.sheetContainer}>
      {/* Draggable Drag Handle Bar */}
      <View style={styles.dragHandleWrapper}>
        <View style={styles.dragBar} />
      </View>

      {/* Delivery Destination Row */}
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

        {/* Refresh Availability */}
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
      </View>

      {/* Configurable Capacity Filter Chips */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="All Capacities"
            onPress={() => onSelectCapacityFilter(null)}
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
              All Capacities ({tankers.length})
            </Text>
          </Pressable>

          {TANKER_CONFIGURABLE_CATEGORIES.map((cat) => {
            const isSelected = selectedCapacityFilter === cat.capacity;
            return (
              <Pressable
                key={cat.capacity}
                accessibilityRole="button"
                accessibilityLabel={`${cat.label} Filter`}
                onPress={() => onSelectCapacityFilter(cat.capacity)}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                ]}
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

      {/* Sort Options Strip */}
      <View style={styles.sortStrip}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {(
          [
            { id: 'distance', label: 'Nearest' },
            { id: 'price', label: 'Lowest Price' },
            { id: 'eta', label: 'Fastest ETA' },
          ] as const
        ).map((s) => {
          const isSelected = sortOption === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => onSelectSortOption(s.id)}
              style={[styles.sortPill, isSelected && styles.sortPillActive]}
            >
              <Text
                style={[
                  styles.sortPillText,
                  isSelected && styles.sortPillTextActive,
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Tankers List */}
      <ScrollView
        style={styles.tankersScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.tankersScrollContent}
      >
        {isLoading ? (
          <View style={{ paddingVertical: spacing.sm }}>
            <TankerCardSkeleton />
            <TankerCardSkeleton />
            <TankerCardSkeleton />
          </View>
        ) : tankers.length === 0 ? (
          <EmptyState
            title="No Tankers Available"
            description="No active tankers found for this capacity filter in your delivery radius. Try selecting 'All Capacities'."
            actionTitle="Reset Filters"
            onAction={() => onSelectCapacityFilter(null)}
          />
        ) : (
          tankers.map((tanker) => {
            const isSelected = selectedTankerId === tanker.tanker_id;

            return (
              <Card
                key={tanker.tanker_id}
                selected={isSelected}
                variant={isSelected ? 'elevated' : 'outlined'}
                onPress={() => onSelectTanker(tanker.tanker_id)}
                style={styles.tankerCardContainer}
                contentStyle={styles.tankerCardContent}
                accessibilityLabel={`${tanker.supplier_name}, ${tanker.capacity_liters} Liters, ₹${tanker.estimated_total_price}`}
              >
                <View style={styles.tankerMainRow}>
                  {/* Left Vehicle Avatar */}
                  <View
                    style={[
                      styles.tankerAvatar,
                      isSelected && styles.tankerAvatarSelected,
                    ]}
                  >
                    <Ionicons
                      name="water"
                      size={22}
                      color={isSelected ? colors.primary : colors.secondary}
                    />
                    <Text style={styles.avatarCapacityText}>
                      {(tanker.capacity_liters / 1000).toFixed(0)}kL
                    </Text>
                  </View>

                  {/* Middle Info Column */}
                  <View style={styles.tankerInfoCol}>
                    <View style={styles.supplierTitleRow}>
                      <Text numberOfLines={1} style={styles.supplierName}>
                        {tanker.supplier_name}
                      </Text>
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color={colors.primary}
                      />
                    </View>

                    <Text style={styles.vehicleSubtitle}>
                      {tanker.vehicle_number} {tanker.driver_name ? `• ${tanker.driver_name}` : ''}
                    </Text>

                    <View style={styles.metricsRow}>
                      <StatusBadge
                        label={`${tanker.eta_minutes} mins`}
                        variant={tanker.eta_minutes <= 18 ? 'success' : 'primary'}
                        size="sm"
                      />
                      <Text style={styles.distanceMetricText}>
                        {tanker.distance_km} km away
                      </Text>
                      <View style={styles.verifiedGradePill}>
                        <Text style={styles.verifiedGradeText}>
                          {tanker.water_type.includes('Potable') ? 'Potable BIS-10500' : 'Filtered Utility'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right Price Column */}
                  <View style={styles.priceColumn}>
                    <Text style={styles.priceValue}>
                      ₹{tanker.estimated_total_price.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.priceSubtext}>all incl.</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Book ${tanker.capacity_liters}L for ₹${tanker.estimated_total_price}`}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        onBookSelectedTanker(tanker);
                      }}
                      style={({ pressed }) => [styles.cardBookBtn, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={styles.cardBookBtnText}>Book</Text>
                      <Ionicons name="arrow-forward" size={11} color={colors.white} />
                    </Pressable>
                  </View>
                </View>

                {isSelected && (
                  <View style={{ marginTop: spacing.xs }}>
                    <WaterQualityBadge
                      sourceType={tanker.water_type}
                      tdsPpm={tanker.water_type.includes('Potable') ? 165 : tanker.water_type.includes('Filtered') ? 280 : 450}
                      phLevel={tanker.water_type.includes('Potable') ? 7.2 : tanker.water_type.includes('Filtered') ? 7.4 : 7.6}
                    />
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Sleek Floating Booking Action Dock */}
      {selectedTanker && (
        <View style={styles.floatingDock}>
          <View style={styles.dockDetailsCol}>
            <View style={styles.dockTitleRow}>
              <Ionicons name="water" size={14} color={colors.primary} />
              <Text style={styles.dockCapacityText}>
                {getCapacityDisplay(selectedTanker.capacity_liters)}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.dockSubtext}>
              {selectedTanker.supplier_name} • ~{selectedTanker.eta_minutes}m
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Confirm Book ${selectedTanker.capacity_liters} Liters for ₹${selectedTanker.estimated_total_price}`}
            onPress={() => onBookSelectedTanker(selectedTanker)}
            style={({ pressed }) => [
              styles.dockCtaButton,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.dockCtaPrice}>
              ₹{selectedTanker.estimated_total_price.toLocaleString('en-IN')}
            </Text>
            <View style={styles.dockCtaDivider} />
            <Text style={styles.dockCtaText}>Book Tanker</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.white} />
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
    backgroundColor: colors.cardSurface,
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    ...shadows.modal,
  },
  dragHandleWrapper: {
    width: '100%',
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragBar: {
    width: 42,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardBorder,
  },
  destinationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  destinationPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  destinationIconCircle: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
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
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  changePillText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    marginRight: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  filterSection: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  sortStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    backgroundColor: colors.backgroundMuted,
    gap: spacing.xs,
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginRight: 4,
  },
  sortPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  sortPillActive: {
    backgroundColor: colors.white,
    ...shadows.subtle,
  },
  sortPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  sortPillTextActive: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  tankersScroll: {
    flex: 1,
  },
  tankersScrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 48,
  },
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  tankerCardContainer: {
    marginVertical: 4,
  },
  tankerCardContent: {
    padding: spacing.sm,
  },
  tankerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tankerAvatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  tankerAvatarSelected: {
    backgroundColor: colors.primaryLight,
  },
  avatarCapacityText: {
    fontSize: 9,
    fontWeight: fontWeights.heavy,
    color: colors.primary,
    marginTop: -2,
  },
  tankerInfoCol: {
    flex: 1,
  },
  supplierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  supplierName: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    maxWidth: 160,
  },
  vehicleSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  distanceMetricText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  verifiedGradePill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  verifiedGradeText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: '#15803D',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.background,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  priceColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
  },
  priceSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: -2,
  },
  cardBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 3,
    marginTop: 4,
  },
  cardBookBtnText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: fontWeights.bold,
  },
  floatingDock: {
    position: 'absolute',
    bottom: 12,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 40,
    ...shadows.floating,
  },
  dockDetailsCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  dockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dockCapacityText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  dockSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  dockCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.xl,
    gap: 6,
    ...shadows.subtle,
  },
  dockCtaPrice: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  dockCtaDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 2,
  },
  dockCtaText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
});

