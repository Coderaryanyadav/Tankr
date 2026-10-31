# TANKR Design System — Typography Tokens

## 1. Typeface Architecture
TANKR employs platform-native typography engines for optimal performance, sharpness, and rendering speeds:
- **iOS**: Apple San Francisco (`System`)
- **Android**: Google `Roboto`
- **Web**: Standard `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

---

## 2. Scale & Hierarchy

| Token | Size | Weight | Line Height | Usage Example |
| :--- | :--- | :--- | :--- | :--- |
| `brandTitle` | `34px` (`4xl`) | Heavy (800) | `40px` | App splash & onboarding hero titles |
| `h1` | `28px` (`3xl`) | Bold (700) | `34px` | Screen titles (e.g. "My Water Orders") |
| `h2` | `24px` (`2xl`) | Bold (700) | `30px` | Modal titles, section headlines |
| `h3` | `20px` (`xl`) | Semibold (600) | `26px` | Card headers, confirmation titles |
| `h4` | `17px` (`lg`) | Semibold (600) | `22px` | Sub-section headers |
| `bodyLarge` | `17px` (`lg`) | Regular (400) | `24px` | Long descriptions, instructions |
| `bodyMedium` | `15px` (`md`) | Regular (400) | `21px` | Standard body copy, list row text |
| `bodySmall` | `13px` (`sm`) | Regular (400) | `18px` | Delivery addresses, metadata, hints |
| `caption` | `11px` (`xs`) | Medium (500) | `15px` | Timestamps, status subtitles, tags |
| `priceDisplay` | `24px` (`2xl`) | Heavy (800) | `28px` | Rupee amounts (e.g. `₹1,449.00`) |
| `buttonLarge` | `17px` (`lg`) | Bold (700) | `20px` | Main bottom sheet call-to-action buttons |
| `buttonMedium`| `15px` (`md`) | Semibold (600) | `18px` | Secondary and inline buttons |
| `buttonSmall` | `13px` (`sm`) | Semibold (600) | `16px` | Compact chip actions |

---

## 3. Font Weights

```typescript
export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
};
```

---

## 4. Usage Rules
- Headings (`h1`, `h2`, `h3`) must always use `colors.darkNavy` (`#0F172A`).
- Body text must always use `colors.textPrimary` (`#1E293B`) or `colors.textSecondary` (`#64748B`).
- Never set arbitrary numeric font sizes in inline component styles. Always reference `fontSizes` or `typography` tokens.
