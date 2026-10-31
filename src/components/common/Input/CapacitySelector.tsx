import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';
import { TankerCapacityLiters, TANKER_CONFIGURABLE_CATEGORIES } from '../../../types/discovery';

export interface CapacitySelectorProps {
  selectedCapacity: TankerCapacityLiters | null;
  onSelectCapacity: (capacity: TankerCapacityLiters | null) => void;
  style?: StyleProp<ViewStyle>;
}

export const CapacitySelector: React.FC<CapacitySelectorProps> = ({
  selectedCapacity,
  onSelectCapacity,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 'All' option */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="All Capacities"
          onPress={() => onSelectCapacity(null)}
          style={({ pressed }) => [
            styles.chip,
            selectedCapacity === null && styles.chipSelected,
            pressed && styles.chipPressed,
          ]}
        >
          <Ionicons
            name="apps"
            size={16}
            color={selectedCapacity === null ? colors.white : colors.textSecondary}
            style={styles.chipIcon}
          />
          <Text
            style={[
              styles.chipText,
              selectedCapacity === null && styles.chipTextSelected,
            ]}
          >
            All Sizes
          </Text>
        </Pressable>

        {TANKER_CONFIGURABLE_CATEGORIES.map((cat) => {
          const isSelected = selectedCapacity === cat.capacity;
          return (
            <Pressable
              key={cat.capacity}
              accessibilityRole="button"
              accessibilityLabel={`${cat.label} capacity`}
              onPress={() => onSelectCapacity(cat.capacity)}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
            >
              <Ionicons
                name="water"
                size={16}
                color={isSelected ? colors.white : colors.primary}
                style={styles.chipIcon}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: colors.white,
  },
});
