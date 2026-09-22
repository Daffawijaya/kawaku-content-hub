-- KAWAKU Content Hub — tag IG favorit tim (dikelola admin di Settings,
-- muncul sebagai saran teratas di form untuk seluruh tim). Idempoten.
create table if not exists ig_favorite_tags (
  username text primary key,
  display_name text,
  created_at timestamptz not null default now()
);

alter table ig_favorite_tags enable row level security;

drop policy if exists igfav_select on ig_favorite_tags;
create policy igfav_select on ig_favorite_tags for select to authenticated using (true);
drop policy if exists igfav_write on ig_favorite_tags;
create policy igfav_write on ig_favorite_tags for all to authenticated
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());
