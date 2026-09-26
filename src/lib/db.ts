import { supabase } from "./supabase"
import { isAuthError } from "./auth"
import type { ProofColumn, ProofSlotKey, TxFilter } from "./backend"
import { PROOF_COLUMNS, proofColumn } from "./backend"
import type {
  EditLog,
  ProofMap,
  ProofValue,
  ReportKind,
  Transaction,
} from "./types"

/**
 * Implementasi Supabase untuk semua akses data:
 * - transactions + transaction_logs di Postgres (RLS membatasi per outlet).
 * - Foto bukti di Storage bucket "proofs" (private) → dibaca via signed URL.
 * - Nama file bukti dari server = "<slot>.<ext>" dengan path
 *   "<outlet>/<tx_id>/<slot>" — timeless, identitas dari konteks transaksi.
 *   Stempel waktu server ada di `created_at`/`updated_at` baris transaksi dan
 *   metadata object Storage (created_at otomatis), bukan gambar watermark
 *   ter-cetak — PRD §4.4 minta watermark cetak; belum diimplementasi (fase 2).
 */

const BUCKET = "proofs"
const SIGN_TTL = 60 * 60 // detik, umur URL foto saat dibuka

type TxRow = {
  id: string
  outlet_id: string
  jenis: string
  tanggal: string
  nama_kasir: string
  nama_barang: string
  barcode: string
  qty: number
  alasan: string
  mod_bertugas: string
  bukti_layar_kasir_path: string | null
  bukti_barang_void_path: string | null
  bukti_struk_customer_path: string | null
  bukti_struk_refund_path: string | null
  revision: number
  created_at: string
}

export class BackendError extends Error {}

function bail(error: { message: string } | null): never {
  const msg = error?.message ?? "Kesalahan tidak diketahui"
  if (isAuthError(msg)) {
    throw new BackendError(
      "Sesi berakhir. Muat ulang halaman lalu login kembali."
    )
  }
  throw new BackendError(msg)
}

function rowToTx(row: TxRow): Transaction {
  const proofs: ProofMap = {}
  for (const slot of Object.keys(PROOF_COLUMNS) as ProofSlotKey[]) {
    const p: string | null = row[PROOF_COLUMNS[slot]]
    if (p) proofs[slot] = { name: fileNameOf(p), path: p }
  }
  return {
    id: row.id,
    outlet_id: row.outlet_id,
    jenis: row.jenis as ReportKind,
    tanggal: row.tanggal,
    nama_kasir: row.nama_kasir,
    nama_barang: row.nama_barang,
    barcode: row.barcode,
    qty: row.qty,
    alasan: row.alasan,
    mod_bertugas: row.mod_bertugas,
    proofs,
    created_at: row.created_at,
    revision: row.revision,
  }
}

function fileNameOf(path: string): string {
  const base = path.split("/").pop() ?? path
  return decodeURIComponent(base)
}

/** Signed URL untuk membaca foto private di bucket proofs. */
export async function proofImageUrl(
  path: string,
  ttlSeconds: number = SIGN_TTL
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, ttlSeconds)
  if (error) bail(error)
  // Supabase typing mengembalikan data non-null walau error; jaga-jaga saja.
  return data.signedUrl
}

/**
 * Kompres foto bukti di browser sebelum upload: scale down ke maks 1280px
 * sisi terpanjang dan encode ulang ke JPEG kualitas ~0.72 (file foto kamera
 * HP biasanya 3–8 MB; hasil kompres tipikal 150–400 KB). Bitmap kecil
 * (<200 KB) atau bukan foto dilewatkan apa adanya. GIF dibiarkan (animasi
 * tidak selamat dari canvas), PNG diberi TTL kompresi yang sama via JPEG.
 */
async function compressProof(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const type = blob.type || "image/jpeg"

  // Lewati yang jelas tidak perlu kompres: kecil, atau format non-foto/animasi
  if (blob.size < 200_000 || /gif|svg/i.test(type)) return blob

  try {
    const img = await createImageBitmap(blob)
    const MAX = 1280
    const scale = Math.min(1, MAX / Math.max(img.width, img.height))
    if (scale === 1 && /jpe?g/i.test(type) && blob.size < 500_000) {
      img.close()
      return blob // sudah JPEG kecil, biarkan apa adanya
    }
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      img.close()
      return blob
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    img.close()
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.72)
    )
    // Pakai hasil kompres hanya kalau memang lebih kecil
    return out && out.size < blob.size ? out : blob
  } catch {
    // Browser/bitmap gagal decode (mis. HEIC) → upload apa adanya
    return blob
  }
}

