-- KAWAKU Content Hub — seed dari mock data (lib/mock.ts).
-- Jalankan SETELAH schema.sql. Idempoten (on conflict do nothing/update).

-- ============ CONTENTS ============
insert into contents (id, title, type, status, scheduled_date, scheduled_time, pic_name, pic_initials, caption, hashtags, category, notes, slides) values
('c1', 'Panen Raya Hortikultura Kukar', 'reels', 'scheduled', '2026-09-15', '09:00', 'Sinta Maharani', 'SM', 'Panen raya melon premium di Kukar! Petani lokal naik kelas dengan pendampingan intensif.', '#kawaku #kukar #petanimuda #panenraya', 'Pertanian', 'Pastikan subtitle burned-in sebelum jadwal tayang.', null),
('c2', 'UMKM Kopi Luwak Mahakam', 'feed', 'draft', '2026-09-15', '13:00', 'Bima Pratama', 'BP', 'Dari biji ke cangkir: perjalanan kopi luwak Mahakam yang mendunia.', '#kawaku #umkm #kopikaltim', 'UMKM', 'Draft siap, tinggal dijadwalkan.', null),
('c3', 'Festival Budaya Erau 2026', 'carousel', 'scheduled', '2026-09-16', '10:00', 'Daffa Wijaya', 'DW', '5 momen terbaik Festival Erau 2026 yang tidak boleh kamu lewatkan.', '#kawaku #erau2026 #budayakaltim', 'Budaya', '5 slide, cover sudah approved.', 5),
('c4', 'Ekowisata Mangrove Balikpapan', 'reels', 'draft', '2026-09-17', '15:00', 'Nadia Putri', 'NP', 'Susur hutan mangrove Balikpapan, paru-paru kota yang wajib dijaga.', '#kawaku #ekowisata #balikpapan', 'Pariwisata', 'Draft kasar, butuh VO dan color grading.', null),
('c5', 'Pasar Digital UMKM Samarinda', 'feed', 'published', '2026-09-12', '10:00', 'Bima Pratama', 'BP', 'UMKM Samarinda naik kelas lewat pasar digital.', '#kawaku #umkm #samarinda', 'UMKM', 'Sudah tayang, performa bagus.', null),
('c6', 'Kuliner Amplang Khas Kaltim', 'reels', 'published', '2026-09-11', '19:00', 'Sinta Maharani', 'SM', 'Renyah amplang khas Kaltim, oleh-oleh wajib dari Samarinda!', '#kawaku #kulinerkaltim #amplang', 'Kuliner', 'Top performer minggu ini.', null),
('c7', 'Profil Pengrajin Ulap Doyo', 'carousel', 'draft', '2026-09-18', '11:00', 'Nadia Putri', 'NP', 'Kain Ulap Doyo, warisan Benuaq yang ditenun dengan kesabaran.', '#kawaku #ulapdoyo #wastra', 'Budaya', 'Draft: ganti foto slide 2 yang blur, perbaiki typo slide 4.', 4),
('c8', 'Rute Wisata Susur Mahakam', 'story', 'idea', '2026-09-20', '08:00', 'Daffa Wijaya', 'DW', 'Polling: sunrise vs sunset di Mahakam?', '#kawaku #mahakam', 'Pariwisata', 'Baru ide, butuh footage perahu.', null),
('c9', 'Behind the Scene Liputan Erau', 'story', 'scheduled', '2026-09-16', '18:00', 'Rizky Ramadhan', 'RR', 'Keseruan tim di lapangan selama liputan Erau!', '#kawaku #bts #erau2026', 'Budaya', 'Siap tayang sesuai jadwal.', null),
('c10', 'Tips Foto Produk UMKM', 'carousel', 'draft', '2026-09-19', '14:00', 'Nadia Putri', 'NP', 'Cukup dengan HP, foto produk UMKM bisa terlihat profesional.', '#kawaku #tipsumkm', 'UMKM', 'Draft 3 slide, tambah contoh before-after.', 3),
('c11', 'Panorama Danau Labuan Cermin', 'feed', 'published', '2026-08-22', '10:00', 'Rizky Ramadhan', 'RR', 'Danau dua rasa di Berau — air tawar di atas, air asin di bawah.', '#kawaku #labuancermin #berau', 'Pariwisata', 'Sudah tayang.', null),
('c12', 'Festival Kuliner Tepian Mahakam', 'carousel', 'published', '2026-08-29', '16:00', 'Sinta Maharani', 'SM', '7 jajanan wajib di Festival Kuliner Tepian Mahakam.', '#kawaku #kulinerkaltim #festivalkuliner', 'Kuliner', 'Sudah tayang, 4 slide.', 4),
('c13', 'Kampung Tenun Samarinda', 'reels', 'published', '2026-09-03', '19:00', 'Nadia Putri', 'NP', 'Menjelajah Kampung Tenun Samarinda, rumah sarung legendaris.', '#kawaku #tenunsamarinda #wastra', 'Budaya', 'Sudah tayang.', null)
on conflict (id) do update set
  title = excluded.title, type = excluded.type, status = excluded.status,
  scheduled_date = excluded.scheduled_date, scheduled_time = excluded.scheduled_time,
  pic_name = excluded.pic_name, pic_initials = excluded.pic_initials,
  caption = excluded.caption, hashtags = excluded.hashtags, category = excluded.category,
  notes = excluded.notes, slides = excluded.slides;

