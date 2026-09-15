-- KAWAKU Content Hub — migrasi collab post (owner vs collaborator).
-- Jalankan di Supabase Dashboard → SQL Editor. Idempoten: aman dijalankan ulang.
--
-- Membedakan postingan yg diposting sendiri oleh akun KAWAKU (owner)
-- vs postingan tempat akun KAWAKU hanya diundang sbg kolaborator
-- (collab post, diimport dari endpoint /collaborative_media IG).

do $$ begin
  create type post_role as enum ('owner', 'collaborator');
exception when duplicate_object then null; end $$;

alter table contents add column if not exists post_role post_role not null default 'owner';

-- Kueri cepat per peran di Top Content.
create index if not exists idx_contents_post_role on contents (post_role);
