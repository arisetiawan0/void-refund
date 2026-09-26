import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { PencilIcon, Trash2Icon } from "lucide-react"

import { deleteTransaction, getTransaction, proofImageUrl } from "@/lib/db"
import { getSession, logoutOutlet } from "@/lib/auth"
import { formatQty, formatTanggal, formatWaktu } from "@/lib/format"
import { PROOF_SLOTS } from "@/lib/types"
import type { ProofValue, Session, Transaction } from "@/lib/types"
import { AppBar } from "@/components/app-bar"
import { StampBadge } from "@/components/stamp-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/outlet/riwayat/$id")({
  component: DetailPage,
})

/** Slot key -> signed URL foto (dimuat terpisah dari data baris). */
type ProofUrls = Record<string, string | undefined>

function DetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [tx, setTx] = useState<Transaction | null | undefined>(undefined)
  const [urls, setUrls] = useState<ProofUrls>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [zoom, setZoom] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getSession().then((s) => {
      if (cancelled) return
      setSession(s)
      if (!s) {
        navigate({ to: "/login", replace: true })
      }
    })
    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    if (!session) return
    let cancelled = false
    getTransaction(id).then(async (res) => {
      if (cancelled) return
      const loaded: Transaction | null = res ?? null
      setTx(loaded)
      if (loaded) {
        const slotEntries = Object.entries(loaded.proofs) as Array<
          [string, ProofValue | undefined]
        >
        const entries = await Promise.all(
          slotEntries.map(async ([slot, proof]) => {
            const path: string | undefined = proof?.path
            if (!path) return [slot, undefined] as const
            try {
              return [slot, await proofImageUrl(path)] as const
            } catch {
              return [slot, undefined] as const
            }
          })
        )
        // setUrls setelah await — guard unmount dengan flag yang dilihat lint jujur.
        if (!(cancelled as boolean)) setUrls(Object.fromEntries(entries))
      }
    })
    return () => {
      cancelled = true
    }
  }, [id, session])

  if (!session) return null

  async function onDelete() {
    if (!session || !tx) return
    setDeleting(true)
    try {
      await deleteTransaction(tx.id, session.outletId)
      navigate({ to: "/outlet/riwayat" })
    } catch (err) {
      console.error(err)
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  if (tx === undefined) {
    return (
      <>
        <AppBar backTo="/outlet/riwayat" title="Detail laporan" />
        <main className="mx-auto max-w-3xl px-4 pt-8 md:px-6">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="mt-6 h-64 rounded-2xl" />
        </main>
      </>
    )
  }

  if (tx === null) {
    return (
      <>
        <AppBar backTo="/outlet/riwayat" title="Detail laporan" />
        <main className="mx-auto max-w-3xl px-4 pt-10 md:px-6">
          <p className="text-sm text-muted-foreground">
            Laporan tidak ditemukan atau sudah dihapus.
          </p>
        </main>
      </>
    )
  }

  const slots = PROOF_SLOTS.filter(
    (s) => !s.refundOnly || tx.jenis === "refund"
  )

  return (
    <>
      <AppBar
        backTo="/outlet/riwayat"
        title={`Laporan ${tx.jenis}`}
        subtitle={`No. ${tx.id}`}
        outletId={tx.outlet_id}
        onLogout={() => {
          void logoutOutlet()
          navigate({ to: "/login" })
        }}
      />

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-28 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="editorial-heading text-2xl leading-tight">
              {tx.nama_barang}
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {formatTanggal(tx.created_at)} {formatWaktu(tx.created_at)} ·
              revisi {tx.revision}
            </p>
          </div>
          <StampBadge kind={tx.jenis} animate />
        </div>

        <dl className="mt-8">
          {[
            ["Tanggal transaksi", formatTanggal(tx.tanggal)],
            ["Nama kasir", tx.nama_kasir],
            ["MOD yang bertugas", tx.mod_bertugas],
            ["Barcode", tx.barcode],
            ["Qty", `×${formatQty(tx.qty)}`],
            ["Alasan", tx.alasan],
          ].map(([label, value], i) => (
            <div
              key={label}
              className="grid gap-1 py-3.5 sm:grid-cols-[180px_1fr] sm:gap-6"
              style={{
                borderTop:
                  "1px solid color-mix(in oklch, var(--ink) 12%, transparent)",
              }}
            >
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd
                className={
                  "text-sm leading-relaxed " +
                  (i === 4 ? "font-mono" : "") +
                  (i === 5 ? " whitespace-pre-line" : "")
                }
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <section className="mt-8">
          <h2 className="font-heading text-base font-semibold">
            Bukti dokumentasi
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {slots.map((slot) => {
              const proof = Object.prototype.hasOwnProperty.call(
                tx.proofs,
                slot.key
              )
                ? tx.proofs[slot.key]
                : undefined
              const url = Object.prototype.hasOwnProperty.call(urls, slot.key)
                ? urls[slot.key]
                : undefined
              return (
                <figure key={slot.key} className="min-w-0">
                  {proof && url ? (
                    <button
                      type="button"
                      onClick={() => setZoom(url)}
                      className="block aspect-[4/3] w-full overflow-hidden rounded-xl border border-foreground/10 bg-paper-sunk"
                    >
                      <img
                        src={url}
                        alt={slot.label}
                        loading="lazy"
                        className="size-full object-cover transition-transform hover:scale-[1.03]"
                      />
                    </button>
                  ) : proof ? (
                    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-foreground/10 bg-paper-sunk font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                      memuat…
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-foreground/15 bg-paper-sunk font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                      kosong
                    </div>
                  )}
                  <figcaption className="mt-1.5 truncate text-xs text-muted-foreground">
                    {slot.label}
                  </figcaption>
                </figure>
              )
            })}
          </div>
        </section>
      </main>

      {/* Bottom actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-foreground/10 bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <p className="text-xs text-muted-foreground">
            Data bisa diubah. Setiap perubahan dicatat untuk audit HO.
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate({
                  to: "/outlet/laporan/$kind",
                  params: { kind: tx.jenis },
                })
              }
            >
              <PencilIcon data-icon="inline-start" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2Icon data-icon="inline-start" />
              Hapus
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus laporan ini?</DialogTitle>
            <DialogDescription>
              Laporan {tx.jenis} {tx.nama_barang} qty {tx.qty} akan dihapus dari
              register. Riwayat penghapusan tetap tercatat untuk audit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "Menghapus..." : "Ya, hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zoomed proof */}
      <Dialog open={!!zoom} onOpenChange={(open) => !open && setZoom(null)}>
        <DialogContent className="max-w-2xl p-2">
          {zoom ? (
            <img
              src={zoom}
              alt="Bukti foto"
              className="max-h-[75dvh] w-full rounded-xl object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
