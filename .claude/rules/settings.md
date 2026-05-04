# Settings & user preferences

## Rule

When you add a knob — anything a user might want to turn on/off, switch, pick a value for — **expose it in `SettingsScreen` first.** Don't bury preferences in dev-only flags, hidden gestures, screen-specific menus, or `__DEV__` blocks. If a behaviour can change between users, the toggle for it lives in `src/screens/SettingsScreen/`.

## Source of truth

- **Hook + storage** — `src/hooks/useSetting.ts`. Adds a typed entry to `SETTINGS`, exposes `useSetting(name)` for React, `readSetting(name)` for non-React callsites (services, hook bodies that fire on a single event, etc).
- **Persistence** — `src/services/storage.service.ts` MMKV. New entries go in `StorageKeys` with the `pref*` prefix.
- **Screen** — `src/screens/SettingsScreen/SettingsScreen.tsx`. Sectioned layout: `Appearance / Capture / About / Sign out`. Add new toggles to the matching section, or open a new section if none fit.
- **i18n** — every string under `settings.*` in `en/ru/pl/uk.json`. `settings.<feature>.label` + `settings.<feature>.subtitle` is the convention.

## Adding a new toggle

1. Add the entry to `SETTINGS` in `useSetting.ts` with a sensible default (existing default = "feature on" so a fresh install keeps the pre-toggle behaviour).
2. Add the storage key to `StorageKeys` (`pref<Name>`).
3. Read it at the **point of use** with `readSetting('myFeature')` (one-shot, no subscription) or `useSetting('myFeature')` (component state). Don't smuggle the value through props across screens — read it where the side-effect happens.
4. Add a `<SettingToggle name="myFeature" label={...} subtitle={...}/>` row in `SettingsScreen`.
5. Add `settings.myFeature.{label,subtitle}` to all four locales.

## Anti-patterns

- **Service-level singletons** that cache the setting on first read — defeats live updates. Read on each invocation.
- **Hidden settings** behind `process.env`, `__DEV__`, or undocumented gestures. If end users will ever need it, it goes on `SettingsScreen`.
- **Per-screen settings** that bypass the hook (e.g. local-only state on a screen). One source of truth across the app.
- **Forgetting to wire it.** A toggle that doesn't change behaviour is worse than no toggle. Verify the read path before merging.

## What the screen currently exposes

| Section    | Setting                | Where it's read                              |
| ---------- | ---------------------- | -------------------------------------------- |
| Appearance | Theme                  | `useTheme` + NativeWind class swap           |
| Appearance | Language               | `i18next` + `expo-localization`              |
| Appearance | High-res uploads       | `useCapture.ts` → `compressImage` quality    |
| Capture    | Auto-tag location      | `CameraScreen.tsx` → `setPendingLocation`    |
| Capture    | AI verification        | `useCapture.ts` → bypass `validateFind` call |
| About      | Version (display only) | `expo-constants` `expoConfig.version`        |

If you change any of those read paths, update this table.
