import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';

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

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabPress,
  tabs = DEFAULT_TABS,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => onTabPress(tab.id)}
              style={styles.tabButton}
            >
              <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                <Ionicons
                  name={tab.iconName}
                  size={22}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                {Boolean(tab.badgeCount) && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgeText}>{tab.badgeCount}</Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardSurface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingBottom: 24, // Safe area pad
    paddingTop: spacing.xs,
    ...shadows.card,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 54,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    width: 36,
    height: 32,
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
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },
  tabLabel: {
    fontSize: fontSizes.xs - 1,
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

