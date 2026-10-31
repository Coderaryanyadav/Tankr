import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';

export interface SupplierCardProps {
  businessName: string;
  isVerified?: boolean;
  rating?: number;
  activeTankersCount?: number;
  depotAddress?: string;
  onPress?: () => void;
  onCall?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SupplierCard: React.FC<SupplierCardProps> = ({
  businessName,
  isVerified = true,
  rating = 4.8,
  activeTankersCount = 6,
  depotAddress,
  onPress,
  onCall,
  style,
}) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Supplier: ${businessName}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && Boolean(onPress) && styles.containerPressed,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Ionicons name="business" size={22} color={colors.primary} />
        </View>

        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.name}>
              {businessName}
            </Text>
            {isVerified && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colors.primary}
                style={styles.verifiedIcon}
              />
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color={colors.warning} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.fleetText}>{activeTankersCount} tankers active</Text>
          </View>
        </View>

        {onCall && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call ${businessName}`}
            onPress={onCall}
            style={({ pressed }) => [
              styles.callButton,
              pressed && styles.callButtonPressed,
            ]}
          >
            <Ionicons name="call" size={18} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {depotAddress && (
        <View style={styles.depotRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text numberOfLines={1} style={styles.depotText}>
            {depotAddress}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  containerPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    flexShrink: 1,
  },
  verifiedIcon: {
    marginLeft: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  ratingText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginLeft: 3,
  },
  dotSeparator: {
    marginHorizontal: spacing.xs,
    color: colors.textMuted,
  },
  fleetText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonPressed: {
    backgroundColor: colors.cardBorder,
  },
  depotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 4,
  },
  depotText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    flex: 1,
  },
});
