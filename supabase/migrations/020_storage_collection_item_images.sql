-- Storage bucket for user-uploaded collection item preview images.
-- Public read so Discover / CollectionDetail can render directly via
-- public URL. Insert restricted to authenticated users; objects are
-- namespaced under their uid (matching the finds-photos pattern in 005).
--
-- Rollback:
--   delete from storage.buckets where id = 'collection-item-images';
--   drop policy "collection-item-images: authenticated insert" on storage.objects;
--   drop policy "collection-item-images: public read" on storage.objects;
--   drop policy "collection-item-images: owner update" on storage.objects;
--   drop policy "collection-item-images: owner delete" on storage.objects;

insert into storage.buckets (id, name, public)
values ('collection-item-images', 'collection-item-images', true)
on conflict (id) do nothing;

drop policy if exists "collection-item-images: public read" on storage.objects;
create policy "collection-item-images: public read"
  on storage.objects for select
  using (bucket_id = 'collection-item-images');

drop policy if exists "collection-item-images: authenticated insert" on storage.objects;
create policy "collection-item-images: authenticated insert"
  on storage.objects for insert
  with check (
    bucket_id = 'collection-item-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "collection-item-images: owner update" on storage.objects;
create policy "collection-item-images: owner update"
  on storage.objects for update
  using (
    bucket_id = 'collection-item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "collection-item-images: owner delete" on storage.objects;
create policy "collection-item-images: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'collection-item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
