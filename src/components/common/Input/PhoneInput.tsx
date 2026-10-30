import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';

export interface PhoneInputProps {
  value: string;
  onChangePhone: (rawDigits: string) => void;
  countryCode?: string;
  error?: string;
  label?: string;
  autoFocus?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangePhone,
  countryCode = '+91',
  error,
  label = 'Mobile Number',
  autoFocus = false,
  containerStyle,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Format 10 digits as "98765 43210"
  const formatDisplay = (digits: string): string => {
    const cleaned = digits.replace(/\D/g, '').slice(0, 10);
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  };

  const handleChange = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 10);
    onChangePhone(raw);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.container,
          isFocused && styles.containerFocused,
          Boolean(error) && styles.containerError,
        ]}
      >
        {/* Country Code Pill */}
        <View style={styles.codePill}>
          <Text style={styles.flagEmoji}>🇮🇳</Text>
          <Text style={styles.codeText}>{countryCode}</Text>
          <View style={styles.pillDivider} />
        </View>

        {/* Number Input */}
        <TextInput
          accessibilityLabel="Mobile Number"
          accessibilityRole="none"
          keyboardType="phone-pad"
          autoFocus={autoFocus}
          maxLength={11} // 10 digits + 1 space
          placeholder="98765 43210"
          placeholderTextColor={colors.textMuted}
          value={formatDisplay(value)}
          onChangeText={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={styles.input}
        />
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <Text style={styles.helperText}>We will send a 6-digit OTP for verification.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
    marginBottom: spacing.xs,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: colors.cardSurface,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
  },
  containerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  containerError: {
    borderColor: colors.error,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },
  flagEmoji: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  codeText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginRight: spacing.sm,
  },
  pillDivider: {
    width: 1.5,
    height: 24,
    backgroundColor: colors.cardBorder,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    letterSpacing: 1.2,
  },
  errorText: {
    fontSize: fontSizes.xs,
    color: colors.error,
    fontWeight: fontWeights.medium,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  helperText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});

