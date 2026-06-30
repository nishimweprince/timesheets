import { forwardRef, type ReactNode, useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { SkeletonLoader } from './Loader'

type Option = {
  label: string
  value: string
  disabled?: boolean
}

interface SelectProps {
  label?: string | number | ReactNode
  options?: Option[]
  defaultValue?: string
  placeholder?: string
  className?: string
  contentClassName?: string
  onChange?: (value: string) => void
  value?: string
  required?: boolean
  labelClassName?: string
  name?: string
  searchable?: boolean
  readOnly?: boolean
  isLoading?: boolean
  error?: string
  helpText?: string
}

const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      label,
      required = false,
      labelClassName,
      name,
      searchable = false,
      readOnly = false,
      options = [],
      defaultValue,
      placeholder = 'Select option',
      className,
      contentClassName,
      value,
      onChange,
      isLoading = false,
      error,
      helpText,
    },
    ref,
  ) => {
    const [searchTerm, setSearchTerm] = useState('')
    const filteredOptions = useMemo(() => {
      if (!searchable || !searchTerm) return options
      return options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }, [options, searchable, searchTerm])

    return (
      <Field>
        {label ? (
          <FieldLabel className={cn('font-medium text-foreground', labelClassName)}>
            {label}
            {required ? <span className="text-destructive">*</span> : null}
          </FieldLabel>
        ) : null}

        {isLoading ? (
          <SkeletonLoader type="input" />
        ) : (
          <SelectPrimitive.Root
            value={value}
            defaultValue={defaultValue}
            name={name}
            disabled={readOnly}
            onValueChange={(nextValue) => {
              onChange?.(nextValue)
              setSearchTerm('')
            }}
          >
            <SelectPrimitive.Trigger
              ref={ref}
              aria-invalid={!!error}
              className={cn(
                'flex h-10 w-full items-center justify-between rounded-none border border-field-border bg-field px-3 text-left text-sm text-foreground outline-none transition-colors data-[placeholder]:text-placeholder focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20',
                className,
              )}
            >
              <SelectPrimitive.Value placeholder={placeholder} />
              <SelectPrimitive.Icon asChild>
                <ChevronDown className="size-4 text-muted-foreground" />
              </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
              <SelectPrimitive.Content
                position="popper"
                sideOffset={4}
                className={cn(
                  'z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-none border border-field-border bg-popover text-popover-foreground shadow-sm',
                  contentClassName,
                )}
              >
                {searchable ? (
                  <div className="border-b border-field-border p-2">
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search"
                      className="h-8 w-full rounded-none border border-field-border bg-field px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                ) : null}
                <SelectPrimitive.Viewport className="p-1">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => (
                      <SelectPrimitive.Item
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        className="relative flex h-8 cursor-pointer select-none items-center rounded-none px-2 pr-8 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-muted data-[state=checked]:text-primary data-[disabled]:opacity-50"
                      >
                        <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                        <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center">
                          <Check className="size-3.5" />
                        </SelectPrimitive.ItemIndicator>
                      </SelectPrimitive.Item>
                    ))
                  ) : (
                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                      No option found.
                    </div>
                  )}
                </SelectPrimitive.Viewport>
              </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
          </SelectPrimitive.Root>
        )}

        {error && <FieldError>{error}</FieldError>}
        {!error && helpText && <FieldDescription>{helpText}</FieldDescription>}
      </Field>
    )
  },
)

Select.displayName = 'Select'

export default Select
