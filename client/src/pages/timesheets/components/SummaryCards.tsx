import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type SummaryCard = {
  label: string
  value: string
  sub: string
}

export function SummaryCards({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((m, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-2">
            <CardDescription className="text-[13px] uppercase tracking-[0.12em]">
              {m.label}
            </CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums tracking-tighter">
              {m.value}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[13px] text-muted-foreground">{m.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default SummaryCards
