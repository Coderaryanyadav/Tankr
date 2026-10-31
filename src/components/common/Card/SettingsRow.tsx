import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';

export interface SettingsRowProps {
  title: string;
  subtitle?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
  showDivider?: boolean;
  isDestructive?: boolean;
  rightElement?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  title,
  subtitle,
  iconName,
  iconColor,
  iconBgColor,
  onPress,
  showChevron = true,
  showDivider = true,
  isDestructive = false,
  rightElement,
  style,
}) => {
  const defaultIconColor = isDestructive ? colors.error : colors.primary;
  const defaultBgColor = isDestructive ? colors.errorLight : colors.primaryLight;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${subtitle ? `: ${subtitle}` : ''}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && styles.divider,
        pressed && Boolean(onPress) && styles.rowPressed,
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrapper,
          { backgroundColor: iconBgColor || defaultBgColor },
        ]}
      >
        <Ionicons
          name={iconName}
          size={20}
          color={iconColor || defaultIconColor}
        />
      </View>

      <View style={styles.textCol}>
        <Text
          style={[
            styles.title,
            isDestructive && styles.destructiveTitle,
          ]}
        >
          {title}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {rightElement ? (
        rightElement
      ) : showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cardSurface,
  },
  rowPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  destructiveTitle: {
    color: colors.error,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
