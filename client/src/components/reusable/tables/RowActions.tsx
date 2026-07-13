import { useState, type ReactNode } from "react"
import { MoreHorizontal, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ConfirmationModal from "@/components/reusable/cards/ConfirmationModal"
import { cn } from "@/lib/utils"

export interface RowAction {
  key: string
  label: ReactNode
  icon?: LucideIcon
  onSelect: () => void
  disabled?: boolean
  destructive?: boolean
  /** Insert a separator above this item. */
  separatorBefore?: boolean
  /**
   * When set, selecting the action opens a confirmation modal and only runs
   * `onSelect` once confirmed. Use for destructive/irreversible actions.
   */
  confirm?: {
    heading: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
  }
}

export interface RowActionsProps {
  actions: RowAction[]
  /** Screen-reader label / tooltip for the trigger. */
  label?: string
  /** Optional heading shown at the top of the menu. */
  menuLabel?: ReactNode
  align?: "start" | "center" | "end"
  className?: string
}

/**
 * Standard "⋯" row-actions menu for data-table action columns.
 * Handles the destructive styling and (optional) confirmation flow so pages
 * don't re-implement a DropdownMenu + ConfirmationModal each time.
 */
export function RowActions({
  actions,
  label = "Open actions",
  menuLabel,
  align = "end",
  className,
}: RowActionsProps) {
  const [pending, setPending] = useState<RowAction | null>(null)

  const handleSelect = (action: RowAction) => {
    if (action.confirm) {
      setPending(action)
      return
    }
    action.onSelect()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className={className}
            aria-label={label}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="min-w-40">
          {menuLabel ? <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel> : null}
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <div key={action.key}>
                {action.separatorBefore ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  disabled={action.disabled}
                  onSelect={() => handleSelect(action)}
                  className={cn(
                    action.destructive &&
                      "text-destructive focus:text-destructive",
                  )}
                >
                  {Icon ? <Icon /> : null}
                  {action.label}
                </DropdownMenuItem>
              </div>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {pending?.confirm ? (
        <ConfirmationModal
          isOpen
          heading={pending.confirm.heading}
          description={pending.confirm.description}
          confirmLabel={pending.confirm.confirmLabel}
          cancelLabel={pending.confirm.cancelLabel}
          confirmVariant={pending.destructive ? "destructive" : "default"}
          onClose={() => setPending(null)}
          onConfirm={() => {
            pending.onSelect()
            setPending(null)
          }}
        />
      ) : null}
    </>
  )
}

export default RowActions
