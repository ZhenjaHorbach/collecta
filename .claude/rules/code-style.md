# Code Style

## TypeScript

- Strict on. No `any`, no `@ts-ignore`.
- Use `unknown` when a type is truly unknown, then narrow.
- Annotate all function parameters and return types.
- `satisfies` for config objects — preserves inference while validating shape.

## Components

- Functional components only.
- Named exports — no default exports from component files.
- One component per file; filename matches the PascalCase export.
- Props interface named `<ComponentName>Props`, defined directly above the component.

## Imports

- Order: React / RN → third-party → internal (`@<alias>/...` or `~/src/`) → relative.
- No barrel files that create circular deps.
- Use path aliases for cross-directory imports; reserve relative imports for same-folder files.

## i18n

- Every user-facing string goes through `t()` from `useTranslation()`. Applies to JSX, `Alert`, `placeholder`, `accessibilityLabel`, `title`, and every other prop rendered to the user.
- Keys live in `/src/i18n/locales/{en,ru,pl,uk}.json`. Add every new key to **all four** — `en.json` is the source of truth; missing keys fall back to English silently and count as incomplete.
- Key naming: `domain.element` (e.g. `auth.signIn.submit`, `collections.create`). Interpolate dynamic values: `t('auth.verify.subtitle', { email })`. **Why:** string concatenation breaks grammar in inflected languages (ru/uk/pl) — let i18next handle it.
- Reusable copy under `common.*`; tabs under `tabs.*`; language / theme labels under `languages.*` / `theme.*`.

## General

- No `console.log` in production code.
- No unused variables or imports (ESLint enforces).
- `const` over `let`; never `var`.
- Short-circuit (`cond && <X />`) over ternary for conditional rendering when there's no else branch.
