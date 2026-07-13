import { zodResolver } from "@hookform/resolvers/zod"
import {
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form"
import type { z } from "zod"

/**
 * Thin wrapper around react-hook-form's `useForm` that wires a zod schema as the
 * resolver. This is the single entry point for forms in the app — pass a schema,
 * get a fully-typed form back.
 *
 * @example
 *   const schema = z.object({ name: z.string().min(1) })
 *   const form = useZodForm(schema, { defaultValues: { name: "" } })
 */
export function useZodForm<TFieldValues extends FieldValues = FieldValues>(
  schema: z.ZodType<TFieldValues>,
  props?: Omit<UseFormProps<TFieldValues>, "resolver">,
): UseFormReturn<TFieldValues> {
  return useForm<TFieldValues>({
    mode: "onTouched",
    ...props,
    // Cast bridges zod v4 / @hookform/resolvers v5 generic variance; runtime is correct.
    resolver: zodResolver(schema as never) as Resolver<TFieldValues>,
  })
}
