import { Link } from "react-router-dom"

interface AttentionStripProps {
  pendingReviewCount: number
  openExceptionCount: number
  teamOnDuty: number
}

/** Admin attention strip: review, exceptions, and team-on-duty counts. */
export function AttentionStrip({
  pendingReviewCount,
  openExceptionCount,
  teamOnDuty,
}: AttentionStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Link
        to="/reports/review"
        className="border border-border/70 bg-card p-4 transition-colors hover:bg-muted/40"
      >
        <div className="operations-label">Sessions needing approval</div>
        <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
          {pendingReviewCount}
        </div>
        <p className="mt-1 text-muted-foreground">Open review queue →</p>
      </Link>
      <Link
        to="/reports/exception-queue"
        className="border border-border/70 bg-card p-4 transition-colors hover:bg-muted/40"
      >
        <div className="operations-label">Open exceptions</div>
        <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
          {openExceptionCount}
        </div>
        <p className="mt-1 text-muted-foreground">Open exception queue →</p>
      </Link>
      <div className="border border-border/70 bg-card p-4">
        <div className="operations-label">Team on duty</div>
        <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
          {teamOnDuty}
        </div>
        <p className="mt-1 text-muted-foreground">Open clock sessions now</p>
      </div>
    </div>
  )
}
