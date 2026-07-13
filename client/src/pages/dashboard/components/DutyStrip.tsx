import { PlayIcon, SquareIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { WorkSession } from "@/lib/api/attendance.api"

import { formatElapsed } from "../dashboard.constants"

interface DutyStripProps {
  isOnShift: boolean
  currentSession: WorkSession | null
  dutySubtitle: string
  nowMs: number
  actionLoading: boolean
  clockInLoading: boolean
  clockOutLoading: boolean
  onClockButton: () => void
}

/** Employee "on/off duty" card with the clock in/out button. */
export function DutyStrip({
  isOnShift,
  currentSession,
  dutySubtitle,
  nowMs,
  actionLoading,
  clockInLoading,
  clockOutLoading,
  onClockButton,
}: DutyStripProps) {
  return (
    <Card
      className={cn(
        "border-primary/25",
        isOnShift && "border-success/30 bg-success/5",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardDescription className="operations-label">Current shift</CardDescription>
            <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
              {isOnShift ? "On duty" : "Off duty"}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{dutySubtitle}</p>
          </div>
          {isOnShift && currentSession ? (
            <div className="rounded-xs border border-border bg-background px-3 py-2 text-right">
              <div className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
                Elapsed
              </div>
              <div className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatElapsed(currentSession.actualClockInAt, nowMs)}
              </div>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            size="lg"
            className="h-12 w-full rounded-xs px-8 text-sm font-medium sm:w-auto"
            onClick={onClockButton}
            variant={isOnShift ? "destructive" : "default"}
            disabled={actionLoading}
          >
            {isOnShift ? (
              <>
                <SquareIcon data-icon="inline-start" />
                {clockOutLoading ? "Clocking out…" : "Clock out"}
              </>
            ) : (
              <>
                <PlayIcon data-icon="inline-start" />
                {clockInLoading ? "Clocking in…" : "Clock in"}
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            {isOnShift
              ? "Time is recording. Clock out when your shift ends."
              : "Start tracking when you begin your shift."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
