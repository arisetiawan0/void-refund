import { Link, useRouter } from "@tanstack/react-router"
import { LogOutIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { LogoMark, LogoWordmark } from "@/components/logo"

/**
 * Shared top bar: 64px, single line, ledger header style with a hairline
 * double rule (like a register book page head).
 */
export function AppBar({
  title,
  subtitle,
  outletId,
  onLogout,
  backTo,
  className,
}: {
  title?: string
  subtitle?: string
  outletId?: string
  onLogout?: () => void
  backTo?: string
  className?: string
}) {
  const router = useRouter()
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-foreground/10 bg-background/90 backdrop-blur-md",
        // double-rule ledger head
        "before:absolute before:inset-x-0 before:bottom-[-4px] before:h-px before:bg-foreground/10",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 md:px-6">
        {backTo ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            onClick={() => router.history.push(backTo)}
            className="-ml-2 text-muted-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-4">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        ) : (
          <Link to="/" aria-label="Beranda" className="-ml-1 shrink-0">
            <LogoMark className="size-8 text-primary" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          {title ? (
            <div className="truncate font-heading text-[15px] leading-tight font-semibold tracking-tight">
              {title}
            </div>
          ) : (
            <LogoWordmark />
          )}
          {subtitle ? (
            <div className="truncate font-mono text-[11px] text-muted-foreground">
              {subtitle}
            </div>
          ) : null}
        </div>
        {outletId ? (
          <span className="stamp-mark hidden px-2 py-0.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-foreground/70 uppercase sm:inline-flex">
            {outletId}
          </span>
        ) : null}
        {onLogout ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-muted-foreground"
          >
            <LogOutIcon data-icon="inline-start" />
            Keluar
          </Button>
        ) : null}
      </div>
    </header>
  )
}
