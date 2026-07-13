import * as React from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import FormModal from "@/components/reusable/cards/FormModal"
import { useZodForm } from "@/components/reusable/forms"
import Combobox from "@/components/reusable/inputs/Combobox"
import DatePicker from "@/components/reusable/inputs/DatePicker"
import { toIsoDate, employeeName } from "@/lib/format"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { createPatternAssignment } from "@/states/features/scheduling.slice"
import { fetchEmployees } from "@/states/features/employee-management.slice"
import { showApiErrorToast } from "@/lib/api/errors"
import { daysLabel } from "../scheduling.constants"

const assignSchema = z.object({
  shiftPatternId: z.string().min(1),
  employeeMembershipId: z.string().min(1),
  effectiveFrom: z.date().optional(),
  effectiveUntil: z.date().optional(),
})

type AssignValues = z.infer<typeof assignSchema>

const defaultValues: AssignValues = {
  shiftPatternId: "",
  employeeMembershipId: "",
  effectiveFrom: undefined,
  effectiveUntil: undefined,
}

export function AssignEmployeeDialog({ onCreated }: { onCreated: () => void }) {
  const dispatch = useAppDispatch()
  const patterns = useAppSelector((s) => s.scheduling.patterns)
  const employees = useAppSelector((s) => s.employeeManagement.employees)
  const isLoading = useAppSelector((s) => s.scheduling.status.assign === "loading")
  const [open, setOpen] = React.useState(false)

  const form = useZodForm(assignSchema, { defaultValues })
  const shiftPatternId = form.watch("shiftPatternId")
  const employeeMembershipId = form.watch("employeeMembershipId")
  const effectiveFrom = form.watch("effectiveFrom")
  const effectiveUntil = form.watch("effectiveUntil")

  const activePatterns = React.useMemo(
    () => patterns.filter((pattern) => pattern.active),
    [patterns],
  )
  const shiftOptions = React.useMemo(
    () =>
      activePatterns.map((pattern) => ({
        label: `${pattern.name} · ${daysLabel(pattern.daysOfWeek)} · ${pattern.startTime} – ${pattern.endTime}`,
        value: pattern.id,
      })),
    [activePatterns],
  )
  const employeeOptions = React.useMemo(
    () =>
      employees.map((employee) => ({
        label: `${employeeName(employee)} · ${employee.email}`,
        value: employee.membershipId,
      })),
    [employees],
  )

  React.useEffect(() => {
    if (open && employees.length === 0) dispatch(fetchEmployees())
  }, [dispatch, employees.length, open])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await dispatch(
        createPatternAssignment({
          shiftPatternId: values.shiftPatternId,
          employeeMembershipId: values.employeeMembershipId,
          ...(values.effectiveFrom ? { effectiveFrom: toIsoDate(values.effectiveFrom) } : {}),
          ...(values.effectiveUntil ? { effectiveUntil: toIsoDate(values.effectiveUntil) } : {}),
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
        Assign Employee
      </Button>
      <FormModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={onSubmit}
        heading="Assign employee to shift pattern"
        className="sm:min-w-0 sm:max-w-sm"
        submitLabel={isLoading ? "Assigning…" : "Assign"}
        isLoading={isLoading}
        submitDisabled={!shiftPatternId || !employeeMembershipId}
      >
        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px]">Shift pattern</Label>
          {activePatterns.length > 0 ? (
            <Combobox
              value={shiftPatternId}
              onChange={(value) => form.setValue("shiftPatternId", value)}
              options={shiftOptions}
              placeholder="Select a shift pattern"
              searchPlaceholder="Search shift patterns"
            />
          ) : (
            <Input
              required
              placeholder="Shift pattern ID"
              className="font-mono"
              {...form.register("shiftPatternId")}
            />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px]">Employee</Label>
          {employeeOptions.length > 0 ? (
            <Combobox
              value={employeeMembershipId}
              onChange={(value) => form.setValue("employeeMembershipId", value)}
              options={employeeOptions}
              placeholder="Select an employee"
              searchPlaceholder="Search employees"
            />
          ) : (
            <Input
              required
              placeholder="Employee membership ID"
              className="font-mono"
              {...form.register("employeeMembershipId")}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">Starts on (optional)</Label>
            <DatePicker
              value={effectiveFrom}
              onChange={(date) => form.setValue("effectiveFrom", date)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px]">Ends on (optional)</Label>
            <DatePicker
              value={effectiveUntil}
              onChange={(date) => form.setValue("effectiveUntil", date)}
              fromDate={effectiveFrom}
            />
          </div>
        </div>
      </FormModal>
    </>
  )
}

export default AssignEmployeeDialog
