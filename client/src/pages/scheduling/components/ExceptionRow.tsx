import type { AttendanceException } from "@/lib/api/attendance.api"

/** One policy-exception line rendered inside the shift-details sheet. */
export function ExceptionRow({ exception }: { exception: AttendanceException }) {
  return (
    <div className="review-exception-row">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="truncate font-mono text-[12px] text-foreground">{exception.code}</span>
        <span className="shrink-0 text-[12px] uppercase text-muted-foreground">{exception.severity}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{exception.message}</p>
    </div>
  )
}

export default ExceptionRow
