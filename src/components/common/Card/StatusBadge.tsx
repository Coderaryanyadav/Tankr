import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';

export type StatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'primary'
  | 'neutral';

export type StandardBookingStatus =
  | 'pending'
  | 'accepted'
  | 'driver_assigned'
  | 'en_route'
  | 'arrived'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export interface StatusBadgeProps {
  label?: string;
  variant?: StatusBadgeVariant;
  status?: StandardBookingStatus;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant,
  status,
  size = 'md',
  icon,
}) => {
  // If status is passed, derive label and variant automatically
  let resolvedLabel = label || '';
  let resolvedVariant = variant || 'primary';
  let defaultIcon: React.ReactNode = null;

  if (status) {
    switch (status) {
      case 'pending':
        resolvedLabel = 'Connecting Supplier';
        resolvedVariant = 'warning';
        defaultIcon = <Ionicons name="time-outline" size={13} color={colors.warning} />;
        break;
      case 'accepted':
        resolvedLabel = 'Order Confirmed';
        resolvedVariant = 'primary';
        defaultIcon = <Ionicons name="checkmark-outline" size={13} color={colors.primary} />;
        break;
      case 'driver_assigned':
        resolvedLabel = 'Driver Assigned';
        resolvedVariant = 'info';
        defaultIcon = <Ionicons name="person-outline" size={13} color={colors.info} />;
        break;
      case 'en_route':
        resolvedLabel = 'Tanker En Route';
        resolvedVariant = 'warning';
        defaultIcon = <Ionicons name="navigate-outline" size={13} color={colors.warning} />;
        break;
      case 'arrived':
        resolvedLabel = 'Tanker Arrived';
        resolvedVariant = 'success';
        defaultIcon = <Ionicons name="location-outline" size={13} color={colors.success} />;
        break;
      case 'delivering':
        resolvedLabel = 'Pumping Water';
        resolvedVariant = 'info';
        defaultIcon = <Ionicons name="water-outline" size={13} color={colors.info} />;
        break;
      case 'delivered':
        resolvedLabel = 'Delivery Complete';
        resolvedVariant = 'success';
        defaultIcon = <Ionicons name="checkmark-circle-outline" size={13} color={colors.success} />;
        break;
      case 'cancelled':
        resolvedLabel = 'Cancelled';
        resolvedVariant = 'error';
        defaultIcon = <Ionicons name="close-circle-outline" size={13} color={colors.error} />;
        break;
    }
  }

  const getBadgeStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base, styles[`size_${size}`]];

    if (resolvedVariant === 'success') {
      list.push(styles.variant_success);
    } else if (resolvedVariant === 'warning') {
      list.push(styles.variant_warning);
    } else if (resolvedVariant === 'error') {
      list.push(styles.variant_error);
    } else if (resolvedVariant === 'info') {
      list.push(styles.variant_info);
    } else if (resolvedVariant === 'primary') {
      list.push(styles.variant_primary);
    } else {
      list.push(styles.variant_neutral);
    }

    return list;
  };

  const getTextStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.textBase, styles[`text_${size}`]];

    if (resolvedVariant === 'success') {
      list.push(styles.text_success);
    } else if (resolvedVariant === 'warning') {
      list.push(styles.text_warning);
    } else if (resolvedVariant === 'error') {
      list.push(styles.text_error);
    } else if (resolvedVariant === 'info') {
      list.push(styles.text_info);
    } else if (resolvedVariant === 'primary') {
      list.push(styles.text_primary);
    } else {
      list.push(styles.text_neutral);
    }

    return list;
  };

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Status: ${resolvedLabel}`}
      style={getBadgeStyle()}
    >
      {icon ? (
        <View style={styles.iconWrapper}>{icon}</View>
      ) : defaultIcon ? (
        <View style={styles.iconWrapper}>{defaultIcon}</View>
      ) : null}
      <Text style={getTextStyle()}>{resolvedLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  iconWrapper: {
    marginRight: 4,
  },
  size_sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  size_md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  variant_success: {
    backgroundColor: colors.successLight,
  },
  variant_warning: {
    backgroundColor: colors.warningLight,
  },
  variant_error: {
    backgroundColor: colors.errorLight,
  },
  variant_info: {
    backgroundColor: colors.infoLight,
  },
  variant_primary: {
    backgroundColor: colors.primaryLight,
  },
  variant_neutral: {
    backgroundColor: colors.backgroundMuted,
  },
  textBase: {
    fontWeight: fontWeights.semibold,
  },
  text_sm: {
    fontSize: fontSizes.xs - 1,
  },
  text_md: {
    fontSize: fontSizes.xs,
  },
  text_success: {
    color: '#065F46', // Emerald 800: WCAG AA 5.6:1 on light green surface
  },
  text_warning: {
    color: '#92400E', // Amber 800: WCAG AA 5.2:1 on light amber surface
  },
  text_error: {
    color: '#991B1B', // Red 800: WCAG AA 5.9:1 on light red surface
  },
  text_info: {
    color: '#075985', // Sky 800: WCAG AA 5.7:1 on light sky surface
  },
  text_primary: {
    color: '#09529E', // Primary Dark Blue: WCAG AA 5.9:1 on light blue surface
  },
  text_neutral: {
    color: colors.textSecondary,
  },
});
