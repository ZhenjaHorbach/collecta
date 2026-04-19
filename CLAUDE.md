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
- Dark theme: `bg-slate-950`, `text-slate-100`
- Accent color: `amber-500` (gold) for progress, achievements, CTAs
- All spacing via Tailwind classes (`p-4`, `gap-3`, etc.)
- Custom colors defined in `tailwind.config.js`
- No inline style objects unless absolutely necessary (animations, dynamic values)

## Code conventions
- TypeScript strict, no `any`
- Functional components with named exports
- Services in `/src/services`, hooks in `/src/hooks`
- Types in `/src/types`
- Path alias: `@/` maps to root, `~/src/` maps to `/src`

## Directory structure
```
src/
  screens/     # Full-screen route components
  components/  # Reusable UI components
  services/    # API clients, Supabase queries, Claude API calls
  hooks/       # Custom React hooks
  utils/       # Pure helper functions
  types/       # Shared TypeScript types and interfaces
  app/         # Expo Router file-based routes
supabase/
  migrations/  # SQL migration files
```
