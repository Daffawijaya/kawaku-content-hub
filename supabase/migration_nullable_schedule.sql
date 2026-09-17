-- Jadwal boleh kosong (stok / turun ke stok menghapus jadwal).
-- JALANKAN di Supabase SQL Editor (sekali). Tanpa ini, pindah ke Stok gagal
-- (kolom masih NOT NULL) dan app menampilkan toast error.
alter table if exists contents alter column scheduled_date drop not null;
alter table if exists contents alter column scheduled_time drop not null;

-- Stok existing yang masih membawa tanggal lama ikut dibersihkan.
update contents
set scheduled_date = null, scheduled_time = null
where status = 'idea';
