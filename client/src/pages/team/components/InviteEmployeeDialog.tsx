import * as React from "react"
import { MailIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import FormModal from "@/components/reusable/cards/FormModal"
import { useZodForm } from "@/components/reusable/forms"
import { showApiErrorToast } from "@/lib/api/errors"
import type { Employee, Team as TeamRecord } from "@/lib/api/employee-management.api"
import { fetchTeams, inviteEmployee } from "@/states/features/employee-management.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

import { emptyEmployeeValues, employeeSchema } from "../team.constants"
import { EmployeeForm } from "./EmployeeForm"

export function InviteEmployeeDialog({
  employees,
  teams,
  onMutated,
}: {
  employees: Employee[]
  teams: TeamRecord[]
  onMutated?: () => void
}) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((state) => state.employeeManagement.status.invite === "loading")
  const [open, setOpen] = React.useState(false)

  const form = useZodForm(employeeSchema, { defaultValues: emptyEmployeeValues() })

  const close = () => {
    setOpen(false)
    form.reset(emptyEmployeeValues())
  }

  const onSubmit = form.handleSubmit(async (form_values) => {
    try {
      await dispatch(inviteEmployee({
        email: form_values.email,
        firstName: form_values.firstName,
        lastName: form_values.lastName,
        employeeNumber: form_values.employeeNumber || undefined,
        jobTitle: form_values.jobTitle || undefined,
        managerMembershipId: form_values.managerMembershipId === "none" ? undefined : form_values.managerMembershipId,
        roleName: form_values.roleName,
        teamIds: form_values.teamIds,
      })).unwrap()
      toast.success("Employee invited", { description: "The onboarding email has been sent." })
      form.reset(emptyEmployeeValues())
      setOpen(false)
      dispatch(fetchTeams())
      onMutated?.()
    } catch (err) {
      showApiErrorToast(err)
    }
  })

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <MailIcon data-icon="inline-start" />
        Invite
      </Button>
      <FormModal
        isOpen={open}
        onClose={close}
        onSubmit={onSubmit}
        heading="Invite employee"
        description="Send an onboarding link and prepare their team profile."
        className="sm:min-w-0 sm:max-w-xl"
        submitLabel={isLoading ? "Sending" : "Send invite"}
        isLoading={isLoading}
      >
        <EmployeeForm form={form} employees={employees} teams={teams} mode="invite" />
      </FormModal>
    </>
  )
}

export default InviteEmployeeDialog
