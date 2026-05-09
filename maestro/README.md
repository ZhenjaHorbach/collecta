# Maestro — E2E flows

End-to-end test flows for Collecta. Tests the app at the user-facing
level, not the data layer (services and hooks have Jest coverage in
`src/**/__tests__/` already).

## Strategy: Android-first, iOS optional

**CI and capture flows run on Android.** iOS Simulator has no camera,
so `expo-camera` capture flows can't run on it without code changes.
Android Emulator ships with a virtual-scene camera natively — capture
flows work out of the box, no `__DEV__`-flagged image-picker fallback
needed in the production code.

**Locally, iOS is allowed for non-camera flows** (auth, browse, search,
reactions) because the iOS Simulator boots faster on a Mac and
`npx expo run:ios` is a single command. The same Maestro YAML drives
both — `testID`s are platform-agnostic, no matrix needed.

| Flow type                                  | iOS Simulator | Android Emulator |
| ------------------------------------------ | ------------- | ---------------- |
| Auth / browse / search / reactions (00–04) | ✅            | ✅               |
| Capture (05+)                              | ❌ no camera  | ✅ virtual-scene |

CI runs only on Android (`ubuntu-latest` runner) — 10× cheaper than
macOS, single execution path, capture works.

## One-time local setup

Install the Maestro CLI:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Verify:

```bash
maestro --version
```

### Android (canonical)

Install Android Studio, then create an AVD (e.g. **Pixel 7, API 34**)
through `Tools > Device Manager`.

Boot the emulator with the virtual-scene camera enabled:

```bash
emulator -avd Pixel_7_API_34 -camera-back virtualscene
```

Build the dev client into the running emulator (one-shot — gets reused
until native code or `app.json` changes):

```bash
npx expo run:android
```

To swap the picture the virtual scene shows in CameraView (used by
capture flows later), drop a JPG/PNG in
`~/.android/avd/<AVD>.avd/sdcard/Pictures/` or use
`adb emu avd send_virtual_scene <path>`.

### iOS (optional, faster local boot)

```bash
xcode-select --install
npx expo run:ios
```

Skip if you're only writing capture flows — the iOS Simulator can't
exercise them.

## Running flows

```bash
npm run test:e2e                                    # all flows (= maestro/run.sh maestro/flows/)
npm run test:e2e:seed                               # provision/cleanup test user

maestro/run.sh maestro/flows/00-launch.yaml         # one flow (no npm shortcut for single)
maestro/run.sh maestro/flows/ --debug-output debug  # save screenshots / video on failure
```

`maestro/run.sh` is a thin wrapper that compensates for Maestro 2.5.1's
broken Android auto-bootstrap: it installs the driver APK from the local
Maestro install if missing, sets up the `adb forward tcp:7001`, and starts
the gRPC instrumentation in the background — all idempotent, so re-running
costs nothing. Once Maestro 2.x ships a working auto-bootstrap (or when we
drop to 1.41), the wrapper collapses to `exec maestro test "$@"` and can
be deleted.

Direct `maestro test` works only after the wrapper has been run at least
once per emulator session (the driver instrumentation persists until the
emulator reboots).

Maestro picks the active connected device automatically. To force a target
when both Android and iOS are connected:

```bash
maestro --device emulator-5554 test maestro/flows/   # Android
maestro --device "iPhone 15" test maestro/flows/      # iOS by name
```

`maestro studio` opens a live inspector against the running app — use this
to discover `testID`s and prototype new flow steps. Studio doesn't run
through the wrapper, so make sure `maestro/run.sh` (or a manual bootstrap)
has set up the driver beforehand.

## Flow naming

`<NN>-<short-slug>.yaml` — numeric prefix orders the flow list in
Maestro reports. Current flows:

- `00-launch.yaml` — smoke: app launches, welcome screen visible. Used
  to verify the bootstrap (driver install + instrumentation) is sane.

Planned (per `.claude/rules/e2e.md`):

- Read-only flows on a pre-authenticated start state: browse
  Collections, scroll Discover, open a Find detail, react.
  Auth itself is **not** an E2E flow — typing into TextInputs is
  blocked by Gboard's autocomplete on the emulator (see e2e.md
  text-input section). `useAuth` / `signInWithEmail` are covered by
  Jest in `src/hooks/__tests__/` and `src/services/__tests__/`.
