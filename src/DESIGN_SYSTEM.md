# Design system — Catat Void

Identitas antarmuka: **register buku besar digital**. Permukaan terasa seperti kertas arsip; teks seperti tinta; VOID dan REFUND menjadi cap yang mudah dibedakan. Pertahankan kesan operasional, teliti, dan siap audit. Hindari gradien mencolok, panel dekoratif tanpa fungsi, atau warna status lain.

## Prinsip

- Gunakan satu hirarki visual yang jelas: judul editorial, isi sans yang terbaca, metadata monospasi.
- Pakai garis tipis dan jarak untuk memisahkan entri. Simpan card/elevasi untuk elemen yang benar-benar interaktif atau butuh fokus.
- Gunakan warna bersama label/ikon: merah untuk VOID dan aksi destruktif; biru pena untuk REFUND. Jangan menyampaikan status lewat warna saja.
- Prioritaskan layout responsif, fokus keyboard yang terlihat, dan hormati `prefers-reduced-motion`.

## Token

Token didefinisikan di `src/styles.css` dan diekspos sebagai utilitas Tailwind melalui `@theme inline`.

| Peran           | Token/utilitas                           | Penggunaan                                                       |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| Latar kertas    | `bg-background`                          | Latar utama semua halaman                                        |
| Kertas sekunder | `bg-paper-sunk`                          | Header, blok metadata, area sekunder                             |
| Permukaan       | `bg-card`, `.ledger-surface`             | Panel interaktif/form                                            |
| Tinta           | `text-foreground`, `text-ink`            | Isi utama                                                        |
| Aksi/VOID       | `text-primary`, `text-void`              | Aksi utama dan status VOID                                       |
| REFUND          | `text-refund`, `text-pen-blue`           | Status REFUND                                                    |
| Garis           | `border-border`, `border-foreground/10`  | Pemisah lembut                                                   |
| Tipografi       | `font-heading`, `font-sans`, `font-mono` | Editorial, isi, metadata/kode                                    |
| Radius          | `--radius` dan turunannya                | Sudut komponen; pilih `rounded-xl`/`rounded-2xl` sesuai hierarki |

Tema gelap memakai token semantik yang sama. Jangan hardcode warna hex atau nilai status langsung di halaman.

## Pola komponen

- **Button**: gunakan `Button` dan variant yang tersedia (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`). Jangan meniru tombol dengan elemen div.
- **Form**: gunakan `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `Input`, dan `Textarea`. Error memakai `aria-invalid` dan pesan inline.
- **Status transaksi**: gunakan `StampBadge` dengan `kind="void" | "refund"`; jangan gunakan Badge umum untuk cap transaksi.
- **Surface**: pilih `Card` untuk konten terstruktur; `.ledger-surface` untuk panel register tematik yang custom.
- **Header**: gunakan `AppBar` untuk halaman internal. Logo via `LogoWordmark` atau `LogoMark`.
- **Daftar audit/riwayat**: utamakan daftar dengan pemisah horizontal, angka monospasi/tabular, dan cap/status pada setiap transaksi.

## Tipografi dan layout

- Judul halaman: `editorial-heading` dengan ukuran sesuai konteks (`text-2xl` sampai `text-4xl`).
- Isi: `font-sans`, `text-sm`/`text-base`, line-height nyaman; deskripsi dibatasi sekitar 65 karakter.
- Metadata, ID outlet, barcode, tanggal, qty: `font-mono`; gunakan `tabular-nums` untuk angka.
- Konten utama: max-width sekitar `max-w-3xl`; dashboard admin boleh melebar. Padding halaman minimum `px-4`, naikkan di breakpoint menengah.
- Gunakan `.ledger-lines` untuk bidang besar bergaya kertas, `.ledger-margin` untuk penekanan register, `.stamp-mark` untuk label cap.

## Interaksi dan aksesibilitas

- Semua kontrol interaktif harus punya state hover, active, disabled, dan `focus-visible`.
- Ikuti reduced-motion; jangan animasikan layout dengan `top`, `left`, `width`, atau `height`.
- Gunakan elemen semantik, label form terhubung ke kontrol, deskripsi/error yang jelas, serta teks alternatif pada gambar bukti.
- Bahasa dokumen aplikasi adalah Indonesia (`lang="id"`).
