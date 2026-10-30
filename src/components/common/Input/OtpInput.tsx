import React, { ElementRef, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChangeOtp: (otp: string) => void;
  error?: string;
  autoFocus?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChangeOtp,
  error,
  autoFocus = true,
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const inputRefs = useRef<Array<ElementRef<typeof TextInput> | null>>([]);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const handleChangeText = (text: string, index: number) => {
    const cleanDigit = text.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    const combined = newDigits.join('');
    onChangeOtp(combined);

    if (cleanDigit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  type KeyPressEvent = Parameters<NonNullable<TextInputProps['onKeyPress']>>[0];

  const handleKeyPress = (
    e: KeyPressEvent,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.boxesRow}>
        {Array.from({ length }).map((_, index) => {
          const isFocused = focusedIndex === index;
          const hasValue = Boolean(digits[index]);

          return (
            <View
              key={index}
              style={[
                styles.digitBox,
                isFocused && styles.digitBoxFocused,
                hasValue && styles.digitBoxFilled,
                Boolean(error) && styles.digitBoxError,
              ]}
            >
              <TextInput
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                accessibilityLabel={`OTP digit ${index + 1}`}
                keyboardType="number-pad"
                maxLength={1}
                value={digits[index]}
                onChangeText={(text) => handleChangeText(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(-1)}
                style={styles.digitText}
                textAlign="center"
                selectTextOnFocus
              />
            </View>
          );
        })}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 360,
  },
  digitBox: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.cardSurface,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
    borderWidth: 2,
  },
  digitBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  digitBoxError: {
    borderColor: colors.error,
  },
  digitText: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    width: '100%',
    height: '100%',
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSizes.xs,
    color: colors.error,
    fontWeight: fontWeights.medium,
    marginTop: spacing.sm,
  },
});
