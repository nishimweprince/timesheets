import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  hours: {
    label: "Hours",
    color: "var(--primary)",
  },
} satisfies ChartConfig

interface WeekChartProps {
  weeklyData: { day: string; hours: number; target: number }[]
}

/** "Hours this week" area chart for employees. */
export function WeekChart({ weeklyData }: WeekChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="operations-label">Attendance</CardDescription>
        <CardTitle className="text-base font-medium">Hours this week</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-video h-[220px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={weeklyData}
            margin={{ left: 4, right: 4, top: 8 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="2 2" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="hours"
              type="natural"
              fill="var(--color-hours)"
              fillOpacity={0.35}
              stroke="var(--color-hours)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
