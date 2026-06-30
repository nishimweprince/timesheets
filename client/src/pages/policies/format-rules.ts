import {
  PolicyEnforcement,
  type AttendancePolicyRules,
} from '@/lib/api/policies.api'

const enforcementLabels: Record<PolicyEnforcement, string> = {
  [PolicyEnforcement.ALLOW]: 'Allow',
  [PolicyEnforcement.FLAG]: 'Flag',
  [PolicyEnforcement.REQUIRE_REASON]: 'Require reason',
  [PolicyEnforcement.REQUIRE_APPROVAL]: 'Require approval',
  [PolicyEnforcement.BLOCK]: 'Block',
}

export function formatEnforcement(value: PolicyEnforcement): string {
  return enforcementLabels[value] ?? value
}

export function formatShiftHours(minutes: number): string {
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

export function summarizePolicyRules(rules: AttendancePolicyRules): string[] {
  const lines: string[] = []

  if (rules.requireClockInPhoto) lines.push('Clock-in photo required')
  if (rules.requireClockOutPhoto) lines.push('Clock-out photo required')
  if (rules.requireLocation) lines.push('Location required')

  lines.push(`Unplanned clock-in: ${formatEnforcement(rules.unplannedClockIn)}`)
  lines.push(`Outside geofence: ${formatEnforcement(rules.outsideGeofence)}`)
  lines.push(
    `Grace: ${rules.earlyClockInGraceMinutes}m early · ${rules.lateClockInGraceMinutes}m late`,
  )
  lines.push(`Max shift: ${formatShiftHours(rules.maxShiftMinutes)}`)

  return lines
}

export function countActiveRequirements(rules: AttendancePolicyRules): number {
  let count = 0
  if (rules.requireClockInPhoto) count += 1
  if (rules.requireClockOutPhoto) count += 1
  if (rules.requireLocation) count += 1
  return count
}