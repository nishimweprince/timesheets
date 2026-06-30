import { type ChangeEvent, forwardRef, type ReactNode } from 'react'

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupTextarea } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

interface TextAreaProps {
  cols?: number
  rows?: number
  className?: string
  containerClassName?: string
  defaultValue?: string | number | readonly string[]
  resize?: boolean
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  required?: boolean
  readOnly?: boolean
  disabled?: boolean
  onBlur?: () => void
  label?: string | ReactNode
  value?: string | number | readonly string[]
  labelClassName?: string
  error?: string
  helpText?: string
  maxLength?: number
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      cols = 50,
      rows = 5,
      className,
      containerClassName,
      defaultValue,
      resize = false,
      onChange,
      placeholder,
      required = false,
      readOnly = false,
      disabled = false,
      onBlur,
      label,
      value,
      labelClassName,
      error,
      helpText,
      maxLength = 1000,
    },
    ref,
  ) => {
    return (
      <Field className={containerClassName}>
        {label ? (
          <FieldLabel className={cn('font-medium text-foreground', labelClassName)}>
            {label}
            {required ? <span className="text-destructive">*</span> : null}
          </FieldLabel>
        ) : null}

        <InputGroup
          className={cn(
            'h-auto border-field-border bg-field',
            'has-[[data-slot=input-group-control]:focus-visible]:border-primary',
            'has-[[data-slot=input-group-control]:focus-visible]:ring-primary/30',
            readOnly && 'bg-muted',
          )}
        >
          <InputGroupTextarea
            ref={ref}
            cols={cols}
            rows={rows}
            value={value}
            readOnly={readOnly}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={!!error}
            onChange={onChange}
            onBlur={onBlur}
            defaultValue={defaultValue}
            maxLength={maxLength}
            className={cn(
              'text-foreground placeholder:text-placeholder',
              !resize && 'resize-none',
              readOnly && 'cursor-default',
              className,
            )}
          />
        </InputGroup>

        {error && <FieldError>{error}</FieldError>}
        {!error && helpText && <FieldDescription>{helpText}</FieldDescription>}
      </Field>
    )
  },
)

TextArea.displayName = 'TextArea'

export default TextArea
