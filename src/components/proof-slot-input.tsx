import { useEffect, useRef, useState } from "react"
import { CameraIcon, ImageIcon, RefreshCcwIcon, Trash2Icon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "cn"

/** Foto satu slot: dataUrl baru dari kamera/galeri, atau path lama saat edit. */
export type ProofValue = { name: string; dataUrl?: string; path?: string }

/**
 * One required-photo slot.
 * - Phone: native capture via capture="environment" (opens rear camera, PRD §5.1).
 * - Desktop: in-app camera dialog via getUserMedia + canvas grab.
 * Watermarking + storage happen server-side in production; the client only
 * previews (PRD §4.4 rekomendasi implementasi).
 */
export function ProofSlotInput({
  label,
  description,
  value,
  onChange,
  error,
}: {
  label: string
  description: string
  value: ProofValue | undefined
  onChange: (value: ProofValue | undefined) => void
  error?: boolean
}) {
  const camRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [camOpen, setCamOpen] = useState(false)
  const [camError, setCamError] = useState<string | null>(null)
  const [facing, setFacing] = useState<"environment" | "user">("environment")
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      onChange({ name: file.name, dataUrl: String(reader.result) })
    }
    reader.readAsDataURL(file)
  }

  async function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    if (!camOpen) {
      void stopStream()
      return
    }
    const localStream: MediaStream[] = []
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        })
        localStream.push(stream)
        setCamError(null)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch {
        setCamError(
          "Kamera tidak bisa diakses. Beri izin kamera di browser, atau pakai tombol Galeri."
        )
      }
    })()
    return () => {
      // stops the live stream whether it connected or is still initializing
      localStream[0]?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [camOpen, facing])

  function snap() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement("canvas")
    // cap at 1280px on the long edge: readable proof, small payload
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)
    onChange({
      name: `${label.toLowerCase().replaceAll(/\s+/g, "-")}-${Date.now()}.png`,
      dataUrl: canvas.toDataURL("image/png"),
    })
    setCamOpen(false)
  }

  const hasNativeCapture =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  return (
    <div
      data-invalid={error && !value ? true : undefined}
      className={cn(
        "group/slot relative flex flex-wrap items-stretch gap-x-3 gap-y-3 overflow-hidden rounded-2xl border bg-card p-3 transition-colors",
        error && !value && "border-destructive/40",
        value && "border-foreground/15"
      )}
    >
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) readFile(f)
          e.target.value = ""
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) readFile(f)
          e.target.value = ""
        }}
      />

      {/* Thumbnail / empty state */}
      <button
        type="button"
        onClick={() => (value ? setConfirmOpen(true) : camRef.current?.click())}
        className={cn(
          "relative size-20 shrink-0 overflow-hidden rounded-xl border border-dashed bg-paper-sunk",
          value ? "border-solid" : "text-muted-foreground"
        )}
        aria-label={value ? `Lihat foto ${label}` : `Ambil foto ${label}`}
      >
        {value ? (
          <img src={value.dataUrl} alt={label} className="size-full object-cover" />
        ) : (
          <CameraIcon className="absolute inset-0 m-auto size-5 opacity-60" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 basis-40 flex-col justify-center gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
            {value ? "Terisi" : error ? "Wajib" : "Belum ada"}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 rounded-full",
              value ? "bg-primary" : "bg-muted-foreground/40"
            )}
          />
        </div>
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="line-clamp-2 text-xs text-balance text-muted-foreground">
          {description}
        </p>
        {value ? (
          <p className="truncate font-mono text-[11px] text-muted-foreground">{value.name}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-row items-stretch justify-end gap-1.5 max-sm:w-full max-sm:justify-start max-sm:pl-[92px]">
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Hapus foto ${label}`}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2Icon className="text-muted-foreground" />
          </Button>
        ) : (
          <>
            {/* Phone: native camera app. Desktop: in-app getUserMedia camera. */}
            {hasNativeCapture ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => camRef.current?.click()}
              >
                <CameraIcon data-icon="inline-start" />
                Kamera
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCamOpen(true)}
              >
                <CameraIcon data-icon="inline-start" />
                Kamera
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileRef.current?.click()}
              className="text-muted-foreground"
            >
              <ImageIcon data-icon="inline-start" />
              Galeri
            </Button>
          </>
        )}
      </div>

      {/* In-app camera dialog (desktop / no native capture) */}
      <Dialog
        open={camOpen}
        onOpenChange={(open) => {
          setCamOpen(open)
          if (!open) void stopStream()
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Foto {label.toLowerCase()}</DialogTitle>
            <DialogDescription>
              Posisikan objek, lalu Jepret. Foto hanya pratinjau; stempel waktu
              diberikan server saat upload.
            </DialogDescription>
          </DialogHeader>

          {camError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-6 text-center text-sm text-destructive">
              {camError}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-foreground/10 bg-ink/90">
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn(
                  "aspect-[4/3] w-full object-cover",
                  facing === "user" && "-scale-x-100"
                )}
              />
              {/* ledger finder marks */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-4 rounded-lg border border-dashed border-white/25"
              />
            </div>
          )}

          <DialogFooter className="justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCamError(null)
                setFacing((f) => (f === "environment" ? "user" : "environment"))
              }}
              className="text-muted-foreground"
            >
              <RefreshCcwIcon data-icon="inline-start" />
              Ganti kamera
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setCamOpen(false)}>
                <XIcon data-icon="inline-start" />
                Tutup
              </Button>
              {!camError ? (
                <Button onClick={snap}>
                  <CameraIcon data-icon="inline-start" />
                  Jepret
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus foto {label.toLowerCase()}?</DialogTitle>
            <DialogDescription>
              Foto akan dilepas dari form. Submit diblokir selama bukti wajib
              belum lengkap.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onChange(undefined)
                setConfirmOpen(false)
              }}
            >
              Hapus foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
