-- Migration: 017_completed_owned_collections
-- Switches count_completed_collections to count collections the user OWNS
-- (creator_id = uid) where every collection_item has a find from that user.
-- Picks up forked collections automatically because fork_collection inserts
-- the copy under creator_id = caller.
--
-- Soft-path migration: we still UNION the legacy user_collections join so
-- pre-fork users don't lose their existing achievement progress on the day
-- this ships. Once user_collections is empty (or everyone has migrated to
-- forks) we'll drop the second branch in a follow-up.
--
-- Empty collections (no items) still don't count as complete — same as the
-- previous version of this RPC. See migration 010 for original wording.
--
-- Rollback: re-create the previous body from migration 010.

create or replace function public.count_completed_collections(uid uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with completed as (
    -- Branch 1: user-owned collections (covers forks + originally-authored).
    select c.id
    from public.collections c
    where c.creator_id = uid
      and exists (select 1 from public.collection_items ci where ci.collection_id = c.id)
      and not exists (
        select 1
        from public.collection_items ci
        where ci.collection_id = c.id
          and not exists (
            select 1 from public.finds f
            where f.user_id = uid and f.collection_item_id = ci.id
          )
      )
    union
    -- Branch 2 (soft-path): legacy joined collections from user_collections.
    -- Stays in until the table is dropped.
    select c.id
    from public.user_collections uc
    join public.collections c on c.id = uc.collection_id
    where uc.user_id = uid
      and exists (select 1 from public.collection_items ci where ci.collection_id = c.id)
      and not exists (
        select 1
        from public.collection_items ci
        where ci.collection_id = c.id
          and not exists (
            select 1 from public.finds f
            where f.user_id = uid and f.collection_item_id = ci.id
          )
      )
  )
  select count(*)::int from completed;
$$;
