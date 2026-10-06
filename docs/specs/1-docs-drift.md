# 1. Docs drift

## Goal

Make the agent-facing docs describe what the code does today, so neither a
human nor an agent follows outdated instructions about AI cost tracking or
the E2E workflow.

## Findings

| Doc                                                                  | Claim                                                                                                               | Reality                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` → AI cost tracking                                       | "Today there's one site" (validate-find, writing to `finds`); "when a second call site lands, introduce `ai_calls`" | `ai_calls` exists (migration `015_starter_and_fork.sql`). `supabase/functions/_shared/anthropic-usage.ts` (`extractUsage`, `sumUsage`, `logAiCall`) is used by `validate-find`, `award-xp`, `generate-collection`. Legacy per-row columns (`finds.ai_*`, `user_achievements.ai_*`) are still written. Cron scripts (`scripts/generate-{collection,achievement}.ts`) do **not** write to `ai_calls`; usage goes to stdout / the generated SQL comment. |
| `CLAUDE.md` → Release                                                | `preview` profile "used by the e2e workflow on every PR"                                                            | `.github/workflows/e2e.yml` triggers on `workflow_dispatch` + `cron: '0 9 * * 1'` only.                                                                                                                                                                                                                                                                                                                                                               |
| `.claude/rules/gamification.md` → "AI usage tracking — mini variant" | Usage not persisted when nothing unlocked; refactor to `ai_calls` "when a third call site lands"                    | `award-xp` calls `logAiCall` on every successful loop run; the per-unlock columns stay as a legacy mirror.                                                                                                                                                                                                                                                                                                                                            |
| `.claude/rules/ci.md` → e2e                                          | "EAS local Android dev build"                                                                                       | `e2e.yml:91` builds with `--profile preview` (no dev client). Triggers in ci.md are already correct.                                                                                                                                                                                                                                                                                                                                                  |
| `.claude/rules/evals.md`                                             | —                                                                                                                   | No drift found for these claims.                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Files I may change

- `CLAUDE.md`
- `.claude/rules/gamification.md`
- `.claude/rules/ci.md`

## Constraints

- Docs only. No change to workflows, migrations or code.
- Keep the existing rule ("every call site must capture usage") — only update
  the description of how.

## Acceptance checks

- `grep -n "one site\|every PR" CLAUDE.md` finds no AI-cost or e2e claim.
- `grep -n "third Anthropic call site" .claude/rules/gamification.md` finds nothing.
- `npx tsc --noEmit`, `npx eslint . --max-warnings 0`, `npm test -- --ci` pass
  (sanity only — no code changes).

## Out of scope

- Making cron scripts log to `ai_calls` (noted as a gap, not fixed here).
- Dropping the legacy `finds.ai_*` / `user_achievements.ai_*` columns.
