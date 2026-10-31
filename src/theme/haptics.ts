import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';

/**
 * TANKR Cross-Platform Haptic Feedback System
 * 
 * Rules:
 * - Trigger haptics only on meaningful, intent-driven interactions.
 * - Do NOT trigger on high-frequency continuous events (dragging, scrolling).
 * - Safe on Web (falls back to navigator.vibrate where available or no-ops).
 */

class HapticsService {
  private isEnabled: boolean = true;

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Subtle selection feedback for significant choices (tanker selected, filter selected).
   */
  public async selection(): Promise<void> {
    if (!this.isEnabled) return;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(10);
        }
      } else {
        await ExpoHaptics.selectionAsync();
      }
    } catch {
      // Graceful fallback without breaking user flow
    }
  }

  /**
   * Light impact for responsive button taps (primary CTAs, modal confirmations).
   */
  public async lightImpact(): Promise<void> {
    if (!this.isEnabled) return;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(15);
        }
      } else {
        await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Medium impact for key confirmation actions (cancel booking confirm, submit order).
   */
  public async mediumImpact(): Promise<void> {
    if (!this.isEnabled) return;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(25);
        }
      } else {
        await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Success notification vibration for completed operations (order confirmed, PIN verified).
   */
  public async success(): Promise<void> {
    if (!this.isEnabled) return;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([20, 50, 20]);
        }
      } else {
        await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
      }
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Warning notification feedback (cancellation modal prompt, quota threshold).
   */
  public async warning(): Promise<void> {
    if (!this.isEnabled) return;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([30, 40, 30]);
        }
      } else {
        await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
      }
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Error notification feedback (payment failure, invalid address submission).
   */
  public async error(): Promise<void> {
    if (!this.isEnabled) return;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([40, 60, 40, 60, 40]);
        }
      } else {
        await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
      }
    } catch {
      // Graceful fallback
    }
  }
}

export const haptics = new HapticsService();
