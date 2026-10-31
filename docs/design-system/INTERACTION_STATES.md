# TANKR Design System — Interaction States Specification

Every interactive component across the TANKR design system supports the standard 7-state interaction matrix:

```
[Default] ➔ [Pressed] ➔ [Focused] ➔ [Loading] ➔ [Success] / [Error]
    │
    ▼
[Disabled]
```

---

## 1. The 7 Standard Interaction States

### 1. Default (Idle)
- **Visual**: Standard card surface (`#FFFFFF`) or brand primary (`#0B64C0`), subtle 1px border (`#E2E8F0`), default elevation.
- **Behavior**: Ready for tap, pointer hovering, or keyboard focus.

### 2. Pressed (Active Touch)
- **Visual**: 
  - Primary button: Background darkens to `primaryHover` (`#09529E`).
  - Cards & Selectors: Subtle opacity reduction to `0.85` or scale reduction to `0.98` using spring physics (`tension: 300, friction: 20`).
- **Behavior**: Provides immediate tactile confirmation before action triggers.

### 3. Focused
- **Visual**: 
  - Inputs: Border width increases to `1.5px`, border color shifts to `primary` (`#0B64C0`), background lightens.
  - Buttons: Subtle glow / elevation increase.

### 4. Disabled
- **Visual**: Background changes to `backgroundMuted` (`#F1F5F9`), text shifts to `textMuted` (`#94A3B8`), opacity reduced to `0.6`, shadows set to `elevation: 0`.
- **Behavior**: Pointer events intercepted (`disabled={true}`), no click handlers executed, accessibility label notes disabled state.

### 5. Loading
- **Visual**: Text replaced or paired with `ActivityIndicator` spinner (`color: white` or `primary`), button width preserved to prevent layout shift.
- **Behavior**: Touch input disabled while asynchronous operation is in flight.

### 6. Success
- **Visual**: Border or background shifts to `success` (`#10B981`) or `successLight` (`#ECFDF5`), checkmark icon appears.
- **Usage**: Order booked, OTP verified, sump address saved.

### 7. Error
- **Visual**: Border turns to `error` (`#EF4444`), helper text turns red, warning icon displayed.
- **Usage**: Invalid phone number, expired session, insufficient capacity.

---

## 2. Component State Implementation Guide

```typescript
// Example: Pressable with State Matrix
<Pressable
  accessibilityRole="button"
  accessibilityState={{ disabled: isDisabled || isLoading, busy: isLoading }}
  disabled={isDisabled || isLoading}
  onPress={handlePress}
  style={({ pressed }) => [
    styles.container,
    isFocused && styles.focused,
    isSuccess && styles.success,
    isError && styles.error,
    isDisabled && styles.disabled,
    pressed && !isDisabled && styles.pressed,
  ]}
>
  {isLoading ? (
    <ActivityIndicator color={colors.primary} />
  ) : (
    <Text style={styles.label}>{title}</Text>
  )}
</Pressable>
```
