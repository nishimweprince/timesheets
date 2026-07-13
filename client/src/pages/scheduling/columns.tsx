import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, XCircle, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/reusable/badges/StatusBadge"
import { RowActions } from "@/components/reusable/tables"
import { formatDateISO, formatTime, formatDuration, shortId } from "@/lib/format"
import {
  ShiftAssignmentStatus,
  ShiftInstanceStatus,
  type ShiftInstance,
  type ShiftPattern,
  type ShiftPatternAssignment,
} from "@/lib/api/scheduling.api"
import {
  WorkSessionStatus,
  type WorkSession,
} from "@/lib/api/attendance.api"
import {
  assignmentStatusTone,
  daysLabel,
  instanceStatusTone,
} from "./scheduling.constants"

/** Columns for the generated-shifts table. */
export function buildInstanceColumns({
  patternsById,
  assignedEmployeeCounts,
  onOverride,
  onCancel,
}: {
  patternsById: Map<string, ShiftPattern>
  assignedEmployeeCounts: Map<string, number>
  onOverride: (instance: ShiftInstance) => void
  onCancel: (instance: ShiftInstance) => void
}): ColumnDef<ShiftInstance>[] {
  return [
    {
      accessorKey: "shiftDate",
      header: "Date",
      cell: ({ getValue }) => (
        <span className="font-medium tabular-nums">{formatDateISO(getValue<string>())}</span>
      ),
      meta: { width: "10rem", cellClassName: "py-3" },
    },
    {
      id: "shift",
      header: "Shift",
      cell: ({ row }) => (
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {formatTime(row.original.startAt)} – {formatTime(row.original.endAt)}
        </span>
      ),
      meta: { width: "12rem", cellClassName: "py-3" },
    },
    {
      id: "pattern",
      header: "Pattern",
      cell: ({ row }) => {
        const patternId = row.original.patternId
        if (!patternId) return <span className="text-[13px] text-muted-foreground">—</span>
        const pattern = patternsById.get(patternId)
        if (!pattern) return <span className="text-[13px] text-muted-foreground">{shortId(patternId)}</span>
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium">{pattern.name}</span>
            <span className="text-[12px] text-muted-foreground">
              {daysLabel(pattern.daysOfWeek)} · {assignedEmployeeCounts.get(pattern.id) ?? 0} assigned
            </span>
          </div>
        )
      },
      meta: { width: "16rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <StatusBadge status={getValue<ShiftInstanceStatus>()} toneMap={instanceStatusTone} />
      ),
      meta: { width: "8rem", cellClassName: "py-3" },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const instance = row.original
        if (
          instance.status === ShiftInstanceStatus.CANCELLED ||
          instance.status === ShiftInstanceStatus.COMPLETED
        ) {
          return null
        }
        return (
          <RowActions
            actions={[
              {
                key: "override",
                label: "Override times…",
                icon: Pencil,
                onSelect: () => onOverride(instance),
              },
              {
                key: "cancel",
                label: "Cancel",
                icon: XCircle,
                destructive: true,
                onSelect: () => onCancel(instance),
              },
            ]}
          />
        )
      },
      meta: { align: "right", width: "4rem", cellClassName: "py-3" },
    },
  ]
}

/** Columns for the pattern-assignments table. */
export function buildAssignmentColumns({
  patternsById,
  employeeByMembershipId,
  onRemove,
}: {
  patternsById: Map<string, ShiftPattern>
  employeeByMembershipId: Map<string, string>
  onRemove: (assignment: ShiftPatternAssignment) => void
}): ColumnDef<ShiftPatternAssignment>[] {
  return [
    {
      accessorKey: "id",
      header: "Assignment",
      cell: ({ getValue }) => (
        <span className="font-mono text-[12px] text-muted-foreground">{shortId(getValue<string>())}</span>
      ),
      meta: { width: "8rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "shiftPatternId",
      header: "Shift pattern",
      cell: ({ getValue }) => {
        const patternId = getValue<string>()
        const pattern = patternsById.get(patternId)
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium">{pattern?.name ?? "Unknown pattern"}</span>
            <span className="font-mono text-[12px] text-muted-foreground">{shortId(patternId)}</span>
          </div>
        )
      },
      meta: { width: "15rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "employeeMembershipId",
      header: "Employee",
      cell: ({ getValue }) => {
        const membershipId = getValue<string>()
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium">
              {employeeByMembershipId.get(membershipId) ?? "Unknown employee"}
            </span>
            <span className="font-mono text-[12px] text-muted-foreground">{shortId(membershipId)}</span>
          </div>
        )
      },
      meta: { width: "15rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <StatusBadge status={getValue<ShiftAssignmentStatus>()} toneMap={assignmentStatusTone} />
      ),
      meta: { align: "right", width: "10rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ getValue }) => (
        <span className="tabular-nums text-muted-foreground">
          {new Date(getValue<string>()).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
      meta: { align: "right", width: "9rem", cellClassName: "py-3" },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const assignment = row.original
        if (assignment.status !== ShiftAssignmentStatus.ACTIVE) return null
        return (
          <RowActions
            actions={[
              {
                key: "remove",
                label: "Remove",
                icon: Trash2,
                destructive: true,
                onSelect: () => onRemove(assignment),
              },
            ]}
          />
        )
      },
      meta: { align: "right", width: "4rem", cellClassName: "py-3" },
    },
  ]
}

/** Columns for the day clock-ins table. */
export function buildClockInColumns({
  employeeByMembershipId,
}: {
  employeeByMembershipId: Map<string, string>
}): ColumnDef<WorkSession>[] {
  return [
    {
      id: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium">
            {employeeByMembershipId.get(row.original.employeeMembershipId) ??
              shortId(row.original.employeeMembershipId)}
          </span>
          <span className="font-mono text-[12px] text-muted-foreground">
            {shortId(row.original.employeeMembershipId)}
          </span>
        </div>
      ),
      meta: { width: "16rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "actualClockInAt",
      header: "Clock in",
      cell: ({ getValue }) => (
        <span className="tabular-nums text-[13px]">{formatTime(getValue<string>())}</span>
      ),
      meta: { width: "8rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "actualClockOutAt",
      header: "Clock out",
      cell: ({ getValue }) => {
        const value = getValue<string | null>()
        return (
          <span className="tabular-nums text-[13px]">
            {value ? formatTime(value) : <span className="text-muted-foreground">Open</span>}
          </span>
        )
      },
      meta: { width: "8rem", cellClassName: "py-3" },
    },
    {
      id: "hours",
      header: "Hours",
      cell: ({ row }) => (
        <span className="tabular-nums text-[13px] text-muted-foreground">
          {row.original.actualClockOutAt
            ? formatDuration(row.original.actualClockInAt, row.original.actualClockOutAt)
            : "—"}
        </span>
      ),
      meta: { align: "right", width: "8rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <Badge tone="outline" className="uppercase">
          {getValue<WorkSessionStatus>().replaceAll("_", " ")}
        </Badge>
      ),
      meta: { align: "right", width: "11rem", cellClassName: "py-3" },
    },
    {
      id: "exceptions",
      header: "Flags",
      cell: ({ row }) =>
        row.original.exceptionCount > 0 ? (
          <Badge tone="warning" className="tabular-nums">
            {row.original.exceptionCount}
          </Badge>
        ) : (
          <span className="text-[13px] text-muted-foreground">—</span>
        ),
      meta: { align: "right", width: "6rem", cellClassName: "py-3" },
    },
  ]
}
