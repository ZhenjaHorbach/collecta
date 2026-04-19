# Styling Rules

## Core rule
Always use NativeWind `className` prop. Never use `StyleSheet.create`.

## Design tokens
Use tokens from `tailwind.config.js` extended colors:
- Background: `bg-background` (slate-950, #020617)
- Surface: `bg-surface` (slate-900, #0f172a)
- Border: `border-border` (slate-800, #1e293b)
- Muted text: `text-muted` (slate-600, #475569)
- Body text: `text-text` (slate-100, #f1f5f9)
- Accent / CTA: `text-accent`, `bg-accent` (amber-500, #f59e0b)

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
