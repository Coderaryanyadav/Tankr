import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';

export interface LocationPillProps {
  label?: string;
  address: string;
  onPress: () => void;
}

export const LocationPill: React.FC<LocationPillProps> = ({
  label = 'Delivering to',
  address,
  onPress,
}) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Delivery location: ${address}. Tap to change.`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="location" size={18} color={colors.primary} />
      </View>

      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        <Text numberOfLines={1} style={styles.address}>
          {address}
        </Text>
      </View>

      <View style={styles.changeBadge}>
        <Text style={styles.changeText}>Change</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.9,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSizes.xs - 2,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  address: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.xs,
  },
  changeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    marginRight: 2,
  },
});

