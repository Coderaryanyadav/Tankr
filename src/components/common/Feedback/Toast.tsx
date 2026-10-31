import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';
import { haptics } from '../../../theme/haptics';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  visible: boolean;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  variant = 'info',
  duration = 3500,
  onDismiss,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (variant === 'success') {
        haptics.success();
      } else if (variant === 'error') {
        haptics.error();
      } else if (variant === 'warning') {
        haptics.warning();
      } else {
        haptics.lightImpact();
      }

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      handleDismiss();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (variant) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      default:
        return 'information-circle';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bg: colors.successLight,
          border: colors.success,
          iconColor: colors.success,
        };
      case 'error':
        return {
          bg: colors.errorLight,
          border: colors.error,
          iconColor: colors.error,
        };
      case 'warning':
        return {
          bg: colors.warningLight,
          border: colors.warning,
          iconColor: colors.warning,
        };
      default:
        return {
          bg: colors.infoLight,
          border: colors.info,
          iconColor: colors.info,
        };
    }
  };

  const vStyle = getVariantStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: vStyle.bg,
          borderColor: vStyle.border,
        },
      ]}
    >
      <Ionicons name={getIconName()} size={22} color={vStyle.iconColor} />
      <Text style={styles.messageText}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        onPress={handleDismiss}
        style={styles.closeBtn}
      >
        <Ionicons name="close" size={16} color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    ...shadows.floating,
  },
  messageText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  closeBtn: {
    padding: spacing.xs,
  },
});
