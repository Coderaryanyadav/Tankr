import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useLocationStore } from '../../../stores/locationStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface DiscoveryHeaderProps {
  onAddressPress: () => void;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
  unreadNotificationsCount?: number;
}

export const DiscoveryHeader: React.FC<DiscoveryHeaderProps> = ({
  onAddressPress,
  onNotificationsPress,
  onProfilePress,
  unreadNotificationsCount = 1,
}) => {
  const { user, profile } = useAuthStore();
  const { activeAddressText, activeAddressLabel } = useLocationStore();

  const getInitials = (name?: string | null): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      {/* Location Dropdown Pill */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delivery Address: ${activeAddressText}. Tap to change.`}
        onPress={onAddressPress}
        style={({ pressed }) => [styles.addressPill, pressed && styles.pillPressed]}
      >
        <View style={styles.pinCircle}>
          <Ionicons name="location-sharp" size={18} color={colors.primary} />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.labelTag}>{activeAddressLabel || 'DELIVERING TO'}</Text>
            <Ionicons name="chevron-down" size={13} color={colors.primary} />
          </View>
          <Text numberOfLines={1} style={styles.addressLine}>
            {activeAddressText}
          </Text>
        </View>
      </Pressable>

      {/* Right Actions: Notifications & Profile */}
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={onNotificationsPress}
          style={({ pressed }) => [styles.iconButton, pressed && styles.btnPressed]}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.darkNavy} />
          {unreadNotificationsCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifText}>{unreadNotificationsCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account Profile"
          onPress={onProfilePress}
          style={({ pressed }) => [styles.profileAvatar, pressed && styles.btnPressed]}
        >
          {profile?.profile_photo_url ? (
            <Image
              source={{ uri: profile.profile_photo_url }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarInitials}>
              {getInitials(profile?.full_name)}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    zIndex: 20,
    ...shadows.subtle,
  },
  addressPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pillPressed: {
    opacity: 0.85,
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  labelTag: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  addressLine: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadows.subtle,
  },
  btnPressed: {
    transform: [{ scale: 0.95 }],
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifText: {
    fontSize: 9,
    color: colors.white,
    fontWeight: fontWeights.bold,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
});
