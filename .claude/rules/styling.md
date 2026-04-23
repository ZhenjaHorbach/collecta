# Styling

## Core

- Use NativeWind `className`. Never `StyleSheet.create`.
- Colors, spacing, radii come from the design-system tokens below. Don't invent values.

## Color tokens

All color tokens are **semantic** and auto-adapt per theme. Writing the same class in light vs dark yields different values — never bypass this.

**Backgrounds** `bg-bg`, `bg-surface`, `bg-surface-hi`, `bg-surface-lo`, `bg-app-shell`

**Text** `text-text`, `text-text-dim` (secondary), `text-text-muted` (placeholder)

**Gold accent** `bg-gold`, `bg-gold-hi`, `bg-gold-lo`, `text-on-gold` — CTAs, progress, achievements

**Semantic** `coral` (errors), `mint` (success), `sky` (info / links)

**Borders** `border-stroke`, `border-stroke-hi`

## Theming rules

- Use semantic tokens only. Never hex / rgba inline, and never palette-specific classes like `bg-white`, `bg-slate-950`, `text-amber-600`.
- Never add `dark:` prefixes. Tokens swap automatically when the root `.dark` class toggles via `useColorScheme()`. **Why:** `dark:bg-X` duplicates logic already encoded in `PALETTES` and drifts from the source of truth.
- New colors go into **both** `PALETTES.light` and `PALETTES.dark` in `src/constants/palettes.ts`, then `global.css` and `tailwind.config.js`. Run `/sync-colors` to verify.
- For native APIs that can't consume `className` (`ActivityIndicator`, `tabBar`, `placeholderTextColor`, shadow, Animated styles), use `useColors()` from `@hooks/useColors`.
- Runtime theme preference: `useTheme()` from `@hooks/useTheme`. Don't call NativeWind's `useColorScheme()` directly from UI code — use `useColors()` or the semantic class.

## Radius scale

`rounded-sm` 10px · `rounded-md` 16px · `rounded-lg` 22px · `rounded-xl` 28px.

## Spacing scale

`gap-2` 8 · `gap-3` 12 · `gap-4` 16 · `p-4` 16 (screen padding) · `p-6` 24 (card padding). Don't invent arbitrary values.

## Inline `style` — allowed only for

- Reanimated `animatedStyle`
- Dynamic runtime values (e.g. `{ width: progress * 100 + '%' }`)
- Third-party components that don't accept `className`
- `style={themeVars}` on the root `<View>` in `_layout.tsx` (CSS-var injection via `vars()`)
