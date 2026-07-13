import * as React from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import FormModal from "@/components/reusable/cards/FormModal"
import Combobox from "@/components/reusable/inputs/Combobox"
import { useZodForm } from "@/components/reusable/forms"
import { showApiErrorToast } from "@/lib/api/errors"
import type { Employee, Team as TeamRecord } from "@/lib/api/employee-management.api"
import { createTeam, updateTeam } from "@/states/features/employee-management.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

import { employeeOptions } from "../team.constants"
import { Field } from "./Field"

const teamSchema = z.object({
  name: z.string(),
  managerMembershipId: z.string(),
})

type TeamFormValues = z.infer<typeof teamSchema>

export function TeamDialog({
  employees,
  mode,
  team,
  onMutated,
  onClose,
}: {
  employees: Employee[]
  mode: "create" | "edit"
  team?: TeamRecord
  onMutated?: () => void
  onClose?: () => void
}) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((state) =>
    mode === "create"
      ? state.employeeManagement.status.createTeam === "loading"
      : state.employeeManagement.status.updateTeam === "loading",
  )
  const [open, setOpen] = React.useState(mode === "edit")
  const defaultValues: TeamFormValues = {
    name: team?.name ?? "",
    managerMembershipId: team?.managerMembershipId ?? "none",
  }
  const form = useZodForm(teamSchema, { defaultValues })
  const managerMembershipId = form.watch("managerMembershipId")
  const managerOptions = React.useMemo(() => employeeOptions(employees), [employees])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        name: values.name,
        managerMembershipId: values.managerMembershipId === "none" ? null : values.managerMembershipId,
      }
      if (mode === "create") {
        await dispatch(createTeam(payload)).unwrap()
        toast.success("Team created")
      } else if (team) {
        await dispatch(updateTeam({ teamId: team.id, payload })).unwrap()
        toast.success("Team updated")
      }
      form.reset(defaultValues)
      setOpen(false)
      onMutated?.()
      onClose?.()
    } catch (err) {
      showApiErrorToast(err)
    }
  })

  return (
    <>
      {mode === "create" ? (
        <Button size="sm" onClick={() => setOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New team
        </Button>
      ) : null}
      <FormModal
        isOpen={open}
        onClose={() => {
          setOpen(false)
          form.reset(defaultValues)
          onClose?.()
        }}
        onSubmit={onSubmit}
        heading={mode === "create" ? "New team" : "Edit team"}
        description="Set the team name and its operating manager."
        className="sm:min-w-0 sm:max-w-md"
        submitLabel={isLoading ? "Saving" : mode === "create" ? "Create team" : "Save changes"}
        isLoading={isLoading}
      >
        <div className="grid gap-4">
          <Field label="Team name">
            <Input required {...form.register("name")} />
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
        </div>
      </FormModal>
    </>
  )
}

export default TeamDialog
