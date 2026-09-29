-- ============================================================================
-- 0006 — Bukti wajib berbeda per jenis laporan
--
-- Aturan baru (menggantikan 0004):
--   - void   : Layar kasir + Barang void        (2 foto)
--   - refund : Struk customer + Struk refund ttd MOD (2 foto)
--   Form tidak lagi meminta Layar kasir & Barang void untuk refund, dan
--   tidak meminta Struk customer untuk void.
--
-- Catatan legacy: baris refund lama yang lengkap (layar + barang + struk
-- refund, tanpa struk customer) akan turun ke 'draft' KALAU di-update lagi
-- lewat API, karena struk customer kini bagian dari syarat refund. Baris
-- yang tidak disentuh tetap 'complete'. Kolom lama tidak dihapus, foto lama
-- tetap terbaca di halaman detail.
--
-- Idempotent: create or replace function, aman dijalankan ulang.
-- Run di Supabase Dashboard > SQL Editor sebelum deploy versi ini, kalau
-- tidak laporan refund baru tidak akan pernah berstatus 'complete'.
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

  expected := 2;
  if new.jenis = 'refund' then
    -- Refund: struk customer + struk refund (ttd MOD)
    filled :=
      (new.bukti_struk_customer_path is not null)::int
      + (new.bukti_struk_refund_path is not null)::int;
  else
    -- Void: layar kasir + barang void
    new.bukti_struk_refund_path := null;
    filled :=
      (new.bukti_layar_kasir_path is not null)::int
      + (new.bukti_barang_void_path is not null)::int;
  end if;

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
