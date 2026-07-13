import * as React from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import FormModal from "@/components/reusable/cards/FormModal"
import { useZodForm, FormInput, FormSelect } from "@/components/reusable/forms"
import { showApiErrorToast } from "@/lib/api/errors"
import { validateCreateWorkSitePayload } from "@/pages/policies/policies-validation"
import { createWorkSite } from "@/states/features/policies.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { timezoneOptions } from "../policies.constants"

const schema = z
  .object({ name: z.string(), timezone: z.string() })
  .superRefine((value, ctx) => {
    const error = validateCreateWorkSitePayload({ name: value.name, timezone: value.timezone })
    if (error) ctx.addIssue({ code: "custom", path: ["name"], message: error })
  })

type Values = z.infer<typeof schema>

const defaultValues: Values = { name: "", timezone: "America/Chicago" }

export function CreateWorkSiteDialog({ onMutated }: { onMutated?: () => void }) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((state) => state.policies.status.createWorkSite === "loading")
  const [open, setOpen] = React.useState(false)

  const form = useZodForm(schema, { defaultValues })
  const name = form.watch("name")

  const close = () => {
    setOpen(false)
    form.reset(defaultValues)
  }

  const onSubmit = form.handleSubmit(
    async (values) => {
      try {
        await dispatch(createWorkSite({ name: values.name.trim(), timezone: values.timezone })).unwrap()
        toast.success("Work site created")
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
        New site
      </Button>
      <FormModal
        isOpen={open}
        onClose={close}
        onSubmit={onSubmit}
        heading="New work site"
        description="Register a location your team clocks in from."
        className="sm:min-w-0 sm:max-w-md"
        submitLabel={isLoading ? "Creating" : "Create site"}
        isLoading={isLoading}
        submitDisabled={!name.trim()}
      >
        <FormInput
          control={form.control}
          name="name"
          label="Site name"
          required
          placeholder="e.g. Main clinic"
        />
        <FormSelect
          control={form.control}
          name="timezone"
          label="Timezone"
          options={timezoneOptions}
          placeholder="Select timezone"
        />
      </FormModal>
    </>
  )
}

export default CreateWorkSiteDialog
