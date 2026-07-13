import type { FC, ReactNode } from "react"

import { Badge, type BadgeTone } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { humanizeStatus } from "@/lib/format"

/**
 * A status pill with a single, app-wide tone mapping.
 *
 * Replaces the ~177 hand-rolled `inline-flex ... border px-2 ... uppercase`
 * spans and per-page `statusClass` maps. Pass a `toneMap` to map your specific
 * status enum onto a semantic tone; unmapped statuses fall back to `default`.
 */
export interface StatusBadgeProps {
  status: string
  /** Map of status value -> tone. Unmapped values render as `default` (muted). */
  toneMap?: Record<string, BadgeTone>
  /** Override the rendered text. Defaults to a humanized version of `status`. */
  label?: ReactNode
  /** Show the label uppercased (matches the existing pill style). Default true. */
  uppercase?: boolean
  size?: "sm" | "md"
  className?: string
}

const StatusBadge: FC<StatusBadgeProps> = ({
  status,
  toneMap,
  label,
  uppercase = true,
  size = "sm",
  className,
}) => {
  const tone = toneMap?.[status] ?? "default"
  return (
    <Badge
      tone={tone}
      size={size}
      className={cn(uppercase && "uppercase", className)}
    >
      {label ?? humanizeStatus(status)}
    </Badge>
  )
}

export default StatusBadge
