import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import logo from "/logo.png"

type AuthShellProps = {
  children: ReactNode
  /** Frame the form in an elevated station card. Defaults true. */
  card?: boolean
  className?: string
  /** @deprecated Left panel removed — ignored. Kept so call sites still typecheck. */
  showLeftPanel?: boolean
  /** @deprecated Left panel removed — ignored. */
  leftPanel?: ReactNode
}

export function AuthFormHeader({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string
  title: string
  description?: string
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      {icon ? (
        <span className="flex size-11 items-center justify-center border border-primary/20 bg-primary/10 text-primary">
          {icon}
        </span>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  )
}

export const authPasswordToggleClassName =
  "flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"

/**
 * Full-bleed decorative field: perspective 3D line grid + sparse construction lines.
 * Signature for Tuza auth — clinical precision, not marketing copy or 3D toys.
 */
function AuthLineField() {
  return (
    <div aria-hidden className="auth-line-field pointer-events-none absolute inset-0 overflow-hidden">
      <div className="auth-line-field-wash" />
      <div className="auth-line-field-perspective">
        <div className="auth-line-field-floor" />
      </div>
      {/* Sparse structural strokes — orthographic “duty plane” marks */}
      <svg
        className="auth-line-field-strokes"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <line x1="8" y1="12" x2="38" y2="12" />
        <line x1="8" y1="12" x2="8" y2="28" />
        <line x1="92" y1="18" x2="92" y2="42" />
        <line x1="72" y1="18" x2="92" y2="18" />
        <line x1="12" y1="78" x2="12" y2="92" />
        <line x1="12" y1="92" x2="32" y2="92" />
        <line x1="68" y1="88" x2="88" y2="88" />
        <line x1="88" y1="72" x2="88" y2="88" />
        <line x1="48" y1="6" x2="52" y2="6" />
        <line x1="50" y1="4" x2="50" y2="8" />
      </svg>
      <div className="auth-line-field-horizon" />
    </div>
  )
}

const AuthShell = ({ children, card = true, className }: AuthShellProps) => {
  return (
    <div
      className={cn(
        "relative flex min-h-svh items-center justify-center px-5 py-10 sm:px-8",
        className,
      )}
    >
      <AuthLineField />

      <div className="relative z-10 w-full max-w-sm sm:max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src={logo} alt="Tuza Health" className="h-8 w-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Tuza Health
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Timesheets
            </span>
          </div>
        </div>

        {card ? (
          <div
            className={cn(
              "border border-border/70 bg-background/95 p-6 sm:p-8",
              "shadow-[0_1px_2px_rgb(0_0_0/0.04),0_16px_48px_-12px_rgb(0_0_0/0.14)]",
              "ring-1 ring-black/[0.03] backdrop-blur-sm",
              "dark:bg-background/92 dark:shadow-[0_16px_48px_-12px_rgb(0_0_0/0.5)] dark:ring-white/[0.05]",
            )}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

export default AuthShell
