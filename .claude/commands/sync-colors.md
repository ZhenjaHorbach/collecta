# /sync-colors

Verify that `src/constants/colors.ts` stays in sync with `tailwind.config.js`, and fix any drift. Tailwind config is the **source of truth** — `Colors.ts` mirrors a subset of it for native APIs (ActivityIndicator, style props, placeholderTextColor, tabBar colors) that cannot consume `className`.

## When to run

- After adding or changing a color in `tailwind.config.js`
- After adding or changing a color in `src/constants/colors.ts`
- Before opening a PR that touches either file

## Invariants

1. **Source of truth**: `tailwind.config.js` → `theme.extend.colors`. Every entry in `src/constants/colors.ts` MUST have a matching entry in Tailwind with the same hex/rgba value.
2. **Naming**: kebab-case in Tailwind maps to camelCase in `Colors` — e.g. `surface-hi` → `surfaceHi`, `on-gold` → `onGold`, `text-dim` → `textDim`.
3. **Subset allowed**: `Colors.ts` does NOT need to mirror every Tailwind token. Only entries that appear in `Colors.ts` must match. Tokens that are never used outside `className` (e.g. `overlay`, `map-bg`, `gold-glow`) can live in Tailwind only.
4. **No extras**: every key in `Colors` MUST exist in Tailwind. If a raw-hex usage has no Tailwind counterpart, add it to Tailwind first, then mirror it.

## Procedure

1. Read `tailwind.config.js` and extract the flat map `theme.extend.colors` (name → value).
2. Read `src/constants/colors.ts` and extract the flat map `Colors` (camelCase name → value).
3. Convert each `Colors` key back to kebab-case and look up the Tailwind entry.
4. Report three categories of drift:
   - **Missing in Tailwind**: a `Colors.*` entry whose kebab-case key has no Tailwind counterpart. This is an error — add the token to Tailwind first.
   - **Value mismatch**: same key on both sides, different hex/rgba. Tailwind wins — update `Colors.ts` to match.
   - **Tailwind-only (informational)**: Tailwind entries not present in `Colors.ts`. Not an error; list them so the user can decide whether any new raw-hex consumer needs mirroring.
5. If drift is found and the user requested a fix (default: yes when invoked via `/sync-colors`), update `src/constants/colors.ts` to match Tailwind. Preserve the file's existing header comment, `as const` assertion, and `ColorToken` type export.
6. After writing, run `npx tsc --noEmit` and `npx eslint src/constants/colors.ts` to verify.

## Kebab ↔ camelCase helpers

- Kebab → camel: `surface-hi` → `surfaceHi` (lowercase first segment, capitalize first letter of each subsequent segment).
- Camel → kebab: the inverse — insert `-` before each uppercase letter and lowercase it.

## Output format

Respond with one of:

- `✓ Colors in sync` — nothing to do.
- A report listing drift with category headings (`Missing in Tailwind`, `Value mismatch`, `Tailwind-only`), one entry per line in the form `key: colorsValue → tailwindValue`. Follow with either the applied fix (file edit) or a diff preview if the user asked to preview only.

## Non-goals

- Do NOT regenerate `tailwind.config.js` from `Colors.ts` — direction is always Tailwind → Colors.
- Do NOT add new tokens speculatively. Only sync what already exists in `Colors.ts`.
- Do NOT remove comments, type exports, or file headers in `Colors.ts` — only mutate the token values inside the `Colors = { … } as const` object.
