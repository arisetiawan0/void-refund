-- ============================================================================
-- 0005 — Harga jual produk untuk laporan refund
--
-- Form refund kini wajib mencantumkan harga jual produk. Kolom nullable:
-- laporan void dan baris lama tetap null (harga bukan data void).
--
-- Idempotent: add column if not exists, aman dijalankan ulang.
-- Run di Supabase Dashboard > SQL Editor SEBELUM deploy versi baru,
-- supaya submit refund tidak gagal ("column harga_jual does not exist").
-- ============================================================================

alter table public.transactions
  add column if not exists harga_jual integer;

-- Rupiah utuh, minimal 1 bila diisi.
alter table public.transactions
  drop constraint if exists transactions_harga_jual_check;
alter table public.transactions
  add constraint transactions_harga_jual_check
  check (harga_jual is null or harga_jual >= 1);

comment on column public.transactions.harga_jual is
  'Harga jual satuan produk (Rupiah utuh) — wajib diisi form refund, null untuk void/legacy';
