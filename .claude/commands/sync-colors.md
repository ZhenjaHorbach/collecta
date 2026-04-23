# /sync-colors

Verify that color tokens stay in sync across the three theming layers, and fix any drift.

## Layers

| File                        | Role                                                                      |
| --------------------------- | ------------------------------------------------------------------------- |
| `src/constants/palettes.ts` | **Source of truth** — `PALETTES.light` / `PALETTES.dark`, camelCase keys. |
| `global.css`                | `:root` (light) and `.dark:root` (dark) CSS-variable declarations.        |
| `tailwind.config.js`        | Each token in `theme.extend.colors` maps `kebab-name` → `'var(--kebab)'`. |

Runtime theme switching reads `PALETTES` via `useThemeVars.ts` and `useColors.ts` — both out of scope.

## Invariants

1. `PALETTES.light` and `PALETTES.dark` have identical key sets.
2. For every `PALETTES` key: kebab form exists in both `:root` / `.dark:root` with matching values, and in Tailwind as `'var(--kebab)'`.
3. No extra keys in `global.css` or `tailwind.config.js` beyond `PALETTES`.

## Procedure

1. Extract flat maps from each layer.
2. Compare and report drift under these headings (one line per entry, `name: observed → expected`):
   - **Key-set mismatch** — `PALETTES.light` vs `.dark`
   - **global.css** — missing / value mismatch / extra
   - **Tailwind** — missing / value mismatch / extra
3. Fix drift by editing the downstream files to match `PALETTES`. Preserve comments, headers, `as const`, and type exports.
4. Run `npx tsc --noEmit` and `npx eslint <edited-ts-files>`.

Kebab ↔ camel: `surface-hi` ↔ `surfaceHi`.

## Output

- `✓ Colors in sync` when nothing to do.
- Otherwise: drift report (by heading) + applied fix, or a diff preview if the user asked to preview only.

## Non-goals

- Direction is always `PALETTES` → others. Never regenerate `PALETTES` from any other file.
- Do not touch `useThemeVars.ts` / `useColors.ts`.
