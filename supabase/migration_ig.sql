-- KAWAKU Content Hub — migrasi Instagram (Fase 1).
-- Jalankan di Supabase Dashboard → SQL Editor setelah schema.sql.
-- Idempoten: aman dijalankan ulang.

-- Kolom tautan Instagram di contents.
alter table contents add column if not exists ig_media_id text;
alter table contents add column if not exists published_url text;
alter table contents add column if not exists ig_sync_error text;

-- Unik per media IG (NULL boleh ganda di Postgres — baris non-IG aman).
create unique index if not exists idx_contents_ig_media_id on contents (ig_media_id);

-- Penanda sinkronisasi polling (satu baris id=1).
create table if not exists ig_sync_state (
  id integer primary key check (id = 1),
  last_sync_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table ig_sync_state enable row level security;

drop policy if exists ig_sync_select on ig_sync_state;
create policy ig_sync_select on ig_sync_state for select to authenticated using (true);
drop policy if exists ig_sync_write on ig_sync_state;
create policy ig_sync_write on ig_sync_state for all to authenticated
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());
