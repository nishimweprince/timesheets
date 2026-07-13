import type { ColumnDef } from "@tanstack/react-table"
import { EditIcon, RefreshCcwIcon } from "lucide-react"

import StatusBadge from "@/components/reusable/badges/StatusBadge"
import { RowActions } from "@/components/reusable/tables"
import { employeeName } from "@/lib/format"
import { MembershipStatus, type Employee, type Team as TeamRecord } from "@/lib/api/employee-management.api"
import { invitationLabel, membershipStatusTone, teamNames } from "./team.constants"

/** Columns for the employee directory table. */
export function buildEmployeeColumns({
  resendDisabled,
  onResend,
  onEdit,
}: {
  resendDisabled: boolean
  onResend: (employee: Employee) => void
  onEdit: (employee: Employee) => void
}): ColumnDef<Employee>[] {
  return [
    {
      id: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <div className="min-w-0 space-y-0.5">
          <div className="truncate font-medium leading-5">{employeeName(row.original)}</div>
          <div className="truncate text-[13px] leading-5 text-muted-foreground">{row.original.email}</div>
        </div>
      ),
      meta: { width: "17rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "jobTitle",
      header: "Profile",
      cell: ({ row }) => (
        <div className="min-w-0 space-y-0.5">
          <div className="truncate leading-5">{row.original.jobTitle || "-"}</div>
          <div className="truncate text-[13px] leading-5 text-muted-foreground">{row.original.employeeNumber || "No employee number"}</div>
        </div>
      ),
      meta: { width: "14rem", cellClassName: "py-3" },
    },
    {
      id: "teams",
      header: "Teams",
      cell: ({ row }) => <span className="line-clamp-2 text-[13px] leading-5 text-muted-foreground">{teamNames(row.original)}</span>,
      meta: { width: "16rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "roleName",
      header: "Role",
      cell: ({ getValue }) => <span>{getValue<string | null>() ?? "-"}</span>,
      meta: { width: "10rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={row.original.status} toneMap={membershipStatusTone} className="text-[13px]" />
          {row.original.invitation.status && ["expired", "pending"].includes(row.original.invitation.status) ? <span className="text-[13px] text-muted-foreground">{invitationLabel(row.original)}</span> : null}
        </div>
      ),
      meta: { align: "right", width: "9rem", cellClassName: "py-3" },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const actions = row.original.status === MembershipStatus.PENDING
          ? [{
              key: "resend",
              label: "Resend invitation",
              icon: RefreshCcwIcon,
              disabled: resendDisabled,
              onSelect: () => onResend(row.original),
            }]
          : []
        actions.push({
          key: "edit",
          label: "Edit employee",
          icon: EditIcon,
          disabled: false,
          onSelect: () => onEdit(row.original),
        })
        return <RowActions label="Employee actions" actions={actions} />
      },
      meta: { align: "right", width: "6.5rem", cellClassName: "py-3" },
    },
  ]
}

/** Columns for the team structure table. */
export function buildTeamColumns({
  employees,
  onEdit,
}: {
  employees: Employee[]
  onEdit: (team: TeamRecord) => void
}): ColumnDef<TeamRecord>[] {
  return [
    {
      accessorKey: "name",
      header: "Team",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      meta: { width: "16rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "managerMembershipId",
      header: "Manager",
      cell: ({ getValue }) => {
        const manager = employees.find((employee) => employee.membershipId === getValue<string | null>())
        return <span className="text-[13px] text-muted-foreground">{manager ? employeeName(manager) : "-"}</span>
      },
      meta: { width: "16rem", cellClassName: "py-3" },
    },
    {
      accessorKey: "memberCount",
      header: "Members",
      cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
      meta: { align: "right", width: "8rem", cellClassName: "py-3" },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          label="Team actions"
          actions={[{
            key: "edit",
            label: "Edit team",
            icon: EditIcon,
            onSelect: () => onEdit(row.original),
          }]}
        />
      ),
      meta: { align: "right", width: "4.5rem", cellClassName: "py-3" },
    },
  ]
}
