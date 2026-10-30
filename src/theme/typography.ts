/**
 * TANKR Design System — Typography Tokens
 * Clear, legible, accessible typography hierarchy designed for quick scanning.
 */

import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'sans-serif',
});

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const lineHeights = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
};

export const typography: Record<string, TextStyle> = {
  // Brand Header
  brandTitle: {
    fontFamily,
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  // Headings
  h1: {
    fontFamily,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  h2: {
    fontFamily,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: -0.2,
    lineHeight: 30,
  },
  h3: {
    fontFamily,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    lineHeight: 26,
  },
  h4: {
    fontFamily,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: 22,
  },
  // Body text
  bodyLarge: {
    fontFamily,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: 21,
  },
  bodySmall: {
    fontFamily,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: 18,
  },
  // Action & Button
  buttonLarge: {
    fontFamily,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.2,
  },
  buttonMedium: {
    fontFamily,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.1,
  },
  buttonSmall: {
    fontFamily,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  // Labels & Badges
  caption: {
    fontFamily,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    lineHeight: 15,
  },
  priceDisplay: {
    fontFamily,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.5,
  },
  etaBadge: {
    fontFamily,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
};

