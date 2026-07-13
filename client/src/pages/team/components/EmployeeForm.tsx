import * as React from "react"
import type { UseFormReturn } from "react-hook-form"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Combobox from "@/components/reusable/inputs/Combobox"
import Select from "@/components/reusable/inputs/Select"
import { MembershipStatus, type Employee, type Team as TeamRecord } from "@/lib/api/employee-management.api"
import {
  employeeOptions,
  roleSelectOptions,
  statusOptions,
  toggleId,
  type EmployeeFormValues,
} from "../team.constants"
import { Field } from "./Field"

/** Shared field layout for the invite and edit employee dialogs. */
export function EmployeeForm({
  form,
  employees,
  teams,
  mode,
  currentMembershipId,
}: {
  form: UseFormReturn<EmployeeFormValues>
  employees: Employee[]
  teams: TeamRecord[]
  mode: "invite" | "edit"
  currentMembershipId?: string
}) {
  const managers = employees.filter((employee) => employee.membershipId !== currentMembershipId)
  const managerOptions = React.useMemo(() => employeeOptions(managers), [managers])

  const managerMembershipId = form.watch("managerMembershipId")
  const roleName = form.watch("roleName")
  const statusValue = form.watch("status")
  const teamIds = form.watch("teamIds")

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="First name">
        <Input required {...form.register("firstName")} />
      </Field>
      <Field label="Last name">
        <Input required {...form.register("lastName")} />
      </Field>
      <Field label="Email">
        <Input required type="email" disabled={mode === "edit"} {...form.register("email")} />
      </Field>
      <Field label="Employee number">
        <Input {...form.register("employeeNumber")} />
      </Field>
      <Field label="Job title">
        <Input {...form.register("jobTitle")} />
      </Field>
      <Field label="Manager">
        <Combobox
          value={managerMembershipId}
          onChange={(value) => form.setValue("managerMembershipId", value)}
          options={managerOptions}
          placeholder="Select manager"
          searchPlaceholder="Search managers"
        />
      </Field>
      <Field label="Role">
        <Select
          value={roleName}
          onChange={(value) => form.setValue("roleName", value)}
          options={roleSelectOptions}
          placeholder="Select role"
        />
      </Field>
      {mode === "edit" ? (
        <Field label="Status">
          <Select
            value={statusValue}
            onChange={(value) => form.setValue("status", value as MembershipStatus)}
            options={statusOptions}
            placeholder="Select status"
          />
        </Field>
      ) : null}
      <div className="sm:col-span-2">
        <Label className="text-[13px]">Teams</Label>
        <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto border border-border p-3 sm:grid-cols-2">
          {teams.length ? teams.map((team) => (
            <label key={team.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={teamIds.includes(team.id)}
                onCheckedChange={() => form.setValue("teamIds", toggleId(teamIds, team.id))}
              />
              <span className="truncate">{team.name}</span>
            </label>
          )) : (
            <p className="text-sm text-muted-foreground">Create teams after inviting employees.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmployeeForm
