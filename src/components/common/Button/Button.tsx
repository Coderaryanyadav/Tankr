import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const getContainerStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [
      styles.base,
      styles[`size_${size}`],
      fullWidth ? styles.fullWidth : styles.inline,
    ];

    if (variant === 'primary') {
      list.push(styles.variant_primary);
    } else if (variant === 'secondary') {
      list.push(styles.variant_secondary);
    } else if (variant === 'outline') {
      list.push(styles.variant_outline);
    } else if (variant === 'ghost') {
      list.push(styles.variant_ghost);
    } else if (variant === 'danger') {
      list.push(styles.variant_danger);
    }

    if (disabled) {
      list.push(styles.disabled);
    }

    return list;
  };

  const getTextStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.baseText, styles[`textSize_${size}`]];

    if (variant === 'primary' || variant === 'danger') {
      list.push(styles.textLight);
    } else if (variant === 'secondary') {
      list.push(styles.textSecondary);
    } else if (variant === 'outline' || variant === 'ghost') {
      list.push(styles.textPrimaryColor);
    }

    if (disabled) {
      list.push(styles.textDisabled);
    }

    return list;
  };

  const getSpinnerColor = (): string => {
    if (variant === 'outline' || variant === 'ghost') {
      return colors.primary;
    }
    return colors.white;
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[getContainerStyle(), style]}
      >
        {loading ? (
          <View style={styles.contentRow}>
            <ActivityIndicator size="small" color={getSpinnerColor()} />
            <Text style={[getTextStyle(), styles.loadingText, textStyle]}>Please wait...</Text>
          </View>
        ) : (
          <View style={styles.contentRow}>
            {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}
            <Text style={[getTextStyle(), textStyle]}>{title}</Text>
            {rightIcon && <View style={styles.rightIconWrapper}>{rightIcon}</View>}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  inline: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xl,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIconWrapper: {
    marginRight: spacing.sm,
  },
  rightIconWrapper: {
    marginLeft: spacing.sm,
  },
  // Sizes
  size_sm: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  size_md: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  size_lg: {
    height: 56,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.xl,
    ...shadows.subtle,
  },
  // Variants
  variant_primary: {
    backgroundColor: colors.primary,
  },
  variant_secondary: {
    backgroundColor: colors.primaryLight,
  },
  variant_outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  variant_ghost: {
    backgroundColor: colors.transparent,
  },
  variant_danger: {
    backgroundColor: colors.error,
  },
  disabled: {
    backgroundColor: colors.divider,
    borderColor: colors.divider,
    shadowOpacity: 0,
    elevation: 0,
  },
  // Text
  baseText: {
    fontWeight: fontWeights.bold,
    textAlign: 'center',
  },
  textSize_sm: {
    fontSize: fontSizes.sm,
  },
  textSize_md: {
    fontSize: fontSizes.md,
  },
  textSize_lg: {
    fontSize: fontSizes.lg,
    letterSpacing: 0.3,
  },
  textLight: {
    color: colors.white,
  },
  textSecondary: {
    color: colors.primary,
  },
  textPrimaryColor: {
    color: colors.primary,
  },
  textDisabled: {
    color: colors.textMuted,
  },
  loadingText: {
    marginLeft: spacing.sm,
  },
});

