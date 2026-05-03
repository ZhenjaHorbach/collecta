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

## Native projects (CNG)

`ios/` and `android/` are gitignored — they are regenerated from `app.json` + `app.config.ts` via Expo's Continuous Native Generation. The single source of truth for native config (Info.plist keys, permissions, AndroidManifest entries) is `app.json` → `ios.infoPlist` / `android.permissions` / plugins. `app.config.ts` extends it with values that come from `.env` (e.g. Google Maps API keys), so secrets stay out of git.

### Google Maps keys

`react-native-maps` on Android **requires** a Google Maps API key (iOS uses Apple Maps by default but a key enables Google as fallback). Get keys from Google Cloud Console (enable _Maps SDK for Android_ and _Maps SDK for iOS_) and set them in `.env`:

```
GOOGLE_MAPS_API_KEY_ANDROID=...
GOOGLE_MAPS_API_KEY_IOS=...
```

Without `GOOGLE_MAPS_API_KEY_ANDROID` the Android app crashes on the Map screen with _"API key not found"_.

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
