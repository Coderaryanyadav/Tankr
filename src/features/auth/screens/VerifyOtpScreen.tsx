import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { ErrorBanner } from '../../../components/common/Feedback/ErrorState';
import { OtpInput } from '../../../components/common/Input/OtpInput';
import { useAuthStore } from '../../../stores/authStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface VerifyOtpScreenProps {
  onBackToLogin: () => void;
  onVerificationSuccess: (isOnboarded: boolean) => void;
}

export const VerifyOtpScreen: React.FC<VerifyOtpScreenProps> = ({
  onBackToLogin,
  onVerificationSuccess,
}) => {
  const {
    pendingPhone,
    rawPhoneDigits,
    verifyOtp,
    resendOtp,
    cooldownSeconds,
    decrementCooldown,
    isLoading,
    authError,
    clearError,
  } = useAuthStore();

  const [otpValue, setOtpValue] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Mask phone as "+91 987•• ••210"
  const getMaskedPhone = (digits: string): string => {
    const raw = digits.replace(/\D/g, '');
    if (raw.length === 10) {
      return `+91 ${raw.slice(0, 3)}•• ••${raw.slice(7)}`;
    }
    return `+91 ${raw}`;
  };

  // Cooldown countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (cooldownSeconds > 0) {
      timer = setInterval(() => {
        decrementCooldown();
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldownSeconds, decrementCooldown]);

  const handleOtpChange = (code: string) => {
    setOtpValue(code);
    setLocalError(null);
    clearError();

    // Auto-verify when all 6 digits are typed or pasted
    if (code.length === 6) {
      submitVerification(code);
    }
  };

  const submitVerification = async (codeToVerify?: string) => {
    const code = codeToVerify || otpValue;
    if (code.length !== 6) {
      setLocalError('Please enter all 6 digits of the OTP code');
      return;
    }

    const result = await verifyOtp(code);
    if (result.success) {
      onVerificationSuccess(result.isOnboarded ?? false);
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || isLoading) return;
    setOtpValue('');
    setLocalError(null);
    clearError();
    await resendOtp();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change phone number"
              onPress={onBackToLogin}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.darkNavy} />
            </Pressable>

            <Pressable onPress={onBackToLogin} style={styles.changePhonePill}>
              <Text style={styles.changePhoneText}>Change Number</Text>
            </Pressable>
          </View>

          {/* Title & Instructions */}
          <View style={styles.titleSection}>
            <View style={styles.otpIconCircle}>
              <Ionicons name="chatbubble-ellipses" size={32} color={colors.primary} />
            </View>

            <Text style={styles.screenTitle}>Verify Mobile OTP</Text>
            <Text style={styles.instructionsText}>
              We sent a 6-digit verification code to
            </Text>
            <View style={styles.phoneTag}>
              <Ionicons name="phone-portrait-outline" size={14} color={colors.darkNavy} />
              <Text style={styles.phoneTagText}>
                {getMaskedPhone(rawPhoneDigits || pendingPhone || '')}
              </Text>
            </View>
          </View>

          {/* OTP Input Card */}
          <View style={styles.otpCard}>
            {(localError || authError) && (
              <View style={{ marginBottom: spacing.md }}>
                <ErrorBanner
                  message={localError || authError || ''}
                  onDismiss={() => {
                    setLocalError(null);
                    clearError();
                  }}
                />
              </View>
            )}

            <OtpInput
              length={6}
              value={otpValue}
              onChangeOtp={handleOtpChange}
              autoFocus
            />

            <View style={styles.resendSection}>
              {cooldownSeconds > 0 ? (
                <View style={styles.timerRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.timerText}>
                    Resend code in{' '}
                    <Text style={styles.timerHighlight}>{cooldownSeconds}s</Text>
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Resend OTP code"
                  onPress={handleResend}
                  disabled={isLoading}
                  style={styles.resendButton}
                >
                  <Text style={styles.resendButtonText}>Resend SMS OTP</Text>
                  <Ionicons name="refresh" size={14} color={colors.primary} />
                </Pressable>
              )}
            </View>

            <View style={styles.verifyButtonWrapper}>
              <Button
                title="Verify & Continue"
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={otpValue.length !== 6 || isLoading}
                onPress={() => submitVerification()}
                rightIcon={<Ionicons name="checkmark-circle" size={20} color={colors.white} />}
              />
            </View>
          </View>

          {/* Secure Guarantee Notice */}
          <View style={styles.securityFooter}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.securityText}>
              Protected by Supabase Phone Authentication
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  changePhonePill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  changePhoneText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  otpIconCircle: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: spacing.xs,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  phoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  phoneTagText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    letterSpacing: 0.5,
  },
  otpCard: {
    width: '100%',
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['3xl'],
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  resendSection: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  timerHighlight: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  resendButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  verifyButtonWrapper: {
    marginTop: spacing.sm,
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  securityText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
});
