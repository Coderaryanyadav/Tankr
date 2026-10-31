/**
 * TANKR Design System — Unified Theme & Dark Mode Architecture
 * Provides semantic token abstraction so components consume theme roles,
 * enabling seamless future dark mode switching without re-architecting UI code.
 */

import { borderRadius } from './borderRadius';
import { borders } from './borders';
import { colors } from './colors';
import { animationDurations, springConfigs } from './animations';
import { buttonHeights, iconSizes, inputHeights, breakpoints } from './layout';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { typography, fontSizes, fontWeights } from './typography';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  secondary: string;
  secondaryHover: string;
  background: string;
  backgroundMuted: string;
  cardSurface: string;
  cardSurfaceElevated: string;
  cardBorder: string;
  cardBorderSelected: string;
  darkNavy: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
  overlay: string;
  shimmerBase: string;
  shimmerHighlight: string;
  divider: string;
  white: string;
  black: string;
  transparent: string;
}

export const lightColors: ThemeColors = {
  ...colors,
};

/**
 * Architectural specification for dark theme tokens.
 * Prepared for future activation while preserving the primary TANKR blue identity.
 */
export const darkColors: ThemeColors = {
  primary: '#38BDF8', // Cyan-Blue for high-contrast dark surface visibility
  primaryHover: '#0284C7',
  primaryLight: '#082F49',
  secondary: '#60A5FA',
  secondaryHover: '#3B82F6',
  background: '#0B0F19', // Deep OLED navy slate
  backgroundMuted: '#111827',
  cardSurface: '#1E293B',
  cardSurfaceElevated: '#334155',
  cardBorder: '#334155',
  cardBorderSelected: '#38BDF8',
  darkNavy: '#F8FAFC',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textOnPrimary: '#0B0F19',
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#78350F',
  error: '#F87171',
  errorLight: '#7F1D1D',
  info: '#38BDF8',
  infoLight: '#0C4A6E',
  overlay: 'rgba(0, 0, 0, 0.75)',
  shimmerBase: '#1E293B',
  shimmerHighlight: '#334155',
  divider: '#334155',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const theme = {
  colors: lightColors,
  spacing,
  borderRadius,
  borders,
  shadows,
  typography,
  fontSizes,
  fontWeights,
  iconSizes,
  buttonHeights,
  inputHeights,
  breakpoints,
  animations: {
    duration: animationDurations,
    spring: springConfigs,
  },
} as const;

export type Theme = typeof theme;
