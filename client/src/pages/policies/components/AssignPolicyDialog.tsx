import * as React from "react"
import { Building2Icon } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import FormModal from "@/components/reusable/cards/FormModal"
import { FormSelect, useZodForm } from "@/components/reusable/forms"
import Combobox from "@/components/reusable/inputs/Combobox"
import Select from "@/components/reusable/inputs/Select"
import { Button } from "@/components/ui/button"
import { showApiErrorToast } from "@/lib/api/errors"
import {
  PolicyAssignmentScope,
  type AttendancePolicy,
  type PolicyAssignmentScope as AssignmentScope,
} from "@/lib/api/policies.api"
import { employeeName } from "@/lib/format"
import { validateAssignPolicyPayload } from "@/pages/policies/policies-validation"
import { fetchEmployees } from "@/states/features/employee-management.slice"
import { assignPolicy, fetchPolicies } from "@/states/features/policies.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

const schema = z.object({
  policyId: z.string(),
  scope: z.custom<AssignmentScope>(),
  scopeId: z.string(),
})

type Values = z.infer<typeof schema>
const defaultValues: Values = {
  policyId: "",
  scope: PolicyAssignmentScope.ORGANIZATION,
  scopeId: "",
}

export function AssignPolicyDialog({
  policies,
  policiesTotal,
  canReadEmployees,
  onMutated,
}: {
  policies: AttendancePolicy[]
  policiesTotal: number
  canReadEmployees: boolean
  onMutated?: () => void
}) {
  const dispatch = useAppDispatch()
  const lookupPolicies = useAppSelector((state) => state.policies.policies)
  const lookupStatus = useAppSelector((state) => state.policies.status.policies)
  const employees = useAppSelector((state) => state.employeeManagement.employees)
  const employeeStatus = useAppSelector((state) => state.employeeManagement.status.employees)
  const isLoading = useAppSelector((state) => state.policies.status.assignPolicy === "loading")
  const [open, setOpen] = React.useState(false)
  const form = useZodForm(schema, { defaultValues })
  const policyId = form.watch("policyId")
  const scope = form.watch("scope")
  const scopeId = form.watch("scopeId")

  React.useEffect(() => {
    if (!open) return
    if (lookupPolicies.length === 0 && lookupStatus !== "loading") dispatch(fetchPolicies())
    if (canReadEmployees && employees.length === 0 && employeeStatus !== "loading") {
      dispatch(fetchEmployees())
    }
  }, [
    canReadEmployees,
    dispatch,
    employeeStatus,
    employees.length,
    lookupPolicies.length,
    lookupStatus,
    open,
  ])

  const assignablePolicies = lookupPolicies.length > 0 ? lookupPolicies : policies
  const policyOptions = assignablePolicies.map((policy) => ({ label: policy.name, value: policy.id }))
  const employeeOptions = employees.map((employee) => ({
    label: `${employeeName(employee)} · ${employee.email}`,
    value: employee.membershipId,
  }))
  const scopeOptions = canReadEmployees
    ? [
        { label: "Organization-wide", value: PolicyAssignmentScope.ORGANIZATION },
        { label: "Single employee", value: PolicyAssignmentScope.EMPLOYEE },
      ]
    : [{ label: "Organization-wide", value: PolicyAssignmentScope.ORGANIZATION }]

  const close = () => {
    setOpen(false)
    form.reset(defaultValues)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      policyId: values.policyId,
      scope: values.scope,
      scopeId: values.scope === PolicyAssignmentScope.EMPLOYEE ? values.scopeId : undefined,
    }
    const error = validateAssignPolicyPayload(payload, { canAssignEmployees: canReadEmployees })
    if (error) {
      toast.error(error)
      if (!values.policyId) form.setError("policyId", { message: error })
      else form.setError("scopeId", { message: error })
      return
    }

    try {
      await dispatch(assignPolicy(payload)).unwrap()
      toast.success("Policy assigned")
      close()
      onMutated?.()
    } catch (err) {
      showApiErrorToast(err)
    }
  })

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="min-w-32"
        onClick={() => setOpen(true)}
        disabled={policiesTotal === 0}
      >
        <Building2Icon data-icon="inline-start" />
        Assign
      </Button>
      <FormModal
        isOpen={open}
        onClose={close}
        onSubmit={onSubmit}
        heading="Assign policy"
        description={
          canReadEmployees
            ? "Apply a policy organization-wide or to a single employee."
            : "Apply a policy organization-wide."
        }
        className="sm:min-w-0 sm:max-w-lg"
        submitLabel={isLoading ? "Assigning" : "Assign policy"}
        isLoading={isLoading}
        submitDisabled={
          !policyId ||
          (scope === PolicyAssignmentScope.EMPLOYEE && canReadEmployees && !scopeId)
        }
      >
        <FormSelect
          control={form.control}
          name="policyId"
          label="Policy"
          required
          options={policyOptions}
          placeholder="Select policy"
        />
        <Select
          label="Scope"
          required
          value={scope}
          onChange={(value) => {
            form.setValue("scope", value as AssignmentScope)
            form.setValue("scopeId", "")
            form.clearErrors("scopeId")
          }}
          options={scopeOptions}
          placeholder="Select scope"
        />
        {scope === PolicyAssignmentScope.EMPLOYEE && canReadEmployees ? (
          <Combobox
            value={scopeId}
            onChange={(value) => {
              form.setValue("scopeId", value)
              form.clearErrors("scopeId")
            }}
            options={employeeOptions}
            placeholder={employeeStatus === "loading" ? "Loading employees…" : "Select employee"}
            searchPlaceholder="Search employees"
          />
        ) : null}
        {form.formState.errors.scopeId ? (
          <p className="text-sm text-destructive">{form.formState.errors.scopeId.message}</p>
        ) : null}
      </FormModal>
    </>
  )
}

export default AssignPolicyDialog
