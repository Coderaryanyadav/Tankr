import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { TextInput } from '../../../components/common/Input/TextInput';
import { useAuthStore } from '../../../stores/authStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { user, completeOnboarding, isLoading } = useAuthStore();

  const [fullName, setFullName] = useState<string>('');
  const [preferredAddress, setPreferredAddress] = useState<string>('');
  const [city, setCity] = useState<string>('Bengaluru');
  const [pincode, setPincode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFinish = async () => {
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!preferredAddress.trim()) {
      setErrorMsg('Please enter your primary delivery address');
      return;
    }
    if (!pincode.trim() || pincode.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit postal PIN code');
      return;
    }

    const res = await completeOnboarding({
      fullName: fullName.trim(),
      preferredAddress: preferredAddress.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
    });

    if (res.success) {
      onComplete();
    } else {
      setErrorMsg(res.error || 'Failed to save profile details');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add" size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>Welcome to TANKR</Text>
            <Text style={styles.subtitle}>
              Set up your profile to enable swift one-tap water tanker deliveries.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            {errorMsg && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <TextInput
              label="Full Name"
              placeholder="e.g. Ramesh Kumar"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setErrorMsg(null);
              }}
              leftIcon={<Ionicons name="person-outline" size={20} color={colors.textSecondary} />}
            />

            <TextInput
              label="Primary Delivery Address"
              placeholder="e.g. Villa 12, Sobha Windfall, Whitefield"
              value={preferredAddress}
              onChangeText={(text) => {
                setPreferredAddress(text);
                setErrorMsg(null);
              }}
              leftIcon={<Ionicons name="home-outline" size={20} color={colors.textSecondary} />}
            />

            <View style={styles.splitRow}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <TextInput
                  label="City"
                  placeholder="Bengaluru"
                  value={city}
                  onChangeText={setCity}
                  leftIcon={<Ionicons name="business-outline" size={20} color={colors.textSecondary} />}
                />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <TextInput
                  label="PIN Code"
                  placeholder="560066"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={pincode}
                  onChangeText={(text) => {
                    setPincode(text.replace(/\D/g, ''));
                    setErrorMsg(null);
                  }}
                  leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
                />
              </View>
            </View>

            <View style={styles.buttonWrapper}>
              <Button
                title="Complete & Start Booking"
                variant="primary"
                size="lg"
                loading={isLoading}
                onPress={handleFinish}
                rightIcon={<Ionicons name="checkmark-done" size={20} color={colors.white} />}
              />
            </View>
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
  scrollContent: {
    padding: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 290,
  },
  formCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['3xl'],
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  splitRow: {
    flexDirection: 'row',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: fontWeights.semibold,
  },
  buttonWrapper: {
    marginTop: spacing.md,
  },
});
