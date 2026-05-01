-- Storage bucket for find photos.
-- Public read so feed/map can render images directly via public URL.
-- Insert restricted to authenticated users; objects are namespaced under their uid.
--
-- Rollback:
--   delete from storage.buckets where id = 'finds-photos';
--   drop policy "finds-photos: authenticated insert" on storage.objects;
--   drop policy "finds-photos: public read" on storage.objects;
--   drop policy "finds-photos: owner update" on storage.objects;
--   drop policy "finds-photos: owner delete" on storage.objects;

insert into storage.buckets (id, name, public)
values ('finds-photos', 'finds-photos', true)
on conflict (id) do nothing;

drop policy if exists "finds-photos: public read" on storage.objects;
create policy "finds-photos: public read"
  on storage.objects for select
  using (bucket_id = 'finds-photos');

drop policy if exists "finds-photos: authenticated insert" on storage.objects;
create policy "finds-photos: authenticated insert"
  on storage.objects for insert
  with check (
    bucket_id = 'finds-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "finds-photos: owner update" on storage.objects;
create policy "finds-photos: owner update"
  on storage.objects for update
  using (
    bucket_id = 'finds-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "finds-photos: owner delete" on storage.objects;
create policy "finds-photos: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'finds-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
