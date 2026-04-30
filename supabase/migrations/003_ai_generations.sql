-- Migration: 003_ai_generations
-- Logs AI collection-generation calls so the edge function can rate-limit per user.
-- Idempotent. Rollback: drop table public.ai_generations.

create table if not exists public.ai_generations (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users (id) on delete cascade,
  kind         text not null,
  prompt       text not null,
  created_at   timestamptz not null default now()
);

alter table public.ai_generations enable row level security;

drop policy if exists "ai_generations: owner read" on public.ai_generations;
create policy "ai_generations: owner read"
  on public.ai_generations for select
  using (auth.uid() = user_id);

-- Inserts happen from the edge function with the service role, which bypasses RLS.
-- No insert policy is exposed to the client on purpose.

create index if not exists ai_generations_user_created_idx
  on public.ai_generations (user_id, created_at desc);
