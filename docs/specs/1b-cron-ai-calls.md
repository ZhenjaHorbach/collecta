# 1b. Cron generators log usage to `ai_calls`

## Goal

The weekly generators (`scripts/generate-collection.ts`,
`scripts/generate-achievement.ts`) call Anthropic but only print usage to
stdout / the PR body. Persist each run to `ai_calls` like the edge functions
do, so `ai_calls` covers every paid production call site.

## Approach

- New Node-side helper `src/agents/ai-calls.ts` (the folder already holds
  code shared by scripts; `image-mirror.ts` uses the same service-role client
  pattern):
  - `logAiCall(client, kind, model, usage: NormalizedUsage, metadata?)` —
    best-effort insert, mirrors `supabase/functions/_shared/anthropic-usage.ts`.
    Never throws: a failed insert logs `console.error('[ai_calls] ...')` to
    stderr.
  - `logAiCallFromEnv(...)` — builds a service-role client from
    `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. If either is missing it
    warns to stderr and skips (same fallback as the image mirror).
- Call it from each script's `main()` only, **not** from
  `generateCollection()` / `generateAchievement()` — the eval suites import
  those functions, and eval runs must not write to the DB.
- Kinds: `cron:generate-collection`, `cron:generate-achievement`. Metadata:
  `{ source: 'cron', dry_run, title | code, file }`. Dry runs are logged too —
  they spend real tokens.
- stdout stays untouched: the workflows parse it as JSON.

## Files I may change

- `src/agents/ai-calls.ts` (new), `src/agents/__tests__/ai-calls.test.ts` (new)
- `scripts/generate-collection.ts`, `scripts/generate-achievement.ts`
- Header comments of `scripts/generate-{collection,achievement}.sh`
- `CLAUDE.md` (AI cost tracking paragraph)
- `.github/workflows/generate-achievement.yml` (one env line, approved)

## Constraints

- No migration (table and RLS exist in `015_starter_and_fork.sql`; inserts
  go through service role, which bypasses RLS).
- No new dependencies. Workflow change limited to the approved env line.
- No real network in tests — Supabase client is mocked.

## Workflow change (approved, applied by hand)

`.github/workflows/generate-achievement.yml` did not pass
`SUPABASE_SERVICE_ROLE_KEY`, so the achievement cron would have skipped
logging (with a warning). Fix: one env line referencing the existing repo secret, same as
`generate-collection.yml`. Applied manually (the agent's edit was blocked by
the permission check).

## Acceptance checks

- Unit tests: row shape sent to `ai_calls`; insert error does not throw;
  missing env skips without creating a client.
- `npx tsc --noEmit`, `npx eslint . --max-warnings 0`, `npm test -- --ci` pass.
- Scripts not executed (they call Anthropic).

## Out of scope

- Eval runs logging to `ai_calls`.
- Sharing one implementation between the Deno and Node `logAiCall`.
