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
- `SUPABASE_ACCESS_TOKEN` — Supabase CLI auth (Account → Access Tokens)
- `SUPABASE_PROJECT_ID` — Supabase project reference ID (Project → Settings → General)
