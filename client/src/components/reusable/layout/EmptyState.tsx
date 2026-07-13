import type { FC, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Consistent "no data" placeholder. Replaces the ~38 ad-hoc
 * "No X found" blocks. Use inside cards, tables, and lists.
 */
export interface EmptyStateProps {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  /** Optional call-to-action (e.g. a Button). */
  action?: ReactNode
  className?: string
}

const EmptyState: FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-1 flex size-10 items-center justify-center border border-border bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export default EmptyState
