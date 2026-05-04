---
name: deep-linking
description: Deep links and sharing in Collecta — collecta:// URL scheme, link helpers, share cards (view-shot + QR), and the Expo Router behaviour that ties them together. Use when adding a new shareable entity, editing `src/utils/links.utils.ts`, the share service, or `app.json` linking config.
---

# Deep linking & sharing

## Source of truth

- **URL helpers** — `src/utils/links.utils.ts`. `buildFindUrl`, `buildCollectionUrl`, `buildUserUrl`, `parseIncomingUrl`, `routeForLink`. Every share-side URL must go through these — never hand-format `collecta://...`.
- **Share service** — `src/services/share.service.ts`. `shareCardImage(ref, fallback)` for image-based shares; `shareUrl(payload)` for plain URL/text fallback.
- **Share cards** — `src/components/share/{CollectionShareCard,FindShareCard}`. Off-screen views captured to PNG via `react-native-view-shot`.
- **App scheme** — `app.json` → `"scheme": "collecta"`. Cold-start `Linking.createURL('/find/x')` produces `collecta:///find/x` (dev) or `collecta://find/x` (prod).
- **Routing** — file-based via Expo Router. `src/app/find/[id].tsx`, `src/app/collection/[id].tsx`, `src/app/user/[id].tsx`. **Adding a new linkable entity = adding a route file**, not a switch in `_layout.tsx`.

## Why no manual `Linking.addEventListener`

Expo Router wires `Linking` into its stack automatically: an incoming `collecta://find/abc` is handled the same as `router.push('/find/abc')` because the path matches a file route. **Do not** add a manual `Linking.addEventListener('url', …)` in `_layout.tsx` — it would double-route (Expo Router pushes once, your handler pushes again).

The `parseIncomingUrl` helper exists only for cases where the app needs to interpret a URL itself (e.g. preflight before navigation, analytics tagging). It is **not** a routing layer.

## Adding a new shareable entity

1. Add a file route under `src/app/<entity>/[id].tsx`.
2. Add `build<Entity>Url(id)` to `links.utils.ts`.
3. Extend `ParsedLink` and the `head === '<entity>'` branch in `parseIncomingUrl`.
4. If the share is image-based: build a `<Entity>ShareCard` in `src/components/share/`, render it off-screen (`position:absolute, top:-9999, opacity:0`), pass the ref to `shareCardImage`. Otherwise call `shareUrl({ message, url })` directly.
5. Add `find.share*` style i18n keys to **all four** locales (`en/ru/pl/uk`).

## Share card rendering rules

- Cards must declare a fixed `width` and `height` in style — view-shot captures pixel dimensions of the laid-out node, not the screen viewport.
- Wrap with `collapsable={false}` so Android's view-flattening doesn't drop the node before capture.
- Render at scale-1 only; let the OS share sheet upscale. Doubling the dimensions doubles capture time and memory and isn't visible past 540×720.
- QR code uses `react-native-qrcode-svg`. Always force `backgroundColor="#fff"` and `color="#000"` — semantic theme colors break the contrast contract scanners need.
- Always include the canonical URL **also as plain text** below the QR. Some chat clients re-encode images; the URL string is the survivable fallback.

## Testing locally

iOS simulator:

```
npx uri-scheme open collecta://find/<find-uuid> --ios
```

Android emulator:

```
npx uri-scheme open collecta://find/<find-uuid> --android
```

Verify both flows:

- Cold start (kill app, fire URL) — Expo Router should push the deep route on top of the initial route.
- Warm start (app in background, fire URL) — same screen should appear; back stack should NOT contain a duplicate copy of the screen.

## TODO — universal links / app links

The current setup is `collecta://` only. To add `https://collecta.app/find/<id>` support:

- Host `.well-known/apple-app-site-association` (iOS) and `assetlinks.json` (Android) on the web origin.
- Add `ios.associatedDomains` to `app.json`: `["applinks:collecta.app"]`.
- Add `android.intentFilters` for `android.intent.action.VIEW` with the `https` scheme + host.
- Run `npx expo prebuild --clean`.
- Update `links.utils.ts` to accept both schemes (`collecta://` and `https://collecta.app/`).

Do not enable until the web origin exists — half-configured universal links cause iOS to silently fall back to opening the URL in Safari, which looks like a bug.

## Native rebuild required

`react-native-view-shot` and `react-native-qrcode-svg` (via `react-native-svg`) are native modules. After installing them or changing `app.json` linking config, run:

```
npx expo prebuild --clean
npx expo run:ios   # or run:android
```

EAS cloud builds run prebuild themselves, so the source of truth stays `app.json` + `package.json`.
