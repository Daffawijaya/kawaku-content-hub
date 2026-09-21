-- Tautkan anggota tim ke akun login (auth.users via profiles).
-- user_id null = anggota lama / tanpa akun login.
alter table team_members
  add column if not exists user_id uuid references profiles (id) on delete set null;
