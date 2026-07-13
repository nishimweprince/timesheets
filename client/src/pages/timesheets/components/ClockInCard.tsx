import type { ComponentType } from "react"
import {
  Clock3Icon,
  CoffeeIcon,
  PlayIcon,
  SquareIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatTime } from "@/lib/attendance.utils"
import type { MyShift } from "@/lib/api/scheduling.api"

export type ReadinessItem = {
  label: string
  icon: ComponentType<{ className?: string }>
}

export function ClockInCard({
  isOnShift,
  currentShiftLabel,
  readinessItems,
  nextShift,
  onStartBreak,
  onEndBreak,
  breakLoading,
  onClockButton,
  actionLoading,
  clockInLoading,
  clockOutLoading,
}: {
  isOnShift: boolean
  currentShiftLabel: string
  readinessItems: ReadinessItem[]
  nextShift: MyShift | undefined
  onStartBreak: () => void
  onEndBreak: () => void
  breakLoading: boolean
  onClockButton: () => void
  actionLoading: boolean
  clockInLoading: boolean
  clockOutLoading: boolean
}) {
  return (
    <Card className="employee-action-card">
      <CardHeader className="gap-4 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardDescription className="operations-label">
            Current shift
          </CardDescription>
          <CardTitle className="text-xl font-semibold tracking-tight">
            {isOnShift ? "On duty" : "Ready when you are"}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {currentShiftLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {readinessItems.map((item) => {
            const Icon = item.icon
            return (
              <span key={item.label} className="employee-readiness-chip">
                <Icon className="size-3.5" aria-hidden="true" />
                {item.label}
              </span>
            )
          })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="text-sm font-medium">
              {isOnShift ? "Your time is recording." : "Start from your scheduled shift when you arrive."}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {isOnShift
                ? "Use break controls during rest periods, then clock out when your shift ends."
                : nextShift
                  ? `${nextShift.patternName || "Scheduled shift"} · ${formatTime(nextShift.startAt)} – ${formatTime(nextShift.endAt)}`
                  : "No scheduled shift is waiting, but you can still clock in if your policy allows it."}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {isOnShift && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onStartBreak}
                  disabled={breakLoading}
                >
                  <CoffeeIcon data-icon="inline-start" />
                  Start break
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onEndBreak}
                  disabled={breakLoading}
                >
                  <Clock3Icon data-icon="inline-start" />
                  End break
                </Button>
              </>
            )}
            <Button
              size="lg"
              className="h-11 rounded-xs px-8 text-sm font-medium"
              onClick={onClockButton}
              variant={isOnShift ? "destructive" : "default"}
              disabled={actionLoading}
            >
              {isOnShift ? (
                <>
                  <SquareIcon data-icon="inline-start" />
                  {clockOutLoading ? "Clocking out…" : "Clock Out"}
                </>
              ) : (
                <>
                  <PlayIcon data-icon="inline-start" />
                  {clockInLoading ? "Clocking in…" : "Clock In"}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ClockInCard
