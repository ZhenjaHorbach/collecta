-- Migration: 018_discover_rpc
-- rpc_discover_collections — single round-trip read for the Discover screen.
-- Returns public collections with two derived counts (forks, items) and a
-- per-viewer flag (forked_by_me) so the UI can render "Already in your
-- collections" without a follow-up query.
--
-- Filtering: optional category exact-match, optional case-insensitive title
-- search.
-- Sorting: 'popular' = forks_count desc, 'new' = created_at desc. 'near' is
-- intentionally not implemented yet — it needs a geo signal on collections,
-- which we don't have (only finds carry coordinates). Marked TODO inline.
--
-- Security: invoker, so RLS still applies (the underlying SELECT policy on
-- collections only exposes is_public OR creator_id = auth.uid()).
--
-- Rollback:
--   drop function if exists public.rpc_discover_collections(text, text, text, int, int);

create or replace function public.rpc_discover_collections(
  p_category text default null,
  p_query text default null,
  p_sort text default 'popular',
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  title text,
  description text,
  icon text,
  cover_image_url text,
  category text,
  is_featured boolean,
  creator_id uuid,
  created_at timestamptz,
  forks_count bigint,
  items_count int,
  forked_by_me boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  -- TODO(near): add a 'near' branch once collections gain a centroid (or we
  -- query finds for a viewer's joined collections). Today there's no geo
  -- signal on collections so we silently fall back to default ordering.
  with base as (
    select
      c.id,
      c.title,
      c.description,
      c.icon,
      c.cover_image_url,
      c.category::text as category,
      c.is_featured,
      c.creator_id,
      c.created_at,
      (
        select count(*) from public.collections fc
        where fc.forked_from = c.id
      ) as forks_count,
      (
        select count(*)::int from public.collection_items ci
        where ci.collection_id = c.id
      ) as items_count,
      exists (
        select 1 from public.collections fc
        where fc.forked_from = c.id and fc.creator_id = auth.uid()
      ) as forked_by_me
    from public.collections c
    where c.is_public
      and (p_category is null or c.category::text = p_category)
      and (p_query is null or c.title ilike '%' || p_query || '%')
  )
  select id, title, description, icon, cover_image_url, category, is_featured,
         creator_id, created_at, forks_count, items_count, forked_by_me
  from base
  order by
    is_featured desc,
    case when p_sort = 'new' then created_at end desc nulls last,
    case when p_sort = 'popular' then forks_count end desc nulls last,
    created_at desc
  limit p_limit offset p_offset;
$$;

grant execute on function public.rpc_discover_collections(text, text, text, int, int)
  to authenticated, anon;
