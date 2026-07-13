import { z } from "zod"

import type { BadgeTone } from "@/components/ui/badge"
import { employeeName } from "@/lib/format"
import { MembershipStatus, type Employee } from "@/lib/api/employee-management.api"

/** Which tab of the team area is rendered. */
export type Tab = "employees" | "teams"

export const roleOptions = ["Employee", "Manager", "Auditor", "Organization Admin"]
export const roleSelectOptions = roleOptions.map((role) => ({ label: role, value: role }))
export const statusOptions = [
  { label: "Pending", value: MembershipStatus.PENDING },
  { label: "Active", value: MembershipStatus.ACTIVE },
  { label: "Inactive", value: MembershipStatus.INACTIVE },
]

/** Membership status -> badge tone, shared by the employee table. */
export const membershipStatusTone: Record<MembershipStatus, BadgeTone> = {
  [MembershipStatus.ACTIVE]: "success",
  [MembershipStatus.PENDING]: "warning",
  [MembershipStatus.INACTIVE]: "default",
}

/** Form schema shared by the invite and edit employee dialogs. */
export const employeeSchema = z.object({
  email: z.email("Enter a valid email address"),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  employeeNumber: z.string(),
  jobTitle: z.string(),
  managerMembershipId: z.string(),
  roleName: z.string(),
  status: z.nativeEnum(MembershipStatus),
  teamIds: z.array(z.string()),
})

export type EmployeeFormValues = z.infer<typeof employeeSchema>

export function emptyEmployeeValues(): EmployeeFormValues {
  return {
    email: "",
    firstName: "",
    lastName: "",
    employeeNumber: "",
    jobTitle: "",
    managerMembershipId: "none",
    roleName: "Employee",
    status: MembershipStatus.PENDING,
    teamIds: [],
  }
}

export function employeeToValues(employee: Employee): EmployeeFormValues {
  return {
    email: employee.email,
    firstName: employee.firstName,
    lastName: employee.lastName,
    employeeNumber: employee.employeeNumber ?? "",
    jobTitle: employee.jobTitle ?? "",
    managerMembershipId: employee.managerMembershipId ?? "none",
    roleName: employee.roleName ?? "Employee",
    status: employee.status,
    teamIds: employee.teams.map((team) => team.id),
  }
}

export function invitationLabel(employee: Employee) {
  if (employee.status !== MembershipStatus.PENDING) return "-"
  if (employee.invitation.status === "expired") return "Expired"
  return "Pending"
}

export function teamNames(employee: Employee) {
  return employee.teams.length > 0 ? employee.teams.map((team) => team.name).join(", ") : "-"
}

export function employeeOptions(
  employees: Pick<Employee, "membershipId" | "firstName" | "lastName" | "email">[],
) {
  return [
    { label: "No manager", value: "none" },
    ...employees.map((employee) => ({
      label: `${employeeName(employee)} · ${employee.email}`,
      value: employee.membershipId,
    })),
  ]
}

export function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}
