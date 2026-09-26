import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { ChevronRightIcon } from "lucide-react"

import { listTransactions } from "@/lib/db"
import { getSession, logoutOutlet, OUTLETS } from "@/lib/auth"
import type { Session } from "@/lib/types"
import { LogoWordmark } from "@/components/logo"
import { RefundIcon, VoidIcon } from "@/components/kind-icons"
import { formatQty, formatTanggal } from "@/lib/format"

export const Route = createFileRoute("/")({ component: Home })

function monthStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function Home() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const outlet = OUTLETS.find((o) => o.id === session?.outletId)
  const [monthUnits, setMonthUnits] = useState<number | null>(null)
  const [monthCount, setMonthCount] = useState<number | null>(null)

  // not logged in -> login page
  useEffect(() => {
    let alive = true
    getSession().then((s) => {
      if (!alive) return
      setSession(s)
      if (!s) {
        navigate({ to: "/login", replace: true })
        return
      }
      listTransactions({ outletId: s.outletId, from: monthStart() })
        .then((txs) => {
          if (!alive) return
          setMonthCount(txs.length)
          setMonthUnits(txs.reduce((sum, t) => sum + t.qty, 0))
        })
        .catch(() => {
          if (alive) {
            setMonthCount(0)
            setMonthUnits(0)
          }
        })
    })
    return () => {
      alive = false
    }
  }, [navigate])

  const today = useMemo(() => formatTanggal(new Date().toISOString()), [])

  if (!session) return null

  return (
    <main className="min-h-[100dvh]">
      <header className="border-b border-foreground/10 bg-paper-sunk/60">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 md:px-6">
          <LogoWordmark />
          <button
            type="button"
            onClick={() => {
              void logoutOutlet()
              navigate({ to: "/login" })
            }}
            className="font-mono text-xs tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-primary"
          >
            Keluar
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-10 pb-24 md:px-6">
        {/* Register head */}
        <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              Outlet
            </p>
            <h1 className="editorial-heading mt-1.5 text-3xl leading-tight">
              {session.outletId}
              <span className="text-muted-foreground">
                {" "}
                / {outlet?.nama ?? "Outlet"}
              </span>
            </h1>
          </div>
          <p className="font-mono text-xs text-muted-foreground">{today}</p>
        </div>

        {/* Month-to-date strip: ledger total line, not a card */}
        <div className="ledger-margin animate-fade-up mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-r-2xl bg-paper-sunk/75 px-5 py-4 [animation-delay:60ms]">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Bulan ini
          </span>
          {monthUnits === null ? (
            <span className="font-mono text-sm text-muted-foreground">
              memuat…
            </span>
          ) : (
            <>
              <span className="font-heading text-xl font-semibold tabular-nums">
                {formatQty(monthUnits)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  unit dilaporkan
                </span>
              </span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {monthCount} laporan
              </span>
            </>
          )}
        </div>

        {/* Kind selection: two ledger entries, not equal cards side by side on mobile they stack */}
        <h2 className="animate-fade-up mt-10 font-heading text-lg font-semibold tracking-tight [animation-delay:100ms]">
          Buat catatan baru
        </h2>
        <p className="animate-fade-up mt-1 text-sm text-muted-foreground [animation-delay:120ms]">
          Pilih jenis transaksi. Form dan kelengkapan bukti menyesuaikan.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/outlet/laporan/$kind",
                params: { kind: "void" },
              })
            }
            className="ledger-surface group/entry animate-fade-up relative flex items-center gap-4 p-5 text-left transition-all [animation-delay:160ms] hover:-translate-y-0.5 hover:border-void/40 hover:shadow-[0_18px_42px_-28px_color-mix(in_oklch,var(--void)_40%,transparent)] active:translate-y-0 active:scale-[0.99] sm:items-stretch"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-void/10 text-void ring-1 ring-void/20 transition-transform group-hover/entry:scale-105">
              <VoidIcon className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-base font-semibold">
                Void
              </span>
              <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                Transaksi dibatalkan di kasir, barang dikembalikan ke rak atau
                gudang.
              </span>
            </span>
            <ChevronRightIcon className="mt-auto size-4 shrink-0 self-center text-muted-foreground transition-transform group-hover/entry:translate-x-0.5 sm:self-center" />
          </button>

          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/outlet/laporan/$kind",
                params: { kind: "refund" },
              })
            }
            className="ledger-surface group/entry animate-fade-up relative flex items-center gap-4 p-5 text-left transition-all [animation-delay:220ms] hover:-translate-y-0.5 hover:border-refund/45 hover:shadow-[0_18px_42px_-28px_color-mix(in_oklch,var(--refund)_40%,transparent)] active:translate-y-0 active:scale-[0.99] sm:items-stretch"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-refund/10 text-refund ring-1 ring-refund/20 transition-transform group-hover/entry:scale-105">
              <RefundIcon className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-base font-semibold">
                Refund
              </span>
              <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                Dana dikembalikan ke pelanggan, wajib struk refund bertanda
                tangan MOD.
              </span>
            </span>
            <ChevronRightIcon className="size-4 shrink-0 self-center text-muted-foreground transition-transform group-hover/entry:translate-x-0.5" />
          </button>
        </div>

        {/* Other quick links */}
        <div className="animate-fade-up mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-foreground/10 pt-5 [animation-delay:260ms]">
          <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            Menu
          </span>
          <Link
            to="/outlet/riwayat"
            className="group inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            Riwayat laporan outlet
            <ChevronRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/outlet/profile"
            className="group inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            Profil &amp; ganti password
            <ChevronRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </main>
  )
}
