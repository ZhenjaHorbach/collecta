# Release cheat sheet

Quick reference for shipping Collecta changes — OTA fixes, native rebuilds, edge function deploys.

## Decision tree — OTA or full rebuild?

```
Did you change any of these?
  - new native dep (any expo-* / react-native-* in package.json)
  - app.json (plugins, permissions, icons, splash, version)
  - Info.plist / AndroidManifest content
  - anything under ios/ or android/
              │
      ┌───────┴───────┐
     yes              no
      │                │
   Full rebuild     OTA update — `eas update`
   + Play submit    instant, no Play review
```

If unsure: try `eas update`. Pre-expo-updates installs (versionCode ≤ 2) won't receive it, but versionCode ≥ 3 will.

## OTA — fastest path (JS-only fixes)

```bash
eas update --branch production --message "fix: <short description>"
```

- ~30 sec to publish.
- Reaches all `production`-channel installs on the next app launch (cold start).
- No Play review, no AAB rebuild.

What you can ship via OTA: copy, validation rules, styles, layout, new screens (as long as they don't pull new native modules), bug fixes in business logic.

What you CAN'T: anything that needs `prebuild` to regenerate native code.

## Native rebuild + submit

When OTA isn't enough.

```bash
# 1. Build locally (free; ~6-8 min)
eas build --local --platform android --profile production --output ./build-output.aab

# 2. Submit to Play Internal track
eas submit --platform android --profile production --path ./build-output.aab --non-interactive
```

EAS bumps `versionCode` automatically via its remote counter (`appVersionSource: "remote"` in `eas.json`). Local `app.json` is never touched.

After `eas submit`, Play does automated review (minutes → hours), then testers see "Update available" in Play Store.

### EAS Cloud alternative

If your laptop is busy or you want a clean machine:

```bash
eas build --platform android --profile production --non-interactive
# → billable (~$1-2/build); ~6 min on m-medium tier
```

## Tag-driven CI release

For branch-protected, audited releases:

```bash
git tag v1.0.1
git push origin v1.0.1
# → .github/workflows/release.yml builds on EAS Cloud + submits to Play Internal
```

Or manually: GitHub → Actions → Release → Run workflow → check "submit" if you want to upload, uncheck for a build-only trial.

## Edge functions (Supabase)

```bash
# Auto: any push to main touching supabase/functions/** triggers
# .github/workflows/deploy-supabase.yml. No manual action.

# Manual deploy of one function:
npx supabase functions deploy validate-find
```

Edge function changes take effect **immediately** for ALL clients — server-side, no bundle rebuild needed.

## Diagnostics

```bash
# Current remote-managed versionCode
npx eas-cli build:version:get -p android

# Recent builds
npx eas-cli build:list --platform android --status finished --limit 5

# Recent OTA updates
npx eas-cli update:list --branch production

# Live edge function logs
npx supabase functions logs validate-find --follow

# Play Console submissions (open dashboard)
open https://expo.dev/accounts/horbachevgen/projects/collecta/submissions
```

## Tester diagnostics

Settings → About shows:

```
Version
1.0.0 · build 3 · dd970ef7
```

Long-press to copy. Use this string in bug reports to pinpoint the bundle:

- `1.0.0` — marketing version (app.json)
- `build 3` — native build (versionCode/buildNumber, bumps per AAB)
- `dd970ef7` — first 8 chars of OTA id, or `embedded` if running the bundle that shipped in the AAB

## Common gotchas

- **OTA doesn't reach pre-expo-updates builds.** versionCode 2 was built before expo-updates was wired up. Only versionCode ≥ 3 receives OTAs.
- **versionCode is single-use.** Once Play has seen versionCode N, you can never publish it again. EAS handles this automatically; don't manually edit.
- **EAS Cloud builds cost minutes.** Use `eas build --local` for prod by default. Cloud only for CI tag-release or when local doesn't work.
- **expo-doctor warnings are non-blocking.** The build proceeds; ignore unless they're a new error.
- **Service account JSON is gitignored.** `play-service-account.json` lives in repo root locally; in CI it's written from `PLAY_SERVICE_ACCOUNT_JSON` GitHub Secret before submit.
- **First submit to a new track is slowest.** Play caches state after that.

## Verifying the chain works

Before the first prod-release crunch:

```bash
# Service account → Play API auth check (one-time per setup change)
# (See docs/release.md history — script was removed after the verification one-shot.)

# Try a build-only CI run
gh workflow run release.yml -f submit=false

# Push a fake tag to dry-run the whole tag flow (then delete the tag if you don't want the build)
git tag v0.0.0-test && git push origin v0.0.0-test
# clean up: git push origin :refs/tags/v0.0.0-test
```

## See also

- `CLAUDE.md` → Release section — canonical project state
- `.claude/rules/ci.md` — all CI workflows + required GitHub Secrets
- `.github/workflows/release.yml` — tag-driven build + submit
- `.github/workflows/deploy-supabase.yml` — edge function auto-deploy
