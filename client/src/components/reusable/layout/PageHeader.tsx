import type { FC, ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Standard page/section heading: title, optional description, and an optional
 * actions slot on the right. Replaces the ~27 hand-rolled title+description
 * blocks scattered across pages.
 */
export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Right-aligned actions (buttons, filters). */
  actions?: ReactNode
  className?: string
  titleClassName?: string
  descriptionClassName?: string
}

const PageHeader: FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className,
  titleClassName,
  descriptionClassName,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h1
          className={cn(
            "text-2xl font-semibold tracking-tight text-foreground",
            titleClassName,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              "text-[13px] text-muted-foreground",
              descriptionClassName,
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

export default PageHeader
