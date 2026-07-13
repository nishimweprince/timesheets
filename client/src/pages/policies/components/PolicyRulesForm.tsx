import Input from "@/components/reusable/inputs/Input"
import Select from "@/components/reusable/inputs/Select"
import { PolicyEnforcement, type AttendancePolicyRules } from "@/lib/api/policies.api"
import { enforcementOptions } from "../policies.constants"

/** Editor for a policy's capture, exception, and timing rules. */
export function PolicyRulesForm({
  rules,
  onChange,
}: {
  rules: AttendancePolicyRules
  onChange: (rules: AttendancePolicyRules) => void
}) {
  const update = <K extends keyof AttendancePolicyRules>(key: K, value: AttendancePolicyRules[K]) => {
    onChange({ ...rules, [key]: value })
  }

  return (
    <div className="grid gap-4 border border-border/70 p-4 sm:grid-cols-2">
      <p className="sm:col-span-2 text-sm font-medium text-foreground">Capture requirements</p>

      <Input
        type="checkbox"
        label="Require clock-in photo"
        checked={rules.requireClockInPhoto}
        onCheckedChange={(checked) => update("requireClockInPhoto", checked)}
      />
      <Input
        type="checkbox"
        label="Require clock-out photo"
        checked={rules.requireClockOutPhoto}
        onCheckedChange={(checked) => update("requireClockOutPhoto", checked)}
      />
      <Input
        type="checkbox"
        label="Require location"
        checked={rules.requireLocation}
        onCheckedChange={(checked) => update("requireLocation", checked)}
      />

      <p className="sm:col-span-2 mt-2 text-sm font-medium text-foreground">Exception handling</p>

      <Select
        label="Unplanned clock-in"
        value={rules.unplannedClockIn}
        onChange={(value) => update("unplannedClockIn", value as PolicyEnforcement)}
        options={enforcementOptions}
      />
      <Select
        label="Outside geofence"
        value={rules.outsideGeofence}
        onChange={(value) => update("outsideGeofence", value as PolicyEnforcement)}
        options={enforcementOptions}
      />

      <p className="sm:col-span-2 mt-2 text-sm font-medium text-foreground">Timing</p>

      <Input
        label="Early clock-in grace (minutes)"
        type="number"
        min={0}
        value={String(rules.earlyClockInGraceMinutes)}
        onChange={(event) => update("earlyClockInGraceMinutes", Number(event.target.value))}
      />
      <Input
        label="Late clock-in grace (minutes)"
        type="number"
        min={0}
        value={String(rules.lateClockInGraceMinutes)}
        onChange={(event) => update("lateClockInGraceMinutes", Number(event.target.value))}
      />
      <Input
        label="Max shift length (minutes)"
        type="number"
        min={1}
        value={String(rules.maxShiftMinutes)}
        onChange={(event) => update("maxShiftMinutes", Number(event.target.value))}
        containerClassName="sm:col-span-2"
      />
    </div>
  )
}

export default PolicyRulesForm
