/**
 * TANKR Design System — Layout & Dimension Tokens
 * Consistent heights, icon scales, container widths, and responsive breakpoints.
 */

export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export type IconSizeToken = keyof typeof iconSizes;

export const buttonHeights = {
  sm: 36,
  md: 44,
  lg: 52,
  xl: 56,
} as const;

export type ButtonHeightToken = keyof typeof buttonHeights;

export const inputHeights = {
  sm: 40,
  md: 48,
  lg: 56,
} as const;

export type InputHeightToken = keyof typeof inputHeights;

export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
} as const;

export type BreakpointToken = keyof typeof breakpoints;

export const maxContainerWidths = {
  sm: 420,
  md: 600,
  lg: 900,
  xl: 1200,
} as const;
