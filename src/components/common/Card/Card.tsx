import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';

export type CardVariant = 'standard' | 'elevated' | 'outlined' | 'subtle';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'standard',
  onPress,
  selected = false,
  style,
  contentStyle,
  accessibilityLabel,
}) => {
  const getContainerStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];

    if (variant === 'standard') {
      list.push(styles.variant_standard);
    } else if (variant === 'elevated') {
      list.push(styles.variant_elevated);
    } else if (variant === 'outlined') {
      list.push(styles.variant_outlined);
    } else if (variant === 'subtle') {
      list.push(styles.variant_subtle);
    }

    if (selected) {
      list.push(styles.selected);
    }

    return list;
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [
          getContainerStyle(),
          pressed && styles.pressed,
          style,
        ]}
      >
        <View style={[styles.innerContent, contentStyle]}>{children}</View>
      </Pressable>
    );
  }

  return (
    <View style={[getContainerStyle(), style]}>
      <View style={[styles.innerContent, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  innerContent: {
    padding: spacing.lg,
  },
  variant_standard: {
    ...shadows.subtle,
  },
  variant_elevated: {
    ...shadows.card,
  },
  variant_outlined: {
    shadowOpacity: 0,
    elevation: 0,
    borderColor: colors.cardBorder,
  },
  variant_subtle: {
    backgroundColor: colors.backgroundMuted,
    borderColor: colors.transparent,
    shadowOpacity: 0,
    elevation: 0,
  },
  selected: {
    borderColor: colors.cardBorderSelected,
    borderWidth: 2,
    backgroundColor: colors.white,
    ...shadows.floating,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

