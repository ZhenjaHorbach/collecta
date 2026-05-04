-- Migration: 013_feed_and_reactions
-- 1) RPC `get_personalized_feed` — algorithmic feed scored by
--    (shared_collections × 3 + geo × 2 + reactions × 1).
-- 2) Tighten reactions INSERT and SELECT policies so visibility matches the
--    `finds` rules: a user cannot react to or see counts on a find whose
--    collection they aren't allowed to read. The 001_init INSERT policy
--    only checked `auth.uid() = user_id`, and `using (true)` on SELECT let
--    anyone count reactions on any find (information leak via guessable
--    UUIDs).
-- Rollback:
--   drop function if exists public.get_personalized_feed(double precision, double precision, integer, integer);
--   drop policy if exists "reactions: react to readable finds only" on public.reactions;
--   drop policy if exists "reactions: read on readable finds only" on public.reactions;
--   create policy "reactions: authenticated users can react"
--     on public.reactions for insert with check (auth.uid() = user_id);
--   create policy "reactions: public read"
--     on public.reactions for select using (true);

-- ─── 1. Personalized feed RPC ──────────────────────────────────────────────────
-- SECURITY INVOKER (default): the existing `finds: readable if collection is
-- public or own find` policy filters rows automatically, so we don't have to
-- duplicate the visibility predicate inside the function body. The viewer is
-- always `auth.uid()` — no parameter to spoof, no per-call ambiguity. To page,
-- the candidate window is fixed and `page_offset` advances on the FINAL ranked
-- output, so consecutive calls don't re-rank overlapping windows.
create or replace function public.get_personalized_feed(
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
    -- Fixed pre-scoring window. 200 most-recent visible finds is enough for
    -- ~10 pages of feed without paginating the candidate set itself, which
    -- would otherwise overlap and re-rank.
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
    where f.user_id <> v.id  -- own finds belong to the profile, not the social feed
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

-- ─── 2. Reactions visibility policies ──────────────────────────────────────────
drop policy if exists "reactions: authenticated users can react" on public.reactions;
drop policy if exists "reactions: public read" on public.reactions;

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
