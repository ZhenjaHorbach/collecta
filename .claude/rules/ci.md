# CI/CD Rules

## Branch workflow

- All features via Pull Request — no direct push to `main`
- CI must pass (lint, typecheck, tests) before merging
- At least 1 approval required before merge

## Commit hygiene

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- No `console.log`, no commented-out code, no `any` types in commits

## CI jobs (`.github/workflows/ci.yml`)

1. `lint-and-typecheck` — ESLint (zero warnings) + `tsc --noEmit` + `npm run react-compiler:check`
2. `test` — Jest with coverage, `--passWithNoTests` during early dev
3. `build-check` — `expo-doctor` + EAS dry-run for both platforms

### Post-build checks

`scripts/post-build-checks.sh` (calls `scripts/post-build-checks.ts`) runs after `expo export` in the deploy job. Caps web bundle size at 50 MB, scans `src/` + `supabase/` + `scripts/` for accidentally-committed long-form secrets (Anthropic keys, Supabase service-role JWTs, AWS access keys), re-asserts strict TypeScript, and appends a one-line `{ts, sha, ref, bundle_mb, failed}` JSON to `.build-metrics.jsonl` for trend tracking. Any cap miss or secret hit fails the job with a `::error::` line. The metrics file is gitignored — telemetry, not source of truth.

`MAX_BUNDLE_MB` and `DIST_DIR` are env-overridable for local debugging. Locally: `npx expo export --platform web && bash scripts/post-build-checks.sh`.

### React Compiler gate

`scripts/check-react-compiler.sh` runs `react-compiler-healthcheck` and fails the build if any component is rejected by the compiler (the CLI itself always exits 0, so the wrapper parses the "Successfully compiled X out of Y" line). Pairs with the static `react-compiler/react-compiler` ESLint rule — lint catches Rules-of-React violations the compiler refuses to optimise; healthcheck catches anything the compiler rejects for other reasons (compiler version bumps, transitive import shape, etc.). Locally: `npm run react-compiler:check`.

## Evals

Two domain-specific workflows — never combined into one "all evals" job.

### `.github/workflows/evals-vision.yml`

- `workflow_dispatch` + Monday 09:00 UTC canary
- Runs the `ai-validation` suite against the golden image set in `src/evals/fixtures/`
- Required before changing the `validate-find` prompt or fixtures
- Report uploaded as artifact, 30-day retention

### `.github/workflows/evals-achievement.yml`

- `pull_request` with `paths:` filter on `scripts/generate-achievement.{ts,sh}`, the prompt, or eval files
- Structural suite always runs on matching PRs (~1 Claude call, mem­oised)
- Calibration suite (~20 Claude calls) only via `workflow_dispatch` with `include_calibration=true`

### `.github/workflows/e2e.yml`

- `workflow_dispatch` + Monday 09:00 UTC weekly canary
- `ubuntu-latest` + `reactivecircus/android-emulator-runner@v2` (Android API 34, Pixel 6, virtual-scene camera)
- Steps: seed Supabase test user → EAS local Android dev build → boot emulator → install APK → `maestro/run.sh maestro/flows/`
- ~15-20 min/run; `concurrency: cancel-in-progress: false` so the seeded test user isn't trampled by a parallel run
- `--debug-output debug` artifacts (screenshots/video) uploaded only on failure, 30-day retention
- iOS coverage intentionally NOT planned — testIDs are platform-agnostic and macOS minutes are 10× the cost

### `.github/workflows/evals-collection.yml`

- `pull_request` with `paths:` filter on `scripts/generate-collection.{ts,sh}`, the prompt, `src/agents/**`, or eval files
- Structural suite always runs on matching PRs (~6 Claude calls, mem­oised across all assertions)
- Calibration suite (~50+ Claude calls — 8 pipeline runs × 6 calls + self-grade) only via `workflow_dispatch` with `include_calibration=true`

## Sync design (`.github/workflows/sync-design.yml`)

Pulls the design bundle from claude.ai/design into `.claude/design/` and opens a PR. Manual trigger only — there is no way to auto-detect when a mockup changed (Anthropic exposes no webhook).

**Workflow:**

1. In claude.ai/design, edit the mockup → click **Hand off** → copy the URL (`https://api.anthropic.com/v1/design/h/<hash>`).
2. Run the sync — pick one:
   - `npm run design:sync -- '<URL>'` — local, updates `.claude/design/` in your working tree, no PR.
   - `gh workflow run sync-design.yml -f design_url='<URL>'` — CI, opens PR `design/sync`.
   - GitHub UI → Actions → Sync design → Run workflow → paste URL.
3. Review the diff (especially deletions — they mean files were removed in the design).
4. Merge.

**Constraints:**

- Hand-off URLs expire in **hours**, not days. Sync immediately after generating the URL; if it 404s, regenerate in claude.ai.
- Never commit the URL itself — it's a signed link, treat as semi-secret. Pass via workflow input or shell arg, nothing else.
- Never hand-edit files in `.claude/design/` — the next sync overwrites them. Notes about the design go in `CLAUDE.md` or this rules file.
- Both the workflow and `npm run design:sync` call the same `scripts/sync-design.sh` — single source of truth for what gets included/excluded.

## Supabase deploy (`.github/workflows/deploy-supabase.yml`)

- Triggers automatically on push to `main` when `supabase/migrations/**` or `supabase/functions/**` change
- Manual trigger via `workflow_dispatch` with `deploy_functions` / `run_migrations` toggles
- `concurrency: cancel-in-progress: false` — never cancel an in-flight migration
- Uses `supabase/setup-cli@v1` + `supabase db push --include-all` + `supabase functions deploy`
- Slash command: `/deploy-supabase` — full instructions and one-liner commands

## Secrets required

- `EXPO_TOKEN` — EAS build authentication
- `ANTHROPIC_API_KEY` — Claude API for evals
- `SUPABASE_URL` -- Supabase project URL (Project → Settings → API)
- `SUPABASE_ANON_KEY` — Supabase anon public key (Project → Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase admin key. **Server-only.** Used by `scripts/generate-collection.ts`, `scripts/maestro-seed.ts`, and edge functions. Never read via `EXPO_PUBLIC_*`; never reaches the device bundle.
- `SUPABASE_ACCESS_TOKEN` — Supabase CLI auth (Account → Access Tokens)
- `SUPABASE_PROJECT_ID` — Supabase project reference ID (Project → Settings → General)
- `EXPO_PUBLIC_TEST_EMAIL` / `EXPO_PUBLIC_TEST_PASSWORD` — credentials for the seeded `test@collecta.app` account. Consumed by **both** `scripts/maestro-seed.ts` (server-side, to provision the account) and the app bundle (client-side, to render the `__DEV__`-only "Dev sign-in" button on the welcome screen — see `.claude/rules/e2e.md`). One source of truth, no drift. Also baked into the EAS local Android build in the `e2e.yml` workflow, so every Maestro run can sign in.
- `EXPO_PUBLIC_POWERSYNC_URL` — PowerSync project URL. Inlined into the bundle by Metro / EAS, used by `@powersync/react-native` for offline sync.
