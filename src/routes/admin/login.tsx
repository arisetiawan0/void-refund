import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { EyeIcon, EyeOffIcon, ShieldIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { LogoWordmark } from "@/components/logo"
import { loginAdmin } from "@/lib/auth"

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
})

function AdminLoginPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await loginAdmin(password)
    if (res.ok) {
      navigate({ to: "/admin" })
    } else {
      setError(res.error)
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-paper-sunk px-5 py-12">
      <div className="w-full max-w-sm">
        <LogoWordmark />
        <div className="mt-8 rounded-2xl border border-foreground/12 bg-card p-6 shadow-[0_24px_60px_-40px_color-mix(in_oklch,var(--ink)_60%,transparent)]">
          <span className="stamp-mark stamp-mark--tilt inline-flex px-2 py-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
            Head Office
          </span>
          <h1 className="mt-4 font-heading text-xl font-semibold tracking-tight">
            Portal Superadmin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gabungan laporan void &amp; refund seluruh outlet.
          </p>

          <form onSubmit={onSubmit} className="mt-6" noValidate>
            <Field>
              <FieldLabel htmlFor="admin-password">
                Password superadmin
              </FieldLabel>
              <div className="relative">
                <Input
                  id="admin-password"
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
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-r-xl"
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
                  className="text-sm font-normal text-destructive"
                >
                  {error}
                </p>
              ) : (
                <FieldDescription>Demo: admin01</FieldDescription>
              )}
            </Field>
            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full"
              disabled={busy || !password}
            >
              {busy ? "Memeriksa..." : "Buka dashboard"}
            </Button>
          </form>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldIcon className="size-3.5" />
          Portal terpisah dari akun outlet.
        </p>
      </div>
    </main>
  )
}
