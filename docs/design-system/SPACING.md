# TANKR Design System — Spacing & Layout Tokens

## 1. 4px Predictable Grid
TANKR enforces a strict 4-point spacing grid for layout margins, paddings, and alignment. This ensures rhythm, modularity, and alignment across all screen sizes.

| Token | Pixels | Common Application |
| :--- | :--- | :--- |
| `none` | `0px` | Explicit reset |
| `xxs` | `2px` | Icon text offsets, hairline adjustments |
| `xs` | `4px` | Tag padding, micro label margins |
| `sm` | `8px` | Horizontal gaps between icons and labels, chip padding |
| `md` | `12px` | Standard card internal padding, input padding |
| `lg` | `16px` | Container horizontal screen gutters |
| `xl` | `20px` | Bottom sheet content padding, modal padding |
| `2xl` | `24px` | Section vertical margins |
| `3xl` | `32px` | Spacing between distinct operational sections |
| `4xl` | `40px` | Hero image margins |
| `5xl` | `48px` | Bottom sheet maximum footer clearance |
| `6xl` | `64px` | Splash screen vertical offset |

---

## 2. Elevation & Shadows

| Shadow Token | iOS Offset / Blur | Android Elevation | Web Box-Shadow | Role |
| :--- | :--- | :--- | :--- | :--- |
| `subtle` | `0px 1px / 4px @ 5%` | `1dp` | `0 1px 4px rgba(15,23,42,0.05)` | Unselected cards, list items |
| `card` | `0px 2px / 8px @ 6%` | `2dp` | `0 2px 8px rgba(15,23,42,0.06)` | Standard cards, dialogs |
| `floating` | `0px 6px / 16px @ 10%` | `6dp` | `0 6px 16px rgba(15,23,42,0.10)`| Selected cards, toasts, floating search |
| `modal` | `0px -4px / 20px @ 12%`| `12dp` | `0 -4px 20px rgba(15,23,42,0.12)`| Bottom sheets, modal dialogues |

---

## 3. Border Radii Scale

```typescript
export const borderRadius = {
  none: 0,
  xs: 4,      // Badges & tiny indicators
  sm: 6,      // Default status chips
  md: 10,     // Compact buttons & pills
  lg: 14,     // Text inputs & medium buttons
  xl: 18,     // Cards & primary buttons
  '2xl': 22,  // Large cards & search bars
  '3xl': 26,  // Bottom sheets top corners
  full: 9999, // Circular avatars, icon buttons, radio dots
};
```
