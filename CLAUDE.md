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

## Release

Three EAS Build profiles in `eas.json`:

- `development` — dev client, internal distribution, iOS Simulator allowed. For local dev builds via `eas build --profile development`.
- `preview` — Android APK x86_64, used by the e2e workflow on every PR (see `.claude/rules/ci.md`).
- `production` — store-bound: iOS `m-medium` build, Android `app-bundle` (`.aab`), `autoIncrement: true` so EAS bumps `versionCode` / `buildNumber` per build.

`submit.production.android` references `./play-service-account.json` (gitignored — the JSON the user downloads from Google Cloud → IAM → Service Accounts after linking to Play Console). `submit.production.ios` is intentionally absent — fill in `appleId` / `ascAppId` / `appleTeamId` once the Apple Developer account exists and the App Store Connect record is created. EAS schema rejects empty strings, so leave the section out until you have real values.

`version` in `app.json` is the human-facing version (`1.0.0`). Native build numbers (iOS `buildNumber`, Android `versionCode`) are managed **remotely by EAS** (`cli.appVersionSource: "remote"` in `eas.json`) and auto-incremented on every production build. The local `app.json` value is the floor on first switch; after that, the local copy is ignored — never hand-edit. One source of truth across humans, CI, and re-runs.

### TestFlight / Play Internal flow

Day-to-day: tag-driven release via `.github/workflows/release.yml`:

```
git tag v1.0.1
git push origin v1.0.1
# → CI builds Android AAB on EAS Cloud (~6 min) → submits to Play Internal
```

Or manual run from Actions → Release → Run workflow (with optional `submit` toggle).

One-time setup (local, before the first release):

```
eas login
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value AIza...
# (other EXPO_PUBLIC_* secrets — see .env)

# Seed the EAS-managed version counter from app.json. Required after enabling
# appVersionSource: "remote". Subsequent builds auto-increment from there.
eas build:version:set --platform android --non-interactive
```

Manual ad-hoc builds (bypass CI):

```
eas build --platform android --profile production
eas submit  --platform android --profile production   # → Play internal
eas submit  --platform ios     --profile production   # → TestFlight (once iOS submit block is filled)
```

`eas build` runs `prebuild` in the cloud worker (per `Native projects (CNG)` above) and uses the latest committed `app.json`. Never trigger a production build from a dirty working tree — the build will reflect uncommitted changes that won't reach teammates.

GitHub Secrets required by `release.yml`: `EXPO_TOKEN` (build/submit scope) and `PLAY_SERVICE_ACCOUNT_JSON` (full JSON string of the Google Play service-account key). See `.claude/rules/ci.md` → Secrets.

### Over-the-air updates (EAS Update)

JS-only fixes (logic, styles, copy, validation) ship via OTA without rebuilding the AAB:

```
eas update --branch production --message "fix: <short description>"
```

The build channel is bound to the EAS Update branch by the `channel` field on each `eas.json` build profile (`production`, `preview`, `development`). `runtimeVersion: { policy: "appVersion" }` in `app.json` means the JS bundle is compatible with whatever native build shares the same `version` (`1.0.0`). When `version` bumps, runtime version changes — old native installs stop receiving new updates and must be replaced via Play Store.

What you can't OTA: anything that touches `ios/` or `android/` after prebuild — new native deps, plugin config, permission strings, Info.plist / AndroidManifest edits, `app.json` plugin block. Those need a full rebuild + Play submit.

### Store screenshots

`npm run screenshots:generate` renders the HTML mockups in `.claude/design/collecta/` to PNG via headless Chrome (`puppeteer-core` devDep, uses local Chrome — `CHROME_PATH` env overrides). Output lands in `screenshots/{ios-67,android-phone}/` (gitignored, regenerated each run). Sizes: 1290×2796 for App Store 6.7", 1080×1920 for Play Store phone.

The script seeds `localStorage.collecta.screen` per render so it can capture `feed` / `map` / `collections` / `profile`. Screens that depend on React state (`detail`, `camera`, `create`) are not reachable from localStorage and are intentionally skipped — add them by extending the mockup with a URL-param entry-point if needed.

If `.claude/design/collecta/` is stale, run `npm run design:sync -- '<hand-off-url>'` first.

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
maestro/
  flows/        # Maestro E2E flow YAMLs (00-launch.yaml, …)
  config.yaml   # Workspace-level Maestro config
  README.md     # Local run + setup instructions
```

Path aliases: `@components/*`, `@screens/*`, `@services/*`, `@hooks/*`, `@utils/*`, `@constants/*`, `@typings/*`, `@i18n` / `@i18n/*`, `~/*` (= `src/*`).

**Hierarchical context.** When working inside `src/services/` or `supabase/`, read the local `CLAUDE.md` first — each adds layer-specific rules on top of these root ones (no duplication). The root file stays the canonical source for everything else.
