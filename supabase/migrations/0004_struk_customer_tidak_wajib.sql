-- ============================================================================
-- 0004 — Bukti "Struk customer" tidak lagi wajib
--
-- Form tidak lagi meminta foto struk customer (slot dihapus dari UI).
-- Trigger kelengkapan di 0001 menghitung 3 bukti umum termasuk
-- bukti_struk_customer_path; tanpa update ini setiap laporan baru akan
-- terjebak status 'draft' karena filled < expected.
--
-- Perubahan:
--   - expected := 2 (layar kasir + barang void); refund tetap +1 (struk refund).
--   - filled tetap menghitung 4 kolom: baris legacy yang lengkap (termasuk
--     struk customer) tidak turun status saat di-update.
--   - filled >= expected (bukan =) supaya baris legacy dengan bukti ekstra
--     tetap 'complete'.
--   - Kolom bukti_struk_customer_path TIDAK dihapus: data lama tetap terbaca
--     dan ikut terhapus bersama transaksinya.
--
-- Idempotent: cukup create or replace function, aman dijalankan ulang.
-- Run di Supabase Dashboard > SQL Editor.
-- ============================================================================

create or replace function public.transactions_enforce()
returns trigger
language plpgsql
as $$
declare
  expected integer;
  filled   integer;
begin
  if tg_op = 'INSERT' and new.outlet_id is null then
    new.outlet_id := public.jwt_outlet_id();
  end if;

  if new.outlet_id is null then
    raise exception 'outlet_id wajib (dari sesi login atau body)';
  end if;

  -- Bukti wajib: 2 slot umum (layar kasir, barang void) + struk refund
  -- khusus jenis refund. Struk customer tidak wajib sejak 0004.
  expected := 2;
  if new.jenis = 'refund' then
    expected := expected + 1;
  else
    new.bukti_struk_refund_path := null;
  end if;

  filled :=
    (new.bukti_layar_kasir_path is not null)::int
    + (new.bukti_barang_void_path is not null)::int
    + (new.bukti_struk_customer_path is not null)::int
    + (new.bukti_struk_refund_path is not null)::int;

  if filled >= expected then
    new.status := 'complete';
  else
    new.status := 'draft';
  end if;

  if tg_op = 'UPDATE' then
    new.revision   := old.revision + 1;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;

  return new;
end;
$$;
