import { cn } from "cn"
import type { ReportKind } from "@/lib/types"

/**
 * Rubber-stamp chip for the report kind. Rotated slightly like a real
 * stamp impression; `animate-stamp-in` plays on mount (reduced-motion safe).
 */
export function StampBadge({
  kind,
  animate = false,
  className,
}: {
  kind: ReportKind
  animate?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "stamp-mark inline-flex items-center px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase",
        kind === "void" ? "text-void" : "text-refund",
        animate && "animate-stamp-in",
        className
      )}
    >
      {kind}
    </span>
  )
}
