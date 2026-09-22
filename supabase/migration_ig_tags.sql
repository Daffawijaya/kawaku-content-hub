-- KAWAKU Content Hub — migrasi tag IG (user_tags, lokasi, alt text).
-- Jalankan di Supabase Dashboard → SQL Editor setelah migration_ig.sql.
-- Idempoten: aman dijalankan ulang.

-- Tag orang (JSON array username), lokasi (Page ID + nama), alt text gambar.
alter table contents add column if not exists ig_user_tags text not null default '[]';
alter table contents add column if not exists ig_location_id text;
alter table contents add column if not exists ig_location_name text;
alter table contents add column if not exists ig_alt_text text not null default '';
