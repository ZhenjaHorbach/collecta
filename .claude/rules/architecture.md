# Architecture

## Directory map

```
src/
  app/           — Expo Router file-based routes (thin wrappers over screens)
  screens/       — Full-screen components mounted by Expo Router routes
  components/    — Reusable UI primitives and composite components
  services/      — All external I/O: Supabase queries, Claude API calls, storage
  hooks/         — Custom React hooks (data fetching, device APIs, state)
  utils/         — Pure functions with no side effects (formatters, validators)
  types/         — Shared TypeScript interfaces and type aliases
supabase/
  migrations/    — Ordered SQL migration files (001_, 002_, ...)
```

## Rules

- `app/` route files are thin: import and render a screen from `src/screens/`
- Business logic lives in services and hooks, not in components or screens
- A hook may call a service; a service must not import a hook
- Utils are pure — no imports from services, hooks, or components
- Types may be imported by anything; types import nothing from this project
- Tests are co-located in `__tests__/` folders next to the code they cover (e.g. `src/utils/__tests__/`, `src/evals/__tests__/`, `supabase/functions/<fn>/__tests__/`). Files end in `.test.ts`. **Why:** Jest's standard convention, auto-discovered without extra config, keeps related code and tests in the same diff. Don't introduce a top-level `tests/` or `__tests__/` directory — it splits the import graph from the test graph and breaks the pattern

## Naming

- Screens: `<Name>Screen.tsx` → `export const CollectionScreen`
- Components: `<Name>.tsx` → `export const CollectionCard`
- Services: `<domain>.service.ts` → functions, not classes
- Hooks: `use<Name>.ts` → `export function useCollection`
- Utils: `<domain>.utils.ts` → named exports
