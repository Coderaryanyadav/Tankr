/**
 * TANKR Design System — Color Tokens
 * Premium blue-and-white theme inspired by high-reliability utility & logistics apps.
 */

export const colors = {
  // Brand Core
  primary: '#0B64C0',       // Primary Blue: main CTAs, active states, brand marks
  primaryHover: '#09529E',  // Pressed state for primary blue
  primaryLight: '#E3F2FD',  // Light tint for chips, badges, active tabs
  secondary: '#2688E8',     // Secondary Blue: gradients, highlights, secondary badges
  secondaryHover: '#1B73CB',// Pressed secondary

  // Surface & Layout
  background: '#EAF4FF',    // App screen background (soft water-tinted blue)
  backgroundMuted: '#F1F7FD',
  cardSurface: '#FFFFFF',   // Card background, bottom sheet surfaces, modals
  cardSurfaceElevated: '#FFFFFF',
  cardBorder: '#DCEBFA',    // Delicate borders for cards and inputs
  cardBorderSelected: '#0B64C0', // Selected card border

  // Typography & Content
  darkNavy: '#16395E',      // Headings, prominent metrics, logo typography
  textPrimary: '#18283B',   // Primary body text (high contrast dark)
  textSecondary: '#5A6F84', // Secondary captions, subtitled info, timestamps
  textMuted: '#8FA3B7',     // Placeholders, disabled text, tertiary captions
  textOnPrimary: '#FFFFFF', // High-contrast text on primary blue

  // Functional & Semantic States
  success: '#16A36A',       // Order delivered, payment confirmed, water verified
  successLight: '#E8F8F0',  // Success pill background
  warning: '#F59E0B',       // En route, delay notice, approaching location
  warningLight: '#FEF3C7',  // Warning pill background
  error: '#DC3545',         // Cancelled, payment failed, network error
  errorLight: '#FEE2E2',    // Error pill background
  info: '#0284C7',          // Informational notices
  infoLight: '#E0F2FE',

  // Overlays & Neutral Accents
  overlay: 'rgba(22, 57, 94, 0.45)', // Backdrop dim for modals & bottom sheets
  shimmerBase: '#E2EEFA',
  shimmerHighlight: '#F4F9FF',
  divider: '#E4EFF9',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;

