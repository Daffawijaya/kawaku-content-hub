-- KAWAKU Content Hub — foto profil akun (dipakai navbar + avatar PIC).
-- 1. Kolom avatar_url di profiles (URL publik file, null = inisial).
-- 2. Bucket Storage publik "avatars" + policy: baca bebas, tulis folder sendiri.
-- Idempoten. Jalankan di Supabase Dashboard → SQL Editor.

alter table profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_upload_own on storage.objects;
create policy avatars_upload_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
