import { cn } from "cn"

/**
 * Ledger monogram: a stamp-like square with the register mark.
 * Deliberately simple geometric mark (skill §4.8 allows this class of SVG).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="7"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M9.5 16.5 14 21l8.5-10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-7 text-primary" />
      <span className="leading-none">
        <span className="block font-heading text-[15px] font-semibold tracking-tight">
          Catat Void
        </span>
        <span className="block font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
          Register Buku Besar
        </span>
      </span>
    </span>
  )
}
