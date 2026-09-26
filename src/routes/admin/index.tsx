import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { DownloadIcon } from "lucide-react"

import { listTransactions, listEditLogs, proofImageUrl } from "@/lib/db"
import { getAdminSession, logoutAdmin, OUTLETS } from "@/lib/auth"
import {
  downloadCsv,
  formatQty,
  formatTanggal,
  formatWaktu,
} from "@/lib/format"
import type { EditLog, ReportKind, Transaction } from "@/lib/types"
import { AppBar } from "@/components/app-bar"
import { StampBadge } from "@/components/stamp-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "cn"

export const Route = createFileRoute("/admin/")({ component: AdminDashboard })

type JenisFilter = ReportKind | "all"

function firstDayOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function AdminDashboard() {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState<boolean | null>(null)
  const [from, setFrom] = useState(firstDayOfMonth())
  const [to, setTo] = useState(() => {
    const d = new Date()
    const off = d.getTimezoneOffset()
    return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
  })
  const [outletFilter, setOutletFilter] = useState<string>("all")
  const [jenisFilter, setJenisFilter] = useState<JenisFilter>("all")
  const [txs, setTxs] = useState<Transaction[] | null>(null)
  const [logs, setLogs] = useState<EditLog[]>([])
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    let alive = true
    getAdminSession().then((s) => {
      if (!alive) return
      setAdmin(!!s)
      if (!s) navigate({ to: "/admin/login", replace: true })
    })
    return () => {
      alive = false
    }
  }, [navigate])

  useEffect(() => {
    if (!admin) return
    let alive = true
    const load = () =>
      Promise.all([listEditLogs(), listTransactions()]).then(([l, all]) => {
        if (!alive) return
        setLogs(l)
        setTxs(all)
      })
    load()
    // Refresh saat tab kembali fokus, agar laporan baru dari outlet terlihat.
    const onFocus = () => {
      if (document.visibilityState === "visible") load()
    }
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      alive = false
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [admin])

  const filtered = useMemo(() => {
    if (!txs) return null
    return txs
      .filter((t) =>
        outletFilter === "all" ? true : t.outlet_id === outletFilter
      )
      .filter((t) => (jenisFilter === "all" ? true : t.jenis === jenisFilter))
      .filter((t) => (from ? t.tanggal >= from : true))
      .filter((t) => (to ? t.tanggal <= to : true))
  }, [txs, outletFilter, jenisFilter, from, to])

  const summary = useMemo(() => {
    if (!filtered) return null
    const perOutlet = new Map<
      string,
      { void: number; refund: number; count: number }
    >()
    for (const t of filtered) {
      const e = perOutlet.get(t.outlet_id) ?? { void: 0, refund: 0, count: 0 }
      if (t.jenis === "void") e.void += t.qty
      else e.refund += t.qty
      e.count += 1
      perOutlet.set(t.outlet_id, e)
    }
    return [...perOutlet.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  async function exportCsv() {
    if (!filtered?.length) return
    const header = [
      "ID",
      "Outlet",
      "Jenis",
      "Tanggal",
      "Kasir",
      "Barang",
      "Barcode",
      "Qty",
      "Alasan",
      "MOD",
      "Dibuat",
      "Revisi",
      "Link Foto (berlaku 1 jam)",
    ]
    const rows: (string | number)[][] = []
    for (const t of filtered) {
      const photoLinks: string[] = []
      for (const proof of Object.values(t.proofs)) {
        const path = (proof as { path?: string } | undefined)?.path
        if (!path) continue
        try {
          photoLinks.push(await proofImageUrl(path, 3600))
        } catch {
          photoLinks.push("(gagal membuat link)")
        }
      }
      rows.push([
        t.id,
        t.outlet_id,
        t.jenis,
        t.tanggal,
        t.nama_kasir,
        t.nama_barang,
        t.barcode,
        t.qty,
        t.alasan,
        t.mod_bertugas,
        t.created_at,
        t.revision,
        photoLinks.join("\n"),
      ])
    }
    downloadCsv(`laporan-void-refund_${from || "awal"}_${to || "akhir"}.csv`, [
      header,
      ...rows,
    ])
  }

  if (admin === null) return null

  return (
    <>
      <AppBar
        backTo="/"
        title="Dashboard Superadmin"
        subtitle="Laporan gabungan seluruh outlet"
        onLogout={() => {
          void logoutAdmin()
          navigate({ to: "/admin/login" })
        }}
      />

      <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 md:px-6">
        {/* Filter period */}
        <section className="ledger-surface p-4 sm:p-5">
          <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <div className="grid gap-1.5">
              <Label htmlFor="from" className="text-xs text-muted-foreground">
                Tanggal awal
              </Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="to" className="text-xs text-muted-foreground">
                Tanggal akhir
              </Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Outlet</Label>
              <Select
                value={outletFilter}
                onValueChange={(v) => setOutletFilter(v ?? "all")}
              >
                <SelectTrigger className="w-full font-mono">
                  <SelectValue>
                    {outletFilter === "all" ? "Semua outlet" : outletFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua outlet</SelectItem>
                  {OUTLETS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Jenis</Label>
              <Select
                value={jenisFilter}
                onValueChange={(v) => setJenisFilter(v ?? "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {jenisFilter === "all"
                      ? "Semua jenis"
                      : jenisFilter === "void"
                        ? "Void"
                        : "Refund"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua jenis</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="lg"
              onClick={() => void exportCsv()}
              disabled={!filtered?.length}
              className="w-full lg:w-auto"
            >
              <DownloadIcon data-icon="inline-start" />
              Download CSV
            </Button>
          </div>
        </section>

        {/* Summary per outlet: plain stat blocks separated by rules, not cards */}
        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="editorial-heading text-lg">Ringkasan per outlet</h2>
            <p className="font-mono text-xs whitespace-nowrap text-muted-foreground">
              {filtered ? `${filtered.length} transaksi` : "..."}
            </p>
          </div>
          {summary === null ? (
            <div className="mt-4 flex gap-8">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-40 rounded-xl" />
              ))}
            </div>
          ) : summary.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-foreground/20 bg-paper-sunk px-6 py-10 text-center text-sm text-muted-foreground">
              Tidak ada transaksi pada filter ini.
            </p>
          ) : (
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              {summary.map(([outletId, s]) => (
                <div
                  key={outletId}
                  className="border-l-2 border-foreground/15 pl-4"
                >
                  <p className="font-mono text-sm font-semibold tracking-[0.12em]">
                    {outletId}
                  </p>
                  <p className="mt-2 font-heading text-3xl font-semibold tabular-nums">
                    {formatQty(s.void + s.refund)}
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                      unit
                    </span>
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs text-muted-foreground">
                    <span>
                      void{" "}
                      <span className="text-primary">{formatQty(s.void)}</span>
                    </span>
                    <span>
                      refund{" "}
                      <span className="text-[--pen-blue]">
                        {formatQty(s.refund)}
                      </span>
                    </span>
                    <span>{s.count} laporan</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Ledger table */}
        <section className="mt-12">
          <h2 className="editorial-heading text-lg">Rincian transaksi</h2>
          {filtered === null ? (
            <Skeleton className="mt-4 h-72 rounded-2xl" />
          ) : filtered.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-foreground/20 bg-paper-sunk px-6 py-10 text-center text-sm text-muted-foreground">
              Tidak ada transaksi pada filter ini.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-foreground/12 bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Jenis</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Barang</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Kasir</TableHead>
                    <TableHead>MOD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <StampBadge kind={t.jenis} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {t.outlet_id}
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {formatTanggal(t.tanggal)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {t.nama_barang}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatQty(t.qty)}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-muted-foreground">
                        {t.nama_kasir}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-muted-foreground">
                        {t.mod_bertugas}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Audit trail (PRD §5: log riwayat perubahan) */}
        <section className="mt-12">
          <button
            type="button"
            onClick={() => setShowLogs((s) => !s)}
            className="flex w-full items-center justify-between border-t border-foreground/10 pt-5 text-left"
            aria-expanded={showLogs}
          >
            <span className="font-heading text-lg font-semibold tracking-tight">
              Jejak audit
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {logs.length} entri {showLogs ? "▲" : "▼"} (200 terbaru)
            </span>
          </button>
          {showLogs ? (
            <ul className="mt-4 grid gap-2">
              {logs.slice(0, 20).map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-xl bg-paper-sunk px-3.5 py-2.5 font-mono text-xs"
                >
                  <span
                    className={cn(
                      "w-14 uppercase",
                      l.action === "delete" && "text-primary",
                      l.action === "create" && "text-[--pen-blue]",
                      l.action === "update" && "text-foreground/70"
                    )}
                  >
                    {l.action}
                  </span>
                  <span className="max-w-[220px] truncate text-muted-foreground">
                    {l.transaction_id}
                  </span>
                  <span className="text-muted-foreground">oleh {l.by}</span>
                  {l.note ? (
                    <span className="text-muted-foreground/70">{l.note}</span>
                  ) : null}
                  <span className="ml-auto text-muted-foreground">
                    {formatTanggal(l.at)} {formatWaktu(l.at)}
                  </span>
                </li>
              ))}
              {logs.length === 0 ? (
                <li className="rounded-xl bg-paper-sunk px-3.5 py-3 text-xs text-muted-foreground">
                  Belum ada aktivitas.
                </li>
              ) : null}
            </ul>
          ) : null}
        </section>
      </main>
    </>
  )
}
