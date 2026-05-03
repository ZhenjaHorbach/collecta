-- 011_user_added_items.sql
-- Allow users to insert collection_items into ANY collection they have joined
-- (user_collections row), in addition to collections they own. Update/delete
-- remain owner-only — once a contributed item exists the collection's creator
-- moderates it. Read access is unchanged (already covered by 001).
--
-- Driven by the camera "no match → create new item" flow: when the AI can't
-- match a photo to an existing item, the user can append one on the spot to
-- the collection they're capturing into. Without this policy, picked-up
-- collections (joined, not owned) reject the insert.
--
-- Rollback: re-run 001's owner-only policy block, or drop+recreate this policy
-- with `using (creator_id = auth.uid())` only.

drop policy if exists "collection_items: owner can insert" on public.collection_items;
drop policy if exists "collection_items: members can insert" on public.collection_items;
create policy "collection_items: members can insert"
  on public.collection_items for insert
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.creator_id = auth.uid()
    )
    or exists (
      select 1 from public.user_collections uc
      where uc.collection_id = collection_items.collection_id
        and uc.user_id = auth.uid()
    )
  );
