import { PolicyAssignmentScope, PolicyEnforcement } from "@/lib/api/policies.api"
import { formatEnforcement } from "@/pages/policies/format-rules"

/** Which sub-view of the policies area is rendered. */
export type Tab = "policies" | "work-sites"

/** Enforcement options offered in the policy rules form. */
export const enforcementOptions = Object.values(PolicyEnforcement).map((value) => ({
  label: formatEnforcement(value),
  value,
}))

/** Timezones offered when creating a work site. */
export const timezoneOptions = [
  { label: "America/Chicago (Central)", value: "America/Chicago" },
  { label: "America/New_York (Eastern)", value: "America/New_York" },
  { label: "America/Denver (Mountain)", value: "America/Denver" },
  { label: "America/Los_Angeles (Pacific)", value: "America/Los_Angeles" },
  { label: "UTC", value: "UTC" },
]

/** Human label for an assignment scope value. */
export function scopeLabel(scope: string): string {
  if (scope === PolicyAssignmentScope.ORGANIZATION) return "Organization"
  if (scope === PolicyAssignmentScope.EMPLOYEE) return "Employee"
  return scope.toLowerCase().replaceAll("_", " ")
}
