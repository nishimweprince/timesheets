import type { ComponentType } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/** Compact metric card used in the policies overview grid. */
export function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string
  value: number
  description: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Card className="rounded-xs border-border/70 shadow-none">
      <CardHeader className="pb-2">
        <CardDescription className="text-sm text-muted-foreground">{label}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-3xl font-semibold tracking-tighter tabular-nums">
          <Icon className="size-4 text-muted-foreground" />
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default SummaryCard
