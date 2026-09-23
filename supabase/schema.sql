-- KAWAKU Content Hub — schema production-ready.
-- Jalankan di Supabase Dashboard → SQL Editor (berurutan: schema.sql lalu seed.sql).
-- Idempoten: aman dijalankan ulang.

-- ============ ENUMS ============
do $$ begin
  create type app_role as enum ('superadmin', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_status as enum ('idea', 'draft', 'review', 'revision', 'approved', 'scheduled', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_type as enum ('feed', 'carousel', 'reels', 'story');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_kind as enum ('image', 'video');
exception when duplicate_object then null; end $$;

-- ============ TABLES ============
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  initials text not null default '',
  role app_role not null default 'admin',
  active boolean not null default true,
  joined_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists contents (
  id text primary key,
  title text not null,
  type content_type not null default 'feed',
  status content_status not null default 'idea',
  scheduled_date date not null,
  scheduled_time time not null default '09:00',
  pic_name text not null default '',
  pic_initials text not null default '',
  caption text not null default '',
  hashtags text not null default '',
  category text not null default '',
  notes text not null default '',
  slides integer,
  ig_media_id text,
  published_url text,
  ig_sync_error text,
  ig_user_tags text not null default '[]',
  ig_collaborators text not null default '[]',
  ig_location_id text,
  ig_location_name text,
  ig_alt_text text not null default '',
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_contents_ig_media_id on contents (ig_media_id);

create table if not exists content_status_history (
  id uuid primary key default gen_random_uuid(),
  content_id text not null references contents (id) on delete cascade,
  status content_status not null,
  changed_at date not null default current_date,
  changed_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_history_content on content_status_history (content_id);

create table if not exists content_comments (
  id uuid primary key default gen_random_uuid(),
  content_id text not null references contents (id) on delete cascade,
  author_name text not null,
  author_id uuid references profiles (id) on delete set null,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_content on content_comments (content_id);

create table if not exists media_assets (
  id text primary key,
  name text not null,
  kind media_kind not null,
  type content_type not null default 'feed',
  size_bytes bigint not null default 0,
  size_label text not null default '',
  duration text,
  uploaded_at date not null default current_date,
  uploaded_by text not null default '',
  tone text not null default '',
  drive_file_id text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists content_media (
  content_id text not null references contents (id) on delete cascade,
  media_id text not null references media_assets (id) on delete cascade,
  primary key (content_id, media_id)
);

create table if not exists analytics_daily (
  date date primary key,
  reach integer not null default 0,
  impressions integer not null default 0,
  engagement integer not null default 0
);

create table if not exists app_settings (
  user_id uuid primary key references profiles (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default '',
  notif jsonb not null default '{"review": true, "reminder": true, "status": false}',
  prefs jsonb not null default '{"defaultType": "reels", "defaultCategory": "UMKM", "reminderTime": "09:00"}',
  updated_at timestamptz not null default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  initials text not null default '',
  role text not null default '',
  email text not null default '',
  active boolean not null default true,
  joined_at date not null default current_date
);

-- Penanda sinkronisasi polling Instagram (satu baris id=1).
create table if not exists ig_sync_state (
  id integer primary key check (id = 1),
  last_sync_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Token IG auto-refresh (satu baris id=1, service-role only, tanpa policy baca).
create table if not exists ig_token_state (
  id integer primary key check (id = 1),
  access_token text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- updated_at otomatis
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_contents_touch on contents;
create trigger trg_contents_touch before update on contents
for each row execute function touch_updated_at();

drop trigger if exists trg_settings_touch on app_settings;
create trigger trg_settings_touch before update on app_settings
for each row execute function touch_updated_at();

-- ============ RLS ============
alter table profiles enable row level security;
alter table team_members enable row level security;
alter table contents enable row level security;
alter table content_status_history enable row level security;
alter table content_comments enable row level security;
alter table media_assets enable row level security;
alter table content_media enable row level security;
alter table analytics_daily enable row level security;
alter table app_settings enable row level security;
alter table ig_sync_state enable row level security;
alter table ig_token_state enable row level security;

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

-- Alias kompatibilitas (migrasi lama tetap jalan).
create or replace function public.is_editor_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
$$;

-- profiles: baca semua user login; ubah milik sendiri; admin penuh
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated using (true);
drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own on profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles for update to authenticated
  using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

-- contents: admin + superadmin CRUD penuh (is_admin mencakup keduanya)
drop policy if exists contents_select on contents;
create policy contents_select on contents for select to authenticated using (true);
drop policy if exists contents_insert on contents;
create policy contents_insert on contents for insert to authenticated with check (public.is_admin());
drop policy if exists contents_update on contents;
create policy contents_update on contents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists contents_delete on contents;
create policy contents_delete on contents for delete to authenticated using (public.is_admin());

-- history & comments: baca semua; tulis admin/superadmin (komentar: semua user login)
drop policy if exists history_select on content_status_history;
create policy history_select on content_status_history for select to authenticated using (true);
drop policy if exists history_insert on content_status_history;
create policy history_insert on content_status_history for insert to authenticated
  with check (public.is_admin());

drop policy if exists comments_select on content_comments;
create policy comments_select on content_comments for select to authenticated using (true);
drop policy if exists comments_insert on content_comments;
create policy comments_insert on content_comments for insert to authenticated with check (true);

-- media: baca semua; tulis/hapus admin + superadmin
drop policy if exists media_select on media_assets;
create policy media_select on media_assets for select to authenticated using (true);
drop policy if exists media_write on media_assets;
create policy media_write on media_assets for insert to authenticated with check (public.is_admin());
drop policy if exists media_update on media_assets;
create policy media_update on media_assets for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists media_delete on media_assets;
create policy media_delete on media_assets for delete to authenticated using (public.is_admin());

drop policy if exists content_media_select on content_media;
create policy content_media_select on content_media for select to authenticated using (true);
drop policy if exists content_media_write on content_media;
create policy content_media_write on content_media for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- team: baca semua; tulis/hapus hanya superadmin (admin read-only)
drop policy if exists team_select on team_members;
create policy team_select on team_members for select to authenticated using (true);
drop policy if exists team_write on team_members;
create policy team_write on team_members for insert to authenticated with check (public.is_superadmin());
drop policy if exists team_update on team_members;
create policy team_update on team_members for update to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
drop policy if exists team_delete on team_members;
create policy team_delete on team_members for delete to authenticated using (public.is_superadmin());

-- analytics: baca semua; tulis admin
drop policy if exists analytics_select on analytics_daily;
create policy analytics_select on analytics_daily for select to authenticated using (true);
drop policy if exists analytics_write on analytics_daily;
create policy analytics_write on analytics_daily for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- settings: hanya milik sendiri (admin boleh semua)
drop policy if exists settings_select on app_settings;
create policy settings_select on app_settings for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists settings_write on app_settings;
create policy settings_write on app_settings for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ig_sync_state: baca semua user login; tulis admin/superadmin
drop policy if exists ig_sync_select on ig_sync_state;
create policy ig_sync_select on ig_sync_state for select to authenticated using (true);
drop policy if exists ig_sync_write on ig_sync_state;
create policy ig_sync_write on ig_sync_state for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ig_favorite_tags: tag IG favorit tim (dikelola admin, saran teratas di form)
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
  using (public.is_admin()) with check (public.is_admin());
