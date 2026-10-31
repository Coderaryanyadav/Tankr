# TANKR Design System — Component Library Reference

The TANKR component library is organized under `src/components/common/` with clean barrel exports.

---

## 1. Action Components

### `Button`
- **Location**: [`src/components/common/Button/Button.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Button/Button.tsx)
- **Variants**: `primary`, `secondary`, `outline`, `ghost`, `danger`
- **Sizes**: `sm` (40px), `md` (48px), `lg` (56px)
- **States**: `default`, `pressed` (spring physics), `disabled`, `loading` (spinner with message)
- **Props**: `title`, `onPress`, `variant`, `size`, `disabled`, `loading`, `fullWidth`, `leftIcon`, `rightIcon`

### `IconButton`
- **Location**: [`src/components/common/Button/IconButton.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Button/IconButton.tsx)
- **Variants**: `surface`, `primary`, `secondary`, `outline`, `ghost`, `danger`
- **Sizes**: `xs` (28px), `sm` (36px), `md` (44px), `lg` (52px)
- **States**: `default`, `pressed`, `disabled`, `loading`

---

## 2. Input & Selection Components

### `TextInput`
- **Location**: [`src/components/common/Input/TextInput.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Input/TextInput.tsx)
- **States**: `default`, `focused`, `disabled`, `loading`, `success`, `error`
- **Features**: Built-in label, helper text, validation error text, left/right icons, activity indicator.

### `SearchBar`
- **Location**: [`src/components/common/Input/SearchBar.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Input/SearchBar.tsx)
- **Features**: Location pin indicator, clear button, interactive or read-only mode for modal triggers.

### `AddressSelector`
- **Location**: [`src/components/common/Input/AddressSelector.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Input/AddressSelector.tsx)
- **Features**: Category icons (`home`, `office`, `sump`), default badge, edit button, radio selection circle.

### `CapacitySelector`
- **Location**: [`src/components/common/Input/CapacitySelector.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Input/CapacitySelector.tsx)
- **Capacities**: 1,000L, 2,000L, 5,000L, 10,000L, 12,000L, 20,000L with icons and active pill states.

---

## 3. Data & Presentation Cards

### `TankerCard`
- **Location**: [`src/components/common/Card/TankerCard.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Card/TankerCard.tsx)
- **Features**: Tanker capacity badge, ETA countdown, driver name, vehicle registration number, price calculation, selection highlight.

### `SupplierCard`
- **Location**: [`src/components/common/Card/SupplierCard.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Card/SupplierCard.tsx)
- **Features**: Verified partner badge, rating, active fleet count, direct calling action.

### `BookingCard`
- **Location**: [`src/components/common/Card/BookingCard.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Card/BookingCard.tsx)
- **Features**: Order ID, status badge, delivery address, price, live tracking button, tax invoice link.

### `StatusBadge`
- **Location**: [`src/components/common/Card/StatusBadge.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Card/StatusBadge.tsx)
- **Variants**: `success`, `warning`, `error`, `info`, `primary`, `neutral`
- **Automatic Status Mapping**: Accepts `status` (`pending`, `en_route`, `delivering`, `delivered`, `cancelled`) and resolves semantic colors, icons, and labels.

### `PriceDisplay`
- **Location**: [`src/components/common/Card/PriceDisplay.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Card/PriceDisplay.tsx)
- **Features**: Formatted currency (`₹`), peak evening surge indicator, expandable line-item tax breakdown.

---

## 4. Overlays & Dialogs

### `BottomSheet`
- **Location**: [`src/components/common/Overlay/BottomSheet.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Overlay/BottomSheet.tsx)
- **Features**: Smooth drag handle, backdrop blur, elevation shadow, top rounded corners.

### `Modal`
- **Location**: [`src/components/common/Overlay/Modal.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Overlay/Modal.tsx)
- **Features**: Centered dialog card, high-contrast close button, accessibility trap.

### `ConfirmDialog`
- **Location**: [`src/components/common/Overlay/ConfirmDialog.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Overlay/ConfirmDialog.tsx)
- **Variants**: `standard`, `destructive` (for sign out or order cancellation).

---

## 5. Feedback & Skeletons

### `Toast`
- **Location**: [`src/components/common/Feedback/Toast.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Feedback/Toast.tsx)
- **Variants**: `success`, `error`, `warning`, `info`
- **Animations**: Slide in from top with auto-dismiss timer.

### `Skeleton`
- **Location**: [`src/components/common/Feedback/Skeleton.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Feedback/Skeleton.tsx)
- **Variants**: `text`, `circular`, `rectangular` with continuous shimmer effect.

### `EmptyState` & `ErrorState`
- **Locations**: [`src/components/common/Feedback/EmptyState.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Feedback/EmptyState.tsx), [`src/components/common/Feedback/ErrorState.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Feedback/ErrorState.tsx)
- **Features**: Centered illustrations, informative headings, retry action buttons.

---

## 6. Profile & Settings

### `ProfileSection` & `SettingsRow`
- **Locations**: [`src/components/common/Card/ProfileSection.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Card/ProfileSection.tsx), [`src/components/common/Card/SettingsRow.tsx`](file:///Users/aryan/Desktop/PROJECTS/TANKR/src/components/common/Card/SettingsRow.tsx)
- **Features**: Standardized list rows with colored icon squares, subtitles, chevrons, and dividers.
