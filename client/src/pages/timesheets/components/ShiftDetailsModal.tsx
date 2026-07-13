import { PlayIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import Modal from "@/components/reusable/cards/Modal"
import { formatDate, formatTime } from "@/lib/attendance.utils"
import type { MyShift } from "@/lib/api/scheduling.api"

import { shiftDayLabel } from "../timesheets.constants"

export function ShiftDetailsModal({
  shift,
  onClose,
  canClockInOut,
  isOnShift,
  onClockButton,
  actionLoading,
  clockInLoading,
}: {
  shift: MyShift | null
  onClose: () => void
  canClockInOut: boolean
  isOnShift: boolean
  onClockButton: () => void
  actionLoading: boolean
  clockInLoading: boolean
}) {
  return (
    <Modal
      isOpen={Boolean(shift)}
      onClose={onClose}
      heading="Shift details"
      description="Review the scheduled time before clocking in."
      className="min-w-[32rem]"
    >
      {shift && (
        <div className="space-y-4">
          <div className="rounded-md border border-border/60 p-4">
            <div className="text-[13px] font-medium uppercase tracking-[0.12em] text-primary">
              {shiftDayLabel(shift.startAt)}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {formatTime(shift.startAt)} – {formatTime(shift.endAt)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground tabular-nums">
              {formatDate(shift.startAt)}
            </div>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">{shift.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Shift ID</dt>
              <dd className="truncate font-mono text-xs">{shift.id}</dd>
            </div>
          </dl>
          {canClockInOut && !isOnShift && (
            <Button className="w-full" onClick={onClockButton} disabled={actionLoading}>
              <PlayIcon data-icon="inline-start" />
              {clockInLoading ? "Clocking in…" : "Clock In"}
            </Button>
          )}
        </div>
      )}
    </Modal>
  )
}

export default ShiftDetailsModal
