# Testing

## Rule

When you add a new file under `src/utils/`, `src/services/`, or `src/hooks/`,
add a co-located test in `__tests__/` next to it **in the same PR**. The
project's test infra (`jest-expo` preset + `@testing-library/react-native`)
is already configured — drop a `<name>.test.ts(x)` next to the source file
and you're done.

For **components** the bar is different — see [Components](#components)
below. For **screens**, don't write tests — see [What we don't test](#what-we-dont-test).

A test that exists is the bar — exhaustive coverage isn't. Pin the
contract that breaks loudest in prod, not the implementation. One focused
case is better than five tautologies.

## Where the test goes

Tests are co-located with the code they cover (per `architecture.md`):

| Source                            | Test path                                        |
| --------------------------------- | ------------------------------------------------ |
| `src/utils/foo.utils.ts`          | `src/utils/__tests__/foo.utils.test.ts`          |
| `src/services/bar.service.ts`     | `src/services/__tests__/bar.service.test.ts`     |
| `src/hooks/useBaz.ts`             | `src/hooks/__tests__/useBaz.test.ts`             |
| `supabase/functions/_shared/x.ts` | `supabase/functions/_shared/__tests__/x.test.ts` |

**Never** create a top-level `tests/` or `__tests__/` directory — that
splits the import graph from the test graph. Existing patterns to mirror:
`src/utils/__tests__/exif.utils.test.ts`,
`src/services/__tests__/feed.service.test.ts`,
`src/hooks/__tests__/useSetting.test.ts`.

## What to cover by layer

| Layer     | Cover                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Util      | Branches and boundaries — happy path + the 1-2 inputs that surprised the implementer (negative numbers, empty arrays, malformed shapes).                                              |
| Service   | The contract a caller depends on: typed errors, status-code mapping, request shape sent to Supabase/Anthropic, response normalisation. The Supabase client is mocked, not exercised.  |
| Hook      | State machine outcomes (idle/loading/success/error), service-call routing, optimistic updates and reverts, cleanup on unmount. Use `renderHook` from `@testing-library/react-native`. |
| Schema    | Round-trip through `safeParse` + a representative malformed input.                                                                                                                    |
| Component | See [Components](#components).                                                                                                                                                        |
| Screen    | Don't — see [What we don't test](#what-we-dont-test).                                                                                                                                 |

## Components

Tests live in `src/components/__tests__/<Name>.test.tsx`. **Bar is opt-in,
not opt-out**: most components are glue — data from a hook, layout, props
forwarded. There's no logic to test. Add a test only when the component
matches one of these:

1. **Branching by props that the user sees.** Visual variants
   (`variant: 'primary' | 'secondary'`), conditional copy
   (`saveAnyway` vs `save`), titles that flip on a 3-way condition.
   See `Button`, `ValidationResultSheet`.
2. **Internal `useState` / `useEffect` not extractable to a hook.** Sheet
   forms with reset-on-close, in-flight guards. See `ReportSheet`,
   `ErrorBoundary`.
3. **Inline formatters that aren't exported.** `formatRelative` in
   `FeedItem` / `NearbyFindCard`, percent rounding in
   `ValidationResultSheet`. The non-exported helper is the contract you'd
   miss if it broke.
4. **Conditional rendering of optional pieces** that's easy to drop on
   refactor — `EmptyState` icon/subtitle/action, `CollectionCard` cover
   image vs emoji, `FeedItem` avatar fallback to initial-letter.

What to assert:

- Text content via `getByText` — that's the user-facing contract.
- Interaction via `fireEvent.press` + `expect(handler).toHaveBeenCalled`.
- Conditional presence via `queryByText(...)` returning null.

What **not** to assert:

- `node.props.className` — NativeWind processes classes during rendering
  and the raw string doesn't survive jsdom in a stable form. Visual
  variants are Maestro / screenshot territory, not Jest.
- Reanimated transforms / opacity — animations don't run under
  jest-test-renderer; you'd be reading `useSharedValue.value` at t=0.
- Snapshots of the full rendered tree (see [Don't](#dont)).

Mocking patterns specific to components:

- `react-i18next` → tiny stub that echoes the key + interpolation:
  ```ts
  jest.mock('react-i18next', () => ({
    useTranslation: () => ({
      t: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
    }),
  }));
  ```
  Then assert against the key string — decouples tests from the
  current English copy.
- `expo-image` → `() => null`. Image rendering doesn't matter; the URL
  is verified via the data path (services / hooks).
- `BottomSheet` → pass-through `({ visible, children }) => visible ? children : null`
  so children are inspectable without animating in.
- Inner widgets (`@components/Button`, `@components/Input`, `ProgressBar`)
  → minimal stub when not the SUT, so the test fails for the right
  reason. See `ReportSheet.test.tsx`.

Components currently tested: `Button`, `EmptyState`, `CollectionCard`,
`ReactionBar`, `NearbyFindCard`, `ValidationResultSheet`,
`AchievementSheet`, `ReportSheet`, `ErrorBoundary`, `FeedItem`. The other
~30 components are pure glue and intentionally untested at the unit level.

## What we don't test

- **Screens (`src/screens/*`).** Their job is composition: render hooks,
  feed data into components, push to the router. The hooks are tested
  exhaustively, the components are tested where they matter, and the
  end-to-end flow is **Maestro** territory (planned, not yet wired up).
  A jest test of a 700-line screen would mock half the world and assert
  on layout that doesn't survive jsdom — high cost, no signal.
- **Routes (`src/app/*`).** Per `architecture.md` these are thin
  wrappers — the real component is one import away in `src/screens/`.
  Test that, not the wrapper.
- **Realtime side-effects against Supabase.** Channel subscription
  setup is tested via mock channels (see `useFeedRealtime.test.ts`),
  but actual postgres NOTIFY → callback delivery is integration territory.
- **Visual fidelity.** "Does the card look like the design?" is the job
  of `.claude/design/collecta/` mockups during implementation, plus
  screenshot diffs in Maestro when that's wired up. Jest can't see
  layout.

## Patterns the codebase already uses

- **Mocking the Supabase client.** Mock `../supabase.service` with a
  chainable stub — see `src/services/__tests__/feed.service.test.ts` for
  the rpc + from + .in().returns() pattern, or
  `src/services/__tests__/discover.service.test.ts` for the simpler
  rpc-only case.
- **Typed errors crossing the mock boundary.** When the SUT does
  `instanceof FooError`, declare the mock class **inside the
  `jest.mock(..., () => { ... })` factory** — class declarations at the
  test top level are TDZ'd by jest.mock hoisting and the
  `instanceof` check fails silently. Pattern in
  `src/hooks/__tests__/useReport.test.ts`.
- **Variables referenced inside `jest.mock` factories.** Must be prefixed
  `mock*` (case-insensitive) — that's a babel-jest hardcoded allowlist.
  Use `mockBackend`, `mockState`, etc.
- **Unstable references in hook deps.** Don't pass freshly-allocated
  objects to `renderHook(() => useFoo({...}))` if the hook depends on the
  reference — re-creates each render and infinite-loops. Pin the object
  outside the wrapper. See `src/hooks/__tests__/useMapFinds.test.ts`.
- **Module-level state in hooks.** Hooks that hold a module-level store
  (e.g. `useTheme`) share state across tests in a file. Either accept
  that and order tests deliberately, or reach for `jest.isolateModules` —
  but isolateModules breaks `react-test-renderer`'s React instance, so
  the practical choice is to share state.

## Cost / privacy

- **No real network calls in tests.** Anthropic, Supabase, Expo APIs all
  get mocked. Eval suites are the _only_ place paid calls live, and they
  gate on `RUN_EVALS=1` (see `.claude/rules/evals.md`).
- **Don't mutate production DB state.** Use a stub Supabase mock, not a
  test project. Eval suites that need real DB use a dedicated test user
  or rolled-back transactions.
- **Env vars come from `jest.setup.ts`.** EXPO*PUBLIC*\* are set there
  before the module graph loads — the file is the single seam to add
  more if needed. Don't hardcode env in individual test files.

## Running tests

```
npm test                          # full suite
npx jest src/services/__tests__/  # one folder
npx jest --testTimeout=10000      # bump default 5s when needed
```

CI (`.github/workflows/ci.yml`) runs `npm test` on every PR. Type-check
is separate (`tsc --noEmit`) — both must pass to merge.

## Don't

- Don't add tests that duplicate Zod / TypeScript guarantees ("returns a
  string when input is a string"). The compiler already checks that.
- Don't snapshot RN component trees. Snapshots break on every styling
  diff and never fail for the right reason.
- Don't import from `src/` into `supabase/functions/`, even in tests —
  Deno can't resolve them, and the rule in `architecture.md` is
  bidirectional.
