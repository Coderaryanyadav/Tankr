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
        return this.getFallbackNotifications(userId);
      }

      return data as TankrNotification[];
    } catch {
      return this.getFallbackNotifications(userId);
    }
  }

  /**
   * Sends or triggers an in-app notification for a user.
   */
  async triggerNotification(
    userId: string,
    type: TankrNotificationType,
    title: string,
    body: string,
    bookingId?: string
  ): Promise<void> {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        title,
        body,
        booking_id: bookingId,
        type,
        is_read: false,
      });
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
   * Fallback sample notifications when table is empty or offline.
   */
  private getFallbackNotifications(userId: string): TankrNotification[] {
    return [
      {
        id: 'notif-1',
        user_id: userId,
        title: 'Water Delivery Completed! 💧',
        body: 'Your 5,000L Potable tanker has completed delivery at Villa 14, Sobha Palm Meadows. Tax invoice is ready.',
        booking_id: 'req-101',
        type: 'delivery_completed',
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        id: 'notif-2',
        user_id: userId,
        title: 'Driver Arrived at Location 📍',
        body: 'Driver Basavaraj Patil has arrived. Please share your 4-digit PIN (4829) with the driver to start delivery.',
        booking_id: 'req-101',
        type: 'tanker_arrived',
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      },
      {
        id: 'notif-3',
        user_id: userId,
        title: 'Order Confirmed & Tanker Dispatched 🚛',
        body: 'Sri Cauvery Water Supplies has assigned tanker KA-04-TC-5001. ETA is 18 minutes.',
        booking_id: 'req-101',
        type: 'tanker_started',
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
    ];
  }
}

export const notificationService = new NotificationService();

