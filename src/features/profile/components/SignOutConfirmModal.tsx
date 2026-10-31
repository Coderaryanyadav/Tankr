import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface SignOutConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSignOut: () => void;
  isLoading?: boolean;
}

export const SignOutConfirmModal: React.FC<SignOutConfirmModalProps> = ({
  visible,
  onClose,
  onConfirmSignOut,
  isLoading = false,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="log-out-outline" size={32} color={colors.error} />
          </View>

          <Text style={styles.title}>Sign Out of TANKR?</Text>
          <Text style={styles.message}>
            You will need to verify your phone number via OTP the next time you sign in. Any active delivery tracking will continue in the background.
          </Text>

          <View style={styles.buttonRow}>
            <View style={{ flex: 1 }}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={onClose}
                disabled={isLoading}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={isLoading ? 'Signing out...' : 'Sign Out'}
                variant="danger"
                size="md"
                onPress={onConfirmSignOut}
                loading={isLoading}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.modal,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
});
