import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
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

export interface StatusBadgeProps {
  label: string;
  variant?: StatusBadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  icon,
}) => {
  const getBadgeStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base, styles[`size_${size}`]];

    if (variant === 'success') {
      list.push(styles.variant_success);
    } else if (variant === 'warning') {
      list.push(styles.variant_warning);
    } else if (variant === 'error') {
      list.push(styles.variant_error);
    } else if (variant === 'info') {
      list.push(styles.variant_info);
    } else if (variant === 'primary') {
      list.push(styles.variant_primary);
    } else {
      list.push(styles.variant_neutral);
    }

    return list;
  };

  const getTextStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.textBase, styles[`text_${size}`]];

    if (variant === 'success') {
      list.push(styles.text_success);
    } else if (variant === 'warning') {
      list.push(styles.text_warning);
    } else if (variant === 'error') {
      list.push(styles.text_error);
    } else if (variant === 'info') {
      list.push(styles.text_info);
    } else if (variant === 'primary') {
      list.push(styles.text_primary);
    } else {
      list.push(styles.text_neutral);
    }

    return list;
  };

  return (
    <View style={getBadgeStyle()}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <Text style={getTextStyle()}>{label}</Text>
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
    marginRight: spacing.xxs,
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
    color: colors.success,
  },
  text_warning: {
    color: colors.warning,
  },
  text_error: {
    color: colors.error,
  },
  text_info: {
    color: colors.info,
  },
  text_primary: {
    color: colors.primary,
  },
  text_neutral: {
    color: colors.textSecondary,
  },
});