-- ============ HISTORY (ringkas: milestone per konten) ============
insert into content_status_history (content_id, status, changed_at) values
('c1', 'idea', '2026-09-08'), ('c1', 'draft', '2026-09-09'), ('c1', 'review', '2026-09-10'), ('c1', 'approved', '2026-09-11'), ('c1', 'scheduled', '2026-09-12'),
('c2', 'idea', '2026-09-09'), ('c2', 'draft', '2026-09-11'), ('c2', 'review', '2026-09-13'),
('c3', 'idea', '2026-09-05'), ('c3', 'draft', '2026-09-07'), ('c3', 'review', '2026-09-09'), ('c3', 'approved', '2026-09-10'), ('c3', 'scheduled', '2026-09-11'),
('c4', 'idea', '2026-09-10'), ('c4', 'draft', '2026-09-10'),
('c5', 'idea', '2026-09-06'), ('c5', 'draft', '2026-09-08'), ('c5', 'review', '2026-09-10'), ('c5', 'approved', '2026-09-11'), ('c5', 'scheduled', '2026-09-11'), ('c5', 'published', '2026-09-12'),
('c6', 'idea', '2026-09-04'), ('c6', 'draft', '2026-09-06'), ('c6', 'review', '2026-09-08'), ('c6', 'approved', '2026-09-09'), ('c6', 'scheduled', '2026-09-10'), ('c6', 'published', '2026-09-11'),
('c7', 'idea', '2026-09-07'), ('c7', 'draft', '2026-09-09'), ('c7', 'review', '2026-09-12'), ('c7', 'revision', '2026-09-13'),
('c8', 'idea', '2026-09-13'),
('c9', 'idea', '2026-09-09'), ('c9', 'draft', '2026-09-10'), ('c9', 'review', '2026-09-11'), ('c9', 'approved', '2026-09-12'),
('c10', 'idea', '2026-09-11'), ('c10', 'draft', '2026-09-11'),
('c11', 'idea', '2026-08-16'), ('c11', 'draft', '2026-08-18'), ('c11', 'review', '2026-08-20'), ('c11', 'approved', '2026-08-21'), ('c11', 'scheduled', '2026-08-21'), ('c11', 'published', '2026-08-22'),
('c12', 'idea', '2026-08-21'), ('c12', 'draft', '2026-08-23'), ('c12', 'review', '2026-08-26'), ('c12', 'approved', '2026-08-27'), ('c12', 'scheduled', '2026-08-28'), ('c12', 'published', '2026-08-29'),
('c13', 'idea', '2026-08-27'), ('c13', 'draft', '2026-08-29'), ('c13', 'review', '2026-09-01'), ('c13', 'approved', '2026-09-02'), ('c13', 'scheduled', '2026-09-02'), ('c13', 'published', '2026-09-03')
on conflict do nothing;

-- ============ COMMENTS ============
insert into content_comments (content_id, author_name, text, created_at) values
('c2', 'Daffa Wijaya', 'Foto hero slide 1 kurang tajam, minta versi resolusi penuh ke tim lapangan ya.', '2026-09-13'),
('c7', 'Daffa Wijaya', 'Dikembalikan: foto slide 2 blur dan ada typo di slide 4.', '2026-09-13'),
('c7', 'Nadia Putri', 'Siap, revisi foto dan typo hari ini. Minta review ulang besok pagi.', '2026-09-13'),
('c3', 'Daffa Wijaya', 'Approved. Cover kuat, caption sudah sesuai tone KAWAKU.', '2026-09-11')
on conflict do nothing;

