-- Migration: 015_starter_and_fork
-- Adds the building blocks for Day 11–12 work:
--   1. A system user that owns the 10 starter collections seeded by the
--      multi-agent generator script. Anyone can read its collections (they
--      stay is_public=true), but no one can log in as it (no auth.users row).
--   2. collections.is_featured  — flags the seasonal hero card on Discover.
--   3. collections.forked_from  — points back at the source collection when a
--      user "copies it to me". A null forked_from means an originally-authored
--      collection (system-seeded or user-created from scratch).
--   4. ai_calls table — the third Anthropic call site (multi-agent starter
--      generator) lands in this batch, so per CLAUDE.md → AI cost tracking
--      we move from the mini variant (per-row token columns on finds /
--      user_achievements) to a normalized table. The old per-row columns
--      stay for now — flipping all readers happens later.
--   5. Unique index on (creator_id, title) for the system user only —
--      makes the starter seeder idempotent without burdening normal users.
--
-- Idempotent: safe to re-run.
--
-- Rollback:
--   drop table if exists public.ai_calls;
--   drop index if exists collections_system_title_uniq;
--   drop index if exists collections_forked_from_idx;
--   drop index if exists collections_category_idx;     -- if this migration created it
--   alter table public.collections
--     drop column if exists is_featured,
--     drop column if exists forked_from;
--   delete from public.users where id = '00000000-0000-0000-0000-000000000001';

-- ─── system user ──────────────────────────────────────────────────────────────
-- public.users.id has a FK to auth.users(id), so we MUST seed auth.users
-- first. The handle_new_user() trigger (migration 001) then mirrors the row
-- into public.users automatically — we never insert into public.users by
-- hand for this user.
--
-- No `encrypted_password` is set, so password sign-in is impossible. There's
-- no OAuth identity either, so no provider can log in as this account. The
-- email is purely cosmetic ("collecta@system.local" — never sent to).
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'collecta@system.local',
  now(),
  '{"provider":"system","providers":["system"]}'::jsonb,
  '{"username":"collecta","display_name":"Collecta"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

-- Defensive: in case the trigger was disabled when auth.users was inserted
-- (or the row predates the trigger), make sure the public mirror exists.
-- Hits its own on-conflict, so this is a no-op when the trigger fired.
insert into public.users (id, username, display_name)
values (
  '00000000-0000-0000-0000-000000000001',
  'collecta',
  'Collecta'
)
on conflict (id) do nothing;

-- ─── collections columns ──────────────────────────────────────────────────────
alter table public.collections
  add column if not exists is_featured boolean not null default false,
  add column if not exists forked_from uuid references public.collections (id) on delete set null;

create index if not exists collections_category_idx     on public.collections (category);
create index if not exists collections_forked_from_idx  on public.collections (forked_from);

-- Idempotent seeding: re-running the starter script must not duplicate rows.
-- Scoped to the system user so creators can still title collections however
-- they like.
create unique index if not exists collections_system_title_uniq
  on public.collections (creator_id, title)
  where creator_id = '00000000-0000-0000-0000-000000000001';

-- ─── ai_calls (normalized cost tracking) ──────────────────────────────────────
-- Replaces the mini variant for new call sites. Existing per-row columns on
-- finds and user_achievements stay populated until readers are migrated.
create table if not exists public.ai_calls (
  id                       uuid primary key default gen_random_uuid(),
  kind                     text not null,
  model                    text not null,
  input_tokens             integer not null default 0,
  output_tokens            integer not null default 0,
  cache_read_tokens        integer not null default 0,
  cache_creation_tokens    integer not null default 0,
  metadata                 jsonb,
  created_at               timestamptz not null default now()
);

alter table public.ai_calls enable row level security;

-- No client-side policies. Writes happen exclusively from edge functions /
-- scripts running with service_role (bypasses RLS), and reads are admin-only
-- for now — usage analytics is a backend concern, not a UI surface.

create index if not exists ai_calls_kind_created_idx on public.ai_calls (kind, created_at desc);
create index if not exists ai_calls_metadata_user_idx
  on public.ai_calls ((metadata ->> 'user_id'))
  where metadata ? 'user_id';
