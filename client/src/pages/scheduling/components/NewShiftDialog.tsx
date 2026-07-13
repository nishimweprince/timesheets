import * as React from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import FormModal from "@/components/reusable/cards/FormModal"
import { useZodForm } from "@/components/reusable/forms"
import DatePicker from "@/components/reusable/inputs/DatePicker"
import { cn } from "@/lib/utils"
import { toIsoDate } from "@/lib/format"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { createPattern } from "@/states/features/scheduling.slice"
import { showApiErrorToast } from "@/lib/api/errors"
import { WEEKDAYS, WEEKDAY_PRESETS, type Recurrence } from "../scheduling.constants"

const newShiftSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  timezone: z.string(),
  recurrence: z.enum(["none", "weekly"]),
  daysOfWeek: z.array(z.number()),
  effectiveFrom: z.date({ message: "Please pick a start date" }),
  effectiveUntil: z.date().optional(),
})

type NewShiftValues = z.infer<typeof newShiftSchema>

const defaultValues: NewShiftValues = {
  name: "",
  startTime: "09:00",
  endTime: "17:00",
  timezone: "",
  recurrence: "weekly",
  daysOfWeek: [1, 2, 3, 4, 5],
  effectiveFrom: new Date(),
  effectiveUntil: undefined,
}

export function NewShiftDialog({ onCreated }: { onCreated: () => void }) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector((s) => s.scheduling.status.createPattern === "loading")
  const [open, setOpen] = React.useState(false)

  const form = useZodForm(newShiftSchema, { defaultValues })
  const recurrence = form.watch("recurrence")
  const daysOfWeek = form.watch("daysOfWeek")
  const name = form.watch("name")
  const effectiveFrom = form.watch("effectiveFrom")
  const effectiveUntil = form.watch("effectiveUntil")

  const toggleDay = (iso: number) => {
    const next = daysOfWeek.includes(iso)
      ? daysOfWeek.filter((d) => d !== iso)
      : [...daysOfWeek, iso].sort((a, b) => a - b)
    form.setValue("daysOfWeek", next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const from = toIsoDate(values.effectiveFrom)
    const isRecurring = values.recurrence === "weekly" && values.daysOfWeek.length > 0
    const until = isRecurring
      ? values.effectiveUntil
        ? toIsoDate(values.effectiveUntil)
        : undefined
      : from
    const timezone = values.timezone.trim()
    try {
      await dispatch(
        createPattern({
          name: values.name,
          startTime: values.startTime,
          endTime: values.endTime,
          daysOfWeek: isRecurring ? values.daysOfWeek : [],
          effectiveFrom: from,
          effectiveUntil: until,
          ...(timezone ? { timezone } : {}),
        }),
      ).unwrap()
      setOpen(false)
      form.reset(defaultValues)
      onCreated()
    } catch (err) {
      showApiErrorToast(err)
    }
  })

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        New Shift
      </Button>
      <FormModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={onSubmit}
        heading="New shift"
        className="sm:min-w-0 sm:max-w-md"
        submitLabel={isLoading ? "Creating…" : "Create shift"}
        isLoading={isLoading}
        submitDisabled={!name || (recurrence === "weekly" && daysOfWeek.length === 0)}
      >
        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px]">Name</Label>
          <Input required placeholder="e.g. Morning Ward" {...form.register("name")} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">Start time</Label>
            <Input required type="time" {...form.register("startTime")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">End time</Label>
            <Input required type="time" {...form.register("endTime")} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px]">Timezone (optional)</Label>
          <Input placeholder="e.g. America/Chicago" {...form.register("timezone")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-[13px]">Repeat</Label>
          <div className="flex gap-2">
            {(["none", "weekly"] as Recurrence[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => form.setValue("recurrence", option)}
                className={cn(
                  "flex-1 h-9 border px-3 text-[13px] transition-colors",
                  recurrence === option
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {option === "none" ? "Does not repeat" : "Repeat weekly"}
              </button>
            ))}
          </div>
        </div>

        {recurrence === "weekly" && (
          <div className="flex flex-col gap-2">
            <Label className="text-[13px]">Days of week</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => {
                const active = daysOfWeek.includes(day.iso)
                return (
                  <button
                    key={day.iso}
                    type="button"
                    onClick={() => toggleDay(day.iso)}
                    className={cn(
                      "h-9 min-w-11 border px-2 text-[13px] transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-transparent text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={active}
                    aria-label={day.label}
                  >
                    {day.short}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => form.setValue("daysOfWeek", [...preset.days])}
                  className="h-7 border border-border bg-transparent px-2 text-[12px] text-muted-foreground hover:text-foreground"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">
              {recurrence === "none" ? "Date" : "Starts on"}
            </Label>
            <DatePicker
              value={effectiveFrom}
              onChange={(date) => form.setValue("effectiveFrom", date as Date)}
            />
          </div>
          {recurrence === "weekly" && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px]">Ends on (optional)</Label>
              <DatePicker
                value={effectiveUntil}
                onChange={(date) => form.setValue("effectiveUntil", date)}
                fromDate={effectiveFrom}
              />
            </div>
          )}
        </div>
      </FormModal>
    </>
  )
}

export default NewShiftDialog
