-- Migration: 004_reports
-- User-facing moderation queue. Lets a signed-in user flag a collection
-- or a find for manual admin review. App stores require this for UGC.
-- Idempotent. Rollback: drop table public.reports, drop the two enums.

-- ─── enums ─────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.report_target as enum ('collection', 'find');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.report_status as enum ('pending', 'reviewed', 'dismissed');
exception when duplicate_object then null;
end $$;

-- ─── reports ───────────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.users (id) on delete cascade,
  target_type  public.report_target not null,
  target_id    uuid not null,
  reason       text,
  status       public.report_status not null default 'pending',
  created_at   timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

alter table public.reports enable row level security;

-- Insert: only as yourself.
drop policy if exists "reports: reporter can insert own" on public.reports;
create policy "reports: reporter can insert own"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- Select: deliberately closed to clients. Admins read via the service role,
-- which bypasses RLS. Surfacing other users' reports back to the app would
-- defeat the point of moderation (privacy + harassment vectors).

create index if not exists reports_target_idx on public.reports (target_type, target_id);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
