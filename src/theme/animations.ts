/**
 * TANKR Design System — Animation Tokens
 * Smooth physics-based timings and easing curves.
 */

export const animationDurations = {
  instant: 0,
  fast: 150,
  normal: 250,
  moderate: 350,
  slow: 500,
  shimmer: 1200,
} as const;

export type AnimationDurationToken = keyof typeof animationDurations;

export const springConfigs = {
  snappy: {
    tension: 300,
    friction: 20,
  },
  gentle: {
    tension: 120,
    friction: 14,
  },
  bouncy: {
    tension: 180,
    friction: 12,
  },
} as const;
