-- KAWAKU Content Hub — token IG auto-refresh (ganti system user yg gagal diklaim).
-- Token disimpan di DB (service-role only), cron merefresh otomatis sebelum expired
-- sehingga umur selalu reset ke ~60 hari. Idempoten.
create table if not exists ig_token_state (
  id integer primary key check (id = 1),
  access_token text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- RLS tanpa policy = hanya service-role yg bisa baca/tulis (token tak bocor ke browser).
alter table ig_token_state enable row level security;
