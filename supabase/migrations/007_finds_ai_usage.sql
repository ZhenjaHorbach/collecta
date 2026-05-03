-- Per-call Anthropic API usage breakdown for each find's validation.
-- Enables cost tracking and prompt-cache hit-rate monitoring.
-- Cost is computed client-side (src/utils/cost-tracker.ts) from these counts
-- so pricing changes don't require backfills.
-- Rollback:
--   alter table public.finds
--     drop column if exists ai_model,
--     drop column if exists ai_input_tokens,
--     drop column if exists ai_output_tokens,
--     drop column if exists ai_cache_read_tokens,
--     drop column if exists ai_cache_creation_tokens;

alter table public.finds
  add column if not exists ai_model                  text,
  add column if not exists ai_input_tokens           integer,
  add column if not exists ai_output_tokens          integer,
  add column if not exists ai_cache_read_tokens      integer,
  add column if not exists ai_cache_creation_tokens  integer;
