# Supabase Backend — Void & Refund

Backend untuk aplikasi laporan void & refund (lihat `../prd.md`):
Postgres + Auth + Storage di Supabase, RLS per-outlet, foto bukti private
via signed URL.

## Struktur

```
supabase/
  migrations/0001_init.sql   # schema + RLS + trigger audit + bucket "proofs"
scripts/
  create-users.mjs           # buat user auth outlet + superadmin (service role)
src/lib/
  supabase.ts                # client browser (anon key)
  auth.ts                    # login outlet/admin, sesi dari JWT claim
  db.ts                      # CRUD transaksi + upload foto Storage
  backend.ts                 # kontrak tipe antara UI dan backend
```

## Setup (sekali)

1. **Buat project** di [supabase.com](https://supabase.com) (region terdekat,
   mis. Singapore). Catat **Project URL** dan **anon key** dari
   *Project Settings → API*.

2. **Isi `.env.local`** di folder `start-app/`:

   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-public-key>
   ```

3. **Jalankan migrasi SQL** — buka *SQL Editor* di dashboard Supabase,
   tempel seluruh isi `supabase/migrations/0001_init.sql`, Run.
   (Atau: `supabase link --project-ref <ref>` lalu `supabase db push`.)

4. **Buat user login** — butuh `service_role` key (*Project Settings → API,
   rahasia, jangan commit*):

   ```bash
   SUPABASE_URL=https://<ref>.supabase.co \
   SUPABASE_SERVICE_ROLE=<service-role-key> \
   node scripts/create-users.mjs
   ```

   Hasilnya:

   | Akun | Login | Password default |
   |---|---|---|
   | Outlet BT01–BT30 | `bt01@outlet.internal` … `bt30@outlet.internal` (di form isi Outlet ID `BT01`…`BT30`) | `outlet01` |
   | Superadmin | — (di form isi password saja) | `admin01` |

   Nama outlet: `Beauty 01` … `Beauty 30`.

   Ganti password produksi lewat env `OUTLET_PASSWORD` / `ADMIN_PASSWORD`
   saat menjalankan script, atau ubah di *Authentication → Users*.

5. **Jalankan app**: `pnpm dev` → http://localhost:3000

## Model data

- `public.outlets` — master outlet (id text seperti `BT01`, nama).
- `public.transactions` — laporan void/refund. Path foto disimpan di
  `bukti_*_path`. Kolom `status` (`draft`/`complete`) dihitung **trigger
  server** dari kelengkapan bukti — client tidak bisa memalsukan.
- `public.transaction_logs` — audit trail create/update/delete (PRD §5),
  diisi trigger `record_transaction_log()`, aktor dari JWT.
- Storage bucket `proofs` (private): `proofs/<OUTLET_ID>/<TX_ID>/<slot>.<ext>`.
  RLS storage membatasi tiap outlet ke folder-nya sendiri.

## Keamanan (PRD §4.1, §5, §7)

- Password di-hash Supabase Auth (bcrypt), tidak pernah menyentuh DB app.
- RLS: outlet hanya lihat/tulis transaksi miliknya
  (`outlet_id = jwt.claims.outletId`); superadmin (`jwt.claims.isAdmin`)
  lihat semua. `outlet_id` dikunci trigger saat update.
- Rate limit login ditangani Supabase Auth di server.
- Foto private: dibaca lewat **signed URL** berumur 1 jam, bukan public URL.
- Stempel waktu foto = waktu `created_at`/`updated_at` baris + metadata
  upload object Storage (server-side, PRD §4.4). Watermark visual pada foto
  adalah fase 2 (butuh Edge Function + image processing).

## Catatan layanan gratisan (free tier)

- Project Supabase gratis **pause setelah ~7 hari tidak aktif** — buka
  dashboard untuk aktifkan lagi.
- Egress & storage terbatas; foto dikompres sisi kamera (maks 1280px)
  sebelum upload.
