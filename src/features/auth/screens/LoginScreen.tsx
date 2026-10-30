import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { ErrorBanner } from '../../../components/common/Feedback/ErrorState';
import { PhoneInput } from '../../../components/common/Input/PhoneInput';
import { useAuthStore } from '../../../stores/authStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface LoginScreenProps {
  onOtpRequested: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onOtpRequested }) => {
  const {
    rawPhoneDigits,
    setPhoneDigits,
    sendOtp,
    isLoading,
    authError,
    clearError,
  } = useAuthStore();

  const [inputError, setInputError] = useState<string | null>(null);

  const handlePhoneChange = (digits: string) => {
    setInputError(null);
    clearError();
    setPhoneDigits(digits);
  };

  const handleContinue = async () => {
    if (rawPhoneDigits.length !== 10) {
      setInputError('Please enter a valid 10-digit mobile number');
      return;
    }

    const result = await sendOtp(rawPhoneDigits);
    if (result.success) {
      onOtpRequested();
    }
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
          {/* Top Decorative Motif */}
          <View style={styles.topWaveContainer}>
            <View style={styles.outerDropletRing}>
              <View style={styles.innerDropletCircle}>
                <Ionicons name="water" size={44} color={colors.white} />
              </View>
            </View>
          </View>

          {/* Brand Presentation */}
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle}>TANKR</Text>
            <Text style={styles.tagline}>Water delivery, just a tap away.</Text>
            <Text style={styles.loginSubtitle}>
              Enter your mobile number to get started. No password required.
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {authError && (
              <View style={{ marginBottom: spacing.md }}>
                <ErrorBanner message={authError} onDismiss={clearError} />
              </View>
            )}

            <PhoneInput
              value={rawPhoneDigits}
              onChangePhone={handlePhoneChange}
              countryCode="+91"
              error={inputError || undefined}
              autoFocus
            />

            <View style={styles.buttonWrapper}>
              <Button
                title="Continue"
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={rawPhoneDigits.length < 10 || isLoading}
                onPress={handleContinue}
                rightIcon={<Ionicons name="arrow-forward" size={20} color={colors.white} />}
              />
            </View>
          </View>

          {/* Trust Badges */}
          <View style={styles.trustBadgesRow}>
            <View style={styles.trustBadgeItem}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Text style={styles.trustBadgeText}>Instant SMS OTP</Text>
            </View>
            <View style={styles.trustBadgeDivider} />
            <View style={styles.trustBadgeItem}>
              <Ionicons name="lock-closed" size={16} color={colors.primary} />
              <Text style={styles.trustBadgeText}>End-to-End Encrypted</Text>
            </View>
          </View>

          {/* Legal / Policy Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to TANKR's{' '}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL('https://tankr.in/terms')}
              >
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL('https://tankr.in/privacy')}
              >
                Privacy Policy
              </Text>
              .
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
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
    justifyContent: 'space-between',
  },
  topWaveContainer: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  outerDropletRing: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: '#D7E9FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDropletCircle: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  loginSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  formContainer: {
    width: '100%',
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['3xl'],
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  buttonWrapper: {
    marginTop: spacing.md,
  },
  trustBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
    gap: spacing.md,
  },
  trustBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustBadgeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  trustBadgeDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.cardBorder,
  },
  footerContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  termsText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLink: {
    color: colors.primary,
    fontWeight: fontWeights.semibold,
    textDecorationLine: 'underline',
  },
});
