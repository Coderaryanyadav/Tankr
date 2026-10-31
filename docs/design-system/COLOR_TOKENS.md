# TANKR Design System — Color Tokens

## 1. Primary & Brand Identity
TANKR preserves a clean blue-and-slate identity reflecting pure water delivery, reliable municipal infrastructure, and swift logistics.

| Token Name | Hex Value | Semantic Purpose |
| :--- | :--- | :--- |
| `primary` | `#0B64C0` | Primary action buttons, active navigation icons, high-emphasis branding. |
| `primaryHover` | `#09529E` | Pressed / active state for primary blue elements. |
| `primaryLight` | `#EFF6FF` | Subtle tint for active chips, category pills, icon badge circles. |
| `secondary` | `#2563EB` | Secondary accents, highlights, informational callouts. |
| `secondaryHover` | `#1D4ED8` | Pressed secondary action state. |

---

## 2. Surfaces, Layout & Backgrounds
Surfaces are layered to give clean optical depth and card separation.

| Token Name | Hex Value | Usage Context |
| :--- | :--- | :--- |
| `background` | `#F8FAFC` | App screen base canvas (Slate 50). |
| `backgroundMuted` | `#F1F5F9` | Secondary backgrounds, inactive tabs, disabled containers. |
| `cardSurface` | `#FFFFFF` | Primary cards, bottom sheets, dropdown menus. |
| `cardSurfaceElevated` | `#FFFFFF` | Floating action modals, elevated popovers. |
| `cardBorder` | `#E2E8F0` | Subtle, clean border separating cards and containers (Slate 200). |
| `cardBorderSelected` | `#0B64C0` | Highlight border for selected cards and active inputs. |
| `overlay` | `rgba(15, 23, 42, 0.5)` | Backdrop scrim dimming map or background for modals. |
| `divider` | `#E2E8F0` | Hairline row separators. |

---

## 3. Typography & Content Colors

| Token Name | Hex Value | Semantic Role |
| :--- | :--- | :--- |
| `darkNavy` | `#0F172A` | Screen titles, prominent pricing numbers, brand headings (Slate 900). |
| `textPrimary` | `#1E293B` | Primary body text, form input text, modal messages (Slate 800). |
| `textSecondary` | `#64748B` | Subtitles, driver metadata, timestamps, captions (Slate 500). |
| `textMuted` | `#94A3B8` | Placeholder text, disabled button labels (Slate 400). |
| `textOnPrimary` | `#FFFFFF` | High-contrast white text rendered on primary blue background. |

---

## 4. Semantic & Functional Colors

| Semantic State | Base Color | Tint Color | Usage Scenario |
| :--- | :--- | :--- | :--- |
| **Success** | `#10B981` | `#ECFDF5` | Delivery complete, payment confirmed, water quality verified. |
| **Warning** | `#F59E0B` | `#FFFBEB` | Tanker en route, peak evening surcharge notice, delay alert. |
| **Error** | `#EF4444` | `#FEF2F2` | Order cancelled, payment failed, invalid PIN, network error. |
| **Info** | `#0284C7` | `#F0F9FF` | Informational announcements, water conservation tips. |

---

## 5. Dark Mode Preparedness
Dark mode tokens are pre-mapped in [`src/theme/theme.ts`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/theme/theme.ts). When dark mode is toggled, tokens switch to OLED-friendly dark slate (`#0B0F19`) canvas, elevated slate cards (`#1E293B`), and high-visibility Cyan-Blue (`#38BDF8`) for primary CTAs.
