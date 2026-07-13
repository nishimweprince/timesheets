import type { ComponentType } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface MetricTileProps {
  label: string
  value: string
  sub: string
  tone?: "neutral" | "success" | "warning" | "danger" | "info"
  icon: ComponentType<{ className?: string }>
}

/** Compact KPI card used in the scheduling coverage overview. */
export function MetricTile({
  label,
  value,
  sub,
  tone = "neutral",
  icon: Icon,
}: MetricTileProps) {
  return (
    <Card className={cn("operations-metric", `operations-metric-${tone}`)}>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardDescription className="operations-label">{label}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </CardTitle>
        </div>
        <span className="operations-metric-icon" aria-hidden="true">
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

export default MetricTile
