/**
 * TANKR Design System — Shadow System
 * Multi-layer diffuse shadows tailored for light, clean card surfaces.
 */

import { Platform, ViewStyle } from 'react-native';

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,

  // Subtle elevation for unselected cards & text inputs
  subtle: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#16395E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
    default: {
      shadowColor: '#16395E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
    },
  }) as ViewStyle,

  // Standard elevation for cards, buttons, dialogs
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#16395E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    default: {
      shadowColor: '#16395E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
  }) as ViewStyle,

  // Floating elevation for bottom navigation, floating search pills, selected cards
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B64C0',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
    },
    android: {
      elevation: 8,
    },
    default: {
      shadowColor: '#0B64C0',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
    },
  }) as ViewStyle,

  // High elevation for bottom sheets & modal overlays
  modal: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#16395E',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
    },
    android: {
      elevation: 16,
    },
    default: {
      shadowColor: '#16395E',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
    },
  }) as ViewStyle,
};

