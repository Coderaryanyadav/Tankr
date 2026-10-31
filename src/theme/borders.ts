/**
 * TANKR Design System — Border Tokens
 * Precise, crisp borders for cards, inputs, dividers, and focus rings.
 */

import { StyleSheet } from 'react-native';

export const borderWidth = {
  none: 0,
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  medium: 1.5,
  thick: 2,
  heavy: 3,
} as const;

export type BorderWidthToken = keyof typeof borderWidth;

export const borders = {
  none: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  card: {
    borderWidth: borderWidth.thin,
    borderColor: '#E2E8F0',
  },
  cardSelected: {
    borderWidth: borderWidth.thick,
    borderColor: '#0B64C0',
  },
  input: {
    borderWidth: borderWidth.thin,
    borderColor: '#CBD5E1',
  },
  inputFocus: {
    borderWidth: borderWidth.medium,
    borderColor: '#0B64C0',
  },
  inputError: {
    borderWidth: borderWidth.thin,
    borderColor: '#EF4444',
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
} as const;
