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

export interface AddressSelectorProps {
  label: string;
  addressText: string;
  isSelected?: boolean;
  isDefault?: boolean;
  disabled?: boolean;
  onPress: () => void;
  onEdit?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  label,
  addressText,
  isSelected = false,
  isDefault = false,
  disabled = false,
  onPress,
  onEdit,
  style,
}) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${addressText}`}
      accessibilityState={{ selected: isSelected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        isSelected && styles.containerSelected,
        disabled && styles.containerDisabled,
        pressed && !disabled && styles.containerPressed,
        style,
      ]}
    >
      <View style={[styles.iconWrapper, isSelected && styles.iconWrapperSelected]}>
        <Ionicons
          name={label.toLowerCase().includes('home') ? 'home' : label.toLowerCase().includes('office') ? 'business' : 'location'}
          size={20}
          color={isSelected ? colors.white : colors.primary}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.label, isSelected && styles.labelSelected]}>{label}</Text>
          {isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
            </View>
          )}
        </View>
        <Text numberOfLines={2} style={styles.addressText}>
          {addressText}
        </Text>
      </View>

      {onEdit && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${label}`}
          onPress={onEdit}
          hitSlop={8}
          style={styles.editButton}
        >
          <Ionicons name="pencil" size={16} color={colors.textSecondary} />
        </Pressable>
      )}

      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
        {isSelected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
    ...shadows.subtle,
  },
  containerSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  containerPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  containerDisabled: {
    opacity: 0.5,
    backgroundColor: colors.backgroundMuted,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconWrapperSelected: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginRight: spacing.xs,
  },
  labelSelected: {
    color: colors.primary,
  },
  defaultBadge: {
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  defaultBadgeText: {
    fontSize: fontSizes.xs - 2,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  editButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
