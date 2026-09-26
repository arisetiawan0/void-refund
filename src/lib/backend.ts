import type { ReportKind } from "./types"

/**
 * Semua jalur data aplikasi melewati antarmuka ini. Implementasinya kini
 * langsung ke Supabase (database + storage + auth); tidak ada mock lagi.
 */

export type TxFilter = {
  outletId?: string
  jenis?: ReportKind | "all"
  from?: string
  to?: string
}

export type OutletRow = {
  id: string
  nama: string
}

export const PROOF_COLUMNS = {  bukti_layar_kasir: "bukti_layar_kasir_path",
  bukti_barang_void: "bukti_barang_void_path",
  bukti_struk_customer: "bukti_struk_customer_path",
  bukti_struk_refund: "bukti_struk_refund_path",
} as const

export type ProofSlotKey = keyof typeof PROOF_COLUMNS

export type ProofColumn = (typeof PROOF_COLUMNS)[ProofSlotKey]

export function proofColumn(slot: string): ProofColumn | undefined {
  return PROOF_COLUMNS[slot as ProofSlotKey]
}

export type TxInput = {
  outlet_id: string
  jenis: ReportKind
  tanggal: string
  nama_kasir: string
  nama_barang: string
  barcode: string
  qty: number
  alasan: string
  mod_bertugas: string
}
