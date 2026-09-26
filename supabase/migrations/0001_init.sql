-- ============================================================================
-- Void & Refund register — Supabase schema + RLS
-- PRD: void-refund/prd.md (§4.3 form, §4.4 bukti, §4.6 laporan, §6 struktur data)
--
-- Model auth: tiap outlet = 1 user di Supabase Auth.
--   email    = "<OUTLET_ID>@outlet.internal"  (bt01@outlet.internal, dst.)
--   password = dibagikan HO ke outlet, di-hash Supabase (bcrypt).
-- Superadmin = 1 user auth dengan JWT claim isAdmin: true (dikelola lewat
-- scripts/create-users.mjs).
--
-- Idempotent: aman dijalankan ulang di SQL Editor. Bila run sebelumnya
-- gagal, tidak ada yang ke-set (satu transaksi), tinggal run lagi.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabel outlet (master, sinkron dengan user auth via scripts/create-users.mjs)
-- ---------------------------------------------------------------------------
create table if not exists public.outlets (
  id            text primary key,               -- BT01, BT02, BT28, ...
  nama          text not null,
  auth_user_id  uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table public.outlets enable row level security;

drop policy if exists "outlets readable by authenticated" on public.outlets;
-- Siapa pun yang sudah login boleh membaca daftar outlet (dropdown filter
-- superadmin dan nama outlet di header).
create policy "outlets readable by authenticated"
  on public.outlets for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Helper: baca klaim dari JWT sesi saat ini.
-- Klaim custom disimpan di app_metadata user (set via service role);
-- di JWT bisa muncul nested di app_metadata atau flat di root,
-- jadi cek keduanya.
-- ---------------------------------------------------------------------------
create or replace function public.jwt_claims()
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  )
$$;

create or replace function public.jwt_outlet_id()
returns text
language sql
stable
as $$
  select nullif(
    coalesce(
      public.jwt_claims() -> 'app_metadata' ->> 'outletId',
      public.jwt_claims() ->> 'outletId'
    ),
    ''
  )
$$;

create or replace function public.jwt_is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (public.jwt_claims() -> 'app_metadata' ->> 'isAdmin')::boolean,
    (public.jwt_claims() ->> 'isAdmin')::boolean,
    false
  )
$$;

-- ---------------------------------------------------------------------------
-- Tabel transaksi
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  outlet_id     text not null references public.outlets (id) on delete restrict,
  jenis         text not null check (jenis in ('void', 'refund')),
  tanggal       date not null default current_date,
  nama_kasir    text not null,
  nama_barang   text not null,
  barcode       text not null,
  qty           integer not null check (qty >= 1),
  alasan        text not null,
  mod_bertugas  text not null,
  -- Bukti foto: path object di Storage bucket "proofs"
  -- (mis. "BT01/<txid>/bukti_layar_kasir.png")
  bukti_layar_kasir_path    text,
  bukti_barang_void_path    text,
  bukti_struk_customer_path text,
  bukti_struk_refund_path   text,   -- khusus refund
  -- 'draft' saat baris dibuat (sebelum semua bukti wajib terkumpul),
  -- 'complete' ketika lengkap — dihitung trigger, bukan oleh client.
  status        text not null default 'draft' check (status in ('draft', 'complete')),
  revision      integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists transactions_outlet_created_idx
  on public.transactions (outlet_id, created_at desc);
create index if not exists transactions_tanggal_idx
  on public.transactions (tanggal);

-- ---------------------------------------------------------------------------
-- Trigger: isi outlet_id dari JWT bila kosong + hitung kelengkapan bukti
-- (server-side enforcement, PRD §4.4)
-- ---------------------------------------------------------------------------
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

  -- Bukti wajib: 3 slot umum + struk refund khusus jenis refund
  expected := 3;
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

  if filled = expected then
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

drop trigger if exists transactions_enforce_trg on public.transactions;
create trigger transactions_enforce_trg
  before insert or update on public.transactions
  for each row execute function public.transactions_enforce();

-- ---------------------------------------------------------------------------
-- Trigger: outlet tidak boleh memindahkan transaksi ke outlet lain.
-- ---------------------------------------------------------------------------
create or replace function public.transactions_lock_outlet()
returns trigger
language plpgsql
as $$
begin
  if public.jwt_is_admin() then
    return new;
  end if;
  if new.outlet_id is distinct from old.outlet_id then
    new.outlet_id := old.outlet_id;
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_lock_outlet_trg on public.transactions;
create trigger transactions_lock_outlet_trg
  before update on public.transactions
  for each row execute function public.transactions_lock_outlet();

