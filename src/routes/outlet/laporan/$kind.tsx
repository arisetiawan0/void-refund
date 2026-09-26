import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { AlertTriangleIcon, InfoIcon, SendIcon } from "lucide-react"

import { PROOF_SLOTS } from "@/lib/types"
import type { ProofMap, ReportKind, Session } from "@/lib/types"
import { createTransaction } from "@/lib/db"
import { getSession, logoutOutlet, OUTLETS } from "@/lib/auth"
import { tanggalHariIni } from "@/lib/format"
import { AppBar } from "@/components/app-bar"
import { StampBadge } from "@/components/stamp-badge"
import { ProofSlotInput } from "@/components/proof-slot-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/** ProofMap dibaca dengan index aman; key dihapus saat slot dikosongkan. */
function slotFilled(proofs: ProofMap, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(proofs, key)
}

type FormState = {
  tanggal: string
  nama_kasir: string
  nama_barang: string
  barcode: string
  qty: string
  alasan: string
  mod_bertugas: string
}

export const Route = createFileRoute("/outlet/laporan/$kind")({
  component: ReportFormPage,
})

function ReportFormPage() {
  const { kind } = Route.useParams()
  const navigate = useNavigate()
  const jenis: ReportKind = kind === "refund" ? "refund" : "void"
  const valid = kind === "void" || kind === "refund"
  const [session, setSession] = useState<Session | null | undefined>(
    valid ? undefined : null
  )
  const outlet = OUTLETS.find((o) => o.id === session?.outletId)

  const [form, setForm] = useState<FormState>({
    tanggal: tanggalHariIni(),
    nama_kasir: "",
    nama_barang: "",
    barcode: "",
    qty: "1",
    alasan: "",
    mod_bertugas: "",
  })
  const [proofs, setProofs] = useState<ProofMap>({})
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [doneOpen, setDoneOpen] = useState(false)

  const RequiredSlots = useMemo(
    () => PROOF_SLOTS.filter((s) => !s.refundOnly || jenis === "refund"),
    [jenis]
  )

  useEffect(() => {
    let alive = true
    if (!valid) {
      setSession(null)
      return
    }
    getSession().then((s) => {
      if (!alive) return
      setSession(s)
      if (!s) navigate({ to: "/login", replace: true })
    })
    return () => {
      alive = false
    }
  }, [valid, navigate])

  // undefined = sesi masih dimuat (jangan redirect!), null = benar2 tidak login
  if (session === null || !valid) {
    return <RedirectToLogin />
  }
  if (session === undefined) {
    return null
  }

  const set = (key: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }))

  const qtyValue = Number(form.qty)
  const textErrors = {
    nama_kasir: submitted && !form.nama_kasir.trim(),
    nama_barang: submitted && !form.nama_barang.trim(),
    barcode: submitted && !form.barcode.trim(),
    qty: submitted && (!Number.isInteger(qtyValue) || qtyValue < 1),
    alasan: submitted && !form.alasan.trim(),
    mod_bertugas: submitted && !form.mod_bertugas.trim(),
  }
  const proofErrors: Record<string, boolean> = {}
  for (const s of RequiredSlots) {
    proofErrors[s.key] = submitted && !slotFilled(proofs, s.key)
  }
  const allValid =
    !Object.values(textErrors).some(Boolean) &&
    !Object.values(proofErrors).some(Boolean)

  // Validate against current state at click time; stale-render booleans would
  // open the confirm dialog while proofs are still missing.
  function trySubmit() {
    setSubmitted(true)
    const textOk =
      form.nama_kasir.trim() &&
      form.nama_barang.trim() &&
      form.barcode.trim() &&
      form.alasan.trim() &&
      form.mod_bertugas.trim() &&
      Number.isInteger(qtyValue) &&
      qtyValue >= 1
    const submittedProofs: ProofMap = proofs
    const proofOk = RequiredSlots.every((s) =>
      slotFilled(submittedProofs, s.key)
    )
    if (textOk && proofOk) setConfirmOpen(true)
  }

  async function submit() {
    if (!session || !session.outletId) return
    setBusy(true)
    setSubmitError(null)
    try {
      await createTransaction({
        outlet_id: session.outletId,
        jenis,
        tanggal: form.tanggal || tanggalHariIni(),
        nama_kasir: form.nama_kasir.trim(),
        nama_barang: form.nama_barang.trim(),
        barcode: form.barcode.trim(),
        qty: Math.max(1, Math.round(qtyValue || 1)),
        alasan: form.alasan.trim(),
        mod_bertugas: form.mod_bertugas.trim(),
        proofs,
      })
      setConfirmOpen(false)
      setDoneOpen(true)
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Gagal mengirim laporan. Coba lagi."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AppBar
        backTo="/"
        title={jenis === "void" ? "Laporan Void" : "Laporan Refund"}
        subtitle={`${session.outletId} / ${outlet?.nama ?? ""}`}
        outletId={session.outletId}
        onLogout={() => {
          void logoutOutlet()
          navigate({ to: "/login" })
        }}
      />

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-32 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="editorial-heading text-2xl leading-tight">
              Formulir {jenis === "void" ? "Void" : "Refund"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Semua kolom wajib diisi. Bukti foto diberi stempel waktu saat
              diunggah.
            </p>
          </div>
          <StampBadge kind={jenis} animate />
        </div>

        {/* Persian ledger rule between head and body */}
        <div className="mt-6 flex items-center gap-2" aria-hidden="true">
          <span className="h-px flex-1 bg-foreground/15" />
          <span className="size-1 rounded-full bg-foreground/25" />
          <span className="h-px w-16 bg-foreground/10" />
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            trySubmit()
          }}
          className="mt-8"
        >
          <FieldGroup className="gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field data-invalid={textErrors.nama_kasir || undefined}>
                <FieldLabel htmlFor="nama-kasir">Nama kasir</FieldLabel>
                <Input
                  id="nama-kasir"
                  value={form.nama_kasir}
                  onChange={(e) => set("nama_kasir")(e.target.value)}
                  placeholder="Nama lengkap kasir saat transaksi"
                  aria-invalid={textErrors.nama_kasir || undefined}
                />
                {textErrors.nama_kasir ? (
                  <FieldError>Nama kasir wajib diisi.</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={textErrors.mod_bertugas || undefined}>
                <FieldLabel htmlFor="mod">MOD yang bertugas</FieldLabel>
                <Input
                  id="mod"
                  value={form.mod_bertugas}
                  onChange={(e) => set("mod_bertugas")(e.target.value)}
                  placeholder="Manager on Duty penanggung jawab"
                  aria-invalid={textErrors.mod_bertugas || undefined}
                />
                {textErrors.mod_bertugas ? (
                  <FieldError>MOD wajib diisi.</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={textErrors.nama_barang || undefined}>
                <FieldLabel htmlFor="nama-barang">Nama barang</FieldLabel>
                <Input
                  id="nama-barang"
                  value={form.nama_barang}
                  onChange={(e) => set("nama_barang")(e.target.value)}
                  placeholder="Diketik manual, tanpa master produk"
                  aria-invalid={textErrors.nama_barang || undefined}
                />
                {textErrors.nama_barang ? (
                  <FieldError>Nama barang wajib diisi.</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={textErrors.barcode || undefined}>
                <FieldLabel htmlFor="barcode">Barcode</FieldLabel>
                <Input
                  id="barcode"
                  inputMode="numeric"
                  value={form.barcode}
                  onChange={(e) => set("barcode")(e.target.value)}
                  placeholder="Scan atau ketik kode barcode"
                  aria-invalid={textErrors.barcode || undefined}
                  className="font-mono"
                />
                {textErrors.barcode ? (
                  <FieldError>Barcode wajib diisi.</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={textErrors.qty || undefined}>
                <FieldLabel htmlFor="qty">Qty</FieldLabel>
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  step={1}
                  value={form.qty}
                  onChange={(e) => set("qty")(e.target.value)}
                  aria-invalid={textErrors.qty || undefined}
                  className="font-mono"
                />
                {textErrors.qty ? (
                  <FieldError>Qty minimal 1.</FieldError>
                ) : (
                  <FieldDescription>Jumlah unit, minimal 1.</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="tanggal">Tanggal transaksi</FieldLabel>
                <Input
                  id="tanggal"
                  type="date"
                  value={form.tanggal}
                  max={tanggalHariIni()}
                  onChange={(e) => set("tanggal")(e.target.value)}
                  className="font-mono"
                />
                <FieldDescription>
                  Default hari ini, bisa diubah.
                </FieldDescription>
              </Field>
            </div>

            <Field data-invalid={textErrors.alasan || undefined}>
              <FieldLabel htmlFor="alasan">
                Alasan {jenis === "void" ? "void" : "refund"}
              </FieldLabel>
              <Textarea
                id="alasan"
                rows={3}
                value={form.alasan}
                onChange={(e) => set("alasan")(e.target.value)}
                placeholder="Tulis kronologi singkat. Tanpa dropdown kategori, kalimat sendiri."
                aria-invalid={textErrors.alasan || undefined}
              />
              {textErrors.alasan ? (
                <FieldError>Alasan wajib diisi.</FieldError>
              ) : null}
            </Field>

            {/* Bukti section */}
            <section className="ledger-surface bg-paper-sunk/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-base font-semibold">
                  Bukti dokumentasi
                </h2>
                <span className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                  {
                    RequiredSlots.filter((s) => slotFilled(proofs, s.key))
                      .length
                  }{" "}
                  / {RequiredSlots.length} foto
                </span>
              </div>
              <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <InfoIcon className="mt-px size-3.5 shrink-0" />
                Setiap foto otomatis diberi watermark tanggal &amp; jam oleh
                sistem saat diunggah (server-side).
              </p>

              <div className="mt-4 grid gap-3">
                {RequiredSlots.map((slot) => (
                  <ProofSlotInput
                    key={slot.key}
                    label={slot.label}
                    description={slot.description}
                    error={proofErrors[slot.key]}
                    value={proofs[slot.key] ?? undefined}
                    onChange={(v) =>
                      setProofs((p) => {
                        const next = { ...p }
                        if (v) next[slot.key] = v
                        else delete next[slot.key]
                        return next
                      })
                    }
                  />
                ))}
              </div>

              {submitted && Object.values(proofErrors).some(Boolean) ? (
                <p
                  role="alert"
                  className="mt-3 flex items-center gap-1.5 text-sm text-destructive"
                >
                  <AlertTriangleIcon className="size-4" />
                  Bukti wajib belum lengkap. Form tidak bisa dikirim.
                </p>
              ) : null}
            </section>
          </FieldGroup>
        </form>
      </main>

      {/* Sticky action bar: thumb-reachable on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-foreground/10 bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">
            {allValid ? (
              "Semua kolom & bukti lengkap."
            ) : submitted ? (
              <span className="text-destructive">
                Lengkapi kolom yang ditandai.
              </span>
            ) : (
              "Periksa sebelum mengirim."
            )}
          </div>
          <Button type="button" size="lg" disabled={busy} onClick={trySubmit}>
            <SendIcon data-icon="inline-start" />
            Kirim laporan
          </Button>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              Kirim laporan {jenis}?
              <StampBadge kind={jenis} />
            </DialogTitle>
            <DialogDescription>
              Laporan akan tercatat di riwayat outlet dan bisa diunduh HO. Data
              masih bisa diedit setelah terkirim.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2">
            {submitError ? (
              <p role="alert" className="text-sm text-destructive">
                {submitError}
              </p>
            ) : null}
            <div className="flex w-full justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                Periksa lagi
              </Button>
              <Button onClick={submit} disabled={busy}>
                {busy ? "Mengirim..." : "Ya, kirim"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success dialog with stamp animation */}
      <Dialog
        open={doneOpen}
        onOpenChange={(open) => {
          if (!open) navigate({ to: "/outlet/riwayat" })
        }}
      >
        <DialogContent className="max-w-sm text-center">
          <div className="flex justify-center py-2">
            <StampBadge kind={jenis} animate className="px-3 py-1 text-base" />
          </div>
          <DialogHeader className="items-center">
            <DialogTitle>Tercatat di register</DialogTitle>
            <DialogDescription>
              Laporan {jenis} qty {Math.max(1, Math.round(qtyValue || 1))} sudah
              masuk riwayat outlet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-center">
            <Button onClick={() => navigate({ to: "/outlet/riwayat" })}>
              Lihat riwayat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RedirectToLogin() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate({ to: "/login", replace: true })
  }, [navigate])
  return null
}
