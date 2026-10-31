# TANKR — Coding Standards & Engineering Guidelines

## 1. TypeScript Strictness

- All files must be valid TypeScript (`.ts` or `.tsx`).
- `npx tsc --noEmit` must pass with **0 errors**.
- Explicitly type all function signatures, API responses, and store actions.
- Avoid the `any` type. Use `unknown` with type narrowing or define specific interfaces in `src/types/`.

---

## 2. React Native & Mobile Conventions

- Use `StyleSheet.create()` for styling; do not declare inline object literals inside render loops.
- Use `Platform.OS` guards for web vs mobile platform deviations.
- Clean up all event listeners and Supabase WebSocket subscriptions in `useEffect` return functions.
- Optimize list rendering: Always provide stable `keyExtractor` functions in `FlatList`.

---

## 3. Zustand State Architecture

- Business logic belongs in Zustand stores (`src/stores/`).
- Components should only consume state and dispatch store actions.
- Handle loading and error states explicitly in stores.
- Never write database mutations directly in JSX components without routing through a store or service adapter.
