import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';

export interface SearchBarProps {
  value?: string;
  placeholder?: string;
  onPress?: () => void;
  onChangeText?: (text: string) => void;
  onClear?: () => void;
  isReadOnly?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value = '',
  placeholder = 'Where should the tanker deliver?',
  onPress,
  onChangeText,
  onClear,
  isReadOnly = false,
  containerStyle,
}) => {
  const content = (
    <View style={[styles.container, containerStyle]}>
      {/* Location Pin Icon */}
      <View style={styles.pinWrapper}>
        <Ionicons name="location-sharp" size={22} color={colors.primary} />
      </View>

      {/* Input or Tapable Label */}
      {isReadOnly ? (
        <View style={styles.textContainer}>
          <Text
            numberOfLines={1}
            style={[styles.placeholderText, Boolean(value) && styles.activeValueText]}
          >
            {value || placeholder}
          </Text>
        </View>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.textInput}
        />
      )}

      {/* Trailing Icon (Clear or Search Arrow) */}
      {Boolean(value) && onClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear location search"
          onPress={onClear}
          style={styles.actionButton}
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : (
        <View style={styles.actionButton}>
          <Ionicons name="search" size={20} color={colors.primary} />
        </View>
      )}
    </View>
  );

  if (isReadOnly && onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search delivery location"
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  pinWrapper: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    fontWeight: fontWeights.medium,
  },
  activeValueText: {
    color: colors.darkNavy,
    fontWeight: fontWeights.semibold,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontWeight: fontWeights.medium,
  },
  actionButton: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

