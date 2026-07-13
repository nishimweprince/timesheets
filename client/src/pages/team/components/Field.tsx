import * as React from "react"

import { Label } from "@/components/ui/label"

/** Labelled field wrapper used by the team dialogs. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-[13px]">{label}</Label>
      {children}
    </div>
  )
}

export default Field
