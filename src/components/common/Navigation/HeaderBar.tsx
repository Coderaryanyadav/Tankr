import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';

export interface HeaderBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
}) => {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.darkNavy} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.titleContainer}>
        <Text numberOfLines={1} style={styles.titleText}>
          {title}
        </Text>
        {subtitle && (
          <Text numberOfLines={1} style={styles.subtitleText}>
            {subtitle}
          </Text>
        )}
      </View>

      {rightAction ? (
        <View style={styles.rightActionWrapper}>{rightAction}</View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  subtitleText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rightActionWrapper: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  spacer: {
    width: 40,
  },
});

