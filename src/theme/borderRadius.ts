/**
 * TANKR Design System — Border Radius Scale
 * Modern, clean geometry with balanced curves.
 */

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 22,
  '3xl': 26,
  full: 9999,
} as const;

export type BorderRadiusToken = keyof typeof borderRadius;