-- ---------------------------------------------------------------------------
-- RLS transactions
-- ---------------------------------------------------------------------------
alter table public.transactions enable row level security;

-- Outlet melihat transaksi miliknya; superadmin melihat semua (PRD §4.6).
drop policy if exists "outlet selects own tx" on public.transactions;
create policy "outlet selects own tx"
  on public.transactions for select to authenticated
  using (public.jwt_is_admin() or outlet_id = public.jwt_outlet_id());

drop policy if exists "outlet inserts own tx" on public.transactions;
create policy "outlet inserts own tx"
  on public.transactions for insert to authenticated
  with check (outlet_id = public.jwt_outlet_id());

drop policy if exists "outlet updates own tx" on public.transactions;
create policy "outlet updates own tx"
  on public.transactions for update to authenticated
  using (public.jwt_is_admin() or outlet_id = public.jwt_outlet_id());

-- Delete: superadmin juga bisa membersihkan data; log audit tetap terekam
-- via trigger di transaction_logs.
drop policy if exists "outlet deletes own tx" on public.transactions;
create policy "outlet deletes own tx"
  on public.transactions for delete to authenticated
  using (public.jwt_is_admin() or outlet_id = public.jwt_outlet_id());

-- ---------------------------------------------------------------------------
-- Audit log (PRD §5: siapa mengedit/menghapus, kapan)
-- ---------------------------------------------------------------------------
create table if not exists public.transaction_logs (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid references public.transactions (id) on delete cascade,
  action          text not null check (action in ('create', 'update', 'delete')),
  at              timestamptz not null default now(),
  by              text not null,            -- outlet id atau 'superadmin'
  note            text
);

alter table public.transaction_logs enable row level security;

drop policy if exists "log readable by authenticated" on public.transaction_logs;
create policy "log readable by authenticated"
  on public.transaction_logs for select to authenticated
  using (true);

-- Log tidak bisa diedit/dihapus client; hanya ditulis trigger security definer.
create or replace function public.record_transaction_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text;
begin
  if public.jwt_is_admin() then
    actor := 'superadmin';
  else
    actor := coalesce(public.jwt_outlet_id(), 'unknown');
  end if;

  if tg_op = 'INSERT' then
    insert into public.transaction_logs (transaction_id, action, by)
      values (new.id, 'create', actor);
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.transaction_logs (transaction_id, action, by, note)
      values (new.id, 'update', actor, 'revisi ' || new.revision::text);
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.transaction_logs (transaction_id, action, by)
      values (old.id, 'delete', actor);
    return old;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists transactions_log_trg on public.transactions;
create trigger transactions_log_trg
  after insert or update or delete on public.transactions
  for each row execute function public.record_transaction_log();

-- ---------------------------------------------------------------------------
-- Storage bucket "proofs" (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

-- Path file: proofs/<outlet_id>/<tx_id>/<slot>.png
create or replace function public.storage_outlet_path_ok(name text)
returns boolean
language sql
stable
as $$
  select public.jwt_is_admin()
    or public.jwt_outlet_id() = split_part(name, '/', 1)
$$;

drop policy if exists "proofs: baca milik outlet atau admin" on storage.objects;
create policy "proofs: baca milik outlet atau admin"
  on storage.objects for select to authenticated
  using (bucket_id = 'proofs' and public.storage_outlet_path_ok(name));

drop policy if exists "proofs: tulis di folder outlet sendiri" on storage.objects;
create policy "proofs: tulis di folder outlet sendiri"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and public.storage_outlet_path_ok(name));

drop policy if exists "proofs: ganti di folder outlet sendiri" on storage.objects;
create policy "proofs: ganti di folder outlet sendiri"
  on storage.objects for update to authenticated
  using (bucket_id = 'proofs' and public.storage_outlet_path_ok(name))
  with check (bucket_id = 'proofs' and public.storage_outlet_path_ok(name));

drop policy if exists "proofs: hapus milik outlet" on storage.objects;
create policy "proofs: hapus milik outlet"
  on storage.objects for delete to authenticated
  using (bucket_id = 'proofs' and public.storage_outlet_path_ok(name));
