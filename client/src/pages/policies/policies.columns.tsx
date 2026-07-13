import type { ColumnDef } from "@tanstack/react-table"
import { EditIcon } from "lucide-react"

import StatusBadge from "@/components/reusable/badges/StatusBadge"
import { RowActions } from "@/components/reusable/tables"
import type { AttendancePolicy, WorkSite } from "@/lib/api/policies.api"
import { countActiveRequirements, summarizePolicyRules } from "@/pages/policies/format-rules"

const activeToneMap = { active: "success", inactive: "muted" } as const

/** Columns for the attendance-policies table. */
export function buildPolicyColumns({
  canManage,
  onEdit,
}: {
  canManage: boolean
  onEdit: (policy: AttendancePolicy) => void
}): ColumnDef<AttendancePolicy>[] {
  return [
    {
      accessorKey: "name",
      header: "Policy",
      cell: ({ row }) => (
        <div className="min-w-0 space-y-0.5">
          <div className="truncate text-sm font-medium leading-5">{row.original.name}</div>
          <div className="truncate text-[13px] leading-5 text-muted-foreground">
            {countActiveRequirements(row.original.rules)} active requirements
          </div>
        </div>
      ),
      meta: { width: "16rem", cellClassName: "py-3" },
    },
    {
      id: "rules",
      header: "Rules",
      cell: ({ row }) => (
        <ul className="space-y-1 text-[13px] leading-5 text-muted-foreground">
          {summarizePolicyRules(row.original.rules).slice(0, 3).map((line) => (
            <li key={line} className="line-clamp-2">{line}</li>
          ))}
        </ul>
      ),
      meta: { width: "28rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.active ? "active" : "inactive"}
          toneMap={activeToneMap}
          uppercase={false}
          className="text-[13px]"
        />
      ),
      meta: { align: "right", width: "8rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ getValue }) => (
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {new Date(getValue<string>()).toLocaleDateString()}
        </span>
      ),
      meta: { align: "right", width: "9rem", cellClassName: "py-3" },
    },
    ...(canManage
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }: { row: { original: AttendancePolicy } }) => (
              <RowActions
                label="Policy actions"
                actions={[{
                  key: "edit",
                  label: "Edit policy",
                  icon: EditIcon,
                  onSelect: () => onEdit(row.original),
                }]}
              />
            ),
            meta: { align: "right" as const, width: "4.5rem", cellClassName: "py-3" },
          },
        ]
      : []),
  ]
}

/** Columns for the work-sites table. */
export function buildWorkSiteColumns(): ColumnDef<WorkSite>[] {
  return [
    {
      accessorKey: "name",
      header: "Site",
      cell: ({ row }) => (
        <div className="min-w-0 space-y-0.5">
          <div className="truncate text-sm font-medium leading-5">{row.original.name}</div>
          <div className="truncate text-[13px] leading-5 text-muted-foreground">Work location</div>
        </div>
      ),
      meta: { width: "18rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "timezone",
      header: "Timezone",
      cell: ({ getValue }) => (
        <span className="font-mono text-[13px] leading-5 text-muted-foreground">{getValue<string>()}</span>
      ),
      meta: { width: "18rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "createdAt",
      header: "Added",
      cell: ({ getValue }) => (
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {new Date(getValue<string>()).toLocaleDateString()}
        </span>
      ),
      meta: { align: "right", width: "9rem", cellClassName: "py-3" },
    },
  ]
}
