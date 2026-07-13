/**
 * `react-hooks/refs` fires on `field.ref` below, but react-hook-form's
 * `field.ref` is a `RefCallBack` used to register the input — not a React ref
 * object being read during render. The wrappers can't simply spread `{...field}`
 * because `Select` has no `onBlur` prop and `TextArea` has no `name` prop, so
 * fields are forwarded explicitly. The rule is a false positive here.
 */
/* eslint-disable react-hooks/refs */
import { type ComponentProps } from "react"
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import Input from "@/components/reusable/inputs/Input"
import Select from "@/components/reusable/inputs/Select"
import TextArea from "@/components/reusable/inputs/TextArea"

/**
 * react-hook-form-connected wrappers around the reusable inputs.
 *
 * Each wraps the corresponding `reusable/inputs` component with `useController`
 * so pages declare fields as `<FormInput control={form.control} name="x" />`
 * instead of hand-wiring `register`/`Controller`/error plumbing. Validation
 * errors from the zod resolver are surfaced automatically.
 */

type FieldOwnProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>
  name: TName
}

// --- Input -----------------------------------------------------------------

type FormInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = FieldOwnProps<TFieldValues, TName> &
  Omit<ComponentProps<typeof Input>, "name" | "value" | "onChange" | "error">

export function FormInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, ...rest }: FormInputProps<TFieldValues, TName>) {
  const { field, fieldState } = useController({ control, name })
  return (
    <Input
      {...rest}
      name={field.name}
      ref={field.ref}
      value={field.value ?? ""}
      onChange={field.onChange}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  )
}

// --- Select ----------------------------------------------------------------

type FormSelectProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = FieldOwnProps<TFieldValues, TName> &
  Omit<ComponentProps<typeof Select>, "name" | "value" | "onChange" | "error">

export function FormSelect<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, ...rest }: FormSelectProps<TFieldValues, TName>) {
  const { field, fieldState } = useController({ control, name })
  return (
    <Select
      {...rest}
      name={field.name}
      value={field.value ?? ""}
      onChange={field.onChange}
      error={fieldState.error?.message}
    />
  )
}

// --- TextArea --------------------------------------------------------------

type FormTextAreaProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = FieldOwnProps<TFieldValues, TName> &
  Omit<ComponentProps<typeof TextArea>, "name" | "value" | "onChange" | "error">

export function FormTextArea<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, ...rest }: FormTextAreaProps<TFieldValues, TName>) {
  const { field, fieldState } = useController({ control, name })
  return (
    <TextArea
      {...rest}
      ref={field.ref}
      value={field.value ?? ""}
      onChange={field.onChange}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  )
}
