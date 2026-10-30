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
            <Ionicons name="location" size={18} color={colors.primary} />
          </View>
          <View style={styles.destinationTextCol}>
            <Text style={styles.destinationTitle}>Where do you need water?</Text>
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
            <Ionicons name="sync" size={18} color={colors.darkNavy} />
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
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Searching nearby water tankers...</Text>
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
                      size={26}
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
                        size={16}
                        color={colors.primary}
                      />
                    </View>

                    <Text style={styles.vehicleSubtitle}>
                      {tanker.vehicle_number} • Driver: {tanker.driver_name}
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
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={11} color="#F59E0B" />
                        <Text style={styles.ratingText}>{tanker.rating}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Right Price Column */}
                  <View style={styles.priceColumn}>
                    <Text style={styles.priceValue}>
                      ₹{tanker.estimated_total_price.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.priceSubtext}>all incl.</Text>
                    <View style={styles.availableTag}>
                      <View style={styles.greenPulseDot} />
                      <Text style={styles.availableText}>Available</Text>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Sticky Bottom Booking Action */}
      {selectedTanker && (
        <View style={styles.stickyFooter}>
          <View style={styles.footerSummary}>
            <View>
              <Text style={styles.footerTankerName}>
                {selectedTanker.capacity_liters.toLocaleString('en-IN')}L • {selectedTanker.supplier_name}
              </Text>
              <Text style={styles.footerEta}>
                Arriving in ~{selectedTanker.eta_minutes} mins ({selectedTanker.distance_km} km)
              </Text>
            </View>
            <Text style={styles.footerPrice}>
              ₹{selectedTanker.estimated_total_price.toLocaleString('en-IN')}
            </Text>
          </View>

          <Button
            title={`Book ${getCapacityDisplay(selectedTanker.capacity_liters)} Tanker`}
            variant="primary"
            size="lg"
            onPress={() => onBookSelectedTanker(selectedTanker)}
            rightIcon={<Ionicons name="arrow-forward" size={20} color={colors.white} />}
          />
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
    borderRadius: borderRadius['2xl'],
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  destinationIconCircle: {
    width: 36,
    height: 36,
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
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  destinationAddress: {
    fontSize: 13,
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
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
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
    padding: spacing.md,
    paddingBottom: 110, // Avoid overlap with sticky footer
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
    marginVertical: spacing.xs,
  },
  tankerCardContent: {
    padding: spacing.md,
  },
  tankerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tankerAvatar: {
    width: 54,
    height: 54,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
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
  },
  distanceMetricText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
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
  availableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success,
  },
  availableText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: fontWeights.bold,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardSurface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: spacing.md,
    paddingBottom: 24,
    ...shadows.modal,
  },
  footerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  footerTankerName: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  footerEta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: fontWeights.heavy,
    color: colors.primary,
  },
});

