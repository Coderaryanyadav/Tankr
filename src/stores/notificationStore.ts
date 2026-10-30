import { create } from 'zustand';
import { notificationService, TankrNotification } from '../services/notification/notificationService';

interface NotificationState {
  notifications: TankrNotification[];
  isLoading: boolean;
  unreadCount: number;

  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  addNotification: (notification: TankrNotification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,
  unreadCount: 0,

  fetchNotifications: async (userId: string) => {
    set({ isLoading: true });
    try {
      const list = await notificationService.getNotifications(userId);
      const unread = list.filter((n) => !n.is_read).length;
      set({ notifications: list, unreadCount: unread, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    await notificationService.markAsRead(id);
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    );
    set({
      notifications: updated,
      unreadCount: updated.filter((n) => !n.is_read).length,
    });
  },

  markAllAsRead: async (userId: string) => {
    await notificationService.markAllAsRead(userId);
    const updated = get().notifications.map((n) => ({ ...n, is_read: true }));
    set({
      notifications: updated,
      unreadCount: 0,
    });
  },

  addNotification: (notification: TankrNotification) => {
    const list = [notification, ...get().notifications];
    set({
      notifications: list,
      unreadCount: list.filter((n) => !n.is_read).length,
    });
  },
}));

