import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal as RNModal,
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
import { useReducedMotion } from '../../../theme/motion';
import { haptics } from '../../../theme/haptics';
import { Button } from '../Button/Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  iconName = 'alert-circle',
  onConfirm,
  onCancel,
}) => {
  const isReducedMotion = useReducedMotion();
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (isDestructive) {
        haptics.warning();
      }
      if (isReducedMotion) {
        animProgress.setValue(1);
      } else {
        animProgress.setValue(0);
        Animated.spring(animProgress, {
          toValue: 1,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [visible, isDestructive, isReducedMotion, animProgress]);

  const translateY = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />

        <Animated.View
          style={[
            styles.dialogCard,
            {
              opacity: animProgress,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Close X Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close confirmation dialog"
            onPress={onCancel}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>

          {/* Icon */}
          <View
            style={[
              styles.iconWrapper,
              isDestructive ? styles.iconDestructive : styles.iconStandard,
            ]}
          >
            <Ionicons
              name={iconName}
              size={32}
              color={isDestructive ? colors.error : colors.primary}
            />
          </View>

          {/* Content */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Actions */}
          <View style={styles.actionButtons}>
            <Button
              title={confirmLabel}
              onPress={onConfirm}
              variant={isDestructive ? 'danger' : 'primary'}
              size="md"
              loading={isLoading}
              style={styles.confirmBtn}
            />

            <Button
              title={cancelLabel}
              onPress={onCancel}
              variant="outline"
              size="md"
              disabled={isLoading}
              style={styles.cancelBtn}
            />
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.modal,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  iconStandard: {
    backgroundColor: colors.primaryLight,
  },
  iconDestructive: {
    backgroundColor: colors.errorLight,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  actionButtons: {
    width: '100%',
    gap: spacing.sm,
  },
  confirmBtn: {
    width: '100%',
  },
  cancelBtn: {
    width: '100%',
  },
});
