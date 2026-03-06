insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "videos_public_read" on storage.objects;
create policy "videos_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'videos');

drop policy if exists "videos_auth_upload_own_prefix" on storage.objects;
create policy "videos_auth_upload_own_prefix"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "videos_auth_update_own_prefix" on storage.objects;
create policy "videos_auth_update_own_prefix"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'videos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "videos_auth_delete_own_prefix" on storage.objects;
create policy "videos_auth_delete_own_prefix"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
