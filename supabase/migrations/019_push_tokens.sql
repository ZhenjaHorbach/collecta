-- 019_push_tokens.sql
-- Adds an Expo push token column on users so the future delivery service has
-- a destination per device. Token capture is fire-and-forget at sign-in;
-- delivery itself is not wired in this migration.
--
-- Rollback:
--   alter table public.users drop column if exists expo_push_token;

alter table public.users
  add column if not exists expo_push_token text;

-- Self-update is already covered by the existing "users: owner update" policy
-- from migration 001 (auth.uid() = id). Nothing more to wire — the column
-- inherits the same gate.
