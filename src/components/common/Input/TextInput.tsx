import React, { useState } from 'react';
import {
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

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
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

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}

        <RNTextInput
          placeholderTextColor={colors.textMuted}
          editable={editable}
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

        {rightIcon && <View style={styles.rightIconWrapper}>{rightIcon}</View>}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
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
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.backgroundMuted,
    borderColor: colors.divider,
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

