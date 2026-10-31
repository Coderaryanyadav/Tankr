import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';
import { animateTabPress, useReducedMotion } from '../../../theme/motion';
import { haptics } from '../../../theme/haptics';

export type TabId = 'discovery' | 'bookings' | 'activity' | 'profile';

export interface TabItem {
  id: TabId;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
}

export interface BottomNavProps {
  activeTab: TabId;
  onTabPress: (id: TabId) => void;
  tabs?: TabItem[];
}

const DEFAULT_TABS: TabItem[] = [
  { id: 'discovery', label: 'Book Tanker', iconName: 'water' },
  { id: 'bookings', label: 'My Bookings', iconName: 'receipt-outline' },
  { id: 'activity', label: 'Live Track', iconName: 'navigate-circle-outline' },
  { id: 'profile', label: 'Account', iconName: 'person-outline' },
];

const TabButton: React.FC<{
  tab: TabItem;
  isActive: boolean;
  onPress: () => void;
  isReducedMotion: boolean;
}> = ({ tab, isActive, onPress, isReducedMotion }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    animateTabPress(scaleAnim, isReducedMotion);
    haptics.selection();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: isActive }}
      onPress={handlePress}
      style={styles.tabButton}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          isActive && styles.iconContainerActive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Ionicons
          name={tab.iconName}
          size={20}
          color={isActive ? colors.primary : colors.textSecondary}
        />
        {Boolean(tab.badgeCount) && (
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{tab.badgeCount}</Text>
          </View>
        )}
      </Animated.View>

      <Text
        style={[
          styles.tabLabel,
          isActive ? styles.tabLabelActive : styles.tabLabelInactive,
        ]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
};

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabPress,
  tabs = DEFAULT_TABS,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  const isReducedMotion = useReducedMotion();

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <View style={styles.content}>
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onPress={() => onTabPress(tab.id)}
            isReducedMotion={isReducedMotion}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardSurface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.xs,
    zIndex: 50,
    ...shadows.subtle,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 52,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: 4,
  },
  iconContainer: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  iconContainerActive: {
    backgroundColor: colors.primaryLight,
  },
  badgePill: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },
  tabLabel: {
    fontSize: fontSizes.xs,
    marginTop: 2,
    fontWeight: fontWeights.medium,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  tabLabelInactive: {
    color: colors.textSecondary,
  },
});

