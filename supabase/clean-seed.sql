-- Bersihkan baris dummy peninggalan seed.sql lama.
-- Jalankan di Supabase SQL Editor (sekali saja).
-- Aman: hanya menyentuh id seed (c1–c13, m1–m12, 4 uuid tim).

-- Relasi dulu (FK), baru induknya.
delete from content_media
where content_id in ('c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13');

delete from content_comments
where content_id in ('c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13');

delete from content_status_history
where content_id in ('c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13');

delete from media_assets
where id in ('m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12');

delete from contents
where id in ('c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13');

delete from team_members
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4434-8444-444444444444'
);

-- ANALYTICS: seed mengisi 2026-07-16 s.d. 2026-09-14 (dan MENIMPA isi rentang
-- itu bila seed dijalankan ulang). Buka komentar baris di bawah HANYA bila
-- yakin belum ada data asli pada rentang tersebut:
-- delete from analytics_daily where date between '2026-07-16' and '2026-09-14';
