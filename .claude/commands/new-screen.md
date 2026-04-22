# /new-screen

Scaffold a new screen following Collecta conventions: component under `src/screens/<Name>Screen/`, thin Expo Router wrapper in `src/app/`, typed Supabase service + hook when the screen fetches data.

## Arguments

`$ARGUMENTS` = `<Name> [<route>]`

- `Profile` — asks where to mount (ambiguous routes are not guessed).
- `Profile /(tabs)/profile` — creates both the screen and the route file.
- `CollectionDetail /collection/[id]` — route params become `useLocalSearchParams<{ id: string }>()`.

If `$ARGUMENTS` is empty, ask for the name and route before writing anything.

## Before writing

Read the relevant rule files once — don't restate their content in generated code:

- `.claude/rules/architecture.md` — directory/naming rules
- `.claude/rules/code-style.md` — TS strictness, import order
- `.claude/rules/styling.md` — NativeWind tokens, dark-theme only
- `.claude/rules/supabase.md` — typed queries, RLS

Ask the user which Supabase table(s) the screen reads/writes (if any), and whether the route is stack, tab, or modal.

## Mirror existing patterns, don't invent

- **Screen shape** — copy structure from the closest existing screen:
  - Header-chrome + body: `src/screens/SignInScreen/SignInScreen.tsx`
  - Header-chrome with title: `src/screens/CollectionDetailScreen/CollectionDetailScreen.tsx`
- **Data fetching** — put queries in a new or existing `src/services/<domain>.service.ts` using the `Database` type (`@typings/database`); expose them through a `use<Name>` hook in `src/hooks/` that returns `{ data, loading, error }`. Screen renders three branches: loading → `ActivityIndicator` in `Colors.gold`; error → `text-coral`; empty → `text-text-muted`.
- **Primitives** — reuse `GoBackButton`, `Button`, `Input`, `SafeAreaView` from `@components/*`. Only add a new component if the same JSX would otherwise appear 3+ times.

## Route wiring

`src/app/<path>.tsx` is a thin re-export:

```tsx
import { <Name>Screen } from '@screens/<Name>Screen';
export default <Name>Screen;
```

Touch `_layout.tsx` only when adding a new `<Stack.Screen>` entry or a modal presentation — file-based routing already handles the common case.

## Verify

After writing, run:

```bash
npx tsc --noEmit
npx eslint <new-files>
```

Both must pass. If the target Supabase table isn't in `src/typings/database.ts`, stop and tell the user to run `npm run types:gen` — don't fall back to `any`.

## Non-goals

- Don't invent table names, columns, or service functions — ask.
- Don't fabricate dummy in-component data to "simulate" a backend; render the empty state until Supabase is wired.
- Don't create new route groups (`(tabs)/`, `auth/`) or modal presentations unless explicitly requested.
- Don't write comments describing what the code does (repo rule).
- Don't copy rule-file content into the generated files — point at the source.
