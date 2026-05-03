-- Migration: 010_count_completed_collections
-- Replaces the N+1 client-loop in award-xp's countCompletedCollections() with
-- a single round-trip RPC. For a user joined to K collections the previous
-- code fired 1 + 2K queries (one for items + one for find-count per
-- collection) before check_achievements could even run; this collapses it to
-- a single SQL pass.
--
-- A "completed" collection = the user has at least one find for every
-- collection_item in a collection they joined. Empty collections (no items)
-- don't count as complete.
--
-- security_definer: callable via the function's role (service_role inside
-- the edge function). Caller authorization is enforced upstream — we already
-- assert jwt.sub === body.user_id in award-xp before calling RPC.
--
-- Rollback:
--   drop function if exists public.count_completed_collections(uuid);

create or replace function public.count_completed_collections(uid uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
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
    );
$$;

revoke all on function public.count_completed_collections(uuid) from public;
grant execute on function public.count_completed_collections(uuid) to authenticated, service_role;
