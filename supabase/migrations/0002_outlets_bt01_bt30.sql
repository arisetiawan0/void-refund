-- ============================================================================
-- 0002: Daftar outlet BT01–BT30 (nama "Beauty 01" … "Beauty 30")
--
-- Menambah outlet BT03–BT30 yang belum ada, dan menyamakan nama outlet lama
-- (BT01/BT02/BT28) ke penamaan baru. Tidak menyentuh tabel lain, policies,
-- maupun user auth — user auth tetap dibuat via scripts/create-users.mjs.
--
-- Idempotent: aman dijalankan ulang di SQL Editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: gen_series 1..30 → 'BT01' … 'BT30' + nama 'Beauty 01' … 'Beauty 30'
-- ---------------------------------------------------------------------------
insert into public.outlets (id, nama)
select
  'BT' || lpad(g::text, 2, '0'),
  'Beauty ' || lpad(g::text, 2, '0')
from generate_series(1, 30) as g
on conflict (id) do update
  set nama = excluded.nama;   -- samakan nama outlet lama, auth_user_id tetap

-- ---------------------------------------------------------------------------
-- Verifikasi cepat (jalankan terpisah di SQL Editor): harus 30 baris, BT01…BT30
-- ---------------------------------------------------------------------------
-- select id, nama from public.outlets order by id;
