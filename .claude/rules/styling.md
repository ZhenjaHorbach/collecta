# Styling Rules

## Core rule
Always use NativeWind `className` prop. Never use `StyleSheet.create`.

## Design tokens (from Collecta.html design file)

### Backgrounds
- `bg-bg` — #0E1116 — app background
- `bg-surface` — #171B22 — card / sheet surface
- `bg-surface-hi` — #1F252E — elevated surface
- `bg-surface-lo` — #0A0D12 — recessed / tab bar gradient base
- `bg-app-shell` — #06080B — outermost shell

### Text
- `text-text` — #F4F1EA — primary text
- `text-text-dim` — 62% opacity — secondary text
- `text-text-muted` — 38% opacity — placeholder / disabled

### Accent — Gold
- `text-gold` / `bg-gold` — #E9B86A — CTAs, progress, achievements
- `text-gold-hi` / `bg-gold-hi` — #F4CE88 — highlighted gold
- `text-gold-lo` / `bg-gold-lo` — #B8894A — dimmed gold

### Semantic colors
- `text-coral` / `bg-coral` — #F07A63 — errors, warnings
- `text-mint` / `bg-mint` — #7CCBA6 — success, nature
- `text-sky` / `bg-sky` — #6BA8D4 — info, links

### Borders
- `border-stroke` — rgba(255,255,255,0.06) — default border
- `border-stroke-hi` — rgba(255,255,255,0.12) — emphasized border

## Border radius scale
- `rounded-sm` = 10px — pills, chips
- `rounded-md` = 16px — cards, sheets
- `rounded-lg` = 22px — large cards
- `rounded-xl` = 28px — modals, bottom sheets

## Spacing scale
Consistent spacing — do not invent arbitrary values:
- `gap-2` = 8px (tight list items)
- `gap-3` = 12px (default card gap)
- `gap-4` = 16px (section gap)
- `p-4` = 16px (standard screen padding)
- `p-6` = 24px (card padding)

## Dark theme
Dark theme is the only theme. Never add light-mode variants unless explicitly asked.

## Exceptions
Inline `style` prop is allowed only for:
- Animated values (Reanimated `animatedStyle`)
- Truly dynamic runtime values (e.g., `{ width: progress * 100 + '%' }`)
- Third-party components that don't accept `className`
