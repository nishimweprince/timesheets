import type { ColumnDef } from "@tanstack/react-table"

import StatusBadge from "@/components/reusable/badges/StatusBadge"
import type { RecentEntry } from "@/lib/attendance.utils"

import { entryStatusTone } from "./timesheets.constants"

/** Columns for the "My timesheets" attendance history table. */
export const timesheetColumns: ColumnDef<RecentEntry>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <div className="font-medium tabular-nums">{row.original.date}</div>
    ),
    meta: { width: "7rem" },
  },
  {
    id: "shift",
    header: "Shift",
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.clockIn} - {row.original.clockOut ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "hours",
    header: "Hours",
    cell: ({ getValue }) => (
      <span className="font-medium tabular-nums">{getValue<number>().toFixed(2)}h</span>
    ),
    meta: { align: "right", width: "6rem" },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.status} toneMap={entryStatusTone} />
    ),
  },
]
