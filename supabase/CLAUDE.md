# Supabase layer — additions on top of root CLAUDE.md

This file adds rules that only apply inside `supabase/`. The root
`CLAUDE.md` and `.claude/rules/supabase.md` / `.claude/rules/ci.md` still
apply — read them first. Only the points below are extra.

## Migrations

- Append-only, gap-free sequential numbering (`015_…`, `016_…`, …). Never
  rename or rewrite a merged migration — write a follow-up.
- Idempotent: every `create` / `alter` uses `if not exists` /
  `drop policy if exists` / `on conflict do nothing` so re-running on a
  partial environment is safe.
- A new table ships with its RLS policies in the same migration. Never
  enable RLS in one migration and add policies in another — the gap window
  silently denies all reads.

## Edge functions

- Auth helper from `_shared/auth.ts` runs BEFORE any DB write or Anthropic
  call. A 401 should cost less than $0.0001, not a full Vision call.
- Anthropic usage goes through `_shared/anthropic-usage.ts` —
  `extractUsage` + `logAiCall` write to the `ai_calls` table. Don't add
  per-row token columns to new tables; the mini variant on `finds` and
  `user_achievements` is legacy.
- `security definer` functions only when RLS genuinely cannot express the
  rule (e.g. `fork_collection` reads items from a foreign collection
  during the copy step). Always assert `auth.uid()` and any business
  guard at the top of the function body — definer skips RLS, so the
  function IS the security boundary.

## Seeding & system data

- The system user `00000000-0000-0000-0000-000000000001` owns the 10
  starter collections and any future canonical content. No auth row, so
  no one can log in as it. Seeding scripts use the service role key.
- Idempotent seeders rely on the partial unique index
  `collections_system_title_uniq` (migration 015) — re-running the multi
  agent generator skips already-seeded titles.

## `is_featured` rotation

For now, flip the `is_featured` column manually with a SQL update when the
season changes — there's no scheduler. When that becomes a cron job,
document it here so Discover still surfaces the right hero card.

## Reference paths

- Edge function caller-auth pattern: `supabase/functions/_shared/auth.ts`,
  rule in `.claude/rules/supabase.md`.
- AI cost tracking helper: `supabase/functions/_shared/anthropic-usage.ts`.
- Multi-agent starter generator: `scripts/generate-starter-collections.ts`
  - `src/agents/`.
