import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../../components/common/Feedback/EmptyState';
import { useNotificationStore } from '../../../stores/notificationStore';
import { useAuthStore } from '../../../stores/authStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { TankrNotification, TankrNotificationType } from '../../../services/notification/notificationService';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
}) => {
  const { user } = useAuthStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotificationStore();

  const getNotificationIcon = (type: TankrNotificationType) => {
    switch (type) {
      case 'delivery_completed':
        return { name: 'checkmark-circle' as const, color: colors.success };
      case 'tanker_arrived':
        return { name: 'location' as const, color: colors.warning };
      case 'tanker_started':
      case 'tanker_approaching':
        return { name: 'navigate' as const, color: colors.primary };
      case 'driver_assigned':
      case 'supplier_accepted':
        return { name: 'shield-checkmark' as const, color: colors.secondary };
      case 'booking_cancelled':
        return { name: 'alert-circle' as const, color: colors.error };
      default:
        return { name: 'notifications' as const, color: colors.primary };
    }
  };

  const formatTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.darkNavy} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.headerSubtitle}>{unreadCount} unread alert{unreadCount > 1 ? 's' : ''}</Text>
            )}
          </View>
          {unreadCount > 0 && user?.id && (
            <Pressable
              onPress={() => markAllAsRead(user.id)}
              style={styles.markAllBtn}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <EmptyState
              title="All Caught Up"
              description="You don't have any notifications right now. Order updates and tanker dispatch notices will appear here."
              actionTitle="Back to Map"
              onAction={onClose}
            />
          ) : (
            notifications.map((item) => {
              const icon = getNotificationIcon(item.type);

              return (
                <Pressable
                  key={item.id}
                  onPress={() => markAsRead(item.id)}
                  style={[
                    styles.notifCard,
                    !item.is_read && styles.notifUnread,
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${icon.color}15` },
                    ]}
                  >
                    <Ionicons name={icon.name} size={22} color={icon.color} />
                  </View>

                  <View style={styles.bodyCol}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
                    </View>
                    <Text style={styles.itemBody}>{item.body}</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: fontWeights.medium,
    marginTop: 1,
  },
  markAllBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  notifUnread: {
    backgroundColor: '#F3F9FF',
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  bodyCol: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    flex: 1,
    marginRight: spacing.xs,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  itemBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
});

