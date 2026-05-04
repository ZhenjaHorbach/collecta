-- Migration: 014_feed_rpc_drop_viewer_param
-- 013 shipped get_personalized_feed(viewer_user_id, viewer_lat, viewer_lng,
-- page_size, page_offset). The viewer_user_id parameter let any caller pass
-- another user's uuid; with SECURITY INVOKER + RLS that didn't leak data, but
-- the user_collections sub-query then computed `shared_collections` against
-- the spoofed user — silently returning 0 because of RLS on
-- user_collections. Bin it: derive the viewer from auth.uid() directly.
--
-- This migration also widens the candidate window from `greatest(page_size*5,
-- 100) offset page_offset` (which let consecutive pages overlap) to a fixed
-- LIMIT 200 with the offset moved to the final ranked output, and tightens
-- the `reactions` SELECT policy so private-collection reaction counts no
-- longer leak via UUID guessing.
--
-- Idempotent re-run: drop both signatures explicitly, then create the new
-- one.
-- Rollback:
--   drop function if exists public.get_personalized_feed(double precision, double precision, integer, integer);
--   -- then re-run 013_feed_and_reactions.sql to restore the original RPC + policy.

drop function if exists public.get_personalized_feed(uuid, double precision, double precision, integer, integer);
drop function if exists public.get_personalized_feed(double precision, double precision, integer, integer);

create function public.get_personalized_feed(
  viewer_lat     double precision,
  viewer_lng     double precision,
  page_size      integer default 20,
  page_offset    integer default 0
)
returns table (
  find_id            uuid,
  user_id            uuid,
  collection_id      uuid,
  collection_item_id uuid,
  photo_url          text,
  location_lat       double precision,
  location_lng       double precision,
  notes              text,
  created_at         timestamptz,
  shared_collections integer,
  geo_score          real,
  reactions_count    integer,
  score              real
)
language sql
stable
as $$
  with viewer as (
    select auth.uid() as id
  ),
  candidate as (
    select
      f.id            as find_id,
      f.user_id       as user_id,
      ci.collection_id,
      f.collection_item_id,
      f.photo_url,
      f.location_lat,
      f.location_lng,
      f.notes,
      f.created_at
    from public.finds f
    join public.collection_items ci on ci.id = f.collection_item_id
    cross join viewer v
    where f.user_id <> v.id
    order by f.created_at desc
    limit 200
  ),
  scored as (
    select
      c.*,
      (
        select count(*)::int
        from public.user_collections uc_viewer
        cross join viewer v
        where uc_viewer.user_id = v.id
          and uc_viewer.collection_id = c.collection_id
      ) as shared_collections,
      case
        when viewer_lat is null or viewer_lng is null
             or c.location_lat is null or c.location_lng is null then 0::real
        else greatest(
          0::real,
          (1 - sqrt(
            power(c.location_lat - viewer_lat, 2)
            + power(c.location_lng - viewer_lng, 2)
          ) / 0.5)::real
        )
      end as geo_score,
      (
        select count(*)::int
        from public.reactions r
        where r.find_id = c.find_id
      ) as reactions_count
    from candidate c
  )
  select
    s.find_id,
    s.user_id,
    s.collection_id,
    s.collection_item_id,
    s.photo_url,
    s.location_lat,
    s.location_lng,
    s.notes,
    s.created_at,
    s.shared_collections,
    s.geo_score,
    s.reactions_count,
    (s.shared_collections * 3
      + s.geo_score * 2
      + s.reactions_count * 1)::real as score
  from scored s
  order by score desc, s.created_at desc
  limit page_size offset page_offset;
$$;

grant execute on function public.get_personalized_feed(double precision, double precision, integer, integer) to authenticated;

-- Tighten reactions SELECT to mirror find visibility.
drop policy if exists "reactions: public read" on public.reactions;
drop policy if exists "reactions: read on readable finds only" on public.reactions;

create policy "reactions: read on readable finds only"
  on public.reactions for select
  using (
    exists (
      select 1
      from public.finds f
      join public.collection_items ci on ci.id = f.collection_item_id
      join public.collections c on c.id = ci.collection_id
      where f.id = reactions.find_id
        and (c.is_public or f.user_id = auth.uid())
    )
  );
