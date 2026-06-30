import {
  type ChangeEvent,
  forwardRef,
  type InputHTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
  useId,
  useRef,
  useState,
} from 'react'
import type { LucideIcon } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { cn } from '@/lib/utils'
import DatePicker from './DatePicker'
import { SkeletonLoader } from './Loader'

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'>

export interface InputProps extends NativeInputProps {
  label?: string | ReactNode
  helpText?: string
  error?: string
  isLoading?: boolean
  labelClassName?: string
  containerClassName?: string
  prefixIcon?: LucideIcon
  suffixIcon?: LucideIcon
  prefixText?: string | ReactNode
  suffix?: ReactNode
  suffixIconHandler?: MouseEventHandler<HTMLButtonElement>
  onCheckedChange?: (checked: boolean) => void
  fromDate?: Date
  toDate?: Date
  selectionType?: 'date' | 'month' | 'year' | 'recurringDate'
  onDateChange?: (date: Date | undefined) => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      label,
      helpText,
      error,
      isLoading = false,
      labelClassName,
      containerClassName,
      className,
      required = false,
      id,
      prefixIcon: PrefixIcon,
      suffixIcon: SuffixIcon,
      prefixText,
      suffix,
      suffixIconHandler,
      onCheckedChange,
      checked,
      defaultChecked,
      readOnly,
      disabled,
      multiple,
      accept = 'application/pdf',
      fromDate,
      toDate,
      selectionType,
      value,
      defaultValue,
      onChange,
      onDateChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [fileError, setFileError] = useState<string | null>(null)

    const errorMessage = error ?? fileError

    if (type === 'checkbox') {
      return (
        <label
          className={cn(
            'group/field flex w-fit items-center gap-2 text-sm text-foreground',
            containerClassName,
          )}
        >
          <Checkbox
            id={inputId}
            checked={checked as boolean | undefined}
            defaultChecked={defaultChecked}
            disabled={disabled || readOnly}
            aria-invalid={!!error}
            onCheckedChange={(nextChecked) =>
              onCheckedChange?.(nextChecked === true)
            }
            className="rounded-none border-field-border"
          />
          {label ? (
            <span className={cn('text-sm font-medium text-foreground', labelClassName)}>
              {label}
            </span>
          ) : null}
        </label>
      )
    }

    if (type === 'radio') {
      return (
        <label
          className={cn(
            'flex w-fit items-center gap-2 text-sm text-foreground',
            containerClassName,
          )}
        >
          <input
            id={inputId}
            ref={ref}
            type="radio"
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled || readOnly}
            aria-invalid={!!error}
            onChange={onChange}
            className="size-4 rounded-none border border-field-border accent-primary outline-none focus:ring-1 focus:ring-primary/30"
            {...props}
          />
          {label ? (
            <span className={cn('text-sm font-medium text-foreground', labelClassName)}>
              {label}
            </span>
          ) : null}
        </label>
      )
    }

    if (type === 'file') {
      const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const maxBytes = 10 * 1024 * 1024
        const files = Array.from(event.target.files ?? [])
        const oversized = files.filter((file) => file.size > maxBytes)

        if (oversized.length > 0) {
          setFileError('Files must be 10 MB or smaller.')
          event.target.value = ''
          return
        }

        setFileError(null)
        onChange?.(event)
      }

      return (
        <Field className={containerClassName}>
          {label ? (
            <FieldLabel className={cn('font-medium text-foreground', labelClassName)}>
              {label}
              {required ? <span className="text-destructive">*</span> : null}
            </FieldLabel>
          ) : null}
          {isLoading ? (
            <SkeletonLoader type="button" />
          ) : (
            <>
              <button
                type="button"
                disabled={disabled || readOnly}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex h-10 w-full items-center justify-center rounded-none border border-field-border bg-field px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-field-hover focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 disabled:opacity-60',
                  className,
                )}
              >
                {props.placeholder ?? 'Choose file'}
                {multiple ? 's' : ''}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple={multiple}
                accept={accept}
                disabled={disabled || readOnly}
                onChange={handleFileChange}
                className="hidden"
              />
            </>
          )}
          {errorMessage && <FieldError>{errorMessage}</FieldError>}
          {!errorMessage && helpText && <FieldDescription>{helpText}</FieldDescription>}
        </Field>
      )
    }

    if (type === 'date') {
      return (
        <Field className={containerClassName}>
          {label ? (
            <FieldLabel className={cn('font-medium text-foreground', labelClassName)}>
              {label}
              {required ? <span className="text-destructive">*</span> : null}
            </FieldLabel>
          ) : null}
          {isLoading ? (
            <SkeletonLoader type="input" />
          ) : (
            <DatePicker
              disabled={disabled || readOnly}
              placeholder={props.placeholder}
              value={(value ?? defaultValue) as Date | string | undefined}
              fromDate={fromDate}
              toDate={toDate}
              selectionType={selectionType}
              onChange={(date) => {
                onDateChange?.(date)
                if (onChange) {
                  onChange({
                    target: { value: date ? date.toISOString() : '' },
                  } as ChangeEvent<HTMLInputElement>)
                }
              }}
            />
          )}
          {error && <FieldError>{error}</FieldError>}
          {!error && helpText && <FieldDescription>{helpText}</FieldDescription>}
        </Field>
      )
    }

    return (
      <Field className={containerClassName}>
        {label ? (
          <FieldLabel
            htmlFor={inputId}
            className={cn('font-medium text-foreground', labelClassName)}
          >
            {label}
            {required ? <span className="text-destructive">*</span> : null}
          </FieldLabel>
        ) : null}

        {isLoading ? (
          <SkeletonLoader type="input" />
        ) : (
          <InputGroup
            className={cn(
              'h-10 border-field-border bg-field',
              'has-[[data-slot=input-group-control]:focus-visible]:border-primary',
              'has-[[data-slot=input-group-control]:focus-visible]:ring-primary/30',
              readOnly && 'bg-muted',
            )}
          >
            {PrefixIcon || prefixText ? (
              <InputGroupAddon align="inline-start" className="text-muted-foreground">
                {PrefixIcon ? <PrefixIcon className="size-4" /> : null}
                {prefixText ? (
                  <InputGroupText className="text-sm">{prefixText}</InputGroupText>
                ) : null}
              </InputGroupAddon>
            ) : null}

            <InputGroupInput
              id={inputId}
              ref={ref}
              type={type}
              value={value}
              defaultValue={defaultValue}
              disabled={disabled}
              readOnly={readOnly}
              required={required}
              aria-invalid={!!error}
              onChange={onChange}
              className={cn(
                'h-full text-foreground placeholder:text-placeholder',
                readOnly && 'cursor-default',
                className,
              )}
              {...props}
            />

            {suffix ? (
              <InputGroupAddon align="inline-end">{suffix}</InputGroupAddon>
            ) : SuffixIcon ? (
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  onClick={suffixIconHandler}
                  className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
                >
                  <SuffixIcon className="size-4" />
                </button>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
        )}

        {error && <FieldError>{error}</FieldError>}
        {!error && helpText && <FieldDescription>{helpText}</FieldDescription>}
      </Field>
    )
  },
)

Input.displayName = 'Input'

export default Input
