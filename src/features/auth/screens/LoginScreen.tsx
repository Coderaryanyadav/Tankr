import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
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
          {/* Top Brand Logo */}
          <View style={styles.topLogoContainer}>
            <Image
              source={require('../../../../assets/images/logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>

          {/* Brand Presentation */}
          <View style={styles.brandContainer}>
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

            {/* Quick Demo Personas */}
            <View style={styles.demoChipsContainer}>
              <Text style={styles.demoChipsTitle}>Quick Demo Switcher (OTP: 123456):</Text>
              <View style={styles.demoChipsRow}>
                <Pressable
                  style={[styles.demoChip, rawPhoneDigits === '9876543210' && styles.demoChipActive]}
                  onPress={() => handlePhoneChange('9876543210')}
                >
                  <Text style={[styles.demoChipText, rawPhoneDigits === '9876543210' && styles.demoChipTextActive]}>
                    👤 Customer (Vikram)
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.demoChip, rawPhoneDigits === '9999999999' && styles.demoChipActive]}
                  onPress={() => handlePhoneChange('9999999999')}
                >
                  <Text style={[styles.demoChipText, rawPhoneDigits === '9999999999' && styles.demoChipTextActive]}>
                    🏢 Supplier (Marol Hub)
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.demoChip, rawPhoneDigits === '9000000001' && styles.demoChipActive]}
                  onPress={() => handlePhoneChange('9000000001')}
                >
                  <Text style={[styles.demoChipText, rawPhoneDigits === '9000000001' && styles.demoChipTextActive]}>
                    🚛 Driver (Rajesh)
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.demoChip, rawPhoneDigits === '8888888888' && styles.demoChipActive]}
                  onPress={() => handlePhoneChange('8888888888')}
                >
                  <Text style={[styles.demoChipText, rawPhoneDigits === '8888888888' && styles.demoChipTextActive]}>
                    🛡️ Operations Admin
                  </Text>
                </Pressable>
              </View>
            </View>

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
  topLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  brandLogo: {
    width: 260,
    height: 130,
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
  demoChipsContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  demoChipsTitle: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  demoChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  demoChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
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

