import { toast } from "sonner"
import { z } from "zod"

import FormModal from "@/components/reusable/cards/FormModal"
import { FormInput, useZodForm } from "@/components/reusable/forms"
import Input from "@/components/reusable/inputs/Input"
import { showApiErrorToast } from "@/lib/api/errors"
import type { AttendancePolicy, AttendancePolicyRules } from "@/lib/api/policies.api"
import { validateUpdatePolicyPayload } from "@/pages/policies/policies-validation"
import { updatePolicy } from "@/states/features/policies.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { PolicyRulesForm } from "./PolicyRulesForm"

const schema = z
  .object({
    name: z.string(),
    active: z.boolean(),
    rules: z.custom<AttendancePolicyRules>(),
  })
  .superRefine((value, ctx) => {
    const error = validateUpdatePolicyPayload(value)
    if (error) ctx.addIssue({ code: "custom", path: ["name"], message: error })
  })

type Values = z.infer<typeof schema>

export function EditPolicyDialog({
  policy,
  onClose,
  onMutated,
}: {
  policy: AttendancePolicy
  onClose: () => void
  onMutated?: () => void
}) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((state) => state.policies.status.updatePolicy === "loading")
  const form = useZodForm(schema, {
    defaultValues: { name: policy.name, active: policy.active, rules: policy.rules },
  })
  const name = form.watch("name")
  const active = form.watch("active")
  const rules = form.watch("rules")

  const onSubmit = form.handleSubmit(
    async (values: Values) => {
      try {
        await dispatch(
          updatePolicy({
            policyId: policy.id,
            payload: { ...values, name: values.name.trim() },
          }),
        ).unwrap()
        toast.success("Policy updated")
        onMutated?.()
        onClose()
      } catch (err) {
        showApiErrorToast(err)
      }
    },
    (errors) => {
      const message = errors.name?.message
      if (message) toast.error(message)
    },
  )

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={onSubmit}
      heading="Edit attendance policy"
      description="Update the rules that govern clock-in validation and exception handling."
      className="sm:min-w-0 sm:max-w-2xl"
      submitLabel={isLoading ? "Saving" : "Save changes"}
      isLoading={isLoading}
      submitDisabled={!name.trim()}
    >
      <FormInput
        control={form.control}
        name="name"
        label="Policy name"
        required
        placeholder="e.g. Clinical floor — strict"
      />
      <Input
        type="checkbox"
        label="Active"
        checked={active}
        onCheckedChange={(checked) => form.setValue("active", checked)}
      />
      <PolicyRulesForm
        rules={rules}
        onChange={(next) => form.setValue("rules", next)}
      />
    </FormModal>
  )
}

export default EditPolicyDialog
