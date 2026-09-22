-- KAWAKU Content Hub — kolaborator IG per konten (maks 3, feed/reels/carousel).
-- Idempoten.
alter table contents add column if not exists ig_collaborators text not null default '[]';
