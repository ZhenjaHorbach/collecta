# CI/CD Rules

## Branch workflow

- All features via Pull Request — no direct push to `main`
- CI must pass (lint, typecheck, tests) before merging
- At least 1 approval required before merge

## Commit hygiene

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- No `console.log`, no commented-out code, no `any` types in commits

## CI jobs (`.github/workflows/ci.yml`)

1. `lint-and-typecheck` — ESLint (zero warnings) + `tsc --noEmit`
2. `test` — Jest with coverage, `--passWithNoTests` during early dev
3. `build-check` — `expo-doctor` + EAS dry-run for both platforms

## Evals (`.github/workflows/evals.yml`)

- Manual trigger only (`workflow_dispatch`)
- Runs Claude Vision eval suite against test images
- Report uploaded as artifact, retained 30 days
- Required before changing AI validation prompts

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
- `SUPABASE_ACCESS_TOKEN` — Supabase CLI auth (Account → Access Tokens)
- `SUPABASE_PROJECT_ID` — Supabase project reference ID (Project → Settings → General)
