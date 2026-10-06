# 2. Explicit timeouts and retries on Anthropic calls

## Goal

The three edge functions create `new Anthropic({ apiKey })` with SDK defaults:
`timeout` 10 min, `maxRetries` 2. A slow or hung upstream call therefore runs
until the Supabase gateway kills the request — the user gets a generic 5xx
instead of our own error body, and we can't reason about worst-case latency.
Set explicit values, named in one place, sized to fit the function limit.

## Facts the numbers are based on

- SDK retry policy (`@anthropic-ai/sdk` client, same logic in 0.32.x used by
  Deno and 0.92 in node_modules): retries connection errors, timeouts, 408,
  409, 429, 5xx. Backoff `min(0.5s * 2^n, 8s)` with ≤25% jitter; a
  `retry-after` / `retry-after-ms` header under 60 s overrides it.
- Supabase Edge Functions: request idle timeout 150 s (response must start
  within it; free-plan wall clock is also 150 s). Budget every function to
  ≤ 150 s worst case. **Verify against your plan's current limits.**
- Calls per request:
  - `validate-find` — vision, `max_tokens` 1024. `verify` and
    `match-in-collection` = 1 call, `discover` = 2 sequential calls.
  - `award-xp` — text tool turns, `max_tokens` 1024, up to
    `MAX_LOOP_STEPS = 8` sequential calls (usually 2–3).
  - `generate-collection` — coordinator (`max_tokens` 2048), then 5 parallel
    subagents (`max_tokens` ≤ 4096, 15 items), then image fetch/mirror
    (HTTP, not Anthropic).

## Values

New file `supabase/functions/_shared/anthropic-config.ts` (constants only,
no imports):

| Constant                          | Value  | Why                                                                                                                                |
| --------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_MAX_RETRIES`           | 1      | One retry absorbs a transient 429/529/5xx; a second one rarely helps and doubles the worst case.                                   |
| `ANTHROPIC_TIMEOUT_VISION_MS`     | 30 000 | Vision includes the server fetching the photo URL. Worst case per call 30 + 0.5 + 30 ≈ 61 s; `discover` (2 calls) ≈ 122 s < 150 s. |
| `ANTHROPIC_TIMEOUT_TEXT_MS`       | 15 000 | award-xp turns are small JSON tool calls.                                                                                          |
| `ANTHROPIC_TIMEOUT_GENERATION_MS` | 30 000 | Longest outputs (up to 4096 tokens). Two sequential stages × ≈ 61 s ≈ 122 s, leaving ~28 s for image fetch/mirror.                 |
| `AWARD_XP_LOOP_BUDGET_MS`         | 90 000 | 8 × 31 s would be 248 s. The loop refuses to start a new step after 90 s, so worst case ≈ 90 + 31 = 121 s.                         |

Vision > text, as required; generation shares the vision value because its
duration is dominated by output length, not input.

## Behaviour on timeout (existing error paths, no new ones)

- `validate-find` — the SDK throws `APIConnectionTimeoutError` inside the
  existing `try/catch` around each Claude call → `502 { error:
'vision_failed', detail }`. Nothing is written before the model call
  (the function is return-only since commit `810c6cf`); `logAiCall` runs only
  on success.
- `award-xp` — the throw (or the new budget error) propagates to the existing
  `catch` in the handler → `502 agent_failed`. **Partial state:** tool
  side-effects already executed in earlier steps (e.g. `update_user_xp`)
  stay — same as any other mid-loop failure today. SDK retries re-send only
  the model request, never re-run our tools, so a retry can't double-award
  XP. The client (`gamification.service.ts → awardXp`) does not retry.
  `unlock_achievement` is idempotent, so the next event re-checks and
  unlocks anything missed.
- `generate-collection` — throws inside the existing `try/catch` blocks →
  `502 coordinator_failed` / `subagent_failed`. Nothing is persisted before
  the merge (the `ai_generations` row and `ai_calls` logs are written only at
  the end).

## Files I may change

- `supabase/functions/_shared/anthropic-config.ts` (new)
- `supabase/functions/_shared/__tests__/anthropic-config.test.ts` (new)
- `supabase/functions/validate-find/index.ts`, `award-xp/index.ts`,
  `generate-collection/index.ts` — client options + award-xp budget check

## Constraints

- No change to response shapes or status codes.
- `src/agents/*` don't create clients (they receive one) — untouched.

## Acceptance checks

- Unit test: worst-case duration of each function (from the constants) is
  < 150 s.
- `grep -n "new Anthropic" supabase/functions` — every hit passes `timeout`
  and `maxRetries`.
- `npx tsc --noEmit`, `npx eslint . --max-warnings 0`, `npm test -- --ci`.
  **These do not cover `supabase/functions/**`** (excluded in
`tsconfig.json`/`eslint.config.js`); `deno`is not installed locally, so
the edge code is not type-checked. Run`deno check` on the three
  entrypoints before deploy.

## Out of scope

- `scripts/generate-*.ts`, `src/evals/*` clients (cron / dev-only, no
  gateway limit; GitHub Actions job timeout bounds them).
- Timeouts on image fetch / mirror HTTP calls in `src/agents/image-*.ts`.
- Logging usage of failed calls to `ai_calls`.
- `retry-after` header can stretch a single retry to ~60 s; not capped here.
