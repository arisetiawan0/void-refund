import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & { className?: string }

/**
 * Register-ink icons used for the kind split on the home screen.
 * Same geometric language as LogoMark (stroke, rounded joins).
 */
export function VoidIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m8.5 8.5 7 7m0-7-7 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function RefundIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 14.5V9.2c0-.7.5-1.2 1.2-1.2h4.3M12.2 5.8 14.8 8l-2.6 2.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9 17.5 3-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
