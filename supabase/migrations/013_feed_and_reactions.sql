-- Migration: 013_feed_and_reactions
-- 1) RPC `get_personalized_feed` — algorithmic feed scored by
--    (shared_collections × 3 + geo × 2 + reactions × 1).
-- 2) Tighten reactions INSERT policy: cannot react to a find inside a
--    private collection that the user does not own. The 001_init policy
--    only checked `auth.uid() = user_id` which let any logged-in user
--    react to any find_id (information leak via guessable UUIDs).
-- Rollback:
--   drop function if exists public.get_personalized_feed(uuid, double precision, double precision, integer, integer);
--   drop policy if exists "reactions: react to readable finds only" on public.reactions;
--   create policy "reactions: authenticated users can react"
--     on public.reactions for insert with check (auth.uid() = user_id);

-- ─── 1. Personalized feed RPC ──────────────────────────────────────────────────
-- SECURITY INVOKER (default): the existing `finds: readable if collection is
-- public or own find` policy filters rows automatically, so we don't have to
-- duplicate the visibility predicate inside the function body.
create or replace function public.get_personalized_feed(
  viewer_user_id uuid,
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
  with candidate as (
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
    where f.user_id <> viewer_user_id  -- own finds belong to the profile, not the social feed
    order by f.created_at desc
    limit greatest(page_size * 5, 100) offset page_offset  -- pre-filter window before scoring
  ),
  scored as (
    select
      c.*,
      (
        select count(*)::int
        from public.user_collections uc_viewer
        where uc_viewer.user_id = viewer_user_id
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
  limit page_size;
$$;

grant execute on function public.get_personalized_feed(uuid, double precision, double precision, integer, integer) to authenticated;

-- ─── 2. Reactions INSERT policy: visibility-aware ──────────────────────────────
drop policy if exists "reactions: authenticated users can react" on public.reactions;

create policy "reactions: react to readable finds only"
  on public.reactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.finds f
      join public.collection_items ci on ci.id = f.collection_item_id
      join public.collections c on c.id = ci.collection_id
      where f.id = reactions.find_id
        and (c.is_public or f.user_id = auth.uid())
    )
  );
