-- Migration: 008_gamification
-- Adds XP, level, streak fields on users; achievements catalog with 7 seeded rows;
-- user_achievements join table that also stores aggregated AI usage from the
-- award-xp agentic loop (mini variant — same 5 *_tokens columns as finds; when a
-- third Anthropic call site lands, refactor to a dedicated ai_calls table).
-- Streak is computed lazily on each find event from users.last_find_date inside
-- the award-xp edge function (no cron). Display-side cosmetic reset is in
-- src/utils/streak.utils.ts.
--
-- Rollback:
--   drop table if exists public.user_achievements;
--   drop table if exists public.achievements;
--   alter table public.users
--     drop column if exists xp,
--     drop column if exists level,
--     drop column if exists streak_days,
--     drop column if exists last_find_date;

-- ─── users gamification fields ─────────────────────────────────────────────────
alter table public.users
  add column if not exists xp              integer not null default 0,
  add column if not exists level           integer not null default 1,
  add column if not exists streak_days     integer not null default 0,
  add column if not exists last_find_date  date;

-- ─── achievements catalog ─────────────────────────────────────────────────────
create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  title       text not null,
  description text not null,
  icon        text not null,
  xp_reward   integer not null default 0,
  condition   jsonb not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.achievements enable row level security;

drop policy if exists "achievements: public read" on public.achievements;
create policy "achievements: public read"
  on public.achievements for select
  using (true);

-- No insert/update/delete policies → only service_role (edge functions / migrations)
-- can mutate the catalog.

-- ─── user_achievements ────────────────────────────────────────────────────────
create table if not exists public.user_achievements (
  user_id        uuid not null references public.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  -- Mini AI-usage variant: aggregated tokens from the award-xp agent loop run
  -- that produced this unlock. Same shape as finds.* so cost-tracker.ts works
  -- unchanged.
  ai_model                  text,
  ai_input_tokens           integer,
  ai_output_tokens          integer,
  ai_cache_read_tokens      integer,
  ai_cache_creation_tokens  integer,
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

drop policy if exists "user_achievements: public read" on public.user_achievements;
create policy "user_achievements: public read"
  on public.user_achievements for select
  using (true);

-- No insert/update/delete policies → unlocks happen only via award-xp edge
-- function (service_role bypasses RLS).

-- ─── indexes ──────────────────────────────────────────────────────────────────
create index if not exists user_achievements_user_idx on public.user_achievements (user_id);
create index if not exists users_xp_idx               on public.users (xp desc);
create index if not exists achievements_sort_idx      on public.achievements (sort_order);

-- ─── seed: 7 base achievements ────────────────────────────────────────────────
-- condition.kind drives check_achievements() in supabase/functions/award-xp.
--   { kind: 'finds_count',          gte: N }           → users.finds_count >= N
--   { kind: 'streak_days',          gte: N }           → users.streak_days >= N
--   { kind: 'collections_complete', gte: N }           → completed collections
--   { kind: 'reactions_given',      gte: N }           → reactions authored by user
insert into public.achievements (code, title, description, icon, xp_reward, condition, sort_order)
values
  ('first_find',               'First Find',          'Capture your first find.',                    '📸', 20,  '{"kind":"finds_count","gte":1}'::jsonb,           10),
  ('finds_10',                 'Collector',           'Capture 10 finds.',                            '🎒', 50,  '{"kind":"finds_count","gte":10}'::jsonb,          20),
  ('finds_50',                 'Curator',             'Capture 50 finds.',                            '🏛️', 150, '{"kind":"finds_count","gte":50}'::jsonb,          30),
  ('streak_3',                 'On a Roll',           'Keep a 3-day streak.',                         '🔥', 30,  '{"kind":"streak_days","gte":3}'::jsonb,           40),
  ('streak_7',                 'Week Warrior',        'Keep a 7-day streak.',                         '🔥', 80,  '{"kind":"streak_days","gte":7}'::jsonb,           50),
  ('first_collection_complete','Completionist',       'Complete every item in a collection.',         '🏆', 100, '{"kind":"collections_complete","gte":1}'::jsonb,  60),
  ('reactions_given_25',       'Cheerleader',         'React to 25 finds from other collectors.',     '💬', 40,  '{"kind":"reactions_given","gte":25}'::jsonb,      70)
on conflict (code) do update
  set title       = excluded.title,
      description = excluded.description,
      icon        = excluded.icon,
      xp_reward   = excluded.xp_reward,
      condition   = excluded.condition,
      sort_order  = excluded.sort_order;
