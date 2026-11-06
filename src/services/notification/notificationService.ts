import { supabase } from '../supabase/client';

export type TankrNotificationType =
  | 'booking_confirmed'
  | 'supplier_accepted'
  | 'driver_assigned'
  | 'tanker_started'
  | 'tanker_approaching'
  | 'tanker_arrived'
  | 'delivery_completed'
  | 'booking_cancelled';

export interface TankrNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  booking_id?: string;
  type: TankrNotificationType;
  is_read: boolean;
  created_at: string;
}

class NotificationService {
  /**
   * Fetches user notifications sorted by recent first.
   */
  async getNotifications(userId: string): Promise<TankrNotification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error || !data) {
        return [];
      }

      return data as TankrNotification[];
    } catch {
      return [];
    }
  }

  /**
   * Sends or triggers an in-app notification for a user.
   * Cross-user notifications are generated authoritative-side by database triggers & stored procedures.
   */
  async triggerNotification(
    userId: string,
    type: TankrNotificationType,
    title: string,
    body: string,
    bookingId?: string
  ): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const currentUid = session?.session?.user?.id;
      // Only insert directly if caller matches session user or in local test environment
      if (process.env.NODE_ENV === 'test' || (currentUid && currentUid === userId)) {
        await supabase.from('notifications').insert({
          user_id: userId,
          title,
          body,
          booking_id: bookingId,
          type,
          is_read: false,
        });
      }
    } catch (e) {
      // Non-blocking fail
    }
  }

  /**
   * Marks a notification as read.
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch {
      // Ignored
    }
  }

  /**
   * Marks all notifications as read for a given user.
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);
    } catch {
      // Ignored
    }
  }

  /**
   * Subscribes to real-time notifications for a user via Supabase Realtime WebSocket.
   */
  subscribeToUserNotifications(userId: string, onNotification: (n: TankrNotification) => void): () => void {
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            onNotification(payload.new as TankrNotification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const notificationService = new NotificationService();

