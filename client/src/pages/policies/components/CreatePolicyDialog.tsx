import * as React from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import FormModal from "@/components/reusable/cards/FormModal"
import { useZodForm, FormInput } from "@/components/reusable/forms"
import { showApiErrorToast } from "@/lib/api/errors"
import { DEFAULT_POLICY_RULES, type AttendancePolicyRules } from "@/lib/api/policies.api"
import { validateCreatePolicyPayload } from "@/pages/policies/policies-validation"
import { createPolicy } from "@/states/features/policies.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { PolicyRulesForm } from "./PolicyRulesForm"

const schema = z
  .object({
    name: z.string(),
    rules: z.custom<AttendancePolicyRules>(),
  })
  .superRefine((value, ctx) => {
    const error = validateCreatePolicyPayload({ name: value.name, rules: value.rules })
    if (error) ctx.addIssue({ code: "custom", path: ["name"], message: error })
  })

type Values = z.infer<typeof schema>

const defaultValues: Values = { name: "", rules: DEFAULT_POLICY_RULES }

export function CreatePolicyDialog({ onMutated }: { onMutated?: () => void }) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((state) => state.policies.status.createPolicy === "loading")
  const [open, setOpen] = React.useState(false)

  const form = useZodForm(schema, { defaultValues })
  const name = form.watch("name")
  const rules = form.watch("rules")

  const close = () => {
    setOpen(false)
    form.reset(defaultValues)
  }

  const onSubmit = form.handleSubmit(
    async (values) => {
      try {
        await dispatch(createPolicy({ name: values.name.trim(), rules: values.rules })).unwrap()
        toast.success("Policy created")
        close()
        onMutated?.()
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
    <>
      <Button size="sm" className="min-w-32" onClick={() => setOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        New policy
      </Button>
      <FormModal
        isOpen={open}
        onClose={close}
        onSubmit={onSubmit}
        heading="New attendance policy"
        description="Set the rules that govern clock-in validation and exception handling."
        className="sm:min-w-0 sm:max-w-2xl"
        submitLabel={isLoading ? "Creating" : "Create policy"}
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
        <PolicyRulesForm rules={rules} onChange={(next) => form.setValue("rules", next)} />
      </FormModal>
    </>
  )
}

export default CreatePolicyDialog
