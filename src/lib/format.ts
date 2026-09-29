export function formatTanggal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatWaktu(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

export function tanggalHariIni(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}

export function formatQty(n: number): string {
  return n.toLocaleString("id-ID")
}

export function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`
}

export function csvEscape(value: string | number): string {
  const s = String(value)
  if (/[",\n;]/.test(s)) return `"${s.replaceAll('"', '""')}"`
  return s
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(";")).join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
