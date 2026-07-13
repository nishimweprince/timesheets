import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useZodForm } from "@/components/reusable/forms"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { overrideInstance } from "@/states/features/scheduling.slice"
import type { ShiftInstance } from "@/lib/api/scheduling.api"
import { showApiErrorToast } from "@/lib/api/errors"
import { toLocalDatetime } from "../scheduling.constants"

const overrideSchema = z.object({
  startAt: z.string().min(1),
  endAt: z.string().min(1),
})

/** Inline editor for adjusting a single generated shift's start/end times. */
export function OverrideInstanceForm({
  instance,
  onOpenChange,
  onDone,
}: {
  instance: ShiftInstance
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((s) => s.scheduling.status.overrideInstance === "loading")

  const form = useZodForm(overrideSchema, {
    defaultValues: {
      startAt: toLocalDatetime(instance.startAt),
      endAt: toLocalDatetime(instance.endAt),
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await dispatch(
        overrideInstance({
          id: instance.id,
          payload: {
            startAt: new Date(values.startAt).toISOString(),
            endAt: new Date(values.endAt).toISOString(),
          },
        }),
      ).unwrap()
      onOpenChange(false)
      onDone()
    } catch (err) {
      showApiErrorToast(err)
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-[13px]">Start</Label>
        <Input required type="datetime-local" className="w-full min-w-0" {...form.register("startAt")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[13px]">End</Label>
        <Input required type="datetime-local" className="w-full min-w-0" {...form.register("endAt")} />
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-end">
        <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={isLoading}>
          {isLoading ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}

export default OverrideInstanceForm
