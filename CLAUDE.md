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

## Commands

Slash commands live in `.claude/commands/`:

- `/sync-colors` — verify `palettes.ts` / `global.css` / `tailwind.config.js` are in sync
- `/deploy-supabase` — deploy migrations + edge functions
- `/new-screen` — scaffold a new screen folder

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