async function uploadProof(
  outletId: string,
  txId: string,
  slot: string,
  proof: ProofValue
): Promise<string> {
  let blob: Blob
  try {
    blob = await compressProof(proof.dataUrl ?? "")
  } catch {
    blob = await fetch(proof.dataUrl ?? "").then((r) => r.blob())
  }
  // Ext/path tetap konsisten: hasil kompres selalu JPEG kecuali file asli
  // berformat lain yang lolos tanpa kompres.
  const ext =
    blob.type && /png/i.test(blob.type)
      ? "png"
      : blob.type && /gif/i.test(blob.type)
        ? "gif"
        : blob.type && /webp/i.test(blob.type)
          ? "webp"
          : blob.type && /svg/i.test(blob.type)
            ? "svg"
            : "jpg"
  const path = `${outletId}/${txId}/${slot}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: true,
      cacheControl: "3600",
    })
  if (error) bail(error)
  return path
}

/** dataURL (base64) yang tertahan di ProofMap di-upload ke Storage di sini. */
async function uploadProofs(
  outletId: string,
  txId: string,
  proofs: ProofMap
): Promise<Partial<Record<ProofColumn, string>>> {
  const out: Partial<Record<ProofColumn, string>> = {}
  const entries = Object.entries(proofs) as Array<
    [string, ProofValue | undefined]
  >
  for (const [slot, value] of entries) {
    if (!value) continue
    const column: ProofColumn | undefined = proofColumn(slot)
    if (!column) continue
    if ("path" in value && value.path) {
      out[column] = value.path // foto lama yang dipertahankan saat edit
    } else if (value.dataUrl) {
      out[column] = await uploadProof(outletId, txId, slot, value)
    }
  }
  return out
}

export async function listTransactions(
  filter?: TxFilter
): Promise<Transaction[]> {
  let q = supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
  if (filter?.outletId) q = q.eq("outlet_id", filter.outletId)
  if (filter?.jenis && filter.jenis !== "all")
    q = q.eq("jenis", filter.jenis)
  if (filter?.from) q = q.gte("tanggal", filter.from)
  if (filter?.to) q = q.lte("tanggal", filter.to)

  const { data, error } = await q
  if (error) bail(error)
  return (data as TxRow[]).map(rowToTx)
}
export async function getTransaction(
  id: string
): Promise<Transaction | undefined> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) bail(error)
  return data ? rowToTx(data as TxRow) : undefined
}

export async function createTransaction(tx: {
  outlet_id: string
  jenis: ReportKind
  tanggal: string
  nama_kasir: string
  nama_barang: string
  barcode: string
  qty: number
  alasan: string
  mod_bertugas: string
  proofs: ProofMap
}): Promise<Transaction> {
  const { proofs, ...fields } = tx
  const { data, error } = await supabase
    .from("transactions")
    .insert(fields)
    .select("*")
    .single()
  if (error) bail(error)
  const row = data as TxRow

  const paths = await uploadProofs(tx.outlet_id, row.id, proofs)
  if (Object.keys(paths).length) {
    const { data: upd, error: updErr } = await supabase
      .from("transactions")
      .update(paths)
      .eq("id", row.id)
      .select("*")
      .single()
    if (updErr) bail(updErr)
    return rowToTx(upd as TxRow)
  }
  return rowToTx(row)
}

export async function updateTransaction(
  id: string,
  patch: {
    tanggal?: string
    nama_kasir?: string
    nama_barang?: string
    barcode?: string
    qty?: number
    alasan?: string
    mod_bertugas?: string
    proofs?: ProofMap
  },
  _sessionOutletId: string
): Promise<Transaction> {
  const existing = await getTransaction(id)
  if (!existing) throw new BackendError("Transaksi tidak ditemukan")

  const { proofs, ...fields } = patch
  const payload: Record<string, unknown> = { ...fields }
  if (proofs) {
    // path lama yang tidak dikirim lagi berarti slot dikosongkan → null
    const next = await uploadProofs(existing.outlet_id, id, proofs)
    for (const column of Object.values(PROOF_COLUMNS)) {
      payload[column] = next[column] ?? null
    }
  }

  const { data, error } = await supabase
    .from("transactions")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()
  if (error) bail(error)
  return rowToTx(data as TxRow)
}

export async function deleteTransaction(
  id: string,
  _sessionOutletId: string
): Promise<void> {
  // Ambil path foto dulu, hapus bersama objek Storage.
  const existing = await getTransaction(id)
  const objectPaths: string[] = []
  if (existing) {
    for (const slot of Object.keys(PROOF_COLUMNS)) {
      const p = (existing.proofs[slot] as { path?: string } | undefined)?.path
      if (p) objectPaths.push(p)
    }
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id)
  if (error) bail(error)

  if (objectPaths.length) {
    const { error: rmErr } = await supabase.storage
      .from(BUCKET)
      .remove(objectPaths)
    if (rmErr) console.warn("Gagal hapus sebagian foto bukti:", rmErr.message)
  }
}

export async function listEditLogs(): Promise<EditLog[]> {
  const { data, error } = await supabase
    .from("transaction_logs")
    .select("*")
    .order("at", { ascending: false })
    .limit(200)
  if (error) bail(error)
  const rows = data as Array<{
    id: string
    transaction_id: string | null
    action: string
    at: string
    by: string
    note: string | null
  }>
  return rows.map((l) => ({
    id: l.id,
    transaction_id: l.transaction_id ?? "",
    action: l.action as EditLog["action"],
    at: l.at,
    by: l.by,
    note: l.note ?? undefined,
  }))
}
