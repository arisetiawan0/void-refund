-- ============================================================================
-- 0003: Auto-delete foto bukti di Storage bucket "proofs" setelah 30 hari
--
-- Bucket proofs (private) menyimpan 3–4 foto per transaksi. Supabase tidak
-- punya lifecycle policy bawaan untuk bucket, jadi pembersihan dijalankan
-- lewat pg_cron: harian, hapus semua object Storage yang created_at (metadata
-- object, server-side) lebih tua dari 30 hari.
--
-- Idempotent: aman dijalankan ulang di SQL Editor.
-- ============================================================================

create extension if not exists pg_cron;

create or replace function public.purge_old_proofs()
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  deleted integer := 0;
begin
  with victims as (
    select o.bucket_id, o.name
    from storage.objects o
    where o.bucket_id = 'proofs'
      and o.created_at < now() - interval '30 days'
  ), del as (
    delete from storage.objects o
    using victims v
    where o.bucket_id = v.bucket_id and o.name = v.name
    returning o.name
  )
  select count(*) into deleted from del;
  return deleted;
end;
$$;

-- Jadwal harian jam 03:00 UTC (10:00/11:00 WIB) — kosongkan dulu slot lama
-- dengan nama sama supaya tidak duplikat saat di-run ulang / diubah jadwalnya.
select cron.unschedule(jobid) from cron.job where jobname = 'purge-old-proofs';

select cron.schedule(
  'purge-old-proofs',
  '0 3 * * *',
  $$ select public.purge_old_proofs(); $$
);
