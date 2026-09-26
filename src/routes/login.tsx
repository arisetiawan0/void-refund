import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import {
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  ScanLineIcon,
  StoreIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { LogoWordmark } from "@/components/logo"
import { loginOutlet, OUTLETS } from "@/lib/auth"

export const Route = createFileRoute("/login")({ component: LoginPage })

function LoginPage() {
  const navigate = useNavigate()
  const [outletId, setOutletId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await loginOutlet(outletId, password)
    if (res.ok) {
      navigate({ to: "/" })
    } else {
      setError(res.error)
      setBusy(false)
    }
  }

  return (
    <main className="min-h-[100dvh] lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Left: ledger identity panel. Falls to a compact header on mobile. */}
      <section className="ledger-lines relative hidden flex-col justify-between overflow-hidden border-r border-destructive/15 bg-paper-sunk p-10 lg:flex">
        <div className="pointer-events-none absolute -right-20 -bottom-16 opacity-[0.05]">
          <ScanLineIcon className="size-72" strokeWidth={1} />
        </div>
        <LogoWordmark />
        <div className="animate-fade-up max-w-md">
          <h1 className="editorial-heading text-4xl leading-[1.08] text-balance">
            Tiap void &amp; refund tercatat, terstempel, siap audit.
          </h1>
          <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
            Buku register digital untuk transaksi void &amp; refund outlet.
            Setiap laporan wajib lengkap dengan bukti foto sebelum bisa
            diverifikasi oleh HO.
          </p>
          <ul className="mt-6 grid gap-2 text-sm text-muted-foreground">
            {[
              "Stempel waktu server di setiap unggahan foto",
              "Bukti wajib lengkap sebelum laporan terkirim",
              "Jejak audit untuk setiap perubahan data",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="inline-block size-1.5 shrink-0 rounded-full bg-primary/60"
                />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          <span
            aria-hidden="true"
            className="inline-block size-1.5 shrink-0 rounded-full bg-primary/50"
          />
          {OUTLETS.length} outlet terdaftar · {OUTLETS[0].id}–
          {OUTLETS[OUTLETS.length - 1].id}
        </p>
      </section>

      {/* Right: the form */}
      <section className="flex min-h-[100dvh] flex-col justify-center px-5 py-12 sm:px-10 lg:min-h-0 lg:px-16">
        <div className="animate-fade-up mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <LogoWordmark />
            <div className="mt-8 h-px bg-foreground/10" />
          </div>

          <div className="mt-10 lg:mt-0">
            <span className="stamp-mark stamp-mark--tilt inline-flex px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">
              Masuk
            </span>
            <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight">
              Masuk akun outlet
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Satu akun per outlet, dipakai bersama oleh tim shift.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8" noValidate>
            <Field>
              <FieldLabel htmlFor="outlet-id">Outlet ID</FieldLabel>
              <Input
                id="outlet-id"
                name="outletId"
                autoComplete="username"
                placeholder="BT01"
                value={outletId}
                onChange={(e) => setOutletId(e.target.value.toUpperCase())}
                aria-invalid={!!error || undefined}
                className="font-mono uppercase"
              />
              <FieldDescription>
                Kode outlet dari HO, contoh BT01 … BT30.
              </FieldDescription>
            </Field>

            <Field className="mt-5">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error || undefined}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Lihat password"
                  }
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
              {error ? (
                <p
                  role="alert"
                  className="animate-fade-up text-sm font-normal text-destructive"
                >
                  {error}
                </p>
              ) : (
                <FieldDescription>
                  Dibagikan oleh HO. Hubungi admin jika lupa.
                </FieldDescription>
              )}
            </Field>

            <Button
              type="submit"
              size="lg"
              disabled={busy || !outletId.trim() || !password}
              className="mt-8 w-full"
            >
              {busy ? "Memeriksa..." : "Masuk sebagai Outlet"}
            </Button>
          </form>

          <div className="my-8 flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-foreground/10" />
            atau
            <span className="h-px flex-1 bg-foreground/10" />
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate({ to: "/admin/login" })}
          >
            <KeyRoundIcon data-icon="inline-start" />
            Portal Superadmin HO
          </Button>

          <p className="mt-10 flex items-center gap-2 text-xs leading-relaxed text-muted-foreground">
            <StoreIcon className="size-3.5 shrink-0" />
            Belum terdaftar sebagai outlet? Minta HO menambahkan akun outlet
            Anda lewat portal superadmin.
          </p>
        </div>
      </section>
    </main>
  )
}
