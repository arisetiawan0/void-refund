import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { ChevronRightIcon, ImageIcon } from "lucide-react"

import { listTransactions } from "@/lib/db"
import { getSession, logoutOutlet, OUTLETS } from "@/lib/auth"
import { formatQty, formatTanggal, formatWaktu } from "@/lib/format"
import type { Session, Transaction } from "@/lib/types"
import { AppBar } from "@/components/app-bar"
import { StampBadge } from "@/components/stamp-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "cn"

export const Route = createFileRoute("/outlet/riwayat/")({
  component: RiwayatPage,
})

function RiwayatPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const outlet = OUTLETS.find((o) => o.id === session?.outletId)
  const [txs, setTxs] = useState<Transaction[] | null>(null)

  useEffect(() => {
    let alive = true
    getSession().then((s) => {
      if (!alive) return
      setSession(s)
      if (!s) {
        navigate({ to: "/login", replace: true })
        return
      }
      listTransactions({ outletId: s.outletId })
        .then((res) => {
          if (alive) setTxs(res)
        })
        .catch((err) => {
          console.error(err)
          if (alive) setTxs([])
        })
    })
    return () => {
      alive = false
    }
  }, [navigate])

  if (!session) return null

  return (
    <>
      <AppBar
        backTo="/"
        title="Riwayat laporan"
        subtitle={`${session.outletId} / ${outlet?.nama ?? ""}`}
        outletId={session.outletId}
        onLogout={() => {
          void logoutOutlet()
          navigate({ to: "/login" })
        }}
      />

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-24 md:px-6">
        <h1 className="editorial-heading text-2xl leading-tight">
          Register outlet {outlet?.id ?? session.outletId}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Semua laporan void &amp; refund outlet ini. Ketuk untuk melihat
          detail, mengedit, atau menghapus.
        </p>

        {txs === null ? (
          <div className="mt-6 grid gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : txs.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-foreground/20 bg-paper-sunk px-6 py-14 text-center">
            <p className="font-heading text-base font-semibold">
              Register masih kosong
            </p>
            <p className="mx-auto mt-1 max-w-[38ch] text-sm text-muted-foreground">
              Laporan void atau refund pertama Anda akan tercatat di sini
              setelah dikirim.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Buat catatan baru
            </Link>
          </div>
        ) : (
          <ol className="mt-6">
            {txs.map((tx, i) => (
              <li key={tx.id}>
                <Link
                  to="/outlet/riwayat/$id"
                  params={{ id: tx.id }}
                  className={cn(
                    "group flex items-center gap-4 py-4 pr-2 transition-colors hover:bg-primary/[0.04] focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                    i > 0 && "border-t border-foreground/10"
                  )}
                >
                  <StampBadge kind={tx.jenis} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate font-medium">
                        {tx.nama_barang}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        ×{formatQty(tx.qty)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {formatTanggal(tx.created_at)}{" "}
                      {formatWaktu(tx.created_at)}
                      {" · "}
                      {tx.nama_kasir}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                    <ImageIcon className="size-3.5" />
                    {Object.values(tx.proofs).length}
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
    </>
  )
}
