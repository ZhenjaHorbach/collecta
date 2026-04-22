# Collecta

## Project overview

Real-world photo collection app. Users discover, photograph, and collect real-world objects organized into thematic collections (e.g., "Soviet mosaics", "brutalist architecture", "vintage shop signs"). AI validates whether a photo matches the collection criteria.

## Architecture

React Native (Expo) + Supabase + Claude Vision API

- **Frontend**: React Native via Expo Router (file-based navigation)
- **Backend**: Supabase (Postgres + RLS + Realtime + Storage)
- **Offline sync**: PowerSync (@powersync/react-native)
- **Local storage**: react-native-mmkv (key-value cache)
- **AI validation**: Claude Vision API (advisory, not blocking)
- **Camera**: expo-camera
- **Maps**: react-native-maps

## Styling

- NativeWind (Tailwind CSS for React Native)
- Use `className` prop, NOT `StyleSheet.create`
- Dark theme only — custom tokens defined in `tailwind.config.js` (e.g. `bg-bg`, `text-text`, `text-gold`)
- Accent color: `gold` for progress, achievements, CTAs
- All spacing via Tailwind classes (`p-4`, `gap-3`, etc.)
- No inline style objects unless absolutely necessary (animations, dynamic values)

## Code conventions

- TypeScript strict, no `any`
- Functional components with named exports
- Services in `/src/services`, hooks in `/src/hooks`
- Types in `/src/types`
- Path aliases: `@components/*`, `@screens/*`, `@services/*`, `@hooks/*`, `@utils/*`, `@constants/*`

## Directory structure

Each screen and component lives in its own folder with an `index.ts` re-export.

```
src/
  app/          # Expo Router routes (thin wrappers)
    (tabs)/     # Feed, Map, Camera, Collections, Profile
    (auth)/     # Welcome, SignIn, SignUp, Verify, Onboarding
    collection/ # [id] detail, create (modal)
  screens/      # Full-screen components (one folder each)
  components/   # Reusable UI components (one folder each)
  services/     # Supabase queries, Claude API, storage
  hooks/        # Custom React hooks
  utils/        # Pure helper functions
  types/        # Shared TypeScript interfaces
  constants/    # Theme tokens, config
supabase/
  migrations/   # SQL migration files
  functions/    # Edge functions
```
