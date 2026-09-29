export type ReportKind = "void" | "refund"

export type ProofSlot = {
  /** Stable key, e.g. "layar_kasir". Doubles as the URL field name in the data draft. */
  key: string
  label: string
  description: string
  /** Refund-only slots stay hidden for void reports. */
  refundOnly?: boolean
  /** Void-only slots stay hidden for refund reports. */
  voidOnly?: boolean
}

export const PROOF_SLOTS: ProofSlot[] = [
  {
    key: "bukti_layar_kasir",
    label: "Layar kasir",
    description: "Bukti transaksi sudah di-void di sistem kasir",
    voidOnly: true,
  },
  {
    key: "bukti_barang_void",
    label: "Barang void",
    description: "Foto barang sesuai qty",
    voidOnly: true,
  },
  {
    key: "bukti_struk_customer",
    label: "Struk customer",
    description: "Foto struk asli pelanggan",
  },
  {
    key: "bukti_struk_refund",
    label: "Struk refund (ttd MOD)",
    description: "Struk refund dengan tanda tangan MOD",
    refundOnly: true,
  },
]

/**
 * Bukti pada form: { name, dataUrl } (baru, base64 preview) atau
 * { name, path } (foto lama yang dipertahankan saat edit).
 * Slot kosong tidak ada di ProofMap (key dihapus), bukan nil.
 */
export type ProofValue = { name: string; dataUrl?: string; path?: string }

export type ProofMap = Record<string, ProofValue>

export type Transaction = {
  id: string
  outlet_id: string
  jenis: ReportKind
  tanggal: string // YYYY-MM-DD
  nama_kasir: string
  nama_barang: string
  barcode: string
  qty: number
  alasan: string
  mod_bertugas: string
  /** Harga jual satuan (Rupiah) — wajib di form refund, null untuk void/legacy. */
  harga_jual: number | null
  proofs: ProofMap
  created_at: string // server timestamp
  revision: number
}

export type EditLog = {
  id: string
  transaction_id: string
  action: "create" | "update" | "delete"
  at: string
  by: string
  note?: string
}

export type Session = { outletId: string }
export type AdminSession = { user: "superadmin" }