- Capture flow on Android emulator with virtual-scene camera.
- Reactions toggle on a feed item.

## What goes in a flow

`testID`s are the primary handles. Don't assert on i18n copy — flows
must work in `en/ru/pl/uk` without rewriting. Naming convention is
documented in `.claude/rules/e2e.md`.

## Conventions

- **No real network paid calls.** Capture flows run with
  `aiVerification: false` (Settings toggle, MMKV-persisted) so the
  Anthropic Vision call is skipped.
- **Idempotent.** Each flow uses `launchApp: clearState: true` (or
  signs out at the start) so flow N doesn't depend on flow N-1's
  side-effects.
- **Per-flow appId.** Maestro's `appId:` at the top of each YAML is
  the source of truth — `com.horbachevgen.collecta` for both
  platforms.
- **No platform-specific selectors.** `testID`s are kebab-case
  identifiers Maestro resolves identically on iOS and Android. If a
  flow only makes sense on one platform (capture), comment that at
  the top of the YAML, don't fork the file.

## CI

`.github/workflows/e2e.yml`:

- Trigger: `workflow_dispatch` + Monday 09:00 UTC weekly canary
- Runner: `ubuntu-latest` + `reactivecircus/android-emulator-runner@v2`
  (API 34, Pixel 6, virtual-scene camera)
- Steps: seed Supabase test user → EAS local Android dev build →
  boot emulator → install APK → `maestro/run.sh maestro/flows/`
- `concurrency: cancel-in-progress: false` — never trample the
  seeded test user mid-run
- Debug artifacts (`debug/` — screenshots + video) uploaded only on
  failure, 30-day retention
- iOS coverage is intentionally NOT in CI — testIDs are
  platform-agnostic and macOS minutes are 10× the cost

## Auth seeder

Authenticated flows need a known account in the DB. Seeder is
idempotent and pre-confirms the email so SignIn skips the OTP step:

```bash
scripts/maestro-seed.sh
```

What it does (via Supabase service role):

1. Upserts `test@collecta.app` (or `EXPO_PUBLIC_TEST_EMAIL`) with
   `email_confirm: true`.
2. Forces `EXPO_PUBLIC_TEST_PASSWORD` so `.env` / CI secret stay in sync.
3. Cleans the account's residue (`reactions`, `finds`, `collections`,
   `user_collections`) so flow N never depends on flow N-1.

Required env (`.env` locally; CI secrets):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — admin access
- `EXPO_PUBLIC_TEST_PASSWORD` — password for the seeded user. Same
  var the Welcome dev sign-in button reads, so seed and bundle never
  drift.
- `EXPO_PUBLIC_TEST_EMAIL` — optional, defaults to `test@collecta.app`

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Lives under `scripts/`
per `.claude/rules/architecture.md`.

Locally usually run once per session. Re-run for a clean slate.

## Authenticated flows — "Dev sign-in" button

Authenticated flows tap a `__DEV__`-only "Dev sign-in" button on the
welcome screen (`src/screens/WelcomeScreen/WelcomeScreen.tsx`). It's
rendered only when `__DEV__ && EXPO_PUBLIC_TEST_EMAIL &&
EXPO_PUBLIC_TEST_PASSWORD` — invisible in release builds, absent
unless `.env` is populated. On press it calls `signInWithEmail` with
those credentials; AuthGuard routes to `/(tabs)`.

`.env` keys (also consumed by `scripts/maestro-seed.sh`):

- `EXPO_PUBLIC_TEST_EMAIL` — defaults to `test@collecta.app`
- `EXPO_PUBLIC_TEST_PASSWORD` — required

Pattern — every post-login flow uses `01-auth-bypass.yaml` as a
preamble:

```yaml
appId: com.horbachevgen.collecta
---
- runFlow: 01-auth-bypass.yaml
- tapOn: tabbar-collections
- assertVisible: collections-screen
```

`01-auth-bypass.yaml`: `launchApp` (with
`permissions: { all: allow }` to pre-grant location/camera),
`tapOn welcome-dev-login`, wait for `tabbar-feed`.