-- ============ MEDIA ============
insert into media_assets (id, name, kind, type, size_bytes, size_label, duration, uploaded_at, uploaded_by, tone, drive_file_id) values
('m1', 'panen-raya-cover.jpg', 'image', 'reels', 2516582, '2.4 MB', null, '2026-09-10', 'Sinta Maharani', 'from-brand-100 to-teal-50 dark:from-brand-950 dark:to-zinc-900', ''),
('m2', 'panen-raya-teaser.mp4', 'video', 'reels', 50541363, '48.2 MB', '00:45', '2026-09-10', 'Sinta Maharani', 'from-brand-100 to-teal-50 dark:from-brand-950 dark:to-zinc-900', ''),
('m3', 'kopi-mahakam-flatlay.jpg', 'image', 'feed', 3250586, '3.1 MB', null, '2026-09-09', 'Bima Pratama', 'from-amber-100 to-orange-50 dark:from-amber-950 dark:to-zinc-900', ''),
('m4', 'erau-pembuka.jpg', 'image', 'carousel', 1887437, '1.8 MB', null, '2026-09-08', 'Daffa Wijaya', 'from-sky-100 to-indigo-50 dark:from-sky-950 dark:to-zinc-900', ''),
('m5', 'erau-tari-hudoq.jpg', 'image', 'carousel', 2306867, '2.2 MB', null, '2026-09-08', 'Daffa Wijaya', 'from-sky-100 to-indigo-50 dark:from-sky-950 dark:to-zinc-900', ''),
('m6', 'mangrove-drone.mp4', 'video', 'reels', 126353408, '120.5 MB', '02:10', '2026-09-05', 'Nadia Putri', 'from-teal-100 to-brand-50 dark:from-teal-950 dark:to-zinc-900', ''),
('m7', 'pasar-digital-samarinda.jpg', 'image', 'feed', 3040870, '2.9 MB', null, '2026-09-11', 'Bima Pratama', 'from-zinc-200 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900', ''),
('m8', 'amplang-proses.mp4', 'video', 'reels', 67108864, '64.0 MB', '01:05', '2026-08-28', 'Sinta Maharani', 'from-orange-100 to-amber-50 dark:from-orange-950 dark:to-zinc-900', ''),
('m9', 'ulap-doyo-tenun.jpg', 'image', 'carousel', 4404019, '4.2 MB', null, '2026-09-06', 'Nadia Putri', 'from-rose-100 to-pink-50 dark:from-rose-950 dark:to-zinc-900', ''),
('m10', 'mahakam-sunset.mp4', 'video', 'story', 19608371, '18.7 MB', '00:15', '2026-09-12', 'Daffa Wijaya', 'from-cyan-100 to-sky-50 dark:from-cyan-950 dark:to-zinc-900', ''),
('m11', 'bts-erau-tim.jpg', 'image', 'story', 1572864, '1.5 MB', null, '2026-09-13', 'Rizky Ramadhan', 'from-violet-100 to-purple-50 dark:from-violet-950 dark:to-zinc-900', ''),
('m12', 'foto-produk-hp.jpg', 'image', 'carousel', 2097152, '2.0 MB', null, '2026-07-30', 'Nadia Putri', 'from-lime-100 to-brand-50 dark:from-lime-950 dark:to-zinc-900', '')
on conflict (id) do nothing;

insert into content_media (content_id, media_id) values
('c1','m1'), ('c1','m2'), ('c2','m3'), ('c3','m4'), ('c3','m5'), ('c4','m6'),
('c5','m7'), ('c6','m8'), ('c7','m9'), ('c8','m10'), ('c9','m11'), ('c9','m4'), ('c10','m12')
on conflict do nothing;

-- ============ ANALYTICS (60 hari s.d. 14 Sep 2026, deterministik) ============
do $$
declare
  i int;
  d date;
  wk boolean;
  r int;
begin
  for i in reverse 59..0 loop
    d := date '2026-09-14' - i;
    wk := extract(dow from d) in (0, 6);
    r := round(6200 * (1 + ((59 - i) / 59.0) * 0.9) * (case when wk then 1.35 else 1 end) * (0.9 + abs(sin(i * 12.9898)) * 0.2));
    insert into analytics_daily (date, reach, impressions, engagement)
    values (d, r, round(r * 1.6), round(r * 0.062))
    on conflict (date) do update set
      reach = excluded.reach, impressions = excluded.impressions, engagement = excluded.engagement;
  end loop;
end $$;

-- ============ ADMIN PERTAMA (contoh — ganti email lalu jalankan) ============
-- update profiles set role = 'admin' where email = 'daffa@kawaku.id';

-- ============ TEAM ============
insert into team_members (id, name, initials, role, email, active) values
('11111111-1111-4111-8111-111111111111', 'Dafa Yan Wijaya', 'DY', 'Designer', 'dafa@kawaku.id', true),
('22222222-2222-4222-8222-222222222222', 'Ahmad Faruq Wijaya', 'AF', 'Videographer', 'ahmad@kawaku.id', true),
('33333333-3333-4333-8333-333333333333', 'Rizkia Kaamila', 'RK', 'Designer', 'rizkia@kawaku.id', true),
('44444444-4444-4434-8444-444444444444', 'Naila Azzahra', 'NA', 'Videographer', 'naila@kawaku.id', true)
on conflict (id) do update set
  name = excluded.name, initials = excluded.initials, role = excluded.role,
  email = excluded.email, active = excluded.active;
