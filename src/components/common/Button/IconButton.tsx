import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';

export type IconButtonVariant = 'surface' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'md',
  variant = 'surface',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        useNativeDriver: true,
        speed: 60,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  const getContainerStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base, styles[`size_${size}`]];

    if (variant === 'surface') {
      list.push(styles.variant_surface);
    } else if (variant === 'primary') {
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

  const getSpinnerColor = (): string => {
    if (variant === 'primary' || variant === 'danger') {
      return colors.white;
    }
    return colors.primary;
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.wrapper]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[getContainerStyle(), style]}
      >
        <View style={styles.iconContainer}>
          {loading ? (
            <ActivityIndicator size="small" color={getSpinnerColor()} />
          ) : (
            icon
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
  },
  base: {
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  size_xs: {
    width: 28,
    height: 28,
  },
  size_sm: {
    width: 36,
    height: 36,
  },
  size_md: {
    width: 44,
    height: 44,
  },
  size_lg: {
    width: 52,
    height: 52,
  },
  variant_surface: {
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  variant_primary: {
    backgroundColor: colors.primary,
    ...shadows.floating,
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
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
  },
  disabled: {
    backgroundColor: colors.divider,
    borderColor: colors.divider,
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.6,
  },
});
