# TANKR Design System — Design Foundations

## 1. Architectural Philosophy
The TANKR design system establishes a unified, predictable, and scalable visual and interaction architecture across all mobile touchpoints. It is built around three core design tenets:
1. **Utility-First Clarity**: High information density without visual clutter, critical for on-demand water delivery and rapid driver/customer operations.
2. **Mobility & High-Contrast Readability**: Optimized for direct sunlight conditions on mobile devices using strong slate-900 typography, crisp 1-1.5px borders, and tactile touch targets (min 44px).
3. **Preserved Brand Identity**: Retaining TANKR's signature water logistics blue palette (`#0B64C0`) paired with clean slate surfaces and deliberate functional accents.

---

## 2. Design Foundation Matrix

| Token Category | Scale / Definition | Location |
| :--- | :--- | :--- |
| **Colors** | Core Blue (`#0B64C0`), Surface (`#F8FAFC`), Slate-800 (`#1E293B`) | [`src/theme/colors.ts`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/theme/colors.ts) |
| **Typography** | System/Roboto scale (`xs: 11px` to `4xl: 34px`) | [`src/theme/typography.ts`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/theme/typography.ts) |
| **Spacing** | 4px Predictable Grid (`none: 0` to `6xl: 64px`) | [`src/theme/spacing.ts`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/theme/spacing.ts) |
| **Border Radii** | Modern Geometry (`sm: 6px`, `lg: 14px`, `xl: 18px`, `full: 9999px`) | [`src/theme/borderRadius.ts`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/theme/borderRadius.ts) |
| **Borders** | Hairline to Heavy (`thin: 1px`, `medium: 1.5px`, `thick: 2px`) | [`src/theme/borders.ts`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/theme/borders.ts) |
| **Elevations** | Platform-neutral multi-layer shadows (`subtle`, `card`, `floating`, `modal`) | [`src/theme/shadows.ts`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/theme/shadows.ts) |
| **Dimensions** | Button heights (`36-56px`), Input heights (`40-56px`), Icon sizes (`12-48px`) | [`src/theme/layout.ts`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/theme/layout.ts) |
| **Animations** | Physics springs (`snappy`, `gentle`) & durations (`150ms-1200ms`) | [`src/theme/animations.ts`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/theme/animations.ts) |
| **Dark Mode Readiness** | Semantic mapping architecture (`lightColors` & `darkColors`) | [`src/theme/theme.ts`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/theme/theme.ts) |

---

## 3. Platform Consistency Rules
1. **Never Hardcode Hex Values or Margins**: Always import tokens from `src/theme/`.
2. **Standard Button Heights**: Primary actions must use `height: 52px` or `56px` (`lg` / `xl`). Secondary chips must use `36px` (`sm`).
3. **Touch Targets**: All interactive elements must satisfy WCAG 2.1 AA touch targets (at least 44x44 points or use `hitSlop`).
4. **Haptic Feedback & Feedback Loops**: Every button press must feature physical micro-animation (`Animated.spring` scale: `0.98`) to confirm interaction.
