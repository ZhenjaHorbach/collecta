# Collecta

## Project overview

Real-world photo collection app. Users discover, photograph, and collect real-world objects organized into thematic collections (e.g., "Soviet mosaics", "brutalist architecture", "vintage shop signs"). Claude Vision validates whether a photo matches the collection criteria (advisory, not blocking).

## Stack

React Native (Expo) + Supabase + Claude Vision.

- **Frontend**: React Native via Expo Router (file-based navigation)
- **Backend**: Supabase (Postgres + RLS + Realtime + Storage)
- **Offline sync**: PowerSync (`@powersync/react-native`)
- **Local storage**: `react-native-mmkv`
- **Styling**: NativeWind (Tailwind for RN) — dark + light themes via CSS variables
- **i18n**: `i18next` + `react-i18next` + `expo-localization` (en / ru / pl / uk)
- **Camera**: `expo-camera`
- **Maps**: `react-native-maps`

## Rules

Per-domain rules live in `.claude/rules/` — read the relevant file before editing that domain:

- `architecture.md` — directory layout, naming, import direction
- `code-style.md` — TypeScript, components, imports, i18n
- `styling.md` — NativeWind tokens, theming, spacing
- `supabase.md` — RLS, queries, migrations, storage, realtime
- `ci.md` — branch workflow, commit conventions, CI jobs, secrets
- `evals.md` — eval suites, run paths (CLI + Jest wrappers), cost gating
- `settings.md` — user-facing preferences live in `SettingsScreen`, persisted via `useSetting` / MMKV
- `testing.md` — when adding a util/service/hook, what to put in `__tests__/` next to it
- `e2e.md` — testID naming for Maestro flows; required on every interactive element + screen root

## Design references

Visual mockups live in `.claude/design/collecta/` (synced from claude.ai/design via the `Sync design` GitHub Action). Read these when implementing UI:

- `project/Collecta.html` — entry point, lists which `*.jsx` files compose the app
- `project/screen-*.jsx` — per-screen layouts (feed, map+profile, collections, detail, camera, create, auth)
- `project/shell.jsx` — theme tokens (`mapBg`, `gold`, `surface`, etc.) and the tab bar
- `project/data.jsx` — sample data shapes

These are **HTML/CSS/JS prototypes, not production code** — match the visual output, not the prototype's structure. Adapt to the project's stack (React Native, NativeWind, semantic tokens). Map prototype theme keys to our semantic tokens (`THEME.gold` → `bg-gold`, `THEME.surface` → `bg-surface`, etc.) — never copy raw hex values.

The `Map` screen design lives inside `project/screen-profile.jsx` (function `MapScreen`) — not in a `screen-map.jsx` file.

## Commands

Slash commands live in `.claude/commands/`:

- `/sync-colors` — verify `palettes.ts` / `global.css` / `tailwind.config.js` are in sync
- `/deploy-supabase` — deploy migrations + edge functions
- `/new-screen` — scaffold a new screen folder

## Scripts

Every script in `scripts/` is invoked through a `.sh` wrapper — workflows and humans both call the `.sh`, never `npx tsx` or `node` directly. The wrapper loads `.env` (CI uses workflow `env:`), validates required vars with `::error::`, and `exec`s the sibling `.ts`. Adding a script: write `<name>.ts` + `<name>.sh`, `chmod +x` the sh, reference the sh from workflows. Mirror `scripts/run-evals.sh`, `scripts/sync-design.sh`, `scripts/generate-achievement.sh`.

## AI cost tracking

Every Anthropic call site must capture `message.usage` (input/output/cache_read/cache_creation tokens) and persist it. Today there's one site — `supabase/functions/validate-find/index.ts` — which writes the four token counts to the `finds` row alongside the validation result. **When adding a new call site, repeat the same pattern.** USD conversion lives in `src/utils/cost-tracker.ts` (pure functions, no DB) — never re-implement pricing inline.

When a second call site lands, refactor: extract `extractUsage(message)` into `supabase/functions/_shared/anthropic-usage.ts`, and if the new call has no natural parent row (i.e. doesn't 1:1 with a `finds`-like entity), introduce an `ai_calls(id, kind, model, *_tokens, metadata)` table instead of bolting columns onto unrelated tables.

## Native projects (CNG)

`ios/` and `android/` are gitignored — they are regenerated from `app.json` + `app.config.ts` via Expo's Continuous Native Generation. The single source of truth for native config (Info.plist keys, permissions, AndroidManifest entries) is `app.json` → `ios.infoPlist` / `android.permissions` / plugins. `app.config.ts` extends it with values that come from `.env` (e.g. Google Maps API keys), so secrets stay out of git.

### Google Maps key

The same key drives Android (`react-native-maps`), iOS (`react-native-maps`, optional — falls back to Apple Maps), and web (`@vis.gl/react-google-maps`). Get one key from Google Cloud Console with **Maps SDK for Android** + **Maps SDK for iOS** + **Maps JavaScript API** enabled, and set in `.env`:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

The `EXPO_PUBLIC_*` prefix is required so Metro inlines the value into the web bundle. `app.config.ts` reads the same env var and passes it to the iOS / Android platform-specific config blocks. For EAS cloud builds set as an EAS secret with the same name (`eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value ...`) — `.env` is not uploaded.

**Security:** the key ships in the web bundle (unavoidable for browser-side maps). Lock it down in Google Cloud Console with **HTTP referrer restrictions** scoped to your origins (`localhost/*`, the prod web domain) **before** deploying web.

Without the key the Android app crashes on the Map screen with _"API key not found"_; the web map renders a "Map unavailable" fallback.

After pulling changes that touch `app.json` plugins, native config, or new native deps:

```
npx expo prebuild --clean   # wipes ios/ and android/, regenerates from app.json
npx expo run:ios            # or run:android
```

EAS Build runs `prebuild` automatically — cloud builds always reflect `app.json`. Never hand-edit files inside `ios/` or `android/`; the change won't survive `prebuild --clean` and won't reach teammates or CI.

## Directory structure

Each screen and component lives in its own folder with an `index.ts` re-export.

```
src/
  app/          # Expo Router routes (thin wrappers)
    (tabs)/     # Feed, Map, Camera, Collections, Profile
    auth/       # Welcome, SignIn, SignUp, Verify, Onboarding
    collection/ # [id] detail, create (modal)
  screens/      # Full-screen components (one folder each)
  components/   # Reusable UI components (one folder each)
  services/     # Supabase queries, Claude API, storage
  hooks/        # Custom React hooks
  utils/        # Pure helper functions
  types/        # Shared TypeScript interfaces
  constants/    # Theme palettes, config
  i18n/         # i18next setup + locales/{en,ru,pl,uk}.json
supabase/
  migrations/   # SQL migration files
  functions/    # Edge functions
```

Path aliases: `@components/*`, `@screens/*`, `@services/*`, `@hooks/*`, `@utils/*`, `@constants/*`, `@typings/*`, `@i18n` / `@i18n/*`, `~/*` (= `src/*`).

**Hierarchical context.** When working inside `src/services/` or `supabase/`, read the local `CLAUDE.md` first — each adds layer-specific rules on top of these root ones (no duplication). The root file stays the canonical source for everything else.
