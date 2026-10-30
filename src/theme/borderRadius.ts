/**
 * TANKR Design System — Border Radius Scale
 * Soft, approachable rounded geometry reflecting friendly water motifs.
 */

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export type BorderRadiusToken = keyof typeof borderRadius;

