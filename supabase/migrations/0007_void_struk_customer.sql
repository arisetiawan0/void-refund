-- ============================================================================
-- 0007 — Struk customer wajib juga untuk laporan void
--
-- Aturan final (menggantikan 0004/0006):
--   - void   : Layar kasir + Barang void + Struk customer   (3 foto)
--   - refund : Struk customer + Struk refund ttd MOD        (2 foto)
--   Struk customer kini wajib di kedua jenis laporan.
--
-- Catatan legacy: baris void lama tanpa foto struk customer akan turun ke
-- 'draft' kalau di-update lagi lewat API. Baris yang tidak disentuh tetap
-- 'complete'. Foto lama tetap terbaca di halaman detail.
--
-- Idempotent: create or replace function, aman dijalankan ulang.
-- Run di Supabase Dashboard > SQL Editor sebelum deploy versi ini.
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

  if new.jenis = 'refund' then
    -- Refund: struk customer + struk refund (ttd MOD)
    expected := 2;
    filled :=
      (new.bukti_struk_customer_path is not null)::int
      + (new.bukti_struk_refund_path is not null)::int;
  else
    -- Void: layar kasir + barang void + struk customer
    expected := 3;
    new.bukti_struk_refund_path := null;
    filled :=
      (new.bukti_layar_kasir_path is not null)::int
      + (new.bukti_barang_void_path is not null)::int
      + (new.bukti_struk_customer_path is not null)::int;
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
