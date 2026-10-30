import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';
import { Button } from '../Button/Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  iconName = 'water-outline',
  actionTitle,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      {/* Decorative water concentric rings */}
      <View style={styles.ringOuter}>
        <View style={styles.ringInner}>
          <Ionicons name={iconName} size={42} color={colors.primary} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionTitle && onAction && (
        <View style={styles.buttonWrapper}>
          <Button
            title={actionTitle}
            onPress={onAction}
            variant="primary"
            size="md"
            fullWidth={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['4xl'],
  },
  ringOuter: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  ringInner: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  buttonWrapper: {
    marginTop: spacing.xl,
  },
});

