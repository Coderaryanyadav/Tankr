import React from 'react';
import {
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
import { Button } from '../Button/Button';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  confirmTitle?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm?: () => void;
  cancelTitle?: string;
  onCancel?: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  message,
  iconName = 'alert-circle',
  iconColor = colors.primary,
  confirmTitle = 'Confirm',
  confirmVariant = 'primary',
  onConfirm,
  cancelTitle = 'Cancel',
  onCancel,
}) => {
  return (
    <RNModal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.pressableBackdrop} onPress={onClose} />

        <View style={styles.dialogCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close dialog"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>

          {/* Icon Badge */}
          <View style={[styles.iconCircle, { backgroundColor: colors.background }]}>
            <Ionicons name={iconName} size={36} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {onConfirm && (
              <Button
                title={confirmTitle}
                onPress={() => {
                  onConfirm();
                  onClose();
                }}
                variant={confirmVariant}
                size="md"
              />
            )}

            <View style={{ marginTop: spacing.sm }}>
              <Button
                title={cancelTitle}
                onPress={() => {
                  onCancel ? onCancel() : onClose();
                }}
                variant="ghost"
                size="md"
              />
            </View>
          </View>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  pressableBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['3xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
    ...shadows.modal,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
  actions: {
    width: '100%',
  },
});
