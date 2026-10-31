import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';
import { Button } from '../Button/Button';

export interface FullScreenErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const FullScreenError: React.FC<FullScreenErrorProps> = ({
  title = 'Unable to Load Details',
  message,
  onRetry,
}) => {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={styles.fullScreenContainer}
    >
      <View style={styles.errorIconCircle}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
      </View>
      <Text style={styles.fullTitle}>{title}</Text>
      <Text style={styles.fullMessage}>{message}</Text>

      {onRetry && (
        <View style={styles.retryButtonWrapper}>
          <Button
            title="Try Again"
            onPress={onRetry}
            variant="primary"
            size="md"
            fullWidth={false}
          />
        </View>
      )}
    </View>
  );
};

export interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={styles.bannerContainer}
    >
      <Ionicons name="warning" size={20} color="#B91C1C" style={{ marginRight: spacing.sm }} />
      <Text style={styles.bannerText}>{message}</Text>
      {onDismiss && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onDismiss}
          style={{ marginLeft: spacing.sm, padding: 4 }}
        >
          <Ionicons name="close" size={18} color="#B91C1C" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    backgroundColor: colors.background,
  },
  errorIconCircle: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.full,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  fullTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  fullMessage: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 20,
  },
  retryButtonWrapper: {
    marginTop: spacing.xl,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginVertical: spacing.xs,
  },
  bannerText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: '#991B1B', // Red 800: WCAG AA 5.9:1 on errorLight
    fontWeight: fontWeights.semibold,
  },
});

