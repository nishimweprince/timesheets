import {
  Activity,
  AlertTriangle,
  CalendarRange,
  ListChecks,
  UsersRound,
} from "lucide-react"

import { ShiftInstanceStatus, type ShiftInstance } from "@/lib/api/scheduling.api"
import { WorkSessionStatus, type WorkSession } from "@/lib/api/attendance.api"
import type { MetricTileProps } from "./components/MetricTile"

/** Build the five KPI tiles shown at the top of the coverage view. */
export function buildCoverageMetrics({
  instances,
  assignedEmployeeCounts,
  orgSessions,
  exceptionCount,
  range,
}: {
  instances: ShiftInstance[]
  assignedEmployeeCounts: Map<string, number>
  orgSessions: WorkSession[]
  exceptionCount: number
  range: { from: string; to: string }
}): MetricTileProps[] {
  const activeInstances = instances.filter(
    (instance) =>
      instance.status === ShiftInstanceStatus.SCHEDULED ||
      instance.status === ShiftInstanceStatus.MODIFIED,
  )
  const unassigned = activeInstances.filter(
    (instance) =>
      !instance.patternId || (assignedEmployeeCounts.get(instance.patternId) ?? 0) === 0,
  ).length
  const modifiedOrCancelled = instances.filter(
    (instance) =>
      instance.status === ShiftInstanceStatus.MODIFIED ||
      instance.status === ShiftInstanceStatus.CANCELLED,
  ).length
  const openSessions = orgSessions.filter((session) => session.status === WorkSessionStatus.OPEN).length

  return [
    {
      label: "Scheduled",
      value: String(activeInstances.length),
      sub: `${range.from} to ${range.to}`,
      tone: "info",
      icon: CalendarRange,
    },
    {
      label: "Coverage gaps",
      value: String(unassigned),
      sub: unassigned === 0 ? "all visible shifts assigned" : "unassigned shifts",
      tone: unassigned === 0 ? "success" : "warning",
      icon: UsersRound,
    },
    {
      label: "Changed",
      value: String(modifiedOrCancelled),
      sub: "modified or cancelled",
      tone: modifiedOrCancelled === 0 ? "neutral" : "warning",
      icon: ListChecks,
    },
    {
      label: "On duty",
      value: String(openSessions),
      sub: "open clock sessions",
      tone: "success",
      icon: Activity,
    },
    {
      label: "Exceptions",
      value: String(exceptionCount),
      sub: "open policy flags",
      tone: exceptionCount === 0 ? "neutral" : "danger",
      icon: AlertTriangle,
    },
  ]
}
