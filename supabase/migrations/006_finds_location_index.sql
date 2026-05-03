-- Index for fast viewport queries on the map.
-- Filtered to skip rows without coordinates (mostly older finds).
-- Rollback: drop index if exists public.finds_location_idx;
create index if not exists finds_location_idx
  on public.finds (location_lat, location_lng)
  where location_lat is not null and location_lng is not null;
