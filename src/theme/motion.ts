import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
import { animationDurations, springConfigs } from './animations';

export { animationDurations, springConfigs };

/**
 * TANKR Centralized Motion System
 * 
 * Rules:
 * - All transform & opacity animations MUST useNativeDriver: true (except unsupported layout on Web).
 * - Animations must be purposeful, fast (150ms-300ms), and non-blocking.
 * - Always respect AccessibilityInfo.isReduceMotionEnabled().
 */

/**
 * Hook to detect and listen to system reduced-motion preference.
 */
export function useReducedMotion(): boolean {
  const [isReduced, setIsReduced] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setIsReduced(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (isMounted) setIsReduced(enabled);
      }
    );

    return () => {
      isMounted = false;
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  return isReduced;
}

/**
 * Button Press Motion: Subtle 0.96 scale down on press, snappy spring recovery.
 */
export function animatePress(
  scaleAnim: Animated.Value,
  pressed: boolean,
  reducedMotion: boolean = false
) {
  if (reducedMotion) {
    scaleAnim.setValue(1);
    return;
  }

  if (pressed) {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: animationDurations.fast,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  } else {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: springConfigs.snappy.tension,
      friction: springConfigs.snappy.friction,
      useNativeDriver: true,
    }).start();
  }
}

/**
 * Card / Pill Selection Motion: Expands slightly (1.02) with subtle spring when selected.
 */
export function animateSelection(
  scaleAnim: Animated.Value,
  selected: boolean,
  reducedMotion: boolean = false
) {
  if (reducedMotion) {
    scaleAnim.setValue(1);
    return;
  }

  Animated.spring(scaleAnim, {
    toValue: selected ? 1.02 : 1.0,
    tension: springConfigs.gentle.tension,
    friction: springConfigs.gentle.friction,
    useNativeDriver: true,
  }).start();
}

/**
 * Success Icon Entrance: Scale 0 -> 1.15 -> 1.0 pop with fade-in.
 */
export function animateSuccessPop(
  scaleAnim: Animated.Value,
  opacityAnim: Animated.Value,
  reducedMotion: boolean = false,
  onComplete?: () => void
) {
  if (reducedMotion) {
    scaleAnim.setValue(1);
    opacityAnim.setValue(1);
    if (onComplete) onComplete();
    return;
  }

  scaleAnim.setValue(0.3);
  opacityAnim.setValue(0);

  Animated.parallel([
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: animationDurations.normal,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }),
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: springConfigs.bouncy.tension,
      friction: springConfigs.bouncy.friction,
      useNativeDriver: true,
    }),
  ]).start(() => {
    if (onComplete) onComplete();
  });
}

/**
 * Error Feedback: Subtle horizontal 3-cycle shake animation.
 */
export function animateErrorShake(
  translateXAnim: Animated.Value,
  reducedMotion: boolean = false,
  onComplete?: () => void
) {
  if (reducedMotion) {
    translateXAnim.setValue(0);
    if (onComplete) onComplete();
    return;
  }

  translateXAnim.setValue(0);

  Animated.sequence([
    Animated.timing(translateXAnim, { toValue: -8, duration: 45, useNativeDriver: true }),
    Animated.timing(translateXAnim, { toValue: 8, duration: 45, useNativeDriver: true }),
    Animated.timing(translateXAnim, { toValue: -5, duration: 45, useNativeDriver: true }),
    Animated.timing(translateXAnim, { toValue: 5, duration: 45, useNativeDriver: true }),
    Animated.timing(translateXAnim, { toValue: -2, duration: 45, useNativeDriver: true }),
    Animated.timing(translateXAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
  ]).start(() => {
    if (onComplete) onComplete();
  });
}

/**
 * Skeleton Shimmer Pulse: Smooth looping opacity pulse using native driver.
 */
export function startSkeletonShimmer(
  opacityAnim: Animated.Value,
  reducedMotion: boolean = false
): Animated.CompositeAnimation | null {
  if (reducedMotion) {
    opacityAnim.setValue(0.7);
    return null;
  }

  opacityAnim.setValue(0.4);

  const loopAnim = Animated.loop(
    Animated.sequence([
      Animated.timing(opacityAnim, {
        toValue: 0.85,
        duration: 750,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.4,
        duration: 750,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ])
  );

  loopAnim.start();
  return loopAnim;
}

/**
 * Tab Navigation Icon Motion: Quick spring on active selection.
 */
export function animateTabPress(
  scaleAnim: Animated.Value,
  reducedMotion: boolean = false
) {
  if (reducedMotion) {
    scaleAnim.setValue(1);
    return;
  }

  scaleAnim.setValue(0.85);
  Animated.spring(scaleAnim, {
    toValue: 1.0,
    tension: 250,
    friction: 12,
    useNativeDriver: true,
  }).start();
}
