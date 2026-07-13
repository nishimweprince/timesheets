import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { toIsoDate } from "@/lib/format"
import {
  ShiftAssignmentStatus,
  ShiftInstanceStatus,
  type ShiftInstance,
  type ShiftPatternAssignment,
} from "@/lib/api/scheduling.api"

/** Seven-day coverage strip showing shift counts and gaps per day. */
export function CoverageLedger({
  instances,
  patternAssignments,
  rangeStart,
}: {
  instances: ShiftInstance[]
  patternAssignments: ShiftPatternAssignment[]
  rangeStart: string
}) {
  const activeAssignmentCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const assignment of patternAssignments) {
      if (assignment.status !== ShiftAssignmentStatus.ACTIVE) continue
      counts.set(assignment.shiftPatternId, (counts.get(assignment.shiftPatternId) ?? 0) + 1)
    }
    return counts
  }, [patternAssignments])
  const start = React.useMemo(() => {
    const [year, month, day] = rangeStart.split("-").map(Number)
    return year && month && day ? new Date(year, month - 1, day) : new Date()
  }, [rangeStart])
  const days = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start)
        date.setDate(start.getDate() + index)
        return date
      }),
    [start],
  )

  return (
    <Card className="coverage-ledger-card">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardDescription className="operations-label">Coverage ledger</CardDescription>
          <CardTitle className="text-base font-medium">Next visible days</CardTitle>
        </div>
        <div className="flex flex-wrap gap-3 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="coverage-dot coverage-dot-covered" /> Covered</span>
          <span className="inline-flex items-center gap-1.5"><span className="coverage-dot coverage-dot-gap" /> Gap</span>
          <span className="inline-flex items-center gap-1.5"><span className="coverage-dot coverage-dot-quiet" /> No shifts</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="coverage-ledger-grid">
          {days.map((date) => {
            const iso = toIsoDate(date)
            const dayInstances = instances.filter((instance) => instance.shiftDate === iso)
            const activeInstances = dayInstances.filter(
              (instance) =>
                instance.status === ShiftInstanceStatus.SCHEDULED ||
                instance.status === ShiftInstanceStatus.MODIFIED,
            )
            const unassigned = activeInstances.filter(
              (instance) =>
                !instance.patternId || (activeAssignmentCounts.get(instance.patternId) ?? 0) === 0,
            ).length
            const tone =
              activeInstances.length === 0
                ? "quiet"
                : unassigned > 0
                  ? "gap"
                  : "covered"

            return (
              <div key={iso} className={cn("coverage-ledger-day", `coverage-ledger-day-${tone}`)}>
                <div className="coverage-ledger-date">
                  <span>{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
                  <strong>{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</strong>
                </div>
                <div className="coverage-ledger-counts">
                  <span>{activeInstances.length} shifts</span>
                  <span>{unassigned} gaps</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default CoverageLedger
