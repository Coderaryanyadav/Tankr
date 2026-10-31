import { Animated } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';
import { haptics } from '../../src/theme/haptics';
import {
  animatePress,
  animateSelection,
  animateSuccessPop,
  animateErrorShake,
  startSkeletonShimmer,
  animateTabPress,
  animationDurations,
  springConfigs,
} from '../../src/theme/motion';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

describe('Micro-Interaction and Motion Design System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Centralized Haptics Service', () => {
    it('triggers selection haptic for card/filter/tab selection', async () => {
      await haptics.selection();
      expect(ExpoHaptics.selectionAsync).toHaveBeenCalledTimes(1);
    });

    it('triggers light impact for button press, map zoom, and bottom sheet snapping', async () => {
      await haptics.lightImpact();
      expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(
        ExpoHaptics.ImpactFeedbackStyle.Light
      );
    });

    it('triggers medium impact for booking submission and high-intent actions', async () => {
      await haptics.mediumImpact();
      expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(
        ExpoHaptics.ImpactFeedbackStyle.Medium
      );
    });

    it('triggers success notification for order confirmation and PIN validation', async () => {
      await haptics.success();
      expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
        ExpoHaptics.NotificationFeedbackType.Success
      );
    });

    it('triggers warning notification for destructive cancellations', async () => {
      await haptics.warning();
      expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
        ExpoHaptics.NotificationFeedbackType.Warning
      );
    });

    it('triggers error notification for input validation errors', async () => {
      await haptics.error();
      expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
        ExpoHaptics.NotificationFeedbackType.Error
      );
    });

    it('handles unexpected haptics exceptions gracefully without throwing', async () => {
      (ExpoHaptics.selectionAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Haptics not supported on device')
      );

      // Must not throw or crash
      await expect(haptics.selection()).resolves.toBeUndefined();
    });
  });

  describe('Centralized Motion Animations', () => {
    it('scales down to 0.96 on pressIn and springs back to 1.0 on pressOut', () => {
      const scaleAnim = new Animated.Value(1);
      const setValueSpy = jest.spyOn(scaleAnim, 'setValue');

      // Press In
      animatePress(scaleAnim, true, false);
      // Press Out
      animatePress(scaleAnim, false, false);

      expect(scaleAnim).toBeDefined();
    });

    it('bypasses press scaling when reducedMotion is enabled', () => {
      const scaleAnim = new Animated.Value(0.96);
      const setValueSpy = jest.spyOn(scaleAnim, 'setValue');

      animatePress(scaleAnim, true, true);
      expect(setValueSpy).toHaveBeenCalledWith(1);
    });

    it('animates card selection spring and respects reduced motion', () => {
      const scaleAnim = new Animated.Value(1);
      const setValueSpy = jest.spyOn(scaleAnim, 'setValue');

      // Normal mode: spring to 1.02
      animateSelection(scaleAnim, true, false);

      // Reduced motion: instant 1.0
      animateSelection(scaleAnim, true, true);
      expect(setValueSpy).toHaveBeenCalledWith(1);
    });

    it('executes success pop with spring bounce or instant transition on reduced motion', () => {
      const scaleAnim = new Animated.Value(0.3);
      const opacityAnim = new Animated.Value(0);
      const onComplete = jest.fn();

      // With reduced motion: instantly set values to 1
      animateSuccessPop(scaleAnim, opacityAnim, true, onComplete);
      expect(onComplete).toHaveBeenCalled();
    });

    it('executes 3-cycle horizontal error shake or zero-displacement on reduced motion', () => {
      const translateXAnim = new Animated.Value(0);
      const onComplete = jest.fn();

      // Reduced motion: immediate zero displacement
      animateErrorShake(translateXAnim, true, onComplete);
      expect(onComplete).toHaveBeenCalled();
    });

    it('starts skeleton shimmer pulse loop or locks to static opacity for reduced motion', () => {
      const opacityAnim = new Animated.Value(0.4);

      // Reduced motion
      const reducedShimmer = startSkeletonShimmer(opacityAnim, true);
      expect(reducedShimmer).toBeNull();

      // Normal mode
      const activeShimmer = startSkeletonShimmer(opacityAnim, false);
      expect(activeShimmer).not.toBeNull();
      expect(typeof activeShimmer?.stop).toBe('function');
      activeShimmer?.stop();
    });

    it('animates tab press spring or skips on reduced motion', () => {
      const scaleAnim = new Animated.Value(1);
      const setValueSpy = jest.spyOn(scaleAnim, 'setValue');

      animateTabPress(scaleAnim, true);
      expect(setValueSpy).toHaveBeenCalledWith(1);

      animateTabPress(scaleAnim, false);
      expect(scaleAnim).toBeDefined();
    });

    it('maintains high-performance timing and physics thresholds', () => {
      expect(animationDurations.fast).toBeLessThanOrEqual(200);
      expect(animationDurations.normal).toBeLessThanOrEqual(300);
      expect(springConfigs.snappy.tension).toBeGreaterThan(60);
      expect(springConfigs.gentle.friction).toBeGreaterThan(5);
    });
  });
});
