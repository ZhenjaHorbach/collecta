# Collecta

A real-world photo collection app. Discover, photograph, and collect physical objects organized into thematic collections — _Soviet mosaics_, _brutalist architecture_, _vintage shop signs_, whatever you want to hunt down. Claude Vision validates whether a photo matches the collection criteria (advisory, not blocking).

iOS, Android, and Web. React Native + Expo + Supabase + Claude Vision.

## Stack

| Area          | Tech                                                                                   |
| ------------- | -------------------------------------------------------------------------------------- |
| App           | React Native (Expo SDK 54), Expo Router for file-based navigation                      |
| Backend       | Supabase — Postgres + RLS + Realtime + Storage + Edge Functions                        |
| Offline sync  | PowerSync (`@powersync/react-native`)                                                  |
| AI            | Claude Vision via Edge Functions (image validation, collection/achievement generation) |
| Local storage | `react-native-mmkv`                                                                    |
| Styling       | NativeWind (Tailwind for RN), semantic theme tokens, dark + light                      |
| i18n          | `i18next` + `react-i18next` + `expo-localization` — en / ru / pl / uk                  |
| Camera / Maps | `expo-camera`, `react-native-maps` (native) + `@vis.gl/react-google-maps` (web)        |
| E2E           | Maestro (Android emulator in CI)                                                       |
| Unit tests    | Jest + `@testing-library/react-native`                                                 |

## Quickstart

```bash
git clone <repo>
cd collecta
npm install
cp .env.local.example .env.local   # fill in keys
npm start                          # Expo dev server
```

Then `i` (iOS Simulator), `a` (Android emulator), or `w` (web).

For a native build with custom dev client (recommended once you touch native code):

```bash
npx expo prebuild --clean
npx expo run:ios      # or run:android
```

`ios/` and `android/` are gitignored — they are regenerated from `app.json` + `app.config.ts` via Expo CNG. Never hand-edit them; the change won't survive `prebuild --clean`.

## Required env vars

Live in `.env.local` (not committed). `EXPO_PUBLIC_*` are inlined into the client bundle by Metro.

| Variable                               | Why                                                                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`             | Supabase project URL                                                                                                                      |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`        | Supabase anon public key                                                                                                                  |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`      | Single key for Android (`react-native-maps`), iOS (optional), web. Lock with HTTP-referrer restrictions before deploying web.             |
| `EXPO_PUBLIC_POWERSYNC_URL`            | PowerSync project URL                                                                                                                     |
| `EXPO_PUBLIC_TEST_EMAIL` / `_PASSWORD` | Seed account used by the `__DEV__`-only "Dev sign-in" button + by Maestro flows                                                           |
| `SUPABASE_SERVICE_ROLE_KEY`            | **Server-only.** Used by `scripts/generate-collection.ts`, `scripts/maestro-seed.ts`, and Edge Functions. Never read via `EXPO_PUBLIC_*`. |
| `SUPABASE_PROJECT_ID`                  | Used by `npm run types:gen`                                                                                                               |
| `FEW_SHOT_FIXTURES_BASE_URL`           | Public Supabase Storage URL for the vision eval fixtures                                                                                  |
| `UNSPLASH_ACCESS_KEY`                  | Used by `scripts/generate-collection.ts` to source cover images                                                                           |

The full list of CI secrets is documented in `.claude/rules/ci.md`.

## Commands

```bash
# Dev
npm start                       # Expo dev server
npm run ios | android | web

# Quality
npm run lint                    # ESLint, zero warnings
npm run format                  # Prettier write
npm test                        # Jest
npm run test:e2e                # Maestro flows (needs Android emulator)
npm run react-compiler:check    # react-compiler-healthcheck gate
npx tsc --noEmit                # Type check

# Codegen / sync
npm run types:gen               # Pull Postgres types from Supabase → src/types/database.ts
npm run design:sync -- '<URL>'  # Pull mockups from claude.ai/design → .claude/design/
npm run icons:generate          # Render assets/images/icon*.svg → PNGs (iOS, Android, web)
npm run screenshots:generate    # Render store-listing screenshots from design mockups

# AI evals
npm run evals -- vision         # see .claude/rules/evals.md
```

Each script in `scripts/` has a `.sh` wrapper that loads `.env`, validates required vars, and `exec`s the sibling `.ts`. Run scripts through the wrapper, not directly.

## Project layout

```
src/
  app/         Expo Router routes (thin wrappers over screens)
  screens/     Full-screen components (one folder each)
  components/  Reusable UI primitives + composite components
  services/    All external I/O — Supabase, Claude API, storage
  hooks/       Custom React hooks
  utils/       Pure functions
  types/       Shared TypeScript types (incl. generated database.ts)
  constants/   Theme palettes, config
  i18n/        i18next setup + locales/{en,ru,pl,uk}.json
supabase/
  migrations/  Numbered SQL files (001_…)
  functions/   Edge functions
maestro/
  flows/       Maestro E2E flow YAMLs
scripts/       Build / deploy / codegen / eval helpers (.ts + .sh)
```

Path aliases (configured in `tsconfig.json` + `babel.config.js`): `@components/*`, `@screens/*`, `@services/*`, `@hooks/*`, `@utils/*`, `@constants/*`, `@typings/*`, `@i18n` / `@i18n/*`, `~/*` (= `src/*`).

## Conventions

Per-domain rules live in `.claude/rules/`. Read the relevant file before touching that area:

- `architecture.md` — directory map, naming, import direction
- `code-style.md` — TypeScript, components, i18n
- `styling.md` — NativeWind semantic tokens, theming
- `supabase.md` — RLS, queries, migrations, storage, realtime, edge-function auth
- `ci.md` — branch workflow, commits, CI jobs, secrets
- `evals.md` — eval suites, run paths, cost gating
- `testing.md` — what gets a co-located test
- `e2e.md` — testID naming for Maestro
- `gamification.md` — XP / streak / achievements
- `settings.md` — user-facing preferences go in `SettingsScreen`

`CLAUDE.md` (root + `src/services/CLAUDE.md` + `supabase/CLAUDE.md`) carries the canonical project state; rules files extend it per domain.

## Release

EAS Build profiles in `eas.json`:

- `development` — internal, dev client, iOS Simulator allowed
- `preview` — Android APK x86_64 for Maestro e2e
- `production` — store-bound: iOS `m-medium`, Android `.aab`, auto-incremented build numbers

```bash
eas login
eas build --platform all --profile production
eas submit --platform ios --profile production       # → TestFlight
eas submit --platform android --profile production   # → Play internal track
```

iOS submit needs `appleId` / `ascAppId` / `appleTeamId` in `eas.json` once the Apple Developer account is set up. Android submit needs `play-service-account.json` in the repo root (gitignored). Full release notes in `CLAUDE.md` under "Release".

Store screenshots: `npm run screenshots:generate`. Renders the synced HTML mockups via headless Chrome into `screenshots/{ios-67,android-phone}/`. Regenerate after the design changes.

## License

Private project.
