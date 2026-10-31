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
import { StatusBadge } from './StatusBadge';

export interface BookingCardProps {
  bookingId: string;
  formattedDate: string;
  status: 'pending' | 'accepted' | 'driver_assigned' | 'en_route' | 'arrived' | 'delivering' | 'delivered' | 'cancelled';
  capacityLiters: number;
  waterType: string;
  supplierName: string;
  deliveryAddress: string;
  totalAmount: number;
  paymentMethod?: string;
  onTrack?: () => void;
  onViewInvoice?: () => void;
  onViewDetails?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  bookingId,
  formattedDate,
  status,
  capacityLiters,
  waterType,
  supplierName,
  deliveryAddress,
  totalAmount,
  paymentMethod = 'Online / UPI',
  onTrack,
  onViewInvoice,
  onViewDetails,
  style,
}) => {
  const isTerminalDelivered = status === 'delivered';
  const isCancelled = status === 'cancelled';
  const isActive = !isTerminalDelivered && !isCancelled;

  return (
    <View style={[styles.card, style]}>
      {/* Header: ID + Status */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.bookingId}>#{bookingId}</Text>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
        <StatusBadge status={status} />
      </View>

      {/* Capacity & Water Type Tags */}
      <View style={styles.tagRow}>
        <View style={styles.capacityBadge}>
          <Ionicons name="water" size={14} color={colors.primary} />
          <Text style={styles.capacityText}>
            {capacityLiters.toLocaleString()} Litres
          </Text>
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{waterType}</Text>
        </View>
      </View>

      {/* Supplier & Delivery Address */}
      <View style={styles.locationSection}>
        <View style={styles.supplierRow}>
          <Ionicons name="business-outline" size={15} color={colors.textSecondary} />
          <Text numberOfLines={1} style={styles.supplierText}>
            {supplierName}
          </Text>
        </View>

        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
          <Text numberOfLines={2} style={styles.addressText}>
            {deliveryAddress}
          </Text>
        </View>
      </View>

      {/* Footer: Price & Actions */}
      <View style={styles.footerRow}>
        <View>
          <Text style={styles.priceLabel}>Total Amount</Text>
          <Text style={styles.priceValue}>₹{totalAmount.toLocaleString()}</Text>
        </View>
        <View style={styles.paymentBadge}>
          <Ionicons name="card-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.paymentText}>{paymentMethod}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      {isActive && onTrack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Track live delivery"
          onPress={onTrack}
          style={({ pressed }) => [
            styles.primaryAction,
            pressed && styles.primaryActionPressed,
          ]}
        >
          <Ionicons name="navigate-circle" size={18} color={colors.white} />
          <Text style={styles.primaryActionText}>Track Live Delivery</Text>
        </Pressable>
      )}

      {isTerminalDelivered && (
        <View style={styles.deliveredActionsRow}>
          {onViewInvoice && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Tax Invoice"
              onPress={onViewInvoice}
              style={styles.invoiceButton}
            >
              <Ionicons name="receipt-outline" size={16} color={colors.primary} />
              <Text style={styles.invoiceButtonText}>View Tax Invoice</Text>
            </Pressable>
          )}

          {onViewDetails && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Order Details"
              onPress={onViewDetails}
              style={styles.detailsButton}
            >
              <Text style={styles.detailsButtonText}>Order Details</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bookingId: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  dateText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  capacityText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  typeBadge: {
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  typeText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  locationSection: {
    gap: 6,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.md,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supplierText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  addressText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  priceValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  paymentText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: borderRadius.lg,
    gap: 6,
    marginTop: spacing.xs,
    ...shadows.subtle,
  },
  primaryActionPressed: {
    backgroundColor: colors.primaryHover,
  },
  primaryActionText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  deliveredActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  invoiceButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsButtonText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
});
