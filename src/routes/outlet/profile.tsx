import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { AppBar } from "@/components/app-bar"
import { changeOutletPassword, getSession, logoutOutlet } from "@/lib/auth"

export const Route = createFileRoute("/outlet/profile")({
  component: ProfilePage,
})

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = "current-password",
}: {
  id: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Sembunyikan password" : "Lihat password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {show ? (
          <EyeOffIcon className="size-4" />
        ) : (
          <EyeIcon className="size-4" />
        )}
      </button>
    </div>
  )
}

function ProfilePage() {
  const navigate = useNavigate()
  const [outletId, setOutletId] = useState<string | null>(null)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    getSession().then((s) => {
      if (!alive) return
      if (!s) {
        navigate({ to: "/login", replace: true })
        return
      }
      setOutletId(s.outletId)
    })
    return () => {
      alive = false
    }
  }, [navigate])

  const canSubmit =
    !!current && next.length >= 6 && next === confirm && !busy

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (next !== confirm) {
      setError("Password baru dan konfirmasi tidak sama.")
      return
    }
    if (next.length < 6) {
      setError("Password baru minimal 6 karakter.")
      return
    }
    setBusy(true)
    const res = await changeOutletPassword(current, next)
    setBusy(false)
    if (res.ok) {
      setSuccess(true)
      setCurrent("")
      setNext("")
      setConfirm("")
    } else {
      setError(res.error)
    }
  }

  return (
    <main className="min-h-[100dvh]">
      <AppBar
        backTo="/"
        title="Profil Outlet"
        subtitle={outletId ?? ""}
        onLogout={() => {
          void logoutOutlet()
          navigate({ to: "/login" })
        }}
      />

      <div className="mx-auto max-w-md px-4 pt-10 pb-24 md:px-6">
        <h1 className="editorial-heading text-2xl leading-tight">
          Ganti password
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Password dipakai bersama oleh tim shift outlet. Setelah diganti,
          sampaikan password baru ke seluruh tim.
        </p>

        <form onSubmit={onSubmit} className="mt-8" noValidate>
          <Field>
            <FieldLabel htmlFor="current-password">
              Password saat ini
            </FieldLabel>
            <PasswordInput
              id="current-password"
              value={current}
              onChange={setCurrent}
            />
          </Field>

          <Field className="mt-5">
            <FieldLabel htmlFor="new-password">Password baru</FieldLabel>
            <PasswordInput
              id="new-password"
              value={next}
              onChange={setNext}
              autoComplete="new-password"
            />
            <FieldDescription>Minimal 6 karakter.</FieldDescription>
          </Field>

          <Field className="mt-5">
            <FieldLabel htmlFor="confirm-password">
              Konfirmasi password baru
            </FieldLabel>
            <PasswordInput
              id="confirm-password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
          </Field>

          {error ? (
            <p
              role="alert"
              className="animate-fade-up mt-5 text-sm font-normal text-destructive"
            >
              {error}
            </p>
          ) : null}
          {success ? (
            <p
              role="status"
              className="animate-fade-up mt-5 text-sm font-normal text-[--pen-blue]"
            >
              Password berhasil diganti.
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit}
            className="mt-8 w-full"
          >
            {busy ? "Menyimpan..." : "Simpan password baru"}
          </Button>
        </form>
      </div>
    </main>
  )
}
