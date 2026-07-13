import { toast } from "sonner"

import FormModal from "@/components/reusable/cards/FormModal"
import { useZodForm } from "@/components/reusable/forms"
import { showApiErrorToast } from "@/lib/api/errors"
import type { Employee, Team as TeamRecord } from "@/lib/api/employee-management.api"
import { fetchTeams, updateEmployee } from "@/states/features/employee-management.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

import { employeeSchema, employeeToValues } from "../team.constants"
import { EmployeeForm } from "./EmployeeForm"

export function EmployeeDialog({
  employee,
  employees,
  teams,
  onMutated,
  onClose,
}: {
  employee: Employee
  employees: Employee[]
  teams: TeamRecord[]
  onMutated?: () => void
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((state) => state.employeeManagement.status.updateEmployee === "loading")
  const form = useZodForm(employeeSchema, { defaultValues: employeeToValues(employee) })

  const onSubmit = form.handleSubmit(async (form_values) => {
    try {
      await dispatch(updateEmployee({
        membershipId: employee.membershipId,
        payload: {
          firstName: form_values.firstName,
          lastName: form_values.lastName,
          employeeNumber: form_values.employeeNumber || null,
          jobTitle: form_values.jobTitle || null,
          managerMembershipId: form_values.managerMembershipId === "none" ? null : form_values.managerMembershipId,
          roleName: form_values.roleName,
          status: form_values.status,
          teamIds: form_values.teamIds,
        },
      })).unwrap()
      toast.success("Employee updated")
      dispatch(fetchTeams())
      onMutated?.()
      onClose()
    } catch (err) {
      showApiErrorToast(err)
    }
  })

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={onSubmit}
      heading="Edit employee"
      description="Update profile details, team assignments, and account status."
      className="sm:min-w-0 sm:max-w-xl"
      submitLabel={isLoading ? "Saving" : "Save changes"}
      isLoading={isLoading}
    >
      <EmployeeForm form={form} employees={employees} teams={teams} mode="edit" currentMembershipId={employee.membershipId} />
    </FormModal>
  )
}

export default EmployeeDialog
