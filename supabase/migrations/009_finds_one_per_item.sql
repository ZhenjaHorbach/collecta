-- Migration: 009_finds_one_per_item
-- Enforces "one find per (user, collection_item)". Before this, a re-photo of
-- the same item created a second finds row, which doubled the pin on the map
-- and inflated XP via the find event firing twice. Going forward the client
-- updates the existing row in place (see src/services/finds.service.ts).
--
-- Order matters:
--   1. Dedupe existing rows — keep the most recent per (user, item).
--   2. Add the unique constraint.
--
-- Rollback:
--   alter table public.finds drop constraint if exists finds_user_item_unique;

-- Step 1: dedupe. Delete every find that isn't the latest for its
-- (user_id, collection_item_id) pair. created_at desc, id desc as a stable
-- tiebreaker if two rows share the same timestamp.
delete from public.finds f
using (
  select id
  from (
    select
      id,
      row_number() over (
        partition by user_id, collection_item_id
        order by created_at desc, id desc
      ) as rn
    from public.finds
  ) ranked
  where rn > 1
) dupes
where f.id = dupes.id;

-- Step 2: enforce going forward.
alter table public.finds
  add constraint finds_user_item_unique unique (user_id, collection_item_id);
