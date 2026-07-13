import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate, formatTime } from "@/lib/attendance.utils"
import type { MyShift } from "@/lib/api/scheduling.api"

import { shiftDayLabel } from "../timesheets.constants"

export function MyShiftsCard({
  nextShift,
  laterShifts,
  areShiftsLoading,
  onSelectShift,
}: {
  nextShift: MyShift | undefined
  laterShifts: MyShift[]
  areShiftsLoading: boolean
  onSelectShift: (shift: MyShift) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-[13px] uppercase tracking-[0.12em]">
          Schedule
        </CardDescription>
        <CardTitle className="text-base font-medium">My shifts</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        {nextShift ? (
          <button
            type="button"
            onClick={() => onSelectShift(nextShift)}
            className="relative flex w-full flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 pl-4 text-left transition-colors before:absolute before:inset-y-1 before:left-0 before:w-px before:bg-primary hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div>
              <div className="text-[13px] font-medium uppercase tracking-[0.12em] text-primary">
                {shiftDayLabel(nextShift.startAt)}
              </div>
              <div className="text-lg font-semibold tabular-nums tracking-tight">
                {formatTime(nextShift.startAt)} – {formatTime(nextShift.endAt)}
              </div>
            </div>
            <span className="text-[13px] text-muted-foreground tabular-nums">
              {formatDate(nextShift.startAt)}
            </span>
          </button>
        ) : (
          <p className="py-3 pl-4 text-sm text-muted-foreground">
            {areShiftsLoading ? "Loading shifts…" : "No upcoming shifts scheduled."}
          </p>
        )}

        {laterShifts.length > 0 && (
          <ul className="flex flex-col">
            {laterShifts.slice(0, 5).map((myShift) => (
              <li key={myShift.id} className="border-b border-border/40 last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelectShift(myShift)}
                  className="flex w-full items-center justify-between py-2.5 pl-4 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="text-muted-foreground">{shiftDayLabel(myShift.startAt)}</span>
                  <span className="tabular-nums">
                    {formatTime(myShift.startAt)} – {formatTime(myShift.endAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default MyShiftsCard
