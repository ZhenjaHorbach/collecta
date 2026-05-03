---
name: react-native-expo
description: Project-specific React Native + Expo patterns for Collecta — Expo Router navigation, expo-camera, react-native-maps, permissions, list performance, and New Architecture constraints. Use when adding/modifying screens, camera/maps/permission flows, or list rendering.
---

# React Native + Expo Patterns

## Navigation (Expo Router)

- File-based routing in `app/` — route files are thin wrappers
- Use `expo-router` Link, useRouter, useLocalSearchParams — not react-navigation directly
- Typed routes enabled (`experiments.typedRoutes: true` in app.json)
- Stack navigator: `app/(stack)/` group; Tab navigator: `app/(tabs)/` group
- Modal routes: `app/modal.tsx` with `presentation: 'modal'` in layout

## Camera (expo-camera)

- Request permission with `useCameraPermissions()` hook
- Check `permission.granted` before rendering `<CameraView>`
- Use `ref.current.takePictureAsync({ quality: 0.8, base64: false })` for captures
- URI from capture → upload to Supabase Storage

## Maps (react-native-maps)

- `<MapView>` with `provider={PROVIDER_GOOGLE}` on Android
- Markers via `<Marker>` children; use `coordinate` prop
- Request location with `expo-location` (`requestForegroundPermissionsAsync`)

## Permissions pattern

```ts
const [permission, requestPermission] = useCameraPermissions();
if (!permission) return null;
if (!permission.granted) return <PermissionPrompt onRequest={requestPermission} />;
```

## Performance

- Use `FlashList` (from `@shopify/flash-list`) instead of `FlatList` for long lists
- Avoid inline function props on list items — use `useCallback`
- Reanimated for animations; avoid JS-thread animations on scroll

## New Architecture

- `newArchEnabled: true` in app.json — all native modules must support it
- react-native-mmkv, react-native-maps, expo-camera all support New Arch
