import { forwardRef, useMemo, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { SkeletonLoader } from './Loader'

type Option = {
  label: string
  value: string
  disabled?: boolean
}

interface ComboboxProps {
  options?: Option[]
  placeholder?: string
  searchPlaceholder?: string
  onChange?: (value: string) => void
  label?: string
  required?: boolean
  labelClassName?: string
  className?: string
  inputClassName?: string
  optionsClassName?: string
  selectedValueClassName?: string
  value?: string
  defaultValue?: string
  isLoading?: boolean
  readOnly?: boolean
  error?: string
  helpText?: string
}

const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      options = [],
      placeholder = 'Select option',
      searchPlaceholder = 'Search option',
      onChange,
      label,
      required = false,
      labelClassName,
      className,
      inputClassName,
      optionsClassName,
      selectedValueClassName,
      value,
      defaultValue,
      isLoading = false,
      readOnly = false,
      error,
      helpText,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const selectedValue = value ?? defaultValue ?? ''
    const selectedOption = options.find((option) => option.value === selectedValue)
    const filteredOptions = useMemo(() => {
      if (!searchTerm) return options
      return options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }, [options, searchTerm])

    return (
      <Field>
        {label ? (
          <FieldLabel className={cn('font-medium text-foreground', labelClassName)}>
            {label}
            {required ? <span className="text-destructive">*</span> : null}
          </FieldLabel>
        ) : null}

        <PopoverPrimitive.Root
          open={open}
          onOpenChange={(nextOpen) => {
            if (!readOnly) setOpen(nextOpen)
          }}
        >
          <PopoverPrimitive.Trigger asChild>
            {isLoading ? (
              <SkeletonLoader type="input" />
            ) : (
              <Button
                ref={ref}
                type="button"
                variant="outline"
                aria-expanded={open}
                aria-invalid={!!error}
                disabled={readOnly}
                className={cn(
                  'h-11 w-full justify-between rounded-none border-field-border bg-field px-4 text-left text-sm font-normal hover:bg-field-hover focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20',
                  className,
                )}
              >
                <span
                  className={cn(
                    'block min-w-0 flex-1 truncate',
                    selectedOption ? 'text-foreground' : 'text-placeholder',
                    selectedValueClassName,
                  )}
                >
                  {selectedOption?.label ?? placeholder}
                </span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
              </Button>
            )}
          </PopoverPrimitive.Trigger>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              sideOffset={4}
              align="start"
              className="z-[500000] w-[var(--radix-popover-trigger-width)] rounded-none border border-field-border bg-popover p-1 text-popover-foreground shadow-sm"
            >
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={searchPlaceholder}
                className={cn(
                  'mb-1 h-10 w-full rounded-none border border-field-border bg-field px-3 text-sm outline-none placeholder:text-placeholder focus:border-primary focus:ring-1 focus:ring-primary/30',
                  inputClassName,
                )}
              />
              <div className="max-h-56 overflow-y-auto">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={option.disabled}
                      className={cn(
                        'flex h-9 w-full items-center gap-2 rounded-none px-3 text-left text-sm outline-none transition-colors hover:bg-muted focus:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
                        optionsClassName,
                      )}
                      onClick={() => {
                        onChange?.(option.value)
                        setSearchTerm('')
                        setOpen(false)
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      <Check
                        className={cn(
                          'size-3.5 shrink-0 text-primary',
                          selectedValue === option.value ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                    No option found.
                  </div>
                )}
              </div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>

        {error && <FieldError>{error}</FieldError>}
        {!error && helpText && <FieldDescription>{helpText}</FieldDescription>}
      </Field>
    )
  },
)

Combobox.displayName = 'Combobox'

export default Combobox
