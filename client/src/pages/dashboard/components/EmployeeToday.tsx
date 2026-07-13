import { Link } from "react-router-dom"

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

import { shiftDayLabel } from "../dashboard.constants"

interface EmployeeTodayProps {
  todayHours: number
  weekHours: number
  isOnShift: boolean
  nextShift: MyShift | undefined
}

/** Employee stats row: hours logged today and the next scheduled shift. */
export function EmployeeToday({
  todayHours,
  weekHours,
  isOnShift,
  nextShift,
}: EmployeeTodayProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="operations-label">Today logged</CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums tracking-tight">
            {todayHours.toFixed(1)}h
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {weekHours}h this week · {isOnShift ? "Shift in progress" : "Not on shift"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="operations-label">Next shift</CardDescription>
          <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">
            {nextShift
              ? `${shiftDayLabel(nextShift.startAt)} · ${formatTime(nextShift.startAt)}–${formatTime(nextShift.endAt)}`
              : "No upcoming shift"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground">
            {nextShift?.patternName ?? "Nothing scheduled in the next two weeks."}
          </p>
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link to="/timesheets">Timesheets</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
