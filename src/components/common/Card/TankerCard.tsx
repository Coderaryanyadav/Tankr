import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';

export interface TankerCardProps {
  id: string;
  name: string;
  capacityLiters: number;
  waterType: 'Potable (Drinking)' | 'Filtered Borewell' | 'Commercial Tank';
  etaMinutes: number;
  priceInRupees: number;
  selected?: boolean;
  onSelect: (id: string) => void;
  tag?: string; // e.g. "Most Popular" or "Fastest"
}

export const TankerCard: React.FC<TankerCardProps> = ({
  id,
  name,
  capacityLiters,
  waterType,
  etaMinutes,
  priceInRupees,
  selected = false,
  onSelect,
  tag,
}) => {
  const getCapacityDisplay = (liters: number) => {
    if (liters >= 1000) {
      return `${(liters / 1000).toFixed(0)}k Liters`;
    }
    return `${liters} Liters`;
  };

  return (
    <Card
      selected={selected}
      variant={selected ? 'elevated' : 'outlined'}
      onPress={() => onSelect(id)}
      style={styles.cardContainer}
      contentStyle={styles.cardContent}
      accessibilityLabel={`${name}, ${capacityLiters} liters, ₹${priceInRupees}, ETA ${etaMinutes} minutes`}
    >
      {/* Top Banner Tag if present */}
      {tag && (
        <View style={styles.tagBanner}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      )}

      <View style={styles.mainRow}>
        {/* Tanker Icon Representation */}
        <View style={[styles.avatarBox, selected && styles.avatarBoxSelected]}>
          <Ionicons
            name="water"
            size={26}
            color={selected ? colors.primary : colors.secondary}
          />
        </View>

        {/* Details Column */}
        <View style={styles.detailsCol}>
          <View style={styles.titleRow}>
            <Text style={styles.tankerName}>{name}</Text>
            <StatusBadge
              label={`${etaMinutes} mins`}
              variant={etaMinutes <= 20 ? 'success' : 'primary'}
              size="sm"
            />
          </View>

          <Text style={styles.capacitySubtitle}>
            {getCapacityDisplay(capacityLiters)} • {waterType}
          </Text>

          <View style={styles.assuranceRow}>
            <Ionicons name="shield-checkmark" size={13} color={colors.success} />
            <Text style={styles.assuranceText}>Certified Tank Cleanliness</Text>
          </View>
        </View>

        {/* Price Column */}
        <View style={styles.priceCol}>
          <Text style={styles.priceText}>₹{priceInRupees.toLocaleString('en-IN')}</Text>
          <Text style={styles.priceCaption}>all incl.</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: spacing.xs,
  },
  cardContent: {
    padding: spacing.md,
  },
  tagBanner: {
    position: 'absolute',
    top: 0,
    right: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderBottomLeftRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
  },
  tagText: {
    color: colors.white,
    fontSize: fontSizes.xs - 2,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarBoxSelected: {
    backgroundColor: colors.primaryLight,
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  tankerName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  capacitySubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    marginBottom: 4,
  },
  assuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assuranceText: {
    fontSize: fontSizes.xs - 1,
    color: colors.success,
    fontWeight: fontWeights.semibold,
  },
  priceCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  priceText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
  },
  priceCaption: {
    fontSize: fontSizes.xs - 1,
    color: colors.textMuted,
    marginTop: -2,
  },
});

