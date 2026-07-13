import { UsersIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/** Compact metric card for the team page summary row. */
export function SummaryCard({
  label,
  value,
  description,
}: {
  label: string
  value: number
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-[13px] tracking-[0.12em] uppercase">{label}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-3xl font-semibold tracking-tighter tabular-nums">
          <UsersIcon className="size-4 text-muted-foreground" />
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default SummaryCard
