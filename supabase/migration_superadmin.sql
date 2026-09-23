-- KAWAKU Content Hub — migrasi hirarki superadmin > admin.
-- Jalankan di Supabase Dashboard → SQL Editor. Idempoten: aman dijalankan ulang.
--
-- Hasil akhir:
-- - enum app_role hanya ('superadmin', 'admin'), default 'admin'.
-- - superadmin (ta.naikkelas@gmail.com): penuh + satu-satunya yg bisa CRUD tim.
-- - admin (semua anggota baru + Daffa): penuh kecuali halaman Tim read-only.
-- - tambah anggota via API selalu membuat akun role admin.

-- 1. Normalisasi data lama (editor/viewer → admin) sebelum tipe diganti.
do $$ begin
  update profiles set role = 'admin' where role::text in ('editor', 'viewer');
exception when undefined_object then null; end $$;

-- 2. Lepas fungsi lama yg mengembalikan app_role agar tipe bisa diganti.
-- CASCADE ikut melepas policy RLS yg memanggilnya; policy tersebut dibuat
-- ulang di bawah (termasuk profiles_update_own + settings yg definisinya tetap).
drop function if exists public.current_role() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.is_editor_or_admin() cascade;

-- 3. Ganti enum: ('admin','editor','viewer') → ('superadmin','admin').
do $$ begin
  create type app_role_new as enum ('superadmin', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table profiles alter column role drop default;
exception when undefined_object then null; end $$;

do $$ begin
  alter table profiles
    alter column role type app_role_new using role::text::app_role_new;
exception when undefined_object then null; end $$;

do $$ begin
  drop type app_role;
exception when undefined_object then null; end $$;

do $$ begin
  alter type app_role_new rename to app_role;
exception when undefined_object then null; end $$;

alter table profiles alter column role set default 'admin'::app_role;

-- 4. Promote superadmin (ganti email bila perlu).
update profiles set role = 'superadmin' where email = 'ta.naikkelas@gmail.com';

-- 5. Fungsi hirarki baru.
create or replace function public.current_role()
returns app_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'superadmin')
$$;

-- Admin dalam arti luas: admin biasa maupun superadmin.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'superadmin'))
$$;

-- Alias kompatibilitas (migrasi lama + kode yg belum diperbarui tetap jalan).
create or replace function public.is_editor_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
$$;

-- 6. Policy yg ikut ter-drop CASCADE tapi definisinya tetap (is_admin kini
-- mencakup admin + superadmin).
drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles for update to authenticated
  using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());
drop policy if exists settings_select on app_settings;
create policy settings_select on app_settings for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists settings_write on app_settings;
create policy settings_write on app_settings for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- 7. RLS tim: baca semua; tulis/hapus hanya superadmin.
drop policy if exists team_select on team_members;
create policy team_select on team_members for select to authenticated using (true);
drop policy if exists team_write on team_members;
create policy team_write on team_members for insert to authenticated with check (public.is_superadmin());
drop policy if exists team_update on team_members;
create policy team_update on team_members for update to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
drop policy if exists team_delete on team_members;
create policy team_delete on team_members for delete to authenticated using (public.is_superadmin());

-- 8. RLS non-tim: admin + superadmin CRUD penuh (is_admin mencakup keduanya).
drop policy if exists contents_insert on contents;
create policy contents_insert on contents for insert to authenticated with check (public.is_admin());
drop policy if exists contents_update on contents;
create policy contents_update on contents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists contents_delete on contents;
create policy contents_delete on contents for delete to authenticated using (public.is_admin());

drop policy if exists history_insert on content_status_history;
create policy history_insert on content_status_history for insert to authenticated
  with check (public.is_admin());

drop policy if exists media_write on media_assets;
create policy media_write on media_assets for insert to authenticated with check (public.is_admin());
drop policy if exists media_update on media_assets;
create policy media_update on media_assets for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists media_delete on media_assets;
create policy media_delete on media_assets for delete to authenticated using (public.is_admin());

drop policy if exists content_media_write on content_media;
create policy content_media_write on content_media for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists analytics_write on analytics_daily;
create policy analytics_write on analytics_daily for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists ig_sync_write on ig_sync_state;
create policy ig_sync_write on ig_sync_state for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists igfav_write on ig_favorite_tags;
create policy igfav_write on ig_favorite_tags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 9. Cek cepat setelah migrasi (jalankan manual):
-- select email, role from profiles order by email;
-- select name, email, user_id from team_members order by name;
-- Daffa: pastikan profiles.role='admin' dan team_members.user_id tertaut:
-- update profiles set role='admin' where email='<email-daffa>';
-- update team_members set user_id=(select id from profiles where email='<email-daffa>') where email='<email-daffa>';
