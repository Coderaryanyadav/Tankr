/**
 * TANKR Design System — Color Tokens
 * Premium, minimal blue-and-white palette inspired by modern mobility & fintech platforms.
 */

export const colors = {
  // Brand Core
  primary: '#0B64C0',       // Primary Blue: main CTAs, active states, brand marks
  primaryHover: '#09529E',  // Pressed state for primary blue
  primaryLight: '#EFF6FF',  // Subtle tint for chips, badges, active tabs
  secondary: '#2563EB',     // Secondary Blue: accents, highlights
  secondaryHover: '#1D4ED8',// Pressed secondary

  // Surface & Layout
  background: '#F8FAFC',    // Modern neutral app screen background (clean slate)
  backgroundMuted: '#F1F5F9',// Muted background for secondary sections
  cardSurface: '#FFFFFF',   // Card background, bottom sheet surfaces, modals
  cardSurfaceElevated: '#FFFFFF',
  cardBorder: '#E2E8F0',    // Clean subtle border for cards and inputs
  cardBorderSelected: '#0B64C0', // Selected card border

  // Typography & Content
  darkNavy: '#0F172A',      // Headings, prominent metrics, logo typography (Slate 900)
  textPrimary: '#1E293B',   // Primary body text (Slate 800)
  textSecondary: '#64748B', // Secondary captions, subtitled info, timestamps (Slate 500)
  textMuted: '#94A3B8',     // Placeholders, disabled text, tertiary captions (Slate 400)
  textOnPrimary: '#FFFFFF', // High-contrast text on primary blue

  // Functional & Semantic States
  success: '#10B981',       // Order delivered, payment confirmed, water verified
  successLight: '#ECFDF5',  // Success pill background
  warning: '#F59E0B',       // En route, delay notice, approaching location
  warningLight: '#FFFBEB',  // Warning pill background
  error: '#EF4444',         // Cancelled, payment failed, network error
  errorLight: '#FEF2F2',    // Error pill background
  info: '#0284C7',          // Informational notices
  infoLight: '#F0F9FF',

  // Overlays & Neutral Accents
  overlay: 'rgba(15, 23, 42, 0.5)', // Backdrop dim for modals & bottom sheets
  shimmerBase: '#E2E8F0',
  shimmerHighlight: '#F8FAFC',
  divider: '#E2E8F0',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;

