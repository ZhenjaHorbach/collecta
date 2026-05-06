-- Migration: 016_fork_rpc
-- Adds fork_collection(uuid) — a security-definer RPC that copies a public
-- collection (and all its items) under the calling user's ownership. The new
-- copy lives at collections.forked_from = source.id, is_public=false by
-- default (it's "yours" now), and is fully editable by the new owner.
--
-- Why security definer: the "insert into collections" policy requires
-- creator_id = auth.uid(), which IS satisfied here, but the same call also
-- needs to read items from a foreign collection where the items policy may
-- be tighter than the collections policy in edge cases. Running with
-- definer keeps the SQL trivially correct and centralised — and we add an
-- explicit auth.uid()/is_public guard at the top so it can't be abused.
--
-- Idempotency: calling fork_collection a second time for the same (user,
-- source) returns the existing fork id instead of creating a duplicate.
--
-- Rollback:
--   drop function if exists public.fork_collection(uuid);

create or replace function public.fork_collection(p_collection_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing uuid;
  v_new_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- Source must exist AND be public. Reading it via this guard rather than
  -- the implicit RLS during INSERT means we get a clean error message and
  -- don't silently fall through.
  if not exists (
    select 1 from public.collections
    where id = p_collection_id and is_public
  ) then
    raise exception 'collection_not_public' using errcode = '42704';
  end if;

  -- Idempotent: one fork per (user, source). Returning the existing id
  -- means the client can call this on every "Fork" tap without checking
  -- first.
  select id into v_existing
  from public.collections
  where forked_from = p_collection_id
    and creator_id = v_user_id
  limit 1;
  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.collections (
    creator_id, title, description, icon, cover_image_url, category,
    ai_hint, is_freeform, is_public, forked_from
  )
  select
    v_user_id, title, description, icon, cover_image_url, category,
    ai_hint, is_freeform, false, id
  from public.collections
  where id = p_collection_id
  returning id into v_new_id;

  insert into public.collection_items (
    collection_id, name, description, example_image_url,
    ai_validation_prompt, sort_order, rarity, fun_fact
  )
  select
    v_new_id, name, description, example_image_url,
    ai_validation_prompt, sort_order, rarity, fun_fact
  from public.collection_items
  where collection_id = p_collection_id;

  return v_new_id;
end;
$$;

revoke all on function public.fork_collection(uuid) from public;
grant execute on function public.fork_collection(uuid) to authenticated;
