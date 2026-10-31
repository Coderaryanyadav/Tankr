import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleProp,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';
import { animateErrorShake, useReducedMotion } from '../../../theme/motion';
import { haptics } from '../../../theme/haptics';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string | null;
  success?: boolean;
  loading?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  success,
  loading = false,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  editable = true,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const isReducedMotion = useReducedMotion();

  useEffect(() => {
    if (error) {
      animateErrorShake(shakeAnim, isReducedMotion);
      haptics.error();
    }
  }, [error, isReducedMotion]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        containerStyle,
        { transform: [{ translateX: shakeAnim }] },
      ]}
    >
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          Boolean(success) && styles.inputSuccess,
          Boolean(error) && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}

        <RNTextInput
          placeholderTextColor={colors.textMuted}
          editable={editable && !loading}
          accessibilityLabel={label || rest.placeholder || 'Text input'}
          accessibilityHint={helperText || undefined}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, inputStyle]}
          {...rest}
        />

        {loading ? (
          <View style={styles.rightIconWrapper}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : rightIcon ? (
          <View style={styles.rightIconWrapper}>{rightIcon}</View>
        ) : null}
      </View>

      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={styles.errorText}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </Animated.View>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: spacing.xs,
    backgroundColor: colors.cardSurface,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  inputSuccess: {
    borderColor: colors.success,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.backgroundMuted,
    borderColor: colors.divider,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontWeight: fontWeights.medium,
  },
  leftIconWrapper: {
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIconWrapper: {
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: fontSizes.xs,
    color: '#B91C1C', // Red 700: High-contrast 6.2:1 against light card backgrounds
    fontWeight: fontWeights.semibold,
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
